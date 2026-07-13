import { useQueryClient } from "@tanstack/react-query";
import type { SBNamespace, SBQueue, SBSubscription } from "../../api/types";
import { deriveNamespaceHost } from "../../lib/namespace";
import type { SelectedEntity } from "./types";

/**
 * Resolve a tree item id to a `SelectedEntity`, reading count details out of
 * the React Query cache so the header can show totals without a new request.
 */
export function useResolveSelection() {
  const queryClient = useQueryClient();

  return (itemId: string): SelectedEntity | null => {
    const separator = itemId.indexOf(":");
    const kind = itemId.slice(0, separator);
    const rest = itemId.slice(separator + 1);
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
        countDetails: subscription.properties.countDetails,
      };
    }

    return null;
  };
}
