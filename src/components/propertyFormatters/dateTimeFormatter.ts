import { formatDistanceToNow, formatISO } from "date-fns";
import { UTCDate } from "@date-fns/utc";
import type { PropertyFormatter } from "./types";

/**
 * Render a date as an ISO 8601 (UTC) string. "full" also appends the time
 * relative to now; "simple" renders only the ISO string.
 */
export const formatDateTime: PropertyFormatter = (value, detail) => {
  const date = new Date(value as string | Date);
  // Service Bus uses far-future dates (year 9999) as a "no expiry" sentinel;
  // treat anything beyond that as absent so it renders as "—".
  if (date.getUTCFullYear() > 9999) {
    return undefined;
  }
  const iso = formatISO(new UTCDate(date)).replace("+00:00", "Z");
  if (detail === "simple") {
    return iso;
  }
  const relative = formatDistanceToNow(date, { addSuffix: true });
  return `${iso} (${relative})`;
};
