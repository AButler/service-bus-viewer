import {
  Box,
  Chip,
  Divider,
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
 * Header above the message grid: shows the selected entity, active/dead-letter
 * count chips (collapsed on narrow containers) and the messages/dead-letter view
 * toggle.
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
        alignItems: "center",
        gap: 1,
        px: 2,
        py: 1.5,
        borderBottom: 1,
        borderColor: "divider",
        minWidth: 0,
      }}
    >
      <Box sx={{ minWidth: 0 }}>
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
      {entity && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            flexShrink: 0,
          }}
        >
          <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
          <Tooltip title="Refresh messages">
            <IconButton
              size="small"
              aria-label="Refresh messages"
              onClick={onRefresh}
            >
              <RefreshRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              "@container (max-width: 620px)": { display: "none" },
            }}
          >
            <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
            <Chip
              size="small"
              label={`${activeCount} messages`}
              color="primary"
              variant="outlined"
            />
            <Chip
              size="small"
              label={`${deadLetterCount} dead letters`}
              color="error"
              variant="outlined"
            />
          </Box>
        </Box>
      )}
      <Box sx={{ flexGrow: 1 }} />
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
        </ToggleButton>
        <ToggleButton
          value="deadletter"
          aria-label="Dead-letter messages"
          sx={{
            whiteSpace: "nowrap",
            "&.Mui-selected": {
              color: "error.main",
              borderColor: "error.main",
              backgroundColor: (theme) => alpha(theme.palette.error.main, 0.12),
              "&:hover": {
                backgroundColor: (theme) =>
                  alpha(theme.palette.error.main, 0.2),
              },
            },
          }}
        >
          <ReportProblemRoundedIcon fontSize="small" sx={{ mr: 0.5 }} />
          Dead-letter
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
}
