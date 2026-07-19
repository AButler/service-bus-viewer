// React Query hooks wrapping the Service Bus API. Query keys mirror the
// resource hierarchy so caching and invalidation behave predictably.

import { useSyncExternalStore } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { NamespaceConnection } from "../lib/connectionStore";
import type { PeekMessagesParams, SendMessageParams } from "../api/types";
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

/**
 * Send a message to a queue or topic. On success, invalidates the peeked
 * messages and the entity lists so counts refresh.
 */
export function useSendMessage() {
  const queryClient = useQueryClient();
  const connections = useConnections();
  return useMutation({
    mutationFn: (params: SendMessageParams) => {
      const connection = connections.data?.find(
        (c) => c.friendlyName === params.namespaceName,
      );
      if (!connection) {
        throw new Error(`No connection for namespace "${params.namespaceName}".`);
      }
      return useServiceBusClient(connection).sendMessage(params);
    },
    onSuccess: (_result, params) => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      queryClient.invalidateQueries({
        queryKey: ["queues", params.namespaceName],
      });
      queryClient.invalidateQueries({
        queryKey: ["topics", params.namespaceName],
      });
      queryClient.invalidateQueries({
        queryKey: ["subscriptions", params.namespaceName],
      });
    },
  });
}
