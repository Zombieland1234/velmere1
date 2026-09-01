import { expect, test, type Page } from "@playwright/test";

const locales = ["pl", "en", "de"] as const;
const suggestionLabels = {
  pl: "Sugestie wyszukiwania",
  en: "Search suggestions",
  de: "Suchvorschläge",
} as const;

function collectRuntimeErrors(page: Page) {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on("pageerror", (error) =>
    pageErrors.push(`pageerror:${error.message}`),
  );
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(`console:${message.text()}`);
    }
  });
  return { pageErrors, consoleErrors };
}

test("Shield Map combobox deduplicates and supports keyboard/touch across locales", async ({
  page,
}, testInfo) => {
  const runtimeDiagnostics = collectRuntimeErrors(page);
  let searchFixtureCalls = 0;
  let investigatorFixtureCalls = 0;

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "cache-control": "no-store" },
      body: JSON.stringify({
        ok: true,
        authenticated: false,
        session: null,
        fixtureBoundary: "LOCAL_ANONYMOUS_FIXTURE_NOT_AUTH_PROOF",
      }),
    });
  });
  await page.route("**/api/market-integrity/search?*", async (route) => {
    searchFixtureCalls += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "cache-control": "no-store" },
      body: JSON.stringify({
        suggestions: [
          {
            id: " BITCOIN ",
            symbol: "btc",
            name: "Provider duplicate fixture",
            rank: 1,
          },
          {
            id: "bitcoin-cash",
            symbol: "BCH",
            name: "Bitcoin Cash fixture",
            rank: 4,
          },
        ],
        fixtureBoundary: "LOCAL_ACCESSIBILITY_FIXTURE_NOT_PROVIDER_TRUTH",
      }),
    });
  });
  await page.route("**/api/market-integrity/investigator?*", async (route) => {
    investigatorFixtureCalls += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "cache-control": "no-store" },
      body: JSON.stringify({
        mode: "withheld",
        error: "local_fixture_withheld_no_customer_claim",
        publication: {
          evidenceState: "withheld",
          scorePublished: false,
          blockers: ["local_fixture_only"],
        },
      }),
    });
  });

  for (const locale of locales) {
    const response = await page.goto(`/${locale}/shield-map`, {
      waitUntil: "domcontentloaded",
    });
    expect(response?.status(), `${locale} Shield Map HTTP status`).toBeLessThan(
      400,
    );

    const hydrationSignal = page.locator(
      '[aria-label="Shield Map search status"]:visible',
    );
    await expect(hydrationSignal).not.toHaveText("");

    const input = page.locator('[data-testid="shield-map-search"]:visible');
    await expect(input).toHaveCount(1);
    await expect(input).toBeVisible();
    await input.fill("");
    await input.pressSequentially("bit", { delay: 5 });

    const listbox = page.getByRole("listbox", {
      name: suggestionLabels[locale],
    });
    const options = listbox.getByRole("option");
    await expect(listbox).toBeVisible();
    await expect(options).toHaveCount(2);
    await expect(options.nth(0)).toHaveAttribute("tabindex", "-1");
    await expect(options.nth(1)).toHaveAttribute("tabindex", "-1");
    await expect(input).toHaveAttribute("aria-expanded", "true");

    await input.press("ArrowDown");
    await expect(input).toBeFocused();
    await expect(input).toHaveAttribute(
      "aria-activedescendant",
      "shield-map-suggestion-option-0",
    );
    await expect(options.nth(0)).toHaveAttribute("aria-selected", "true");

    await input.press("ArrowDown");
    await expect(input).toHaveAttribute(
      "aria-activedescendant",
      "shield-map-suggestion-option-1",
    );
    await input.press("Home");
    await expect(input).toHaveAttribute(
      "aria-activedescendant",
      "shield-map-suggestion-option-0",
    );
    await input.press("End");
    await expect(input).toHaveAttribute(
      "aria-activedescendant",
      "shield-map-suggestion-option-1",
    );
    await input.press("ArrowUp");
    await expect(input).toHaveAttribute(
      "aria-activedescendant",
      "shield-map-suggestion-option-0",
    );

    await input.press("Enter");
    await expect(input).toHaveValue("BTC");
    await expect(input).toHaveAttribute("aria-expanded", "false");
    await expect(listbox).toHaveCount(0);

    await input.fill("");
    await input.pressSequentially("bit", { delay: 5 });
    await expect(options).toHaveCount(2);
    await input.press("ArrowDown");
    await input.press("Escape");
    await expect(input).toBeFocused();
    await expect(input).toHaveAttribute("aria-expanded", "false");
    await expect(input).not.toHaveAttribute("aria-activedescendant", /.+/u);
    await expect(listbox).toHaveCount(0);

    await input.fill("");
    await input.pressSequentially("bit", { delay: 5 });
    await expect(options).toHaveCount(2);
    if (testInfo.project.name === "desktop-chromium") {
      await options.nth(1).click();
    } else {
      await options.nth(1).tap();
    }
    await expect(input).toHaveValue("BCH");
    await expect(input).toHaveAttribute("aria-expanded", "false");

    const horizontalOverflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(
      horizontalOverflow,
      `${locale} horizontal overflow`,
    ).toBeLessThanOrEqual(2);
  }

  expect(searchFixtureCalls).toBeGreaterThanOrEqual(locales.length * 3);
  expect(investigatorFixtureCalls).toBe(locales.length * 2);
  await testInfo.attach("console-diagnostics-not-combobox-pass-credit", {
    body: Buffer.from(JSON.stringify(runtimeDiagnostics.consoleErrors, null, 2)),
    contentType: "application/json",
  });
  expect(runtimeDiagnostics.pageErrors).toEqual([]);
});
