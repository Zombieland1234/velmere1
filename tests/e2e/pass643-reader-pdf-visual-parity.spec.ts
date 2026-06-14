import { expect, test, type Page } from "@playwright/test";

const locales = ["pl", "de", "en"] as const;
const depths = ["basic", "pro", "advanced"] as const;

const fakeResult = {
  id: "ethereum-pass643",
  title: "Ethereum with a deliberately long visual-parity fixture title",
  symbol: "ETH-VELMERE-EXTREME-SYMBOL",
  category: "token",
  tone: "review",
  summary: "PASS643 deterministic Reader and PDF visual-parity fixture with long labels and source-bound evidence.",
  whyItMatters: "Every locale and analysis depth must preserve the same claim, source, appendix and manifest identity without overlap.",
  missingData: [
    "independent second-provider timestamp with a deliberately long explanation",
    "holder concentration source and observation date",
  ],
  nextOperatorStep: "Attach a fresh independent receipt and compare the exact observation window.",
  sourceMode: "live_table",
  sourceConfidence: 76,
  shieldHref: "/market-integrity?query=ETH",
  sources: [
    {
      id: "fixture-primary",
      label: "PASS643 primary provider with a deliberately long source label and observation methodology",
      mode: "live",
      freshness: "2026-06-09T12:00:00.000Z",
      confidence: 76,
      note: "Provider timestamp retained separately from route generation time.",
    },
    {
      id: "fixture-secondary",
      label: "PASS643 independent secondary provider",
      mode: "table",
      freshness: "2026-06-09T11:59:30.000Z",
      confidence: 69,
      note: "Independent comparison fixture.",
    },
  ],
  chips: ["ETH", "visual parity"],
  marketSnapshot: {
    assetClass: "crypto",
    currency: "USD",
    price: 3800,
    marketCap: 456000000000,
    volume24h: 17000000000,
    change24h: 1.8,
    observedAt: "2026-06-09T12:00:00.000Z",
    venueReferencePrice: 3800,
    venueSecondaryPrice: 3801,
    venueComparisonState: "aligned",
  },
};

function fakePdf() {
  const header = "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n";
  const body = "% PASS643 deterministic A4 PDF fixture\n".repeat(64);
  const footer = "trailer<</Root 1 0 R>>\n%%EOF";
  return Buffer.from(`${header}${body}${footer}`);
}

async function installRoutes(page: Page) {
  await page.route("**/api/search?**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, results: [fakeResult] }),
    });
  });
  await page.route("**/api/search/lens-report?**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/pdf",
      headers: {
        "x-velmere-visual-parity": "ready:fixture",
        "x-velmere-unified-evidence": "locked:fixture",
      },
      body: fakePdf(),
    });
  });
}

async function openPreview(page: Page, locale: string, depth: typeof depths[number]) {
  await page.goto(`/${locale}/search`, { waitUntil: "domcontentloaded" });
  await page.getByTestId("lens-search-input").fill("ETH");
  await page.getByTestId("lens-search-input").press("Enter");
  await page.getByTestId("lens-result-card").first().waitFor({ state: "visible" });
  await page.getByTestId("lens-preview-button").first().click();
  await page.getByTestId(`lens-depth-choice-${depth}`).click();
  await page.getByTestId("lens-depth-confirm").click();
  await page.getByTestId("lens-preview-dialog").waitFor({ state: "visible", timeout: 20_000 });
}

for (const locale of locales) {
  for (const depth of depths) {
    test(`${locale} · ${depth} · Reader/PDF manifest and visual containment`, async ({ page }) => {
      await installRoutes(page);
      await openPreview(page, locale, depth);
      const dialog = page.getByTestId("lens-preview-dialog");
      await expect(dialog).toHaveAttribute("data-pass643-visual-parity", /ready|review/);
      await expect(dialog).toHaveAttribute("data-pass646-unified-ledger", /locked|review/);
      await expect(dialog).toHaveAttribute("data-evidence-key", /^VLM-LEDGER-/);
      const geometry = await dialog.evaluate(() => ({
        overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth,
        textLength: document.body.innerText.trim().length,
        headings: document.querySelectorAll("h1,h2,h3").length,
      }));
      expect(geometry.overflow).toBeLessThanOrEqual(4);
      expect(geometry.textLength).toBeGreaterThan(200);
      expect(geometry.headings).toBeGreaterThan(2);
      await expect(page.locator("[data-pass646-evidence-continuity='true']")).toBeVisible();
      await dialog.screenshot({
        path: `test-results/pass643-${locale}-${depth}-${test.info().project.name}.png`,
        animations: "disabled",
      });
    });
  }
}
