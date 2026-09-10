import { chromium } from "playwright";
import crypto from "node:crypto";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  
  const authRes = await context.request.post('http://localhost:3000/api/auth/session', {
    data: { provider: 'preview', email: 'auditor@example.com', displayName: 'Test Auditor' }
  });
  const cookieHeader = authRes.headers()['set-cookie'];
  const match = cookieHeader.match(/velmere_account_session=([^;]+)/);
  if (match) {
    await context.addCookies([{
      name: 'velmere_account_session',
      value: match[1],
      url: 'http://localhost:3000'
    }]);
  }
  
  const page = await context.newPage();
  console.log("Navigating to http://localhost:3000/en/account?tab=audits&caseRef=AUD-BA1B2411A5...");
  await page.goto("http://localhost:3000/en/account?tab=audits&caseRef=AUD-BA1B2411A5", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  
  const cookieBtn = page.locator('button:has-text("Allow all"), button:has-text("Necessary only")').first();
  if (await cookieBtn.isVisible()) {
    await cookieBtn.click();
    await page.waitForTimeout(500);
  }
  
  await page.screenshot({ path: "artifacts/forensic/screen_investigation/account_audits_portal.png", fullPage: true });
  console.log("Screenshot saved to artifacts/forensic/screen_investigation/account_audits_portal.png");
  await browser.close();
}

run().catch(console.error);
