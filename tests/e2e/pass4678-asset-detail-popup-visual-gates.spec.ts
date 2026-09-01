import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";

async function clickFirstVisible(candidates: Locator[]) {
  for (const candidate of candidates) {
    if (await candidate.isVisible().catch(() => false)) {
      await candidate.click();
      return;
    }
  }
  throw new Error("No visible asset row/card was available to open the popup");
}

async function assertPopupGeometry(page: Page, modal: Locator, testInfo: TestInfo, surface: string) {
  await expect(modal).toBeVisible();
  const viewport = page.viewportSize();
  const box = await modal.boundingBox();
  expect(viewport).not.toBeNull();
  expect(box).not.toBeNull();
  if (!viewport || !box) return;

  expect(box.width).toBeGreaterThan(Math.min(320, viewport.width * 0.72));
  expect(box.height).toBeGreaterThan(Math.min(420, viewport.height * 0.68));
  expect(box.width).toBeLessThanOrEqual(viewport.width + 2);
  expect(box.height).toBeLessThanOrEqual(viewport.height + 2);

  const overflow = await modal.evaluate((node) => ({
    horizontal: node.scrollWidth - node.clientWidth,
    vertical: node.scrollHeight - node.clientHeight,
  }));
  expect(overflow.horizontal).toBeLessThanOrEqual(2);
  expect(overflow.vertical).toBeGreaterThanOrEqual(0);

  const bodyOverflow = await page.evaluate(() => getComputedStyle(document.body).overflow);
  expect(["hidden", "clip"]).toContain(bodyOverflow);

  await modal.screenshot({
    path: testInfo.outputPath(`${surface}-${testInfo.project.name}.png`),
    animations: "disabled",
  });
}

test.describe("PASS4678 asset popup visual geometry gates", () => {
  test("Shield popup keeps centered geometry, owned scroll and screenshot proof", async ({ page }, testInfo) => {
    await page.goto(`${baseURL}/en/shield`, { waitUntil: "domcontentloaded" });
    await clickFirstVisible([
      page.locator("tbody tr[role='button']").first(),
      page.locator("[data-pass4468-mobile-row-click-target='shield-asset-modal']").first(),
    ]);
    const modal = page.locator("[data-pass4678-screenshot-gate='shield-realmarkets-popup-geometry']");
    await assertPopupGeometry(page, modal, testInfo, "shield-popup");
    await page.keyboard.press("Escape");
    await expect(modal).toBeHidden();
  });

  test("Real Markets popup keeps centered geometry, owned scroll and screenshot proof", async ({ page }, testInfo) => {
    await page.goto(`${baseURL}/en/real-markets`, { waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-pass2892-playwright-realmarkets-target]")).toBeVisible();
    await clickFirstVisible([
      page.locator("tbody tr[role='button']").first(),
      page.locator("[data-testid='realmarkets-row-mobile']").first(),
    ]);
    const modal = page.locator("[data-pass4678-screenshot-gate='shield-realmarkets-popup-geometry']");
    await assertPopupGeometry(page, modal, testInfo, "real-markets-popup");
    await page.keyboard.press("Escape");
    await expect(modal).toBeHidden();
  });

  test("Shield Pro popup keeps monochrome geometry and screenshot proof", async ({ page }, testInfo) => {
    await page.goto(`${baseURL}/en/shield-pro`, { waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-pass4608-shield-pro]")).toBeVisible();
    await clickFirstVisible([page.locator("tbody tr").first()]);
    const modal = page.locator("[data-pass4678-screenshot-gate='shield-pro-popup-geometry']");
    await assertPopupGeometry(page, modal, testInfo, "shield-pro-popup");
    await page.keyboard.press("Escape");
    await expect(modal).toBeHidden();
  });
});
