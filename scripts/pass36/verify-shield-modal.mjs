import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  console.log("Loading /pl/shield...");
  await page.goto("http://localhost:3000/pl/shield", { waitUntil: "domcontentloaded" });
  
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
  }

  console.log("Waiting for Bitcoin row on /pl/shield...");
  const btcName = page.locator('[role="row"] strong:has-text("Bitcoin")').first();
  await btcName.waitFor({ timeout: 30000 });
  await btcName.click({ force: true });
  console.log("Clicked Bitcoin name!");

  await page.waitForSelector('[role="dialog"], [aria-label*="Bitcoin"], .velmere-asset-modal-pass4612', { timeout: 15000 });
  await page.waitForTimeout(1500);

  await page.screenshot({ path: "artifacts/forensic/screen_investigation/shield_modal_verified.png" });
  console.log("Saved shield_modal_verified.png");

  // Read modal text
  const modalText = await page.locator('[role="dialog"]').innerText();
  console.log("MODAL TEXT (first 600):\n", modalText.slice(0, 600));

  await browser.close();
}

run().catch(console.error);
