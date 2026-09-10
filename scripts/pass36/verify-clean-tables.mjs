import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1080 } });
  
  // Set cookie consent before navigation so modal never shows
  await page.context().addCookies([
    { name: "velmere_cookie_consent", value: "all", domain: "localhost", path: "/" },
    { name: "velmere-cookie-consent", value: "accepted", domain: "localhost", path: "/" },
    { name: "cookie_consent", value: "true", domain: "localhost", path: "/" }
  ]);

  console.log("Navigating to /pl/shield-pro...");
  await page.goto("http://localhost:3000/pl/shield-pro", { waitUntil: "domcontentloaded" });
  
  // Dismiss cookie modal if still present
  try {
    const btn = page.locator('button:has-text("Akceptuję"), button:has-text("Tylko niezbędne")').first();
    if (await btn.isVisible({ timeout: 2000 })) await btn.click();
  } catch {}

  await page.waitForSelector('tr:has-text("Bitcoin")', { timeout: 30000 });
  await page.waitForTimeout(2000);

  await page.screenshot({ path: "artifacts/forensic/screen_investigation/shield_pro_clean_table.png" });
  console.log("Saved shield_pro_clean_table.png");

  // Inspect top 8 rows
  const rows = await page.locator("tbody tr").slice(0, 8).all();
  for (let i = 0; i < rows.length; i++) {
    const text = await rows[i].innerText();
    const firstLine = text.split("\n")[0];
    const img = rows[i].locator(".velmere-asset-logo img");
    const hasImg = await img.count() > 0;
    const src = hasImg ? await img.getAttribute("src") : "NO_IMG";
    console.log(`Row ${i}: ${firstLine} -> ${src}`);
  }

  // Now navigate to /pl/shield
  console.log("Navigating to /pl/shield...");
  await page.goto("http://localhost:3000/pl/shield", { waitUntil: "domcontentloaded" });
  try {
    const btn = page.locator('button:has-text("Akceptuję"), button:has-text("Tylko niezbędne")').first();
    if (await btn.isVisible({ timeout: 2000 })) await btn.click();
  } catch {}

  await page.waitForSelector('tr:has-text("Bitcoin")', { timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "artifacts/forensic/screen_investigation/shield_clean_table.png" });
  console.log("Saved shield_clean_table.png");

  await browser.close();
}

run().catch(console.error);
