import { AppBar, Box, Toolbar, Typography } from "@mui/material";
import { isTauri } from "@tauri-apps/api/core";
import ColorModeToggle from "./ColorModeToggle";
import AboutButton from "./AboutButton";
import AppIcon from "./AppIcon";
import WindowControls from "./WindowControls";

/** Top application bar: title, colour-mode toggle and global actions. */
export default function TopBar() {
  return (
    <AppBar position="static">
      <Toolbar variant="dense" sx={{ gap: 1 }} data-tauri-drag-region>
        <AppIcon size={26} />
        <Typography
          variant="h6"
          sx={{ fontWeight: 700 }}
          data-tauri-drag-region
        >
          Service Bus Viewer
        </Typography>
        <Box sx={{ flexGrow: 1 }} data-tauri-drag-region />
        <ColorModeToggle />
        <AboutButton />
        {isTauri() && <WindowControls />}
      </Toolbar>
    </AppBar>
  );
}
