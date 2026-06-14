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
const expect = (file, needles) => {
  const source = read(file);
  for (const needle of needles) {
    if (!source.includes(needle)) throw new Error(`${file}: missing PASS457 marker ${needle}`);
  }
};
const reject = (file, needles) => {
  const source = read(file);
  for (const needle of needles) {
    if (source.includes(needle)) throw new Error(`${file}: stale PASS457 pattern ${needle}`);
  }
};

expect("lib/market-integrity/shield-chat.ts", [
  'export type ShieldChatLocale = "pl" | "de" | "en"',
  'sourceState: "source_bound" | "partial" | "source_required"',
  "humanMissingValue",
  "resolvePass446Locale",
  "requestedLocale: string = \"pl\"",
  "const sourceState: ShieldChatResponse[\"sourceState\"]",
  "Missing data increases uncertainty, not confidence.",
  "Brak danych zwiększa niepewność, nie pewność.",
  "Fehlende Daten erhöhen Unsicherheit, nicht Sicherheit.",
]);
reject("lib/market-integrity/shield-chat.ts", [
  'return "unknown"',
  ': "unknown"',
  'Coverage unknown.',
  'value: worstStress ? `${worstStress.score}/100` : "unknown"',
]);

expect("components/market-integrity/TokenRiskModal.tsx", [
  'data-pass457-shield-ai-runtime="true"',
  'data-pass457-progressive-operator-diagnostics="true"',
  "<AskShieldChatPanel",
  "locale={auditLocale}",
  "buildShieldChatResponse(result, history, prompt, locale)",
  "Operator diagnostics",
  "Diagnostyka operatora",
  "Operator-Diagnostik",
]);

expect("app/api/market-integrity/angel/route.ts", [
  "buildShieldChatResponse(result, history, prompt, locale)",
]);
expect("app/api/market-integrity/chat/route.ts", [
  'const localeCandidate = searchParams.get("locale")?.trim() || "pl";',
  "buildShieldChatResponse(result, history, prompt, locale)",
]);
expect("app/api/market-integrity/report/route.ts", [
  'const localeCandidate = searchParams.get("locale")?.trim() || "pl";',
  "buildShieldChatResponse(result, history, searchParams.get(\"prompt\") ?? \"Explain the current risk.\", locale)",
]);

const packageJson = JSON.parse(read("package.json"));
if (!packageJson.scripts?.["verify:pass457-shield-ai-progressive-disclosure"]) {
  throw new Error("package.json: PASS457 verifier script missing");
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
    throw new Error(`PASS457 TypeScript parse failed for ${path.relative(root, file)}\n${message}`);
  }
  parsed += 1;
}

console.log(`PASS457 Shield AI runtime + progressive disclosure verified · ${parsed} TS/TSX parsed`);
