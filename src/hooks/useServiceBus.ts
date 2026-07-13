// React Query hooks wrapping the mock Service Bus API. Query keys mirror the
// resource hierarchy so caching and invalidation behave predictably.

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  listNamespaces,
  listQueues,
  listSubscriptions,
  listTopics,
  peekMessages,
  type PeekMessagesParams,
} from "../api/serviceBusClient";

export function useNamespaces() {
  return useQuery({
    queryKey: ["namespaces"],
    queryFn: listNamespaces,
  });
}

export function useQueues(namespaceName: string, enabled: boolean) {
  return useQuery({
    queryKey: ["queues", namespaceName],
    queryFn: () => listQueues(namespaceName),
    enabled,
  });
}

export function useTopics(namespaceName: string, enabled: boolean) {
  return useQuery({
    queryKey: ["topics", namespaceName],
    queryFn: () => listTopics(namespaceName),
    enabled,
  });
}

export function useSubscriptions(
  namespaceName: string,
  topicName: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ["subscriptions", namespaceName, topicName],
    queryFn: () => listSubscriptions(namespaceName, topicName),
    enabled,
  });
}

export function useMessages(params: PeekMessagesParams | null) {
  return useQuery({
    queryKey: ["messages", params],
    queryFn: () => peekMessages(params!),
    enabled: params !== null,
    placeholderData: keepPreviousData,
  });
}
