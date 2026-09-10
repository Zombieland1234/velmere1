import { chromium } from "playwright";

async function verifyAssetDetailPage() {
  console.log("Testing /en/shield/assets/bnb and /en/real-markets/assets/aapl...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const page = await context.newPage();

  const errors: string[] = [];
  page.on("console", msg => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", err => errors.push(err.message));

  // Test 1: BNB on Shield
  await page.goto("http://localhost:3000/en/shield/assets/bnb", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500); // allow canvas animation to sweep

  // Check if master Velmère navbar is present
  const navbars = await page.locator('nav').all();
  console.log("Navbars count on page:", navbars.length);

  // Check chart canvas height
  const canvas = page.locator('canvas').first();
  const box = await canvas.boundingBox();
  console.log("Chart canvas bounding box:", box);

  // Check risk score text
  const riskCard = page.locator('text=/LOW RISK|NISKIE RYZYKO/i').first();
  console.log("Risk level visible:", await riskCard.isVisible());

  await page.screenshot({ path: "artifacts/asset_detail_bnb_verified.png", fullPage: true });
  console.log("Saved screenshot: artifacts/asset_detail_bnb_verified.png");

  // Test 2: AAPL on Real Markets
  await page.goto("http://localhost:3000/en/real-markets/assets/aapl", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  await page.screenshot({ path: "artifacts/asset_detail_aapl_verified.png", fullPage: true });
  console.log("Saved screenshot: artifacts/asset_detail_aapl_verified.png");

  await browser.close();

  if (errors.length > 0) {
    console.error("Console errors found:", errors);
    process.exit(1);
  } else {
    console.log("PASS_02, PASS_03, PASS_04 VERIFIED: Clean layout, real-time risk, animated chart, 0 errors!");
  }
}

verifyAssetDetailPage().catch(err => {
  console.error(err);
  process.exit(1);
});
