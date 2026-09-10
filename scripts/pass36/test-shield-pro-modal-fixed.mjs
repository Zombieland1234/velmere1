import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.goto("http://localhost:3000/pl/shield-pro", { waitUntil: "domcontentloaded" });
  
  const cookieBtn = page.locator('button:has-text("Tylko niezbędne"), button:has-text("Akceptuj"), button:has-text("Allow all")').first();
  if (await cookieBtn.isVisible()) await cookieBtn.click();

  console.log("Waiting for Bitcoin row on /pl/shield-pro...");
  await page.waitForTimeout(5000);
  const btcRow = page.locator('[data-pass4577-shield-row], tr, button:has-text("Bitcoin")').filter({ hasText: "Bitcoin" }).first();
  await btcRow.waitFor({ timeout: 15000 });
  
  console.log("Clicking Bitcoin row...");
  await btcRow.click();
  await page.waitForTimeout(4000);

  await page.screenshot({ path: "artifacts/forensic/screen_investigation/shield_pro_btc_modal_fixed.png", fullPage: false });
  console.log("Saved shield_pro_btc_modal_fixed.png");

  const bodyText = await page.innerText("body");
  console.log("BODY HAS PRICE:", /77[\s,.]\d{3}/.test(bodyText) || /USD/.test(bodyText));
  console.log("BODY HAS OHLC ERROR:", bodyText.includes("Źródło OHLC jest chwilowo niedostępne"));

  await browser.close();
}

run().catch(console.error);
