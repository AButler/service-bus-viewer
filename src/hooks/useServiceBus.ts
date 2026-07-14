// React Query hooks wrapping the Service Bus API. Query keys mirror the
// resource hierarchy so caching and invalidation behave predictably.

import { keepPreviousData, useQuery } from "@tanstack/react-query";
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
