// Public Azure Service Bus client.
//
// Dispatches to the real Azure SDK (Tauri desktop + SAS auth) or the mock
// (browser / no real backend). `@azure/service-bus` and the Tauri HTTP shim are
// imported lazily inside the real functions so they are never bundled for the
// browser, where Service Bus is unreachable (CORS on the management endpoint).

import type {
  PagedResult,
  PeekMessagesParams,
  SBNamespace,
  SBQueue,
  SBSubscription,
  SBTopic,
  ServiceBusReceivedMessage,
} from "./types";
import type { ServiceBusReceivedMessage as SdkMessage } from "@azure/service-bus";
import { isTauri } from "@tauri-apps/api/core";
import {
  getConnectionStore,
  type NamespaceConnection,
} from "../lib/connectionStore";
import {
  mockListQueues,
  mockListSubscriptions,
  mockListTopics,
  mockPeekMessages,
  namespaceResourceId,
  sampleFor,
} from "./mockServiceBusClient";

export type { PeekMessagesParams } from "./types";

// --- Namespaces (derived from the user's configured connections) -------------

export async function listNamespaces(
  connections: NamespaceConnection[],
): Promise<SBNamespace[]> {
  return connections.map((connection) => ({
    id: namespaceResourceId(connection.friendlyName),
    name: connection.friendlyName,
    type: "Microsoft.ServiceBus/Namespaces",
    location: sampleFor(connection.friendlyName).location,
    properties: {
      provisioningState: "Succeeded",
      status: "Active",
      serviceBusEndpoint: connection.serviceBusEndpoint,
      createdAt: "2026-01-04T09:12:33Z",
    },
  }));
}

// --- Real Azure client (Tauri desktop + SAS only) ----------------------------
//
// HTTP transport is handled at startup (see `lib/tauriHttp.ts`), which routes
// `fetch` through the Tauri HTTP plugin so these calls aren't CORS-blocked.

function connectionString(connection: NamespaceConnection): string {
  if (connection.auth.kind !== "sas") {
    throw new Error(
      "Entra ID authentication is not supported yet — use a SAS connection.",
    );
  }
  let host = connection.serviceBusEndpoint;
  try {
    host = new URL(connection.serviceBusEndpoint).hostname;
  } catch {
    // Fall back to the raw endpoint if it isn't a valid URL.
  }
  return (
    `Endpoint=sb://${host}/;` +
    `SharedAccessKeyName=${connection.auth.keyName};` +
    `SharedAccessKey=${connection.auth.key}`
  );
}

async function adminClient(connection: NamespaceConnection) {
  const { ServiceBusAdministrationClient } = await import("@azure/service-bus");
  return new ServiceBusAdministrationClient(connectionString(connection));
}

const ZERO_COUNTS = {
  activeMessageCount: 0,
  deadLetterMessageCount: 0,
  scheduledMessageCount: 0,
  transferMessageCount: 0,
  transferDeadLetterMessageCount: 0,
};

async function realListQueues(
  connection: NamespaceConnection,
): Promise<SBQueue[]> {
  const client = await adminClient(connection);
  const queues: SBQueue[] = [];
  for await (const q of client.listQueuesRuntimeProperties()) {
    queues.push({
      id: `${connection.serviceBusEndpoint}/queues/${q.name}`,
      name: q.name,
      type: "Microsoft.ServiceBus/Namespaces/Queues",
      properties: {
        countDetails: {
          activeMessageCount: q.activeMessageCount,
          deadLetterMessageCount: q.deadLetterMessageCount,
          scheduledMessageCount: q.scheduledMessageCount,
          transferMessageCount: q.transferMessageCount,
          transferDeadLetterMessageCount: q.transferDeadLetterMessageCount,
        },
        messageCount: q.totalMessageCount ?? 0,
        status: "Active",
        maxDeliveryCount: 10,
        requiresSession: false,
        requiresDuplicateDetection: false,
      },
    });
  }
  return queues;
}

async function realListTopics(
  connection: NamespaceConnection,
): Promise<SBTopic[]> {
  const client = await adminClient(connection);
  const topics: SBTopic[] = [];
  for await (const t of client.listTopicsRuntimeProperties()) {
    topics.push({
      id: `${connection.serviceBusEndpoint}/topics/${t.name}`,
      name: t.name,
      type: "Microsoft.ServiceBus/Namespaces/Topics",
      properties: {
        countDetails: { ...ZERO_COUNTS },
        subscriptionCount: t.subscriptionCount ?? 0,
        status: "Active",
      },
    });
  }
  return topics;
}

