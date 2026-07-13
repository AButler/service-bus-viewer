import { AppBar, Box, Button, Toolbar, Typography } from "@mui/material";
import { useQueryClient } from "@tanstack/react-query";
import HubRoundedIcon from "@mui/icons-material/HubRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import ColorModeToggle from "./ColorModeToggle";

/** Top application bar: title, colour-mode toggle and global actions. */
export default function TopBar() {
  const queryClient = useQueryClient();

  return (
    <AppBar position="static">
      <Toolbar variant="dense" sx={{ gap: 1 }}>
        <HubRoundedIcon color="primary" />
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Service Bus Viewer
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <ColorModeToggle />
        <Button
          size="small"
          startIcon={<RefreshRoundedIcon />}
          color="inherit"
          onClick={() => queryClient.invalidateQueries()}
        >
          Refresh
        </Button>
      </Toolbar>
    </AppBar>
  );
}
