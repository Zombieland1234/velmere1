import { chromium } from "playwright";

async function debug() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  page.on("console", (msg) => console.log("PAGE LOG:", msg.type(), msg.text()));
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  page.on("response", (res) => {
    if (res.url().includes("investigator")) {
      console.log("NETWORK:", res.status(), res.url());
    }
  });

  await page.goto("http://localhost:3000/pl/shield-map", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  const input = page.locator("input[data-testid='shield-map-search']").first();
  await input.click();
  await input.fill("BTC");
  await page.waitForTimeout(500);

  const scanBtn = page.locator("button[data-tone='gold']:has-text('Skanuj')").first();
  console.log("Scan button visible:", await scanBtn.isVisible());
  console.log("Scan button disabled:", await scanBtn.isDisabled());
  
  await scanBtn.click();
  console.log("Clicked scan button...");
  await page.waitForTimeout(5000);

  await page.screenshot({ path: "artifacts/debug_btc.png", fullPage: true });
  console.log("Captured artifacts/debug_btc.png");

  await browser.close();
}

debug().catch(console.error);