async function realListSubscriptions(
  connection: NamespaceConnection,
  topicName: string,
): Promise<SBSubscription[]> {
  const client = await adminClient(connection);
  const subscriptions: SBSubscription[] = [];
  for await (const s of client.listSubscriptionsRuntimeProperties(topicName)) {
    subscriptions.push({
      id:
        `${connection.serviceBusEndpoint}/topics/${topicName}` +
        `/subscriptions/${s.subscriptionName}`,
      name: s.subscriptionName,
      type: "Microsoft.ServiceBus/Namespaces/Topics/Subscriptions",
      properties: {
        countDetails: {
          activeMessageCount: s.activeMessageCount,
          deadLetterMessageCount: s.deadLetterMessageCount,
          scheduledMessageCount: 0,
          transferMessageCount: s.transferMessageCount ?? 0,
          transferDeadLetterMessageCount: s.transferDeadLetterMessageCount ?? 0,
        },
        messageCount: s.totalMessageCount ?? 0,
        status: "Active",
        maxDeliveryCount: 10,
      },
    });
  }
  return subscriptions;
}

function mapMessage(m: SdkMessage): ServiceBusReceivedMessage {
  return {
    messageId: String(m.messageId ?? ""),
    sequenceNumber: Number(m.sequenceNumber ?? 0),
    enqueuedSequenceNumber: Number(m.enqueuedSequenceNumber ?? 0),
    subject: m.subject,
    body: m.body,
    contentType: m.contentType,
    correlationId:
      m.correlationId != null ? String(m.correlationId) : undefined,
    sessionId: m.sessionId,
    enqueuedTimeUtc: m.enqueuedTimeUtc ?? new Date(),
    expiresAtUtc: m.expiresAtUtc ?? new Date(),
    timeToLive: m.timeToLive ?? 0,
    deliveryCount: m.deliveryCount ?? 0,
    state: m.state,
    applicationProperties:
      m.applicationProperties as ServiceBusReceivedMessage["applicationProperties"],
    deadLetterReason: m.deadLetterReason,
    deadLetterErrorDescription: m.deadLetterErrorDescription,
    deadLetterSource: m.deadLetterSource,
  };
}

async function realPeekMessages(
  connection: NamespaceConnection,
  params: PeekMessagesParams,
): Promise<PagedResult<ServiceBusReceivedMessage>> {
  const { entityPath, subQueue, skip, top } = params;

  // Total count comes from the entity's runtime properties.
  const admin = await adminClient(connection);
  let totalCount: number;
  if (entityPath.includes("/")) {
    const [topicName, subName] = entityPath.split("/");
    const rt = await admin.getSubscriptionRuntimeProperties(topicName, subName);
    totalCount =
      subQueue === "deadletter"
        ? rt.deadLetterMessageCount
        : rt.activeMessageCount;
  } else {
    const rt = await admin.getQueueRuntimeProperties(entityPath);
    totalCount =
      subQueue === "deadletter"
        ? rt.deadLetterMessageCount
        : rt.activeMessageCount;
  }

  const { ServiceBusClient } = await import("@azure/service-bus");
  const client = new ServiceBusClient(connectionString(connection));
  try {
    const options =
      subQueue === "deadletter" ? { subQueueType: "deadLetter" as const } : {};
    const receiver = entityPath.includes("/")
      ? client.createReceiver(
          entityPath.split("/")[0],
          entityPath.split("/")[1],
          options,
        )
      : client.createReceiver(entityPath, options);

    // Peek is cursor-based; peek `skip + top` from the start and slice the page.
    const peeked = await receiver.peekMessages(skip + top);
    await receiver.close();

    return {
      value: peeked.slice(skip, skip + top).map(mapMessage),
      totalCount,
      nextSkip: skip + top < totalCount ? skip + top : null,
    };
  } finally {
    await client.close();
  }
}

// --- Real / mock dispatch -----------------------------------------------------

async function resolveConnection(
  namespaceName: string,
): Promise<NamespaceConnection | undefined> {
  const connections = await getConnectionStore().list();
  return connections.find((c) => c.friendlyName === namespaceName);
}

// Real Azure calls only work in the Tauri desktop build (the browser blocks the
// management endpoint via CORS) and only for SAS auth for now.
function useRealApi(
  connection: NamespaceConnection | undefined,
): connection is NamespaceConnection {
  return isTauri() && connection?.auth.kind === "sas";
}

export async function listQueues(namespaceName: string): Promise<SBQueue[]> {
  const connection = await resolveConnection(namespaceName);
  if (useRealApi(connection)) return realListQueues(connection);
  return mockListQueues(namespaceName);
}

export async function listTopics(namespaceName: string): Promise<SBTopic[]> {
  const connection = await resolveConnection(namespaceName);
  if (useRealApi(connection)) return realListTopics(connection);
  return mockListTopics(namespaceName);
}

export async function listSubscriptions(
  namespaceName: string,
  topicName: string,
): Promise<SBSubscription[]> {
  const connection = await resolveConnection(namespaceName);
  if (useRealApi(connection)) return realListSubscriptions(connection, topicName);
  return mockListSubscriptions(namespaceName, topicName);
}

export async function peekMessages(
  params: PeekMessagesParams,
): Promise<PagedResult<ServiceBusReceivedMessage>> {
  const connection = await resolveConnection(params.namespaceName);
  if (useRealApi(connection)) return realPeekMessages(connection, params);
  return mockPeekMessages(params);
}
