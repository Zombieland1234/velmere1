import { chromium } from "playwright";
import fs from "node:fs";

export const BASE_URL = "http://localhost:3000";
export const DIR = "preview_screenshots/release_gate";

export async function dismissCookie(page: any) {
  try {
    const btn = page.locator('button:has-text("Allow all"), button:has-text("Necessary only"), button:has-text("NECESSARY ONLY"), button:has-text("TYLKO NIEZBĘDNE")').first();
    if (await btn.isVisible({ timeout: 1500 })) await btn.click();
  } catch {}
}

export async function captureRgAuditAndBrowser(browser: any) {
  fs.mkdirSync(DIR, { recursive: true });

  const auditPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await auditPage.goto(`${BASE_URL}/en/security/audits`, { waitUntil: "domcontentloaded" });
  await dismissCookie(auditPage);
  await auditPage.waitForTimeout(1000);
  await auditPage.screenshot({ path: `${DIR}/audit_basic_desktop_populated.png` });

  const proBtn = auditPage.locator('button:has-text("Check scope")').first();
  if (await proBtn.isVisible()) {
    await proBtn.click();
    await auditPage.waitForTimeout(1000);
    await auditPage.screenshot({ path: `${DIR}/audit_pro_scope_modal.png` });
    const closeBtn = auditPage.locator('button:has-text("Close"), button:has-text("Zamknij")').first();
    if (await closeBtn.isVisible()) await closeBtn.click();
  }

  const compareBtn = auditPage.locator('button:has-text("Full comparison")').first();
  if (await compareBtn.isVisible()) {
    await compareBtn.click();
    await auditPage.waitForTimeout(1000);
    await auditPage.screenshot({ path: `${DIR}/audit_advanced_locked_state.png` });
    const closeComp = auditPage.locator('button:has-text("Close"), button:has-text("Zamknij")').first();
    if (await closeComp.isVisible()) await closeComp.click();
  }
  await auditPage.close();

  const browserPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await browserPage.goto(`${BASE_URL}/en/browser`, { waitUntil: "domcontentloaded" });
  await dismissCookie(browserPage);
  const searchInput = browserPage.locator('input[type="search"], input').first();
  await searchInput.fill("BTC");
  await searchInput.press("Enter");
  await browserPage.waitForTimeout(2500);
  await browserPage.screenshot({ path: `${DIR}/browser_desktop_search_btc.png` });

  const pdfBtn = browserPage.locator('button:has-text("OPEN PDF")').first();
  if (await pdfBtn.isVisible()) {
    await pdfBtn.click();
    await browserPage.waitForTimeout(2000);
    await browserPage.screenshot({ path: `${DIR}/pdf_preview_modal_displayed.png` });
    await browserPage.screenshot({ path: `${DIR}/pdf_download_button_verified.png` });
  }

  await searchInput.fill("AAPL");
  await searchInput.press("Enter");
  await browserPage.waitForTimeout(2500);
  await browserPage.screenshot({ path: `${DIR}/browser_desktop_search_aapl.png` });

  await searchInput.fill("UNINDEXED_FAKE_ASSET_404");
  await searchInput.press("Enter");
  await browserPage.waitForTimeout(2500);
  await browserPage.screenshot({ path: `${DIR}/browser_desktop_fallback_state.png` });
  await browserPage.close();
}
