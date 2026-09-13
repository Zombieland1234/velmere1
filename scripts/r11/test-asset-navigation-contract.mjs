#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.VELMERE_BASE_URL || "http://127.0.0.1:3104";
const evidenceDir = process.env.VELMERE_EVIDENCE_DIR || "/tmp/r11b-browser/asset-navigation";
const subjectSha = process.env.GITHUB_SHA || null;
fs.mkdirSync(evidenceDir, { recursive: true });

const staticContracts = [
  {
    id: "real-markets",
    source: "components/market-integrity/CrossAssetCollapseRadarPanel.tsx",
    routePattern: /router\.push\(\s*`\/real-markets\/assets\/\$\{[^}]+\}[^`]*`\s*\)/u,
  },
  {
    id: "shield",
    source: "components/market-integrity/ShieldRealMarketsParityClient.tsx",
    routePattern: /router\.push\(\s*`\/shield\/assets\/\$\{[^}]+\}[^`]*`\s*\)/u,
  },
].map((contract) => {
  const source = fs.readFileSync(contract.source, "utf8");
  const routeNavigationPresent = contract.routePattern.test(source);
  const nonNullModalOpenCalls = [...source.matchAll(/setSelected\((?!null\b)([^)]*)\)/gu)].map((m) => m[0]);
  return {
    id: contract.id,
    source: contract.source,
    routeNavigationPresent,
    nonNullModalOpenCalls,
    passed: routeNavigationPresent && nonNullModalOpenCalls.length === 0,
  };
});

const browser = await chromium.launch({ headless: true });
const cases = [
  {
    id: "real-markets-aapl",
    startPath: "/en/real-markets",
    expectedPathPrefix: "/en/real-markets/assets/",
    triggerLabel: "Apple full chart and analysis",
  },
  {
    id: "shield-bitcoin",
    startPath: "/en/shield",
    expectedPathPrefix: "/en/shield/assets/",
    triggerLabel: "Bitcoin full chart and analysis",
  },
];

async function dismissCookie(page) {
  for (const label of ["ALLOW ALL", "NECESSARY ONLY", "ACCEPT ALL", "ACCEPT", "AKCEPTUJ", "TYLKO NIEZBĘDNE"]) {
    const button = page.getByRole("button", { name: new RegExp(`^${label}$`, "i") }).first();
    try {
      if ((await button.count()) && (await button.isVisible())) {
        await button.click({ timeout: 1500 });
        await page.waitForTimeout(200);
        return label;
      }
    } catch {}
  }
  return null;
}

const results = [];
for (const testCase of cases) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(String(error?.message || error)));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  let fatal = null;
  let triggerLabel = null;
  let beforePath = null;
  let afterPath = null;
  let modalVisible = false;
  let withheldMarker = false;
  let screenshot = null;
  try {
    const response = await page.goto(`${baseUrl}${testCase.startPath}`, { waitUntil: "domcontentloaded", timeout: 60000 });
    if (!response || response.status() >= 500) throw new Error(`start_route_status:${response?.status() ?? 0}`);
    await page.waitForTimeout(1800);
    await dismissCookie(page);
    beforePath = new URL(page.url()).pathname;

    const trigger = page.locator(`[aria-label="${testCase.triggerLabel}"]`).first();
    if (!(await trigger.count()) || !(await trigger.isVisible())) throw new Error(`navigation_trigger_missing:${testCase.id}`);
    triggerLabel = await trigger.getAttribute("aria-label");
    await trigger.click({ timeout: 5000 });
    await page.waitForURL((url) => url.pathname.startsWith(testCase.expectedPathPrefix), { timeout: 15000 });
    await page.waitForTimeout(600);

    afterPath = new URL(page.url()).pathname;
    modalVisible = await page.locator('section[role="dialog"][aria-modal="true"]').first().isVisible().catch(() => false);
    withheldMarker = await page.locator('[data-asset-detail-truth-state="WITHHELD"]').first().isVisible().catch(() => false);
    screenshot = path.join(evidenceDir, `${testCase.id}.png`);
    await page.screenshot({ path: screenshot, fullPage: true });
  } catch (error) {
    fatal = String(error?.message || error);
  } finally {
    await page.close().catch(() => undefined);
  }

  const navigatedToDedicatedRoute = typeof afterPath === "string" && afterPath.startsWith(testCase.expectedPathPrefix);
  const passed = !fatal && navigatedToDedicatedRoute && !modalVisible && withheldMarker && pageErrors.length === 0;
  results.push({
    id: testCase.id,
    startPath: testCase.startPath,
    expectedPathPrefix: testCase.expectedPathPrefix,
    triggerLabel,
    beforePath,
    afterPath,
    navigatedToDedicatedRoute,
    modalVisible,
    withheldMarker,
    pageErrors,
    consoleErrors,
    screenshot,
    fatal,
    passed,
  });
}
await browser.close();

const expectedCaseCount = cases.length;
const observedCaseCount = results.length;
const receipt = {
  schemaVersion: "velmere.r11b.asset-navigation-contract.v1",
  subjectSha,
  productContract: "DEDICATED_ASSET_ROUTE_WITH_FAIL_CLOSED_DETAIL",
  expectedCaseCount,
  observedCaseCount,
  denominatorConserved: observedCaseCount === expectedCaseCount,
  staticContracts,
  results,
  passed:
    observedCaseCount === expectedCaseCount &&
    staticContracts.every((row) => row.passed) &&
    results.every((row) => row.passed),
  residualLimitations: [
    "Dedicated asset routes currently fail closed with WITHHELD data; provider-bound detail remains unimplemented.",
    "Legacy AssetDetailModal render code and popup CSS may remain in source; this contract proves primary tested row interactions do not open the modal.",
    "Unrelated provider/API console 400s are recorded but are outside this navigation-contract verdict unless they produce a page error or break navigation.",
  ],
  truthBoundary: "PASS proves the tested primary Real Markets and Shield asset interactions navigate to dedicated fail-closed asset routes and do not open an in-place modal. It does not grant provider-data or final visual-design approval.",
};
fs.writeFileSync(path.join(evidenceDir, "RECEIPT.json"), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify(receipt, null, 2));
if (!receipt.passed) process.exit(1);
