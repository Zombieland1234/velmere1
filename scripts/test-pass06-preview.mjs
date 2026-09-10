import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  console.log("Navigating to Shield Map...");
  await page.goto("http://localhost:3000/pl/shield-map", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  
  await page.screenshot({ path: "artifacts/test_shield_map_before.png", fullPage: false });
  console.log("Captured test_shield_map_before.png");
  
  // Test autocomplete on typing 'b'
  const input = page.locator("input[type='text'], input[placeholder*='symbol']").first();
  await input.click();
  await input.fill("b");
  await page.waitForTimeout(600);
  await page.screenshot({ path: "artifacts/test_shield_map_b_autocomplete.png", fullPage: false });
  console.log("Captured test_shield_map_b_autocomplete.png");

  // Run scan for BTC
  await input.fill("BTC");
  await page.keyboard.press("Enter");
  console.log("Pressed Enter for BTC, waiting for result...");
  await page.waitForTimeout(3000);
  await page.screenshot({ path: "artifacts/test_shield_map_after_btc.png", fullPage: true });
  console.log("Captured test_shield_map_after_btc.png");

  await browser.close();
}

run().catch(console.error);
