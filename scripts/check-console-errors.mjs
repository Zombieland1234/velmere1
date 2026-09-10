import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      console.log("CONSOLE ERROR:", msg.text());
    }
  });

  await page.goto("http://localhost:3000/pl/real-markets", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  const firstRow = page.locator(".realmarkets-pass578-grid").nth(1);
  await firstRow.click();
  await page.waitForTimeout(1000);

  const whaleTab = page.locator('button[role="tab"]:has-text("DUZI GRACZE"), button[role="tab"]:has-text("Gracze")').first();
  if (await whaleTab.count() > 0) {
    await whaleTab.click();
    await page.waitForTimeout(1000);
  }

  await browser.close();
  console.log("CHECK COMPLETED.");
}

main().catch(console.error);
