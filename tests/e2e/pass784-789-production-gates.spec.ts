import { expect, test, type Page } from "@playwright/test";

const locales = ["pl", "en", "de"] as const;

async function collectRuntimeErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && !/favicon|hydration.*extension/i.test(message.text())) errors.push(message.text());
  });
  return errors;
}

async function assertNoHorizontalPageOverflow(page: Page) {
  const overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(4);
}

test("account can be created without connecting a wallet", async ({ page }) => {
  await page.goto("/pl/login", { waitUntil: "domcontentloaded" });
  await page.getByRole("tab", { name: "Nowe konto" }).click();
  await page.getByLabel(/e-mail/i).fill("qa.member@velmere.test");
  await page.getByLabel(/hasło/i).fill("Velmere-QA-2026");
  await page.getByRole("button", { name: /utwórz konto/i }).click();
  await expect(page).toHaveURL(/\/pl\/account/);
  await expect(page.getByText("Qa Member", { exact: true })).toBeVisible();
  await expect(page.getByText("Opcjonalny", { exact: true }).first()).toBeVisible();
});

for (const locale of locales) {
  test(`${locale} auth/member routes avoid 404 and raw translation keys`, async ({ page }) => {
    const errors = await collectRuntimeErrors(page);
    for (const route of ["login", "account", "member"] as const) {
      await page.goto(`/${locale}/${route}`, { waitUntil: "domcontentloaded" });
      await expect(page.locator("body")).toBeVisible();
      await expect(page.locator("body")).not.toContainText(/\b(?:Home|Navigation|Wallet|Legal)\.[A-Za-z0-9_.]+\b/);
      await assertNoHorizontalPageOverflow(page);
    }
    expect(errors, errors.join("\n")).toEqual([]);
  });
}

test("auth tabs support arrow-key navigation", async ({ page }) => {
  await page.goto("/en/login", { waitUntil: "domcontentloaded" });
  const signIn = page.getByRole("tab", { name: "Sign in" });
  const create = page.getByRole("tab", { name: "New account" });
  await signIn.focus();
  await page.keyboard.press("ArrowRight");
  await expect(create).toHaveAttribute("aria-selected", "true");
  await expect(create).toBeFocused();
});

test("critical public routes fit 320, 360, 390 and 430 pixel widths", async ({ page }) => {
  for (const width of [320, 360, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    for (const route of ["/pl", "/pl/market-integrity", "/pl/market-integrity/cross-asset", "/pl/market-integrity/shield-map", "/pl/search", "/pl/checkout"]) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await assertNoHorizontalPageOverflow(page);
      const tinyTargets = await page.locator("button:visible, a[href]:visible").evaluateAll((nodes) => nodes.filter((node) => {
        const rect = node.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && (rect.width < 32 || rect.height < 32);
      }).length);
      expect(tinyTargets).toBeLessThan(8);
    }
  }
});

test("reduced motion keeps loading and primary controls usable", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "dark" });
  await page.goto("/de/market-integrity/shield-map", { waitUntil: "domcontentloaded" });
  await expect(page.locator("main")).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toBeVisible();
});
