import { useMemo } from "react";
import {
  DataGrid,
  type GridColDef,
  type GridPaginationModel,
  type GridRowParams,
} from "@mui/x-data-grid";
import { Box, Chip } from "@mui/material";
import type { ServiceBusReceivedMessage } from "../api/types";

interface MessageGridProps {
  rows: ServiceBusReceivedMessage[];
  rowCount: number;
  loading: boolean;
  deadLetterView: boolean;
  paginationModel: GridPaginationModel;
  onPaginationModelChange: (model: GridPaginationModel) => void;
  selectedId: string | null;
  onSelect: (message: ServiceBusReceivedMessage) => void;
}

const stateColor: Record<
  ServiceBusReceivedMessage["state"],
  "success" | "warning" | "info"
> = {
  active: "success",
  deferred: "warning",
  scheduled: "info",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function bodyBytes(body: unknown): number {
  return JSON.stringify(body ?? "").length;
}

export default function MessageGrid({
  rows,
  rowCount,
  loading,
  deadLetterView,
  paginationModel,
  onPaginationModelChange,
  selectedId,
  onSelect,
}: MessageGridProps) {
  const columns = useMemo<GridColDef<ServiceBusReceivedMessage>[]>(
    () => [
      {
        field: "sequenceNumber",
        headerName: "Seq #",
        width: 90,
        type: "number",
      },
      { field: "messageId", headerName: "Message ID", width: 200 },
      { field: "subject", headerName: "Subject", width: 150 },
      {
        field: "state",
        headerName: "State",
        width: 130,
        renderCell: (params) => {
          const message = params.row;
          if (message.deadLetterReason) {
            return (
              <Chip
                size="small"
                label="Dead-lettered"
                color="error"
                variant="outlined"
              />
            );
          }
          return (
            <Chip
              size="small"
              label={message.state}
              color={stateColor[message.state]}
              variant="outlined"
              sx={{ textTransform: "capitalize" }}
            />
          );
        },
      },
      ...(deadLetterView
        ? ([
            {
              field: "deadLetterReason",
              headerName: "Dead Letter Reason",
              width: 200,
            },
            {
              field: "deadLetterErrorDescription",
              headerName: "Dead Letter Error Description",
              width: 280,
            },
          ] as GridColDef<ServiceBusReceivedMessage>[])
        : []),
      {
        field: "size",
        headerName: "Size",
        width: 90,
        type: "number",
        valueGetter: (_value, row) => bodyBytes(row.body),
        valueFormatter: (value: number) => formatBytes(value),
      },
      {
        field: "deliveryCount",
        headerName: "Deliveries",
        width: 100,
        type: "number",
      },
      {
        field: "enqueuedTimeUtc",
        headerName: "Enqueued (UTC)",
        width: 190,
        valueFormatter: (value: Date) => new Date(value).toLocaleString(),
      },
    ],
    [deadLetterView],
  );

  return (
    <Box sx={{ height: "100%", width: "100%" }}>
      <DataGrid
        rows={rows}
        columns={columns}
        getRowId={(row) => row.messageId}
        density="compact"
        disableColumnMenu
        loading={loading}
        paginationMode="server"
        rowCount={rowCount}
        paginationModel={paginationModel}
        onPaginationModelChange={onPaginationModelChange}
        onRowClick={(params: GridRowParams<ServiceBusReceivedMessage>) =>
          onSelect(params.row)
        }
        rowSelectionModel={
          selectedId
            ? { type: "include", ids: new Set([selectedId]) }
            : { type: "include", ids: new Set() }
        }
        pageSizeOptions={[25, 50, 100]}
        sx={{
          border: "none",
          "& .MuiDataGrid-row": { cursor: "pointer" },
          "& .MuiDataGrid-columnHeaders": { fontWeight: 600 },
          "& .MuiLinearProgress-root": { height: 2 },
        }}
      />
    </Box>
  );
}
