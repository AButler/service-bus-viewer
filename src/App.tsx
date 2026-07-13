import { useMemo, useState } from "react";
import {
  AppBar,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  Paper,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import { useColorScheme } from "@mui/material/styles";
import HubRoundedIcon from "@mui/icons-material/HubRounded";
import AddLinkRoundedIcon from "@mui/icons-material/AddLinkRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import NamespaceTree from "./components/NamespaceTree";
import MessageGrid from "./components/MessageGrid";
import MessageDetails from "./components/MessageDetails";
import {
  getMessagesForEntity,
  namespaces,
  type ServiceBusMessage,
} from "./data/mockData";

const LEFT_WIDTH = 320;
const RIGHT_WIDTH = 380;

function entityLabel(entityId: string | null): string {
  if (!entityId) return "No entity selected";
  const parts = entityId.split("/");
  const ns = parts[0];
  if (entityId.includes("/s/")) {
    return `${parts[2]} / ${parts[4]}  ·  ${ns}`;
  }
  return `${parts[2]}  ·  ${ns}`;
}

function ColorModeToggle() {
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

function App() {
  const [selectedEntity, setSelectedEntity] = useState<string | null>(
    "ns-prod/q/orders",
  );
  const [selectedMessage, setSelectedMessage] =
    useState<ServiceBusMessage | null>(null);

  const messages = useMemo(
    () => getMessagesForEntity(selectedEntity),
    [selectedEntity],
  );

  const handleEntitySelect = (entityId: string | null) => {
    setSelectedEntity(entityId);
    setSelectedMessage(null);
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        bgcolor: "background.default",
      }}
    >
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
          >
            Refresh
          </Button>
          <Button
            size="small"
            variant="contained"
            startIcon={<AddLinkRoundedIcon />}
          >
            Connect namespace
          </Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ display: "flex", flexGrow: 1, minHeight: 0 }}>
        {/* Left: namespace / entity tree */}
        <Paper
          square
          elevation={0}
          sx={{
            width: LEFT_WIDTH,
            flexShrink: 0,
            borderRight: 1,
            borderColor: "divider",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography variant="overline" color="text.secondary">
              Namespaces
            </Typography>
          </Box>
          <Divider />
          <NamespaceTree
            namespaces={namespaces}
            selectedId={selectedEntity}
            onSelect={handleEntitySelect}
          />
        </Paper>

        {/* Middle: message grid */}
        <Box
          sx={{
            flexGrow: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            minHeight: 0,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              px: 2,
              py: 1.5,
              borderBottom: 1,
              borderColor: "divider",
            }}
          >
            <Typography variant="subtitle1" noWrap>
              {entityLabel(selectedEntity)}
            </Typography>
            <Chip
              size="small"
              label={`${messages.length} messages`}
              variant="outlined"
              sx={{ ml: 1 }}
            />
          </Box>
          <Box sx={{ flexGrow: 1, minHeight: 0 }}>
            <MessageGrid
              messages={messages}
              selectedId={selectedMessage?.messageId ?? null}
              onSelect={setSelectedMessage}
            />
          </Box>
        </Box>

        {/* Right: message properties */}
        <Paper
          square
          elevation={0}
          sx={{
            width: RIGHT_WIDTH,
            flexShrink: 0,
            borderLeft: 1,
            borderColor: "divider",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: "divider" }}>
            <Typography variant="overline" color="text.secondary">
              Message Details
            </Typography>
          </Box>
          <Box sx={{ flexGrow: 1, minHeight: 0 }}>
            <MessageDetails message={selectedMessage} />
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}

export default App;
