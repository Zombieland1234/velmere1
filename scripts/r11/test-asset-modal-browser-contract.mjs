import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.VELMERE_BASE_URL || "http://127.0.0.1:3102";
const outDir = process.env.VELMERE_EVIDENCE_DIR || "artifacts/r11b/asset-modal-regression";
const subjectSha = process.env.GITHUB_SHA || process.env.VELMERE_SUBJECT_SHA || "LOCAL_UNBOUND";
fs.mkdirSync(outDir, { recursive: true });

const surfaces = [
  { id: "real-markets", route: "/en/real-markets" },
  { id: "shield", route: "/en/shield" },
];

const browser = await chromium.launch({ headless: true });
const results = [];

async function dismissCookie(page) {
  for (const label of ["ALLOW ALL", "NECESSARY ONLY", "ACCEPT ALL", "ACCEPT"]) {
    const button = page.getByRole("button", { name: new RegExp(`^${label}$`, "i") }).first();
    if (await button.count()) {
      try {
        if (await button.isVisible()) {
          await button.click({ timeout: 1500 });
          await page.waitForTimeout(150);
          return label;
        }
      } catch {}
    }
  }
  return null;
}

for (const surface of surfaces) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(String(error?.message || error)));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  let status = 0;
  let triggerFound = false;
  let modalVisible = false;
  let beforeUrl = null;
  let afterUrl = null;
  let triggerLabel = null;
  let fatal = null;
  let screenshot = null;

  try {
    const response = await page.goto(`${baseUrl}${surface.route}`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    status = response?.status() ?? 0;
    await page.waitForTimeout(2_000);
    await dismissCookie(page);
    await page.waitForTimeout(400);

    const trigger = page.locator('[aria-label$="full chart and analysis"]').first();
    triggerFound = Boolean(await trigger.count()) && await trigger.isVisible();
    if (!triggerFound) throw new Error("asset_modal_trigger_missing");
    triggerLabel = await trigger.getAttribute("aria-label");
    beforeUrl = page.url();
    await trigger.click({ timeout: 5_000 });
    await page.waitForTimeout(1_200);
    afterUrl = page.url();

    const modal = page.locator('.vlm-asset-detail-modal').first();
    modalVisible = Boolean(await modal.count()) && await modal.isVisible();
    screenshot = path.join(outDir, `${surface.id}-after-click.png`);
    await page.screenshot({ path: screenshot, fullPage: false });
  } catch (error) {
    fatal = String(error?.message || error);
    afterUrl ??= page.url();
  } finally {
    await page.close();
  }

  const stayedOnSurface = Boolean(beforeUrl && afterUrl && beforeUrl === afterUrl);
  const passed = status > 0 && status < 500 && triggerFound && modalVisible && stayedOnSurface && fatal === null;
  results.push({
    id: surface.id,
    route: surface.route,
    status,
    triggerFound,
    triggerLabel,
    beforeUrl,
    afterUrl,
    stayedOnSurface,
    modalVisible,
    screenshot,
    pageErrors,
    consoleErrors,
    fatal,
    passed,
  });
}

await browser.close();

const passedCount = results.filter((row) => row.passed).length;
const receipt = {
  schemaVersion: "velmere.r11b.asset-modal-browser-contract.v1",
  subjectSha,
  expectedSurfaceCount: surfaces.length,
  observedSurfaceCount: results.length,
  passedCount,
  failedCount: results.length - passedCount,
  denominatorConserved: results.length === surfaces.length,
  results,
  passed: results.length === surfaces.length && results.every((row) => row.passed),
  expectedContract:
    "Selecting a Real Markets or Shield asset from the primary terminal surface opens the existing AssetDetailModal in-place; the primary route must not silently switch to a dedicated asset page while modal QA markers/CSS remain authoritative.",
  truthBoundary:
    "This regression checks the browser interaction contract for the two primary terminal surfaces. It does not decide whether a future product redesign should intentionally use dedicated asset routes; such a redesign requires an explicit contract/baseline migration and removal or reclassification of obsolete modal QA/CSS evidence.",
};

fs.writeFileSync(path.join(outDir, "RECEIPT.json"), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify(receipt, null, 2));
if (!receipt.passed) process.exitCode = 1;
