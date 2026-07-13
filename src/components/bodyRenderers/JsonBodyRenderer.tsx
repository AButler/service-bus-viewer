import { useMemo } from "react";
import { Box } from "@mui/material";
import { useColorScheme } from "@mui/material/styles";
import {
  JsonView,
  allExpanded,
  darkStyles,
  defaultStyles,
} from "react-json-view-lite";
import "react-json-view-lite/dist/index.css";
import PlainTextBodyRenderer from "./PlainTextBodyRenderer";
import type { BodyRendererProps } from "./types";

/**
 * Renders a JSON body with syntax highlighting and collapsible nodes (folding).
 * Falls back to plain text if the body cannot be parsed as a JSON object/array.
 */
export default function JsonBodyRenderer({
  body,
  contentType,
}: BodyRendererProps) {
  const { mode, systemMode } = useColorScheme();
  const resolvedMode = mode === "system" ? systemMode : mode;
  const isDark = resolvedMode === "dark";

  const parsed = useMemo<{ value: unknown; ok: boolean }>(() => {
    if (typeof body === "string") {
      try {
        return { value: JSON.parse(body), ok: true };
      } catch {
        return { value: body, ok: false };
      }
    }
    return { value: body, ok: body !== null && typeof body === "object" };
  }, [body]);

  if (!parsed.ok || typeof parsed.value !== "object" || parsed.value === null) {
    return <PlainTextBodyRenderer body={body} contentType={contentType} />;
  }

  return (
    <Box
      sx={{
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: "0.78rem",
        // Keep the enclosing braces but disallow collapsing the root node by
        // hiding its expander chevron (nested nodes keep their own).
        "& > [role='tree'] > [role='treeitem'] > [role='button']": {
          display: "none",
        },
        // Hang the expand/collapse chevron in the left gutter so an expandable
        // property's opening quote lines up with non-expandable properties.
        "& [role='treeitem'] > [role='button']": {
          display: "inline-block",
          width: "1em",
          margin: 0,
          marginLeft: "-1em",
          fontSize: "1em",
          textAlign: "left",
        },
        // Mute the structural punctuation ({ } [ ] , :) so the data stands out.
        "& .sbv-json-punctuation": {
          color: "text.disabled",
          fontWeight: 400,
        },
      }}
    >
      <JsonView
        data={parsed.value as object}
        shouldExpandNode={allExpanded}
        style={{
          ...(isDark ? darkStyles : defaultStyles),
          stringifyStringValues: true,
          quotesForFieldNames: true,
          punctuation: "sbv-json-punctuation",
        }}
      />
    </Box>
  );
}
