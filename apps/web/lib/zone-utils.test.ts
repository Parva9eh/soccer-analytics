import { describe, expect, it } from "vitest";
import { buildZoneComparison, pitchZoneFromX } from "@/lib/zone-utils";

describe("pitchZoneFromX", () => {
  it("maps StatsBomb x coordinates to pitch thirds", () => {
    expect(pitchZoneFromX(20)).toBe("left_third");
    expect(pitchZoneFromX(60)).toBe("middle_third");
    expect(pitchZoneFromX(95)).toBe("right_third");
    expect(pitchZoneFromX(null)).toBeNull();
  });
});

describe("buildZoneComparison", () => {
  it("counts home and away events per zone", () => {
    const teamForEvent = (details: unknown) => {
      if (!details || typeof details !== "object" || Array.isArray(details)) {
        return null;
      }
      const team = (details as Record<string, unknown>).team;
      if (!team || typeof team !== "object" || Array.isArray(team)) {
        return null;
      }
      const name = (team as Record<string, unknown>).name;
      return typeof name === "string" ? name : null;
    };

    const zones = buildZoneComparison(
      [
        { x: 15, details: { team: { name: "Home" } } },
        { x: 55, details: { team: { name: "Home" } } },
        { x: 90, details: { team: { name: "Away" } } },
      ],
      "Home",
      "Away",
      teamForEvent,
    );

    expect(zones.find((zone) => zone.zone === "left_third")?.home).toBe(1);
    expect(zones.find((zone) => zone.zone === "middle_third")?.home).toBe(1);
    expect(zones.find((zone) => zone.zone === "right_third")?.away).toBe(1);
  });
});