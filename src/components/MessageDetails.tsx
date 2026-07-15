import { useState } from "react";
import {
  Box,
  Chip,
  IconButton,
  List,
  Paper,
  Tooltip,
  Typography,
} from "@mui/material";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import UnfoldMoreRoundedIcon from "@mui/icons-material/UnfoldMoreRounded";
import UnfoldLessRoundedIcon from "@mui/icons-material/UnfoldLessRounded";
import type { ServiceBusReceivedMessage } from "../api/types";
import { getBodyRenderer } from "./bodyRenderers";
import { getPropertyFormatter } from "./propertyFormatters";
import PropertyRow from "./messageDetails/PropertyRow";
import Section from "./messageDetails/Section";
import {
  DEAD_LETTER_PROPERTY_NAMES,
  SYSTEM_PROPERTY_NAMES,
  bodyToText,
  getRawPropertyValue,
  propertyLabels,
} from "./messageDetails/properties";

interface MessageDetailsProps {
  message: ServiceBusReceivedMessage | null;
}

const SECTION_TITLES = [
  "Body",
  "Dead-letter",
  "Application Properties",
  "System Properties",
];

function renderPropertyRow(message: ServiceBusReceivedMessage, name: string) {
  const raw = getRawPropertyValue(message, name);
  const hasValue = raw !== undefined && raw !== null;
  const formatted = hasValue
    ? getPropertyFormatter(name)(raw, "full")
    : undefined;
  const hasDisplay = formatted !== undefined && formatted !== null;
  const display = hasDisplay ? formatted : "\u2014";
  return (
    <PropertyRow
      key={name}
      label={propertyLabels[name] ?? name}
      rawName={name}
      value={display}
      copyValue={hasDisplay ? display : undefined}
    />
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
  const collapseAll = () => setCollapsed(new Set(SECTION_TITLES));

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
