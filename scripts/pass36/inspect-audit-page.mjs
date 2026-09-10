import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  console.log("Navigating to http://localhost:3000/en/security/audits...");
  await page.goto("http://localhost:3000/en/security/audits", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  
  const cookieBtn = page.locator('button:has-text("Allow all"), button:has-text("Necessary only")').first();
  if (await cookieBtn.isVisible()) {
    await cookieBtn.click();
    await page.waitForTimeout(500);
  }
  
  await page.screenshot({ path: "artifacts/forensic/screen_investigation/audit_clean_page.png", fullPage: true });
  console.log("Screenshot saved to artifacts/forensic/screen_investigation/audit_clean_page.png");
  await browser.close();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
