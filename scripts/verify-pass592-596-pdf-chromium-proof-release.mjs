import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const errors = [];
const requiredFiles = [
  "lib/market-integrity/pass592-chromium-visual-fixture-runner.ts",
  "lib/market-integrity/pass593-tagged-pdf-feasibility-gate.ts",
  "lib/market-integrity/pass594-bidirectional-source-footnotes.ts",
  "lib/market-integrity/pass595-extreme-typography-hardening.ts",
  "lib/market-integrity/pass596-pdf-release-proof-capsule.ts",
  "scripts/run-pass592-chromium-pdf-fixtures.mjs",
  "fixtures/pass592-chromium-render-proof.json",
  "lib/search/lens-report.ts",
  "app/api/search/lens-report/route.ts",
  "components/search/VelmereIntelligenceSearchClient.tsx",
  "app/globals.css",
  "tsconfig.pass596.json",
];
const read = (file) => (fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "");
const markers = (file, expected) => {
  const source = read(file);
  for (const marker of expected) {
    if (!source.includes(marker)) errors.push(`${file} missing ${marker}`);
  }
};
for (const file of requiredFiles) {
  if (!fs.existsSync(file)) errors.push(`missing ${file}`);
}
markers("lib/market-integrity/pass592-chromium-visual-fixture-runner.ts", [
  'version: "pass592-chromium-visual-fixture-runner"',
  'nodeContract: "20.x"',
  "fixtureCount: 27",
  "assessPass592ChromiumFixture",
]);
markers("lib/market-integrity/pass593-tagged-pdf-feasibility-gate.ts", [
  'version: "pass593-tagged-pdf-feasibility-gate"',
  "canClaimTaggedPdf",
  "metadata_only",
  "StructTreeRoot",
]);
markers("lib/market-integrity/pass594-bidirectional-source-footnotes.ts", [
  'version: "pass594-bidirectional-source-footnotes"',
  "claimAnchors",
  "sourceAnchors",
  "VLM-FOOTNOTE-",
]);
markers("lib/market-integrity/pass595-extreme-typography-hardening.ts", [
  'version: "pass595-extreme-typography-hardening"',
  "overflow-wrap:anywhere",
  "splitPass595ExtremeToken",
  "german_compound",
]);
markers("lib/market-integrity/pass596-pdf-release-proof-capsule.ts", [
  'version: "pass596-pdf-release-proof-capsule"',
  "VLM-PDF-PROOF-",
  "footnoteChecksum",
]);
markers("scripts/run-pass592-chromium-pdf-fixtures.mjs", [
  "PASS592_KEEP_ARTIFACTS",
  "playwright-single-browser",
  "screenshotSha256",
  "expectedFixtureCount: 27",
]);
markers("lib/search/lens-report.ts", [
  "pass592: Pass592ChromiumFixtureReceipt",
  "pass593: Pass593TaggedPdfFeasibilityGate",
  "pass594: Pass594BidirectionalSourceFootnotes",
  "pass595: Pass595ExtremeTypographyHardening",
  "pass596: Pass596PdfReleaseProofCapsule",
  "buildPass596PdfReleaseProofCapsule",
]);
markers("app/api/search/lens-report/route.ts", [
  "inspectPass593PdfBuffer",
  "splitPass595ExtremeToken",
  "/Subtype /Link",
  "pdf_footnote_link_mismatch",
  "x-velmere-pdf-proof-capsule",
]);
markers("components/search/VelmereIntelligenceSearchClient.tsx", [
  "data-pass592-chromium-fixture",
  "data-pass593-tagged-pdf-feasibility",
  "data-pass594-bidirectional-footnotes",
  "data-pass595-extreme-typography",
  "data-pass596-pdf-release-proof",
  "velmere-proof-link",
]);
markers("app/globals.css", [
  "PASS592–596",
  "overflow-wrap: anywhere",
  ".velmere-proof-link",
  "scroll-margin-top: 7rem",
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
  }).outputText;
  const module = { exports: {} };
  const execute = new Function(
    "exports",
    "require",
    "module",
    "__filename",
    "__dirname",
    output,
  );
  execute(module.exports, () => ({}), module, file, path.dirname(file));
  return module.exports;
}

