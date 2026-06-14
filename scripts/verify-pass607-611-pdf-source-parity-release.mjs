import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const root = process.cwd();
const errors = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const requiredFiles = [
  "lib/market-integrity/pass607-claim-source-completeness-gate.ts",
  "lib/market-integrity/pass608-missing-source-appendix.ts",
  "lib/market-integrity/pass609-dynamic-a4-density-balancing.ts",
  "lib/market-integrity/pass610-reader-download-parity-manifest.ts",
  "lib/market-integrity/pass611-pdf-accessibility-phase-2.ts",
  "lib/search/lens-report.ts",
  "app/api/search/lens-report/route.ts",
  "components/search/VelmereIntelligenceSearchClient.tsx",
  "app/globals.css",
  "tsconfig.pass611.json",
];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) errors.push(`missing ${file}`);
}

function markers(file, values) {
  const source = read(file);
  for (const value of values) {
    if (!source.includes(value)) errors.push(`${file} missing marker: ${value}`);
  }
}

markers("lib/market-integrity/pass607-claim-source-completeness-gate.ts", [
  'version: "pass607-claim-source-completeness-gate"',
  '"missing_timestamp"',
  "confidenceCap",
  "timestampedSources",
]);
markers("lib/market-integrity/pass608-missing-source-appendix.ts", [
  'version: "pass608-missing-source-appendix"',
  "confidencePenalty",
  "nextCheck",
  "totalConfidencePenalty",
]);
markers("lib/market-integrity/pass609-dynamic-a4-density-balancing.ts", [
  'version: "pass609-dynamic-a4-density-balancing"',
  "widowOrphanMinimum: 2",
  'state: "placed" | "moved" | "compacted"',
  "renderedLineBudget",
]);
markers("lib/market-integrity/pass610-reader-download-parity-manifest.ts", [
  'version: "pass610-reader-download-parity-manifest"',
  'canonicalVisual: "pdf_blob"',
  'readerMode: "semantic_reflow"',
  "manifestKey",
]);
markers("lib/market-integrity/pass611-pdf-accessibility-phase-2.ts", [
  'version: "pass611-pdf-accessibility-phase-2"',
  "structTreeRootPrepared: true",
  "markedContent: true",
  "pdfUaClaim: false",
]);
markers("app/api/search/lens-report/route.ts", [
  "/StructTreeRoot 13 0 R",
  "/MarkInfo << /Marked true >>",
  "/StructParents 0",
  "/Sect <</MCID 0>> BDC",
  'error: "reader_download_manifest_mismatch"',
  '"x-velmere-pdfua-claim": "false"',
]);
markers("components/search/VelmereIntelligenceSearchClient.tsx", [
  "data-pass607-reader-claim-source-gate",
  "data-pass608-reader-appendix",
  "data-pass609-dynamic-a4-density",
  "data-pass610-reader-download-parity",
  "data-pass611-chart-alternative",
]);
markers("app/globals.css", [
  "PASS607–611",
  "break-inside: avoid",
  "data-pass610-reader-download-parity",
]);

function loadPureTsModule(file) {
  const source = read(file);
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: file,
    reportDiagnostics: true,
  });
  for (const diagnostic of output.diagnostics ?? []) {
    if (diagnostic.category === ts.DiagnosticCategory.Error) {
      errors.push(`${file} transpile: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, " ")}`);
    }
  }
  const module = { exports: {} };
  const execute = new Function("exports", "require", "module", "__filename", "__dirname", output.outputText);
  execute(module.exports, () => ({}), module, file, path.dirname(file));
  return module.exports;
}

