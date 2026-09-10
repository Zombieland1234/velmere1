import { chromium } from "playwright";
import { captureRgAuditAndBrowser } from "./capture_rg_part1";
import { captureRgShieldAndMarkets } from "./capture_rg_part2";

async function main() {
  console.log("=== CAPTURING RELEASE GATE SCREENSHOTS ===");
  const browser = await chromium.launch({ headless: true });
  try {
    await captureRgAuditAndBrowser(browser);
    await captureRgShieldAndMarkets(browser);
    console.log("=== ALL RELEASE GATE SCREENSHOTS CAPTURED SUCCESSFULLY ===");
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
