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
const required = [
  ["lib/market-integrity/pass426-angel-provider-gateway.ts", "pass426-angel-provider-gateway"],
  ["lib/market-integrity/pass426-angel-provider-gateway.ts", "Velmère Angel"],
  ["lib/market-integrity/pass426-angel-provider-gateway.ts", "VELMERE_ANGEL_PROVIDER"],
  ["lib/market-integrity/pass426-angel-provider-gateway.ts", "local_openai_compatible"],
  ["lib/market-integrity/pass426-angel-provider-gateway.ts", "server_openai_compatible"],
  ["lib/market-integrity/pass426-angel-provider-gateway.ts", "sanitizeModelOutput"],
  ["app/api/market-integrity/angel/route.ts", "persona: \"Velmère Angel\""],
  ["app/api/market-integrity/chat/route.ts", "pass426: angel"],
  ["VELMERE_PASS426_ANGEL_PROVIDER_GATEWAY_REPORT.md", "PASS426"],
];

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".next", ".git", "out", "dist"].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) out.push(full);
  }
  return out;
}

for (const [file, marker] of required) {
  const abs = path.join(root, file);
  if (!fs.existsSync(abs)) throw new Error(`Missing required file: ${file}`);
  const text = read(file);
  if (!text.includes(marker)) throw new Error(`Missing marker ${marker} in ${file}`);
}

const angel = read("lib/market-integrity/pass426-angel-provider-gateway.ts");
if (!angel.includes("Use only the provided JSON payload")) throw new Error("Angel system prompt must be payload-bound.");
if (!angel.includes("API keys stay server-side") && !angel.includes("Klucze API zostają po stronie serwera")) throw new Error("Angel safety rails must mention server-side API keys.");
if (/NEXT_PUBLIC_.*ANGEL/.test(angel)) throw new Error("Angel provider must not use NEXT_PUBLIC client-exposed keys.");
if (!angel.includes("provider_error_fallback")) throw new Error("Angel provider needs deterministic fallback on provider error.");

const route = read("app/api/market-integrity/angel/route.ts");
if (/export async function POST/.test(route)) throw new Error("PASS426 Angel route should stay GET-only until POST abuse guard is explicit.");
if (!route.includes("applyApiAbuseShield")) throw new Error("Angel route must keep abuse shield.");

let parsed = 0;
for (const file of walk(root)) {
  const source = fs.readFileSync(file, "utf8");
  const output = ts.transpileModule(source, {
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
    throw new Error(`TypeScript parse failed for ${path.relative(root, file)}\n${message}`);
  }
  parsed += 1;
}

console.log(`PASS426 Angel provider gateway verified · ${parsed} TS/TSX parsed`);
