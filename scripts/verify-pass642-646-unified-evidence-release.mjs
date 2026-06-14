import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";

const root = process.cwd();
const nativeRequire = createRequire(import.meta.url);
let ts;
try {
  ts = nativeRequire("typescript");
} catch {
  ts = nativeRequire("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js");
}
const cache = new Map();

function read(relative) {
  return fs.readFileSync(path.join(root, relative), "utf8");
}

function resolveTs(request, parent) {
  if (request.startsWith("@/")) return path.join(root, request.slice(2)) + ".ts";
  if (request.startsWith(".")) return path.resolve(path.dirname(parent), request) + (path.extname(request) ? "" : ".ts");
  return null;
}

function loadTs(relative) {
  const absolute = path.isAbsolute(relative) ? relative : path.join(root, relative);
  if (cache.has(absolute)) return cache.get(absolute).exports;
  const source = fs.readFileSync(absolute, "utf8");
  const output = ts.transpileModule(source, {
    fileName: absolute,
    reportDiagnostics: true,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      strict: true,
    },
  });
  const errors = (output.diagnostics ?? []).filter((item) => item.category === ts.DiagnosticCategory.Error);
  assert.equal(errors.length, 0, `${relative}: ${errors.map((item) => ts.flattenDiagnosticMessageText(item.messageText, "\n")).join("\n")}`);
  const module = { exports: {} };
  cache.set(absolute, module);
  const localRequire = (request) => {
    const resolved = resolveTs(request, absolute);
    return resolved ? loadTs(resolved) : nativeRequire(request);
  };
  vm.runInThisContext(`(function(require,module,exports,__filename,__dirname){${output.outputText}\n})`, { filename: absolute })(
    localRequire,
    module,
    module.exports,
    absolute,
    path.dirname(absolute),
  );
  return module.exports;
}

const lens = loadTs("lib/search/lens-report.ts");
const pass642 = loadTs("lib/market-integrity/pass642-pdfua-external-validation-lane.ts");
const pass645 = loadTs("lib/market-integrity/pass645-premium-mobile-performance-budget.ts");

const report = lens.buildLensReport(
  {
    id: "pass646-apple",
    title: "Apple Inc.",
    symbol: "AAPL",
    category: "market",
    tone: "review",
    summary: "Source-bound Apple market snapshot for parity and outage replay.",
    whyItMatters: "Provider timestamps and filing periods must remain separate.",
    missingData: ["independent filing confirmation"],
    nextOperatorStep: "Attach a current filing receipt with publication and period dates.",
    sourceMode: "live",
    sourceConfidence: 82,
    shieldHref: "/market-integrity?asset=apple",
    sources: [
      { id: "primary", label: "Primary quote", mode: "live", freshness: "2026-06-09T09:59:30.000Z", confidence: 88, note: "provider timestamp" },
      { id: "secondary", label: "Secondary quote", mode: "live", freshness: "2026-06-09T09:59:00.000Z", confidence: 82, note: "independent provider timestamp" },
    ],
    chips: ["stock", "filing"],
    marketSnapshot: {
      assetClass: "stock",
      currency: "USD",
      price: 200,
      observedAt: "2026-06-09T09:59:30.000Z",
      venueReferencePrice: 200,
      venueSecondaryPrice: 200.25,
      venueComparisonState: "aligned",
      venueConfidenceCap: 80,
      fundamentalFilingDate: "2026-05-01",
      fundamentalConfidenceCap: 60,
    },
  },
  "en",
  "advanced",
  "2026-06-09T10:00:00.000Z",
);

assert.equal(report.pass642.state, "structural_ready", "PASS642 internal structure should be ready without claiming PDF/UA");
assert.equal(report.pass642.complianceClaim, null, "PASS642 cannot claim PDF/UA without external and human validation");
assert(report.pass642.structuralChecks.every((check) => check.passed), "PASS642 structural checks must pass for the generated report");
const validated = pass642.buildPass642PdfUaExternalValidationLane({
  accessibility: report.pass611,
  externalReceipt: {
    validator: "veraPDF",
    validatorVersion: "test-fixture",
    profile: "PDF/UA-1",
    executedAt: "2026-06-09T10:05:00.000Z",
    passed: true,
    machineCheckFailures: 0,
    reportSha256: "a".repeat(64),
    humanReview: "passed",
    notes: ["fixture only"],
  },
});
assert.equal(validated.state, "validated", "PASS642 exact binary may be validated only after machine and human checks");
assert.equal(validated.complianceClaim, "PDF/UA-1", "PASS642 validated receipt should expose the proven profile");

assert.equal(report.pass643.requiredCases.length, 27, "PASS643 must cover 3 locales × 3 depths × 3 visual modes");
assert.equal(report.pass643.currentCase.uniquePageIds, true, "PASS643 page IDs must be unique");
assert.equal(report.pass643.captureContract.contentLossAllowed, false, "PASS643 cannot allow visual content loss");
assert(report.pass643.extremeFixtures.some((fixture) => fixture.id === "unbroken_word"), "PASS643 unbroken-word fixture missing");

