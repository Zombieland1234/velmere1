import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const errors = [];
const requiredFiles = [
  "lib/market-integrity/pass580-pdf-visual-fixtures.ts",
  "lib/market-integrity/pass581-pdf-page-compositor.ts",
  "lib/market-integrity/pass582-source-citation-rail.ts",
  "lib/market-integrity/pass583-download-parity-gate.ts",
  "lib/market-integrity/pass584-pdf-accessibility.ts",
  "lib/market-integrity/pass585-shared-crosshair-inspector.ts",
  "lib/motion/pass586-mobile-chart-gestures.ts",
  "fixtures/pass580-pdf-visual-regression.json",
  "lib/search/lens-report.ts",
  "components/search/VelmereIntelligenceSearchClient.tsx",
  "components/market-integrity/AdvancedMarketChart.tsx",
  "app/api/search/lens-report/route.ts",
  "app/globals.css",
  "tsconfig.pass586.json",
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

markers("lib/market-integrity/pass580-pdf-visual-fixtures.ts", [
  'version: "pass580-pdf-visual-fixtures"',
  "PASS580_PDF_VISUAL_FIXTURES",
  "resolvePass580Density",
]);
markers("lib/market-integrity/pass581-pdf-page-compositor.ts", [
  'version: "pass581-pdf-page-compositor"',
  "movedBlocks",
  "compactedBlocks",
]);
markers("lib/market-integrity/pass582-source-citation-rail.ts", [
  'version: "pass582-source-citation-rail"',
  "lens-source-",
  "S${number}",
]);
markers("lib/market-integrity/pass583-download-parity-gate.ts", [
  'version: "pass583-download-parity-gate"',
  "manifestKey",
  "VLM-PARITY-",
]);
markers("lib/market-integrity/pass584-pdf-accessibility.ts", [
  'version: "pass584-pdf-accessibility"',
  "reader_ready_pdf_limited",
  "taggedStructure: false",
]);
markers("lib/market-integrity/pass585-shared-crosshair-inspector.ts", [
  'version: "pass585-shared-crosshair-inspector"',
  "accessibleLabel",
  "timestampLabel",
]);
markers("lib/motion/pass586-mobile-chart-gestures.ts", [
  'version: "pass586-mobile-chart-gestures"',
  'touchAction: "pan-y"',
  "resolvePass586GestureAxis",
]);
markers("lib/search/lens-report.ts", [
  "pass580: Pass580PdfVisualFixtureReceipt",
  "pass581: Pass581PdfPageCompositor",
  "pass582: Pass582SourceCitationRail",
  "pass583: Pass583DownloadParityGate",
  "pass584: Pass584PdfAccessibility",
  "buildPass583DownloadParityGate",
]);
markers("components/search/VelmereIntelligenceSearchClient.tsx", [
  "data-pass580-visual-fixture",
  "data-pass581-page-compositor",
  "data-pass582-source-citation-rail",
  "data-pass583-download-parity",
  "data-pass584-keyboard-page-navigation",
  'role="document"',
]);
markers("components/market-integrity/AdvancedMarketChart.tsx", [
  "buildPass585SharedCrosshairInspector",
  "data-pass585-shared-crosshair-inspector",
  "data-pass586-mobile-chart-gestures",
  "resolvePass586GestureAxis",
  "Shift+ArrowLeft",
  "min-h-11",
]);
markers("app/api/search/lens-report/route.ts", [
  "parity_manifest_mismatch",
  "x-velmere-parity-manifest",
  "x-velmere-accessibility",
  "/DisplayDocTitle true",
  "/Info 12 0 R",
]);
markers("app/globals.css", [
  "PASS580–586",
  "data-pass582-citation-count",
  "data-pass586-mobile-chart-gestures",
  "break-inside: avoid",
]);

const readerSource = read("components/search/VelmereIntelligenceSearchClient.tsx");
const evidenceIndex = readerSource.indexOf('id="lens-reader-page-evidence"');
const analysisIndex = readerSource.indexOf('id="lens-reader-page-analysis"');
const boundaryIndex = readerSource.indexOf('id="lens-reader-page-boundary"');
if (!(evidenceIndex > 0 && evidenceIndex < analysisIndex && analysisIndex < boundaryIndex)) {
  errors.push("Reader page DOM order is not decision → evidence → analysis → boundary");
}

try {
  const fixturePayload = JSON.parse(read("fixtures/pass580-pdf-visual-regression.json"));
  const fixtures = fixturePayload.fixtures || [];
  if (fixtures.length !== 27) errors.push(`PASS580 fixture count ${fixtures.length}, expected 27`);
  if (new Set(fixtures.map((fixture) => fixture.id)).size !== 27) errors.push("PASS580 fixture IDs are not unique");
  for (const locale of ["pl", "de", "en"]) {
    for (const depth of ["basic", "pro", "advanced"]) {
      for (const density of ["short", "normal", "overloaded"]) {
        if (!fixtures.some((fixture) => fixture.locale === locale && fixture.depth === depth && fixture.density === density)) {
          errors.push(`PASS580 fixture missing ${locale}/${depth}/${density}`);
        }
      }
    }
  }
} catch (error) {
  errors.push(`PASS580 fixture JSON invalid: ${error.message}`);
}

function loadPureTsModule(file) {
  const source = read(file);
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: file,
  }).outputText;
  const module = { exports: {} };
  const localRequire = (specifier) => {
    if (specifier.startsWith("./") || specifier.startsWith("../")) return {};
    throw new Error(`unexpected runtime import ${specifier} in ${file}`);
  };
  const execute = new Function("exports", "require", "module", "__filename", "__dirname", output);
  execute(module.exports, localRequire, module, file, path.dirname(file));
  return module.exports;
}

