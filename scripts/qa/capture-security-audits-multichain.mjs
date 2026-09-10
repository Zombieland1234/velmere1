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

  console.log("1. Navigating to /pl/security/audits...");
  await page.goto(`${BASE}/pl/security/audits`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(1000);

  // Click on "+ Wklej własny bytecode EVM" to expand drawer
  const drawerBtn = page.getByText(/Wklej własny bytecode/i).first();
  if (await drawerBtn.count() > 0) {
    await drawerBtn.click();
    await page.waitForTimeout(400);
  }

  const portalShot = path.join(ARTIFACTS_DIR, "multichain_audit_portal.png");
  await page.screenshot({ path: portalShot, fullPage: false });
  console.log(`Saved portal screenshot to ${portalShot}`);

  console.log("2. Navigating to live DAI report on Ethereum Mainnet...");
  const daiUrl = `${BASE}/pl/security/audits/report/0x6b175474e89094c44da98b954eedeac495271d0f?address=0x6b175474e89094c44da98b954eedeac495271d0f&tier=advanced&chainId=1&name=Dai+Stablecoin`;
  await page.goto(daiUrl, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(1200);

  const daiShot = path.join(ARTIFACTS_DIR, "canonical_report_live_dai.png");
  await page.screenshot({ path: daiShot, fullPage: false });
  console.log(`Saved DAI report screenshot to ${daiShot}`);

  await browser.close();
  console.log("Capture completed successfully.");
}

main().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
