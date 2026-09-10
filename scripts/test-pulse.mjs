import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on("console", (msg) => console.log("PAGE:", msg.text()));
  page.on("pageerror", (err) => console.error("PAGE ERROR:", err));

  await page.goto("http://127.0.0.1:3000/en/shield/assets/bitcoin", { waitUntil: "networkidle" });
  
  const pulseBtn = page.locator('[data-testid="terminal-pulse-btn"]');
  console.log("Count:", await pulseBtn.count());
  console.log("Visible:", await pulseBtn.isVisible());
  
  await pulseBtn.click();
  await page.waitForTimeout(500);

  const btnClass = await pulseBtn.getAttribute("class");
  console.log("Pulse btn class:", btnClass);

  await page.screenshot({ path: "reports/screenshots/pulse_debug.png" });
  await browser.close();
}

main().catch(console.error);
