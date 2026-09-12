import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { chromium } from "playwright";

const baseUrl = process.env.VELMERE_BASE_URL || "http://127.0.0.1:3101";
const outDir = process.env.VELMERE_EVIDENCE_DIR || "artifacts/r11b/shield-hydration";
const subjectSha = process.env.GITHUB_SHA || process.env.VELMERE_SUBJECT_SHA || "LOCAL_UNBOUND";
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const pageErrors = [];
const consoleErrors = [];

page.on("pageerror", (error) => pageErrors.push(String(error?.stack || error?.message || error)));
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});

let status = 0;
let terminalMounted = false;
let screenshotSha256 = null;
let fatal = null;
try {
  const response = await page.goto(`${baseUrl}/en/shield`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  status = response?.status() ?? 0;
  await page.locator('[data-pass2356-shield-realmarkets-parity="true"]').waitFor({
    state: "visible",
    timeout: 30_000,
  });
  terminalMounted = true;
  await page.waitForTimeout(3_500);
  const screenshotPath = path.join(outDir, "shield-hydration.png");
  await page.screenshot({ path: screenshotPath, fullPage: false });
  screenshotSha256 = createHash("sha256").update(fs.readFileSync(screenshotPath)).digest("hex");
} catch (error) {
  fatal = String(error?.stack || error?.message || error);
} finally {
  await browser.close();
}

const hydrationPattern = /hydration|hydrated|react error #418|react\.dev\/errors\/418|server rendered html didn't match|server rendered html did not match/i;
const hydrationErrors = [
  ...pageErrors.map((message) => ({ channel: "pageerror", message })),
  ...consoleErrors.map((message) => ({ channel: "console", message })),
].filter((entry) => hydrationPattern.test(entry.message));

const passed =
  fatal === null &&
  status > 0 &&
  status < 500 &&
  terminalMounted &&
  hydrationErrors.length === 0;

const receipt = {
  schemaVersion: "velmere.r11b.shield-hydration-browser.v1",
  subjectSha,
  baseUrl,
  route: "/en/shield",
  status,
  terminalMounted,
  screenshotSha256,
  pageErrors,
  consoleErrors,
  hydrationErrors,
  fatal,
  passed,
  truthBoundary:
    "This browser regression proves the tested runtime did not emit a detected React hydration mismatch while mounting the Shield terminal. It does not prove provider availability, production deployment parity, or absence of unrelated console/network errors.",
};

fs.writeFileSync(path.join(outDir, "RECEIPT.json"), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify(receipt, null, 2));

if (!passed) process.exitCode = 1;
