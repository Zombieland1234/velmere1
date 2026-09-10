import { chromium } from "playwright";
import crypto from "node:crypto";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  
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
  const token = 'v2.' + encoded + '.' + hmac;
  
  await context.addCookies([{
    name: 'velmere_account_session',
    value: token,
    domain: 'localhost',
    path: '/'
  }]);
  
  const page = await context.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('response', async res => {
    if (res.url().includes('audit-intake')) {
      console.log('INTAKE STATUS:', res.status());
      try {
        console.log('INTAKE BODY:', await res.json());
      } catch (e) {
        console.log('INTAKE TEXT:', await res.text());
      }
    }
  });
  
  await page.goto('http://localhost:3000/en/security/audits', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  
  const cookieBtn = page.locator('button:has-text("Allow all"), button:has-text("Necessary only")').first();
  if (await cookieBtn.isVisible()) {
    await cookieBtn.click();
    await page.waitForTimeout(500);
  }
  
  const input = page.locator('.audit-v4609-intake input').first();
  await input.fill('0x55d398326f99059fF775485246999027B3197955');
  await page.waitForTimeout(500);
  
  const btn = page.locator('.audit-v4609-intake button').first();
  console.log("CLICKING SUBMIT BUTTON...");
  await btn.click();
  await page.waitForTimeout(3000);
  
  await browser.close();
}

run().catch(console.error);
