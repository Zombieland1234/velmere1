import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { chromium } from "playwright";

const root = process.cwd();
const contractPath = path.join(root, "config/pass26/visual-contract-v2.json");
const contract = JSON.parse(fs.readFileSync(contractPath, "utf8"));
const baseUrl = process.env.VELMERE_BASE_URL || "http://127.0.0.1:3110";
const outDir = process.env.VELMERE_EVIDENCE_DIR || path.join(root, "artifacts/pass26/visual-contract-v2");
const subjectSha = process.env.GITHUB_SHA || process.env.VELMERE_SUBJECT_SHA || "LOCAL_UNBOUND";
fs.mkdirSync(outDir, { recursive: true });

const expected = contract.surfaces.reduce((n, surface) => n + surface.viewports.length, 0);
if (expected !== contract.expectedCaptureCount) {
  throw new Error(`visual contract denominator mismatch: computed=${expected} expected=${contract.expectedCaptureCount}`);
}

const browser = await chromium.launch({ headless: true });
const results = [];

async function dismissCookie(page) {
  const candidates = [
    /ALLOW ALL/i,
    /ACCEPT ALL/i,
    /NECESSARY ONLY/i,
    /AKZEPTIEREN/i,
    /ALLE AKZEPTIEREN/i,
    /ZGADZAM SIĘ/i,
  ];
  for (const label of candidates) {
    const button = page.getByRole("button", { name: label }).first();
    if (await button.isVisible().catch(() => false)) {
      await button.click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(250);
      return;
    }
  }
}

for (const surface of contract.surfaces) {
  for (const viewportName of surface.viewports) {
    const viewport = contract.viewports[viewportName];
    const page = await browser.newPage({ viewport });
    const pageErrors = [];
    const consoleErrors = [];
    page.on("pageerror", (error) => pageErrors.push(String(error?.stack || error?.message || error)));
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    const entry = {
      id: surface.id,
      viewport: viewportName,
      route: surface.route,
      status: 0,
      markerVisible: false,
      horizontalOverflow: null,
      screenshot: null,
      screenshotSha256: null,
      pageErrors,
      consoleErrors,
      fatal: null,
      capturePassed: false,
    };

    try {
      const response = await page.goto(`${baseUrl}${surface.route}`, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
      entry.status = response?.status() ?? 0;
      await dismissCookie(page);
      await page.locator(surface.marker).first().waitFor({ state: "visible", timeout: 30000 });
      entry.markerVisible = true;
      await page.addStyleTag({ content: "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}" });
      await page.waitForTimeout(1200);
      entry.horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      const fileName = `${surface.id}__${viewportName}.png`;
      const screenshotPath = path.join(outDir, fileName);
      await page.screenshot({ path: screenshotPath, fullPage: false });
      entry.screenshot = fileName;
      entry.screenshotSha256 = createHash("sha256").update(fs.readFileSync(screenshotPath)).digest("hex");
      entry.capturePassed = entry.status > 0 && entry.status < 500 && entry.markerVisible && entry.horizontalOverflow === false && entry.pageErrors.length === 0;
    } catch (error) {
      entry.fatal = String(error?.stack || error?.message || error);
    } finally {
      results.push(entry);
      await page.close();
    }
  }
}

await browser.close();
const capturedCount = results.filter((x) => x.screenshotSha256).length;
const passedCaptureCount = results.filter((x) => x.capturePassed).length;
const denominatorConserved = results.length === contract.expectedCaptureCount;
const automatedCapturePassed = denominatorConserved && capturedCount === contract.expectedCaptureCount && passedCaptureCount === contract.expectedCaptureCount;
const releaseVisualApproved = contract.contractState === "APPROVED" && contract.surfaces.every((s) => s.approvalState === "APPROVED");

const receipt = {
  schemaVersion: "velmere.pass26.visual-contract-capture.v2",
  subjectSha,
  contractSourceCheckpointSha: contract.sourceCheckpointSha,
  expectedCaptureCount: contract.expectedCaptureCount,
  observedCaptureCount: results.length,
  capturedCount,
  passedCaptureCount,
  denominatorConserved,
  automatedCapturePassed,
  releaseVisualApproved,
  results,
  truthBoundary: "Automated capture PASS proves only that every active-surface screenshot was captured on the tested subject without detected page errors or horizontal overflow and with its contract marker visible. It is not human visual approval and must not be used to bless or refresh legacy visual hashes automatically."
};

fs.writeFileSync(path.join(outDir, "RECEIPT.json"), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({ expected: receipt.expectedCaptureCount, captured: capturedCount, prerequisitesPassed: passedCaptureCount, automatedCapturePassed, releaseVisualApproved }, null, 2));
if (!automatedCapturePassed) process.exitCode = 1;
