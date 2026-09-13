import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { chromium } from "playwright";

const root = process.cwd();
const contractPath = path.join(root, "config/pass26/visual-contract-v3.json");
const contract = JSON.parse(fs.readFileSync(contractPath, "utf8"));
const baseUrl = process.env.VELMERE_BASE_URL || "http://127.0.0.1:3110";
const outDir = process.env.VELMERE_EVIDENCE_DIR || path.join(root, "artifacts/pass26/visual-contract-v3");
const subjectSha = process.env.GITHUB_SHA || process.env.VELMERE_SUBJECT_SHA || "LOCAL_UNBOUND";
fs.mkdirSync(outDir, { recursive: true });

const expected = contract.surfaces.reduce((count, surface) => count + surface.viewports.length, 0);
if (expected !== contract.expectedCaptureCount) {
  throw new Error(`visual contract denominator mismatch: computed=${expected} expected=${contract.expectedCaptureCount}`);
}

const isHttp400ConsoleError = (message) => /\b400\b[^\n]*bad request|bad request[^\n]*\b400\b/i.test(message);

async function dismissCookie(page) {
  const candidates = [
    /ALLOW ALL/i,
    /ACCEPT ALL/i,
    /NECESSARY ONLY/i,
    /AKZEPTIEREN/i,
    /ALLE AKZEPTIEREN/i,
    /ZGADZAM SIĘ/i,
    /TYLKO NIEZBĘDNE/i,
  ];
  for (const label of candidates) {
    const button = page.getByRole("button", { name: label }).first();
    if (await button.isVisible().catch(() => false)) {
      await button.click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(250);
      return String(label);
    }
  }
  return null;
}

const browser = await chromium.launch({ headless: true });
const results = [];

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
      cookieDismissedWith: null,
      markerVisible: false,
      horizontalOverflow: null,
      screenshot: null,
      screenshotSha256: null,
      pageErrors,
      consoleErrors,
      consoleErrorCount: 0,
      http400ConsoleErrorCount: 0,
      runtimeClean: false,
      fatal: null,
      capturePassed: false,
    };

    try {
      const response = await page.goto(`${baseUrl}${surface.route}`, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
      entry.status = response?.status() ?? 0;
      entry.cookieDismissedWith = await dismissCookie(page);
      await page.locator(surface.marker).first().waitFor({ state: "visible", timeout: 30000 });
      entry.markerVisible = true;
      await page.addStyleTag({
        content: "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}",
      });
      await page.waitForTimeout(1200);
      entry.horizontalOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      );
      const fileName = `${surface.id}__${viewportName}.png`;
      const screenshotPath = path.join(outDir, fileName);
      await page.screenshot({ path: screenshotPath, fullPage: false });
      entry.screenshot = fileName;
      entry.screenshotSha256 = createHash("sha256").update(fs.readFileSync(screenshotPath)).digest("hex");
    } catch (error) {
      entry.fatal = String(error?.stack || error?.message || error);
    } finally {
      entry.consoleErrorCount = consoleErrors.length;
      entry.http400ConsoleErrorCount = consoleErrors.filter(isHttp400ConsoleError).length;
      entry.runtimeClean = pageErrors.length === 0 && consoleErrors.length === 0 && !entry.fatal;
      entry.capturePassed =
        !entry.fatal &&
        entry.status > 0 &&
        entry.status < 500 &&
        entry.markerVisible &&
        entry.horizontalOverflow === false &&
        pageErrors.length === 0;
      results.push(entry);
      await page.close();
    }
  }
}

await browser.close();

const observedCaptureCount = results.length;
const capturedCount = results.filter((entry) => Boolean(entry.screenshotSha256)).length;
const passedCaptureCount = results.filter((entry) => entry.capturePassed).length;
const runtimeCleanSurfaceCount = results.filter((entry) => entry.runtimeClean).length;
const totalConsoleErrorCount = results.reduce((sum, entry) => sum + entry.consoleErrorCount, 0);
const totalHttp400ConsoleErrorCount = results.reduce((sum, entry) => sum + entry.http400ConsoleErrorCount, 0);
const denominatorConserved = observedCaptureCount === contract.expectedCaptureCount;
const automatedCapturePassed =
  denominatorConserved &&
  capturedCount === contract.expectedCaptureCount &&
  passedCaptureCount === contract.expectedCaptureCount;
const releaseVisualApproved =
  contract.contractState === "APPROVED" &&
  contract.surfaces.every((surface) => surface.approvalState === "APPROVED");

const receipt = {
  schemaVersion: "velmere.pass26.visual-contract-capture.v3",
  subjectSha,
  contractSourceCheckpointSha: contract.sourceCheckpointSha,
  captureMode: contract.captureSemantics?.mode ?? "CONTROLLED_HUMAN_REVIEW_CAPTURE",
  pixelDeterministic: contract.captureSemantics?.pixelDeterministic === true,
  screenshotHashesAreApprovalOracles: contract.captureSemantics?.screenshotHashesAreApprovalOracles === true,
  expectedCaptureCount: contract.expectedCaptureCount,
  observedCaptureCount,
  capturedCount,
  passedCaptureCount,
  denominatorConserved,
  automatedCapturePassed,
  releaseVisualApproved,
  runtimeDebt: {
    runtimeCleanSurfaceCount,
    runtimeDirtySurfaceCount: observedCaptureCount - runtimeCleanSurfaceCount,
    totalConsoleErrorCount,
    totalHttp400ConsoleErrorCount,
    consoleErrorsAffectAutomatedCaptureVerdict: false,
    pageErrorsAffectAutomatedCaptureVerdict: true,
  },
  results,
  truthBoundary:
    "Automated capture PASS proves only that all configured active surfaces were captured on the tested subject with their markers visible, no detected horizontal overflow, no fatal error and no page error. Console errors, including HTTP 400s, are recorded as separate runtime debt and do not disappear behind a green capture verdict. Screenshot hashes are informational and are not visual-approval oracles. Human visual approval remains separate.",
};

fs.writeFileSync(path.join(outDir, "RECEIPT.json"), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(
  JSON.stringify(
    {
      subjectSha,
      expected: receipt.expectedCaptureCount,
      observed: observedCaptureCount,
      captured: capturedCount,
      passedCaptureCount,
      automatedCapturePassed,
      releaseVisualApproved,
      runtimeDebt: receipt.runtimeDebt,
    },
    null,
    2,
  ),
);

if (!automatedCapturePassed) process.exitCode = 1;
