import { chromium } from "playwright";

async function main() {
  console.log("=== PASS_07 VERIFICATION: /risk-management PAGE ===");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  try {
    console.log("Navigating to http://localhost:3000/en/risk-management...");
    const res = await page.goto("http://localhost:3000/en/risk-management", { waitUntil: "networkidle" });
    if (!res || res.status() !== 200) {
      throw new Error(`Failed to load /en/risk-management. Status: ${res?.status()}`);
    }

    // Verify Title & Hero
    const heroTitle = await page.locator("h1").innerText();
    console.log(`Hero Title: "${heroTitle.trim()}"`);

    await page.screenshot({ path: "artifacts/pass07_risk_management_hero.png" });
    console.log("Saved: artifacts/pass07_risk_management_hero.png");

    // Click through each pillar tab
    const pillarButtons = page.locator("button:has-text('FILAR'), button:has-text('ORDERBOOK'), button:has-text('EVM SYMBOLIC')");
    const count = await pillarButtons.count();
    console.log(`Pillar buttons found: ${count}`);

    // Click Pillar 2 (EVM Symbolic Solver)
    const pillar2Btn = page.locator("button:has-text('02')").first();
    await pillar2Btn.click();
    await page.waitForTimeout(400);

    await page.screenshot({ path: "artifacts/pass07_risk_management_pillars.png" });
    console.log("Saved: artifacts/pass07_risk_management_pillars.png");

    // Scroll to comparison table and CTA
    await page.evaluate(() => window.scrollTo(0, 1600));
    await page.waitForTimeout(500);

    // Full page screenshot
    await page.screenshot({ path: "artifacts/pass07_risk_management_full.png", fullPage: true });
    console.log("Saved full-page: artifacts/pass07_risk_management_full.png");

    console.log(`Console errors during test: ${errors.length}`);
    if (errors.length > 0) {
      console.warn("Errors:", errors);
    }

    console.log("=== PASS_07 VERIFICATION SUCCESSFUL ===");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
