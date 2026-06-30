import { expect, test } from "@playwright/test";

test.describe("smoke", () => {
  test("analytics dashboard loads summary KPIs", async ({ page }) => {
    await page.goto("/analytics");

    await expect(
      page.getByRole("heading", { name: "Analytics", exact: true }),
    ).toBeVisible();

    await expect(page.getByText("Unable to load data")).toHaveCount(0);
    await expect(page.getByText("Matches analyzed")).toBeVisible();

    const matchesCard = page
      .locator(".surface-card")
      .filter({ hasText: "Matches analyzed" });
    await expect(matchesCard.getByText("1", { exact: true })).toBeVisible({
      timeout: 30_000,
    });
  });

  test("compare page loads selection controls", async ({ page }) => {
    await page.goto("/analytics/compare");

    await expect(
      page.getByRole("heading", { name: "Compare", exact: true }),
    ).toBeVisible();

    await expect(page.getByText("Unable to load data")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Players" })).toBeVisible();
    await expect(
      page.getByText("Pick two different players to compare."),
    ).toBeVisible();
  });

  test("match detail renders fixture header and events", async ({ page }) => {
    await page.goto("/matches/1000");

    await expect(
      page.getByRole("heading", {
        name: "Barcelona vs Real Madrid",
        exact: true,
      }),
    ).toBeVisible({ timeout: 30_000 });

    await expect(page.getByText("Unable to load data")).toHaveCount(0);
    await expect(page.getByText("Match not found")).toHaveCount(0);
    await expect(page.getByText("Event timeline").first()).toBeVisible();
  });
});