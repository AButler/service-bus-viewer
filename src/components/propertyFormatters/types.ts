/** Detail level for a formatted property value. */
export type FormatterDetail = "simple" | "full";

/** A function that formats a raw property value into a display string. */
export type PropertyFormatter = (
  value: unknown,
  detail: FormatterDetail,
) => string;
