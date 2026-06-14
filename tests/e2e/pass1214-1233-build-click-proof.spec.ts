import { expect, test, type Locator, type Page } from "@playwright/test";

async function expectNoPageOverflow(page: Page) {
  const overflow = await page.evaluate(
    () =>
      Math.max(
        document.documentElement.scrollWidth,
        document.body.scrollWidth,
      ) - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(4);
}

async function expectSingleSurface(page: Page, selector: string) {
  const surface = page.locator(selector).last();
  await expect(surface).toBeVisible();
  const box = await surface.boundingBox();
  expect(box?.width ?? 0).toBeGreaterThan(96);
  expect(box?.height ?? 0).toBeGreaterThan(40);
  return surface;
}

async function closeWithEscape(page: Page, selector: string, trigger: Locator) {
  await page.keyboard.press("Escape");
  await expect(page.locator(selector)).toHaveCount(0);
  await expect(trigger).toBeFocused();
}

test("header dropdown arbitration works on desktop", async ({ page }) => {
  await page.goto("/pl", { waitUntil: "domcontentloaded" });
  await expectNoPageOverflow(page);

  const language = page.locator(
    '[data-velmere-overlay-trigger="header-language"]',
  );
  const wallet = page.locator('[data-velmere-overlay-trigger="header-wallet"]');
  const account = page.locator(
    '[data-velmere-overlay-trigger="header-account"]',
  );
  const cart = page.locator('[data-velmere-overlay-trigger="header-cart"]');

  await language.click();
  await expectSingleSurface(
    page,
    '[data-velmere-surface-id="velmere-header-language-menu"]',
  );

  await wallet.click();
  await expect(
    page.locator('[data-velmere-surface-id="velmere-header-language-menu"]'),
  ).toHaveCount(0);
  await expectSingleSurface(
    page,
    '[data-velmere-surface-id="velmere-header-wallet-menu"]',
  );

  await account.click();
  await expect(
    page.locator('[data-velmere-surface-id="velmere-header-wallet-menu"]'),
  ).toHaveCount(0);
  await expectSingleSurface(
    page,
    '[data-velmere-surface-id="velmere-header-account-menu"]',
  );
  await closeWithEscape(
    page,
    '[data-velmere-surface-id="velmere-header-account-menu"]',
    account,
  );

  await cart.click();
  await expect(
    page.locator('[data-velmere-surface-id="velmere-header-language-menu"]'),
  ).toHaveCount(0);
  await expect(
    page.locator('[data-velmere-surface-id="velmere-header-wallet-menu"]'),
  ).toHaveCount(0);
  await expect(
    page.locator('[data-velmere-surface-id="velmere-header-account-menu"]'),
  ).toHaveCount(0);
  await expect(page.locator("#velmere-cart-bottom-sheet")).toBeVisible();
});

test("mobile menu beats open dropdowns without corner drift", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/pl", { waitUntil: "domcontentloaded" });
  await expectNoPageOverflow(page);

  await page.locator('[data-velmere-overlay-trigger="header-wallet"]').click();
  const walletSurface = await expectSingleSurface(
    page,
    '[data-velmere-surface-id="velmere-header-wallet-menu"]',
  );
  const walletBox = await walletSurface.boundingBox();
  expect(walletBox?.x ?? -1).toBeGreaterThanOrEqual(8);
  expect((walletBox?.x ?? 0) + (walletBox?.width ?? 0)).toBeLessThanOrEqual(
    390,
  );

  await page.locator('[data-velmere-overlay-trigger="header-menu"]').click();
  await expect(
    page.locator('[data-velmere-surface-id="velmere-header-wallet-menu"]'),
  ).toHaveCount(0);
  await expect(page.locator("#velmere-main-menu-drawer")).toBeVisible();
  await expectNoPageOverflow(page);
});

test("Shield row opens unified modal and keyboard row activation is wired", async ({
  page,
}) => {
  await page.goto("/pl/market-integrity", { waitUntil: "domcontentloaded" });
  const row = page
    .locator('[data-testid="shield-row"], [data-testid="shield-row-mobile"]')
    .first();
  await expect(row).toBeVisible();
  await row.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.locator('[data-unified-asset-modal="shield"]'),
  ).toBeVisible();
  await expect(
    page.locator('[data-unified-asset-rect-chart="true"]'),
  ).toBeVisible();
  await expect(page.locator('[data-analysis-mode="basic"]')).toBeVisible();
  await expect(page.locator('[data-analysis-mode="pro"]')).toBeVisible();
  await expect(page.locator('[data-analysis-mode="advanced"]')).toBeVisible();
});

test("Real Markets row opens same unified modal contract", async ({ page }) => {
  await page.goto("/pl/market-integrity/cross-asset", {
    waitUntil: "domcontentloaded",
  });
  const row = page
    .locator(
      '[data-testid="realmarkets-row"], [data-testid="realmarkets-row-mobile"]',
    )
    .first();
  await expect(row).toBeVisible();
  await row.click();
  await expect(
    page.locator('[data-unified-asset-modal="real-markets"]'),
  ).toBeVisible();
  await expect(
    page.locator('[data-unified-asset-rect-chart="true"]'),
  ).toBeVisible();
  await expect(
    page.locator('[data-unified-asset-depth-rail="rectangular-attached"]'),
  ).toBeVisible();
});
