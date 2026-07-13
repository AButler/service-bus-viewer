import { Box } from "@mui/material";

interface ResizeHandleProps {
  /** Current width of the panel being resized, in px. */
  value: number;
  /** Minimum allowed width, in px. */
  min: number;
  /** Maximum allowed width, in px. */
  max: number;
  /** When true, dragging right decreases the width (for a right-side panel). */
  invert?: boolean;
  onChange: (value: number) => void;
  ariaLabel: string;
}

/**
 * A thin vertical divider that can be dragged to resize an adjacent panel.
 * While dragging, listeners are attached to the window so tracking continues
 * even when the pointer moves beyond the handle. The new width is computed as
 * `startWidth + totalDelta` from the drag origin (not incrementally), so
 * overshooting past the min/max must be reversed before the panel resizes
 * again.
 */
export default function ResizeHandle({
  value,
  min,
  max,
  invert = false,
  onChange,
  ariaLabel,
}: ResizeHandleProps) {
  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startX = event.clientX;
    const startValue = value;

    const handleMove = (moveEvent: PointerEvent) => {
      const delta = (moveEvent.clientX - startX) * (invert ? -1 : 1);
      const next = Math.min(Math.max(startValue + delta, min), max);
      onChange(next);
    };

    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      document.body.style.removeProperty("cursor");
      document.body.style.removeProperty("user-select");
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  return (
    <Box
      role="separator"
      aria-orientation="vertical"
      aria-label={ariaLabel}
      onPointerDown={handlePointerDown}
      sx={{
        flexShrink: 0,
        width: "9px",
        cursor: "col-resize",
        display: "flex",
        justifyContent: "center",
        alignItems: "stretch",
        touchAction: "none",
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
      }}
    />
  );
}
