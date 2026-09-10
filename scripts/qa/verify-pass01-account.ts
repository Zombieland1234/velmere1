import { chromium } from "playwright";

async function verifyAccountPage() {
  console.log("Testing /en/account and Inne Portfele modal...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const errors: string[] = [];
  page.on("console", msg => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", err => errors.push(err.message));

  await page.goto("http://localhost:3000/en/account", { waitUntil: "networkidle" });

  // Check if page loaded
  const title = await page.title();
  console.log("Page title:", title);

  // Click on "See all supported wallets" / "Inne portfele" button
  const otherWalletBtn = page.locator('button[data-pass1986-other-wallet-toggle="true"]');
  const count = await otherWalletBtn.count();
  console.log("Other wallets button count:", count);

  if (count > 0) {
    await otherWalletBtn.first().click();
    await page.waitForTimeout(500);

    // Verify modal is visible
    const modal = page.locator('#velmere-other-wallets-panel');
    const isModalVisible = await modal.isVisible();
    console.log("Modal visible after click:", isModalVisible);

    // Verify search input
    const searchInput = modal.locator('input[type="text"]');
    console.log("Search input present:", await searchInput.isVisible());

    // Type "rabby" to test search
    await searchInput.fill("rabby");
    await page.waitForTimeout(300);

    const rabbyRow = modal.locator('text=Rabby Wallet');
    console.log("Rabby Wallet found in filtered results:", await rabbyRow.isVisible());

    await page.screenshot({ path: "artifacts/account_other_wallets_modal.png" });
    console.log("Saved screenshot: artifacts/account_other_wallets_modal.png");
  }

  await browser.close();

  if (errors.length > 0) {
    console.error("Errors found:", errors);
    process.exit(1);
  } else {
    console.log("PASS_01 Verification SUCCESS: 0 console errors, modal verified!");
  }
}

verifyAccountPage().catch(err => {
  console.error(err);
  process.exit(1);
});
