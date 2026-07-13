import { IconButton, Tooltip } from "@mui/material";
import { useColorScheme } from "@mui/material/styles";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";

/** App-bar button that toggles between light and dark colour schemes. */
export default function ColorModeToggle() {
  const { mode, systemMode, setMode } = useColorScheme();

  // `mode` is undefined until the provider mounts on the client.
  if (!mode) {
    return <IconButton color="inherit" size="small" disabled />;
  }

  const resolvedMode = mode === "system" ? systemMode : mode;
  const isDark = resolvedMode === "dark";

  return (
    <Tooltip title={isDark ? "Switch to light mode" : "Switch to dark mode"}>
      <IconButton
        color="inherit"
        size="small"
        onClick={() => setMode(isDark ? "light" : "dark")}
        aria-label="Toggle color mode"
      >
        {isDark ? (
          <LightModeRoundedIcon fontSize="small" />
        ) : (
          <DarkModeRoundedIcon fontSize="small" />
        )}
      </IconButton>
    </Tooltip>
  );
}
