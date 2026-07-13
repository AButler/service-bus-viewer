import { AppBar, Box, Toolbar, Typography } from "@mui/material";
import ColorModeToggle from "./ColorModeToggle";
import AboutButton from "./AboutButton";
import AppIcon from "./AppIcon";

/** Top application bar: title, colour-mode toggle and global actions. */
export default function TopBar() {
  return (
    <AppBar position="static">
      <Toolbar variant="dense" sx={{ gap: 1 }}>
        <AppIcon size={26} />
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Service Bus Viewer
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <ColorModeToggle />
        <AboutButton />
      </Toolbar>
    </AppBar>
  );
}
