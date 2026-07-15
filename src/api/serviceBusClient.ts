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
import type { TokenCredential } from "@azure/core-auth";
import type { NamespaceConnection } from "../lib/connectionStore";
import { getConnectionStore } from "../lib/connectionStore";
import { createEntraCredential } from "../lib/entraAuth";

// Peek is bounded so a stalled AMQP connection can't hang the UI forever. The
// SDK's own retries are disabled (maxRetries: 0) so we retry transient failures
// ourselves while failing fast on non-retryable ones (access denied).
const PEEK_SDK_OPTIONS = { retryOptions: { maxRetries: 0 } };
const PEEK_MAX_ATTEMPTS = 3;
const PEEK_TIMEOUT_MS = 20_000;
const PEEK_TIMEOUT_MESSAGE =
  "Timed out peeking messages. For Entra ID connections, check the signed-in " +
  "user has an Azure Service Bus data role on the namespace.";

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Authorization failures (e.g. a missing Azure Service Bus data role) aren't
// worth retrying — surface them immediately.
function isAccessDeniedError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as {
    code?: unknown;
    name?: unknown;
    message?: unknown;
    statusCode?: unknown;
  };
  if (e.code === "UnauthorizedAccess") return true;
  if (e.statusCode === 401 || e.statusCode === 403) return true;
  const text = `${String(e.code ?? "")} ${String(e.name ?? "")} ${String(
    e.message ?? "",
  )}`.toLowerCase();
  return (
    text.includes("unauthorized") ||
    text.includes("access denied") ||
    text.includes("forbidden")
  );
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
    partitionKey: m.partitionKey,
    enqueuedTimeUtc: m.enqueuedTimeUtc ?? new Date(),
    expiresAtUtc: m.expiresAtUtc,
    scheduledEnqueueTimeUtc: m.scheduledEnqueueTimeUtc,
    timeToLive: m.timeToLive,
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
  private connection: NamespaceConnection;
  private credential?: TokenCredential;

  constructor(connection: NamespaceConnection) {
    this.connection = connection;
  }

  // Fully-qualified namespace host (e.g. `contoso.servicebus.windows.net`),
  // used for the token-credential-based clients.
  private host(): string {
    try {
      return new URL(this.connection.serviceBusEndpoint).hostname;
    } catch {
      return this.connection.serviceBusEndpoint;
    }
  }

  // Persist a rotated Entra refresh token so it survives app restarts.
  private persistRefreshToken(refreshToken: string): void {
    const { auth } = this.connection;
    if (auth.kind !== "entra") return;
    this.connection = {
      ...this.connection,
      auth: { ...auth, refreshToken },
    };
    void getConnectionStore()
      .update(this.connection)
      .catch(() => {
        // Best-effort; the in-memory credential still holds the latest token.
      });
  }

  private getCredential(): TokenCredential {
    const { auth } = this.connection;
    if (auth.kind !== "entra") {
      throw new Error("A token credential is only available for Entra auth.");
    }
    if (!auth.refreshToken) {
      throw new Error(
        "Not signed in. Reconnect the namespace to sign in with Entra ID.",
      );
    }
    this.credential ??= createEntraCredential(
      {
        tenantId: auth.tenantId,
        refreshToken: auth.refreshToken,
      },
      (rotated) => this.persistRefreshToken(rotated),
    );
    return this.credential;
  }

  private connectionString(): string {
    const { auth, serviceBusEndpoint } = this.connection;
    if (auth.kind !== "sas") {
      throw new Error("A connection string is only available for SAS auth.");
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
    return this.connection.auth.kind === "sas"
      ? new ServiceBusAdministrationClient(this.connectionString())
      : new ServiceBusAdministrationClient(this.host(), this.getCredential());
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
    const { entityPath, entityType, view, skip, top } = params;

    // Topic-level scheduled messages have no data-plane receiver (topics can't
    // be received from), so there is nothing to peek. TODO: surface via a
    // management API if one becomes available.
    if (entityType === "topic") {
      return { value: [], totalCount: 0, nextSkip: null };
    }

    // Total count comes from the entity's runtime properties.
    const admin = await this.adminClient();
    const rt =
      entityType === "subscription"
        ? await admin.getSubscriptionRuntimeProperties(
            entityPath.split("/")[0],
            entityPath.split("/")[1],
          )
        : await admin.getQueueRuntimeProperties(entityPath);
    const counts = rt as {
      activeMessageCount: number;
      deadLetterMessageCount: number;
      scheduledMessageCount?: number;
      transferDeadLetterMessageCount?: number;
    };
    const totalCount =
      view === "deadletter"
        ? counts.deadLetterMessageCount
        : view === "transferDeadletter"
          ? (counts.transferDeadLetterMessageCount ?? 0)
          : view === "scheduled"
            ? (counts.scheduledMessageCount ?? 0)
            : view === "deferred"
              ? 0 // no runtime count for deferred; best-effort
              : counts.activeMessageCount;

    const { ServiceBusClient: SdkClient } = await import("@azure/service-bus");
    let lastError: unknown;
    for (let attempt = 1; attempt <= PEEK_MAX_ATTEMPTS; attempt++) {
      try {
        const value = await this.peekPage(
          SdkClient,
          entityPath,
          entityType,
          view,
          skip,
          top,
        );
        return {
          value,
          totalCount,
          nextSkip: skip + top < totalCount ? skip + top : null,
        };
      } catch (err) {
        // Access-denied is not retryable — return straight away instead of
        // retrying and waiting out the timeout.
        if (isAccessDeniedError(err)) throw err;
        lastError = err;
        if (attempt < PEEK_MAX_ATTEMPTS) await delay(500 * attempt);
      }
    }
    throw lastError;
  }

  // One peek attempt: open a client + receiver, peek a page, and clean up.
  // Dead-letter/transfer-dead-letter read from a sub-queue; scheduled/deferred/
  // active share the main queue and are filtered by message state.
  private async peekPage(
    SdkClient: typeof import("@azure/service-bus").ServiceBusClient,
    entityPath: string,
    entityType: PeekMessagesParams["entityType"],
    view: PeekMessagesParams["view"],
    skip: number,
    top: number,
  ): Promise<ServiceBusReceivedMessage[]> {
    const client =
      this.connection.auth.kind === "sas"
        ? new SdkClient(this.connectionString(), PEEK_SDK_OPTIONS)
        : new SdkClient(this.host(), this.getCredential(), PEEK_SDK_OPTIONS);
    try {
      const options =
        view === "deadletter"
          ? { subQueueType: "deadLetter" as const }
          : view === "transferDeadletter"
            ? { subQueueType: "transferDeadLetter" as const }
            : {};
      const receiver =
        entityType === "subscription"
          ? client.createReceiver(
              entityPath.split("/")[0],
              entityPath.split("/")[1],
              options,
            )
          : client.createReceiver(entityPath, options);

      // Peek is cursor-based; peek `skip + top` from the start and slice the
      // page. Bounded so a stalled connection surfaces as an error.
      const peeked = await withTimeout(
        receiver.peekMessages(skip + top),
        PEEK_TIMEOUT_MS,
        PEEK_TIMEOUT_MESSAGE,
      );
      await receiver.close();

      let mapped = peeked.map(mapMessage);
      // Scheduled/deferred/active come from the same peek; filter by state.
      const stateFilter =
        view === "scheduled"
          ? "scheduled"
          : view === "deferred"
            ? "deferred"
            : view === "active"
              ? "active"
              : null;
      if (stateFilter) {
        mapped = mapped.filter((m) => m.state === stateFilter);
      }
      return mapped.slice(skip, skip + top);
    } finally {
      await client.close();
    }
  }
}
