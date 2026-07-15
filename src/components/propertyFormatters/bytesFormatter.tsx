import { Box } from "@mui/material";
import type { PropertyFormatter } from "./types";

/**
 * Render a byte count. "full" shows the human-readable size with the raw byte
 * count in a muted parenthetical; "simple" renders only the human-readable form.
 */
export const formatBytes: PropertyFormatter = (value, detail) => {
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
  const human = `${rounded} ${units[unitIndex]}`;
  if (detail === "simple") {
    return human;
  }
  return (
    <>
      {human}{" "}
      <Box component="span" sx={{ color: "text.secondary" }}>
        ({withSeparators} bytes)
      </Box>
    </>
  );
};
