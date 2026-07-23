import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import type { SendableMessage } from "../api/types";

/** The queue or topic a message is being sent to. */
export interface SendTarget {
  name: string;
  type: "queue" | "topic";
}

interface PropertyField {
  key: string;
  value: string;
}

export interface SendMessageFields {
  body: string;
  contentType: string;
  subject: string;
  messageId: string;
  correlationId: string;
  sessionId: string;
  partitionKey: string;
  timeToLiveSeconds: string;
  scheduledEnqueueTime: string;
  properties: PropertyField[];
}

const EMPTY_FIELDS: SendMessageFields = {
  body: "",
  contentType: "application/json",
  subject: "",
  messageId: "",
  correlationId: "",
  sessionId: "",
  partitionKey: "",
  timeToLiveSeconds: "",
  scheduledEnqueueTime: "",
  properties: [],
};

function trimmed(value: string): string | undefined {
  const t = value.trim();
  return t === "" ? undefined : t;
}

/** Build a `SendableMessage` from the dialog fields (pure — exported for tests). */
export function buildSendableMessage(
  fields: SendMessageFields,
): SendableMessage {
  const applicationProperties: Record<string, string> = {};
  for (const { key, value } of fields.properties) {
    const name = key.trim();
    if (name !== "") applicationProperties[name] = value;
  }

  const ttl = Number(fields.timeToLiveSeconds.trim());
  const timeToLive =
    fields.timeToLiveSeconds.trim() !== "" && Number.isFinite(ttl) && ttl > 0
      ? Math.round(ttl * 1000)
      : undefined;

  const scheduled = fields.scheduledEnqueueTime.trim();
  const scheduledDate = scheduled !== "" ? new Date(scheduled) : undefined;
  const scheduledEnqueueTimeUtc =
    scheduledDate && !Number.isNaN(scheduledDate.getTime())
      ? scheduledDate
      : undefined;

  return {
    body: fields.body,
    contentType: trimmed(fields.contentType),
    subject: trimmed(fields.subject),
    messageId: trimmed(fields.messageId),
    correlationId: trimmed(fields.correlationId),
    sessionId: trimmed(fields.sessionId),
    partitionKey: trimmed(fields.partitionKey),
    timeToLive,
    scheduledEnqueueTimeUtc,
    applicationProperties:
      Object.keys(applicationProperties).length > 0
        ? applicationProperties
        : undefined,
  };
}

interface SendMessageDialogProps {
  open: boolean;
  target: SendTarget | null;
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onSend: (message: SendableMessage) => void;
}

/** Compose and send a message to a queue or topic. */
export default function SendMessageDialog({
  open,
  target,
  busy,
  error,
  onClose,
  onSend,
}: SendMessageDialogProps) {
  const [fields, setFields] = useState<SendMessageFields>(EMPTY_FIELDS);

  // Reset the form whenever the dialog is (re)opened.
  useEffect(() => {
    if (open) setFields(EMPTY_FIELDS);
  }, [open]);

  const set = (
    name: keyof Omit<SendMessageFields, "properties">,
    value: string,
  ) => setFields((prev) => ({ ...prev, [name]: value }));

  const setProperty = (index: number, patch: Partial<PropertyField>) =>
    setFields((prev) => ({
      ...prev,
      properties: prev.properties.map((p, i) =>
        i === index ? { ...p, ...patch } : p,
      ),
    }));

  const addProperty = () =>
    setFields((prev) => ({
      ...prev,
      properties: [...prev.properties, { key: "", value: "" }],
    }));

  const removeProperty = (index: number) =>
    setFields((prev) => ({
      ...prev,
      properties: prev.properties.filter((_p, i) => i !== index),
    }));

  const handleSend = () => {
    if (!target || busy) return;
    onSend(buildSendableMessage(fields));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {target
          ? `Send message to ${target.type} \u201c${target.name}\u201d`
          : "Send message"}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 2,
              alignItems: "start",
            }}
          >
            <TextField
              label="Body"
              value={fields.body}
              onChange={(e) => set("body", e.target.value)}
              fullWidth
              multiline
              minRows={12}
              autoFocus
              sx={{
                height: "100%",
                "& .MuiInputBase-root": {
                  height: "100%",
                  alignItems: "flex-start",
                },
              }}
            />

            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <TextField
                label="Content type"
                value={fields.contentType}
                onChange={(e) => set("contentType", e.target.value)}
                size="small"
                fullWidth
              />
              <TextField
                label="Subject"
                value={fields.subject}
                onChange={(e) => set("subject", e.target.value)}
                size="small"
                fullWidth
              />
              <TextField
                label="Message ID"
                value={fields.messageId}
                onChange={(e) => set("messageId", e.target.value)}
                size="small"
                fullWidth
              />
              <TextField
                label="Correlation ID"
                value={fields.correlationId}
                onChange={(e) => set("correlationId", e.target.value)}
                size="small"
                fullWidth
              />
              <TextField
                label="Session ID"
                value={fields.sessionId}
                onChange={(e) => set("sessionId", e.target.value)}
                size="small"
                fullWidth
              />
              <TextField
                label="Partition key"
                value={fields.partitionKey}
                onChange={(e) => set("partitionKey", e.target.value)}
                size="small"
                fullWidth
              />
              <TextField
                label="Time to live (seconds)"
                value={fields.timeToLiveSeconds}
                onChange={(e) => set("timeToLiveSeconds", e.target.value)}
                type="number"
                size="small"
                fullWidth
              />
              <TextField
                label="Scheduled enqueue time"
                value={fields.scheduledEnqueueTime}
                onChange={(e) => set("scheduledEnqueueTime", e.target.value)}
                type="datetime-local"
                size="small"
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
                helperText="Leave empty to enqueue immediately."
              />
            </Box>
          </Box>

          <Divider />

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography variant="subtitle2">Application properties</Typography>
            <Button
              size="small"
              startIcon={<AddRoundedIcon />}
              onClick={addProperty}
            >
              Add
            </Button>
          </Box>

          {fields.properties.length === 0 ? (
            <Typography variant="caption" color="text.secondary">
              No custom properties.
            </Typography>
          ) : (
            fields.properties.map((property, index) => (
              <Box
                key={index}
                sx={{ display: "flex", alignItems: "center", gap: 1 }}
              >
                <TextField
                  label="Key"
                  value={property.key}
                  onChange={(e) => setProperty(index, { key: e.target.value })}
                  size="small"
                  sx={{ flex: 1 }}
                />
                <TextField
                  label="Value"
                  value={property.value}
                  onChange={(e) =>
                    setProperty(index, { value: e.target.value })
                  }
                  size="small"
                  sx={{ flex: 1 }}
                />
                <Tooltip title="Remove property">
                  <IconButton
                    size="small"
                    aria-label="Remove property"
                    onClick={() => removeProperty(index)}
                  >
                    <DeleteOutlineRoundedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            ))
          )}
        </Box>
        {error && (
          <Typography variant="caption" color="error" sx={{ mt: 2 }}>
            {error}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSend}
          disabled={!target || busy}
        >
          {busy ? "Sending\u2026" : "Send"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
