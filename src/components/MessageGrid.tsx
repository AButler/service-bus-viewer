import { useMemo } from "react";
import { DataGrid, type GridColDef, type GridRowParams } from "@mui/x-data-grid";
import { Box, Chip } from "@mui/material";
import type { ServiceBusMessage } from "../data/mockData";

interface MessageGridProps {
  messages: ServiceBusMessage[];
  selectedId: string | null;
  onSelect: (message: ServiceBusMessage) => void;
}

const stateColor: Record<ServiceBusMessage["state"], "success" | "warning" | "info" | "error"> = {
  Active: "success",
  Deferred: "warning",
  Scheduled: "info",
  DeadLetter: "error",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export default function MessageGrid({ messages, selectedId, onSelect }: MessageGridProps) {
  const columns = useMemo<GridColDef<ServiceBusMessage>[]>(
    () => [
      { field: "sequenceNumber", headerName: "Seq #", width: 90, type: "number" },
      { field: "messageId", headerName: "Message ID", width: 220 },
      { field: "subject", headerName: "Subject", width: 160 },
      {
        field: "state",
        headerName: "State",
        width: 120,
        renderCell: (params) => (
          <Chip size="small" label={params.value} color={stateColor[params.value as ServiceBusMessage["state"]]} variant="outlined" />
        ),
      },
      {
        field: "size",
        headerName: "Size",
        width: 90,
        type: "number",
        valueFormatter: (value: number) => formatBytes(value),
      },
      { field: "deliveryCount", headerName: "Deliveries", width: 100, type: "number" },
      {
        field: "enqueuedTime",
        headerName: "Enqueued (UTC)",
        width: 190,
        valueFormatter: (value: string) => new Date(value).toLocaleString(),
      },
    ],
    []
  );

  return (
    <Box sx={{ height: "100%", width: "100%" }}>
      <DataGrid
        rows={messages}
        columns={columns}
        getRowId={(row) => row.messageId}
        density="compact"
        disableColumnMenu
        onRowClick={(params: GridRowParams<ServiceBusMessage>) => onSelect(params.row)}
        rowSelectionModel={
          selectedId ? { type: "include", ids: new Set([selectedId]) } : { type: "include", ids: new Set() }
        }
        initialState={{
          pagination: { paginationModel: { pageSize: 25 } },
        }}
        pageSizeOptions={[25, 50, 100]}
        sx={{
          border: "none",
          "& .MuiDataGrid-row": { cursor: "pointer" },
          "& .MuiDataGrid-columnHeaders": { fontWeight: 600 },
        }}
      />
    </Box>
  );
}