try {
  const pass607 = loadPureTsModule("lib/market-integrity/pass607-claim-source-completeness-gate.ts");
  const generatedAt = "2026-06-08T10:00:00.000Z";
  const brief = {
    claims: [
      { id: "price", label: "Price", value: "100", state: "confirmed" },
      { id: "holders", label: "Holders", value: "missing", state: "source_required" },
      { id: "na", label: "N/A", value: "—", state: "not_applicable" },
    ],
  };
  const citationRail = {
    citations: [
      { id: "S01", label: "Provider A", state: "confirmed", freshness: "request-time", confidence: 82 },
      { id: "S02", label: "Provider B", state: "missing", freshness: "missing", confidence: 0 },
    ],
  };
  const footnotes = {
    claims: [
      { claimId: "C01", fieldId: "price", sourceIds: ["S01"] },
      { claimId: "C02", fieldId: "holders", sourceIds: ["S02"] },
      { claimId: "C03", fieldId: "na", sourceIds: [] },
    ],
  };
  const gate = pass607.buildPass607ClaimSourceCompletenessGate({
    generatedAt,
    marketObservedAt: "2026-06-08T09:55:00.000Z",
    confidenceCeiling: 79,
    brief,
    citationRail,
    footnotes,
  });
  if (gate.confirmedClaims !== 1 || gate.blockedClaims !== 1 || gate.timestampedSources !== 1 || gate.state !== "review") {
    errors.push("PASS607 source/timestamp/claim completeness runtime failed");
  }

  const pass608 = loadPureTsModule("lib/market-integrity/pass608-missing-source-appendix.ts");
  const appendix = pass608.buildPass608MissingSourceAppendix({
    locale: "pl",
    depth: "advanced",
    missingData: ["fresh orderbook depth", "second provider timestamp"],
    claimGate: gate,
  });
  if (!appendix.entries.length || !appendix.entries.every((entry) => entry.nextCheck && entry.confidencePenalty > 0)) {
    errors.push("PASS608 actionable missing-source appendix failed");
  }

  const pass609 = loadPureTsModule("lib/market-integrity/pass609-dynamic-a4-density-balancing.ts");
  const density = pass609.buildPass609DynamicA4DensityBalancing({
    locale: "de",
    blocks: [
      { id: "decision", preferredPage: "decision", text: "A ".repeat(500), rows: 8 },
      { id: "sources", preferredPage: "evidence", text: "B ".repeat(300), rows: 8 },
      { id: "analysis", preferredPage: "analysis", text: "C ".repeat(700), rows: 16 },
      { id: "appendix", preferredPage: "boundary", text: "D ".repeat(500), rows: 12 },
    ],
  });
  if (density.pageCount !== 4 || density.widowOrphanMinimum !== 2 || !density.blocks.every((block) => block.renderedLineBudget >= 2)) {
    errors.push("PASS609 A4 density/runtime budget failed");
  }

  const pass610 = loadPureTsModule("lib/market-integrity/pass610-reader-download-parity-manifest.ts");
  const manifestA = pass610.buildPass610ReaderDownloadParityManifest({
    locale: "pl",
    depth: "advanced",
    reportChecksum: "abc",
    sections: [{ id: "brief", title: "Brief", body: "Body" }],
    claimGate: gate,
    appendix,
    density,
  });
  const manifestB = pass610.buildPass610ReaderDownloadParityManifest({
    locale: "pl",
    depth: "advanced",
    reportChecksum: "abc",
    sections: [{ id: "brief", title: "Brief", body: "Body" }],
    claimGate: gate,
    appendix,
    density,
  });
  if (manifestA.manifestKey !== manifestB.manifestKey || manifestA.pageCount !== 4 || manifestA.canonicalVisual !== "pdf_blob") {
    errors.push("PASS610 stable reader/download manifest failed");
  }

  const pass611 = loadPureTsModule("lib/market-integrity/pass611-pdf-accessibility-phase-2.ts");
  const accessibility = pass611.buildPass611PdfAccessibilityPhase2({
    locale: "pl",
    symbol: "ETH",
    title: "Ethereum",
    pageTitles: manifestA.pages.map((page) => page.title),
    price: 3500,
    change24h: 1.2,
    sourceConfidence: gate.confidenceCap,
  });
  if (!accessibility.pdf.structTreeRootPrepared || !accessibility.pdf.markedContent || accessibility.pdf.pdfUaClaim || accessibility.reader.headingOutline[0]?.level !== 1) {
    errors.push("PASS611 structured/non-PDFUA accessibility boundary failed");
  }
} catch (error) {
  errors.push(`PASS607–611 runtime helper test failed: ${error.stack || error.message}`);
}

for (const file of requiredFiles.filter((file) => /\.(tsx?|mjs)$/.test(file))) {
  if (file.endsWith(".mjs")) continue;
  const source = read(file);
  const parsed = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  for (const diagnostic of parsed.parseDiagnostics ?? []) {
    const position = parsed.getLineAndCharacterOfPosition(diagnostic.start ?? 0);
    errors.push(`${file}:${position.line + 1}:${position.character + 1} ${ts.flattenDiagnosticMessageText(diagnostic.messageText, " ")}`);
  }
}

const packageJson = JSON.parse(read("package.json"));
for (const script of [
  "verify:pass607-611-pdf-source-parity-release",
  "typecheck:pass611",
]) {
  if (!packageJson.scripts?.[script]) errors.push(`missing package script ${script}`);
}
if (!String(packageJson.scripts?.build || "").includes("verify:pass607-611-pdf-source-parity-release")) {
  errors.push("PASS607–611 verifier missing from build chain");
}

if (errors.length) {
  console.error(`PASS607–611 gate failed (${errors.length})`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log("PASS607–611 gate PASS · claim/source timestamp completeness · actionable missing-source appendix · locale-aware A4 balancing · reader/download manifest parity · structured PDF accessibility without PDF/UA overclaim");
