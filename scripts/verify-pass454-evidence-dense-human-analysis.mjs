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
    if (!source.includes(needle)) throw new Error(`${file}: missing PASS454 marker ${needle}`);
  }
}

expect("lib/market-integrity/pass454-evidence-dense-human-analysis-runtime.ts", [
  'version: "pass454-evidence-dense-human-analysis-runtime"',
  'fieldCount: 10',
  'fieldCount: 14',
  'fieldCount: 20',
  'animatedVVisibleDuringGeneration: true',
  'previewAndDownloadShareBlob: true',
  'backgroundScrollLocked: true',
  'downloadIconRequired: true',
  'venueHealthSeparated: true',
  'dynamicProviderSearch: true',
  'sourceEntropy',
  'fakeLive',
  'narrativeDrift',
  'releaseMode',
  'providerResilience',
]);

expect("lib/search/lens-report.ts", [
  "buildPass454EvidenceDenseHumanAnalysis",
  "pass454: Pass454EvidenceDenseHumanAnalysis",
  "const pass454 = buildPass454EvidenceDenseHumanAnalysis",
  "pass454,",
]);

expect("components/search/VelmereIntelligenceSearchClient.tsx", [
  'data-pass454-evidence-dense-human-analysis="true"',
  'data-pass454-advanced-signature-metrics="true"',
  'data-pass454-evidence-dense-reader="true"',
  'data-pass454-depth-matrix="true"',
  "activeForgeIntelligence?.forge.stages",
  'data-testid="lens-download-link"',
  'data-pass450-hard-scroll-lock="true"',
]);

expect("app/api/search/lens-report/route.ts", [
  'LensReport["pass454"]["tiers"][number]',
  "report.pass454?.verdict.headline",
  "report.pass454?.verdict.summary",
  "report.pass454.tiers",
  "PASS454: page three uses evidence-dense Basic/Pro/Advanced tiers",
  "/Kids [4 0 R 6 0 R 8 0 R 10 0 R] /Count 4",
]);

expect("components/market-integrity/CrossAssetCollapseRadarPanel.tsx", [
  'data-pass454-evidence-dense-realmarkets="true"',
  'data-pass454-analysis-depth-copy="true"',
  "source entropy",
  "dynamic provider symbol",
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
    throw new Error(`PASS454 TypeScript parse failed for ${path.relative(root, file)}\n${message}`);
  }
  parsed += 1;
}

console.log(`PASS454 evidence-dense human analysis verified · ${parsed} TS/TSX parsed`);
