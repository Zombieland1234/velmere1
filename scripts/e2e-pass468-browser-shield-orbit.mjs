const baseURL = process.env.PASS468_BASE_URL || "http://127.0.0.1:3000";

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.error(
    "PASS468 E2E requires Playwright. Install it locally and run: npx playwright install chromium",
  );
  process.exit(2);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();

const fakeResult = {
  id: "bitcoin",
  title: "Bitcoin",
  symbol: "BTC",
  category: "token",
  tone: "review",
  summary: "PASS468 deterministic Browser flow fixture.",
  whyItMatters: "The target must perform a fresh scan instead of trusting Browser state.",
  missingData: ["second venue depth"],
  nextOperatorStep: "Open Shield and verify the evidence packet.",
  sourceMode: "live_table",
  sourceConfidence: 74,
  shieldHref: "/market-integrity?query=BTC",
  sources: [
    {
      id: "fixture",
      label: "PASS468 fixture",
      mode: "table",
      freshness: "test",
      confidence: 74,
      note: "deterministic fixture",
    },
  ],
  chips: ["BTC", "fixture"],
  marketSnapshot: {
    assetClass: "crypto",
    currency: "USD",
    price: 70000,
    marketCap: 1380000000000,
    volume24h: 32000000000,
    change24h: 1.4,
    observedAt: "2026-06-07T12:00:00.000Z",
    venueComparisonState: "aligned",
  },
};

function fakePdf() {
  const header = "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n";
  const body = "% PASS468 deterministic PDF fixture\n".repeat(45);
  const footer = "trailer<</Root 1 0 R>>\n%%EOF";
  return Buffer.from(`${header}${body}${footer}`);
}

async function expect(condition, message) {
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
      body: fakePdf(),
    });
  });

  await page.goto(`${baseURL}/pl/search`, { waitUntil: "networkidle" });
  await page.getByTestId("lens-search-input").fill("BTC");
  await page.getByTestId("lens-search-input").press("Enter");
  const result = page.getByTestId("lens-result-card").first();
  await result.waitFor({ state: "visible" });

  const resultBox = await result.boundingBox();
  const capsule = page.locator("[data-pass467-pdf-capsule-after-result='true']");
  const capsuleBox = await capsule.boundingBox();
  await expect(
    Boolean(resultBox && capsuleBox && resultBox.y < capsuleBox.y),
    "Search result is not rendered before the PDF capsule",
  );

  await page.getByTestId("lens-preview-button").first().click();
  await page.getByTestId("lens-pdf-forge").waitFor({ state: "visible" });
  await page.getByTestId("lens-depth-pro").click();
  await page.getByTestId("lens-preview-dialog").waitFor({ state: "visible", timeout: 15000 });

  const downloadHref = await page.getByTestId("lens-download-link").getAttribute("href");
  const frameSrc = await page.getByTestId("lens-pdf-frame").getAttribute("src");
  await expect(Boolean(downloadHref?.startsWith("blob:")), "Download does not use a PDF blob");
  await expect(Boolean(frameSrc?.startsWith(downloadHref || "__missing__")), "Preview/download blob parity failed");
  await expect(
    (await page.locator("[data-pass465-pdf-depth-badge='true']").textContent())?.toLowerCase().includes("pro"),
    "Selected Pro depth was not preserved in preview",
  );
  await expect((await page.evaluate(() => document.body.style.overflow)) === "hidden", "Preview did not lock background scroll");
  await page.getByTestId("lens-preview-close").click();
  await page.getByTestId("lens-preview-dialog").waitFor({ state: "detached" });

  await page.getByTestId("lens-orbit-handoff").first().click();
  await page.waitForURL(/market-integrity\/shield-map\?.*handoff=pass468/);
  const packetId = new URL(page.url()).searchParams.get("packet");
  await expect(Boolean(packetId), "Orbit route is missing packet id");
  const packet = await page.evaluate((id) => {
    const raw = sessionStorage.getItem(`velmere:pass468:handoff:${id}`);
    return raw ? JSON.parse(raw) : null;
  }, packetId);
  await expect(packet?.query === "BTC", "Handoff packet changed the instrument");
  await expect(packet?.target === "orbit", "Handoff packet target is not Orbit");
  await expect(packet?.requiresFreshTargetScan === true, "Target fresh-scan boundary is missing");
  await expect(packet?.trustedForDisplayOnly === true, "Display-only trust boundary is missing");

  console.log("PASS468 Browser → PDF → Orbit handoff E2E passed");
} finally {
  await browser.close();
}
