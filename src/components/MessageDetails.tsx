import {
  Box,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper,
  Typography,
} from "@mui/material";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import type { ServiceBusReceivedMessage } from "../api/types";
import { getBodyRenderer } from "./bodyRenderers";

interface MessageDetailsProps {
  message: ServiceBusReceivedMessage | null;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${days}.${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function bodyBytes(body: unknown): number {
  return JSON.stringify(body ?? "").length;
}

function PropertyRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <ListItem disableGutters sx={{ py: 0.5, alignItems: "flex-start" }}>
      <ListItemText
        primary={label}
        secondary={value}
        slotProps={{
          primary: { variant: "caption", color: "text.secondary" },
          secondary: {
            variant: "body2",
            color: "text.primary",
            sx: { wordBreak: "break-word" },
          },
        }}
      />
    </ListItem>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      variant="overline"
      color="text.secondary"
      sx={{ letterSpacing: 0.6 }}
    >
      {children}
    </Typography>
  );
}

export default function MessageDetails({ message }: MessageDetailsProps) {
  if (!message) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 1,
          height: "100%",
          color: "text.secondary",
          p: 3,
        }}
      >
        <DescriptionRoundedIcon fontSize="large" />
        <Typography variant="body2" align="center">
          Select a message to inspect its properties and body.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: "100%", overflowY: "auto", p: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <Typography variant="h5" noWrap>
          {message.subject ?? "(no subject)"}
        </Typography>
        <Chip
          size="small"
          label={message.deadLetterReason ? "Dead-lettered" : message.state}
          color={message.deadLetterReason ? "error" : "primary"}
          variant="outlined"
          sx={{ ml: "auto", textTransform: "capitalize" }}
        />
      </Box>
      <Typography variant="caption" color="text.secondary">
        {message.messageId}
      </Typography>

      <Divider sx={{ my: 1.5 }} />

      <SectionTitle>System Properties</SectionTitle>
      <List dense disablePadding>
        <PropertyRow label="Sequence Number" value={message.sequenceNumber} />
        <PropertyRow
          label="Correlation ID"
          value={message.correlationId ?? "\u2014"}
        />
        <PropertyRow label="Session ID" value={message.sessionId ?? "\u2014"} />
        <PropertyRow
          label="Content Type"
          value={message.contentType ?? "\u2014"}
        />
        <PropertyRow label="Size" value={`${bodyBytes(message.body)} bytes`} />
        <PropertyRow label="Delivery Count" value={message.deliveryCount} />
        <PropertyRow
          label="Time To Live"
          value={formatDuration(message.timeToLive)}
        />
        <PropertyRow
          label="Enqueued Time (UTC)"
          value={new Date(message.enqueuedTimeUtc).toLocaleString()}
        />
      </List>

      {message.deadLetterReason && (
        <>
          <Divider sx={{ my: 1.5 }} />
          <SectionTitle>Dead-letter</SectionTitle>
          <List dense disablePadding>
            <PropertyRow label="Reason" value={message.deadLetterReason} />
            <PropertyRow
              label="Error Description"
              value={message.deadLetterErrorDescription ?? "\u2014"}
            />
            <PropertyRow
              label="Source"
              value={message.deadLetterSource ?? "\u2014"}
            />
          </List>
        </>
      )}

      <Divider sx={{ my: 1.5 }} />

      <SectionTitle>Application Properties</SectionTitle>
      <List dense disablePadding>
        {Object.entries(message.applicationProperties ?? {}).map(
          ([key, value]) => (
            <PropertyRow key={key} label={key} value={String(value)} />
          ),
        )}
      </List>

      <Divider sx={{ my: 1.5 }} />

      <SectionTitle>Body</SectionTitle>
      <Paper
        variant="outlined"
        sx={{
          mt: 1,
          p: 1.5,
          bgcolor: "action.hover",
          borderRadius: 2,
          overflowX: "auto",
        }}
      >
        {(() => {
          const BodyRenderer = getBodyRenderer(message.contentType);
          return (
            <BodyRenderer
              body={message.body}
              contentType={message.contentType}
            />
          );
        })()}
      </Paper>
    </Box>
  );
}
