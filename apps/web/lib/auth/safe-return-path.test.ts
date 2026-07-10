import { describe, expect, it } from "vitest";
import { safeReturnPath, safeReturnUrl } from "./safe-return-path";

describe("safeReturnPath", () => {
  it("allows relative app paths", () => {
    expect(safeReturnPath("/")).toBe("/");
    expect(safeReturnPath("/settings")).toBe("/settings");
    expect(safeReturnPath("/invitations/accept?token=abc")).toBe(
      "/invitations/accept?token=abc",
    );
  });

  it("rejects absolute and scheme-relative URLs", () => {
    expect(safeReturnPath("https://evil.example")).toBe("/");
    expect(safeReturnPath("http://evil.example/phish")).toBe("/");
    expect(safeReturnPath("//evil.example")).toBe("/");
    expect(safeReturnPath("https://evil.example", "/matches")).toBe("/matches");
  });

  it("rejects missing scheme tricks", () => {
    expect(safeReturnPath("javascript:alert(1)")).toBe("/");
    expect(safeReturnPath("\\\\evil.example")).toBe("/");
  });

  it("prefixes bare paths without leading slash as fallback", () => {
    expect(safeReturnPath("settings")).toBe("/");
  });
});

describe("safeReturnUrl", () => {
  it("builds same-origin absolute URLs", () => {
    expect(safeReturnUrl("/settings", "https://app.example")).toBe(
      "https://app.example/settings",
    );
    expect(safeReturnUrl("https://evil.example", "https://app.example")).toBe(
      "https://app.example/",
    );
  });
});
