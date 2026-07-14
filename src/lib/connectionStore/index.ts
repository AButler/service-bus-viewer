import { browserConnectionStore } from "./browserStore";
import type { ConnectionStore } from "./types";

export type {
  ConnectionAuth,
  ConnectionStore,
  NamespaceConnection,
  NamespaceConnectionDraft,
} from "./types";

// Resolve the connection store for the current runtime.
//
// The browser backend (IndexedDB + WebCrypto) also works inside the Tauri
// webview, so it is used everywhere today. The Tauri build will later swap in a
// backend that keeps secrets in the OS keychain (see the connection-store notes
// in AGENTS.md).
export function getConnectionStore(): ConnectionStore {
  return browserConnectionStore;
}
