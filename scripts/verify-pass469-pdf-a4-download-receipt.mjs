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
const contract = read("lib/market-integrity/pass469-pdf-a4-download-receipt.ts");
const route = read("app/api/search/lens-report/route.ts");
const browser = read("components/search/VelmereIntelligenceSearchClient.tsx");
const shield = read("components/market-integrity/TokenRiskModal.tsx");
const shieldClient = read("components/market-integrity/MarketIntegrityClient.tsx");
const e2e = read("scripts/e2e-pass469-browser-pdf-receipt.mjs");

function requireMarkers(source, markers, label) {
  const missing = markers.filter((marker) => !source.includes(marker));
  if (missing.length) throw new Error(`${label} missing: ${missing.join(", ")}`);
}

requireMarkers(
  contract,
  [
    'version: "pass469-a4-layout-v1"',
    "auditPass469A4Regions",
    "reserved footer",
    'event: "download_initiated"',
    "containsRawPayload: false",
    "window.localStorage.setItem",
    "receiptChecksum(base)",
  ],
  "PASS469 contract",
);
requireMarkers(
  route,
  [
    "buildPass469A4Layout",
    "pass469Layout.pageOne",
    "pass469Layout.pageTwo",
    "pass469Layout.pageThree",
    "pass469Layout.pageFour",
    '"x-velmere-a4-layout-audit": "pass469-ok"',
    "long tokens are hard-wrapped",
  ],
  "PASS469 PDF route",
);
requireMarkers(
  browser,
  [
    "buildPass469PdfDownloadReceipt",
    "writePass469PdfDownloadReceipt",
    "recordPass469DownloadReceipt",
    'data-pass469-responsive-pdf-toolbar="true"',
    'data-pass469-download-receipt="download_initiated"',
    'data-testid="lens-download-receipt"',
    'data-pass469-a4-overflow-audit="pass469-ok"',
  ],
  "PASS469 Browser",
);
requireMarkers(
  shield,
  [
    "handoffContext?: Pass468BrowserShieldOrbitHandoff",
    "confirmedHandoff",
    'data-pass469-shield-ai-handoff-confirmation="fresh-target-scan"',
    "Packet jest tylko kontekstem UI",
  ],
  "PASS469 Shield AI",
);
requireMarkers(
  shieldClient,
  ["handoffContext={lensHandoff?.packet}"],
  "PASS469 Shield handoff prop",
);
requireMarkers(
  e2e,
  [
    "data-pass469-responsive-pdf-toolbar",
    "download_initiated",
    "containsRawPayload",
    "document.documentElement.scrollWidth",
  ],
  "PASS469 E2E",
);

for (const [file, source, jsx] of [
  ["contract", contract, false],
  ["route", route, false],
  ["Browser", browser, true],
  ["Shield AI", shield, true],
  ["Shield client", shieldClient, true],
]) {
  const compilerOptions = {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
    ...(jsx ? { jsx: ts.JsxEmit.Preserve } : {}),
  };
  const result = ts.transpileModule(source, {
    compilerOptions,
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

const transpiled = ts.transpileModule(contract, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const runtime = await import(
  `data:text/javascript;base64,${Buffer.from(transpiled).toString("base64")}`
);

for (const depth of ["basic", "pro", "advanced"]) {
  for (const sourceCount of [0, 1, 4, 8]) {
    const layout = runtime.buildPass469A4Layout(depth, sourceCount);
    if (!layout.audit.ok) {
      throw new Error(`${depth}/${sourceCount} A4 audit failed: ${layout.audit.errors.join(" | ")}`);
    }
    for (const item of layout.regions) {
      if (item.top - item.height < layout.safeContentBottom) {
        throw new Error(`${item.id} entered the footer`);
      }
    }
  }
}

const store = new Map();
globalThis.window = {
  localStorage: {
    setItem(key, value) {
      store.set(String(key), String(value));
    },
    getItem(key) {
      return store.get(String(key)) ?? null;
    },
  },
};
const receipt = runtime.buildPass469PdfDownloadReceipt({
  filename: "velmere-lens-eth-advanced.pdf",
  symbol: "ETH",
  depth: "advanced",
  reportChecksum: "fixture-checksum",
  sourceConfidence: 76,
  sourceCount: 2,
  now: new Date("2026-06-07T12:00:00.000Z"),
});
if (!runtime.writePass469PdfDownloadReceipt(receipt)) {
  throw new Error("PASS469 receipt could not be persisted");
}
const restored = runtime.readPass469PdfDownloadReceipts();
if (
  restored[0]?.receiptId !== receipt.receiptId ||
  restored[0]?.event !== "download_initiated" ||
  restored[0]?.containsRawPayload !== false
) {
  throw new Error("PASS469 receipt round-trip failed");
}
const raw = JSON.parse(store.get("velmere:pass469:pdf-download-receipts"));
raw[0].symbol = "BTC";
store.set("velmere:pass469:pdf-download-receipts", JSON.stringify(raw));
if (runtime.readPass469PdfDownloadReceipts().length !== 0) {
  throw new Error("PASS469 receipt checksum accepted tampered data");
}
delete globalThis.window;

if (/selectedDepth === "advanced" \? 112 : 154/.test(route)) {
  throw new Error("PASS469 regression: old page-four footer overlap coordinates remain");
}
if (!route.includes("sourceTop - pass469Layout.pageTwo.sourceRowHeight")) {
  throw new Error("PASS469 source rows do not use the audited layout");
}

console.log("PASS469 PDF A4 layout, download receipt and Shield AI handoff verified");
