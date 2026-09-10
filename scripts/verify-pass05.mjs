import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log("1. Navigating to /pl/security/audits...");
  await page.goto("http://localhost:3000/pl/security/audits", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // Dismiss cookie banner
  const cookieBtn = page.locator('button:has-text("Zezwól na wszystkie"), button:has-text("Tylko niezbędne")').first();
  if (await cookieBtn.isVisible()) {
    await cookieBtn.click();
    await page.waitForTimeout(500);
  }

  // 1. Capture audit form showing subtle grey border and "Rozpocznij audyt" button
  await page.screenshot({ path: "artifacts/pass05_audit_form.png" });
  console.log("Saved artifacts/pass05_audit_form.png");

  // 2. Focus input to verify clean focus state (no dark/murky grey effect)
  const input = page.locator('.audit-v4609-intake input');
  await input.click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: "artifacts/pass05_audit_input_focus.png" });
  console.log("Saved artifacts/pass05_audit_input_focus.png");

  // 3. Open Audits menu
  const menuTrigger = page.locator('button.audit-v4609-audits-trigger').first();
  await menuTrigger.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "artifacts/pass05_audit_menu.png" });
  console.log("Saved artifacts/pass05_audit_menu.png");

  // 4. Click "Sprawdź informacje" (or "Sprawdź zakres") to open Comparison Modal
  const checkInfoBtn = page.locator('button.audit-v4609-menu-info').first();
  await checkInfoBtn.click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: "artifacts/pass05_audit_modal_scope.png" });
  console.log("Saved artifacts/pass05_audit_modal_scope.png");

  // Close modal via Close button
  const closeBtn = page.locator('.audit-v4609-comparison header button').first();
  if (await closeBtn.isVisible()) {
    await closeBtn.click();
    await page.waitForTimeout(400);
  }

  // 5. Enter BSC contract and click "Rozpocznij audyt"
  await input.fill("0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c");
  await page.waitForTimeout(300);

  const startBtn = page.locator('.audit-v4609-intake button').first();
  await startBtn.click();
  await page.waitForTimeout(500);

  // Capture active generation modal
  await page.screenshot({ path: "artifacts/pass05_audit_generating.png" });
  console.log("Saved artifacts/pass05_audit_generating.png");

  // 6. Wait for transition to the post-gen report page
  console.log("Waiting for report navigation...");
  await page.waitForURL(/\/report\//, { timeout: 10000 });
  await page.waitForTimeout(1500);

  // Capture clean report page with only Audited Contract tile and minimalist risk indicator
  await page.screenshot({ path: "artifacts/pass05_audit_post_gen_report.png", fullPage: true });
  console.log("Saved artifacts/pass05_audit_post_gen_report.png");

  await browser.close();
  console.log("All PAS 05 screenshots captured successfully!");
}

run().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
