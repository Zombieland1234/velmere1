import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const VIEWPORTS = [
  { name: "mobile_375", width: 375, height: 667 },
  { name: "tablet_768", width: 768, height: 1024 },
  { name: "laptop_1024", width: 1024, height: 768 },
  { name: "desktop_1440", width: 1440, height: 900 },
];

const ROUTES = [
  "/en/shield",
  "/en/shield-pro",
  "/en/real-markets",
  "/en/browser",
  "/en/security/audits",
  "/en/shield-map",
];

async function main() {
  console.log("=== EXECUTING PASS-020: FULL MOBILE & RESPONSIVE VIEWPORT AUDIT ===");
  fs.mkdirSync("preview_screenshots/mobile_audit", { recursive: true });
  fs.mkdirSync("artifacts/mobile", { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const auditResults = [];

  for (const vp of VIEWPORTS) {
    console.log(`\nTesting viewport: ${vp.name} (${vp.width}x${vp.height})...`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      userAgent: vp.width < 768
        ? "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148"
        : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    });

    for (const route of ROUTES) {
      const page = await context.newPage();
      const consoleErrors = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text().slice(0, 160));
      });

      try {
        const res = await page.goto(`${BASE}${route}`, { waitUntil: "networkidle", timeout: 20_000 }).catch(async () => {
          return await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 15_000 });
        });
        await page.waitForLoadState("domcontentloaded");
        await page.waitForTimeout(1000); // Allow render stabilization
        const status = res ? res.status() : 0;

        // Check for horizontal overflow (clipping / layout breaks)
        const overflow = await page.evaluate(() => {
          const docWidth = document.documentElement.scrollWidth;
          const winWidth = window.innerWidth;
          return docWidth > winWidth + 2; // Allow 2px sub-pixel tolerance
        });

        // Screenshot for mobile & tablet
        if (vp.width <= 768) {
          const cleanName = route.replace(/[^a-zA-Z0-9]/g, "_");
          const screenPath = `preview_screenshots/mobile_audit/${vp.name}${cleanName}.png`;
          await page.screenshot({ path: screenPath });
        }

        const passed = status === 200 && !overflow;
        console.log(`  [${passed ? "PASS" : "WARN"}] ${route} -> HTTP ${status}, overflow: ${overflow}, errors: ${consoleErrors.length}`);

        auditResults.push({
          viewport: vp.name,
          width: vp.width,
          height: vp.height,
          route,
          status,
          hasHorizontalOverflow: overflow,
          consoleErrorsCount: consoleErrors.length,
          passed,
        });
      } catch (err) {
        console.log(`  [FAIL] ${route} -> ${err.message}`);
        auditResults.push({
          viewport: vp.name,
          width: vp.width,
          height: vp.height,
          route,
          status: 0,
          error: err.message,
          passed: false,
        });
      } finally {
        await page.close();
      }
    }
    await context.close();
  }

  await browser.close();

  const totalChecks = auditResults.length;
  const passedChecks = auditResults.filter((r) => r.passed).length;
  console.log(`\n=== VIEWPORT AUDIT RESULT: ${passedChecks}/${totalChecks} PASSED ===`);

  const receipt = {
    schemaVersion: "velmere.pass020.mobile-responsive-audit.receipt.v1",
    auditedAt: new Date().toISOString(),
    totalChecks,
    passedChecks,
    viewportsTested: VIEWPORTS.map((v) => v.name),
    routesTested: ROUTES,
    details: auditResults,
  };

  const receiptPath = "artifacts/mobile/PASS020_MOBILE_RESPONSIVE_AUDIT_RECEIPT.json";
  fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2));
  console.log(`Receipt saved to: ${receiptPath}`);

  if (passedChecks < totalChecks) {
    console.warn("Some routes reported horizontal overflow or status issues.");
  }
}

main().catch((err) => {
  console.error("Audit error:", err);
  process.exit(1);
});
