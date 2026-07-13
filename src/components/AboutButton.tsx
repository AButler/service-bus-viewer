import { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
        <DialogTitle>Service Bus Viewer</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Version {appVersion}
          </Typography>
          <Box sx={{ mt: 1 }}>
            <Link
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleRepoClick}
              sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}
            >
              <GitHubIcon fontSize="small" />
              {REPO_URL}
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
