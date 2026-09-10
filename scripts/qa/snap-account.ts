import { chromium } from "playwright";

async function snapAccount() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto("http://localhost:3000/en/account", { waitUntil: "networkidle" });
  await page.screenshot({ path: "artifacts/account_page_minimalist.png", fullPage: true });
  await browser.close();
  console.log("Captured artifacts/account_page_minimalist.png");
}

snapAccount();
