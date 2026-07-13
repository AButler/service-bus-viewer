import { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  IconButton,
  Link,
  Tooltip,
  Typography,
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import GitHubIcon from "@mui/icons-material/GitHub";
import { isTauri } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { version as appVersion } from "../../package.json";
import AppIcon from "./AppIcon";

const REPO_URL = "https://github.com/AButler/service-bus-viewer";

// In Tauri, open the link in the system browser via the opener plugin. Outside
// Tauri (e.g. the dev server) fall back to the anchor's default navigation.
function handleRepoClick(event: React.MouseEvent<HTMLAnchorElement>) {
  if (isTauri()) {
    event.preventDefault();
    void openUrl(REPO_URL);
  }
}

/** App-bar button that opens an "About" dialog. */
export default function AboutButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Tooltip title="About">
        <IconButton
          color="inherit"
          size="small"
          aria-label="About"
          onClick={() => setOpen(true)}
        >
          <InfoOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogContent>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              gap: 1,
              py: 2,
            }}
          >
            <AppIcon size={72} />
            <Typography variant="h6" component="h2">
              Service Bus Viewer
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Version {appVersion}
            </Typography>
            <Link
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleRepoClick}
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.5,
                mt: 1,
              }}
            >
              <GitHubIcon fontSize="small" />
              View on GitHub
            </Link>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
