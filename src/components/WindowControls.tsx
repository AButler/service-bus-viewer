import { useEffect, useMemo, useState } from "react";
import { IconButton, Tooltip } from "@mui/material";
import RemoveRoundedIcon from "@mui/icons-material/RemoveRounded";
import CropSquareRoundedIcon from "@mui/icons-material/CropSquareRounded";
import FilterNoneRoundedIcon from "@mui/icons-material/FilterNoneRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { getCurrentWindow } from "@tauri-apps/api/window";

/**
 * Minimize / maximize / close controls for the custom (decorationless) titlebar.
 * Rendered only when running inside Tauri. The maximize button becomes a restore
 * button while the window is maximized, mirroring native Windows behaviour.
 */
export default function WindowControls() {
  const appWindow = useMemo(() => getCurrentWindow(), []);
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    let active = true;
    let unlisten: (() => void) | undefined;

    const sync = () =>
      void appWindow.isMaximized().then((value) => {
        if (active) setMaximized(value);
      });

    sync();
    void appWindow.onResized(sync).then((fn) => {
      if (active) unlisten = fn;
      else fn();
    });

    return () => {
      active = false;
      unlisten?.();
    };
  }, [appWindow]);

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
      <Tooltip title={maximized ? "Restore" : "Maximize"}>
        <IconButton
          color="inherit"
          size="small"
          aria-label={maximized ? "Restore" : "Maximize"}
          onClick={() => void appWindow.toggleMaximize()}
        >
          {maximized ? (
            <FilterNoneRoundedIcon fontSize="small" />
          ) : (
            <CropSquareRoundedIcon fontSize="small" />
          )}
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
