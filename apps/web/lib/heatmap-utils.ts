import { PITCH_LENGTH_U, PITCH_WIDTH_U } from "@/components/pitch/constants";

export const HEATMAP_COLS = 12;
export const HEATMAP_ROWS = 8;

export interface HeatmapBin {
  col: number;
  row: number;
  count: number;
  intensity: number;
}

export interface HeatmapGrid {
  bins: HeatmapBin[];
  cols: number;
  rows: number;
  maxCount: number;
  totalEvents: number;
}

export function buildHeatmapGrid(
  events: { x: number | null; y: number | null }[],
  cols = HEATMAP_COLS,
  rows = HEATMAP_ROWS,
): HeatmapGrid {
  const counts = Array.from({ length: cols * rows }, () => 0);

  for (const event of events) {
    if (event.x == null || event.y == null) {
      continue;
    }
    const col = Math.min(
      cols - 1,
      Math.max(0, Math.floor((event.x / PITCH_LENGTH_U) * cols)),
    );
    const row = Math.min(
      rows - 1,
      Math.max(0, Math.floor((event.y / PITCH_WIDTH_U) * rows)),
    );
    counts[row * cols + col] += 1;
  }

  const maxCount = Math.max(...counts, 1);
  const bins: HeatmapBin[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const count = counts[row * cols + col];
      if (count === 0) {
        continue;
      }
      bins.push({
        col,
        row,
        count,
        intensity: count / maxCount,
      });
    }
  }

  return {
    bins,
    cols,
    rows,
    maxCount,
    totalEvents: counts.reduce((sum, value) => sum + value, 0),
  };
}