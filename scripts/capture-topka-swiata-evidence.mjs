import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = "http://localhost:3000";
const OUT_DIR = "C:\\Users\\marci\\Desktop\\Nowy folder\\artifacts";
fs.mkdirSync(OUT_DIR, { recursive: true });

async function dismissCookieBanner(page) {
  try {
    const acceptBtn = page.locator("button", { hasText: /AKCEPTUJĘ|TYLKO NIEZBĘDNE/i }).first();
    if (await acceptBtn.isVisible({ timeout: 2000 })) {
      await acceptBtn.click();
      await page.waitForTimeout(500);
    }
  } catch (e) {
    // ignore if not found
  }
}

async function main() {
  console.log("=== CAPTURING TOPKA ŚWIATA EVIDENCE SCREENSHOTS (UNOBSTRUCTED) ===");
  const browser = await chromium.launch({ headless: true });
  
  // 1. Desktop 1440x950
  const context = await browser.newContext({
    viewport: { width: 1440, height: 950 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  console.log("[1/4] Navigating to /pl/research-lab...");
  await page.goto(`${BASE}/pl/research-lab`, { waitUntil: "networkidle", timeout: 25000 });
  await dismissCookieBanner(page);

  // Scroll to the card
  const card = page.locator("article").filter({ hasText: /Velmère/i }).first();
  if ((await card.count()) > 0) {
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
  }
  await page.screenshot({
    path: path.join(OUT_DIR, "screenshot-topka-research-lab-8-algos-desktop.png"),
    fullPage: false,
  });
  console.log("✓ Saved screenshot-topka-research-lab-8-algos-desktop.png");

  // 2. Switch to Live Sandbox on VSCS
  console.log("[2/4] Activating Live Sandbox mode and VSCS...");
  const vscsTab = page.getByRole("button", { name: /VSCS/i }).first();
  if ((await vscsTab.count()) > 0) {
    await vscsTab.click();
    await page.waitForTimeout(400);
  }

  const sandboxBtn = page.getByRole("button", { name: /Live Sandbox/i }).first();
  if ((await sandboxBtn.count()) > 0) {
    await sandboxBtn.click();
    await page.waitForTimeout(600);
  }

  if ((await card.count()) > 0) {
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
  }

  await page.screenshot({
    path: path.join(OUT_DIR, "screenshot-topka-research-lab-sandbox-vscs.png"),
    fullPage: false,
  });
  console.log("✓ Saved screenshot-topka-research-lab-sandbox-vscs.png");

  // 3. Switch to VLDS algorithm in Sandbox
  console.log("[3/4] Testing VLDS algorithm in Sandbox...");
  const vldsTab = page.getByRole("button", { name: /VLDS/i }).first();
  if ((await vldsTab.count()) > 0) {
    await vldsTab.click();
    await page.waitForTimeout(600);
  }

  if ((await card.count()) > 0) {
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
  }

  await page.screenshot({
    path: path.join(OUT_DIR, "screenshot-topka-research-lab-sandbox-vlds.png"),
    fullPage: false,
  });
  console.log("✓ Saved screenshot-topka-research-lab-sandbox-vlds.png");

  // 4. Mobile 390x844
  console.log("[4/4] Capturing Mobile Viewport (390x844)...");
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto(`${BASE}/pl/research-lab`, { waitUntil: "networkidle", timeout: 25000 });
  await dismissCookieBanner(mobilePage);

  const mobileCard = mobilePage.locator("article").filter({ hasText: /Velmère/i }).first();
  if ((await mobileCard.count()) > 0) {
    await mobileCard.scrollIntoViewIfNeeded();
    await mobilePage.waitForTimeout(600);
  }

  await mobilePage.screenshot({
    path: path.join(OUT_DIR, "screenshot-topka-research-lab-mobile-390.png"),
    fullPage: false,
  });
  console.log("✓ Saved screenshot-topka-research-lab-mobile-390.png");

  await browser.close();
  console.log("=== ALL TOPKA ŚWIATA EVIDENCE SCREENSHOTS CAPTURED WITH ZERO OVERLAYS ===");
}

main().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
