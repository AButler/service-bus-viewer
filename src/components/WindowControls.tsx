import { IconButton, Tooltip } from "@mui/material";
import RemoveRoundedIcon from "@mui/icons-material/RemoveRounded";
import CropSquareRoundedIcon from "@mui/icons-material/CropSquareRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { getCurrentWindow } from "@tauri-apps/api/window";

/**
 * Minimize / maximize / close controls for the custom (decorationless) titlebar.
 * Rendered only when running inside Tauri.
 */
export default function WindowControls() {
  const appWindow = getCurrentWindow();
  return (
    <>
      <Tooltip title="Minimize">
        <IconButton
          color="inherit"
          size="small"
          aria-label="Minimize"
          onClick={() => void appWindow.minimize()}
        >
          <RemoveRoundedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Maximize">
        <IconButton
          color="inherit"
          size="small"
          aria-label="Maximize"
          onClick={() => void appWindow.toggleMaximize()}
        >
          <CropSquareRoundedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Close">
        <IconButton
          color="inherit"
          size="small"
          aria-label="Close"
          onClick={() => void appWindow.close()}
        >
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </>
  );
}
