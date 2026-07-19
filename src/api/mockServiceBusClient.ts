// Mock implementation of the Azure Service Bus API surface.
//
// Every function returns data in the same shape as the official Microsoft SDKs
// and simulates network latency so loading states are exercised. Used in the
// browser (where CORS blocks Service Bus) and as the default when a connection
// has no real backend. The real client lives in `serviceBusClient.ts`.

import type {
  MessageCountDetails,
  MessageView,
  PagedResult,
  PeekMessagesParams,
  SBQueue,
  SBSubscription,
  SBTopic,
  SendMessageParams,
  ServiceBusApi,
  ServiceBusReceivedMessage,
} from "./types";
import type { NamespaceConnection } from "../lib/connectionStore";

// --- Raw seed data (would be the real Azure resources in production) ----------

interface RawEntity {
  name: string;
  active: number;
  dead: number;
  /** Set when the subscription auto-forwards to another entity. */
  forwardTo?: string;
}

interface RawTopic {
  name: string;
  subscriptions: RawEntity[];
}

interface RawNamespace {
  name: string;
  location: string;
  queues: RawEntity[];
  topics: RawTopic[];
}

const rawNamespaces: RawNamespace[] = [
  {
    name: "contoso-prod",
    location: "uksouth",
    queues: [
      { name: "orders", active: 128, dead: 3 },
      { name: "payments", active: 42, dead: 0 },
      { name: "notifications", active: 0, dead: 0 },
    ],
    topics: [
      {
        name: "order-events",
        subscriptions: [
          { name: "fulfilment", active: 17, dead: 1 },
          { name: "analytics", active: 5, dead: 0, forwardTo: "analytics-agg" },
          { name: "audit", active: 230, dead: 12 },
        ],
      },
      {
        name: "inventory",
        subscriptions: [{ name: "warehouse", active: 8, dead: 0 }],
      },
    ],
  },
  {
    name: "contoso-staging",
    location: "ukwest",
    queues: [
      { name: "orders", active: 12, dead: 0 },
      { name: "dead-letters", active: 0, dead: 0 },
    ],
    topics: [
      {
        name: "order-events",
        subscriptions: [{ name: "fulfilment", active: 2, dead: 0 }],
      },
    ],
  },
  {
    name: "dev-sandbox",
    location: "uksouth",
    queues: [{ name: "scratch", active: 0, dead: 0 }],
    topics: [],
  },
];

// --- Helpers ------------------------------------------------------------------

const SUBSCRIPTION_ID = "00000000-0000-0000-0000-000000000000";
const RESOURCE_GROUP = "rg-messaging";

function namespaceResourceId(ns: string): string {
  return (
    `/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}` +
    `/providers/Microsoft.ServiceBus/namespaces/${ns}`
  );
}

// Deterministic extra count for a sub-queue view of an entity (keyed by the
// entity path so list counts and peek totals agree).
function extraCount(key: string, view: string, mod: number): number {
  return Math.abs(hashString(`${key}#${view}`)) % mod;
}

