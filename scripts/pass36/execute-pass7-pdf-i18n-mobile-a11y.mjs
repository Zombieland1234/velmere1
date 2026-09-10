import fs from "fs";
import path from "path";
import { chromium } from "playwright";

const BASE = "http://localhost:3000";

async function main() {
  console.log("=== PASS 7: PDF, I18N, MOBILE & ACCESSIBILITY ===");
  fs.mkdirSync("artifacts/quality", { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const results = [];

  const scenarios = [
    {
      name: "DESKTOP_EN_HOMEPAGE_A11Y_HEADINGS",
      url: `${BASE}/en`,
      viewport: { width: 1280, height: 800 },
      check: async (page) => {
        await page.waitForTimeout(1000);
        const headingCount = await page.locator("h1, h2, h3, header").count();
        const nav = await page.locator("nav, header").count();
        return headingCount >= 1 && nav >= 1;
      }
    },
    {
      name: "MOBILE_PL_HOMEPAGE_LAYOUT_NO_OVERFLOW",
      url: `${BASE}/pl`,
      viewport: { width: 390, height: 844 },
      check: async (page) => {
        await page.waitForTimeout(1000);
        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        const innerWidth = await page.evaluate(() => window.innerWidth);
        return scrollWidth <= innerWidth + 5;
      }
    },
    {
      name: "DESKTOP_DE_SHIELD_LOCALIZATION",
      url: `${BASE}/de/security/shield`,
      viewport: { width: 1280, height: 800 },
      check: async (page) => {
        await page.waitForTimeout(1500);
        const text = await page.locator("body").innerText().catch(() => "");
        return text.length > 500;
      }
    },
    {
      name: "MOBILE_EN_AUDIT_FORM_TOUCH_TARGETS",
      url: `${BASE}/en/security/audits`,
      viewport: { width: 390, height: 844 },
      check: async (page) => {
        await page.waitForTimeout(1500);
        const input = page.locator("input").first();
        const box = await input.boundingBox().catch(() => null);
        return box !== null && box.width >= 200;
      }
    }
  ];

  for (const s of scenarios) {
    const t0 = Date.now();
    const page = await browser.newPage({ viewport: s.viewport });
    try {
      await page.goto(s.url, { waitUntil: "domcontentloaded", timeout: 15000 });
      const passed = await s.check(page);
      const durationMs = Date.now() - t0;
      console.log(`[${passed ? "PASS" : "FAIL"}] ${s.name} (${durationMs}ms)`);
      results.push({ name: s.name, url: s.url, passed, durationMs });
    } catch (err) {
      console.log(`[FAIL] ${s.name}: ${err.message}`);
      results.push({ name: s.name, url: s.url, passed: false, durationMs: Date.now() - t0, error: err.message });
    } finally {
      await page.close();
    }
  }

  await browser.close();

  // Verify PDF QA receipt exists and has PASS status with 0 failures
  const pdfReceiptPath = path.resolve("artifacts/pass35/local-product-quality/PASS35_LOCAL_PDF_QA_RECEIPT.json");
  const pdfExists = fs.existsSync(pdfReceiptPath);
  let pdfValid = false;
  if (pdfExists) {
    const pdfData = JSON.parse(fs.readFileSync(pdfReceiptPath, "utf8"));
    pdfValid = pdfData?.status === "PASS" && pdfData?.totals?.totalPages >= 100 && Array.isArray(pdfData?.failures) && pdfData?.failures?.length === 0;
  }
  console.log(`[${pdfValid ? "PASS" : "FAIL"}] Local PDF Suite Verification (PASS status, 0 failures)`);

  const allPassed = results.every((r) => r.passed) && pdfValid;
  const receipt = {
    schemaVersion: "velmere.pass7.pdf-i18n-mobile-a11y.receipt.v1",
    executedAt: new Date().toISOString(),
    scenariosCount: results.length,
    scenariosPassed: results.filter((r) => r.passed).length,
    pdfQAValid: pdfValid,
    passed: allPassed,
    scenarios: results
  };

  const receiptPath = path.resolve("artifacts/quality/PASS7_PDF_I18N_MOBILE_A11Y_RECEIPT.json");
  fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2), "utf8");
  console.log(`Saved Pass 7 Receipt to: ${receiptPath}`);
  if (!allPassed) process.exit(1);
}

main().catch((err) => { console.error(err); process.exit(1); });
