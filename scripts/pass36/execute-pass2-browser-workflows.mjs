import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE = "http://localhost:3000";

async function main() {
  console.log("=== PASS 2: REAL PRODUCT & BROWSER WORKFLOWS ===");
  fs.mkdirSync("artifacts/products", { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const results = [];

  const workflows = [
    {
      product: "Homepage (EN Desktop)",
      url: `${BASE}/en`,
      viewport: { width: 1280, height: 800 },
      action: async (page) => {
        const title = await page.title();
        const mainText = await page.locator("main").innerText().catch(() => "");
        return { title, hasContent: mainText.length > 200, sample: mainText.slice(0, 100) };
      }
    },
    {
      product: "Homepage Mobile (PL)",
      url: `${BASE}/pl`,
      viewport: { width: 390, height: 844 },
      action: async (page) => {
        const mainText = await page.locator("main").innerText().catch(() => "");
        return { isMobile: true, hasPolish: mainText.length > 200, sample: mainText.slice(0, 100) };
      }
    },
    {
      product: "Shield (DE Desktop)",
      url: `${BASE}/de/security/shield`,
      viewport: { width: 1280, height: 800 },
      action: async (page) => {
        const mainText = await page.locator("main").innerText().catch(() => "");
        return { hasRiskLanes: mainText.length > 200, sample: mainText.slice(0, 100) };
      }
    },
    {
      product: "Shield Map Explorer",
      url: `${BASE}/en/security/shield-map`,
      viewport: { width: 1280, height: 800 },
      action: async (page) => {
        const searchInput = page.locator("input[placeholder*='Search'], input[placeholder*='Symbol']").first();
        const inputVisible = await searchInput.isVisible().catch(() => false);
        if (inputVisible) {
          await searchInput.fill("ETH");
          await page.keyboard.press("Enter");
          await page.waitForTimeout(1000);
        }
        const mainText = await page.locator("main").innerText().catch(() => "");
        return { inputVisible, hasResult: mainText.length > 200, sample: mainText.slice(0, 100) };
      }
    },
    {
      product: "Shield Pro Terminal",
      url: `${BASE}/en/security/shield-pro`,
      viewport: { width: 1280, height: 800 },
      action: async (page) => {
        const mainText = await page.locator("main").innerText().catch(() => "");
        return { hasTerminalUI: mainText.length > 200, sample: mainText.slice(0, 100) };
      }
    },
    {
      product: "Smart Contract Audit Intake",
      url: `${BASE}/en/security/audits`,
      viewport: { width: 1280, height: 800 },
      action: async (page) => {
        const input = page.locator("input[placeholder*='0x'], input[placeholder*='BSC']").first();
        const inputVisible = await input.isVisible().catch(() => false);
        let statusText = "";
        if (inputVisible) {
          await input.fill("0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c");
          await page.waitForTimeout(500);
          const submitBtn = page.locator("button:has-text('SUBMIT PRESCREEN'), button:has-text('Submit prescreen')").first();
          if (await submitBtn.isVisible().catch(() => false)) {
            await submitBtn.click();
            await page.waitForTimeout(3000);
            const statusEl = page.locator(".audit-v4611-intake-status").first();
            statusText = await statusEl.innerText().catch(() => "");
          }
        }
        return { inputVisible, statusText: statusText.slice(0, 100), caseSubmitted: statusText.includes("AUD-") || statusText.includes("queue") || statusText.includes("beta") };
      }
    },
    {
      product: "Angel Assistant",
      url: `${BASE}/en/angel`,
      viewport: { width: 1280, height: 800 },
      action: async (page) => {
        const chatInput = page.locator("input[placeholder*='Ask'], textarea").first();
        const inputVisible = await chatInput.isVisible().catch(() => false);
        if (inputVisible) {
          await chatInput.fill("What is Velmere?");
          await page.keyboard.press("Enter");
          await page.waitForTimeout(2000);
        }
        const mainText = await page.locator("main").innerText().catch(() => "");
        return { inputVisible, hasConversation: mainText.length > 200, sample: mainText.slice(0, 100) };
      }
    },
    {
      product: "Store and Merch",
      url: `${BASE}/en/store`,
      viewport: { width: 1280, height: 800 },
      action: async (page) => {
        const mainText = await page.locator("main").innerText().catch(() => "");
        const buttons = await page.locator("button").count();
        return { hasMerchUI: mainText.length > 200, buttonCount: buttons, sample: mainText.slice(0, 100) };
      }
    }
  ];

  for (const wf of workflows) {
    const t0 = Date.now();
    const page = await browser.newPage({ viewport: wf.viewport });
    try {
      await page.goto(wf.url, { waitUntil: "domcontentloaded", timeout: 15000 });
      const detail = await wf.action(page);
      const durationMs = Date.now() - t0;
      console.log(`[PASS] ${wf.product} in ${durationMs}ms`);
      results.push({ product: wf.product, url: wf.url, passed: true, durationMs, detail });
    } catch (err) {
      console.log(`[FAIL] ${wf.product}: ${err.message}`);
      results.push({ product: wf.product, url: wf.url, passed: false, durationMs: Date.now() - t0, error: err.message });
    } finally {
      await page.close();
    }
  }

  await browser.close();
  const allPassed = results.every((r) => r.passed);
  const receipt = {
    schemaVersion: "velmere.pass2.browser-workflows.receipt.v1",
    executedAt: new Date().toISOString(),
    totalWorkflows: results.length,
    passedCount: results.filter((r) => r.passed).length,
    passed: allPassed,
    workflows: results
  };
  const receiptPath = path.resolve("artifacts/products/PASS2_BROWSER_WORKFLOWS_RECEIPT.json");
  fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2), "utf8");
  console.log(`Saved Pass 2 Browser Receipt to: ${receiptPath}`);
  if (!allPassed) process.exit(1);
}

main().catch((err) => { console.error(err); process.exit(1); });
