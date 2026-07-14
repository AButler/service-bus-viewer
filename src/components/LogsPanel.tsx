import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Box, IconButton, Paper, Tooltip, Typography } from "@mui/material";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import DeleteSweepRoundedIcon from "@mui/icons-material/DeleteSweepRounded";
import ResizeHandle from "./ResizeHandle";
import { MONO_FONT_FAMILY } from "../lib/fonts";
import {
  clearLogs,
  useLogs,
  type LogEntry,
  type LogLevel,
} from "../lib/logStore";

interface LogsPanelProps {
  height: number;
  minHeight: number;
  maxHeight: number;
  onHeightChange: (height: number) => void;
  onClose: () => void;
}

const ROW_HEIGHT = 20;
const OVERSCAN = 12;

const levelColor: Record<LogLevel, string> = {
  error: "error.main",
  warn: "warning.main",
  info: "text.primary",
  debug: "text.secondary",
  trace: "text.secondary",
};

function formatTime(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  return (
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` +
    `.${pad(d.getMilliseconds(), 3)}`
  );
}

/**
 * Bottom tool window that streams this session's logs. Renders a virtualised
 * window of rows so a large buffer stays cheap, and sticks to the bottom while
 * the user is scrolled there.
 */
export default function LogsPanel({
  height,
  minHeight,
  maxHeight,
  onHeightChange,
  onClose,
}: LogsPanelProps) {
  const entries = useLogs();
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() =>
      setViewportHeight(el.clientHeight),
    );
    observer.observe(el);
    setViewportHeight(el.clientHeight);
    return () => observer.disconnect();
  }, []);

  // Keep the newest log in view when the user is already at the bottom.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottom.current) {
      el.scrollTop = el.scrollHeight;
      setScrollTop(el.scrollTop);
    }
  }, [entries]);

  const total = entries.length;
  const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const end = Math.min(
    total,
    start + Math.ceil(viewportHeight / ROW_HEIGHT) + OVERSCAN * 2,
  );
  const visible = useMemo(
    () => entries.slice(start, end),
    [entries, start, end],
  );

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const el = event.currentTarget;
    setScrollTop(el.scrollTop);
    stickToBottom.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < ROW_HEIGHT * 2;
  };

  return (
    <Paper
      square
      elevation={0}
      sx={{
        height,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        borderTop: 1,
        borderColor: "divider",
        minHeight: 0,
      }}
    >
      <ResizeHandle
        ariaLabel="Resize logs panel"
        orientation="horizontal"
        value={height}
        min={minHeight}
        max={maxHeight}
        invert
        onChange={onHeightChange}
      />

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 1.5,
          py: 0.5,
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Typography variant="overline" sx={{ lineHeight: 1.5 }}>
          Logs
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {total}
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Tooltip title="Clear logs">
          <IconButton size="small" aria-label="Clear logs" onClick={clearLogs}>
            <DeleteSweepRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Hide logs">
          <IconButton size="small" aria-label="Hide logs" onClick={onClose}>
            <KeyboardArrowDownRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Box
        ref={scrollRef}
        onScroll={handleScroll}
        sx={{
          flexGrow: 1,
          minHeight: 0,
          overflowY: "auto",
          fontFamily: MONO_FONT_FAMILY,
          fontSize: 12,
          bgcolor: "action.hover",
        }}
      >
        {total === 0 ? (
          <Box sx={{ p: 2, color: "text.secondary" }}>No logs yet.</Box>
        ) : (
          <Box sx={{ height: total * ROW_HEIGHT, position: "relative" }}>
            <Box
              sx={{
                position: "absolute",
                top: start * ROW_HEIGHT,
                left: 0,
                right: 0,
              }}
            >
              {visible.map((entry) => (
                <LogRow key={entry.id} entry={entry} />
              ))}
            </Box>
          </Box>
        )}
      </Box>
    </Paper>
  );
}

function LogRow({ entry }: { entry: LogEntry }) {
  return (
    <Box
      sx={{
        height: ROW_HEIGHT,
        display: "flex",
        alignItems: "center",
        gap: 1,
        px: 1.5,
        whiteSpace: "pre",
        overflow: "hidden",
      }}
    >
      <Box component="span" sx={{ color: "text.disabled", flexShrink: 0 }}>
        {formatTime(entry.timestamp)}
      </Box>
      <Box
        component="span"
        sx={{
          color: levelColor[entry.level],
          textTransform: "uppercase",
          width: 44,
          flexShrink: 0,
        }}
      >
        {entry.level}
      </Box>
      <Box
        component="span"
        sx={{
          color: levelColor[entry.level],
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {entry.message}
      </Box>
    </Box>
  );
}
