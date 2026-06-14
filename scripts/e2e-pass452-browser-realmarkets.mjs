const baseURL = process.env.PASS452_BASE_URL || "http://127.0.0.1:3000";

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.error("PASS452 E2E requires Playwright. Install it locally and run: npx playwright install chromium");
  process.exit(2);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();

async function expect(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  await page.goto(`${baseURL}/pl/search`, { waitUntil: "networkidle" });
  await page.getByTestId("lens-search-input").fill("BTC");
  await page.waitForTimeout(700);
  const suggestions = page.locator(".vis-token-suggest-panel button");
  await expect((await suggestions.count()) <= 3, "Lens rendered more than three suggestions");
  if (await suggestions.count()) await suggestions.first().click();
  await page.getByTestId("lens-result-card").first().waitFor({ state: "visible" });
  await page.getByTestId("lens-preview-button").first().click();
  await page.getByTestId("lens-pdf-forge").waitFor({ state: "visible" });
  await page.getByTestId("lens-preview-dialog").waitFor({ state: "visible", timeout: 15000 });

  const downloadHref = await page.getByTestId("lens-download-link").getAttribute("href");
  const frameSrc = await page.getByTestId("lens-pdf-frame").getAttribute("src");
  await expect(Boolean(downloadHref?.startsWith("blob:")), "Download does not use a generated PDF blob");
  await expect(Boolean(frameSrc?.startsWith(downloadHref || "__missing__")), "Preview and download do not use the same PDF blob");
  const overflow = await page.evaluate(() => document.body.style.overflow);
  await expect(overflow === "hidden", "Background scroll is not locked while PDF preview is open");
  await page.keyboard.press("Escape");
  await page.getByTestId("lens-preview-dialog").waitFor({ state: "detached" });

  await page.goto(`${baseURL}/pl/market-integrity/cross-asset`, { waitUntil: "networkidle" });
  await page.getByTestId("realmarkets-search-input").fill("ORCL");
  await page.waitForTimeout(900);
  await expect((await page.getByTestId("realmarkets-row").count()) >= 1, "Dynamic Real Markets search returned no row");
  await page.getByTestId("realmarkets-search-input").fill("");
  await page.getByTestId("realmarkets-tab-exchanges").click();
  await expect(await page.getByText("Binance Venue Health").isVisible(), "Binance venue lane is missing");
  await expect(await page.getByText("MEXC Venue Health").isVisible(), "MEXC venue lane is missing");

  console.log("PASS452 browser + PDF + Real Markets E2E smoke passed");
} finally {
  await browser.close();
}
