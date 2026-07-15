// React Query hooks around the connection store. Mutations invalidate the
// connection list and the namespace list (which is derived from connections).

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getConnectionStore } from "../lib/connectionStore";
import type {
  NamespaceConnection,
  NamespaceConnectionDraft,
} from "../lib/connectionStore";

const store = getConnectionStore();

export function useConnections() {
  return useQuery({
    queryKey: ["connections"],
    queryFn: () => store.list(),
  });
}

export function useConnectionMutations() {
  const queryClient = useQueryClient();
  const onSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["connections"] });
    queryClient.invalidateQueries({ queryKey: ["namespaces"] });
  };

  const addConnection = useMutation({
    mutationFn: (draft: NamespaceConnectionDraft) => store.add(draft),
    onSuccess,
  });
  const updateConnection = useMutation({
    mutationFn: (connection: NamespaceConnection) => store.update(connection),
    onSuccess,
  });
  const removeConnection = useMutation({
    mutationFn: (id: string) => store.remove(id),
    onSuccess,
  });

  const reorderConnections = useMutation({
    mutationFn: (orderedIds: string[]) => store.reorder(orderedIds),
    // Optimistically reorder the cached connections so the tree updates
    // immediately (the namespace list is derived from this order).
    onMutate: async (orderedIds) => {
      await queryClient.cancelQueries({ queryKey: ["connections"] });
      const previous = queryClient.getQueryData<NamespaceConnection[]>([
        "connections",
      ]);
      if (previous) {
        const byId = new Map(previous.map((c) => [c.id, c]));
        const next = orderedIds
          .map((id) => byId.get(id))
          .filter((c): c is NamespaceConnection => c !== undefined);
        for (const c of previous) {
          if (!orderedIds.includes(c.id)) next.push(c);
        }
        queryClient.setQueryData(["connections"], next);
      }
      return { previous };
    },
    onError: (_error, _orderedIds, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["connections"], context.previous);
      }
    },
    onSettled: onSuccess,
  });

  return {
    addConnection,
    updateConnection,
    removeConnection,
    reorderConnections,
  };
}
