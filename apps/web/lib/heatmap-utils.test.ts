import { describe, expect, it } from "vitest";
import { buildHeatmapGrid } from "@/lib/heatmap-utils";

describe("buildHeatmapGrid", () => {
  it("bins positioned events and computes intensity", () => {
    const grid = buildHeatmapGrid([
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 110, y: 70 },
    ]);

    expect(grid.totalEvents).toBe(3);
    expect(grid.bins).toHaveLength(2);
    expect(grid.maxCount).toBe(2);
    expect(grid.bins.find((bin) => bin.count === 2)?.intensity).toBe(1);
  });

  it("ignores events without coordinates", () => {
    const grid = buildHeatmapGrid([{ x: null, y: 40 }, { x: 60, y: null }]);
    expect(grid.totalEvents).toBe(0);
    expect(grid.bins).toHaveLength(0);
  });
});