import { expect, test } from "@playwright/test";

const criticalRoutes = [
  "/pl/market-integrity",
  "/pl/market-integrity/cross-asset",
  "/pl/market-integrity/shield-map",
] as const;

test.describe("PASS536 mobile gesture and viewport contract", () => {
  for (const route of criticalRoutes) {
    test(`${route} has no page-level horizontal overflow`, async ({ page }) => {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await expect(page.locator("body")).toBeVisible();
      const overflow = await page.evaluate(() => {
        const root = document.documentElement;
        const body = document.body;
        return Math.max(root.scrollWidth, body.scrollWidth) - root.clientWidth;
      });
      expect(overflow).toBeLessThanOrEqual(3);
    });
  }

  test("Shield Map owns touch gestures and contains scroll chaining", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "Mobile-only gesture contract");
    await page.goto("/pl/market-integrity/shield-map", {
      waitUntil: "domcontentloaded",
    });
    const shield = page.locator("[data-pass522-mobile-gesture-qa]").first();
    await expect(shield).toBeVisible();
    const contract = await shield.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        touchAction: style.touchAction,
        overscrollBehavior: style.overscrollBehavior,
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
      };
    });
    expect(contract.touchAction).not.toBe("auto");
    expect(["contain", "none", "contain auto", "auto contain"]).toContain(
      contract.overscrollBehavior,
    );
    expect(contract.scrollWidth - contract.clientWidth).toBeLessThanOrEqual(3);
  });

  test("interactive controls keep a usable mobile target", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "Mobile-only target audit");
    await page.goto("/pl/market-integrity/shield-map", {
      waitUntil: "domcontentloaded",
    });
    const visibleControls = page.locator("button:visible, a:visible");
    const count = Math.min(await visibleControls.count(), 60);
    const undersized: Array<{ label: string; width: number; height: number }> =
      [];
    for (let index = 0; index < count; index += 1) {
      const control = visibleControls.nth(index);
      const box = await control.boundingBox();
      if (!box) continue;
      const label =
        (await control.getAttribute("aria-label")) ||
        (await control.innerText()).trim().slice(0, 60);
      if ((box.width < 40 || box.height < 40) && label)
        undersized.push({ label, width: box.width, height: box.height });
    }
    expect(undersized, JSON.stringify(undersized, null, 2)).toEqual([]);
  });
  test("PASS538–542 premium surface markers are exposed", async ({ page }) => {
    await page.goto("/pl/market-integrity/shield-map", {
      waitUntil: "domcontentloaded",
    });
    await expect(page.locator("[data-pass541-shield-focus-lens]").first()).toBeVisible();
    await expect(page.locator("[data-pass542-motion-control]").first()).toBeVisible();
    const motionToggle = page.locator("[data-pass542-motion-toggle]").first();
    await expect(motionToggle).toBeVisible();
    await expect(motionToggle).toHaveAttribute("aria-pressed", /true|false/);
  });

  test("PASS545–549 explainability surfaces are exposed", async ({ page }) => {
    await page.goto("/pl/market-integrity/shield-map", {
      waitUntil: "domcontentloaded",
    });
    await expect(page.locator("[data-pass548-shield-temporal-replay]").first()).toBeVisible();
    await expect(page.locator("[data-pass549-interaction-budget]").first()).toBeVisible();
  });

});
