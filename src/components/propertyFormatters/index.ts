import { formatBytes } from "./bytesFormatter";
import { formatDateTime } from "./dateTimeFormatter";
import { formatDuration } from "./durationFormatter";
import type { PropertyFormatter } from "./types";

export type { PropertyFormatter, FormatterDetail } from "./types";

// Registry of raw property name -> formatter. Add new entries here to give a
// property a custom render format.
const formatters: Record<string, PropertyFormatter> = {
  size: formatBytes,
  timeToLive: formatDuration,
  enqueuedTimeUtc: formatDateTime,
  expiresAtUtc: formatDateTime,
};

/** Default formatter: render the value as a string. */
const defaultFormatter: PropertyFormatter = (value) => String(value);

/**
 * Resolve the formatter for a property name, falling back to a plain string
 * formatter when the property has no custom format registered.
 */
export function getPropertyFormatter(name: string): PropertyFormatter {
  return formatters[name] ?? defaultFormatter;
}
