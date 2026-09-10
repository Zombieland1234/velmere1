import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const OUT_DIR = path.resolve("./audit_artifacts");
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const ROUTES_TO_AUDIT = [
  { name: "home", url: "http://localhost:3000/pl" },
  { name: "shield", url: "http://localhost:3000/pl/shield" },
  { name: "shield_pro", url: "http://localhost:3000/pl/shield-pro" },
  { name: "shield_map", url: "http://localhost:3000/pl/shield-map" },
  { name: "browser", url: "http://localhost:3000/pl/browser" },
  { name: "risk_methodology", url: "http://localhost:3000/pl/risk-methodology" },
  { name: "security_audits", url: "http://localhost:3000/pl/security/audits" },
  { name: "checkout", url: "http://localhost:3000/pl/checkout" }
];

async function runAudit() {
  const browser = await chromium.launch({ headless: true });
  const auditReport = {
    timestamp: new Date().toISOString(),
    routes: {},
    interactions: {},
    summary: { totalErrors: 0, totalWarnings: 0 }
  };

  for (const route of ROUTES_TO_AUDIT) {
    console.log(`Auditing: ${route.name} (${route.url})...`);
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 }
    });

    const consoleMessages = [];
    const pageErrors = [];
    const failedRequests = [];

    page.on("console", (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
      if (msg.type() === "error") auditReport.summary.totalErrors++;
      if (msg.type() === "warning") auditReport.summary.totalWarnings++;
    });

    page.on("pageerror", (err) => {
      pageErrors.push(err.message);
      auditReport.summary.totalErrors++;
    });

    page.on("requestfailed", (req) => {
      failedRequests.push({ url: req.url(), failure: req.failure()?.errorText });
    });

    let status = 0;
    try {
      const response = await page.goto(route.url, { waitUntil: "networkidle", timeout: 35000 });
      status = response?.status() || 0;
    } catch (e) {
      pageErrors.push(`Navigation error: ${e.message}`);
    }

    // Wait 1.5s for dynamic hydration & canvas
    await page.waitForTimeout(1500);

    const title = await page.title();
    const screenshotPath = path.join(OUT_DIR, `${route.name}_desktop.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });

    // Check for overflow / layout breaks
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    auditReport.routes[route.name] = {
      url: route.url,
      status,
      title,
      hasHorizontalOverflow,
      consoleErrors: consoleMessages.filter((m) => m.type === "error"),
      consoleWarnings: consoleMessages.filter((m) => m.type === "warning"),
      pageErrors,
      failedRequests,
      screenshot: screenshotPath
    };

    console.log(` -> Done: ${route.name} (Status: ${status}, Errors: ${pageErrors.length}, Console Errors: ${auditReport.routes[route.name].consoleErrors.length})`);
    await page.close();
  }

  // --- Interaction Tests ---
  console.log("Testing Angela AI Interaction...");
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto("http://localhost:3000/pl", { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(1000);

    const angelButton = page.locator(".velmere-floating-utility--angel");
    const angelButtonVisible = await angelButton.isVisible();

    let drawerOpened = false;
    let replyReceived = false;
    let replyText = "";

    if (angelButtonVisible) {
      await angelButton.click();
      await page.waitForTimeout(800);
      const angelPanel = page.locator(".velmere-angel-panel");
      drawerOpened = await angelPanel.isVisible();

      if (drawerOpened) {
        await page.screenshot({ path: path.join(OUT_DIR, "angela_drawer_open.png") });
        const inputLocator = angelPanel.locator("input, textarea");
        if (await inputLocator.count() > 0) {
          await inputLocator.first().fill("Czym jest Velmere Shield?");
          const sendBtn = angelPanel.locator("button:has(svg)");
          await sendBtn.last().click();
          await page.waitForTimeout(3000);

          const assistantMsg = angelPanel.locator(".velmere-side-drawer-panel p, .velmere-angel-panel [class*='assistant']");
          replyText = (await assistantMsg.allInnerTexts()).join(" | ");
          replyReceived = replyText.length > 0;
          await page.screenshot({ path: path.join(OUT_DIR, "angela_after_message.png") });
        }
      }
    }

    auditReport.interactions.angela = {
      buttonVisible: angelButtonVisible,
      drawerOpened,
      replyReceived,
      snippet: replyText.slice(0, 300)
    };
    await page.close();
  }

  // --- Shield Modal Interaction Test ---
  console.log("Testing Shield Pro Modal Interaction...");
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto("http://localhost:3000/pl/shield-pro", { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(1500);

    // Click on the first row in the table
    const tableRow = page.locator("tbody tr").first();
    let modalOpened = false;
    let tierButtonsFound = [];

    if (await tableRow.isVisible()) {
      await tableRow.click();
      await page.waitForTimeout(1200);

      const modal = page.locator(".vlm-asset-detail-modal, [role='dialog']");
      modalOpened = (await modal.count()) > 0 && (await modal.first().isVisible());

      if (modalOpened) {
        await page.screenshot({ path: path.join(OUT_DIR, "shield_pro_modal_open.png") });
        const tierButtons = modal.locator("button:has-text('Basic'), button:has-text('Pro'), button:has-text('Advanced')");
        tierButtonsFound = await tierButtons.allInnerTexts();
      }
    }

    auditReport.interactions.shieldModal = {
      modalOpened,
      tierButtonsFound
    };
    await page.close();
  }

  fs.writeFileSync(path.join(OUT_DIR, "audit_summary.json"), JSON.stringify(auditReport, null, 2), "utf8");
  console.log("Audit complete. Report written to audit_artifacts/audit_summary.json");
  await browser.close();
}

runAudit().catch(console.error);
