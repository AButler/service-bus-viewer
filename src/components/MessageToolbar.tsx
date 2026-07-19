import { Box, Chip, IconButton, Tooltip, Typography } from "@mui/material";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import type { SelectedEntity } from "./NamespaceTree";
import { VIEW_LABELS, type MessageView } from "../lib/selectionRoute";

export type { MessageView } from "../lib/selectionRoute";

interface MessageToolbarProps {
  entity: SelectedEntity | null;
  view: MessageView;
  onRefresh: () => void;
  onSend: () => void;
}

// The count for the current view, or undefined when none is available (e.g.
// deferred, or a topic's scheduled messages).
function viewCount(
  entity: SelectedEntity | null,
  view: MessageView,
): number | undefined {
  if (!entity || entity.kind === "topic") return undefined;
  const c = entity.countDetails;
  switch (view) {
    case "active":
      return c.activeMessageCount;
    case "deadletter":
      return c.deadLetterMessageCount;
    case "transferDeadletter":
      return c.transferDeadLetterMessageCount;
    case "scheduled":
      return c.scheduledMessageCount;
    case "deferred":
      return undefined;
  }
}

/**
 * Header above the message grid: the selected entity name/namespace and a chip
 * describing the current view (with its count), plus a toolbar of actions
 * (refresh) attached to the grid.
 */
export default function MessageToolbar({
  entity,
  view,
  onRefresh,
  onSend,
}: MessageToolbarProps) {
  const count = viewCount(entity, view);
  const isDeadLetter = view === "deadletter" || view === "transferDeadletter";

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          gap: 1,
          minWidth: 0,
          px: 2,
          pt: 1.5,
          pb: 1,
        }}
      >
        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              minWidth: 0,
            }}
          >
            <Typography variant="subtitle1" noWrap>
              {entity ? entity.label : "No entity selected"}
            </Typography>
            {entity && (
              <Chip
                size="small"
                label={
                  count !== undefined
                    ? `${VIEW_LABELS[view]} \u00b7 ${count}`
                    : VIEW_LABELS[view]
                }
                color={isDeadLetter ? "error" : "primary"}
                variant="outlined"
                sx={{ flexShrink: 0 }}
              />
            )}
          </Box>
          {entity && (
            <Tooltip title={entity.namespaceHost}>
              <Typography
                variant="caption"
                color="text.secondary"
                component="div"
                noWrap
                sx={{ display: "inline-block" }}
              >
                {entity.namespaceName}
              </Typography>
            </Tooltip>
          )}
        </Box>
      </Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          minWidth: 0,
          px: 1,
          py: 0.5,
          borderTop: 1,
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: (theme) =>
            `var(--DataGrid-containerBackground, ${(theme.vars || theme).palette.action.hover})`,
        }}
      >
        <Tooltip title="Refresh messages">
          <span>
            <IconButton
              size="small"
              aria-label="Refresh messages"
              onClick={onRefresh}
              disabled={entity === null}
            >
              <RefreshRoundedIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Send message">
          <span>
            <IconButton
              size="small"
              aria-label="Send message"
              onClick={onSend}
              disabled={entity === null}
            >
              <SendRoundedIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    </Box>
  );
}
