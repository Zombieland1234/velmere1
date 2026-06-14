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
function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

const catalog = read("app/api/market-integrity/real-markets/catalog/route.ts");
for (const pass of [413, 414, 415, 416, 417, 418, 419]) {
  if (!catalog.includes(`buildPass${pass}MarketCoverageUniverse`)) throw new Error(`catalog missing buildPass${pass}MarketCoverageUniverse`);
  if (!catalog.includes(`pass${pass}:`)) throw new Error(`catalog missing pass${pass} contract entry`);
}
for (const forbidden of ["...buildPass409MarketCoverageUniverse(), ...buildPass410", "contract: { ...pass371", "];  return NextResponse"]) {
  if (catalog.includes(forbidden)) throw new Error(`catalog formatting regression: ${forbidden}`);
}
const routeChecks = [
  ["lib/market-integrity/pass449-architecture-dark-matter-guard.ts", "sourceTruthSpine"],
  ["lib/market-integrity/pass449-architecture-dark-matter-guard.ts", "classifyPass449Evidence"],
  ["lib/market-integrity/pass449-architecture-dark-matter-guard.ts", "pass449RedactForLedger"],
  ["lib/market-integrity/pass449-architecture-dark-matter-guard.ts", "buildPass449IdempotencyKey"],
  ["app/api/market-integrity/architecture-guard/route.ts", "pass449ArchitectureDarkMatterGuard"],
  ["lib/launch/redacted-logger.ts", "pass449-schema-envelope"],
  ["lib/wallet/useWalletConnect.ts", "accountsChanged"],
  ["lib/wallet/useWalletConnect.ts", "resetEvmSession"],
];
for (const [file, needle] of routeChecks) {
  if (!read(file).includes(needle)) throw new Error(`${file}: missing PASS449 marker ${needle}`);
}

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
    throw new Error(`PASS449 TypeScript parse failed for ${path.relative(root, file)}\n${message}`);
  }
  parsed += 1;
}
console.log(`PASS449 catalog 413-419 + dark matter guard verified · ${parsed} TS/TSX parsed`);
