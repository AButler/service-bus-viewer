// Real Azure Service Bus client (Tauri desktop only).
//
// `@azure/service-bus` is imported lazily inside the methods so it is never
// bundled for the browser, where Service Bus is unreachable (CORS on the
// management endpoint). HTTP transport is handled at startup (see
// `lib/tauriHttp.ts`), which routes `fetch` through the Tauri HTTP plugin so
// these calls aren't CORS-blocked. Non-SAS (Entra) connections throw when a
// list/peek call is made.

import type {
  PagedResult,
  PeekMessagesParams,
  EntityStatus,
  SBQueue,
  SBSubscription,
  SBTopic,
  ServiceBusApi,
  ServiceBusReceivedMessage,
} from "./types";
import type {
  QueueProperties,
  ServiceBusReceivedMessage as SdkMessage,
  SubscriptionProperties,
} from "@azure/service-bus";
import type { NamespaceConnection } from "../lib/connectionStore";

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

/**
 * Real `ServiceBusApi` backed by the Azure SDK, bound to a single connection.
 * Only usable in the Tauri desktop build; a non-SAS (Entra) connection throws
 * when a list/peek call is made.
 */
export class ServiceBusClient implements ServiceBusApi {
  private readonly connection: NamespaceConnection;

  constructor(connection: NamespaceConnection) {
    this.connection = connection;
  }

  private connectionString(): string {
    const { auth, serviceBusEndpoint } = this.connection;
    if (auth.kind !== "sas") {
      throw new Error(
        "Entra ID authentication is not supported yet — use a SAS connection.",
      );
    }
    let host = serviceBusEndpoint;
    try {
      host = new URL(serviceBusEndpoint).hostname;
    } catch {
      // Fall back to the raw endpoint if it isn't a valid URL.
    }
    return (
      `Endpoint=sb://${host}/;` +
      `SharedAccessKeyName=${auth.keyName};` +
      `SharedAccessKey=${auth.key}`
    );
  }

  private async adminClient() {
    const { ServiceBusAdministrationClient } =
      await import("@azure/service-bus");
    return new ServiceBusAdministrationClient(this.connectionString());
  }

  async listQueues(): Promise<SBQueue[]> {
    const endpoint = this.connection.serviceBusEndpoint;
    const client = await this.adminClient();

    // Configuration (status, delivery, session, dedup) isn't in the runtime
    // properties, so read it from `listQueues()` and merge by name.
    const config = new Map<string, QueueProperties>();
    for await (const q of client.listQueues()) config.set(q.name, q);

    const queues: SBQueue[] = [];
    for await (const q of client.listQueuesRuntimeProperties()) {
      const cfg = config.get(q.name);
      queues.push({
        id: `${endpoint}/queues/${q.name}`,
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
          status: cfg?.status ?? "Unknown",
          maxDeliveryCount: cfg?.maxDeliveryCount ?? 10,
          requiresSession: cfg?.requiresSession ?? false,
          requiresDuplicateDetection: cfg?.requiresDuplicateDetection ?? false,
        },
      });
    }
    return queues;
  }

  async listTopics(): Promise<SBTopic[]> {
    const endpoint = this.connection.serviceBusEndpoint;
    const client = await this.adminClient();

    // Status is configuration, not runtime, so read it from `listTopics()`.
    const status = new Map<string, EntityStatus>();
    for await (const t of client.listTopics()) status.set(t.name, t.status);

    const topics: SBTopic[] = [];
    for await (const t of client.listTopicsRuntimeProperties()) {
      topics.push({
        id: `${endpoint}/topics/${t.name}`,
        name: t.name,
        type: "Microsoft.ServiceBus/Namespaces/Topics",
        properties: {
          subscriptionCount: t.subscriptionCount ?? 0,
          status: status.get(t.name) ?? "Unknown",
        },
      });
    }
    return topics;
  }

  async listSubscriptions(topicName: string): Promise<SBSubscription[]> {
    const endpoint = this.connection.serviceBusEndpoint;
    const client = await this.adminClient();

    // Configuration (status, delivery count) isn't in the runtime properties,
    // so read it from `listSubscriptions()` and merge by name.
    const config = new Map<string, SubscriptionProperties>();
    for await (const s of client.listSubscriptions(topicName)) {
      config.set(s.subscriptionName, s);
    }

    const subscriptions: SBSubscription[] = [];
    for await (const s of client.listSubscriptionsRuntimeProperties(
      topicName,
    )) {
      const cfg = config.get(s.subscriptionName);
      subscriptions.push({
        id:
          `${endpoint}/topics/${topicName}` +
          `/subscriptions/${s.subscriptionName}`,
        name: s.subscriptionName,
        type: "Microsoft.ServiceBus/Namespaces/Topics/Subscriptions",
        properties: {
          countDetails: {
            activeMessageCount: s.activeMessageCount,
            deadLetterMessageCount: s.deadLetterMessageCount,
            scheduledMessageCount: 0,
            transferMessageCount: s.transferMessageCount ?? 0,
            transferDeadLetterMessageCount:
              s.transferDeadLetterMessageCount ?? 0,
          },
          messageCount: s.totalMessageCount ?? 0,
          status: cfg?.status ?? "Unknown",
          maxDeliveryCount: cfg?.maxDeliveryCount ?? 10,
        },
      });
    }
    return subscriptions;
  }

  async peekMessages(
    params: PeekMessagesParams,
  ): Promise<PagedResult<ServiceBusReceivedMessage>> {
    const { entityPath, subQueue, skip, top } = params;

    // Total count comes from the entity's runtime properties.
    const admin = await this.adminClient();
    let totalCount: number;
    if (entityPath.includes("/")) {
      const [topicName, subName] = entityPath.split("/");
      const rt = await admin.getSubscriptionRuntimeProperties(
        topicName,
        subName,
      );
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

    const { ServiceBusClient: SdkClient } = await import("@azure/service-bus");
    const client = new SdkClient(this.connectionString());
    try {
      const options =
        subQueue === "deadletter"
          ? { subQueueType: "deadLetter" as const }
          : {};
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
}
