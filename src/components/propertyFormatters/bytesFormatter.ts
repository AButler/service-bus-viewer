import type { PropertyFormatter } from "./types";

/** Render a byte count as "X bytes" or "X bytes (Y KB/MB/...)". */
export const formatBytes: PropertyFormatter = (value) => {
  const bytes = value as number;
  const withSeparators = bytes.toLocaleString();
  if (bytes < 1024) {
    return `${withSeparators} bytes`;
  }
  const units = ["KB", "MB", "GB", "TB"];
  let scaled = bytes / 1024;
  let unitIndex = 0;
  while (scaled >= 1024 && unitIndex < units.length - 1) {
    scaled /= 1024;
    unitIndex += 1;
  }
  const rounded = scaled.toFixed(2).replace(/\.?0+$/, "");
  return `${withSeparators} bytes (${rounded} ${units[unitIndex]})`;
};
