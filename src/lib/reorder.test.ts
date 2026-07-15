import { describe, expect, it } from "vitest";
import { reorderList } from "./reorder";

describe("reorderList", () => {
  it("moves an item down (placed after the target)", () => {
    expect(reorderList(["a", "b", "c", "d"], "a", "c")).toEqual([
      "b",
      "c",
      "a",
      "d",
    ]);
  });

  it("moves an item up (placed before the target)", () => {
    expect(reorderList(["a", "b", "c", "d"], "d", "b")).toEqual([
      "a",
      "d",
      "b",
      "c",
    ]);
  });

  it("moves to the very start and end", () => {
    expect(reorderList(["a", "b", "c"], "b", "a")).toEqual(["b", "a", "c"]);
    expect(reorderList(["a", "b", "c"], "b", "c")).toEqual(["a", "c", "b"]);
  });

  it("returns the original array when the item or target is missing or equal", () => {
    const list = ["a", "b", "c"];
    expect(reorderList(list, "a", "a")).toBe(list);
    expect(reorderList(list, "x", "b")).toBe(list);
    expect(reorderList(list, "a", "x")).toBe(list);
  });
});
