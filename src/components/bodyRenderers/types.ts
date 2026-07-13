import type { ComponentType } from "react";

/** Props passed to every message-body renderer. */
export interface BodyRendererProps {
  body: unknown;
  contentType?: string;
}

/** A component that renders a message body for a given content type. */
export type BodyRenderer = ComponentType<BodyRendererProps>;
