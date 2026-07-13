import { Box } from "@mui/material";
import appIconUrl from "../../app-icon.svg";

interface AppIconProps {
  /** Rendered width/height in px. */
  size?: number;
}

/** The Service Bus Viewer app icon (blue queue + amber magnifying glass). */
export default function AppIcon({ size = 24 }: AppIconProps) {
  return (
    <Box
      component="img"
      src={appIconUrl}
      alt="Service Bus Viewer"
      sx={{ width: size, height: size, display: "block" }}
    />
  );
}
