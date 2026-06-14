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
const contract = read("lib/market-integrity/pass470-browser-runtime-qa.ts");
const browser = read("components/search/VelmereIntelligenceSearchClient.tsx");
const receipt = read("lib/market-integrity/pass469-pdf-a4-download-receipt.ts");
const route = read("app/api/search/lens-report/route.ts");

function requireMarkers(source, markers, label) {
  const missing = markers.filter((marker) => !source.includes(marker));
  if (missing.length) throw new Error(`${label} missing: ${missing.join(", ")}`);
}

requireMarkers(
  contract,
  [
    'version: "pass470-keyboard-qa-v1"',
    "auditPass470KeyboardFlow",
    'id === "lens-download-link"',
    'id === "lens-preview-close"',
    "buildPass470ReceiptHistory",
    'redaction: "no_raw_payload"',
    "buildPass470RuntimeGuard",
    "PASS470_BROWSER_RUNTIME_QA_CONTRACT",
  ],
  "PASS470 contract",
);

requireMarkers(
  browser,
  [
    "readPass469PdfDownloadReceipts",
    "buildPass470ReceiptHistory",
    "auditPass470KeyboardFlow",
    "buildPass470RuntimeGuard",
    'data-pass470-browser-runtime-qa="true"',
    'data-pass470-keyboard-control="combobox"',
    'data-pass470-keyboard-control="pdf-depth"',
    'data-pass470-keyboard-control="download"',
    'data-pass470-keyboard-control="close"',
    'data-pass470-receipt-history="true"',
    'data-pass470-a4-screen-check="reader-safe"',
    "receiptHistory.checksum",
    "aria-keyshortcuts=\"Escape Enter Space\"",
  ],
  "PASS470 Browser",
);

requireMarkers(
  receipt,
  ["readPass469PdfDownloadReceipts", "receiptChecksum(base)", "containsRawPayload: false"],
  "PASS469 receipt source reused by PASS470",
);

requireMarkers(
  route,
  ["buildPass469A4Layout", "pass469Layout.pageFour", "long tokens are hard-wrapped"],
  "PASS470 PDF route compatibility",
);

for (const [file, source, jsx] of [
  ["contract", contract, false],
  ["Browser", browser, true],
  ["receipt", receipt, false],
  ["route", route, false],
]) {
  const result = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      ...(jsx ? { jsx: ts.JsxEmit.Preserve } : {}),
    },
    reportDiagnostics: true,
    fileName: `${file}.${jsx ? "tsx" : "ts"}`,
  });
  const errors = (result.diagnostics || []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );
  if (errors.length) {
    throw new Error(
      `${file} transpile errors: ${errors
        .map((error) => ts.flattenDiagnosticMessageText(error.messageText, " "))
        .join(" | ")}`,
    );
  }
}

const transpiledContract = ts.transpileModule(contract, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const runtime = await import(`data:text/javascript;base64,${Buffer.from(transpiledContract).toString("base64")}`);

const keyboard = runtime.auditPass470KeyboardFlow([
  { id: "lens-search-input", role: "combobox", label: "Search", tabbable: true, enterActivates: true },
  { id: "lens-depth-basic", role: "button", label: "Basic", tabbable: true, enterActivates: true, spaceActivates: true },
  { id: "lens-depth-pro", role: "button", label: "Pro", tabbable: true, enterActivates: true, spaceActivates: true },
  { id: "lens-depth-advanced", role: "button", label: "Advanced", tabbable: true, enterActivates: true, spaceActivates: true },
  { id: "lens-reader-toggle", role: "button", label: "Reader", tabbable: true, enterActivates: true, spaceActivates: true },
  { id: "lens-download-link", role: "link", label: "Download", tabbable: true, enterActivates: true },
  { id: "lens-preview-close", role: "button", label: "Close", tabbable: true, escapeCloses: true, enterActivates: true, spaceActivates: true },
]);
if (!keyboard.ok || keyboard.focusOrder[0] !== "lens-search-input") {
  throw new Error(`PASS470 keyboard audit failed: ${keyboard.failures.join(" | ")}`);
}

const badKeyboard = runtime.auditPass470KeyboardFlow([
  { id: "lens-search-input", role: "combobox", label: "Search", tabbable: true },
]);
if (badKeyboard.ok || !badKeyboard.failures.some((item) => item.includes("download"))) {
  throw new Error("PASS470 keyboard audit did not catch missing download/close controls");
}

const history = runtime.buildPass470ReceiptHistory([
  {
    version: "pass469-pdf-download-receipt-v1",
    receiptId: "r-old",
    event: "download_initiated",
    createdAt: "2026-06-07T10:00:00.000Z",
    filename: "old.pdf",
    symbol: "ETH",
    depth: "basic",
    reportChecksum: "old",
    sourceConfidence: 41,
    sourceCount: 1,
    containsRawPayload: false,
    checksum: "ignored-by-pass470",
  },
  {
    version: "pass469-pdf-download-receipt-v1",
    receiptId: "r-new",
    event: "download_initiated",
    createdAt: "2026-06-07T11:00:00.000Z",
    filename: "new.pdf",
    symbol: "BTC",
    depth: "advanced",
    reportChecksum: "new",
    sourceConfidence: 91,
    sourceCount: 4,
    containsRawPayload: false,
    checksum: "ignored-by-pass470",
  },
]);
if (history.latest?.receiptId !== "r-new" || history.redaction !== "no_raw_payload" || !history.checksum) {
  throw new Error("PASS470 receipt history ordering/redaction failed");
}

const guard = runtime.buildPass470RuntimeGuard({
  resultId: "bitcoin",
  symbol: "BTC",
  sources: [{ id: "cg" }],
  chips: ["crypto"],
  missingData: ["second venue"],
  sourceConfidence: 72,
});
if (!guard.safeToRender || guard.symbol !== "BTC" || !guard.risks.includes("missing_data_visible")) {
  throw new Error("PASS470 runtime guard failed on normal payload");
}
const fallbackGuard = runtime.buildPass470RuntimeGuard({ resultId: undefined, symbol: undefined, sourceConfidence: undefined });
if (!fallbackGuard.safeToRender || fallbackGuard.symbol !== "UNKNOWN" || !fallbackGuard.risks.includes("source_required")) {
  throw new Error("PASS470 runtime guard did not survive undefined payload");
}

const nativeCollisions = [...browser.matchAll(/import \{([^}]+)\} from "lucide-react"/g)]
  .flatMap((match) => match[1].split(",").map((part) => part.trim().split(/\s+as\s+/)[0].trim()))
  .filter((name) => ["Map", "Set", "URL", "Promise", "Date", "Symbol"].includes(name));
if (nativeCollisions.length) {
  throw new Error(`PASS470 native constructor collision: ${nativeCollisions.join(", ")}`);
}

console.log("PASS470 Browser runtime QA, receipt history and keyboard flow verified");
