import { describe, expect, it } from "vitest";
import {
  normalizeRadarValue,
  positionGroup,
  radarAxesForPosition,
} from "@/lib/radar-utils";

describe("positionGroup", () => {
  it("classifies common positions", () => {
    expect(positionGroup("Centre Forward")).toBe("forward");
    expect(positionGroup("Left Back")).toBe("defender");
    expect(positionGroup("Central Midfield")).toBe("midfielder");
    expect(positionGroup("Goalkeeper")).toBe("goalkeeper");
    expect(positionGroup(null)).toBe("default");
  });
});

describe("radarAxesForPosition", () => {
  it("uses higher attacking caps for forwards", () => {
    const forwardAxes = radarAxesForPosition("Centre Forward");
    const defenderAxes = radarAxesForPosition("Left Back");
    const goalsForward = forwardAxes.find((axis) => axis.key === "goals");
    const goalsDefender = defenderAxes.find((axis) => axis.key === "goals");
    expect(goalsForward?.max).toBeGreaterThan(goalsDefender?.max ?? 0);
  });
});

describe("normalizeRadarValue", () => {
  it("caps normalized values at 1", () => {
    expect(normalizeRadarValue(30, 20)).toBe(1);
    expect(normalizeRadarValue(5, 20)).toBe(0.25);
  });
});