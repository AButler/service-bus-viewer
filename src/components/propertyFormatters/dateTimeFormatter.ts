import { formatDistanceToNow } from "date-fns";
import type { PropertyFormatter } from "./types";

/**
 * Render a date as an ISO 8601 (UTC) string. "full" also appends the time
 * relative to now; "simple" renders only the ISO string.
 */
export const formatDateTime: PropertyFormatter = (value, detail) => {
  const date = new Date(value as string | Date);
  const iso = date.toISOString().replace(/\.\d{3}Z$/, "Z");
  if (detail === "simple") {
    return iso;
  }
  const relative = formatDistanceToNow(date, { addSuffix: true });
  return `${iso} (${relative})`;
};
