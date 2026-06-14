import fs from "node:fs";
import ts from "typescript";

const errors = [];
const requiredFiles = [
  "components/market-integrity/TokenRiskModal.tsx",
  "components/market-integrity/CrossAssetCollapseRadarPanel.tsx",
  "components/market-integrity/VlmNeuralAuditExperience.tsx",
  "components/market-integrity/ShieldMapCommandClient.tsx",
  "components/search/VelmereIntelligenceSearchClient.tsx",
  "app/globals.css",
  "scripts/verify-pass559-565-premium-public-release.mjs",
  "tsconfig.pass565.json",
];

const read = (file) => (fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "");
const requireMarkers = (file, markers) => {
  const source = read(file);
  for (const marker of markers) {
    if (!source.includes(marker)) errors.push(`${file} missing ${marker}`);
  }
};

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) errors.push(`missing ${file}`);
}

requireMarkers("components/market-integrity/TokenRiskModal.tsx", [
  'data-pass559-public-evidence-spine="true"',
  'data-pass559-next-proof-step="true"',
  'data-pass552-public-operator-diagnostics="hidden"',
]);
const tokenModal = read("components/market-integrity/TokenRiskModal.tsx");
for (const forbidden of [
  "NEXT_PUBLIC_VELMERE_OPERATOR_DIAGNOSTICS",
  "Diagnostyka operatora",
  "Operator diagnostics",
]) {
  if (tokenModal.includes(forbidden)) {
    errors.push(`public TokenRiskModal still contains ${forbidden}`);
  }
}

requireMarkers("components/search/VelmereIntelligenceSearchClient.tsx", [
  "const showInternalPdfQa = false",
  'data-pass560-global-header-occlusion="sealed"',
  "velmere-lens-modal-root",
  "z-[2147483647]",
  "max-h-[calc(100dvh-1.5rem)]",
  'data-pass555-public-reader-status="clean"',
]);
const browser = read("components/search/VelmereIntelligenceSearchClient.tsx");
if (browser.includes("NEXT_PUBLIC_VELMERE_SHOW_PDF_QA")) {
  errors.push("public Lens still allows QA overlay through a NEXT_PUBLIC flag");
}
if (browser.includes('className="sticky top-0 z-20 mx-auto mb-4')) {
  errors.push("Reader navigation still overlays the A4 document");
}

requireMarkers("components/market-integrity/CrossAssetCollapseRadarPanel.tsx", [
  "PUBLIC_REAL_MARKETS_CATEGORIES",
  'data-pass561-crypto-tab-removed="true"',
  'data-pass553-crypto-handoff="shield"',
  'if (category === "crypto") setCategory("all")',
]);
const realMarkets = read("components/market-integrity/CrossAssetCollapseRadarPanel.tsx");
const publicList = realMarkets.match(/const PUBLIC_REAL_MARKETS_CATEGORIES:[\s\S]*?\];/)?.[0] ?? "";
if (publicList.includes('"crypto"')) errors.push("public Real Markets category list contains crypto");

requireMarkers("components/market-integrity/VlmNeuralAuditExperience.tsx", [
  "velmere-neural-audit-root",
  'data-pass562-neural-presentation="sealed-source-first"',
  'data-pass605-brain-interaction-contract="dialog-focus-trap"',
]);
const neuralModal = read("components/market-integrity/VlmNeuralAuditExperience.tsx");
if (neuralModal.includes("zIndex: 2_147_483_647")) {
  errors.push("VLM Brain regressed to an unbounded z-index instead of the finite overlay constitution");
}
requireMarkers("components/market-integrity/ShieldMapCommandClient.tsx", [
  "velmere-shield-map-root",
  'data-pass563-shield-map-motion="adaptive-focus-first"',
]);
requireMarkers("app/globals.css", [
  ".shield-public-evidence-spine",
  ".velmere-lens-modal-root",
  ".velmere-neural-audit-root",
  "--velmere-layer-modal: 90",
  "z-index: var(--velmere-layer-modal) !important",
  ".velmere-shield-map-root",
  "@media (prefers-reduced-motion: reduce)",
]);

for (const file of requiredFiles.filter((file) => file.endsWith(".tsx"))) {
  const source = read(file);
  const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  for (const diagnostic of parsed.parseDiagnostics ?? []) {
    const position = parsed.getLineAndCharacterOfPosition(diagnostic.start ?? 0);
    errors.push(`${file}:${position.line + 1}:${position.character + 1} ${ts.flattenDiagnosticMessageText(diagnostic.messageText, " ")}`);
  }
}

const pkg = JSON.parse(read("package.json") || "{}");
for (const script of [
  "verify:pass559-565-premium-public-release",
  "typecheck:pass565",
]) {
  if (!pkg.scripts?.[script]) errors.push(`missing package script ${script}`);
}
if (!String(pkg.scripts?.build || "").includes("verify:pass559-565-premium-public-release")) {
  errors.push("PASS559–565 verifier missing from build");
}

if (errors.length) {
  console.error(`PASS559–565 gate failed (${errors.length})`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(
  `PASS559–565 gate PASS · ${requiredFiles.length} files · public diagnostics removed · PDF overlay sealed · QA overlay disabled · Real Markets crypto tab removed · VLM Brain and Shield Map adaptive motion`,
);