assert.equal(report.pass644.scenarios.length, 5, "PASS644 must replay live/partial/stale/fallback/offline");
assert.equal(report.pass644.consistencyFailures.length, 0, "PASS644 surfaces must share one replay digest");
for (const scenario of report.pass644.scenarios) {
  assert.equal(new Set(Object.values(scenario.surfaces).map((surface) => surface.digest)).size, 1, `${scenario.id} digest drift`);
}
const offline = report.pass644.scenarios.find((scenario) => scenario.sourceState === "offline");
assert.equal(offline?.surfaces.pdf.currentClaimAllowed, false, "PASS644 offline PDF cannot confirm current facts");
assert.equal(offline?.surfaces.brain.currentClaimAllowed, false, "PASS644 offline Brain cannot confirm current facts");

const healthyBudget = pass645.buildPass645PremiumMobilePerformanceBudget({
  viewportWidth: 390,
  inpMs: 130,
  cls: 0.03,
  maxLongTaskMs: 44,
  longTaskCount: 2,
  maxAnimationFrameMs: 18,
  activeWebglScenes: 1,
  hiddenScenesFrozen: true,
  horizontalOverflowPx: 0,
});
assert.equal(healthyBudget.state, "pass", "PASS645 healthy sample must pass");
const brokenBudget = pass645.buildPass645PremiumMobilePerformanceBudget({
  viewportWidth: 320,
  inpMs: 420,
  cls: 0.22,
  maxLongTaskMs: 180,
  longTaskCount: 12,
  maxAnimationFrameMs: 48,
  activeWebglScenes: 2,
  hiddenScenesFrozen: false,
  horizontalOverflowPx: 28,
});
assert.equal(brokenBudget.state, "blocked", "PASS645 severe mobile regressions must block release");
assert(brokenBudget.violations.includes("hidden_scene_not_frozen"), "PASS645 hidden-scene freeze gate missing");

assert.notEqual(report.pass646.state, "blocked", `PASS646 ledger blocked: ${report.pass646.orphanClaimIds.join(",")}`);
assert.equal(report.pass646.duplicateSourceIds.length, 0, "PASS646 source IDs must be unique");
assert.equal(report.pass646.duplicateAtomIds.length, 0, "PASS646 atom IDs must be unique");
assert.equal(report.pass646.orphanClaimIds.length, 0, "PASS646 claims cannot reference missing sources");
assert.equal(new Set(Object.values(report.pass646.surfaceHandoff).map((surface) => surface.evidenceKey)).size, 1, "PASS646 evidence key must survive every handoff");
assert.equal(new Set(Object.values(report.pass646.surfaceHandoff).map((surface) => surface.snapshotId)).size, 1, "PASS646 snapshot ID must survive every handoff");

const reportSource = read("lib/search/lens-report.ts");
for (const marker of ["buildPass642PdfUaExternalValidationLane", "buildPass643ReaderPdfVisualParityMatrix", "buildPass644SourceOutageReplayLab", "buildPass645PremiumMobilePerformanceBudget", "buildPass646UnifiedEvidenceLedger"]) {
  assert(reportSource.includes(marker), `Lens report missing ${marker}`);
}
const reader = read("components/search/VelmereIntelligenceSearchClient.tsx");
for (const marker of ["data-pass642-pdfua-validation", "data-pass643-visual-parity", "data-pass644-source-replay", "data-pass645-mobile-budget", "data-pass646-unified-ledger", "data-evidence-key"]) {
  assert(reader.includes(marker), `Reader missing ${marker}`);
}
const route = read("app/api/search/lens-report/route.ts");
for (const marker of ["x-velmere-pdfua-validation", "x-velmere-visual-parity", "x-velmere-source-replay", "x-velmere-mobile-budget", "x-velmere-unified-evidence", "x-velmere-snapshot-id"]) {
  assert(route.includes(marker), `PDF route missing ${marker}`);
}
const modal = read("components/market-integrity/TokenRiskModal.tsx");
const extracted = read("components/market-integrity/shield/ShieldEvidenceSummary.tsx");
const selector = read("components/market-integrity/shield/ShieldAnalysisTierSelector.tsx");
assert(modal.includes("ShieldEvidenceSummary"), "TokenRiskModal must use the extracted evidence summary");
assert(modal.includes("ShieldAnalysisTierSelector"), "TokenRiskModal must use the extracted tier selector");
assert(extracted.includes('data-pass646-surface="shield"'), "Shield evidence summary missing PASS646 surface identity");
assert(extracted.includes('data-pass645-mobile-budget="interaction-safe"'), "Shield evidence summary missing PASS645 budget contract");
assert(selector.includes('data-pass615-tier-selector="extracted"'), "Shield tier selector missing extracted architecture marker");
assert(selector.includes('data-pass645-mobile-budget="interaction-safe"'), "Shield tier selector missing PASS645 interaction budget contract");
assert(selector.includes('aria-pressed={selectedTier === tier}'), "Shield tier selector must expose its pressed state");

console.log(`PASS642–646 unified evidence release verified · ${report.pass646.evidenceKey}`);
