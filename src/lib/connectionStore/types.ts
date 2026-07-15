// A namespace connection stored in the user's configuration.
//
// Non-sensitive fields (friendly name, endpoint, auth kind, SAS key name, Entra
// tenant/client ids) are persisted in plain config; the sensitive parts (SAS
// key, Entra refresh token) are stored via the secure backend (see index.ts).

export type ConnectionAuth =
  | { kind: "sas"; keyName: string; key: string }
  | {
      kind: "entra";
      tenantId: string;
      refreshToken?: string;
    };

export interface NamespaceConnection {
  id: string;
  friendlyName: string;
  serviceBusEndpoint: string;
  auth: ConnectionAuth;
}

/** A connection being created (no id assigned yet). */
export type NamespaceConnectionDraft = Omit<NamespaceConnection, "id">;

/** Persistence backend for namespace connections (browser or Tauri). */
export interface ConnectionStore {
  list(): Promise<NamespaceConnection[]>;
  add(draft: NamespaceConnectionDraft): Promise<NamespaceConnection>;
  update(connection: NamespaceConnection): Promise<void>;
  remove(id: string): Promise<void>;
}
