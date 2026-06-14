import { expect, test, type Locator, type Page } from "@playwright/test";

async function expectNoPageOverflow(page: Page, budget = 4) {
  const overflow = await page.evaluate(
    () =>
      Math.max(
        document.documentElement.scrollWidth,
        document.body.scrollWidth,
      ) - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(budget);
}

async function expectVisibleSurface(locator: Locator) {
  await expect(locator).toBeVisible({ timeout: 12_000 });
  const box = await locator.boundingBox();
  expect(box?.width ?? 0).toBeGreaterThan(96);
  expect(box?.height ?? 0).toBeGreaterThan(40);
  return box;
}

test("cart opens from pointer, click, keyboard and exposes runtime debug", async ({
  page,
}) => {
  await page.goto("/pl", { waitUntil: "domcontentloaded" });
  await expectNoPageOverflow(page);

  const cartTrigger = page.getByTestId("velmere-header-cart-trigger");
  await expect(cartTrigger).toBeVisible();
  await cartTrigger.click();
  const cart = page.getByTestId("velmere-cart-bottom-sheet");
  await expectVisibleSurface(cart);
  await expect(cart).toHaveAttribute(
    "data-pass1934-cart",
    "runtime-click-proof-visible",
  );
  await expect(page.getByTestId("velmere-cart-empty-state")).toBeVisible();
  const debug = await page.evaluate(() => (window as any).__velmereCartRuntime);
  expect(debug?.pass1934).toBe("click-proof-runtime-debug");
  expect(String(debug?.runtimeOpenSource ?? "")).toMatch(
    /cart|openCart|click|pointer/i,
  );

  await page.keyboard.press("Escape");
  await cartTrigger.focus();
  await page.keyboard.press("Enter");
  await expectVisibleSurface(cart);
});

test("header dropdowns stay anchored and exclusive on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/pl", { waitUntil: "domcontentloaded" });
  await expectNoPageOverflow(page);

  await page.getByTestId("velmere-header-language-trigger").click();
  const language = page
    .locator('[data-velmere-surface-id="velmere-header-language-menu"]')
    .last();
  const languageBox = await expectVisibleSurface(language);
  expect(languageBox.x).toBeGreaterThanOrEqual(8);
  expect(languageBox.x + languageBox.width).toBeLessThanOrEqual(390);

  await page.getByTestId("velmere-header-wallet-trigger").click();
  await expect(
    page.locator('[data-velmere-surface-id="velmere-header-language-menu"]'),
  ).toHaveCount(0);
  const wallet = page
    .locator('[data-velmere-surface-id="velmere-header-wallet-menu"]')
    .last();
  const walletBox = await expectVisibleSurface(wallet);
  expect(walletBox.x).toBeGreaterThanOrEqual(8);
  expect(walletBox.x + walletBox.width).toBeLessThanOrEqual(390);

  await page.getByTestId("velmere-header-account-trigger").click();
  await expect(
    page.locator('[data-velmere-surface-id="velmere-header-wallet-menu"]'),
  ).toHaveCount(0);
  await expectVisibleSurface(
    page
      .locator('[data-velmere-surface-id="velmere-header-account-menu"]')
      .last(),
  );
});

test("Shield and Real Markets use rectangular modal, not bubble/circular overlay", async ({
  page,
}) => {
  await page.goto("/pl/market-integrity", { waitUntil: "domcontentloaded" });
  await page
    .locator('[data-testid="shield-row"], [data-testid="shield-row-mobile"]')
    .first()
    .click();
  const shieldModal = page
    .locator('[data-unified-asset-modal="shield"]')
    .last();
  await expectVisibleSurface(shieldModal);
  await expect(
    shieldModal.locator('[data-unified-asset-rect-chart="true"]'),
  ).toBeVisible();
  await expect(
    shieldModal.locator(
      '[data-unified-asset-depth-rail="rectangular-attached"]',
    ),
  ).toBeVisible();
  await expect(
    shieldModal.locator('[data-unified-asset-circular-chart="true"]'),
  ).toHaveCount(0);
  await expect(
    shieldModal.locator('[data-unified-asset-bubble-rail="true"]'),
  ).toHaveCount(0);

  await page.keyboard.press("Escape");
  await page.goto("/pl/market-integrity/cross-asset", {
    waitUntil: "domcontentloaded",
  });
  await page
    .locator(
      '[data-testid="realmarkets-row"], [data-testid="realmarkets-row-mobile"]',
    )
    .first()
    .click();
  const realModal = page
    .locator('[data-unified-asset-modal="real-markets"]')
    .last();
  await expectVisibleSurface(realModal);
  await expect(
    realModal.locator('[data-unified-asset-rect-chart="true"]'),
  ).toBeVisible();
  await expect(
    realModal.locator('[data-unified-asset-depth-rail="rectangular-attached"]'),
  ).toBeVisible();
});

test("Audit registry renders as public searchable review product", async ({
  page,
}) => {
  await page.goto("/pl/security/audits/registry", {
    waitUntil: "domcontentloaded",
  });
  await expectNoPageOverflow(page);
  await expect(page.locator("[data-pass1894-registry-search]")).toBeVisible();
  await expect(page.locator("[data-pass1894-registry-listing]")).toBeVisible();
  await page
    .locator(
      '[data-pass1894-registry-search] input, input[placeholder*="Search"], input[placeholder*="Szukaj"]',
    )
    .first()
    .fill("proxy");
  await expect(page.locator("[data-pass1894-registry-listing]")).toContainText(
    /proxy|Scope|Audit|Evidence/i,
  );
});
