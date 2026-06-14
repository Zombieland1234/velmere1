import { expect, test } from "@playwright/test";

const locales = ["pl", "de", "en"] as const;
const surfaces = [
  { id: "Browser", path: "search" },
  { id: "Shield", path: "market-integrity" },
  { id: "Real Markets", path: "market-integrity/cross-asset" },
  { id: "Shield Map", path: "market-integrity/shield-map" },
] as const;

async function assertViewportContract(page: import("@playwright/test").Page) {
  await expect(page.locator("body")).toBeVisible();
  const state = await page.evaluate(() => ({
    overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth,
    text: document.body.innerText.trim().length,
    focusable: document.querySelectorAll("button, a[href], input, select, textarea, [tabindex]:not([tabindex='-1'])").length,
    deviceScaleFactor: window.devicePixelRatio,
  }));
  expect(state.overflow).toBeLessThanOrEqual(4);
  expect(state.text).toBeGreaterThan(20);
  expect(state.focusable).toBeGreaterThan(0);
  expect(state.deviceScaleFactor).toBeGreaterThan(0);
}

test.describe("PASS640 PL/DE/EN desktop/mobile route matrix", () => {
  for (const locale of locales) {
    for (const surface of surfaces) {
      test(`${locale} · ${surface.id} · keyboard/touch viewport`, async ({ page, isMobile }) => {
        const pageErrors: string[] = [];
        page.on("pageerror", (error) => pageErrors.push(error.message));
        await page.goto(`/${locale}/${surface.path}`, { waitUntil: "domcontentloaded" });
        await assertViewportContract(page);
        await page.keyboard.press("Tab");
        await expect(page.locator(":focus")).toBeVisible();
        if (isMobile) {
          const firstControl = page.locator("button:visible, a:visible").first();
          if (await firstControl.count()) await firstControl.tap({ trial: true });
        }
        expect(pageErrors, pageErrors.join("\n")).toEqual([]);
      });
    }
  }

  test("200% zoom keeps Shield Map contained", async ({ page }) => {
    await page.goto("/pl/market-integrity/shield-map", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => { document.documentElement.style.zoom = "200%"; });
    await assertViewportContract(page);
  });

  test("reducedMotion and forcedColors preserve usable controls", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce", forcedColors: "active", colorScheme: "dark" });
    await page.goto("/en/market-integrity", { waitUntil: "domcontentloaded" });
    await assertViewportContract(page);
    const firstControl = page.locator("button:visible, a:visible").first();
    await firstControl.focus();
    await expect(firstControl).toBeFocused();
  });

  test("touch contract is explicit on the map surface", async ({ page, isMobile }) => {
    test.skip(!isMobile, "touch-only contract");
    await page.goto("/de/market-integrity/shield-map", { waitUntil: "domcontentloaded" });
    const surface = page.locator("[data-pass522-mobile-gesture-qa]").first();
    await expect(surface).toBeVisible();
    const touch = await surface.evaluate((node) => getComputedStyle(node).touchAction);
    expect(touch).not.toBe("auto");
  });
});
