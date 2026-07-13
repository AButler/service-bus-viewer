import { useState } from "react";
import { IconButton, Tooltip } from "@mui/material";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import { copyText } from "../../lib/clipboard";

interface CopyButtonProps {
  value: string;
  label: string;
  hovered: boolean;
  edge?: "start" | "end" | false;
}

/**
 * Icon-only copy button that shows a transient check on success. The copy icon
 * is only visible while `hovered`; the check fades out independently.
 */
export default function CopyButton({
  value,
  label,
  hovered,
  edge,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await copyText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // Ignore clipboard failures (e.g. permission denied).
    }
  };

  return (
    <Tooltip title={copied ? "Copied" : "Copy"}>
      <IconButton
        size="small"
        edge={edge}
        aria-label={label}
        onClick={handleCopy}
        sx={{ position: "relative" }}
      >
        <ContentCopyRoundedIcon
          fontSize="inherit"
          sx={{
            opacity: hovered && !copied ? 1 : 0,
            transition: "opacity 0.15s",
          }}
        />
        <CheckRoundedIcon
          color="success"
          fontSize="inherit"
          sx={{
            position: "absolute",
            opacity: copied ? 1 : 0,
            transition: "opacity 0.4s",
          }}
        />
      </IconButton>
    </Tooltip>
  );
}
