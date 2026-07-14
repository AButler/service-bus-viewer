import { Box } from "@mui/material";
import { MONO_FONT_FAMILY } from "../../lib/fonts";
import type { BodyRendererProps } from "./types";

/** Fallback renderer: shows the raw body as monospaced, wrapped text. */
export default function PlainTextBodyRenderer({ body }: BodyRendererProps) {
  const text = typeof body === "string" ? body : JSON.stringify(body, null, 2);
  return (
    <Box
      component="pre"
      sx={{
        m: 0,
        fontFamily: MONO_FONT_FAMILY,
        fontSize: "0.75rem",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
    >
      {text}
    </Box>
  );
}
