import { chromium } from "playwright";
import path from "node:path";

const BASE = "http://localhost:3000";
const ARTIFACTS_DIR = "C:\\Users\\marci\\.gemini\\antigravity\\brain\\5d9638fe-a165-4c96-a423-199dbccaa838";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 950 },
  });
  const page = await context.newPage();

  console.log("Navigating to /pl/security/audits...");
  await page.goto(`${BASE}/pl/security/audits`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(800);

  // Dismiss cookie banner
  const cookieBtn = page.getByRole("button", { name: /Tylko niezbędne/i }).first();
  if (await cookieBtn.count() > 0) {
    await cookieBtn.click();
    await page.waitForTimeout(400);
  }

  // Click on "Audyty ↯" dropdown
  const auditsTrigger = page.locator(".audit-v4609-audits-trigger").first();
  await auditsTrigger.click();
  await page.waitForTimeout(400);

  // Click on "Sprawdź informacje"
  const checkInfoBtn = page.locator(".audit-v4609-menu-info").first();
  await checkInfoBtn.click();
  await page.waitForTimeout(600);

  // Switch to "Velmère vs Światowi Liderzy" tab
  const industryTab = page.getByText(/Velmère vs Światowi Liderzy/i).first();
  if (await industryTab.count() > 0) {
    await industryTab.click();
    await page.waitForTimeout(600);
  }

  const modalShot = path.join(ARTIFACTS_DIR, "audits_industry_leaders_modal.png");
  await page.screenshot({ path: modalShot, fullPage: false });
  console.log(`Saved screenshot to ${modalShot}`);

  // Scroll modal table-wrap down to reveal Case Study callout
  await page.locator(".audit-v4609-table-wrap").evaluate((el) => {
    el.scrollTop = 400;
  });
  await page.waitForTimeout(400);

  const modalScrolledShot = path.join(ARTIFACTS_DIR, "audits_industry_leaders_scrolled.png");
  await page.screenshot({ path: modalScrolledShot, fullPage: false });
  console.log(`Saved scrolled screenshot to ${modalScrolledShot}`);

  await browser.close();
}

main().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
