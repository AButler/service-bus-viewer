import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { formatBytes } from "./bytesFormatter";
import { formatDuration } from "./durationFormatter";
import { formatDateTime } from "./dateTimeFormatter";
import { getPropertyFormatter } from "./index";

describe("formatBytes", () => {
  const text = (node: ReturnType<typeof formatBytes>) =>
    render(node as ReactElement).container.textContent;

  it("renders raw bytes below 1 KB (both details)", () => {
    expect(formatBytes(500, "full")).toBe("500 bytes");
    expect(formatBytes(500, "simple")).toBe("500 bytes");
  });

  it("renders the human size with raw bytes in a muted parenthetical (full)", () => {
    expect(text(formatBytes(1024, "full"))).toBe("1 KB (1,024 bytes)");
    expect(text(formatBytes(1536, "full"))).toBe("1.5 KB (1,536 bytes)");
    expect(text(formatBytes(1572864, "full"))).toBe("1.5 MB (1,572,864 bytes)");
  });

  it("renders only the largest unit (simple)", () => {
    expect(formatBytes(1024, "simple")).toBe("1 KB");
    expect(formatBytes(1536, "simple")).toBe("1.5 KB");
    expect(formatBytes(1572864, "simple")).toBe("1.5 MB");
  });
});

describe("formatDuration", () => {
  const text = (node: ReturnType<typeof formatDuration>) =>
    render(node as ReactElement).container.textContent;

  it("renders sub-minute durations as seconds", () => {
    expect(formatDuration(30_000, "full")).toBe("30 seconds");
  });

  it("renders the largest unit with raw seconds in a muted parenthetical (full)", () => {
    expect(text(formatDuration(14 * 86_400_000, "full"))).toBe(
      "14 days (1,209,600 seconds)",
    );
    expect(text(formatDuration(90_000, "full"))).toBe(
      "1.5 minutes (90 seconds)",
    );
  });

  it("uses a singular unit label when the value is exactly one", () => {
    expect(text(formatDuration(86_400_000, "full"))).toBe(
      "1 day (86,400 seconds)",
    );
    expect(text(formatDuration(3_600_000, "full"))).toBe(
      "1 hour (3,600 seconds)",
    );
  });

  it("renders only the human-readable unit (simple)", () => {
    expect(formatDuration(14 * 86_400_000, "simple")).toBe("14 days");
    expect(formatDuration(90_000, "simple")).toBe("1.5 minutes");
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

  it("renders an ISO string with a muted relative suffix (full)", () => {
    const { container } = render(
      formatDateTime(new Date("2026-07-13T00:00:00Z"), "full") as ReactElement,
    );
    expect(container.textContent).toBe("2026-07-13T00:00:00.000Z (2 days ago)");
    // The relative time is rendered in its own (muted) span.
    const spans = container.querySelectorAll("span");
    expect(spans[spans.length - 1].textContent).toBe("(2 days ago)");
  });

  it("renders the ISO string with milliseconds (simple)", () => {
    const { container } = render(
      formatDateTime(
        new Date("2026-07-13T00:00:00Z"),
        "simple",
      ) as ReactElement,
    );
    expect(container.textContent).toBe("2026-07-13T00:00:00.000Z");
    // Punctuation (e.g. the "T" separator) is rendered in its own span.
    const spanTexts = Array.from(container.querySelectorAll("span")).map(
      (s) => s.textContent,
    );
    expect(spanTexts).toContain("T");
  });
});

describe("getPropertyFormatter", () => {
  it("resolves known formatters", () => {
    expect(getPropertyFormatter("size")(1024, "simple")).toBe("1 KB");
    const { container } = render(
      getPropertyFormatter("timeToLive")(3_600_000, "full") as ReactElement,
    );
    expect(container.textContent).toBe("1 hour (3,600 seconds)");
  });

  it("falls back to a plain string formatter", () => {
    expect(getPropertyFormatter("unknown")(42, "full")).toBe("42");
    expect(getPropertyFormatter("correlationId")("corr-1", "full")).toBe(
      "corr-1",
    );
  });
});
