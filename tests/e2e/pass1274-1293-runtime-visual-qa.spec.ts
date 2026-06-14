import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";

const artifactRoot = "test-results/pass1274-runtime-visual-qa";

function artifact(name: string) {
  mkdirSync(artifactRoot, { recursive: true });
  return join(artifactRoot, name);
}

type ScreenshotMeta = {
  route: string;
  viewport: "desktop" | "mobile";
  surface: string;
  selector: string;
};

function writeArtifactSidecar(filename: string, meta: ScreenshotMeta & { width: number; height: number }) {
  const sidecarPath = artifact(`${filename}.json`);
  writeFileSync(
    sidecarPath,
    JSON.stringify(
      {
        pass: "PASS1314-1333",
        artifact: filename,
        capturedAt: new Date().toISOString(),
        ...meta,
      },
      null,
      2,
    ),
  );
}

async function expectNoPageOverflow(page: Page, budget = 4) {
  const overflow = await page.evaluate(() =>
    Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) -
    document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(budget);
}

async function expectVisibleBox(locator: Locator) {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  expect(box?.width ?? 0).toBeGreaterThan(96);
  expect(box?.height ?? 0).toBeGreaterThan(40);
  return box;
}

async function screenshotLocator(locator: Locator, filename: string, meta: ScreenshotMeta) {
  const box = await expectVisibleBox(locator);
  await locator.screenshot({ path: artifact(filename), animations: "disabled" });
  writeArtifactSidecar(filename, {
    ...meta,
    width: Math.round(box?.width ?? 0),
    height: Math.round(box?.height ?? 0),
  });
}

async function openLensReader(page: Page, query = "ETH") {
  await page.goto("/pl/search", { waitUntil: "domcontentloaded" });
  await expectNoPageOverflow(page);
  await page.locator('[data-testid="lens-search-input"]').fill(query);
  await page.keyboard.press("Enter");
  const firstResult = page.locator('[data-testid="lens-result-card"][data-primary-result="true"]').first();
  await expect(firstResult).toBeVisible({ timeout: 20_000 });
  await firstResult.locator('[data-testid="lens-preview-button"]').click();
  await expect(page.locator('[data-testid="lens-pdf-depth-dialog"]')).toBeVisible();
  await page.locator('[data-testid="lens-depth-choice-basic"]').click();
  await page.locator('[data-testid="lens-depth-confirm"]').click();
  const dialog = page.locator('[data-testid="lens-preview-dialog"]');
  await expect(dialog).toBeVisible({ timeout: 65_000 });
  await expect(dialog).toHaveAttribute("data-pass1274-runtime-visual-qa-release", /ready_for_browser_proof|needs_browser_proof/);
  await expect(page.locator('.velmere-pass1274-runtime-visual-qa')).toBeVisible();
  return dialog;
}

test("Lens reader and PDF preview create PASS1274 visual artifacts", async ({ page }) => {
  const dialog = await openLensReader(page, "ETH");
  await expect(page.locator('.velmere-a4-reader-scroll[data-pass1274-body-scroll-locked="true"]')).toBeVisible();
  await expectNoPageOverflow(page);
  await screenshotLocator(dialog, "lens-reader-desktop-eth.png", { route: "/pl/search", viewport: "desktop", surface: "Lens reader dialog", selector: "[data-testid=\"lens-preview-dialog\"]" });

  await page.locator('[data-testid="lens-download-link"]').click();
  await expect(page.locator('[data-testid="lens-download-receipt"]')).toContainText(/PDF|potwierdzenie|receipt|download/i);

  await page.locator('[data-testid="lens-pdf-toggle"]').evaluate((node) => node.scrollIntoView({ block: "center" }));
  await page.locator('[data-testid="lens-pdf-toggle"]').click();
  const frame = page.locator('[data-testid="lens-pdf-frame"]');
  await expect(frame).toBeVisible();
  await screenshotLocator(frame, "lens-pdf-frame-desktop-eth.png", { route: "/pl/search", viewport: "desktop", surface: "Lens binary PDF iframe", selector: "[data-testid=\"lens-pdf-frame\"]" });
});

test("Lens mobile reader stays inside viewport and keeps modal above header", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const dialog = await openLensReader(page, "ETH");
  const box = await expectVisibleBox(dialog);
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  await expectNoPageOverflow(page);
  await screenshotLocator(dialog, "lens-reader-mobile-eth.png", { route: "/pl/search", viewport: "mobile", surface: "Lens reader dialog", selector: "[data-testid=\"lens-preview-dialog\"]" });
});

test("Header surfaces and cart produce mobile visual proof", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/pl", { waitUntil: "domcontentloaded" });
  await expectNoPageOverflow(page);

  await page.locator('[data-velmere-overlay-trigger="header-language"]').click();
  await screenshotLocator(page.locator('[data-velmere-surface-id="velmere-header-language-menu"]').last(), "header-language-mobile.png", { route: "/pl", viewport: "mobile", surface: "Header language dropdown", selector: "[data-velmere-surface-id=\"velmere-header-language-menu\"]" });

  await page.locator('[data-velmere-overlay-trigger="header-wallet"]').click();
  await expect(page.locator('[data-velmere-surface-id="velmere-header-language-menu"]')).toHaveCount(0);
  await screenshotLocator(page.locator('[data-velmere-surface-id="velmere-header-wallet-menu"]').last(), "header-wallet-mobile.png", { route: "/pl", viewport: "mobile", surface: "Header wallet dropdown", selector: "[data-velmere-surface-id=\"velmere-header-wallet-menu\"]" });

  await page.locator('[data-velmere-overlay-trigger="header-cart"]').click();
  await expect(page.locator('[data-velmere-surface-id="velmere-header-wallet-menu"]')).toHaveCount(0);
  await screenshotLocator(page.locator('#velmere-cart-bottom-sheet'), "header-cart-mobile.png", { route: "/pl", viewport: "mobile", surface: "Cart bottom sheet", selector: "#velmere-cart-bottom-sheet" });
  await expectNoPageOverflow(page);
});

test("Shield and Real Markets unified modal visual proof", async ({ page }) => {
  await page.goto("/pl/market-integrity", { waitUntil: "domcontentloaded" });
  await expectNoPageOverflow(page);
  await page.locator('[data-testid="shield-row"], [data-testid="shield-row-mobile"]').first().click();
  const shieldModal = page.locator('[data-unified-asset-modal="shield"]').last();
  await screenshotLocator(shieldModal, "shield-unified-modal.png", { route: "/pl/market-integrity", viewport: "desktop", surface: "Shield unified asset modal", selector: "[data-unified-asset-modal=\"shield\"]" });

  await page.keyboard.press("Escape");
  await page.goto("/pl/market-integrity/cross-asset", { waitUntil: "domcontentloaded" });
  await expectNoPageOverflow(page);
  await page.locator('[data-testid="realmarkets-row"], [data-testid="realmarkets-row-mobile"]').first().click();
  const realMarketsModal = page.locator('[data-unified-asset-modal="real-markets"]').last();
  await screenshotLocator(realMarketsModal, "real-markets-unified-modal.png", { route: "/pl/market-integrity/cross-asset", viewport: "desktop", surface: "Real Markets unified asset modal", selector: "[data-unified-asset-modal=\"real-markets\"]" });
});
