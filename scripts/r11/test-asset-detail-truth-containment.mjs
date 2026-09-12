import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.VELMERE_BASE_URL || "http://127.0.0.1:3103";
const outDir = process.env.VELMERE_EVIDENCE_DIR || "artifacts/r11b/asset-detail-truth-containment";
const subjectSha = process.env.GITHUB_SHA || process.env.VELMERE_SUBJECT_SHA || "LOCAL_UNBOUND";
fs.mkdirSync(outDir, { recursive: true });

const injected = { price: "999999", change: "88", score: "0" };
const cases = [
  {
    id: "real-markets-aapl",
    route: "/en/real-markets/assets/aapl",
    source: "app/[locale]/real-markets/assets/[assetId]/page.tsx",
  },
  {
    id: "shield-bitcoin",
    route: "/en/shield/assets/bitcoin",
    source: "app/[locale]/shield/assets/[assetId]/page.tsx",
  },
];

const forbiddenSourcePatterns = [
  /DEFAULT_PRICES/,
  /KNOWN_TRAD_INFO/,
  /searchParams/,
  /AssetDetailPageNew/,
  /Live Consolidated Tape/i,
  /freshness:\s*["']Live["']/i,
];

const staticChecks = cases.map((testCase) => {
  const sourceText = fs.readFileSync(testCase.source, "utf8");
  const hits = forbiddenSourcePatterns
    .filter((pattern) => pattern.test(sourceText))
    .map((pattern) => pattern.toString());
  return {
    id: testCase.id,
    source: testCase.source,
    forbiddenPatternHits: hits,
    passed: hits.length === 0,
  };
});

const browser = await chromium.launch({ headless: true });
const results = [];

for (const testCase of cases) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(String(error?.stack || error?.message || error)));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  const url = `${baseUrl}${testCase.route}?price=${injected.price}&change=${injected.change}&score=${injected.score}`;
  let status = 0;
  let withheldMarker = false;
  let injectedPriceVisible = false;
  let injectedChangeVisible = false;
  let injectedRiskVisible = false;
  let liveClaimVisible = false;
  let deterministicClaimVisible = false;
  let screenshot = null;
  let fatal = null;

  try {
    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
    status = response?.status() ?? 0;
    await page.waitForTimeout(800);
    withheldMarker = await page.locator('[data-asset-detail-truth-state="WITHHELD"]').count() === 1;
    const compact = (await page.locator("body").innerText()).replace(/\s+/g, " ");
    injectedPriceVisible = /\$\s*999,?999(?:\.00)?/.test(compact);
    injectedChangeVisible = /\+?88(?:\.00)?%\s*\(24h\)/i.test(compact);
    injectedRiskVisible = /\b0\s*\/\s*100\b/.test(compact);
    liveClaimVisible = /Live Telemetry|Live-Telemetrie|Telemetria na żywo|Live Consolidated Tape/i.test(compact);
    deterministicClaimVisible = /Deterministic Verification|Deterministische Verifikation|Deterministyczna weryfikacja/i.test(compact);
    screenshot = path.join(outDir, `${testCase.id}.png`);
    await page.screenshot({ path: screenshot, fullPage: false });
  } catch (error) {
    fatal = String(error?.stack || error?.message || error);
  } finally {
    await page.close();
  }

  const passed =
    fatal === null &&
    status > 0 &&
    status < 500 &&
    withheldMarker &&
    !injectedPriceVisible &&
    !injectedChangeVisible &&
    !injectedRiskVisible &&
    !liveClaimVisible &&
    !deterministicClaimVisible;

  results.push({
    id: testCase.id,
    route: testCase.route,
    url,
    status,
    withheldMarker,
    injectedPriceVisible,
    injectedChangeVisible,
    injectedRiskVisible,
    liveClaimVisible,
    deterministicClaimVisible,
    screenshot,
    pageErrors,
    consoleErrors,
    fatal,
    passed,
  });
}

await browser.close();

const passed =
  staticChecks.every((row) => row.passed) &&
  results.length === cases.length &&
  results.every((row) => row.passed);

const receipt = {
  schemaVersion: "velmere.r11b.asset-detail-truth-containment.v1",
  subjectSha,
  containmentType: "FAIL_CLOSED_PUBLIC_ASSET_DETAIL_WITHHOLD",
  injected,
  expectedCaseCount: cases.length,
  observedCaseCount: results.length,
  denominatorConserved: results.length === cases.length,
  staticChecks,
  results,
  passed,
  residualLimitations: [
    "Primary terminal rows still navigate to dedicated asset-detail routes; this patch makes those destinations truthful but does not adjudicate modal-vs-route product UX.",
    "Provider-bound asset detail remains unimplemented; this is containment, not feature remediation.",
    "Unrelated terminal API 400s and broader provider availability are outside this receipt.",
  ],
  truthBoundary:
    "PASS means the tested public asset-detail destinations fail closed and do not expose caller-controlled price/change/risk values or live/deterministic trust claims. It does not mean asset detail functionality is complete.",
};

fs.writeFileSync(path.join(outDir, "RECEIPT.json"), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify(receipt, null, 2));
if (!passed) process.exitCode = 1;
