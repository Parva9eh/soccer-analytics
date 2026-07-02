import { describe, expect, it } from "vitest";
import { queryAwaitingData } from "@/lib/query-loading";

describe("queryAwaitingData", () => {
  it("returns true when scope is not ready", () => {
    expect(
      queryAwaitingData(false, {
        isPending: false,
        isFetching: false,
        data: { ok: true },
      }),
    ).toBe(true);
  });

  it("returns true while pending without data", () => {
    expect(
      queryAwaitingData(true, {
        isPending: true,
        isFetching: true,
        data: undefined,
      }),
    ).toBe(true);
  });

  it("returns false when settled data exists", () => {
    expect(
      queryAwaitingData(true, {
        isPending: false,
        isFetching: false,
        data: { total_matches: 3 },
      }),
    ).toBe(false);
  });

  it("returns false during background refetch when data is present", () => {
    expect(
      queryAwaitingData(true, {
        isPending: false,
        isFetching: true,
        data: { total_matches: 3 },
      }),
    ).toBe(false);
  });
});