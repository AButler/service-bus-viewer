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
import { getPropertyFormatter } from "./propertyFormatters";
import { copyText } from "../lib/clipboard";

interface MessageDetailsProps {
  message: ServiceBusReceivedMessage | null;
}

function bodyBytes(body: unknown): number {
  return JSON.stringify(body ?? "").length;
}

function bodyToText(body: unknown): string {
  if (typeof body === "string") return body;
  return JSON.stringify(body, null, 2);
}

function CopyButton({
  value,
  label,
  hovered,
  edge,
}: {
  value: string;
  label: string;
  hovered: boolean;
  edge?: "start" | "end" | false;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await copyText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // Ignore clipboard failures (e.g. permission denied).
    }
  };

  return (
    <Tooltip title={copied ? "Copied" : "Copy"}>
      <IconButton
        size="small"
        edge={edge}
        aria-label={label}
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
  );
}

function PropertyRow({
  label,
  value,
  copyValue,
  rawName,
}: {
  label: string;
  value: React.ReactNode;
  copyValue?: string;
  rawName?: string;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <ListItem
      disableGutters
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      sx={{ py: 0.5, alignItems: "flex-start" }}
      secondaryAction={
        copyValue !== undefined ? (
          <CopyButton
            value={copyValue}
            label={`Copy ${label}`}
            hovered={hovered}
            edge="end"
          />
        ) : undefined
      }
    >
      <ListItemText
        primary={
          rawName !== undefined ? (
            <Tooltip title={rawName}>
              <Box component="span">{label}</Box>
            </Tooltip>
          ) : (
            label
          )
        }
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

const SYSTEM_PROPERTY_NAMES = [
  "sequenceNumber",
  "correlationId",
  "sessionId",
  "contentType",
  "size",
  "deliveryCount",
  "timeToLive",
  "enqueuedTimeUtc",
] as const;

const DEAD_LETTER_PROPERTY_NAMES = [
  "deadLetterReason",
  "deadLetterErrorDescription",
  "deadLetterSource",
] as const;

/** Display-name overrides for known raw property names. */
const propertyLabels: Record<string, string> = {
  sequenceNumber: "Sequence Number",
  correlationId: "Correlation ID",
  sessionId: "Session ID",
  contentType: "Content Type",
  size: "Size",
  deliveryCount: "Delivery Count",
  timeToLive: "Time To Live",
  enqueuedTimeUtc: "Enqueued Time (UTC)",
  deadLetterReason: "Reason",
  deadLetterErrorDescription: "Error Description",
  deadLetterSource: "Source",
};

function getRawPropertyValue(
  message: ServiceBusReceivedMessage,
  name: string,
): unknown {
  if (name === "size") return bodyBytes(message.body);
  return (message as unknown as Record<string, unknown>)[name];
}

function renderPropertyRow(message: ServiceBusReceivedMessage, name: string) {
  const raw = getRawPropertyValue(message, name);
  const hasValue = raw !== undefined && raw !== null;
  const display = hasValue ? getPropertyFormatter(name)(raw) : "\u2014";
  return (
    <PropertyRow
      key={name}
      label={propertyLabels[name] ?? name}
      rawName={name}
      value={display}
      copyValue={hasValue ? display : undefined}
    />
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
  copyValue,
  children,
}: {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  copyValue?: string;
  children: React.ReactNode;
}) {
  const [hovered, setHovered] = useState(false);

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
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        sx={{
          px: 0,
          minHeight: 0,
          "& .MuiAccordionSummary-content": { my: 1, alignItems: "center" },
        }}
      >
        <SectionTitle>{title}</SectionTitle>
        {copyValue !== undefined && (
          <Box sx={{ ml: "auto", mr: 1, display: "inline-flex" }}>
            <CopyButton
              value={copyValue}
              label={`Copy ${title}`}
              hovered={hovered}
            />
          </Box>
        )}
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
            {message.subject !== undefined ? (
              <Tooltip title="Subject">
                <Typography variant="h5" noWrap>
                  {message.subject}
                </Typography>
              </Tooltip>
            ) : (
              <Typography variant="h5" noWrap>
                Seq #{message.sequenceNumber}
              </Typography>
            )}
            <Chip
              size="small"
              label={message.deadLetterReason ? "Dead-lettered" : message.state}
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
            <Tooltip title="Sequence number">
              <Box component="span">#{message.sequenceNumber}</Box>
            </Tooltip>{" "}
            &middot;{" "}
            <Tooltip title="Message ID">
              <Box component="span">{message.messageId}</Box>
            </Tooltip>
          </Typography>

          <Section
            title="Body"
            expanded={isExpanded("Body")}
            onToggle={() => toggleSection("Body")}
            copyValue={bodyToText(message.body)}
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
                {DEAD_LETTER_PROPERTY_NAMES.map((name) =>
                  renderPropertyRow(message, name),
                )}
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
                    rawName={key}
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
              {SYSTEM_PROPERTY_NAMES.map((name) =>
                renderPropertyRow(message, name),
              )}
            </List>
          </Section>
        </Box>
      )}
    </Box>
  );
}
