import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.goto("http://localhost:3000/pl/shield-pro", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: "artifacts/forensic/screen_investigation/shield_pro_raw_state.png" });
  console.log("Captured shield_pro_raw_state.png");
  
  const text = await page.innerText("body");
  console.log("VISIBLE TEXT SNIPPET:\n", text.slice(0, 500));
  await browser.close();
}

run().catch(console.error);
