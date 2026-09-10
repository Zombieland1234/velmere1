import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto("http://localhost:3000/en/security/audits", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  
  const selectedPlanText = await page.locator('.audit-v4610-selected-plan').innerText();
  console.log("INITIAL SELECTED PLAN:", selectedPlanText);
  
  const input = page.locator('input').first();
  await input.fill("0x55d398326f99059fF775485246999027B3197955");
  await page.waitForTimeout(500);
  
  const submitBtn = page.locator('.audit-v4609-intake-bar button').first();
  console.log("SUBMIT BTN TEXT:", await submitBtn.innerText());
  console.log("SUBMIT BTN DISABLED:", await submitBtn.isDisabled());
  
  await submitBtn.click();
  await page.waitForTimeout(1000);
  
  const meta = await page.locator(".audit-v4609-intake-meta").innerText();
  console.log("META AFTER CLICK:", meta);
  
  await browser.close();
}

run().catch(console.error);
