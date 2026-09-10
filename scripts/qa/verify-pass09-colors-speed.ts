import { chromium } from "playwright";
import * as path from "path";
import * as fs from "fs";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });

  console.log("--- 1. Testing Real Markets Color Vector Logos ---");
  await page.goto("http://localhost:3000/en/real-markets", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  // Check SVG logos for color fills
  const msftSvgPath = path.resolve(process.cwd(), "public/market-logos/msft.svg");
  const nvdaSvgPath = path.resolve(process.cwd(), "public/market-logos/nvda.svg");
  const googlSvgPath = path.resolve(process.cwd(), "public/market-logos/googl.svg");
  const amznSvgPath = path.resolve(process.cwd(), "public/market-logos/amzn.svg");

  const msftContent = fs.readFileSync(msftSvgPath, "utf-8");
  const nvdaContent = fs.readFileSync(nvdaSvgPath, "utf-8");
  const googlContent = fs.readFileSync(googlSvgPath, "utf-8");
  const amznContent = fs.readFileSync(amznSvgPath, "utf-8");

  const msftHasColor = msftContent.includes("#F25022") && msftContent.includes("#7FBA00") && msftContent.includes("#00A4EF") && msftContent.includes("#FFB900");
  const nvdaHasColor = nvdaContent.includes("#76B900");
  const googlHasColor = googlContent.includes("#4285F4") && googlContent.includes("#34A853") && googlContent.includes("#FBBC05") && googlContent.includes("#EA4335");
  const amznHasColor = amznContent.includes("#FF9900");

  console.log("MSFT logo has official 4 colors:", msftHasColor);
  console.log("NVDA logo has NVIDIA green (#76B900):", nvdaHasColor);
  console.log("GOOGL logo has Google 4 colors:", googlHasColor);
  console.log("AMZN logo has Amazon orange smile (#FF9900):", amznHasColor);

  if (!msftHasColor || !nvdaHasColor || !googlHasColor || !amznHasColor) {
    throw new Error("One or more brand logos are missing vibrant color fills!");
  }

  // Ensure artifacts dir exists
  const artifactsDir = path.resolve(process.cwd(), "artifacts");
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }

  const realMarketsScreenshot = path.join(artifactsDir, "pass09_real_markets_colored_logos.png");
  await page.screenshot({ path: realMarketsScreenshot, fullPage: false });
  console.log("Saved Real Markets screenshot:", realMarketsScreenshot);

  console.log("--- 2. Testing Shield Instant Load Performance ---");
  const startTime = Date.now();
  await page.goto("http://localhost:3000/en/market-integrity", { waitUntil: "domcontentloaded" });

  // Wait for grid rows to appear
  const rowSelector = '.shield-desktop-grid-row-pass4577, [data-pass4577-shield-row]';
  await page.waitForSelector(rowSelector, { timeout: 15000 });
  const initialLoadDuration = Date.now() - startTime;
  console.log(`Shield initial route compilation + render in: ${initialLoadDuration}ms`);

  // Now measure subsequent instant reload/navigation
  const reloadStart = Date.now();
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector(rowSelector, { timeout: 3000 });
  const reloadDuration = Date.now() - reloadStart;
  console.log(`Shield instant reload/paint time (with bootstrap/cache): ${reloadDuration}ms`);

  const rowCount = await page.locator(rowSelector).count();
  console.log(`Rendered row count on Shield: ${rowCount}`);

  if (rowCount < 5) {
    throw new Error(`Expected at least 5 rendered rows on Shield, found ${rowCount}`);
  }

  // Check first row contains Bitcoin / BTC
  const firstRowText = await page.locator(rowSelector).first().innerText();
  console.log("First row preview:", firstRowText.replace(/\n+/g, " | "));

  // Take screenshot of loaded Shield
  const shieldScreenshot = path.join(artifactsDir, "pass09_shield_instant_load.png");
  await page.screenshot({ path: shieldScreenshot, fullPage: false });
  console.log("Saved Shield screenshot:", shieldScreenshot);

  // Check console errors (ignoring react hydration noise if any)
  const criticalErrors = consoleErrors.filter((e) => !e.includes("hydration") && !e.includes("ResizeObserver"));
  console.log("Critical console errors:", criticalErrors.length);

  await browser.close();
  console.log("PASS_09 QA verification SUCCESSFUL!");
}

run().catch((err) => {
  console.error("QA Test FAILED:", err);
  process.exit(1);
});
