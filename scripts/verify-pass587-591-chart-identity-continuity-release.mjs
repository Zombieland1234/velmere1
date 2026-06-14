import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const errors = [];
const requiredFiles = [
  "lib/market-integrity/pass587-chart-viewport-identity.ts",
  "lib/market-integrity/pass588-chart-evidence-manifest.ts",
  "lib/market-integrity/pass589-source-freshness-scheduler.ts",
  "lib/market-integrity/pass590-candle-continuity-ledger.ts",
  "lib/market-integrity/pass591-chart-comparison-lens.ts",
  "components/market-integrity/AdvancedMarketChart.tsx",
  "components/market-integrity/CrossAssetCollapseRadarPanel.tsx",
  "components/vlm/VlmSourceBoundMarketPanel.tsx",
  "app/globals.css",
  "tsconfig.pass591.json",
];

const read = (file) => (fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "");
const markers = (file, expected) => {
  const source = read(file);
  for (const marker of expected) {
    if (!source.includes(marker)) errors.push(`${file} missing ${marker}`);
  }
};

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) errors.push(`missing ${file}`);
}

markers("lib/market-integrity/pass587-chart-viewport-identity.ts", [
  'version: "pass587-chart-viewport-identity"',
  "providerRoute",
  "routeFingerprint",
  "sessionStorage",
]);
markers("lib/market-integrity/pass588-chart-evidence-manifest.ts", [
  'version: "pass588-chart-evidence-manifest"',
  "basic: 10",
  "pro: 14",
  "advanced: 20",
  "distinctFieldCount",
]);
markers("lib/market-integrity/pass589-source-freshness-scheduler.ts", [
  'version: "pass589-source-freshness-scheduler"',
  'mode: "cadence_follow"',
  "preserveConfirmedValues: true",
  "locale?: Pass589Locale",
]);
markers("lib/market-integrity/pass590-candle-continuity-ledger.ts", [
  'version: "pass590-candle-continuity-ledger"',
  "duplicate_timestamp",
  "estimatedMissingBars",
  "Last provider observation wins",
]);
markers("lib/market-integrity/pass591-chart-comparison-lens.ts", [
  'version: "pass591-chart-comparison-lens"',
  'scaleMode: "normalized_return"',
  "exact timestamp",
  "locale?: Pass591Locale",
]);
markers("components/market-integrity/AdvancedMarketChart.tsx", [
  "buildPass587ChartViewportIdentity",
  "buildPass588ChartEvidenceManifest",
  "buildPass589SourceFreshnessSchedule",
  "buildPass590CandleContinuityLedger",
  "buildPass591ChartComparisonLens",
  "data-pass587-chart-viewport-identity",
  "data-pass588-chart-evidence-manifest",
  "data-pass589-source-freshness-scheduler",
  "data-pass590-candle-continuity-ledger",
  "data-pass591-chart-comparison-lens",
  "analysisDepth = \"basic\"",
]);
markers("components/market-integrity/CrossAssetCollapseRadarPanel.tsx", [
  "selectedRefreshTick",
  "requestSelectedRefresh",
  'analysisDepth={auditMode ?? "basic"}',
  "onRefreshDue={requestSelectedRefresh}",
]);
markers("components/vlm/VlmSourceBoundMarketPanel.tsx", [
  "refreshMarket",
  'providerRouteId="vlm-usd-primary"',
  "onRefreshDue={refreshMarket}",
]);
markers("app/globals.css", [
  "PASS587–591",
  "data-pass588-evidence-manifest",
  "data-evidence-state=\"missing\"",
  "prefers-reduced-motion",
]);

function loadPureTsModule(file) {
  const source = read(file);
  const result = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: file,
    reportDiagnostics: true,
  });
  for (const diagnostic of result.diagnostics || []) {
    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, " ");
    errors.push(`${file} transpile diagnostic: ${message}`);
  }
  const module = { exports: {} };
  const execute = new Function("exports", "require", "module", "__filename", "__dirname", result.outputText);
  execute(module.exports, () => ({}), module, file, path.dirname(file));
  return module.exports;
}

