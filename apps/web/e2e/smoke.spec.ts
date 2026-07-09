import { test, expect } from "@playwright/test";

test.describe("Career OS smoke tests", () => {
  test("home page redirects to command center", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/career-command/);
  });

  test("command center page loads with key elements", async ({ page }) => {
    await page.goto("/career-command");
    await expect(page.locator("h1")).toContainText("Command Center");
    await expect(page.locator("text=Job-search command center")).toBeVisible();
  });

  test("navigation links are present", async ({ page }) => {
    await page.goto("/career-command");
    await expect(page.locator("text=Command Center")).toBeVisible();
    await expect(page.locator("text=Evidence")).toBeVisible();
    await expect(page.locator("text=Job Matches")).toBeVisible();
    await expect(page.locator("text=Applications")).toBeVisible();
  });

  test("api health check returns ok", async ({ request }) => {
    const response = await request.get("/api/healthz");
    expect(response.ok()).toBeTruthy();
  });
});
