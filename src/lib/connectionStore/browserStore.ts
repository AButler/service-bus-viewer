// Browser ConnectionStore: config + encrypted secrets in IndexedDB.
//
// Each connection is persisted as a `StoredConnection`, with its secret (SAS
// key or Entra refresh token) held as an encrypted blob so nothing sensitive is
// written in plaintext. Works in the Tauri webview too (used until the native
// OS-keyring backend is wired in).

import { decryptString, encryptString, type EncryptedBlob } from "./crypto";
import { idbGet, idbSet } from "./idb";
import type {
  ConnectionStore,
  NamespaceConnection,
  NamespaceConnectionDraft,
} from "./types";

const CONNECTIONS_KEY = "connections";

interface StoredConnection {
  id: string;
  friendlyName: string;
  serviceBusEndpoint: string;
  authKind: "sas" | "entra";
  keyName?: string;
  tenantId?: string;
  secret: EncryptedBlob | null;
}

async function toStored(
  connection: NamespaceConnection,
): Promise<StoredConnection> {
  const base = {
    id: connection.id,
    friendlyName: connection.friendlyName,
    serviceBusEndpoint: connection.serviceBusEndpoint,
  };
  if (connection.auth.kind === "sas") {
    return {
      ...base,
      authKind: "sas",
      keyName: connection.auth.keyName,
      secret: await encryptString(connection.auth.key),
    };
  }
  return {
    ...base,
    authKind: "entra",
    tenantId: connection.auth.tenantId,
    secret: connection.auth.refreshToken
      ? await encryptString(connection.auth.refreshToken)
      : null,
  };
}

async function fromStored(
  stored: StoredConnection,
): Promise<NamespaceConnection> {
  const base = {
    id: stored.id,
    friendlyName: stored.friendlyName,
    serviceBusEndpoint: stored.serviceBusEndpoint,
  };
  if (stored.authKind === "sas") {
    return {
      ...base,
      auth: {
        kind: "sas",
        keyName: stored.keyName ?? "",
        key: stored.secret ? await decryptString(stored.secret) : "",
      },
    };
  }
  return {
    ...base,
    auth: {
      kind: "entra",
      tenantId: stored.tenantId ?? "",
      refreshToken: stored.secret
        ? await decryptString(stored.secret)
        : undefined,
    },
  };
}

async function readAll(): Promise<StoredConnection[]> {
  return (await idbGet<StoredConnection[]>(CONNECTIONS_KEY)) ?? [];
}

function writeAll(connections: StoredConnection[]): Promise<void> {
  return idbSet(CONNECTIONS_KEY, connections);
}

export const browserConnectionStore: ConnectionStore = {
  async list() {
    const stored = await readAll();
    return Promise.all(stored.map(fromStored));
  },

  async add(draft: NamespaceConnectionDraft) {
    const connection: NamespaceConnection = {
      ...draft,
      id: crypto.randomUUID(),
    };
    const stored = await readAll();
    stored.push(await toStored(connection));
    await writeAll(stored);
    return connection;
  },

  async update(connection: NamespaceConnection) {
    const stored = await readAll();
    const index = stored.findIndex((c) => c.id === connection.id);
    if (index === -1) return;
    stored[index] = await toStored(connection);
    await writeAll(stored);
  },

  async remove(id: string) {
    const stored = await readAll();
    await writeAll(stored.filter((c) => c.id !== id));
  },

  async reorder(orderedIds: string[]) {
    const stored = await readAll();
    const byId = new Map(stored.map((c) => [c.id, c]));
    const ordered = orderedIds
      .map((id) => byId.get(id))
      .filter((c): c is StoredConnection => c !== undefined);
    // Preserve any connections not covered by orderedIds (defensive).
    const remaining = stored.filter((c) => !orderedIds.includes(c.id));
    await writeAll([...ordered, ...remaining]);
  },
};
