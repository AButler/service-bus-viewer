import { formatDistanceToNow } from "date-fns";
import type { PropertyFormatter } from "./types";

/** Render a date as an ISO 8601 (UTC) string with the time relative to now. */
export const formatDateTime: PropertyFormatter = (value) => {
  const date = new Date(value as string | Date);
  const iso = date.toISOString().replace(/\.\d{3}Z$/, "Z");
  const relative = formatDistanceToNow(date, { addSuffix: true });
  return `${iso} (${relative})`;
};
