import { Box } from "@mui/material";

interface ResizeHandleProps {
  /** Current size (width or height) of the panel being resized, in px. */
  value: number;
  /** Minimum allowed size, in px. */
  min: number;
  /** Maximum allowed size, in px. */
  max: number;
  /**
   * When true, dragging towards the end (right / down) decreases the size —
   * used for panels anchored to the right or bottom edge.
   */
  invert?: boolean;
  /** Axis of the divider: "vertical" resizes width, "horizontal" resizes height. */
  orientation?: "vertical" | "horizontal";
  onChange: (value: number) => void;
  ariaLabel: string;
}

/**
 * A thin divider that can be dragged to resize an adjacent panel. While
 * dragging, listeners are attached to the window so tracking continues even
 * when the pointer moves beyond the handle. The new size is computed as
 * `startSize + totalDelta` from the drag origin (not incrementally), so
 * overshooting past the min/max must be reversed before the panel resizes
 * again.
 */
export default function ResizeHandle({
  value,
  min,
  max,
  invert = false,
  orientation = "vertical",
  onChange,
  ariaLabel,
}: ResizeHandleProps) {
  const horizontal = orientation === "horizontal";

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const start = horizontal ? event.clientY : event.clientX;
    const startValue = value;

    const handleMove = (moveEvent: PointerEvent) => {
      const position = horizontal ? moveEvent.clientY : moveEvent.clientX;
      const delta = (position - start) * (invert ? -1 : 1);
      const next = Math.min(Math.max(startValue + delta, min), max);
      onChange(next);
    };

    const cursor = horizontal ? "row-resize" : "col-resize";
    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      document.body.style.removeProperty("cursor");
      document.body.style.removeProperty("user-select");
    };

    document.body.style.cursor = cursor;
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  return (
    <Box
      role="separator"
      aria-orientation={horizontal ? "horizontal" : "vertical"}
      aria-label={ariaLabel}
      onPointerDown={handlePointerDown}
      sx={{
        flexShrink: 0,
        display: "flex",
        touchAction: "none",
        ...(horizontal
          ? {
              height: "9px",
              width: "100%",
              cursor: "row-resize",
              alignItems: "center",
              justifyContent: "stretch",
              flexDirection: "column",
              "&::before": {
                content: '""',
                height: "1px",
                width: "100%",
                bgcolor: "divider",
                transition: "background-color 0.15s, height 0.15s",
              },
              "&:hover::before, &:active::before": {
                height: "3px",
                bgcolor: "primary.main",
              },
            }
          : {
              width: "9px",
              cursor: "col-resize",
              justifyContent: "center",
              alignItems: "stretch",
              "&::before": {
                content: '""',
                width: "1px",
                bgcolor: "divider",
                transition: "background-color 0.15s, width 0.15s",
              },
              "&:hover::before, &:active::before": {
                width: "3px",
                bgcolor: "primary.main",
              },
            }),
      }}
    />
  );
}
