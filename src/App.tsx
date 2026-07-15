import { useEffect, useMemo, useState } from "react";
import { Box, IconButton, Paper, Tooltip } from "@mui/material";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import type { GridPaginationModel } from "@mui/x-data-grid";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import type { SelectedEntity } from "./components/NamespaceTree";
import type { MessageView } from "./components/MessageToolbar";
import MessageDetails from "./components/MessageDetails";
import ResizeHandle from "./components/ResizeHandle";
import TopBar from "./components/TopBar";
import NamespacesPanel from "./components/NamespacesPanel";
import MessagesPanel from "./components/MessagesPanel";
import ConnectionDialog from "./components/ConnectionDialog";
import LogsPanel from "./components/LogsPanel";
import {
  useMessages,
  useNamespaces,
  useQueues,
  useSubscriptions,
} from "./hooks/useServiceBus";
import { useConnections, useConnectionMutations } from "./hooks/useConnections";
import type {
  NamespaceConnection,
  NamespaceConnectionDraft,
} from "./lib/connectionStore";
import type {
  MessageCountDetails,
  ServiceBusReceivedMessage,
} from "./api/types";
import {
  buildEntityPath,
  buildMessagePath,
  parseSelectionPath,
  selectionAncestorItemIds,
} from "./lib/selectionRoute";
import { deriveNamespaceHost } from "./lib/namespace";

const EMPTY_COUNTS: MessageCountDetails = {
  activeMessageCount: 0,
  deadLetterMessageCount: 0,
  scheduledMessageCount: 0,
  transferMessageCount: 0,
  transferDeadLetterMessageCount: 0,
};

