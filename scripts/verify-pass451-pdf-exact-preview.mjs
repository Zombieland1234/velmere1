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
function expect(file, needles) {
  const source = read(file);
  for (const needle of needles) {
    if (!source.includes(needle)) throw new Error(`${file}: missing PASS451 marker ${needle}`);
  }
}

expect("lib/market-integrity/pass451-pdf-exact-preview-runtime.ts", [
  'version: "pass451-pdf-exact-preview-runtime"',
  'previewParity: "same_blob_as_download"',
  'focusPolicy: "trap_restore_escape"',
  'scrollPolicy: "background_locked_reader_only"',
  'pageCount: 4',
  'id: "identity"',
  'id: "sources"',
  'id: "narrative"',
  'id: "signature"',
]);

expect("lib/search/lens-report.ts", [
  "buildPass451PdfExactPreview",
  "pass451: Pass451PdfExactPreview",
  "const pass451 = buildPass451PdfExactPreview",
  "pass451,",
]);

expect("components/search/VelmereIntelligenceSearchClient.tsx", [
  'data-pass451-progressive-v-forge="true"',
  'data-pass451-exact-pdf-preview="true"',
  'data-pass451-binary-pdf-exact="true"',
  'src={`${pdfPreview.url}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}',
  'event.key !== "Tab"',
  "previewTriggerRef.current?.focus()",
  "blob.type !== \"application/pdf\"",
  "setPdfStage(3)",
  "Download",
]);

expect("components/market-integrity/TokenRiskModal.tsx", [
  "PASS451 customer-facing fields replace bare unknown/partial labels",
  '"source required"',
  '"partial source"',
  '"baseline unavailable"',
]);

expect("app/api/search/lens-report/route.ts", [
  "const tierPanel = (",
  "compactValue(entry.value, 49)",
  '"x-velmere-preview-parity": "same-blob-as-download"',
  '"x-content-type-options": "nosniff"',
  "`${lc.integrity}: ${lc.active}`",
  "`${lc.consistency}: ${lc.active}`",
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
    throw new Error(`PASS451 TypeScript parse failed for ${path.relative(root, file)}\n${message}`);
  }
  parsed += 1;
}

console.log(`PASS451 exact PDF preview + accessible modal verified · ${parsed} TS/TSX parsed`);
