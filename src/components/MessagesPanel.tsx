import { Box, Typography } from "@mui/material";
import TouchAppRoundedIcon from "@mui/icons-material/TouchAppRounded";
import type { GridPaginationModel } from "@mui/x-data-grid";
import type { ServiceBusReceivedMessage } from "../api/types";
import type { SelectedEntity } from "./NamespaceTree";
import MessageToolbar, { type MessageView } from "./MessageToolbar";
import MessageGrid from "./MessageGrid";

interface MessagesPanelProps {
  entity: SelectedEntity | null;
  view: MessageView;
  rows: ServiceBusReceivedMessage[];
  rowCount: number;
  loading: boolean;
  paginationModel: GridPaginationModel;
  selectedId: string | null;
  onViewChange: (
    event: React.MouseEvent<HTMLElement>,
    value: MessageView | null,
  ) => void;
  onRefresh: () => void;
  onPaginationModelChange: (model: GridPaginationModel) => void;
  onSelect: (message: ServiceBusReceivedMessage) => void;
}

/** Middle panel: the message toolbar and grid, or a prompt when nothing is selected. */
export default function MessagesPanel({
  entity,
  view,
  rows,
  rowCount,
  loading,
  paginationModel,
  selectedId,
  onViewChange,
  onRefresh,
  onPaginationModelChange,
  onSelect,
}: MessagesPanelProps) {
  return (
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
      {entity ? (
        <>
          <MessageToolbar
            entity={entity}
            view={view}
            onViewChange={onViewChange}
            onRefresh={onRefresh}
          />
          <Box sx={{ flexGrow: 1, minHeight: 0 }}>
            <MessageGrid
              rows={rows}
              rowCount={rowCount}
              loading={loading}
              deadLetterView={view === "deadletter"}
              paginationModel={paginationModel}
              onPaginationModelChange={onPaginationModelChange}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          </Box>
        </>
      ) : (
        <Box
          sx={{
            flexGrow: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 1,
            color: "text.secondary",
            p: 3,
          }}
        >
          <TouchAppRoundedIcon fontSize="large" />
          <Typography variant="body2" align="center">
            Select a queue or subscription to view its messages.
          </Typography>
        </Box>
      )}
    </Box>
  );
}
