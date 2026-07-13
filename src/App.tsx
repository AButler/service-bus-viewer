import { useState } from "react";
import {
  Box,
  Button,
  Divider,
  LinearProgress,
  Paper,
  Typography,
} from "@mui/material";
import type { GridPaginationModel } from "@mui/x-data-grid";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import AddLinkRoundedIcon from "@mui/icons-material/AddLinkRounded";
import NamespaceTree, { type SelectedEntity } from "./components/NamespaceTree";
import NamespacesHeader from "./components/NamespacesHeader";
import MessageGrid from "./components/MessageGrid";
import MessageDetails from "./components/MessageDetails";
import ResizeHandle from "./components/ResizeHandle";
import TopBar from "./components/TopBar";
import MessageToolbar, { type MessageView } from "./components/MessageToolbar";
import { useMessages, useNamespaces } from "./hooks/useServiceBus";
import type { ServiceBusReceivedMessage } from "./api/types";

const DEFAULT_LEFT_WIDTH = 320;
const DEFAULT_RIGHT_WIDTH = 380;
const MIN_LEFT_WIDTH = 240;
const MAX_LEFT_WIDTH = 560;
const MIN_RIGHT_WIDTH = 300;
const MAX_RIGHT_WIDTH = 640;
const DEFAULT_PAGE_SIZE = 25;

function App() {
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity | null>(
    null,
  );
  const [messageView, setMessageView] = useState<MessageView>("active");
  const [selectedMessage, setSelectedMessage] =
    useState<ServiceBusReceivedMessage | null>(null);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: DEFAULT_PAGE_SIZE,
  });
  const [leftWidth, setLeftWidth] = useState(DEFAULT_LEFT_WIDTH);
  const [rightWidth, setRightWidth] = useState(DEFAULT_RIGHT_WIDTH);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const queryClient = useQueryClient();
  const isTreeFetching = useIsFetching({
    predicate: (query) =>
      ["namespaces", "queues", "topics", "subscriptions"].includes(
        query.queryKey[0] as string,
      ),
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

  const namespacesQuery = useNamespaces();
  const hasNoNamespaces =
    namespacesQuery.isSuccess && namespacesQuery.data.length === 0;

  const handleRefreshNamespaces = () => {
    queryClient.invalidateQueries({
      predicate: (query) =>
        ["namespaces", "queues", "topics", "subscriptions"].includes(
          query.queryKey[0] as string,
        ),
    });
  };

  const handleEntitySelect = (entity: SelectedEntity) => {
    setSelectedEntity(entity);
    setSelectedMessage(null);
    setMessageView("active");
    setPaginationModel((model) => ({ ...model, page: 0 }));
  };

  const handleViewChange = (
    _event: React.MouseEvent<HTMLElement>,
    value: MessageView | null,
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
      <TopBar />

      <Box sx={{ display: "flex", flexGrow: 1, minHeight: 0 }}>
        {/* Left: namespace / entity tree */}
        <Paper
          square
          elevation={0}
          sx={{
            width: leftWidth,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          <Box sx={{ position: "relative" }}>
            <NamespacesHeader
              onRefresh={handleRefreshNamespaces}
              onCollapseAll={() => setExpandedItems([])}
            />
            <Divider />
            {isTreeFetching > 0 && (
              <LinearProgress
                sx={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: 2,
                }}
              />
            )}
          </Box>
          <Box
            sx={{
              flexGrow: 1,
              minHeight: 0,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <NamespaceTree
              selectedId={selectedEntity?.itemId ?? null}
              onSelect={handleEntitySelect}
              expandedItems={expandedItems}
              setExpandedItems={setExpandedItems}
            />
            {hasNoNamespaces && (
              <Box sx={{ px: 1.5, pt: 0.5, pb: 1.5 }}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<AddLinkRoundedIcon />}
                  sx={{
                    color: "text.secondary",
                    borderColor: "divider",
                    justifyContent: "flex-start",
                    fontWeight: 400,
                    "&:hover": {
                      borderColor: "text.secondary",
                      backgroundColor: "action.hover",
                    },
                  }}
                >
                  Connect namespace
                </Button>
              </Box>
            )}
          </Box>
        </Paper>

        <ResizeHandle
          ariaLabel="Resize namespaces panel"
          value={leftWidth}
          min={MIN_LEFT_WIDTH}
          max={MAX_LEFT_WIDTH}
          onChange={setLeftWidth}
        />

        {/* Middle: message grid */}
        <Box
          sx={{
            flexGrow: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            minHeight: 0,
            overflow: "hidden",
            containerType: "inline-size",
          }}
        >
          <MessageToolbar
            entity={selectedEntity}
            view={messageView}
            onViewChange={handleViewChange}
          />
          <Box sx={{ flexGrow: 1, minHeight: 0 }}>
            <MessageGrid
              rows={rows}
              rowCount={rowCount}
              loading={messagesQuery.isFetching}
              deadLetterView={messageView === "deadletter"}
              paginationModel={paginationModel}
              onPaginationModelChange={handlePaginationChange}
              selectedId={selectedMessage?.messageId ?? null}
              onSelect={setSelectedMessage}
            />
          </Box>
        </Box>

        <ResizeHandle
          ariaLabel="Resize details panel"
          value={rightWidth}
          min={MIN_RIGHT_WIDTH}
          max={MAX_RIGHT_WIDTH}
          invert
          onChange={setRightWidth}
        />

        {/* Right: message properties */}
        <Paper
          square
          elevation={0}
          sx={{
            width: rightWidth,
            flexShrink: 0,
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
