import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  console.log("Loading /pl/shield-pro...");
  await page.goto("http://localhost:3000/pl/shield-pro", { waitUntil: "domcontentloaded" });
  
  // Set localStorage and dismiss banner
  await page.evaluate(() => {
    try {
      const now = new Date();
      const consent = {
        schemaVersion: "velmere.browser-consent-choice.v2",
        policyVersion: "2026-07-30",
        decidedAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + 180 * 86400000).toISOString(),
        necessary: true,
        analytics: false,
        marketing: false,
        source: "user_choice",
        legalProof: false,
        serverRecorded: false
      };
      localStorage.setItem("velmere_cookie_consent_v2", JSON.stringify(consent));
    } catch {}
  });

  const cookieBtn = page.locator('button:has-text("TYLKO NIEZBĘDNE"), button:has-text("AKCEPTUJĘ")').first();
  if (await cookieBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await cookieBtn.click();
    console.log("Dismissed cookie banner");
  }

  await page.waitForSelector('tr:has-text("Bitcoin")', { timeout: 30000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "artifacts/forensic/screen_investigation/shield_pro_perfect.png" });
  console.log("Saved shield_pro_perfect.png");

  console.log("Loading /pl/shield...");
  await page.goto("http://localhost:3000/pl/shield", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('tr:has-text("Bitcoin")', { timeout: 30000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "artifacts/forensic/screen_investigation/shield_perfect.png" });
  console.log("Saved shield_perfect.png");

  await browser.close();
}

run().catch(console.error);
