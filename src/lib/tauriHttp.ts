import { isTauri } from "@tauri-apps/api/core";

// In the Tauri desktop app, route all `fetch` through the HTTP plugin (Rust
// networking) so requests (e.g. the Azure management endpoint) aren't subject to
// the webview's CORS policy. No-op in the browser. Call once at startup.
export async function installTauriHttp(): Promise<void> {
  if (!isTauri()) return;
  const { fetch: tauriFetch } = await import("@tauri-apps/plugin-http");
  globalThis.fetch = tauriFetch as unknown as typeof globalThis.fetch;
}
