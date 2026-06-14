import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
let ts;
try {
  ts = require("typescript");
} catch {
  ts = require("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js");
}

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
function expect(file, needles) {
  const source = read(file);
  for (const needle of needles) {
    if (!source.includes(needle)) throw new Error(`${file}: missing PASS453 marker ${needle}`);
  }
}

expect("lib/market-integrity/pass453-unified-intelligence-handoff-runtime.ts", [
  'version: "pass453-unified-intelligence-handoff-runtime"',
  "confidenceCeiling",
  "sourceQuorum",
  "evidenceCoverage",
  "whatLimitsConfidence",
  "nextBestChecks",
  "signatureMetrics",
  "onePayloadAcrossBrowserShieldPdf: true",
  "noGeneratedSubstituteValues: true",
]);

expect("lib/search/lens-report.ts", [
  "buildPass453UnifiedIntelligenceHandoff",
  "pass453: Pass453UnifiedIntelligenceHandoff",
  "const pass453 = buildPass453UnifiedIntelligenceHandoff",
  "pass453,",
]);

expect("components/search/VelmereIntelligenceSearchClient.tsx", [
  'data-pass453-unified-intelligence-handoff="true"',
  'data-pass453-human-verdict="true"',
  'data-pass453-pdf-human-verdict="true"',
  "report.pass453.labels.diagnostics",
  "report.pass453.labels.sourceBound",
  'data-testid="lens-download-link"',
]);

expect("app/api/search/lens-report/route.ts", [
  "report.pass453.decision.eyebrow",
  "report.pass453.decision.confidenceCeiling",
  "report.pass453.signatureMetrics",
  "report.pass453.nextBestChecks",
  "PASS453: page one starts with a human verdict",
]);

expect("lib/search/intelligence-search-contract.ts", [
  'params.set("handoff", "pass453")',
  'params.set("source", "lens-pdf")',
  "PASS453 Search-to-Shield handoff",
]);

expect("components/market-integrity/MarketIntegrityClient.tsx", [
  'data-pass453-shield-handoff="true"',
  'data-pass453-browser-shield-connected="true"',
  'routeParams.get("handoff") === "pass453"',
  "Otwórz Mapę Shield",
  "Shield Map öffnen",
  "Open Shield Map",
]);

expect("app/api/market-integrity/real-markets/catalog/route.ts", [
  "const rawRows = [",
  "Inherited catalog rows are de-duplicated",
  "inheritedRowsCollapsed",
  "uniqueSymbols",
  'id: "PASS453"',
]);

expect("components/market-integrity/CrossAssetCollapseRadarPanel.tsx", [
  'data-pass453-catalog-dedupe="true"',
  'data-pass453-full-catalog-rows="true"',
  'fetch("/api/market-integrity/real-markets/catalog"',
  "payload.rows.map(assetFromCatalog)",
  "catalogCounts?.uniqueSymbols",
  "inheritedRowsCollapsed",
  "Pokaż więcej",
  "Mehr anzeigen",
  "Show more",
]);

expect("components/market-integrity/ShieldMapClient.tsx", [
  'data-pass453-shieldmap-handoff="true"',
  'searchParams.get("handoff") !== "pass453"',
  "Lens → Shield → Shield Map",
  "void runInvestigatorScan(null, requested)",
  "Wróć do Lens",
  "Zurück zu Lens",
  "Back to Lens",
]);

const skip = new Set(["node_modules", ".next", ".git", ".vercel", ".turbo", ".cache", "out", "dist"]);
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skip.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) files.push(full);
  }
}
walk(root);

let parsed = 0;
for (const file of files) {
  const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.Preserve,
      isolatedModules: true,
    },
    fileName: file,
    reportDiagnostics: true,
  });
  const errors = (output.diagnostics ?? []).filter((item) => item.category === ts.DiagnosticCategory.Error);
  if (errors.length) {
    const message = errors.map((item) => ts.flattenDiagnosticMessageText(item.messageText, "\n")).join("\n");
    throw new Error(`PASS453 TypeScript parse failed for ${path.relative(root, file)}\n${message}`);
  }
  parsed += 1;
}

console.log(`PASS453 unified intelligence handoff verified · ${parsed} TS/TSX parsed`);
