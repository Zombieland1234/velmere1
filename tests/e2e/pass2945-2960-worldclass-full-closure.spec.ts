import { expect, test, type Page } from "@playwright/test";

const locales = ["pl", "en", "de"] as const;

function collectRuntimeErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(`pageerror:${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console:${message.text()}`);
  });
  return errors;
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, "document must not overflow horizontally").toBeLessThanOrEqual(2);
}

test.describe("Audits and Lens release-critical browser journeys", () => {
  test("Security Audits is keyboard-safe and locale-complete", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);
    const planLabels = { pl: "Plany audytu", en: "Audit plans", de: "Audit-Pläne" } as const;

    for (const locale of locales) {
      const response = await page.goto(`/${locale}/security/audits`, { waitUntil: "domcontentloaded" });
      expect(response?.status(), `${locale} audits HTTP status`).toBeLessThan(400);
      const auditRoot = page.locator("[data-pass4609-audit-clean]");
      await expect(auditRoot).toHaveCount(1);
      await expect(auditRoot).toBeVisible();
      const planGroup = page.getByRole("radiogroup", { name: planLabels[locale] });
      await expect(planGroup).toHaveCount(1);
      await expect(planGroup).toBeVisible();

      const trigger = page.locator(".audit-v4609-compare");
      await trigger.click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      const close = dialog.getByRole("button").first();
      await expect(close).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(close).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
      await expect(trigger).toBeFocused();
      await expectNoHorizontalOverflow(page);
    }

    expect(runtimeErrors, "no uncaught or console errors across locale journey").toEqual([]);
  });

  test("Lens landing keeps one labeled search surface in every locale", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);

    for (const locale of locales) {
      const response = await page.goto(`/${locale}/search`, { waitUntil: "domcontentloaded" });
      expect(response?.status(), `${locale} Lens HTTP status`).toBeLessThan(400);
      const input = page.getByTestId("lens-search-input");
      await expect(input).toHaveCount(1);
      await expect(input).toBeVisible();
      await expect(input).toHaveAttribute("role", "combobox");
      await expect(input).toHaveAttribute("aria-expanded", "false");
      await expect(page.locator("[data-testid='lens-preview-dialog']")).toHaveCount(0);
      await expect(page.locator("[data-testid='lens-pdf-depth-dialog']")).toHaveCount(0);
      await expectNoHorizontalOverflow(page);
    }

    expect(runtimeErrors, "no uncaught or console errors across locale journey").toEqual([]);
  });

  test("dotted 404 documents stay inside locale routing", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);

    for (const locale of locales) {
      const response = await page.goto(`/${locale}/pass12.missing-document.pdf`, { waitUntil: "domcontentloaded" });
      expect(response?.status(), `${locale} dotted 404 HTTP status`).toBe(404);
      const localizedNotFound = page.locator("[data-pass2007-not-found]");
      await expect(localizedNotFound).toHaveCount(1);
      await expect(localizedNotFound).toBeVisible();
      await expectNoHorizontalOverflow(page);
    }

    expect(runtimeErrors, "no uncaught or console errors across dotted 404 journey").toEqual([]);
  });
});
