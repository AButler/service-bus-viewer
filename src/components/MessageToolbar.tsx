import {
  Box,
  Chip,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import InboxRoundedIcon from "@mui/icons-material/InboxRounded";
import ReportProblemRoundedIcon from "@mui/icons-material/ReportProblemRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import type { SelectedEntity } from "./NamespaceTree";

export type MessageView = "active" | "deadletter";

interface MessageToolbarProps {
  entity: SelectedEntity | null;
  view: MessageView;
  onViewChange: (
    event: React.MouseEvent<HTMLElement>,
    value: MessageView | null,
  ) => void;
  onRefresh: () => void;
}

/**
 * Header above the message grid: the selected entity name/namespace and the
 * messages/dead-letter view toggle (with counts) share the top row, with a
 * toolbar of actions (refresh) beneath them.
 */
export default function MessageToolbar({
  entity,
  view,
  onViewChange,
  onRefresh,
}: MessageToolbarProps) {
  const activeCount = entity?.countDetails.activeMessageCount ?? 0;
  const deadLetterCount = entity?.countDetails.deadLetterMessageCount ?? 0;

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
          <Typography variant="subtitle1" noWrap>
            {entity ? entity.label : "No entity selected"}
          </Typography>
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
        <ToggleButtonGroup
          size="small"
          exclusive
          value={view}
          onChange={onViewChange}
          disabled={entity === null}
          aria-label="Message view"
          sx={{ flexShrink: 0 }}
        >
          <ToggleButton
            value="active"
            aria-label="Active messages"
            sx={{
              whiteSpace: "nowrap",
              "&.Mui-selected": {
                color: "primary.main",
                borderColor: "primary.main",
                backgroundColor: (theme) =>
                  alpha(theme.palette.primary.main, 0.12),
                "&:hover": {
                  backgroundColor: (theme) =>
                    alpha(theme.palette.primary.main, 0.2),
                },
              },
            }}
          >
            <InboxRoundedIcon fontSize="small" sx={{ mr: 0.5 }} />
            Messages
            <Chip
              size="small"
              label={activeCount}
              color="primary"
              sx={{ ml: 0.75 }}
            />
          </ToggleButton>
          <ToggleButton
            value="deadletter"
            aria-label="Dead-letter messages"
            sx={{
              whiteSpace: "nowrap",
              "&.Mui-selected": {
                color: "error.main",
                borderColor: "error.main",
                backgroundColor: (theme) =>
                  alpha(theme.palette.error.main, 0.12),
                "&:hover": {
                  backgroundColor: (theme) =>
                    alpha(theme.palette.error.main, 0.2),
                },
              },
            }}
          >
            <ReportProblemRoundedIcon fontSize="small" sx={{ mr: 0.5 }} />
            Dead-letter
            <Chip
              size="small"
              label={deadLetterCount}
              color="error"
              sx={{ ml: 0.75 }}
            />
          </ToggleButton>
        </ToggleButtonGroup>
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
      </Box>
    </Box>
  );
}
