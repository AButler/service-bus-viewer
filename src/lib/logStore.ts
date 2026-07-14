// In-memory session log store + console forwarding.
//
// `initLogging()` (called once at startup) wraps the `console` methods so every
// message is (1) still printed to the devtools console, (2) captured in a
// bounded in-memory buffer for the in-app Logs panel, and (3) in the Tauri
// desktop app, forwarded to the logging plugin (persisted to a file + stdout).
//
// The buffer is capped (`MAX_ENTRIES`) so memory stays bounded during long
// sessions; the panel virtualises rendering so the DOM stays small too.

import { useSyncExternalStore } from "react";
import { isTauri } from "@tauri-apps/api/core";

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error";

export interface LogEntry {
  id: number;
  level: LogLevel;
  message: string;
  timestamp: number;
}

const MAX_ENTRIES = 5000;

let entries: LogEntry[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function append(level: LogLevel, message: string): void {
  const entry: LogEntry = {
    id: nextId++,
    level,
    message,
    timestamp: Date.now(),
  };
  // Keep the buffer bounded, dropping the oldest entries when it overflows.
  const base =
    entries.length >= MAX_ENTRIES
      ? entries.slice(entries.length - MAX_ENTRIES + 1)
      : entries.slice();
  base.push(entry);
  entries = base;
  emit();
}

export function getLogEntries(): LogEntry[] {
  return entries;
}

export function subscribeLogs(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function clearLogs(): void {
  entries = [];
  emit();
}

/** Subscribe a component to the live session log buffer. */
export function useLogs(): LogEntry[] {
  return useSyncExternalStore(subscribeLogs, getLogEntries);
}

function toMessage(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof Error) return value.stack ?? value.message;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

// Maps a console method to the plugin log level (matching Tauri's docs, where
// `console.log` is treated as `trace`).
const CONSOLE_LEVELS: Record<
  "log" | "debug" | "info" | "warn" | "error",
  LogLevel
> = {
  log: "trace",
  debug: "debug",
  info: "info",
  warn: "warn",
  error: "error",
};

let initialized = false;

/** Install console forwarding. Safe to call once; subsequent calls are no-ops. */
export function initLogging(): void {
  if (initialized) return;
  initialized = true;

  const pluginLoggers: Partial<
    Record<LogLevel, (message: string) => Promise<void>>
  > = {};
  if (isTauri()) {
    void import("@tauri-apps/plugin-log").then((log) => {
      pluginLoggers.trace = log.trace;
      pluginLoggers.debug = log.debug;
      pluginLoggers.info = log.info;
      pluginLoggers.warn = log.warn;
      pluginLoggers.error = log.error;
    });
  }

  let forwarding = false;
  (["log", "debug", "info", "warn", "error"] as const).forEach((fnName) => {
    const level = CONSOLE_LEVELS[fnName];
    const original = console[fnName].bind(console);
    console[fnName] = (...args: unknown[]) => {
      original(...args);
      if (forwarding) return; // guard against re-entrancy
      forwarding = true;
      try {
        const message = args.map(toMessage).join(" ");
        append(level, message);
        pluginLoggers[level]?.(message)?.catch(() => {});
      } finally {
        forwarding = false;
      }
    };
  });
}
