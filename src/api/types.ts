// Types mirroring the shapes returned by the official Microsoft Azure Service
// Bus APIs:
//  - Management plane (@azure/arm-servicebus): SBNamespace, SBQueue, SBTopic,
//    SBSubscription, MessageCountDetails.
//  - Data plane (@azure/service-bus): ServiceBusReceivedMessage.
// A real implementation would return these directly from the SDK; here they are
// produced from mock data with the same structure.

/** Message counts for an entity, as returned in `properties.countDetails`. */
export interface MessageCountDetails {
  activeMessageCount: number;
  deadLetterMessageCount: number;
  scheduledMessageCount: number;
  transferMessageCount: number;
  transferDeadLetterMessageCount: number;
}

// The set of entity statuses returned by the Azure Service Bus SDK
// (`EntityStatus` from `@azure/service-bus`).
export type EntityStatus =
  | "Active"
  | "Creating"
  | "Deleting"
  | "Disabled"
  | "ReceiveDisabled"
  | "Renaming"
  | "Restoring"
  | "SendDisabled"
  | "Unknown";

export interface SBNamespace {
  id: string;
  name: string;
  type: "Microsoft.ServiceBus/Namespaces";
  properties: {
    serviceBusEndpoint: string;
  };
}

export interface SBQueue {
  id: string;
  name: string;
  type: "Microsoft.ServiceBus/Namespaces/Queues";
  properties: {
    countDetails: MessageCountDetails;
    messageCount: number;
    status: EntityStatus;
    maxDeliveryCount: number;
    requiresSession: boolean;
    requiresDuplicateDetection: boolean;
  };
}

export interface SBTopic {
  id: string;
  name: string;
  type: "Microsoft.ServiceBus/Namespaces/Topics";
  properties: {
    subscriptionCount: number;
    status: EntityStatus;
  };
}

export interface SBSubscription {
  id: string;
  name: string;
  type: "Microsoft.ServiceBus/Namespaces/Topics/Subscriptions";
  properties: {
    countDetails: MessageCountDetails;
    messageCount: number;
    status: EntityStatus;
    maxDeliveryCount: number;
  };
}

/** Value allowed in `applicationProperties`, per the data-plane SDK. */
export type ApplicationPropertyValue = string | number | boolean | Date | null;

/**
 * Shape of a peeked message from the data-plane SDK (`ServiceBusReceivedMessage`).
 * Note: `state` never becomes "deadletter" — dead-lettered messages are read
 * from the dead-letter sub-queue and are surfaced via `deadLetterReason`.
 */
export interface ServiceBusReceivedMessage {
  messageId: string;
  sequenceNumber: number;
  enqueuedSequenceNumber: number;
  subject?: string;
  body: unknown;
  contentType?: string;
  correlationId?: string;
  sessionId?: string;
  partitionKey?: string;
  enqueuedTimeUtc: Date;
  expiresAtUtc?: Date;
  scheduledEnqueueTimeUtc?: Date;
  timeToLive?: number;
  deliveryCount: number;
  state: "active" | "deferred" | "scheduled";
  applicationProperties?: Record<string, ApplicationPropertyValue>;
  deadLetterReason?: string;
  deadLetterErrorDescription?: string;
  deadLetterSource?: string;
}

/**
 * A message view / sub-queue that can be peeked for an entity. `active` is the
 * main queue; the rest map to sub-queues or filtered states.
 */
export type MessageView =
  | "active"
  | "deadletter"
  | "transferDeadletter"
  | "scheduled"
  | "deferred";

/** The kind of entity a peek targets. */
export type PeekEntityType = "queue" | "subscription" | "topic";

/** Parameters for peeking a page of messages from an entity. */
export interface PeekMessagesParams {
  namespaceName: string;
  entityPath: string;
  entityType: PeekEntityType;
  view: MessageView;
  skip: number;
  top: number;
}

/**
 * A page of results. Mirrors the ARM `{ value, nextLink }` envelope, augmented
 * with `totalCount` so paged callers can display the full total.
 */
export interface PagedResult<T> {
  value: T[];
  totalCount: number;
  nextSkip: number | null;
}

/**
 * Operations for a single namespace, implemented by both the real Azure client
 * (`ServiceBusClient`) and the mock (`MockServiceBusClient`). Resolve one with
 * `useServiceBusClient(connection)`.
 */
export interface ServiceBusApi {
  listQueues(): Promise<SBQueue[]>;
  listTopics(): Promise<SBTopic[]>;
  listSubscriptions(topicName: string): Promise<SBSubscription[]>;
  peekMessages(
    params: PeekMessagesParams,
  ): Promise<PagedResult<ServiceBusReceivedMessage>>;
}
