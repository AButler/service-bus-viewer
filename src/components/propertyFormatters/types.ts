import type { ReactNode } from "react";

/** Detail level for a formatted property value. */
export type FormatterDetail = "simple" | "full";

/**
 * Formats a raw property value into display content. Returning a string renders
 * (and is copyable) as text; returning any other `ReactNode` lets a formatter
 * provide a custom control. `undefined` renders the “—” fallback.
 */
export type PropertyFormatter = (
  value: unknown,
  detail: FormatterDetail,
) => ReactNode;
