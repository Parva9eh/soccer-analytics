import { defineConfig, devices } from "@playwright/test";

// Dedicated ports so e2e does not collide with a developer's :3000/:8000 stack.
const apiPort = process.env.PLAYWRIGHT_API_PORT ?? "8765";
const webPort = process.env.PLAYWRIGHT_WEB_PORT ?? "3456";
const apiUrl = process.env.PLAYWRIGHT_API_URL ?? `http://127.0.0.1:${apiPort}`;
const webUrl = process.env.PLAYWRIGHT_WEB_URL ?? `http://127.0.0.1:${webPort}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  timeout: 60_000,
  use: {
    baseURL: webUrl,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: `cd ../api && E2E_API_PORT=${apiPort} uv run python scripts/e2e_server.py`,
      url: `${apiUrl}/health/`,
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: `pnpm exec next dev --port ${webPort}`,
      url: webUrl,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        // Same-origin proxy avoids CORS and flaky cross-port env in dev.
        NEXT_PUBLIC_API_URL: `${webUrl}/backend`,
        E2E_API_PROXY_TARGET: apiUrl,
        NEXT_PUBLIC_AUTH_ENABLED: "false",
      },
    },
  ],
});