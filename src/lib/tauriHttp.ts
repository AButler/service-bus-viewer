import { isTauri } from "@tauri-apps/api/core";

// Tauri routes its own IPC and asset traffic through custom-protocol hosts that
// the webview serves with the native `fetch`. These MUST stay on the native
// fetch — routing them through the HTTP plugin (which itself uses IPC) would
// recurse infinitely and exhaust memory.
const INTERNAL_HOSTS = new Set([
  "ipc.localhost",
  "tauri.localhost",
  "asset.localhost",
]);

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

// Only external http(s) requests (e.g. the Azure management endpoint) need the
// plugin to escape the webview's CORS policy. Same-origin (dev server / app
// shell) and Tauri-internal traffic use the native fetch.
function shouldProxy(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl, location.href);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    if (url.origin === location.origin) return false;
    if (INTERNAL_HOSTS.has(url.hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

// In the Tauri desktop app, route external `fetch` calls through the HTTP plugin
// (Rust networking) so requests (e.g. the Azure management endpoint) aren't
// subject to the webview's CORS policy. No-op in the browser. Call once at
// startup.
export async function installTauriHttp(): Promise<void> {
  if (!isTauri()) return;
  const { fetch: tauriFetch } = await import("@tauri-apps/plugin-http");
  const nativeFetch = globalThis.fetch.bind(globalThis);

  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) =>
    shouldProxy(requestUrl(input))
      ? tauriFetch(input, init)
      : nativeFetch(input, init)) as typeof globalThis.fetch;
}
