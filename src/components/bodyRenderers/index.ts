import JsonBodyRenderer from "./JsonBodyRenderer";
import PlainTextBodyRenderer from "./PlainTextBodyRenderer";
import type { BodyRenderer } from "./types";

export type { BodyRenderer, BodyRendererProps } from "./types";

// Registry of content-type (MIME essence) -> renderer. Add new entries here to
// support additional content types (e.g. "application/xml", "text/plain").
const renderers: Record<string, BodyRenderer> = {
  "application/json": JsonBodyRenderer,
};

function normalizeContentType(contentType?: string): string {
  // Strip parameters (e.g. "application/json; charset=utf-8") and lowercase.
  return (contentType ?? "").split(";")[0].trim().toLowerCase();
}

/** Resolve the renderer for a content type, falling back to plain text. */
export function getBodyRenderer(contentType?: string): BodyRenderer {
  const essence = normalizeContentType(contentType);
  if (renderers[essence]) return renderers[essence];
  // Treat structured suffixes like "application/vnd.foo+json" as JSON too.
  if (essence.endsWith("+json")) return JsonBodyRenderer;
  return PlainTextBodyRenderer;
}