try {
  const pass580 = loadPureTsModule("lib/market-integrity/pass580-pdf-visual-fixtures.ts");
  const pass592 = loadPureTsModule("lib/market-integrity/pass592-chromium-visual-fixture-runner.ts");
  const plan = pass592.buildPass592ChromiumFixturePlan(pass580.PASS580_PDF_VISUAL_FIXTURES);
  if (plan.cases.length !== 27 || plan.nodeContract !== "20.x") {
    errors.push("PASS592 plan does not preserve 27 fixtures and Node 20 contract");
  }
  const assessment = pass592.assessPass592ChromiumFixture({
    fixture: plan.cases[0],
    screenshotSha256: "a".repeat(64),
    pdfSha256: "b".repeat(64),
    renderedPages: 4,
    viewport: { width: 1240, height: 7016 },
  });
  if (assessment.state !== "pass") errors.push("PASS592 fixture assessment failed");

  const pass593 = loadPureTsModule("lib/market-integrity/pass593-tagged-pdf-feasibility-gate.ts");
  const metadataOnly = pass593.inspectPass593PdfBuffer(
    "%PDF /Lang (pl-PL) /Title (Velmere) /Subtype /Link",
  );
  if (metadataOnly.state !== "metadata_only" || metadataOnly.canClaimTaggedPdf) {
    errors.push("PASS593 metadata-only boundary failed");
  }
  const tagged = pass593.buildPass593TaggedPdfFeasibilityGate({
    languageMetadata: true,
    titleMetadata: true,
    structTreeRoot: true,
    markInfo: true,
    roleMap: true,
    readingOrderProof: true,
    internalLinks: true,
  });
  if (!tagged.canClaimTaggedPdf || tagged.state !== "tagged_candidate") {
    errors.push("PASS593 tagged candidate branch failed");
  }

  const pass594 = loadPureTsModule("lib/market-integrity/pass594-bidirectional-source-footnotes.ts");
  const footnotes = pass594.buildPass594BidirectionalSourceFootnotes({
    fields: [
      { id: "price", state: "confirmed" },
      { id: "liquidity", state: "review" },
    ],
    citationRail: {
      citations: [
        { id: "S01", anchor: "lens-source-01", state: "confirmed" },
        { id: "S02", anchor: "lens-source-02", state: "partial" },
      ],
    },
  });
  if (
    footnotes.claims[0]?.claimAnchor !== "lens-claim-01" ||
    !footnotes.sources.some((source) => source.claimAnchors.length)
  ) {
    errors.push("PASS594 bidirectional mapping failed");
  }

  const pass595 = loadPureTsModule("lib/market-integrity/pass595-extreme-typography-hardening.ts");
  const wallet = `0x${"a".repeat(64)}`;
  const segments = pass595.splitPass595ExtremeToken(wallet, 18, "en");
  const typography = pass595.buildPass595ExtremeTypographyHardening({
    locale: "de",
    values: [
      wallet,
      "Kapitalmarktinformationsverarbeitungssicherheitsnachweis",
      "https://velmere.example/very/long/source/path?provider=primary",
    ],
  });
  if (segments.length < 2 || typography.state !== "ready") {
    errors.push("PASS595 extreme token splitting failed");
  }

  const pass596 = loadPureTsModule("lib/market-integrity/pass596-pdf-release-proof-capsule.ts");
  const capsule = pass596.buildPass596PdfReleaseProofCapsule({
    fixture: { proofRef: "PASS592:test" },
    taggedPdf: metadataOnly,
    footnotes,
    typography,
    sourceReceipt: "checksum",
    parityKey: "VLM-PARITY",
    compositorResult: "ready",
  });
  if (capsule.state !== "sealed" || !capsule.capsuleKey.startsWith("VLM-PDF-PROOF-")) {
    errors.push("PASS596 release capsule failed");
  }
} catch (error) {
  errors.push(`PASS592–596 runtime helper test failed: ${error.stack || error.message}`);
}

try {
  const proof = JSON.parse(read("fixtures/pass592-chromium-render-proof.json"));
  if (proof.version !== "pass592-chromium-render-proof") errors.push("PASS592 proof version invalid");
  if (proof.fixtureCount !== 27 || proof.expectedFixtureCount !== 27) errors.push("PASS592 proof does not contain 27 fixtures");
  if (proof.state !== "pass") errors.push(`PASS592 proof state is ${proof.state}`);
  if (!/^[a-f0-9]{64}$/i.test(proof.aggregateSha256 || "")) errors.push("PASS592 aggregate hash invalid");
  for (const result of proof.results || []) {
    if (result.state !== "pass" || result.renderedPages !== 4) {
      errors.push(`PASS592 fixture failed ${result.fixtureId}`);
    }
    if (!/^[a-f0-9]{64}$/i.test(result.screenshotSha256 || "")) errors.push(`PASS592 screenshot hash invalid ${result.fixtureId}`);
    if (!/^[a-f0-9]{64}$/i.test(result.pdfSha256 || "")) errors.push(`PASS592 PDF hash invalid ${result.fixtureId}`);
  }
} catch (error) {
  errors.push(`PASS592 proof JSON invalid: ${error.message}`);
}

for (const file of requiredFiles.filter((file) => /\.tsx?$/.test(file))) {
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
    errors.push(
      `${file}:${position.line + 1}:${position.character + 1} ${ts.flattenDiagnosticMessageText(diagnostic.messageText, " ")}`,
    );
  }
}

const packageJson = JSON.parse(read("package.json") || "{}");
for (const script of [
  "verify:pass592-596-pdf-chromium-proof-release",
  "verify:pass592-chromium-fixtures",
  "typecheck:pass596",
]) {
  if (!packageJson.scripts?.[script]) errors.push(`missing package script ${script}`);
}
if (
  !String(packageJson.scripts?.build || "").includes(
    "verify:pass592-596-pdf-chromium-proof-release",
  )
) {
  errors.push("PASS592–596 verifier missing from build chain");
}

if (errors.length) {
  console.error(`PASS592–596 gate failed (${errors.length})`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log(
  "PASS592–596 gate PASS · 27 Chromium fixture proofs · honest tagged-PDF feasibility · bidirectional Reader/PDF footnotes · extreme typography hardening · sealed PDF proof capsule",
);
