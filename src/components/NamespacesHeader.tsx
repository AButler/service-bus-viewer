import { useState } from "react";
import {
  Box,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
} from "@mui/material";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import AddLinkRoundedIcon from "@mui/icons-material/AddLinkRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import UnfoldLessRoundedIcon from "@mui/icons-material/UnfoldLessRounded";

interface NamespacesHeaderProps {
  onRefresh: () => void;
  onCollapseAll: () => void;
  onConnect: () => void;
}

/** "Namespaces" panel header with hover actions and an overflow menu. */
export default function NamespacesHeader({
  onRefresh,
  onCollapseAll,
  onConnect,
}: NamespacesHeaderProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  const handleConnect = () => {
    setAnchorEl(null);
    onConnect();
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        pl: 2,
        pr: 1,
        py: 0.5,
        "&:hover .namespaces-header-action": { opacity: 1 },
      }}
    >
      <Typography variant="overline" color="text.secondary">
        Namespaces
      </Typography>
      <Box sx={{ flexGrow: 1 }} />
      <Tooltip title="Reload namespaces">
        <IconButton
          className="namespaces-header-action"
          size="small"
          aria-label="Reload namespaces"
          onClick={onRefresh}
          sx={{ opacity: 0, transition: "opacity 0.15s" }}
        >
          <RefreshRoundedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Collapse all">
        <IconButton
          className="namespaces-header-action"
          size="small"
          aria-label="Collapse all"
          onClick={onCollapseAll}
          sx={{ opacity: 0, transition: "opacity 0.15s" }}
        >
          <UnfoldLessRoundedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <IconButton
        className="namespaces-header-action"
        size="small"
        aria-label="Namespaces menu"
        aria-haspopup="true"
        aria-controls={open ? "namespaces-menu" : undefined}
        aria-expanded={open ? "true" : undefined}
        onClick={(event) => setAnchorEl(event.currentTarget)}
        sx={{ opacity: open ? 1 : 0, transition: "opacity 0.15s" }}
      >
        <MoreVertRoundedIcon fontSize="small" />
      </IconButton>
      <Menu
        id="namespaces-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem onClick={handleConnect}>
          <ListItemIcon>
            <AddLinkRoundedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Connect namespace</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
}
