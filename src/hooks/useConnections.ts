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

  return { addConnection, updateConnection, removeConnection };
}
