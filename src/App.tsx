import { useState } from "react";
import {
  AppBar,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import { useColorScheme } from "@mui/material/styles";
import { useQueryClient } from "@tanstack/react-query";
import type { GridPaginationModel } from "@mui/x-data-grid";
import HubRoundedIcon from "@mui/icons-material/HubRounded";
import AddLinkRoundedIcon from "@mui/icons-material/AddLinkRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import InboxRoundedIcon from "@mui/icons-material/InboxRounded";
import ReportProblemRoundedIcon from "@mui/icons-material/ReportProblemRounded";
import NamespaceTree, { type SelectedEntity } from "./components/NamespaceTree";
import MessageGrid from "./components/MessageGrid";
import MessageDetails from "./components/MessageDetails";
import { useMessages } from "./hooks/useServiceBus";
import type { ServiceBusReceivedMessage } from "./api/types";

const LEFT_WIDTH = 320;
const RIGHT_WIDTH = 380;
const DEFAULT_PAGE_SIZE = 25;

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
  const queryClient = useQueryClient();
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity | null>(
    null,
  );
  const [messageView, setMessageView] = useState<"active" | "deadletter">(
    "active",
  );
  const [selectedMessage, setSelectedMessage] =
    useState<ServiceBusReceivedMessage | null>(null);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: DEFAULT_PAGE_SIZE,
  });

  const messagesQuery = useMessages(
    selectedEntity
      ? {
          namespaceName: selectedEntity.namespaceName,
          entityPath: selectedEntity.entityPath,
          subQueue: messageView === "deadletter" ? "deadletter" : "main",
          skip: paginationModel.page * paginationModel.pageSize,
          top: paginationModel.pageSize,
        }
      : null,
  );

  const rows = messagesQuery.data?.value ?? [];
  const rowCount = messagesQuery.data?.totalCount ?? 0;
  const activeCount = selectedEntity?.countDetails.activeMessageCount ?? 0;
  const deadLetterCount =
    selectedEntity?.countDetails.deadLetterMessageCount ?? 0;

  const handleEntitySelect = (entity: SelectedEntity) => {
    setSelectedEntity(entity);
    setSelectedMessage(null);
    setMessageView("active");
    setPaginationModel((model) => ({ ...model, page: 0 }));
  };

  const handleViewChange = (
    _event: React.MouseEvent<HTMLElement>,
    value: "active" | "deadletter" | null,
  ) => {
    if (value !== null) {
      setMessageView(value);
      setSelectedMessage(null);
      setPaginationModel((model) => ({ ...model, page: 0 }));
    }
  };

  const handlePaginationChange = (model: GridPaginationModel) => {
    setPaginationModel(model);
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
            onClick={() => queryClient.invalidateQueries()}
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
            selectedId={selectedEntity?.itemId ?? null}
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
              {selectedEntity
                ? `${selectedEntity.label}  ·  ${selectedEntity.namespaceName}`
                : "No entity selected"}
            </Typography>
            {selectedEntity && (
              <Chip
                size="small"
                label={`${activeCount} messages, ${deadLetterCount} dead letters`}
                variant="outlined"
                sx={{ ml: 1 }}
              />
            )}
            <Box sx={{ flexGrow: 1 }} />
            <ToggleButtonGroup
              size="small"
              exclusive
              value={messageView}
              onChange={handleViewChange}
              disabled={selectedEntity === null}
              aria-label="Message view"
              sx={{ flexShrink: 0 }}
            >
              <ToggleButton
                value="active"
                aria-label="Active messages"
                sx={{ whiteSpace: "nowrap" }}
              >
                <InboxRoundedIcon fontSize="small" sx={{ mr: 0.5 }} />
                Messages
              </ToggleButton>
              <ToggleButton
                value="deadletter"
                aria-label="Dead-letter messages"
                sx={{ whiteSpace: "nowrap" }}
              >
                <ReportProblemRoundedIcon fontSize="small" sx={{ mr: 0.5 }} />
                Dead-letter
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
          <Box sx={{ flexGrow: 1, minHeight: 0 }}>
            <MessageGrid
              rows={rows}
              rowCount={rowCount}
              loading={messagesQuery.isFetching}
              paginationModel={paginationModel}
              onPaginationModelChange={handlePaginationChange}
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
