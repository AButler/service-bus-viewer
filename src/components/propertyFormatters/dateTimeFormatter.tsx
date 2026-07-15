import { Fragment, type ReactNode } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { UTCDate } from "@date-fns/utc";
import { Box } from "@mui/material";
import type { PropertyFormatter } from "./types";

// Render an ISO 8601 string with its digits in the normal color and its
// punctuation (`-`, `T`, `:`, `.`, `Z`) muted. The date/time separator `T`
// gets a little horizontal breathing room for readability.
function renderIso(iso: string): ReactNode {
  const tokens = iso.match(/\d+|\D+/g) ?? [];
  return tokens.map((token, i) => {
    if (/^\d+$/.test(token)) {
      return <Fragment key={i}>{token}</Fragment>;
    }
    return (
      <Box
        component="span"
        key={i}
        sx={{
          color: "text.secondary",
          ...(token.includes("T") ? { mx: 0.15 } : { mx: 0.05 }),
        }}
      >
        {token}
      </Box>
    );
  });
}

/**
 * Render a date as an ISO 8601 (UTC) string (with milliseconds) where the
 * punctuation is muted. "full" also appends the time relative to now in a muted
 * font; "simple" renders only the ISO string.
 */
export const formatDateTime: PropertyFormatter = (value, detail) => {
  const date = new Date(value as string | Date);
  // Service Bus uses far-future dates (year 9999) as a "no expiry" sentinel;
  // treat anything beyond that as absent so it renders as "—".
  if (date.getUTCFullYear() > 9999) {
    return undefined;
  }
  const iso = format(new UTCDate(date), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
  if (detail === "simple") {
    return <>{renderIso(iso)}</>;
  }
  const relative = formatDistanceToNow(date, { addSuffix: true });
  return (
    <>
      {renderIso(iso)}{" "}
      <Box component="span" sx={{ color: "text.secondary" }}>
        ({relative})
      </Box>
    </>
  );
};
