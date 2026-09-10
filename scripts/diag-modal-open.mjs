import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto("http://localhost:3000/en/real-markets", { waitUntil: "networkidle" });
  
  const assetRow = page.locator("div[aria-label$='full chart and analysis']").first();
  console.log("Asset row found count:", await assetRow.count());
  console.log("Asset row aria-label:", await assetRow.getAttribute("aria-label"));

  await assetRow.click();
  await page.waitForTimeout(1500);

  const tabs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("[id*='vlm-asset-detail-tab']")).map(e => ({ id: e.id, text: e.innerText.trim() }));
  });
  console.log("Tabs found:", tabs);

  const canvasCount = await page.locator("canvas").count();
  console.log("Canvas count in modal:", canvasCount);

  await browser.close();
}

main().catch(console.error);



