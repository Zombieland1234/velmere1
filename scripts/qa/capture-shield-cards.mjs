import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = "http://localhost:3000";
const OUT_DIR = "C:/Users/marci/.gemini/antigravity/brain/5d9638fe-a165-4c96-a423-199dbccaa838";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log("Navigating to shield pro...");
  await page.goto(BASE + "/pl/shield-pro", { waitUntil: "networkidle", timeout: 25000 });
  const acceptBtn = page.locator("button").filter({ hasText: /akceptuj/i }).first();
  if (await acceptBtn.isVisible()) {
    await acceptBtn.click();
    await page.waitForTimeout(400);
  }

  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT_DIR, "final_proof_05_shield_pro_6_cards.png") });
  console.log("Saved final_proof_05_shield_pro_6_cards.png");

  await browser.close();
}

main().catch(console.error);
