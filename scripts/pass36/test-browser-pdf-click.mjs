import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("http://localhost:3000/en/browser", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  const cookieBtn = page.locator('button:has-text("Necessary only"), button:has-text("Allow all")').first();
  if (await cookieBtn.isVisible()) await cookieBtn.click();

  const searchInput = page.locator('input[type="search"], input').first();
  await searchInput.fill("BTC");
  await searchInput.press("Enter");
  await page.waitForTimeout(2500);

  const pdfBtn = page.locator('button:has-text("OPEN PDF"), button:has-text("Open PDF")').first();
  console.log("PDF BTN VISIBLE:", await pdfBtn.isVisible());
  if (await pdfBtn.isVisible()) {
    await pdfBtn.click();
    await page.waitForTimeout(2500);
    await page.screenshot({ path: "artifacts/forensic/screen_investigation/browser_btc_pdf_preview.png", fullPage: true });
    console.log("Saved browser_btc_pdf_preview.png");
    const text = await page.innerText("body");
    console.log("PAGE TEXT CONTAINS REPORT:", text.includes("Report") || text.includes("Bitcoin") || text.includes("PDF"));
  }
  await browser.close();
}

run().catch(console.error);
