import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CopyButton from "./CopyButton";

const copyText = vi.hoisted(() => vi.fn());
vi.mock("../../lib/clipboard", () => ({ copyText }));

describe("CopyButton", () => {
  it("copies the value when clicked", async () => {
    const user = userEvent.setup();
    render(<CopyButton value="ORD-1" label="Copy Order" hovered />);

    await user.click(screen.getByRole("button", { name: "Copy Order" }));

    expect(copyText).toHaveBeenCalledWith("ORD-1");
  });
});
