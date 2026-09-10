import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const consoleLogs = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleLogs.push(msg.text());
  });

  console.log("Navigating to http://localhost:3000/en/shield ...");
  await page.goto("http://localhost:3000/en/shield", { waitUntil: "networkidle" });

  try {
    const btn = page.locator('button:has-text("Allow all"), button:has-text("Necessary only"), button:has-text("Accept")').first();
    if (await btn.isVisible({ timeout: 2000 })) {
      await btn.click();
      console.log("Dismissed cookie banner");
    }
  } catch {}

  await page.waitForTimeout(1000);

  const rows = page.locator('[data-pass4577-shield-row="realmarkets-style-grid-row-click-opens-modal"]');
  const rowCount = await rows.count();
  console.log("SHIELD ROW COUNT:", rowCount);

  if (rowCount === 0) {
    console.log("Trying alternative selector: [role='row']");
    const anyRows = await page.locator('[role="row"]').count();
    console.log("ANY ROWS COUNT:", anyRows);
  }

  if (rowCount > 0) {
    const firstRowText = await rows.first().innerText();
    console.log("FIRST ROW TEXT PREVIEW:\n", firstRowText.split("\n").slice(0, 5).join(" | "));

    console.log("Clicking first row...");
    await rows.first().click();
    await page.waitForTimeout(1500);

    const modal = page.locator(".vlm-modal-backdrop, [role='dialog'], .vlm-analysis-result-surface, .vlm-analysis-reference-card").first();
    const modalVisible = await modal.isVisible();
    console.log("ASSET DETAIL MODAL VISIBLE:", modalVisible);

    if (modalVisible) {
      console.log("SUCCESS: Asset Detail Modal opened upon row click!");
      await page.screenshot({ path: "preview_screenshots/shield_modal_verified.png" });
      console.log("Captured shield_modal_verified.png");
    }
  }

  const searchInput = page.locator('input[placeholder*="Search token" i], input[type="search"]').first();
  if (await searchInput.isVisible()) {
    console.log("Testing search input with query: ETH");
    await searchInput.fill("ETH");
    await page.waitForTimeout(600);
    const ethRows = await rows.count();
    console.log("ROWS AFTER SEARCH 'ETH':", ethRows);
  }

  console.log("CONSOLE ERRORS:", consoleLogs);
  await browser.close();
}

run().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});
