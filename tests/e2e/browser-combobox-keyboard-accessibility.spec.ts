import { expect, test, type Page } from "@playwright/test";

const locales = ["pl", "en", "de"] as const;
const suggestionLabels = {
  pl: "Sugestie wyszukiwania",
  en: "Search suggestions",
  de: "Suchvorschläge",
} as const;

const fixtureResult = {
  id: "bitcoin",
  title: "Bitcoin",
  symbol: "BTC",
  category: "token",
  tone: "review",
  summary: "Local accessibility fixture; not provider or customer evidence.",
  whyItMatters: "Exercises the Browser combobox without a provider request.",
  missingData: ["provider rights", "fresh market source"],
  nextOperatorStep: "Keep customer delivery withheld.",
  sourceMode: "missing",
  sourceConfidence: 0,
  sourceConfidenceCalibrated: false,
  shieldHref: "/market-integrity",
  sources: [],
  chips: ["local fixture", "no live claim"],
} as const;

function collectRuntimeErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(`pageerror:${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") {
      const location = message.location().url || "unknown";
      errors.push(`console:${location}:${message.text()}`);
    }
  });
  page.on("response", (response) => {
    if (response.status() >= 400)
      errors.push(`response:${response.status()}:${response.url()}`);
  });
  return errors;
}

test("Browser combobox is keyboard-complete and localized", async ({ page }) => {
  const runtimeErrors = collectRuntimeErrors(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "cache-control": "no-store" },
      body: JSON.stringify({
        ok: true,
        authenticated: false,
        accountAuthenticated: false,
        supabaseAuthenticated: false,
        bindingState: "missing",
        refreshRequired: false,
        session: null,
        authMode: "none",
        fixtureBoundary: "LOCAL_ANONYMOUS_FIXTURE_NOT_AUTH_PROOF",
      }),
    });
  });
  await page.route("**/api/search?*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "cache-control": "no-store" },
      body: JSON.stringify({
        ok: true,
        mode: "LOCAL_ACCESSIBILITY_FIXTURE_NOT_PROVIDER_TRUTH",
        liveClaimed: false,
        results: [fixtureResult],
      }),
    });
  });

  for (const locale of locales) {
    const response = await page.goto(`/${locale}/search`, {
      waitUntil: "domcontentloaded",
    });
    expect(response?.status(), `${locale} Browser HTTP status`).toBeLessThan(400);

    const input = page.getByTestId("lens-search-input");
    await expect(input).toHaveCount(1);
    await expect(input).toBeVisible();
    await expect(input).toBeEnabled();
    await expect(input).toHaveAttribute("data-lens-interactive-ready", "true");
    await input.fill("bit");

    const listbox = page.getByRole("listbox", {
      name: suggestionLabels[locale],
    });
    const option = listbox.getByRole("option");
    await expect(listbox).toBeVisible();
    await expect(option).toHaveCount(1);
    await expect(option).toHaveAttribute("tabindex", "-1");
    await expect(input).toHaveAttribute("aria-expanded", "true");

    await input.press("ArrowDown");
    await expect(input).toBeFocused();
    await expect(input).toHaveAttribute(
      "aria-activedescendant",
      "velmere-lens-suggestion-option-0",
    );
    await expect(option).toHaveAttribute("aria-selected", "true");

    for (const key of ["ArrowUp", "Home", "End"] as const) {
      await input.press(key);
      await expect(input).toBeFocused();
      await expect(option).toHaveAttribute("aria-selected", "true");
    }

    await input.press("Enter");
    await expect(input).toHaveValue("BTC");
    await expect(input).toHaveAttribute("aria-expanded", "false");
    await expect(listbox).toHaveCount(0);

    await input.fill("bit");
    await expect(listbox).toBeVisible();
    await input.press("ArrowDown");
    await input.press("Escape");
    await expect(input).toBeFocused();
    await expect(input).toHaveAttribute("aria-expanded", "false");
    await expect(input).not.toHaveAttribute("aria-activedescendant", /.+/u);
    await expect(listbox).toHaveCount(0);

    const horizontalOverflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(horizontalOverflow, `${locale} horizontal overflow`).toBeLessThanOrEqual(2);
  }

  expect(runtimeErrors).toEqual([]);
});
