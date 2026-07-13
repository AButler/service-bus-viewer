import type { PropertyFormatter } from "./types";

/** Render a millisecond duration as "X seconds" or "X seconds (Y days/...)". */
export const formatDuration: PropertyFormatter = (value) => {
  const totalSeconds = Math.floor((value as number) / 1000);
  const withSeparators = totalSeconds.toLocaleString();
  if (totalSeconds < 60) {
    return `${withSeparators} seconds`;
  }
  const units: [string, number][] = [
    ["days", 86400],
    ["hours", 3600],
    ["minutes", 60],
  ];
  const [unit, factor] = units.find(([, f]) => totalSeconds >= f)!;
  const rounded = (totalSeconds / factor).toFixed(2).replace(/\.?0+$/, "");
  const label = rounded === "1" ? unit.replace(/s$/, "") : unit;
  return `${withSeparators} seconds (${rounded} ${label})`;
};
