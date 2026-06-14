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
    if (!source.includes(needle)) throw new Error(`${file}: missing PASS455 marker ${needle}`);
  }
}

expect("lib/market-integrity/pass455-human-decision-pdf-forge-runtime.ts", [
  'version: "pass455-human-decision-pdf-forge-runtime"',
  'defaultPreview: "reader"',
  'exactPdfStillAvailable: true',
  'backgroundScrollLocked: true',
  'downloadIconRequired: true',
  'fieldBudgets: { basic: 10, pro: 14, advanced: 20 }',
  'Najpierw zrozum, potem wchodź głębiej',
  'Quelle erforderlich',
  'source required',
  'venueHealthSeparatedFromEquities: true',
]);

expect("lib/search/lens-report.ts", [
  "buildPass455HumanDecisionPdfForge",
  "pass455: Pass455HumanDecisionPdfForge",
  "const pass455 = buildPass455HumanDecisionPdfForge",
  "pass455,",
]);

expect("components/search/VelmereIntelligenceSearchClient.tsx", [
  'data-pass455-human-decision-pdf-forge="true"',
  'data-pass455-human-decision-card="true"',
  'data-pass455-human-reader="true"',
  'data-pass455-localized-depth-matrix="true"',
  'useState<PreviewView>("reader")',
  'setPreviewView("reader")',
  'data-testid="lens-download-link"',
  'activeForgeIntelligence?.forge.stages',
]);

expect("app/api/search/lens-report/route.ts", [
  'LensReport["pass455"]["tiers"][number]',
  "report.pass455?.executive.headline",
  "report.pass455?.executive.oneSentence",
  "report.pass455?.tiers",
  "PASS455: PDF uses localized human meanings",
  "/Kids [4 0 R 6 0 R 8 0 R 10 0 R] /Count 4",
]);

expect("components/market-integrity/CrossAssetCollapseRadarPanel.tsx", [
  'type Category = "all" | "crypto"',
  'tabs: { all: "Wszystko"',
  'tabs: { all: "Alles"',
  'tabs: { all: "All"',
  'useState<Category>("all")',
  'category === "all"',
  '["BINANCE", 0]',
  '["MEXC", 1]',
  'data-pass455-mixed-realmarkets-universe="true"',
]);

expect("components/market-integrity/ShieldMapClient.tsx", [
  "brak źródła",
  "Quelle fehlt",
  "source missing",
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
    throw new Error(`PASS455 TypeScript parse failed for ${path.relative(root, file)}\n${message}`);
  }
  parsed += 1;
}

console.log(`PASS455 human decision PDF forge verified · ${parsed} TS/TSX parsed`);
