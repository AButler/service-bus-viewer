import { useQueryClient } from "@tanstack/react-query";
import type {
  MessageCountDetails,
  MessageView,
  SBNamespace,
  SBQueue,
  SBSubscription,
  SBTopic,
} from "../../api/types";
import { deriveNamespaceHost } from "../../lib/namespace";
import type { SelectedEntity } from "./types";

const EMPTY_COUNTS: MessageCountDetails = {
  activeMessageCount: 0,
  deadLetterMessageCount: 0,
  scheduledMessageCount: 0,
  transferMessageCount: 0,
  transferDeadLetterMessageCount: 0,
};

/**
 * Resolve a tree item id to a `SelectedEntity`, reading count details out of
 * the React Query cache so the header can show totals without a new request.
 * Item ids may carry a `#<view>` suffix identifying a sub-queue.
 */
export function useResolveSelection() {
  const queryClient = useQueryClient();

  return (itemId: string): SelectedEntity | null => {
    const separator = itemId.indexOf(":");
    const kind = itemId.slice(0, separator);
    const [rest, viewPart] = itemId.slice(separator + 1).split("#");
    const view = (viewPart ?? "active") as MessageView;
    const parts = rest.split("/");
    const namespaceName = parts[0];

    const namespaces = queryClient.getQueryData<SBNamespace[]>(["namespaces"]);
    const namespace = namespaces?.find((n) => n.name === namespaceName);
    const namespaceHost = namespace
      ? deriveNamespaceHost(namespace.properties.serviceBusEndpoint)
      : namespaceName;

    if (kind === "queue") {
      const queues = queryClient.getQueryData<SBQueue[]>([
        "queues",
        namespaceName,
      ]);
      const queue = queues?.find((q) => q.name === parts[1]);
      if (!queue) return null;
      return {
        itemId,
        kind: "queue",
        namespaceName,
        namespaceHost,
        entityPath: queue.name,
        label: queue.name,
        view,
        countDetails: queue.properties.countDetails,
      };
    }

    if (kind === "subscription") {
      const [, topicName, subName] = parts;
      const subscriptions = queryClient.getQueryData<SBSubscription[]>([
        "subscriptions",
        namespaceName,
        topicName,
      ]);
      const subscription = subscriptions?.find((s) => s.name === subName);
      if (!subscription) return null;
      return {
        itemId,
        kind: "subscription",
        namespaceName,
        namespaceHost,
        entityPath: `${topicName}/${subName}`,
        label: `${topicName} / ${subName}`,
        view,
        countDetails: subscription.properties.countDetails,
      };
    }

    // A topic is only selectable via its scheduled sub-queue (`#scheduled`); the
    // plain topic branch itself isn't a selectable entity.
    if (kind === "topic" && viewPart) {
      const topicName = parts[1];
      const topics = queryClient.getQueryData<SBTopic[]>([
        "topics",
        namespaceName,
      ]);
      const topic = topics?.find((t) => t.name === topicName);
      if (!topic) return null;
      return {
        itemId,
        kind: "topic",
        namespaceName,
        namespaceHost,
        entityPath: topicName,
        label: `${topicName} · scheduled`,
        view,
        countDetails: EMPTY_COUNTS,
      };
    }

    return null;
  };
}
