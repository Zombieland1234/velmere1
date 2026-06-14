import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const ts = require("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js");

const root = process.cwd();
const required = [
  "lib/market-integrity/pass408-terminal-source-proof-orbit.ts",
  "components/market-integrity/CrossAssetCollapseRadarPanel.tsx",
  "components/search/VelmereIntelligenceSearchClient.tsx",
  "components/market-integrity/MarketIntegrityClient.tsx",
  "components/market-integrity/ShieldMapClient.tsx",
  "app/api/search/lens-report/route.ts",
  "app/api/market-integrity/real-markets/catalog/route.ts",
  "app/globals.css",
];

const missing = required.filter((file) => !fs.existsSync(path.join(root, file)));
if (missing.length) {
  console.error("PASS408 missing files", missing);
  process.exit(1);
}

const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const checks = [
  ["pass408 module", read("lib/market-integrity/pass408-terminal-source-proof-orbit.ts"), ["PASS408_RUNTIME_CLOSE_EVENT", "buildPass408TerminalSourceProofReadout", "buildPass408MarketCoverageUniverse", "pass408AssetVisualPatch", "pass408PseudoPricePatch"]],
  ["real markets", read("components/market-integrity/CrossAssetCollapseRadarPanel.tsx"), ["PASS408_RUNTIME_CLOSE_EVENT", "pass408TerminalSourceProofOrbit", "buildPass408MarketCoverageUniverse", "pass408Readout", "pass408SourceProofTimeline", "data-pass408-terminal-source-proof-orbit"]],
  ["browser search", read("components/search/VelmereIntelligenceSearchClient.tsx"), ["PASS408_RUNTIME_CLOSE_EVENT", "data-pass408-search-runtime-lock"]],
  ["shield search", read("components/market-integrity/MarketIntegrityClient.tsx"), ["PASS408_RUNTIME_CLOSE_EVENT", "data-pass408-search-runtime-lock"]],
  ["shield map search", read("components/market-integrity/ShieldMapClient.tsx"), ["PASS408_RUNTIME_CLOSE_EVENT", "data-pass408-search-runtime-lock"]],
  ["pdf route", read("app/api/search/lens-report/route.ts"), ["PASS408 TERMINAL SOURCE PROOF ORBIT", "page === 34", "pass408Readout", "pass408SourceProofTimeline", "pass408TerminalSourceProofOrbit", "data-pass408-preview-download-parity"]],
  ["catalog", read("app/api/market-integrity/real-markets/catalog/route.ts"), ["buildPass408MarketCoverageUniverse", "pass408TerminalSourceProofOrbit"]],
  ["css", read("app/globals.css"), ["data-pass408-terminal-source-proof-orbit", "real-markets-pass408-source-proof-orbit"]],
];

for (const [name, content, needles] of checks) {
  for (const needle of needles) {
    if (!content.includes(needle)) {
      console.error(`PASS408 guard failed: ${name} missing ${needle}`);
      process.exit(1);
    }
  }
}

const codeFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".next", ".git"].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) codeFiles.push(full);
  }
}
walk(root);
for (const file of codeFiles) {
  const source = fs.readFileSync(file, "utf8");
  const kind = file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  let output;
  try {
    output = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 }, fileName: file, reportDiagnostics: true, transformers: undefined });
  } catch (error) {
    console.error("PASS408 TypeScript transpile exception", file, error?.message || error);
    process.exit(1);
  }
  const syntactic = (output.diagnostics || []).filter((diag) => diag.category === ts.DiagnosticCategory.Error);
  if (syntactic.length) {
    console.error("PASS408 TypeScript parser error", file, syntactic.map((diag) => ts.flattenDiagnosticMessageText(diag.messageText, " ")));
    process.exit(1);
  }
}

const badFxKey = /(^|[\s,{])([A-Z]{3}\/[A-Z]{3})\s*:/m;
for (const file of codeFiles) {
  const source = fs.readFileSync(file, "utf8");
  const match = source.match(badFxKey);
  if (match) {
    console.error("PASS408 unquoted FX object key", file, match[2]);
    process.exit(1);
  }
}
console.log(`PASS408 terminal source-proof orbit guard passed · ${codeFiles.length} TS/TSX parsed`);
