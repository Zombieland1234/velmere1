import { chromium } from "playwright";
import fs from "fs";
import path from "path";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const errors: { page: string; error: string }[] = [];
  page.on("console", msg => {
    if (msg.type() === "error") {
      errors.push({ page: page.url(), error: msg.text() });
    }
  });
  page.on("pageerror", err => {
    errors.push({ page: page.url(), error: err.message });
  });

  const routes = [
    { url: "http://localhost:3000/en", name: "home" },
    { url: "http://localhost:3000/en/security", name: "security" },
    { url: "http://localhost:3000/en/shield", name: "shield" },
    { url: "http://localhost:3000/en/real-markets", name: "real_markets" },
    { url: "http://localhost:3000/en/market-integrity", name: "market_integrity" },
    { url: "http://localhost:3000/en/shield-pro", name: "shield_pro" }
  ];

  const screenshotDir = path.join(process.cwd(), "artifacts/verification_screens");
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  for (const r of routes) {
    console.log(`Navigating to ${r.url}...`);
    try {
      await page.goto(r.url, { waitUntil: "networkidle", timeout: 20000 });
      await page.waitForTimeout(1500); // Allow animations to settle
      const shotPath = path.join(screenshotDir, `${r.name}.png`);
      await page.screenshot({ path: shotPath, fullPage: false });
      console.log(`Saved screenshot: ${shotPath}`);
    } catch (e: any) {
      console.error(`Error loading ${r.url}:`, e.message);
    }
  }

  // Mobile viewport test on /security and /real-markets
  await page.setViewportSize({ width: 390, height: 844 });
  for (const r of [
    { url: "http://localhost:3000/en/security", name: "security_mobile" },
    { url: "http://localhost:3000/en/real-markets", name: "real_markets_mobile" }
  ]) {
    try {
      await page.goto(r.url, { waitUntil: "networkidle", timeout: 20000 });
      await page.waitForTimeout(1000);
      const shotPath = path.join(screenshotDir, `${r.name}.png`);
      await page.screenshot({ path: shotPath, fullPage: false });
      console.log(`Saved mobile screenshot: ${shotPath}`);
    } catch (e: any) {
      console.error(`Error loading mobile ${r.url}:`, e.message);
    }
  }

  await browser.close();

  console.log("\n--- CONSOLE / PAGE ERRORS SUMMARY ---");
  console.log(`Total console/page errors detected: ${errors.length}`);
  for (const err of errors) {
    console.log(`[${err.page}]: ${err.error}`);
  }
}

main().catch(err => {
  console.error("Execution failed:", err);
  process.exit(1);
});
