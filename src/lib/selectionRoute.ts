// Maps between the app's entity/message selection and the URL path.
//
//   /<namespace>/queues/<queue>/<view>[/<sequenceNumber>]
//   /<namespace>/topics/<topic>/<subscription>/<view>[/<sequenceNumber>]
//
// where <view> is "messages" (active) or "dead-letters" (dead-letter queue).
// The message is identified by its sequence number, which Service Bus
// guarantees to be unique within an entity (unlike the optional messageId).

export type MessageView = "active" | "deadletter";

export interface RouteSelection {
  itemId: string;
  kind: "queue" | "subscription";
  namespaceName: string;
  entityPath: string;
  label: string;
  view: MessageView;
  sequenceNumber: string | null;
}

const enc = encodeURIComponent;

const VIEW_SEGMENTS: Record<string, MessageView> = {
  messages: "active",
  "dead-letters": "deadletter",
};
const VIEW_PATHS: Record<MessageView, string> = {
  active: "messages",
  deadletter: "dead-letters",
};

/** Parse a pathname into a selection, or null when it isn't a selection path. */
export function parseSelectionPath(pathname: string): RouteSelection | null {
  const parts = pathname.split("/").filter(Boolean).map(decodeURIComponent);
  if (parts.length < 3) return null;

  const [namespaceName, kind, ...rest] = parts;

  if (kind === "queues") {
    const [queueName, viewSegment, sequenceNumber] = rest;
    if (!queueName) return null;
    const hasView = viewSegment in VIEW_SEGMENTS;
    return {
      itemId: `queue:${namespaceName}/${queueName}`,
      kind: "queue",
      namespaceName,
      entityPath: queueName,
      label: queueName,
      view: hasView ? VIEW_SEGMENTS[viewSegment] : "active",
      sequenceNumber: hasView ? (sequenceNumber ?? null) : null,
    };
  }

  if (kind === "topics") {
    const [topicName, subscriptionName, viewSegment, sequenceNumber] = rest;
    if (!topicName || !subscriptionName) return null;
    const hasView = viewSegment in VIEW_SEGMENTS;
    return {
      itemId: `subscription:${namespaceName}/${topicName}/${subscriptionName}`,
      kind: "subscription",
      namespaceName,
      entityPath: `${topicName}/${subscriptionName}`,
      label: `${topicName} / ${subscriptionName}`,
      view: hasView ? VIEW_SEGMENTS[viewSegment] : "active",
      sequenceNumber: hasView ? (sequenceNumber ?? null) : null,
    };
  }

  return null;
}

interface EntityLike {
  kind: "queue" | "subscription";
  namespaceName: string;
  entityPath: string;
}

/** Build the URL path for a selected entity and message view. */
export function buildEntityPath(entity: EntityLike, view: MessageView): string {
  const base =
    entity.kind === "queue"
      ? `/${enc(entity.namespaceName)}/queues/${enc(entity.entityPath)}`
      : (() => {
          const [topicName, subscriptionName] = entity.entityPath.split("/");
          return `/${enc(entity.namespaceName)}/topics/${enc(topicName)}/${enc(
            subscriptionName,
          )}`;
        })();
  return `${base}/${VIEW_PATHS[view]}`;
}

/** Build the URL path for a message within a selected entity and view. */
export function buildMessagePath(
  entity: EntityLike,
  view: MessageView,
  sequenceNumber: string,
): string {
  return `${buildEntityPath(entity, view)}/${enc(sequenceNumber)}`;
}

/** Item ids of the tree ancestors that must be expanded to reveal a selection. */
export function selectionAncestorItemIds(selection: RouteSelection): string[] {
  const { namespaceName } = selection;
  if (selection.kind === "queue") {
    return [`namespace:${namespaceName}`, `group:${namespaceName}:queues`];
  }
  const [topicName] = selection.entityPath.split("/");
  return [
    `namespace:${namespaceName}`,
    `group:${namespaceName}:topics`,
    `topic:${namespaceName}/${topicName}`,
  ];
}
