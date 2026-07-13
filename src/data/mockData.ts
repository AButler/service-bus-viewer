// Domain types and mock data for the Service Bus viewer UI.

export type EntityKind =
  | "namespace"
  | "queue"
  | "topic"
  | "subscription"
  | "deadletter";

export interface SubscriptionNode {
  kind: "subscription";
  id: string;
  name: string;
  activeCount: number;
  deadLetterCount: number;
}

export interface TopicNode {
  kind: "topic";
  id: string;
  name: string;
  subscriptions: SubscriptionNode[];
}

export interface QueueNode {
  kind: "queue";
  id: string;
  name: string;
  activeCount: number;
  deadLetterCount: number;
}

export interface NamespaceNode {
  kind: "namespace";
  id: string;
  name: string;
  endpoint: string;
  status: "connected" | "connecting" | "error";
  queues: QueueNode[];
  topics: TopicNode[];
}

export interface ServiceBusMessage {
  sequenceNumber: number;
  messageId: string;
  subject: string;
  contentType: string;
  size: number;
  deliveryCount: number;
  enqueuedTime: string;
  state: "Active" | "Deferred" | "Scheduled" | "DeadLetter";
  correlationId: string;
  sessionId: string | null;
  timeToLive: string;
  body: string;
  applicationProperties: Record<string, string | number | boolean>;
}

export const namespaces: NamespaceNode[] = [
  {
    kind: "namespace",
    id: "ns-prod",
    name: "contoso-prod",
    endpoint: "contoso-prod.servicebus.windows.net",
    status: "connected",
    queues: [
      {
        kind: "queue",
        id: "ns-prod/q/orders",
        name: "orders",
        activeCount: 128,
        deadLetterCount: 3,
      },
      {
        kind: "queue",
        id: "ns-prod/q/payments",
        name: "payments",
        activeCount: 42,
        deadLetterCount: 0,
      },
      {
        kind: "queue",
        id: "ns-prod/q/notifications",
        name: "notifications",
        activeCount: 0,
        deadLetterCount: 0,
      },
    ],
    topics: [
      {
        kind: "topic",
        id: "ns-prod/t/order-events",
        name: "order-events",
        subscriptions: [
          {
            kind: "subscription",
            id: "ns-prod/t/order-events/s/fulfilment",
            name: "fulfilment",
            activeCount: 17,
            deadLetterCount: 1,
          },
          {
            kind: "subscription",
            id: "ns-prod/t/order-events/s/analytics",
            name: "analytics",
            activeCount: 5,
            deadLetterCount: 0,
          },
          {
            kind: "subscription",
            id: "ns-prod/t/order-events/s/audit",
            name: "audit",
            activeCount: 230,
            deadLetterCount: 12,
          },
        ],
      },
      {
        kind: "topic",
        id: "ns-prod/t/inventory",
        name: "inventory",
        subscriptions: [
          {
            kind: "subscription",
            id: "ns-prod/t/inventory/s/warehouse",
            name: "warehouse",
            activeCount: 8,
            deadLetterCount: 0,
          },
        ],
      },
    ],
  },
  {
    kind: "namespace",
    id: "ns-staging",
    name: "contoso-staging",
    endpoint: "contoso-staging.servicebus.windows.net",
    status: "connected",
    queues: [
      {
        kind: "queue",
        id: "ns-staging/q/orders",
        name: "orders",
        activeCount: 12,
        deadLetterCount: 0,
      },
      {
        kind: "queue",
        id: "ns-staging/q/dead-letters",
        name: "dead-letters",
        activeCount: 0,
        deadLetterCount: 0,
      },
    ],
    topics: [
      {
        kind: "topic",
        id: "ns-staging/t/order-events",
        name: "order-events",
        subscriptions: [
          {
            kind: "subscription",
            id: "ns-staging/t/order-events/s/fulfilment",
            name: "fulfilment",
            activeCount: 2,
            deadLetterCount: 0,
          },
        ],
      },
    ],
  },
  {
    kind: "namespace",
    id: "ns-dev",
    name: "dev-sandbox",
    endpoint: "dev-sandbox.servicebus.windows.net",
    status: "error",
    queues: [
      {
        kind: "queue",
        id: "ns-dev/q/scratch",
        name: "scratch",
        activeCount: 0,
        deadLetterCount: 0,
      },
    ],
    topics: [],
  },
];

const bodies = [
  JSON.stringify(
    {
      orderId: "ORD-10432",
      customerId: "CUST-88213",
      total: 149.99,
      currency: "GBP",
      items: 3,
    },
    null,
    2,
  ),
  JSON.stringify(
    { orderId: "ORD-10433", status: "shipped", trackingNumber: "TRK-556231" },
    null,
    2,
  ),
  JSON.stringify(
    { paymentId: "PAY-77213", amount: 42.5, method: "card", approved: true },
    null,
    2,
  ),
];

function buildMessages(
  seed: number,
  count: number,
  deadLetter = false,
): ServiceBusMessage[] {
  const states: ServiceBusMessage["state"][] = [
    "Active",
    "Active",
    "Active",
    "Deferred",
    "Scheduled",
  ];
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
  return Array.from({ length: count }, (_, i) => {
    const n = seed * 1000 + i;
    return {
      sequenceNumber: 45000 + n,
      messageId: `msg-${n.toString(16).padStart(8, "0")}-${seed}`,
      subject: subjects[(seed + i) % subjects.length],
      contentType: "application/json",
      size: 512 + ((n * 37) % 4096),
      deliveryCount: deadLetter ? 10 : i % 4,
      enqueuedTime: new Date(
        Date.UTC(2026, 6, 13, 9, 0, 0) + n * 61_000,
      ).toISOString(),
      state: deadLetter ? "DeadLetter" : states[(seed + i) % states.length],
      correlationId: `corr-${(seed + i) % 7}`,
      sessionId: i % 3 === 0 ? `session-${(seed + i) % 5}` : null,
      timeToLive: "14.00:00:00",
      body: bodies[(seed + i) % bodies.length],
      applicationProperties: {
        source: "checkout-service",
        version: `1.${seed}.${i % 10}`,
        region: seed % 2 === 0 ? "uksouth" : "ukwest",
        priority: (i % 3) + 1,
        retryable: i % 2 === 0,
        ...(deadLetter
          ? {
              DeadLetterReason:
                deadLetterReasons[(seed + i) % deadLetterReasons.length],
              DeadLetterErrorDescription:
                "The message could not be processed and was dead-lettered.",
            }
          : {}),
      },
    };
  });
}

// Pre-built message lists keyed by entity id. Falls back to a generated list.
const messageCache = new Map<string, ServiceBusMessage[]>();

export function getMessagesForEntity(
  entityId: string | null,
): ServiceBusMessage[] {
  if (!entityId) return [];
  if (!messageCache.has(entityId)) {
    const isDeadLetter = entityId.startsWith("deadletter:");
    const seed = Math.abs(hashString(entityId)) % 20;
    const count = 8 + (seed % 25);
    messageCache.set(entityId, buildMessages(seed + 1, count, isDeadLetter));
  }
  return messageCache.get(entityId)!;
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}
