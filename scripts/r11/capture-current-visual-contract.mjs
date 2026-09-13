#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { chromium } from "playwright";

const baseUrl = process.env.VELMERE_BASE_URL || "http://localhost:3105";
const evidenceDir = process.env.VELMERE_EVIDENCE_DIR
  ? path.resolve(process.env.VELMERE_EVIDENCE_DIR)
  : fs.mkdtempSync(path.join(os.tmpdir(), "velmere-visual-contract-"));
const subjectSha = process.env.GITHUB_SHA || null;
fs.mkdirSync(evidenceDir, { recursive: true, mode: 0o700 });
const evidenceDirMetadata = fs.lstatSync(evidenceDir);
if (evidenceDirMetadata.isSymbolicLink() || !evidenceDirMetadata.isDirectory()) {
  throw new Error("visual_contract_evidence_dir_must_be_real_directory");
}

const surfaces = [
  { id: "audits", route: "/en/security/audits", requiresWithheld: false },
  { id: "shield", route: "/en/shield", requiresWithheld: false },
  { id: "real-markets", route: "/en/real-markets", requiresWithheld: false },
  { id: "real-markets-asset", route: "/en/real-markets/assets/aapl", requiresWithheld: true },
  { id: "shield-asset", route: "/en/shield/assets/bitcoin", requiresWithheld: true },
];
const variants = [
  { id: "desktop", viewport: { width: 1440, height: 900 }, scale: 2 },
  { id: "mobile", viewport: { width: 375, height: 812 }, scale: 1 },
];
const expectedCaptureSlugs = surfaces.flatMap((surface) => variants.map((variant) => `${surface.id}-${variant.id}`));
const sourcePaths = [
  "app/globals.css",
  "tailwind.config.ts",
  "app/styles/audit-account-handoff.css",
  "app/styles/audit-one-screen.css",
  "app/styles/global-header.css",
  "app/styles/markets-cleanup.css",
  "app/styles/shield-pro-terminal.css",
  "app/styles/shield-risk-surface.css",
  "components/market-integrity/AssetDetailTruthWithheldPage.tsx",
  "app/[locale]/real-markets/assets/[assetId]/page.tsx",
  "app/[locale]/shield/assets/[assetId]/page.tsx",
];
const legacyRetiredPaths = [
  "app/styles/asset-popup-foundation.css",
  "app/styles/asset-popup-geometry.css",
  "app/styles/asset-popup-ownership.css",
  "app/styles/asset-popup-resize.css",
];

function sha256File(filePath) {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

async function dismissCookie(page) {
  const labels = ["ALLOW ALL", "NECESSARY ONLY", "ACCEPT ALL", "ACCEPT", "ONLY NECESSARY", "AKCEPTUJ", "TYLKO NIEZBĘDNE"];
  for (const label of labels) {
    const locator = page.getByRole("button", { name: new RegExp(`^${label}$`, "i") }).first();
    try {
      if ((await locator.count()) && (await locator.isVisible())) {
        await locator.click({ timeout: 1800 });
        await page.waitForTimeout(250);
        return label;
      }
    } catch {}
  }
  return null;
}

const browser = await chromium.launch({ headless: true });
const results = [];
const captureErrors = [];

for (const surface of surfaces) {
  for (const variant of variants) {
    const slug = `${surface.id}-${variant.id}`;
    const page = await browser.newPage({
      viewport: variant.viewport,
      deviceScaleFactor: variant.scale,
      isMobile: variant.viewport.width < 500,
    });
    const pageErrors = [];
    const consoleErrors = [];
    page.on("pageerror", (error) => pageErrors.push(String(error?.stack || error?.message || error)));
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    try {
      const response = await page.goto(`${baseUrl}${surface.route}`, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      await page.waitForTimeout(1800);
      const dismissedCookieWith = await dismissCookie(page);
      await page.waitForTimeout(300);

      const metrics = await page.evaluate(() => ({
        width: window.innerWidth,
        height: window.innerHeight,
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
        title: document.title,
      }));
      const withheldMarker = (await page.locator('[data-asset-detail-truth-state="WITHHELD"]').count()) > 0;
      const status = response?.status() ?? 0;
      const horizontalOverflow = metrics.scrollWidth > metrics.width;
      const screenshotPath = path.join(evidenceDir, `${slug}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });

      const passed =
        status > 0 &&
        status < 500 &&
        !horizontalOverflow &&
        pageErrors.length === 0 &&
        (!surface.requiresWithheld || withheldMarker);

      results.push({
        slug,
        route: surface.route,
        viewport: variant.viewport,
        deviceScaleFactor: variant.scale,
        status,
        horizontalOverflow,
        withheldMarker,
        requiresWithheld: surface.requiresWithheld,
        screenshot: screenshotPath,
        screenshotSha256: sha256File(screenshotPath),
        metrics,
        dismissedCookieWith,
        pageErrors,
        consoleErrors,
        passed,
      });
      if (!passed) captureErrors.push({ slug, reason: "automated_precondition_failed" });
    } catch (error) {
      captureErrors.push({ slug, reason: String(error?.stack || error?.message || error) });
    } finally {
      await page.close().catch(() => undefined);
    }
  }
}

await browser.close().catch(() => undefined);

const capturedSlugs = results.map((row) => row.slug);
const missingCaptureSlugs = expectedCaptureSlugs.filter((slug) => !capturedSlugs.includes(slug));
const sourceHashes = Object.fromEntries(
  sourcePaths.map((sourcePath) => [sourcePath, fs.existsSync(sourcePath) ? sha256File(sourcePath) : null]),
);
const denominatorConserved = capturedSlugs.length + missingCaptureSlugs.length === expectedCaptureSlugs.length;
const automatedPreconditionsPassed =
  denominatorConserved &&
  capturedSlugs.length === expectedCaptureSlugs.length &&
  missingCaptureSlugs.length === 0 &&
  captureErrors.length === 0 &&
  Object.values(sourceHashes).every(Boolean) &&
  results.every((row) => row.passed === true);

const receipt = {
  schemaVersion: "velmere.r11b.visual-contract-review.v1",
  subjectSha,
  evidenceClass: "EXACT_HEAD_RENDERED_VISUAL_REVIEW_INPUT",
  productContract: "DEDICATED_ASSET_ROUTE_WITH_FAIL_CLOSED_DETAIL",
  expectedCaptureCount: expectedCaptureSlugs.length,
  capturedCount: capturedSlugs.length,
  expectedCaptureSlugs,
  capturedSlugs,
  missingCaptureSlugs,
  denominatorConserved,
  sourceHashes,
  legacyRetiredPaths,
  results,
  captureErrors,
  automatedPreconditionsPassed,
  visualReviewRequired: true,
  releaseVisualApproval: false,
  legacyPopupBaselineReused: false,
  truthBoundary:
    "This receipt proves only that every declared current product surface was rendered on the bound subject and passed automated status/overflow/page-error/WITHHELD preconditions. Screenshot capture does not self-approve visual design, does not authorize copying legacy popup hashes, and does not constitute release visual approval.",
};

const receiptPath = path.join(evidenceDir, "RECEIPT.json");
fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
console.log(JSON.stringify(receipt, null, 2));
if (!automatedPreconditionsPassed) process.exit(1);
