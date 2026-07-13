import { describe, it, expect } from "vitest";
import { getBodyRenderer } from "./index";
import JsonBodyRenderer from "./JsonBodyRenderer";
import PlainTextBodyRenderer from "./PlainTextBodyRenderer";

describe("getBodyRenderer", () => {
  it("returns the JSON renderer for application/json", () => {
    expect(getBodyRenderer("application/json")).toBe(JsonBodyRenderer);
  });

  it("ignores content-type parameters", () => {
    expect(getBodyRenderer("application/json; charset=utf-8")).toBe(
      JsonBodyRenderer,
    );
  });

  it("treats structured +json suffixes as JSON", () => {
    expect(getBodyRenderer("application/vnd.acme.order+json")).toBe(
      JsonBodyRenderer,
    );
  });

  it("falls back to plain text for other and missing types", () => {
    expect(getBodyRenderer("text/plain")).toBe(PlainTextBodyRenderer);
    expect(getBodyRenderer(undefined)).toBe(PlainTextBodyRenderer);
  });
});
