import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
  Tooltip,
  Typography,
} from "@mui/material";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import UnfoldMoreRoundedIcon from "@mui/icons-material/UnfoldMoreRounded";
import UnfoldLessRoundedIcon from "@mui/icons-material/UnfoldLessRounded";
import { useState } from "react";
import type { ServiceBusReceivedMessage } from "../api/types";
import { getBodyRenderer } from "./bodyRenderers";
import { copyText } from "../lib/clipboard";

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
  copyValue,
}: {
  label: string;
  value: React.ReactNode;
  copyValue?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [hovered, setHovered] = useState(false);

  const handleCopy = async () => {
    if (copyValue === undefined) return;
    try {
      await copyText(copyValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // Ignore clipboard failures (e.g. permission denied).
    }
  };

  return (
    <ListItem
      disableGutters
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      sx={{ py: 0.5, alignItems: "flex-start" }}
      secondaryAction={
        copyValue !== undefined ? (
          <Tooltip title={copied ? "Copied" : "Copy"}>
            <IconButton
              size="small"
              edge="end"
              aria-label={`Copy ${label}`}
              onClick={handleCopy}
              sx={{ position: "relative" }}
            >
              <ContentCopyRoundedIcon
                fontSize="inherit"
                sx={{
                  opacity: hovered && !copied ? 1 : 0,
                  transition: "opacity 0.15s",
                }}
              />
              <CheckRoundedIcon
                color="success"
                fontSize="inherit"
                sx={{
                  position: "absolute",
                  opacity: copied ? 1 : 0,
                  transition: "opacity 0.4s",
                }}
              />
            </IconButton>
          </Tooltip>
        ) : undefined
      }
    >
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

function Section({
  title,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <Accordion
      expanded={expanded}
      onChange={onToggle}
      disableGutters
      square
      elevation={0}
      sx={{
        bgcolor: "transparent",
        borderBottom: 1,
        borderColor: "divider",
        "&:first-of-type": {
          mt: 1.5,
        },
        "&:before": { display: "none" },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreRoundedIcon fontSize="small" />}
        sx={{
          px: 0,
          minHeight: 0,
          "& .MuiAccordionSummary-content": { my: 1 },
        }}
      >
        <SectionTitle>{title}</SectionTitle>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 0, pt: 0 }}>{children}</AccordionDetails>
    </Accordion>
  );
}

export default function MessageDetails({ message }: MessageDetailsProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

  const isExpanded = (title: string) => !collapsed.has(title);
  const toggleSection = (title: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(title)) {
        next.delete(title);
      } else {
        next.add(title);
      }
      return next;
    });
  const expandAll = () => setCollapsed(new Set());
  const collapseAll = () =>
    setCollapsed(
      new Set([
        "Body",
        "Dead-letter",
        "Application Properties",
        "System Properties",
      ]),
    );

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 1.5,
          borderBottom: 1,
          borderColor: "divider",
          display: "flex",
          alignItems: "center",
          gap: 1,
          "&:hover .details-header-action": { opacity: 1 },
        }}
      >
        <Typography variant="overline" color="text.secondary">
          Message Details
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        {message && (
          <>
            <Tooltip title="Expand all">
              <IconButton
                className="details-header-action"
                size="small"
                aria-label="Expand all"
                onClick={expandAll}
                sx={{ opacity: 0, transition: "opacity 0.15s" }}
              >
                <UnfoldMoreRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Collapse all">
              <IconButton
                className="details-header-action"
                size="small"
                aria-label="Collapse all"
                onClick={collapseAll}
                sx={{ opacity: 0, transition: "opacity 0.15s" }}
              >
                <UnfoldLessRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        )}
      </Box>

      {!message ? (
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
          <DescriptionRoundedIcon fontSize="large" />
          <Typography variant="body2" align="center">
            Select a message to inspect its properties and body.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ flexGrow: 1, minHeight: 0, overflowY: "auto", p: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <Typography variant="h5" noWrap>
              {message.subject ?? "(no subject)"}
            </Typography>
            <Chip
              size="small"
              label={
                message.deadLetterReason ? "Dead-lettered" : message.state
              }
              color={message.deadLetterReason ? "error" : "primary"}
              variant="outlined"
              sx={{ ml: "auto", textTransform: "capitalize" }}
            />
          </Box>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{
          display: "block",
          pb: 1.5,
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        {message.messageId}
      </Typography>

      <Section
        title="Body"
        expanded={isExpanded("Body")}
        onToggle={() => toggleSection("Body")}
      >
        <Paper
          variant="outlined"
          sx={{
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
      </Section>

      {message.deadLetterReason && (
        <Section
          title="Dead-letter"
          expanded={isExpanded("Dead-letter")}
          onToggle={() => toggleSection("Dead-letter")}
        >
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
        </Section>
      )}

      <Section
        title="Application Properties"
        expanded={isExpanded("Application Properties")}
        onToggle={() => toggleSection("Application Properties")}
      >
        <List dense disablePadding>
          {Object.entries(message.applicationProperties ?? {}).map(
            ([key, value]) => (
              <PropertyRow
                key={key}
                label={key}
                value={String(value)}
                copyValue={String(value)}
              />
            ),
          )}
        </List>
      </Section>

      <Section
        title="System Properties"
        expanded={isExpanded("System Properties")}
        onToggle={() => toggleSection("System Properties")}
      >
        <List dense disablePadding>
          <PropertyRow
            label="Sequence Number"
            value={message.sequenceNumber}
            copyValue={String(message.sequenceNumber)}
          />
          <PropertyRow
            label="Correlation ID"
            value={message.correlationId ?? "\u2014"}
            copyValue={message.correlationId ?? undefined}
          />
          <PropertyRow
            label="Session ID"
            value={message.sessionId ?? "\u2014"}
            copyValue={message.sessionId ?? undefined}
          />
          <PropertyRow
            label="Content Type"
            value={message.contentType ?? "\u2014"}
            copyValue={message.contentType ?? undefined}
          />
          <PropertyRow
            label="Size"
            value={`${bodyBytes(message.body)} bytes`}
            copyValue={String(bodyBytes(message.body))}
          />
          <PropertyRow
            label="Delivery Count"
            value={message.deliveryCount}
            copyValue={String(message.deliveryCount)}
          />
          <PropertyRow
            label="Time To Live"
            value={formatDuration(message.timeToLive)}
            copyValue={formatDuration(message.timeToLive)}
          />
          <PropertyRow
            label="Enqueued Time (UTC)"
            value={new Date(message.enqueuedTimeUtc).toLocaleString()}
            copyValue={new Date(message.enqueuedTimeUtc).toLocaleString()}
          />
        </List>
      </Section>
        </Box>
      )}
    </Box>
  );
}
