// Maps between the app's entity/message selection and the URL path.
//
//   /<namespace>/queues/<queue>/<view>[/<sequenceNumber>]
//   /<namespace>/topics/<topic>/<subscription>/<view>[/<sequenceNumber>]
//   /<namespace>/topic-scheduled/<topic>[/<sequenceNumber>]
//
// <view> is one of: messages (active), dead-letters, transfer-dead-letters,
// scheduled, deferred. The topic-scheduled route targets a topic's scheduled
// messages (the topic entity has no subscription). The message is identified by
// its sequence number, which Service Bus guarantees to be unique within an
// entity (unlike the optional messageId).

import type { MessageView } from "../api/types";

export type { MessageView } from "../api/types";

export type SelectionKind = "queue" | "subscription" | "topic";

export interface RouteSelection {
  itemId: string;
  kind: SelectionKind;
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
  "transfer-dead-letters": "transferDeadletter",
  scheduled: "scheduled",
  deferred: "deferred",
};
const VIEW_PATHS: Record<MessageView, string> = {
  active: "messages",
  deadletter: "dead-letters",
  transferDeadletter: "transfer-dead-letters",
  scheduled: "scheduled",
  deferred: "deferred",
};

/** Human-readable label for a message view. */
export const VIEW_LABELS: Record<MessageView, string> = {
  active: "Messages",
  deadletter: "Dead-letter",
  transferDeadletter: "Transfer dead-letter",
  scheduled: "Scheduled",
  deferred: "Deferred",
};

// The tree item id for a selection: the entity id for the main (active) view,
// or the entity id suffixed with `#<view>` for a sub-queue.
function itemIdFor(baseItemId: string, view: MessageView): string {
  return view === "active" ? baseItemId : `${baseItemId}#${view}`;
}

/** Parse a pathname into a selection, or null when it isn't a selection path. */
export function parseSelectionPath(pathname: string): RouteSelection | null {
  const parts = pathname.split("/").filter(Boolean).map(decodeURIComponent);
  if (parts.length < 2) return null;

  const [namespaceName, kind, ...rest] = parts;

  if (kind === "queues") {
    const [queueName, viewSegment, sequenceNumber] = rest;
    if (!queueName) return null;
    const hasView = viewSegment in VIEW_SEGMENTS;
    const view = hasView ? VIEW_SEGMENTS[viewSegment] : "active";
    return {
      itemId: itemIdFor(`queue:${namespaceName}/${queueName}`, view),
      kind: "queue",
      namespaceName,
      entityPath: queueName,
      label: queueName,
      view,
      sequenceNumber: hasView ? (sequenceNumber ?? null) : null,
    };
  }

  if (kind === "topic-scheduled") {
    const [topicName, sequenceNumber] = rest;
    if (!topicName) return null;
    return {
      itemId: `topic:${namespaceName}/${topicName}#scheduled`,
      kind: "topic",
      namespaceName,
      entityPath: topicName,
      label: `${topicName} · scheduled`,
      view: "scheduled",
      sequenceNumber: sequenceNumber ?? null,
    };
  }

  if (kind === "topics") {
    const [topicName, subscriptionName, viewSegment, sequenceNumber] = rest;
    if (!topicName || !subscriptionName) return null;
    const hasView = viewSegment in VIEW_SEGMENTS;
    const view = hasView ? VIEW_SEGMENTS[viewSegment] : "active";
    return {
      itemId: itemIdFor(
        `subscription:${namespaceName}/${topicName}/${subscriptionName}`,
        view,
      ),
      kind: "subscription",
      namespaceName,
      entityPath: `${topicName}/${subscriptionName}`,
      label: `${topicName} / ${subscriptionName}`,
      view,
      sequenceNumber: hasView ? (sequenceNumber ?? null) : null,
    };
  }

  return null;
}

interface EntityLike {
  kind: SelectionKind;
  namespaceName: string;
  entityPath: string;
}

/** Build the URL path for a selected entity and message view. */
export function buildEntityPath(entity: EntityLike, view: MessageView): string {
  if (entity.kind === "topic") {
    return `/${enc(entity.namespaceName)}/topic-scheduled/${enc(
      entity.entityPath,
    )}`;
  }
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
    const ids = [`namespace:${namespaceName}`, `group:${namespaceName}:queues`];
    // A sub-queue node lives under the queue node, so expand it too.
    if (selection.view !== "active") {
      ids.push(`queue:${namespaceName}/${selection.entityPath}`);
    }
    return ids;
  }
  if (selection.kind === "topic") {
    return [
      `namespace:${namespaceName}`,
      `group:${namespaceName}:topics`,
      `topic:${namespaceName}/${selection.entityPath}`,
    ];
  }
  const [topicName, subName] = selection.entityPath.split("/");
  const ids = [
    `namespace:${namespaceName}`,
    `group:${namespaceName}:topics`,
    `topic:${namespaceName}/${topicName}`,
  ];
  if (selection.view !== "active") {
    ids.push(`subscription:${namespaceName}/${topicName}/${subName}`);
  }
  return ids;
}