try {
  const pass587 = loadPureTsModule("lib/market-integrity/pass587-chart-viewport-identity.ts");
  const firstRoute = pass587.buildPass587ChartViewportIdentity({ symbol: "ETH", range: "1h", source: "primary", secondarySource: "peer", providerRouteId: "route-a" });
  const sameRoute = pass587.buildPass587ChartViewportIdentity({ symbol: " eth ", range: "1H", source: "primary", secondarySource: "peer", providerRouteId: "route-a" });
  const changedRoute = pass587.buildPass587ChartViewportIdentity({ symbol: "ETH", range: "1h", source: "primary", secondarySource: "peer-2", providerRouteId: "route-a" });
  if (firstRoute.storageKey !== sameRoute.storageKey) errors.push("PASS587 canonical identity is not deterministic");
  if (firstRoute.storageKey === changedRoute.storageKey) errors.push("PASS587 provider route change did not isolate viewport state");

  const pass588 = loadPureTsModule("lib/market-integrity/pass588-chart-evidence-manifest.ts");
  const baseManifest = {
    locale: "pl",
    closeLabel: "3200",
    timestampLabel: "2026-06-08 12:00",
    range: "1h",
    providerState: "live",
    ageSeconds: 10,
    coverageScore: 100,
    cadenceSeconds: 3600,
    visibleRangePercent: 8.5,
    volumeRatio: 1.2,
    continuityState: "healthy",
    continuityScore: 100,
    failoverMode: "primary_live",
    comparisonState: "aligned",
    matchRate: 100,
    medianDivergenceBps: 2,
    directionAgreement: 100,
    maximumDivergenceBps: 4,
    gapCount: 0,
    duplicateCount: 0,
    cadenceShiftCount: 0,
    confidenceCap: 92,
  };
  for (const [depth, budget] of [["basic", 10], ["pro", 14], ["advanced", 20]]) {
    const manifest = pass588.buildPass588ChartEvidenceManifest({ ...baseManifest, depth });
    if (manifest.fields.length !== budget || manifest.fieldBudget !== budget) errors.push(`PASS588 ${depth} budget mismatch`);
    if (manifest.distinctFieldCount !== budget) errors.push(`PASS588 ${depth} fields are not distinct`);
  }

  const pass589 = loadPureTsModule("lib/market-integrity/pass589-source-freshness-scheduler.ts");
  const live = pass589.buildPass589SourceFreshnessSchedule({ state: "live", ageSeconds: 10, cadenceSeconds: 60, range: "1m", now: 1000, locale: "pl" });
  const stale = pass589.buildPass589SourceFreshnessSchedule({ state: "stale", ageSeconds: 400, cadenceSeconds: 60, range: "1m", now: 1000, locale: "de" });
  const offline = pass589.buildPass589SourceFreshnessSchedule({ state: "offline", ageSeconds: null, cadenceSeconds: 60, range: "1m", now: 1000, locale: "en" });
  if (live.mode !== "cadence_follow" || stale.mode !== "stale_recovery" || offline.mode !== "offline_backoff") errors.push("PASS589 scheduler mode resolution failed");
  if (![live, stale, offline].every((item) => item.preserveConfirmedValues && item.delayMs >= 15000)) errors.push("PASS589 preservation/backoff contract failed");

  const pass590 = loadPureTsModule("lib/market-integrity/pass590-candle-continuity-ledger.ts");
  const candle = (timestamp, close = 10) => ({ timestamp, open: close, high: close + 1, low: close - 1, close, volume: 100 });
  const continuity = pass590.buildPass590CandleContinuityLedger([
    candle(7200, 12), candle(3600, 10), candle(3600, 11), candle(18000, 15),
    { timestamp: 21600, open: 10, high: 8, low: 9, close: 10, volume: 1 },
  ], "1h");
  if (continuity.candles.length !== 3) errors.push("PASS590 did not exclude invalid/duplicate candle rows");
  if (continuity.candles[0]?.timestamp !== 3600 || continuity.candles[0]?.close !== 11) errors.push("PASS590 did not sort candles or retain latest duplicate observation");
  if (!continuity.duplicateCount || !continuity.gapCount || !continuity.invalidCount) errors.push("PASS590 issue accounting failed");

  const pass591 = loadPureTsModule("lib/market-integrity/pass591-chart-comparison-lens.ts");
  const primary = [candle(1, 10), candle(2, 11), candle(3, 12)];
  const secondary = [candle(1, 20), candle(2, 22), candle(3, 21)];
  const comparison = pass591.buildPass591ChartComparisonLens({ primary, secondary, primaryLabel: "A", secondaryLabel: "B", directPriceComparable: false, locale: "pl" });
  const blocked = pass591.buildPass591ChartComparisonLens({ primary, secondary: [candle(1, 20)], locale: "en" });
  if (comparison.state !== "ready" || comparison.points.length !== 3 || comparison.scaleMode !== "normalized_return") errors.push("PASS591 normalized comparison path failed");
  if (comparison.comparable !== false || !comparison.boundary.includes("znormalizowany")) errors.push("PASS591 non-comparable quote boundary failed");
  if (blocked.state !== "blocked" || blocked.points.length) errors.push("PASS591 exact timestamp minimum failed");
} catch (error) {
  errors.push(`PASS587–591 runtime helper test failed: ${error.stack || error.message}`);
}

for (const file of requiredFiles.filter((file) => /\.(tsx?|css)$/.test(file))) {
  if (file.endsWith(".css")) continue;
  const source = read(file);
  const parsed = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  for (const diagnostic of parsed.parseDiagnostics ?? []) {
    const position = parsed.getLineAndCharacterOfPosition(diagnostic.start ?? 0);
    errors.push(`${file}:${position.line + 1}:${position.character + 1} ${ts.flattenDiagnosticMessageText(diagnostic.messageText, " ")}`);
  }
}

const packageJson = JSON.parse(read("package.json") || "{}");
for (const script of ["verify:pass587-591-chart-identity-continuity-release", "typecheck:pass591"]) {
  if (!packageJson.scripts?.[script]) errors.push(`missing package script ${script}`);
}
if (!String(packageJson.scripts?.build || "").includes("verify:pass587-591-chart-identity-continuity-release")) {
  errors.push("PASS587–591 verifier missing from build chain");
}

if (errors.length) {
  console.error(`PASS587–591 gate failed (${errors.length})`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("PASS587–591 gate PASS · provider-route viewport identity · 10/14/20 evidence budgets · freshness scheduler · candle continuity ledger · normalized exact-timestamp comparison · parent refresh wiring");
