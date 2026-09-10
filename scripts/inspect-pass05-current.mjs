import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  console.log("Navigating to /pl/security/audits...");
  await page.goto("http://localhost:3000/pl/security/audits", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  // Accept cookies if present
  const cookieBtn = page.locator('button:has-text("Zezwól na wszystkie"), button:has-text("Tylko niezbędne")').first();
  if (await cookieBtn.isVisible()) {
    await cookieBtn.click();
    await page.waitForTimeout(500);
  }

  await page.screenshot({ path: "artifacts/pass05_current_audits_page.png", fullPage: true });
  console.log("Saved artifacts/pass05_current_audits_page.png");

  // Click on Audits menu dropdown
  const auditsBtn = page.locator('button.audit-v4609-audits-trigger').first();
  if (await auditsBtn.isVisible()) {
    await auditsBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: "artifacts/pass05_current_menu_open.png" });
    console.log("Saved artifacts/pass05_current_menu_open.png");

    // Click "Sprawdź zakres" inside menu
    const checkInfoBtn = page.locator('button.audit-v4609-menu-info').first();
    if (await checkInfoBtn.isVisible()) {
      console.log("Clicking Sprawdź zakres...");
      await checkInfoBtn.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: "artifacts/pass05_current_modal_clicked.png" });
      console.log("Saved artifacts/pass05_current_modal_clicked.png");
    }
  }

  // Now navigate to report page
  console.log("Navigating to report page...");
  await page.goto("http://localhost:3000/pl/security/audits/report/0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "artifacts/pass05_current_report_page.png", fullPage: true });
  console.log("Saved artifacts/pass05_current_report_page.png");

  await browser.close();
}

main().catch(console.error);