function countDetails(
  key: string,
  active: number,
  dead: number,
): MessageCountDetails {
  return {
    activeMessageCount: active,
    deadLetterMessageCount: dead,
    scheduledMessageCount: extraCount(key, "scheduled", 9),
    transferMessageCount: 0,
    transferDeadLetterMessageCount: extraCount(key, "transferDeadletter", 4),
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Small deterministic latency (250-650ms) so spinners are visible but not slow.
function latency(key: string): number {
  return 250 + (Math.abs(hashString(key)) % 400);
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

// Deterministically assign one of the sample datasets to a namespace name, so
// any configured connection is backed by mock data. A name matching a sample
// reuses it; any other name is hash-assigned to one of the samples.
function sampleFor(name: string): RawNamespace {
  return (
    rawNamespaces.find((ns) => ns.name === name) ??
    rawNamespaces[Math.abs(hashString(name)) % rawNamespaces.length]
  );
}

// Resolve the raw counts for a queue ("queue") or subscription ("topic/sub").
function resolveEntity(
  namespaceName: string,
  entityPath: string,
): RawEntity | undefined {
  const ns = sampleFor(namespaceName);
  if (entityPath.includes("/")) {
    const [topicName, subName] = entityPath.split("/");
    const topic = ns.topics.find((t) => t.name === topicName);
    return topic?.subscriptions.find((s) => s.name === subName);
  }
  return ns.queues.find((q) => q.name === entityPath);
}

// --- Data-plane message generation --------------------------------------------

const subjects = [
  "OrderCreated",
  "OrderShipped",
  "PaymentReceived",
  "InventoryUpdated",
  "CustomerNotified",
];

const deadLetterReasons = [
  "MaxDeliveryCountExceeded",
  "TTLExpiredException",
  "HeaderSizeExceeded",
  "ApplicationError",
];

const bodies = [
  {
    orderId: "ORD-10432",
    customerId: "CUST-88213",
    total: 149.99,
    currency: "GBP",
    items: 3,
  },
  { orderId: "ORD-10433", status: "shipped", trackingNumber: "TRK-556231" },
  { paymentId: "PAY-77213", amount: 42.5, method: "card", approved: true },
  {
    orderId: "ORD-90001",
    customerId: "CUST-42210",
    currency: "GBP",
    notes:
      "Bulk order with expedited shipping and gift wrapping across multiple warehouses.",
    shippingAddress: {
      line1: "128 Example Street",
      line2: "Building C, Floor 4",
      city: "Manchester",
      postcode: "M1 2AB",
      country: "United Kingdom",
    },
    items: Array.from({ length: 20 }, (_, i) => ({
      sku: `SKU-${1000 + i}`,
      name: `Product number ${i + 1} with a reasonably descriptive name`,
      quantity: (i % 5) + 1,
      unitPrice: Number((9.99 + i).toFixed(2)),
      category: i % 2 === 0 ? "hardware" : "accessories",
    })),
  },
];

function buildMessage(
  seed: number,
  index: number,
  view: MessageView,
): ServiceBusReceivedMessage {
  const n = seed * 1000 + index;
  const deadLetter = view === "deadletter" || view === "transferDeadletter";
  const state: ServiceBusReceivedMessage["state"] =
    view === "scheduled"
      ? "scheduled"
      : view === "deferred"
        ? "deferred"
        : "active";
  // Keep enqueuedTimeUtc always in the past while making it increase with the
  // sequence number: a larger n means a smaller offset back from "now".
  const pastWindow = 90 * 24 * 60 * 60 * 1000; // 90 days in ms
  const enqueued = new Date(Date.now() - Math.round(pastWindow / (n + 1)));
  const timeToLive = 14 * 24 * 60 * 60 * 1000; // 14 days in ms
  const applicationProperties: Record<string, string | number | boolean> = {
    source: "checkout-service",
    version: `1.${seed}.${index % 10}`,
    region: seed % 2 === 0 ? "uksouth" : "ukwest",
    priority: (index % 3) + 1,
    retryable: index % 2 === 0,
  };
  return {
    messageId: `${n.toString(16).padStart(8, "0")}-${seed}`,
    sequenceNumber: 45000 + n,
    enqueuedSequenceNumber: 45000 + n,
    subject:
      (seed + index) % 3 === 0
        ? undefined
        : subjects[(seed + index) % subjects.length],
    body: bodies[(seed + index) % bodies.length],
    contentType: "application/json",
    correlationId: `corr-${(seed + index) % 7}`,
    sessionId: index % 3 === 0 ? `session-${(seed + index) % 5}` : undefined,
    enqueuedTimeUtc: enqueued,
    expiresAtUtc: new Date(enqueued.getTime() + timeToLive),
    // Scheduled messages are enqueued at a future time; stagger by index.
    scheduledEnqueueTimeUtc:
      state === "scheduled"
        ? new Date(Date.now() + (index + 1) * 60 * 60 * 1000)
        : undefined,
    timeToLive,
    deliveryCount: deadLetter ? 10 : index % 4,
    state,
    applicationProperties,
    ...(deadLetter
      ? {
          deadLetterReason:
            deadLetterReasons[(seed + index) % deadLetterReasons.length],
          deadLetterErrorDescription:
            "The message could not be processed and was dead-lettered.",
          deadLetterSource: "checkout-processor",
        }
      : {}),
  };
}

// Total message count for a view of an entity, mirroring the list counts so
// tree chips and grid totals agree.
function mockTotalCount(
  namespaceName: string,
  entityPath: string,
  entityType: PeekMessagesParams["entityType"],
  view: MessageView,
): number {
  if (entityType === "topic") {
    return view === "scheduled" ? extraCount(entityPath, "scheduled", 9) : 0;
  }
  const entity = resolveEntity(namespaceName, entityPath);
  if (!entity) return 0;
  switch (view) {
    case "active":
      return entity.active;
    case "deadletter":
      return entity.dead;
    case "transferDeadletter":
      return extraCount(entityPath, "transferDeadletter", 4);
    case "scheduled":
      return extraCount(entityPath, "scheduled", 9);
    case "deferred":
      return extraCount(entityPath, "deferred", 6);
  }
}

async function mockPeekMessages(
  namespaceName: string,
  params: PeekMessagesParams,
): Promise<PagedResult<ServiceBusReceivedMessage>> {
  const { entityPath, entityType, view, skip, top } = params;
  await delay(latency(`peek:${namespaceName}:${entityPath}:${view}`));

  const totalCount = mockTotalCount(
    namespaceName,
    entityPath,
    entityType,
    view,
  );

  const seed =
    Math.abs(hashString(`${namespaceName}/${entityPath}/${view}`)) % 20;
  const end = Math.min(skip + top, totalCount);
  const value: ServiceBusReceivedMessage[] = [];
  for (let i = skip; i < end; i++) {
    value.push(buildMessage(seed + 1, i, view));
  }

  return {
    value,
    totalCount,
    nextSkip: end < totalCount ? end : null,
  };
}

async function mockListQueues(namespaceName: string): Promise<SBQueue[]> {
  await delay(latency(`queues:${namespaceName}`));
  const ns = sampleFor(namespaceName);
  return ns.queues.map((q) => ({
    id: `${namespaceResourceId(namespaceName)}/queues/${q.name}`,
    name: q.name,
    type: "Microsoft.ServiceBus/Namespaces/Queues",
    properties: {
      countDetails: countDetails(q.name, q.active, q.dead),
      messageCount: q.active + q.dead,
      status: "Active",
      maxDeliveryCount: 10,
      requiresSession: false,
      requiresDuplicateDetection: false,
    },
  }));
}

async function mockListTopics(namespaceName: string): Promise<SBTopic[]> {
  await delay(latency(`topics:${namespaceName}`));
  const ns = sampleFor(namespaceName);
  return ns.topics.map((t) => ({
    id: `${namespaceResourceId(namespaceName)}/topics/${t.name}`,
    name: t.name,
    type: "Microsoft.ServiceBus/Namespaces/Topics",
    properties: {
      subscriptionCount: t.subscriptions.length,
      status: "Active",
    },
  }));
}

async function mockListSubscriptions(
  namespaceName: string,
  topicName: string,
): Promise<SBSubscription[]> {
  await delay(latency(`subs:${namespaceName}:${topicName}`));
  const topic = sampleFor(namespaceName).topics.find(
    (t) => t.name === topicName,
  );
  if (!topic) return [];
  return topic.subscriptions.map((s) => ({
    id:
      `${namespaceResourceId(namespaceName)}/topics/${topicName}` +
      `/subscriptions/${s.name}`,
    name: s.name,
    type: "Microsoft.ServiceBus/Namespaces/Topics/Subscriptions",
    properties: {
      countDetails: countDetails(`${topicName}/${s.name}`, s.active, s.dead),
      messageCount: s.active + s.dead,
      status: "Active",
      maxDeliveryCount: 10,
      forwardTo: s.forwardTo,
    },
  }));
}

/**
 * Mock `ServiceBusApi` bound to a namespace, backed by a sample dataset. Used in
 * the browser (Service Bus is CORS-blocked there) and whenever the real client
 * isn't available. Simulates network latency so loading states are exercised.
 */
export class MockServiceBusClient implements ServiceBusApi {
  private readonly namespaceName: string;

  constructor(connection: NamespaceConnection) {
    this.namespaceName = connection.friendlyName;
  }

  listQueues(): Promise<SBQueue[]> {
    return mockListQueues(this.namespaceName);
  }

  listTopics(): Promise<SBTopic[]> {
    return mockListTopics(this.namespaceName);
  }

  listSubscriptions(topicName: string): Promise<SBSubscription[]> {
    return mockListSubscriptions(this.namespaceName, topicName);
  }

  peekMessages(
    params: PeekMessagesParams,
  ): Promise<PagedResult<ServiceBusReceivedMessage>> {
    return mockPeekMessages(this.namespaceName, params);
  }

  async sendMessage(params: SendMessageParams): Promise<void> {
    // The mock has no writable store; just simulate the network round-trip so
    // the sending state is exercised.
    await delay(latency(`send:${this.namespaceName}:${params.entityPath}`));
  }
}
