import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.goto("http://localhost:3000/pl/shield-pro", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  
  await page.locator("tbody tr").first().click();
  await page.waitForTimeout(1000);
  
  await page.locator("#vlm-asset-detail-tab-analysis").click();
  await page.waitForTimeout(1000);

  // Test Pro card
  const proCard = page.locator(".vlm-analysis-tier-card[data-tier='pro']");
  console.log("Pro tier card visible:", await proCard.isVisible());
  if (await proCard.isVisible()) {
    console.log("Clicking Pro card...");
    await proCard.click();
    await page.waitForSelector("[data-analysis-status='success']", { timeout: 15000 })
      .catch(e => console.log("Pro wait timeout:", e.message));
    await page.waitForTimeout(1500);
    await page.screenshot({ path: "audit_artifacts/pro_analysis_success.png" });
    const count = await page.locator(".vlm-analysis-signal-tile").count();
    console.log("Pro signals rendered:", count);
  }

  // Back to selection and test Advanced card
  const backBtn = page.locator("button:has-text('Wróć'), button:has-text('Back')");
  if (await backBtn.isVisible()) {
    await backBtn.click();
    await page.waitForTimeout(1000);
    const advCard = page.locator(".vlm-analysis-tier-card[data-tier='advanced']");
    console.log("Advanced card visible:", await advCard.isVisible());
    if (await advCard.isVisible()) {
      console.log("Clicking Advanced card...");
      await advCard.click();
      await page.waitForSelector("[data-analysis-status='success']", { timeout: 20000 })
        .catch(e => console.log("Adv wait timeout:", e.message));
      await page.waitForTimeout(1500);
      await page.screenshot({ path: "audit_artifacts/adv_analysis_success.png" });
      const advCount = await page.locator(".vlm-analysis-signal-tile").count();
      console.log("Advanced signals rendered:", advCount);
    }
  }

  await browser.close();
  console.log("Pro & Advanced audit done.");
}

main().catch(console.error);
