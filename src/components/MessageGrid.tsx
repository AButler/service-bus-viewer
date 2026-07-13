import { useMemo } from "react";
import {
  DataGrid,
  type GridColDef,
  type GridPaginationModel,
  type GridRowParams,
} from "@mui/x-data-grid";
import { Box, Chip } from "@mui/material";
import type { ServiceBusReceivedMessage } from "../api/types";
import { getPropertyFormatter } from "./propertyFormatters";

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
        valueFormatter: (value: number) =>
          getPropertyFormatter("sequenceNumber")(value, "simple"),
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
        width: 100,
        type: "number",
        valueGetter: (_value, row) => bodyBytes(row.body),
        valueFormatter: (value: number) =>
          getPropertyFormatter("size")(value, "simple"),
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
        width: 200,
        valueFormatter: (value: Date) =>
          getPropertyFormatter("enqueuedTimeUtc")(value, "simple"),
      },
    ],
    [deadLetterView],
  );

  return (
    <Box sx={{ height: "100%", width: "100%" }}>
      <DataGrid
        rows={rows}
        columns={columns}
        getRowId={(row) => String(row.sequenceNumber)}
        density="compact"
        disableColumnMenu
        disableColumnSorting
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
