import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.goto("http://localhost:3000/pl/shield-pro", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  
  // Click first row
  await page.locator("tbody tr").first().click();
  await page.waitForTimeout(1000);
  
  const modal = page.locator(".vlm-asset-detail-modal, [role='dialog']").first();
  console.log("Modal visible:", await modal.isVisible());
  
  const tierBtns = modal.locator("button:has-text('Uruchom')");
  const count = await tierBtns.count();
  console.log("Tier action buttons count:", count);
  for (let i = 0; i < count; i++) {
    console.log(`Button ${i}:`, (await tierBtns.nth(i).innerText()).trim().replace(/\n/g, " "));
  }

  // Click each tier button to check functionality
  if (count > 0) {
    console.log("Clicking button 0 (Basic)...");
    await tierBtns.nth(0).click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: "audit_artifacts/tier_basic_active.png" });
  }

  if (count > 1) {
    console.log("Clicking button 1 (Pro)...");
    await tierBtns.nth(1).click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: "audit_artifacts/tier_pro_active.png" });
  }

  if (count > 2) {
    console.log("Clicking button 2 (Advanced)...");
    await tierBtns.nth(2).click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: "audit_artifacts/tier_advanced_active.png" });
  }

  // Check if PDF export / download button is present
  const pdfButtons = modal.locator("button:has-text('PDF'), button:has-text('Pobierz'), a:has-text('PDF')");
  const pdfCount = await pdfButtons.count();
  console.log("PDF action buttons found:", pdfCount);
  for (let i = 0; i < pdfCount; i++) {
    console.log(`PDF Button ${i}:`, (await pdfButtons.nth(i).innerText()).trim());
  }

  await browser.close();
  console.log("Modal tier audit complete.");
}

main().catch(console.error);
