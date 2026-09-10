const { chromium } = require("playwright");

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
  await page.goto("http://localhost:3000/pl/research-lab", { waitUntil: "networkidle" });

  try {
    const btn = await page.$("button:has-text('AKCEPTUJ'), button:has-text('TYLKO NIEZBĘDNE')");
    if (btn) await btn.click();
    await page.waitForTimeout(500);
  } catch (e) {
    console.log("No cookie banner found or click failed");
  }

  await page.evaluate(() => window.scrollBy(0, 1100));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "artifacts/screenshot-research-lab-card-detail.png" });
  console.log("Saved card detail screenshot to artifacts/screenshot-research-lab-card-detail.png");

  // Mobile screenshot
  const mobilePage = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
  await mobilePage.goto("http://localhost:3000/pl/research-lab", { waitUntil: "networkidle" });
  try {
    const btn = await mobilePage.$("button:has-text('AKCEPTUJ'), button:has-text('TYLKO NIEZBĘDNE')");
    if (btn) await btn.click();
    await mobilePage.waitForTimeout(500);
  } catch (e) {}
  await mobilePage.evaluate(() => window.scrollBy(0, 1400));
  await mobilePage.waitForTimeout(1000);
  await mobilePage.screenshot({ path: "artifacts/screenshot-research-lab-card-mobile.png" });
  console.log("Saved mobile screenshot to artifacts/screenshot-research-lab-card-mobile.png");

  await browser.close();
}

main().catch(console.error);