const DEFAULT_LEFT_WIDTH = 320;
const DEFAULT_RIGHT_WIDTH = 380;
const MIN_LEFT_WIDTH = 240;
const MAX_LEFT_WIDTH = 560;
const MIN_RIGHT_WIDTH = 300;
const MAX_RIGHT_WIDTH = 640;
const DEFAULT_PAGE_SIZE = 50;
const DEFAULT_LOGS_HEIGHT = 220;
const MIN_LOGS_HEIGHT = 120;
const MAX_LOGS_HEIGHT = 480;

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const selection = useMemo(
    () => parseSelectionPath(location.pathname),
    [location.pathname],
  );

  const messageView: MessageView = selection?.view ?? "active";

  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: DEFAULT_PAGE_SIZE,
  });
  const [leftWidth, setLeftWidth] = useState(DEFAULT_LEFT_WIDTH);
  const [rightWidth, setRightWidth] = useState(DEFAULT_RIGHT_WIDTH);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [connectOpen, setConnectOpen] = useState(false);
  const [editConnection, setEditConnection] =
    useState<NamespaceConnection | null>(null);
  const [logsOpen, setLogsOpen] = useState(false);
  const [logsHeight, setLogsHeight] = useState(DEFAULT_LOGS_HEIGHT);

  const queryClient = useQueryClient();
  const namespacesQuery = useNamespaces();
  const connectionsQuery = useConnections();
  const { addConnection, updateConnection, removeConnection } =
    useConnectionMutations();
  const isTreeFetching = useIsFetching({
    predicate: (query) =>
      ["namespaces", "queues", "topics", "subscriptions"].includes(
        query.queryKey[0] as string,
      ),
  });

  // Load the collection backing the current selection so its count details
  // resolve even on a direct (deep-linked) load.
  const queuesQuery = useQueues(
    selection?.namespaceName ?? "",
    selection?.kind === "queue",
  );
  const subscriptionTopic =
    selection?.kind === "subscription"
      ? selection.entityPath.split("/")[0]
      : "";
  const subscriptionsQuery = useSubscriptions(
    selection?.namespaceName ?? "",
    subscriptionTopic,
    selection?.kind === "subscription",
  );

  const selectedEntity = useMemo<SelectedEntity | null>(() => {
    if (!selection) return null;
    const namespace = namespacesQuery.data?.find(
      (n) => n.name === selection.namespaceName,
    );
    const namespaceHost = namespace
      ? deriveNamespaceHost(namespace.properties.serviceBusEndpoint)
      : selection.namespaceName;

    let countDetails = EMPTY_COUNTS;
    if (selection.kind === "queue") {
      const queue = queuesQuery.data?.find(
        (q) => q.name === selection.entityPath,
      );
      if (queue) countDetails = queue.properties.countDetails;
    } else {
      const subName = selection.entityPath.split("/")[1];
      const subscription = subscriptionsQuery.data?.find(
        (s) => s.name === subName,
      );
      if (subscription) countDetails = subscription.properties.countDetails;
    }

    return {
      itemId: selection.itemId,
      kind: selection.kind,
      namespaceName: selection.namespaceName,
      namespaceHost,
      entityPath: selection.entityPath,
      label: selection.label,
      countDetails,
    };
  }, [
    selection,
    namespacesQuery.data,
    queuesQuery.data,
    subscriptionsQuery.data,
  ]);

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

  const selectedMessage = useMemo<ServiceBusReceivedMessage | null>(() => {
    if (!selection?.sequenceNumber) return null;
    return (
      rows.find((m) => String(m.sequenceNumber) === selection.sequenceNumber) ??
      null
    );
  }, [selection?.sequenceNumber, rows]);

  const hasNoNamespaces =
    namespacesQuery.isSuccess && namespacesQuery.data.length === 0;

  // Reset pagination whenever the selected entity or message view changes.
  useEffect(() => {
    setPaginationModel((model) => ({ ...model, page: 0 }));
  }, [selection?.itemId, selection?.view]);

  // Expand the tree ancestors of the current selection so it stays visible.
  useEffect(() => {
    if (!selection) return;
    setExpandedItems((current) => {
      const next = new Set(current);
      for (const id of selectionAncestorItemIds(selection)) next.add(id);
      return next.size === current.length ? current : Array.from(next);
    });
  }, [selection?.itemId]);

  // Redirect away from stale/invalid URLs once the backing data has loaded:
  // a missing namespace or entity goes to the root, a missing message falls
  // back to its owning entity.
  useEffect(() => {
    if (!selection) return;

    if (
      namespacesQuery.isSuccess &&
      !namespacesQuery.data.some((n) => n.name === selection.namespaceName)
    ) {
      navigate("/", { replace: true });
      return;
    }

    const entityQuery =
      selection.kind === "queue" ? queuesQuery : subscriptionsQuery;
    const entityFound =
      selection.kind === "queue"
        ? queuesQuery.data?.some((q) => q.name === selection.entityPath)
        : subscriptionsQuery.data?.some(
            (s) => s.name === selection.entityPath.split("/")[1],
          );

    if (entityQuery.isError || (entityQuery.isSuccess && !entityFound)) {
      navigate("/", { replace: true });
      return;
    }

    if (
      selection.sequenceNumber &&
      entityFound &&
      messagesQuery.isSuccess &&
      !rows.some((m) => String(m.sequenceNumber) === selection.sequenceNumber)
    ) {
      navigate(buildEntityPath(selection, selection.view), { replace: true });
    }
  }, [
    selection,
    namespacesQuery.isSuccess,
    namespacesQuery.data,
    queuesQuery.isSuccess,
    queuesQuery.isError,
    queuesQuery.data,
    subscriptionsQuery.isSuccess,
    subscriptionsQuery.isError,
    subscriptionsQuery.data,
    messagesQuery.isSuccess,
    rows,
    navigate,
  ]);

  const handleRefreshNamespaces = () => {
    queryClient.invalidateQueries({
      predicate: (query) =>
        ["namespaces", "queues", "topics", "subscriptions"].includes(
          query.queryKey[0] as string,
        ),
    });
  };

  const handleRefreshMessages = () => {
    queryClient.invalidateQueries({ queryKey: ["messages"] });
  };

  const handleConnect = (draft: NamespaceConnectionDraft) => {
    addConnection.mutate(draft, { onSuccess: () => setConnectOpen(false) });
  };

  const closeConnectionDialog = () => {
    setConnectOpen(false);
    setEditConnection(null);
  };

  const handleEdit = (namespaceName: string) => {
    const connection = connectionsQuery.data?.find(
      (c) => c.friendlyName === namespaceName,
    );
    if (!connection) return;
    setEditConnection(connection);
    setConnectOpen(true);
  };

  const handleSave = (connection: NamespaceConnection) => {
    updateConnection.mutate(connection, {
      onSuccess: closeConnectionDialog,
    });
  };

  const handleDisconnect = (namespaceName: string) => {
    const connection = connectionsQuery.data?.find(
      (c) => c.friendlyName === namespaceName,
    );
    if (!connection) return;
    removeConnection.mutate(connection.id);
    if (selection?.namespaceName === namespaceName) {
      navigate("/", { replace: true });
    }
  };

  const handleEntitySelect = (entity: SelectedEntity) => {
    navigate(buildEntityPath(entity, "active"));
  };

  const handleMessageSelect = (message: ServiceBusReceivedMessage) => {
    if (selectedEntity) {
      navigate(
        buildMessagePath(
          selectedEntity,
          messageView,
          String(message.sequenceNumber),
        ),
      );
    }
  };

  const handleViewChange = (
    _event: React.MouseEvent<HTMLElement>,
    value: MessageView | null,
  ) => {
    if (value !== null && selectedEntity) {
      navigate(buildEntityPath(selectedEntity, value));
    }
  };

  const handlePaginationChange = (model: GridPaginationModel) => {
    setPaginationModel(model);
    if (selectedEntity && selection?.sequenceNumber) {
      navigate(buildEntityPath(selectedEntity, messageView));
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        bgcolor: "background.default",
        position: "relative",
      }}
    >
      <TopBar />

      <Box sx={{ display: "flex", flexGrow: 1, minHeight: 0 }}>
        <NamespacesPanel
          width={leftWidth}
          selectedId={selectedEntity?.itemId ?? null}
          onSelect={handleEntitySelect}
          expandedItems={expandedItems}
          setExpandedItems={setExpandedItems}
          loading={isTreeFetching > 0}
          showConnect={hasNoNamespaces}
          onRefresh={handleRefreshNamespaces}
          onCollapseAll={() => setExpandedItems([])}
          onConnect={() => {
            setEditConnection(null);
            setConnectOpen(true);
          }}
          onDisconnect={handleDisconnect}
          onEdit={handleEdit}
        />

        <ResizeHandle
          ariaLabel="Resize namespaces panel"
          value={leftWidth}
          min={MIN_LEFT_WIDTH}
          max={MAX_LEFT_WIDTH}
          onChange={setLeftWidth}
        />

        <MessagesPanel
          entity={selectedEntity}
          view={messageView}
          rows={rows}
          rowCount={rowCount}
          loading={messagesQuery.isFetching}
          error={
            messagesQuery.isError
              ? messagesQuery.error instanceof Error
                ? messagesQuery.error.message
                : "Failed to load messages."
              : null
          }
          paginationModel={paginationModel}
          selectedId={selection?.sequenceNumber ?? null}
          onViewChange={handleViewChange}
          onRefresh={handleRefreshMessages}
          onPaginationModelChange={handlePaginationChange}
          onSelect={handleMessageSelect}
        />

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
          <Box sx={{ flexGrow: 1, minHeight: 0 }}>
            <MessageDetails message={selectedMessage} />
          </Box>
        </Paper>
      </Box>

      {logsOpen ? (
        <LogsPanel
          height={logsHeight}
          minHeight={MIN_LOGS_HEIGHT}
          maxHeight={MAX_LOGS_HEIGHT}
          onHeightChange={setLogsHeight}
          onClose={() => setLogsOpen(false)}
        />
      ) : (
        <Tooltip title="View Logs" placement="right">
          <Paper
            elevation={3}
            sx={{
              position: "absolute",
              left: 8,
              bottom: 8,
              borderRadius: "50%",
              zIndex: (theme) => theme.zIndex.fab,
            }}
          >
            <IconButton
              size="small"
              aria-label="View Logs"
              onClick={() => setLogsOpen(true)}
            >
              <ArticleOutlinedIcon fontSize="small" />
            </IconButton>
          </Paper>
        </Tooltip>
      )}

      <ConnectionDialog
        open={connectOpen}
        onClose={closeConnectionDialog}
        onAdd={handleConnect}
        onSave={handleSave}
        connection={editConnection}
        busy={addConnection.isPending || updateConnection.isPending}
      />
    </Box>
  );
}

export default App;
