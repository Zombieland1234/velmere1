import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.VELMERE_BASE_URL || "http://127.0.0.1:3102";
const outDir = process.env.VELMERE_EVIDENCE_DIR || "artifacts/r11b/asset-detail-query-authority";
const subjectSha = process.env.GITHUB_SHA || process.env.VELMERE_SUBJECT_SHA || "LOCAL_UNBOUND";
fs.mkdirSync(outDir, { recursive: true });

const injected = { price: "999999", change: "88", score: "0" };
const cases = [
  { id: "real-markets-aapl", route: "/en/real-markets/assets/aapl" },
  { id: "shield-bitcoin", route: "/en/shield/assets/bitcoin" },
];

const browser = await chromium.launch({ headless: true });
const results = [];

for (const testCase of cases) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(String(error?.message || error)));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  const url = `${baseUrl}${testCase.route}?price=${injected.price}&change=${injected.change}&score=${injected.score}`;
  let status = 0;
  let bodyText = "";
  let fatal = null;
  let screenshot = null;
  try {
    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
    status = response?.status() ?? 0;
    await page.waitForTimeout(2_500);
    bodyText = await page.locator("body").innerText();
    screenshot = path.join(outDir, `${testCase.id}.png`);
    await page.screenshot({ path: screenshot, fullPage: false });
  } catch (error) {
    fatal = String(error?.stack || error?.message || error);
  } finally {
    await page.close();
  }

  const compact = bodyText.replace(/\s+/g, " ");
  const injectedPriceVisible = /\$\s*999,?999(?:\.00)?/.test(compact);
  const injectedChangeVisible = /\+?88(?:\.00)?%\s*\(24h\)/i.test(compact);
  const injectedRiskVisible = /\b0\s*\/\s*100\b/.test(compact);
  const liveClaimVisible = /Live Telemetry|Live-Telemetrie|Telemetria na żywo|Live Consolidated Tape|\bLive\b/i.test(compact);
  const deterministicClaimVisible = /Deterministic Verification|Deterministische Verifikation|Deterministyczna weryfikacja/i.test(compact);
  const queryAuthorityObserved = injectedPriceVisible || injectedChangeVisible || injectedRiskVisible;

  results.push({
    id: testCase.id,
    route: testCase.route,
    url,
    status,
    injectedPriceVisible,
    injectedChangeVisible,
    injectedRiskVisible,
    liveClaimVisible,
    deterministicClaimVisible,
    queryAuthorityObserved,
    screenshot,
    pageErrors,
    consoleErrors,
    fatal,
  });
}

await browser.close();

const affectedCount = results.filter((row) => row.queryAuthorityObserved).length;
const liveClaimCount = results.filter((row) => row.liveClaimVisible).length;
const receipt = {
  schemaVersion: "velmere.r11b.asset-detail-query-authority.v1",
  subjectSha,
  injected,
  expectedCaseCount: cases.length,
  observedCaseCount: results.length,
  affectedCount,
  liveClaimCount,
  denominatorConserved: results.length === cases.length,
  results,
  blockerDetected: affectedCount > 0,
  passedSafeBoundary: affectedCount === 0,
  truthBoundary:
    "This adversarial browser test asks whether caller-controlled URL query values become visible asset price/change/risk claims. Any observed injection is a truth-authority failure even if a later provider fetch exists, because the route and client currently privilege numeric initialAsset fields and also display live/deterministic trust language.",
};

fs.writeFileSync(path.join(outDir, "QUERY_AUTHORITY_RECEIPT.json"), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify(receipt, null, 2));
if (!receipt.passedSafeBoundary) process.exitCode = 1;
