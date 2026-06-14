const baseURL = process.env.PASS469_BASE_URL || "http://127.0.0.1:3000";

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.error(
    "PASS469 E2E requires Playwright. Install it locally and run: npx playwright install chromium",
  );
  process.exit(2);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  acceptDownloads: true,
});
const page = await context.newPage();

const fakeResult = {
  id: "ethereum",
  title: "Ethereum",
  symbol: "ETH",
  category: "token",
  tone: "review",
  summary: "PASS469 deterministic mobile PDF fixture.",
  whyItMatters: "A4 regions and the download receipt must remain bounded.",
  missingData: ["second venue depth", "holder concentration source"],
  nextOperatorStep: "Open Shield and run a fresh target scan.",
  sourceMode: "live_table",
  sourceConfidence: 76,
  shieldHref: "/market-integrity?query=ETH",
  sources: [
    {
      id: "fixture-primary",
      label: "PASS469 primary provider with a deliberately long source label",
      mode: "live",
      freshness: "2026-06-07T12:00:00.000Z",
      confidence: 76,
      note: "deterministic fixture",
    },
    {
      id: "fixture-secondary",
      label: "PASS469 secondary provider",
      mode: "table",
      freshness: "test",
      confidence: 69,
      note: "deterministic fixture",
    },
  ],
  chips: ["ETH", "fixture"],
  marketSnapshot: {
    assetClass: "crypto",
    currency: "USD",
    price: 3800,
    marketCap: 456000000000,
    volume24h: 17000000000,
    change24h: 1.8,
    observedAt: "2026-06-07T12:00:00.000Z",
    venueComparisonState: "aligned",
  },
};

function fakePdf() {
  const header = "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n";
  const body = "% PASS469 deterministic A4 PDF fixture\n".repeat(48);
  const footer = "trailer<</Root 1 0 R>>\n%%EOF";
  return Buffer.from(`${header}${body}${footer}`);
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

try {
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
      headers: { "x-velmere-a4-layout-audit": "pass469-ok" },
      body: fakePdf(),
    });
  });

  await page.goto(`${baseURL}/pl/search`, { waitUntil: "networkidle" });
  await page.getByTestId("lens-search-input").fill("ETH");
  await page.getByTestId("lens-search-input").press("Enter");
  await page.getByTestId("lens-result-card").first().waitFor({ state: "visible" });
  await page.getByTestId("lens-preview-button").first().click();
  await page.getByTestId("lens-pdf-forge").waitFor({ state: "visible" });
  await page.getByTestId("lens-depth-advanced").click();
  await page.getByTestId("lens-preview-dialog").waitFor({
    state: "visible",
    timeout: 15000,
  });

  const toolbar = page.locator("[data-pass469-responsive-pdf-toolbar='true']");
  const toolbarBox = await toolbar.boundingBox();
  expect(Boolean(toolbarBox), "Responsive PDF toolbar is missing");
  expect(
    Boolean(toolbarBox && toolbarBox.x >= 0 && toolbarBox.x + toolbarBox.width <= 390),
    "Responsive PDF toolbar exceeds the mobile viewport",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
    "PDF preview introduces horizontal page overflow",
  );
  expect(
    (await page.evaluate(() => document.body.style.overflow)) === "hidden",
    "PDF preview did not lock background scroll",
  );

  const downloadPromise = page.waitForEvent("download");
  await page.getByTestId("lens-download-link").click();
  const download = await downloadPromise;
  expect(
    download.suggestedFilename().endsWith("-advanced.pdf"),
    "Selected Advanced depth is missing from the downloaded filename",
  );
  await page.getByTestId("lens-download-receipt").waitFor({ state: "visible" });
  const receiptText = await page.getByTestId("lens-download-receipt").textContent();
  expect(Boolean(receiptText?.includes("vlm469-")), "Download receipt id was not displayed");
  const receipts = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("velmere:pass469:pdf-download-receipts") || "[]"),
  );
  expect(receipts?.[0]?.event === "download_initiated", "Receipt event is not download_initiated");
  expect(receipts?.[0]?.containsRawPayload === false, "Receipt leaked raw payload state");

  await page.getByTestId("lens-preview-close").click();
  await page.getByTestId("lens-preview-dialog").waitFor({ state: "detached" });
  expect(
    (await page.evaluate(() => document.body.style.overflow)) !== "hidden",
    "Background scroll lock was not released after closing preview",
  );

  console.log("PASS469 Browser PDF A4 + download receipt E2E passed");
} finally {
  await browser.close();
}
