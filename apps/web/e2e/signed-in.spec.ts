import { expect, test } from "@playwright/test";
import { e2eAuthStorageKey } from "../lib/e2e-auth";

test.describe("signed-in smoke", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((storageKey) => {
      window.localStorage.setItem(storageKey, "1");
    }, e2eAuthStorageKey());
  });

  test("settings loads bootstrapped workspace list", async ({ page }) => {
    await page.goto("/settings");

    await expect(
      page.getByRole("heading", { name: "Workspaces", exact: true }),
    ).toBeVisible({ timeout: 30_000 });

    await expect(page.getByText("Unable to load data")).toHaveCount(0);
    await expect(page.getByText("Setup required")).toHaveCount(0);

    const workspaceList = page.locator(
      'section[aria-labelledby="workspace-list-heading"]',
    );
    await expect(workspaceList.getByText("E2E Workspace")).toBeVisible({
      timeout: 30_000,
    });
    await expect(workspaceList.getByText("Active", { exact: true })).toBeVisible();
  });

  test("dashboard shows workspace summary without guest flash", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "Overview", exact: true }),
    ).toBeVisible({ timeout: 30_000 });

    await expect(page.getByText("Unable to load data")).toHaveCount(0);
    await expect(page.getByText("Soccer analytics for your workspace")).toBeVisible();
    await expect(page.getByLabel("Active workspace")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText("E2E Workspace")).toBeVisible();
  });
});