try {
  const pass580 = loadPureTsModule("lib/market-integrity/pass580-pdf-visual-fixtures.ts");
  if (pass580.PASS580_PDF_VISUAL_FIXTURES.length !== 27) errors.push("PASS580 runtime fixture matrix is not 27");
  const receipt = pass580.buildPass580PdfVisualFixtureReceipt({ locale: "pl", depth: "advanced", maxDensity: 108, sourceCount: 5, fieldBudget: 20, checksum: "abc" });
  if (receipt.density !== "overloaded" || receipt.state !== "review") errors.push("PASS580 overloaded fixture resolution failed");

  const pass581 = loadPureTsModule("lib/market-integrity/pass581-pdf-page-compositor.ts");
  const plan = pass581.buildPass581PdfPageCompositor([
    { id: "a", preferredPage: "decision", characters: 2400, rows: 3 },
    { id: "b", preferredPage: "decision", characters: 1200, rows: 3 },
  ]);
  if (!plan.movedBlocks.length && !plan.compactedBlocks.length) errors.push("PASS581 did not move or compact an oversized block");

  const pass582 = loadPureTsModule("lib/market-integrity/pass582-source-citation-rail.ts");
  const rail = pass582.buildPass582SourceCitationRail([
    { label: "Primary", mode: "live", freshness: "now", confidence: 88, note: "Verified", evidenceState: "confirmed" },
    { label: "Second", mode: "fallback", freshness: "5m", confidence: 54, note: "Partial", evidenceState: "partial" },
  ]);
  if (rail.citations[0]?.id !== "S01" || rail.citations[1]?.anchor !== "lens-source-02") errors.push("PASS582 stable citation IDs failed");

  const pass583 = loadPureTsModule("lib/market-integrity/pass583-download-parity-gate.ts");
  const parityInput = { symbol: "ETH", locale: "pl", depth: "advanced", reportChecksum: "abc", parityKey: "VLM-1", sections: [{ id: "brief", title: "Brief", body: "Body" }], compositor: plan, citationRail: rail };
  const parityA = pass583.buildPass583DownloadParityGate(parityInput);
  const parityB = pass583.buildPass583DownloadParityGate(parityInput);
  if (parityA.manifestKey !== parityB.manifestKey) errors.push("PASS583 manifest is not deterministic");

  const pass584 = loadPureTsModule("lib/market-integrity/pass584-pdf-accessibility.ts");
  const accessibility = pass584.buildPass584PdfAccessibility("de");
  if (accessibility.documentLanguage !== "de-DE" || accessibility.pdf.taggedStructure !== false) errors.push("PASS584 accessibility boundary failed");

  const pass585 = loadPureTsModule("lib/market-integrity/pass585-shared-crosshair-inspector.ts");
  const inspector = pass585.buildPass585SharedCrosshairInspector({ candle: { timestamp: 1710000000, open: 10, high: 12, low: 9, close: 11, volume: 1000 }, previous: { timestamp: 1709990000, open: 9, high: 11, low: 8, close: 10, volume: 900 }, locale: "en", symbol: "ETH", source: "source", range: "1d" });
  if (!inspector.accessibleLabel.includes("Open") || inspector.changeLabel !== "+10.00%") errors.push("PASS585 inspector output failed");

  const pass586 = loadPureTsModule("lib/motion/pass586-mobile-chart-gestures.ts");
  if (pass586.resolvePass586GestureAxis(20, 3) !== "horizontal" || pass586.resolvePass586GestureAxis(3, 20) !== "vertical") errors.push("PASS586 gesture axis lock failed");
} catch (error) {
  errors.push(`PASS580–586 runtime helper test failed: ${error.stack || error.message}`);
}

for (const file of requiredFiles.filter((file) => /\.tsx?$/.test(file))) {
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
for (const script of ["verify:pass580-586-pdf-chart-interaction-release", "typecheck:pass586"]) {
  if (!packageJson.scripts?.[script]) errors.push(`missing package script ${script}`);
}
if (!String(packageJson.scripts?.build || "").includes("verify:pass580-586-pdf-chart-interaction-release")) {
  errors.push("PASS580–586 verifier missing from build chain");
}

if (errors.length) {
  console.error(`PASS580–586 gate failed (${errors.length})`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("PASS580–586 gate PASS · 27 PDF fixtures · pre-render page compositor · compact source citations · download parity manifest · semantic Reader · shared OHLCV inspector · mobile pan/pinch without vertical scroll theft");
