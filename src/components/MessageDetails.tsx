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
import type { ServiceBusMessage } from "../data/mockData";

interface MessageDetailsProps {
  message: ServiceBusMessage | null;
}

function PropertyRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <ListItem disableGutters sx={{ py: 0.5, alignItems: "flex-start" }}>
      <ListItemText
        primary={label}
        secondary={value}
        slotProps={{
          primary: { variant: "caption", color: "text.secondary" },
          secondary: { variant: "body2", color: "text.primary", sx: { wordBreak: "break-word" } },
        }}
      />
    </ListItem>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 0.6 }}>
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
          {message.subject}
        </Typography>
        <Chip size="small" label={message.state} color="primary" variant="outlined" sx={{ ml: "auto" }} />
      </Box>
      <Typography variant="caption" color="text.secondary">
        {message.messageId}
      </Typography>

      <Divider sx={{ my: 1.5 }} />

      <SectionTitle>System Properties</SectionTitle>
      <List dense disablePadding>
        <PropertyRow label="Sequence Number" value={message.sequenceNumber} />
        <PropertyRow label="Correlation ID" value={message.correlationId} />
        <PropertyRow label="Session ID" value={message.sessionId ?? "—"} />
        <PropertyRow label="Content Type" value={message.contentType} />
        <PropertyRow label="Size" value={`${message.size} bytes`} />
        <PropertyRow label="Delivery Count" value={message.deliveryCount} />
        <PropertyRow label="Time To Live" value={message.timeToLive} />
        <PropertyRow label="Enqueued Time (UTC)" value={new Date(message.enqueuedTime).toLocaleString()} />
      </List>

      <Divider sx={{ my: 1.5 }} />

      <SectionTitle>Application Properties</SectionTitle>
      <List dense disablePadding>
        {Object.entries(message.applicationProperties).map(([key, value]) => (
          <PropertyRow key={key} label={key} value={String(value)} />
        ))}
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
        <Box
          component="pre"
          sx={{
            m: 0,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: "0.75rem",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {message.body}
        </Box>
      </Paper>
    </Box>
  );
}
