import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { formatBytes } from "./bytesFormatter";
import { formatDuration } from "./durationFormatter";
import { formatDateTime } from "./dateTimeFormatter";
import { getPropertyFormatter } from "./index";

describe("formatBytes", () => {
  it("renders raw bytes below 1 KB (both details)", () => {
    expect(formatBytes(500, "full")).toBe("500 bytes");
    expect(formatBytes(500, "simple")).toBe("500 bytes");
  });

  it("renders bytes with the largest unit in parentheses (full)", () => {
    expect(formatBytes(1024, "full")).toBe("1,024 bytes (1 KB)");
    expect(formatBytes(1536, "full")).toBe("1,536 bytes (1.5 KB)");
    expect(formatBytes(1572864, "full")).toBe("1,572,864 bytes (1.5 MB)");
  });

  it("renders only the largest unit (simple)", () => {
    expect(formatBytes(1024, "simple")).toBe("1 KB");
    expect(formatBytes(1536, "simple")).toBe("1.5 KB");
    expect(formatBytes(1572864, "simple")).toBe("1.5 MB");
  });
});

describe("formatDuration", () => {
  it("renders sub-minute durations as seconds", () => {
    expect(formatDuration(30_000, "full")).toBe("30 seconds");
  });

  it("renders the largest unit in parentheses (full)", () => {
    expect(formatDuration(14 * 86_400_000, "full")).toBe(
      "1,209,600 seconds (14 days)",
    );
    expect(formatDuration(90_000, "full")).toBe("90 seconds (1.5 minutes)");
  });

  it("uses a singular unit label when the value is exactly one", () => {
    expect(formatDuration(86_400_000, "full")).toBe("86,400 seconds (1 day)");
    expect(formatDuration(3_600_000, "full")).toBe("3,600 seconds (1 hour)");
  });

  it("renders the same output regardless of detail level", () => {
    expect(formatDuration(14 * 86_400_000, "simple")).toBe(
      formatDuration(14 * 86_400_000, "full"),
    );
  });
});

describe("formatDateTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-15T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders an ISO string with relative time (full)", () => {
    expect(formatDateTime(new Date("2026-07-13T00:00:00Z"), "full")).toBe(
      "2026-07-13T00:00:00Z (2 days ago)",
    );
  });

  it("renders only the ISO string (simple)", () => {
    expect(formatDateTime(new Date("2026-07-13T00:00:00Z"), "simple")).toBe(
      "2026-07-13T00:00:00Z",
    );
  });
});

describe("getPropertyFormatter", () => {
  it("resolves known formatters", () => {
    expect(getPropertyFormatter("size")(1024, "simple")).toBe("1 KB");
    expect(getPropertyFormatter("timeToLive")(3_600_000, "full")).toBe(
      "3,600 seconds (1 hour)",
    );
  });

  it("falls back to a plain string formatter", () => {
    expect(getPropertyFormatter("unknown")(42, "full")).toBe("42");
    expect(getPropertyFormatter("correlationId")("corr-1", "full")).toBe(
      "corr-1",
    );
  });
});
