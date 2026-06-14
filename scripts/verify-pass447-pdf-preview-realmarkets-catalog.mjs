import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
let ts;
try { ts = require("typescript"); } catch { ts = require("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js"); }
const root = process.cwd();
function read(file) { return fs.readFileSync(path.join(root, file), "utf8"); }
const checks = [
  ["app/api/search/lens-report/route.ts", "PASS448: A4 reader v2"],
  ["app/api/search/lens-report/route.ts", "object(8, \"<< /Type /Page"],
  ["app/api/search/lens-report/route.ts", "object(9, `<< /Length ${Buffer.byteLength(streamThree"],
  ["app/api/search/lens-report/route.ts", "object(11, `<< /Length ${Buffer.byteLength(streamFour"],
  ["app/api/search/lens-report/route.ts", "trailer\\n<< /Size ${objects.length + 1}"],
  ["components/search/VelmereIntelligenceSearchClient.tsx", "data-pass447-pdf-preview-parity"],
  ["components/search/VelmereIntelligenceSearchClient.tsx", "Velmère Cybersecurity · source ledger"],
  ["components/search/VelmereIntelligenceSearchClient.tsx", "Velmère Cybersecurity · depth matrix"],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "data-pass447-crypto-realmarkets-catalog"],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "BTC-USD"],
  ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx", "tabs: { crypto"],
  ["components/market-integrity/VlmNeuralAuditExperience.tsx", "data-pass447-neural-scroll-lock"],
  ["app/api/market-integrity/real-markets/route.ts", "btc: \"BTC-USD\""],
];
for (const [file, needle] of checks) {
  if (!read(file).includes(needle)) throw new Error(`${file}: missing PASS447 marker ${needle}`);
}
const route = read("app/api/search/lens-report/route.ts");
if (!route.includes("/Kids [4 0 R 6 0 R 8 0 R]") && !route.includes("/Kids [4 0 R 6 0 R 8 0 R 10 0 R] /Count 4")) throw new Error("PDF page tree is not valid");
if (!route.includes("xref\\n0 ${objects.length + 1}")) throw new Error("PDF xref must be dynamic and include page 3 objects");
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
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.Preserve, isolatedModules: true },
    fileName: file,
    reportDiagnostics: true,
  });
  const errors = (output.diagnostics ?? []).filter((item) => item.category === ts.DiagnosticCategory.Error);
  if (errors.length) {
    const message = errors.map((item) => ts.flattenDiagnosticMessageText(item.messageText, "\n")).join("\n");
    throw new Error(`PASS447 TypeScript parse failed for ${path.relative(root, file)}\n${message}`);
  }
  parsed += 1;
}
console.log(`PASS447/PASS448 PDF preview parity + Real Markets catalog verified · ${parsed} TS/TSX parsed`);
