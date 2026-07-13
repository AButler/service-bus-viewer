import { isTauri } from "@tauri-apps/api/core";

/**
 * Copy text to the clipboard. In the Tauri desktop app this uses the
 * clipboard-manager plugin; in the browser (dev server) it falls back to the
 * standard Clipboard API.
 */
export async function copyText(text: string): Promise<void> {
  if (isTauri()) {
    const { writeText } = await import("@tauri-apps/plugin-clipboard-manager");
    await writeText(text);
    return;
  }
  await navigator.clipboard.writeText(text);
}
