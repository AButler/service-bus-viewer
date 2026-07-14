// React Query hooks wrapping the Service Bus API. Query keys mirror the
// resource hierarchy so caching and invalidation behave predictably.

import { useSyncExternalStore } from "react";
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { NamespaceConnection } from "../lib/connectionStore";
import type { PeekMessagesParams } from "../api/types";
import {
  listNamespaces,
  useServiceBusClient,
} from "../api/useServiceBusClient";
import { useConnections } from "./useConnections";

export function useNamespaces() {
  const connections = useConnections();
  return useQuery({
    queryKey: ["namespaces", connections.data?.map((c) => c.id) ?? []],
    queryFn: () => listNamespaces(connections.data ?? []),
    enabled: connections.isSuccess,
  });
}

/**
 * Whether a namespace has been queried successfully at least once. Reads the
 * query cache directly (via a cache subscription) rather than registering its
 * own query, so it never interferes with fetching/refetching. Used to show a
 * "connected" indicator once the tree has been expanded.
 */
export function useNamespaceConnected(namespaceName: string): boolean {
  const queryClient = useQueryClient();
  return useSyncExternalStore(
    (onChange) => queryClient.getQueryCache().subscribe(onChange),
    () =>
      queryClient.getQueryState(["queues", namespaceName])?.status ===
        "success" ||
      queryClient.getQueryState(["topics", namespaceName])?.status ===
        "success",
  );
}

// Resolve the stored connection backing a namespace (by friendly name).
function useConnection(namespaceName: string): NamespaceConnection | undefined {
  const connections = useConnections();
  return connections.data?.find((c) => c.friendlyName === namespaceName);
}

export function useQueues(namespaceName: string, enabled: boolean) {
  const connection = useConnection(namespaceName);
  return useQuery({
    queryKey: ["queues", namespaceName],
    queryFn: () => useServiceBusClient(connection!).listQueues(),
    enabled: enabled && connection !== undefined,
  });
}

export function useTopics(namespaceName: string, enabled: boolean) {
  const connection = useConnection(namespaceName);
  return useQuery({
    queryKey: ["topics", namespaceName],
    queryFn: () => useServiceBusClient(connection!).listTopics(),
    enabled: enabled && connection !== undefined,
  });
}

export function useSubscriptions(
  namespaceName: string,
  topicName: string,
  enabled: boolean,
) {
  const connection = useConnection(namespaceName);
  return useQuery({
    queryKey: ["subscriptions", namespaceName, topicName],
    queryFn: () =>
      useServiceBusClient(connection!).listSubscriptions(topicName),
    enabled: enabled && connection !== undefined,
  });
}

export function useMessages(params: PeekMessagesParams | null) {
  const connection = useConnection(params?.namespaceName ?? "");
  return useQuery({
    queryKey: ["messages", params],
    queryFn: () => useServiceBusClient(connection!).peekMessages(params!),
    enabled: params !== null && connection !== undefined,
    placeholderData: keepPreviousData,
  });
}
