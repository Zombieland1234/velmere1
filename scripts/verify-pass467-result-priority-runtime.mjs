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
const clientFile = "components/search/VelmereIntelligenceSearchClient.tsx";
const client = read(clientFile);

const requiredClientMarkers = [
  'data-pass467-result-priority-runtime="true"',
  'data-pass467-result-first-layout="true"',
  'data-pass467-pdf-capsule-after-result',
  "normalizeClientSearchResults",
  "detailRequestRef.current?.abort()",
  "setResults([])",
  "signal: controller.signal",
  'role="combobox"',
  'role="listbox"',
  "pdfDepthLocked = pdfStage >= 2",
  "window.setTimeout(resolve, 1460)",
  'role="dialog"',
  'aria-modal="true"',
];
for (const marker of requiredClientMarkers) {
  if (!client.includes(marker)) {
    throw new Error(`${clientFile}: missing PASS467 marker ${marker}`);
  }
}

const resultIndex = client.indexOf('data-pass467-result-first-layout="true"');
const capsuleIndex = client.indexOf("data-pass467-pdf-capsule-after-result");
if (resultIndex < 0 || capsuleIndex < 0 || resultIndex >= capsuleIndex) {
  throw new Error("PASS467 layout regression: PDF capsule must render after committed results in DOM order");
}

const catalog = read("lib/search/pass466-real-market-lens.ts");
for (const marker of [
  "function clean(value: unknown)",
  "function normalizeMarketSymbol(value: unknown)",
  "if (!symbol || seen.has(key)) return false",
]) {
  if (!catalog.includes(marker)) {
    throw new Error(`pass466-real-market-lens.ts: missing runtime guard ${marker}`);
  }
}

// Prevent another lucide icon from shadowing native constructors such as Map/Set/URL.
const riskyGlobals = new Set([
  "Map",
  "Set",
  "Date",
  "URL",
  "File",
  "Image",
  "Number",
  "String",
  "Object",
  "Array",
  "Promise",
  "Error",
  "Node",
  "Element",
  "Event",
  "FormData",
  "Headers",
  "Request",
  "Response",
]);
const sourceRoots = ["components", "app", "lib"];
for (const sourceRoot of sourceRoots) {
  const stack = [path.join(root, sourceRoot)];
  while (stack.length) {
    const current = stack.pop();
    if (!current || !fs.existsSync(current)) continue;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
        continue;
      }
      if (!/\.(ts|tsx)$/.test(entry.name)) continue;
      const source = fs.readFileSync(full, "utf8");
      const importPattern = /import\s*\{([^}]+)\}\s*from\s*["']lucide-react["']/gs;
      for (const match of source.matchAll(importPattern)) {
        for (const rawPart of match[1].split(",")) {
          const part = rawPart.trim();
          const [original, alias] = part.split(/\s+as\s+/);
          if (riskyGlobals.has(original?.trim()) && !alias?.trim()) {
            throw new Error(
              `${path.relative(root, full)} imports lucide ${original.trim()} without alias and may shadow a native constructor`,
            );
          }
        }
      }
    }
  }
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
  const errors = (output.diagnostics ?? []).filter(
    (item) => item.category === ts.DiagnosticCategory.Error,
  );
  if (errors.length) {
    const message = errors
      .map((item) => ts.flattenDiagnosticMessageText(item.messageText, "\n"))
      .join("\n");
    throw new Error(`PASS467 TypeScript parse failed for ${path.relative(root, file)}\n${message}`);
  }
  parsed += 1;
}

console.log(`PASS467 result-priority/runtime guard verified · ${parsed} TS/TSX parsed`);
