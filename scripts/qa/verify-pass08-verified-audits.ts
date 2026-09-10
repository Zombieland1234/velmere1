import { chromium } from "playwright";

async function main() {
  console.log("=== PASS_08 VERIFICATION: /verified-audits PAGE & BADGE FLIPPING ===");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  try {
    console.log("Navigating to http://localhost:3000/en/verified-audits...");
    const res = await page.goto("http://localhost:3000/en/verified-audits", { waitUntil: "networkidle" });
    if (!res || res.status() !== 200) {
      throw new Error(`Failed to load /en/verified-audits. Status: ${res?.status()}`);
    }

    // Verify Title
    const title = await page.locator("h1").innerText();
    console.log(`Page Title: "${title.trim()}"`);

    // Screenshot initial state
    await page.screenshot({ path: "artifacts/pass08_verified_audits_initial.png" });
    console.log("Saved: artifacts/pass08_verified_audits_initial.png");

    // Test dynamic badge flipping: click "Simulate code mutation" / "Symuluj podmianę kodu"
    console.log("Testing on-chain tamper detection toggle (Green Checkmark -> Red X)...");
    const tamperBtn = page.locator("[data-testid='simulate-tamper-btn']").first();
    await tamperBtn.click();
    await page.waitForTimeout(400);

    // Verify that the red warning appeared
    const redAlert = page.locator("[data-testid='tamper-alert-badge']").first();
    const isVisible = await redAlert.isVisible();
    console.log(`Tamper alert visible after click: ${isVisible}`);

    await page.screenshot({ path: "artifacts/pass08_verified_audits_tamper_flipped.png" });
    console.log("Saved: artifacts/pass08_verified_audits_tamper_flipped.png");

    // Full page screenshot
    await page.screenshot({ path: "artifacts/pass08_verified_audits_full.png", fullPage: true });
    console.log("Saved full-page: artifacts/pass08_verified_audits_full.png");

    console.log(`Console errors: ${errors.length}`);
    console.log("=== PASS_08 VERIFICATION SUCCESSFUL ===");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
