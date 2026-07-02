import { describe, expect, it, vi, afterEach } from "vitest";
import { getApiUrl, usesSameOriginApiProxy } from "./api";

describe("usesSameOriginApiProxy", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("detects /backend suffix in absolute URL", () => {
    vi.stubEnv(
      "NEXT_PUBLIC_API_URL",
      "https://soccer-analytics-web.vercel.app/backend",
    );
    expect(usesSameOriginApiProxy()).toBe(true);
  });

  it("detects relative /backend base", () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "/backend");
    expect(usesSameOriginApiProxy()).toBe(true);
  });

  it("returns false for direct API URL", () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://soccer-analytics-api.vercel.app");
    expect(usesSameOriginApiProxy()).toBe(false);
  });
});

describe("getApiUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses relative /backend in the browser for proxy mode", () => {
    vi.stubEnv(
      "NEXT_PUBLIC_API_URL",
      "https://wrong-host.example.com/backend",
    );
    vi.stubGlobal("window", { location: { origin: "https://real-host.example.com" } });
    expect(getApiUrl("/auth/me")).toBe("/backend/auth/me");
  });
});