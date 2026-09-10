import { chromium } from "playwright";
import crypto from "node:crypto";

function makeSessionCookie() {
  const secret = 'velmere-local-preview-account-session-secret-not-for-production';
  const now = Date.now();
  const session = {
    accountId: 'preview:test-auditor-1',
    displayName: 'Test Auditor',
    handle: '@test.auditor',
    email: 'auditor@example.com',
    provider: 'preview',
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + 86400000).toISOString(),
    passId: 'pass2363-supabase-auth-google-account-spine'
  };

  const encoded = Buffer.from(JSON.stringify(session)).toString('base64url');
  const hmac = crypto.createHmac('sha256', secret).update('v2.' + encoded, 'utf8').digest('base64url');
  return 'v2.' + encoded + '.' + hmac;
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  
  // Set auth cookie
  await context.addCookies([{
    name: "velmere_account_session",
    value: makeSessionCookie(),
    domain: "localhost",
    path: "/",
    httpOnly: true,
    sameSite: "Lax"
  }]);
  
  const page = await context.newPage();
  console.log("Navigating to http://localhost:3000/en/security/audits...");
  await page.goto("http://localhost:3000/en/security/audits", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  
  const cookieBtn = page.locator('button:has-text("Allow all"), button:has-text("Necessary only")').first();
  if (await cookieBtn.isVisible()) {
    await cookieBtn.click();
    await page.waitForTimeout(500);
  }
  
  const input = page.locator('input[placeholder*="BSC contract address"], input[type="text"]').first();
  console.log("Entering BSC USDT address...");
  await input.fill("0x55d398326f99059fF775485246999027B3197955");
  await page.waitForTimeout(500);
  
  const submitBtn = page.locator('button:has-text("SUBMIT PRESCREEN"), button[type="submit"]').first();
  console.log("Clicking submit...");
  await submitBtn.click();
  await page.waitForTimeout(3000);
  
  await page.screenshot({ path: "artifacts/forensic/screen_investigation/audit_prescreen_submitted.png", fullPage: true });
  console.log("Screenshot saved to artifacts/forensic/screen_investigation/audit_prescreen_submitted.png");
  await browser.close();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
