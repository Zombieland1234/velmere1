import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
let ts;
try { ts = require("typescript"); } catch { ts = require("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js"); }

const root = process.cwd();
const target = path.join(root, "lib/market-integrity/pass440-semantic-drift-source-lineage-runtime.ts");
const source = fs.readFileSync(target, "utf8");

const broken = 'const source = input.source ?? providerNames(input.probes).join(" + ") || input.result.dataSources[0] || "resolved payload";';
const fixed = 'const source = input.source ?? (providerNames(input.probes).join(" + ") || input.result.dataSources[0] || "resolved payload");';

if (source.includes(broken)) {
  throw new Error("PASS443 failed: unparenthesized ??/|| expression is still present in pass440 lineage runtime.");
}
if (!source.includes(fixed)) {
  throw new Error("PASS443 failed: expected parenthesized fallback expression was not found.");
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
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.Preserve, isolatedModules: true },
    fileName: file,
    reportDiagnostics: true,
  });
  const errors = (output.diagnostics ?? []).filter((item) => item.category === ts.DiagnosticCategory.Error);
  if (errors.length) {
    const message = errors.map((item) => ts.flattenDiagnosticMessageText(item.messageText, "\n")).join("\n");
    throw new Error(`PASS443 TypeScript parse failed for ${path.relative(root, file)}\n${message}`);
  }
  parsed += 1;
}

console.log(`PASS443 nullish build hotfix verified · ${parsed} TS/TSX parsed`);
