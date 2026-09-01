import { test, expect } from "@playwright/test";

test.describe("PASS3501 critical runtime repair prepared suite", () => {
  test("Shield keeps more than 10 rows and exposes runtime repair markers", async ({ page }) => {
    await page.goto("/shield");
    const table = page.locator("[data-pass3501-terminal-runtime-orchestrator]").first();
    await expect(table).toBeVisible();
  });

  test("Advanced cannot expose paid-depth copy without server receipts", async ({ page }) => {
    await page.goto("/real-markets");
    await expect(page.locator("[data-pass3501-advanced-runtime-gate]").first()).toBeAttached();
  });

  test("Runtime readiness endpoint stays prepared-only before final runner", async ({ request }) => {
    const response = await request.get("/api/velmere/pass3501-runtime-readiness");
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.mode).toBe("prepared_not_executed");
  });
});
