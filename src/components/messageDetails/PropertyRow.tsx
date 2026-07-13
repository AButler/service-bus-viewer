import { useState } from "react";
import { Box, ListItem, ListItemText, Tooltip } from "@mui/material";
import CopyButton from "./CopyButton";

interface PropertyRowProps {
  label: string;
  value: React.ReactNode;
  /** When set, a hover-revealed copy button is shown for this value. */
  copyValue?: string;
  /** Raw property name, shown as a tooltip on the label when provided. */
  rawName?: string;
}

/** A single label/value row with an optional hover copy button. */
export default function PropertyRow({
  label,
  value,
  copyValue,
  rawName,
}: PropertyRowProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <ListItem
      disableGutters
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      sx={{ py: 0.5, alignItems: "flex-start" }}
      secondaryAction={
        copyValue !== undefined ? (
          <CopyButton
            value={copyValue}
            label={`Copy ${label}`}
            hovered={hovered}
            edge="end"
          />
        ) : undefined
      }
    >
      <ListItemText
        primary={
          rawName !== undefined ? (
            <Tooltip title={rawName}>
              <Box component="span">{label}</Box>
            </Tooltip>
          ) : (
            label
          )
        }
        secondary={value}
        slotProps={{
          primary: { variant: "caption", color: "text.secondary" },
          secondary: {
            variant: "body2",
            color: "text.primary",
            sx: { wordBreak: "break-word" },
          },
        }}
      />
    </ListItem>
  );
}
