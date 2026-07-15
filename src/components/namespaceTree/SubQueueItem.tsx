import { Box, Chip, Typography } from "@mui/material";
import { TreeItem } from "@mui/x-tree-view/TreeItem";
import type { MessageView } from "../../api/types";

/**
 * A selectable leaf under a queue/subscription/topic representing a message
 * view (dead-letter, scheduled, etc.). `baseItemId` is the parent entity's item
 * id; the leaf's id is `<baseItemId>#<view>` so selection can round-trip.
 */
export default function SubQueueItem({
  baseItemId,
  view,
  label,
  icon,
  count,
}: {
  baseItemId: string;
  view: MessageView;
  label: string;
  icon: React.ReactNode;
  count?: number;
}) {
  return (
    <TreeItem
      itemId={`${baseItemId}#${view}`}
      label={
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            py: 0.25,
            pr: 0.5,
          }}
        >
          {icon}
          <Typography
            variant="body2"
            noWrap
            sx={{ flexShrink: 1, minWidth: 0 }}
          >
            {label}
          </Typography>
          {count !== undefined && count > 0 && (
            <Chip
              size="small"
              label={count}
              variant="outlined"
              sx={{
                height: 18,
                ml: "auto",
                fontSize: "0.65rem",
                "& .MuiChip-label": { px: 0.75 },
              }}
            />
          )}
        </Box>
      }
    />
  );
}
