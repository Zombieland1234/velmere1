import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.goto("http://localhost:3000/pl/shield-pro", { waitUntil: "domcontentloaded" });
  
  const cookieBtn = page.locator('button:has-text("Tylko niezbędne"), button:has-text("Akceptuj"), button:has-text("Allow all")').first();
  if (await cookieBtn.isVisible()) await cookieBtn.click();

  console.log("Waiting for table rows on /pl/shield-pro...");
  await page.waitForSelector('tr:has-text("Bitcoin")', { timeout: 25000 });
  await page.waitForTimeout(2000);

  const text = await page.innerText("body");
  console.log("BODY AFTER LOAD:\n", text.slice(0, 1200));

  await page.screenshot({ path: "artifacts/forensic/screen_investigation/shield_pro_kpis_fixed.png", fullPage: false });
  console.log("Saved shield_pro_kpis_fixed.png");

  await browser.close();
}

run().catch(console.error);
