import { describe, expect, it, vi, afterEach } from "vitest";
import { getApiProxyTarget } from "./api-proxy";

describe("getApiProxyTarget", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("prefers API_PROXY_TARGET", () => {
    vi.stubEnv("API_PROXY_TARGET", "https://api.example.com/");
    vi.stubEnv("E2E_API_PROXY_TARGET", "http://127.0.0.1:8765");
    expect(getApiProxyTarget()).toBe("https://api.example.com");
  });

  it("falls back to E2E_API_PROXY_TARGET", () => {
    vi.stubEnv("API_PROXY_TARGET", "");
    vi.stubEnv("E2E_API_PROXY_TARGET", "http://127.0.0.1:8765/");
    expect(getApiProxyTarget()).toBe("http://127.0.0.1:8765");
  });

  it("returns null when unset", () => {
    vi.stubEnv("API_PROXY_TARGET", "");
    vi.stubEnv("E2E_API_PROXY_TARGET", "");
    expect(getApiProxyTarget()).toBeNull();
  });
});