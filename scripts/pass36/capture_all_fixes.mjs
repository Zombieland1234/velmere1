import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.goto("http://localhost:3000/pl/real-markets", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "naprawa/screen_real_markets_repaired.png" });
  console.log("Real markets screenshot saved");

  await page.goto("http://localhost:3000/pl/security/audits", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "naprawa/screen_audits_clean.png" });
  console.log("Audits clean screenshot saved");

  await page.goto("http://localhost:3000/pl/security/audits/report/0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c?name=WBNB&tier=advanced", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "naprawa/screen_canonical_audit_report.png" });
  console.log("Canonical audit report screenshot saved");

  await page.goto("http://localhost:3000/pl/shop", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "naprawa/screen_shop_coming_soon.png" });
  console.log("Shop coming soon screenshot saved");

  await page.goto("http://localhost:3000/pl/search", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "naprawa/screen_browser_crest.png" });
  console.log("Browser crest screenshot saved");

  await page.goto("http://localhost:3000/pl/shield-pro", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "naprawa/screen_shield_pro.png" });
  console.log("Shield Pro screenshot saved");

  await browser.close();
}

run().catch(console.error);
