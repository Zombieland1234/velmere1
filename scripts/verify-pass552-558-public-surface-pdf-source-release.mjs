import fs from "node:fs";

const errors = [];
const requiredFiles = [
  "components/market-integrity/TokenRiskModal.tsx",
  "components/market-integrity/CrossAssetCollapseRadarPanel.tsx",
  "components/search/VelmereIntelligenceSearchClient.tsx",
  "lib/search/intelligence-search-contract.ts",
  "lib/search/lens-report.ts",
  "app/api/search/route.ts",
  "app/api/search/lens-report/route.ts",
  "scripts/verify-pass552-558-public-surface-pdf-source-release.mjs",
  "tsconfig.pass558.json",
];
for (const file of requiredFiles) {
  if (!fs.existsSync(file)) errors.push(`missing ${file}`);
}

const read = (file) =>
  fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
const requireMarkers = (file, markers) => {
  const source = read(file);
  for (const marker of markers) {
    if (!source.includes(marker)) errors.push(`${file} missing ${marker}`);
  }
};

requireMarkers("components/market-integrity/TokenRiskModal.tsx", [
  'data-pass552-public-operator-diagnostics="hidden"',
  'data-pass559-public-evidence-spine="true"',
]);
requireMarkers("components/market-integrity/CrossAssetCollapseRadarPanel.tsx", [
  "PUBLIC_REAL_MARKETS_CATEGORIES",
  "isPublicRealMarketsAsset",
  'data-pass553-realmarkets-noncrypto-surface="true"',
  'data-pass553-crypto-handoff="shield"',
]);
requireMarkers("components/search/VelmereIntelligenceSearchClient.tsx", [
  "function BodyPortal",
  'data-pass554-body-portal="true"',
  "const showInternalPdfQa = false",
  'data-pass555-public-reader-status="clean"',
  "readerScrollRef.current",
  "scrollRoot.scrollTo",
  "max-h-[calc(100dvh-1.5rem)]",
]);
requireMarkers("lib/search/lens-report.ts", [
  'evidenceState: "confirmed" | "partial" | "missing"',
  "sourceInput",
  "source.note",
  "source-required",
]);
requireMarkers("lib/search/intelligence-search-contract.ts", [
  "applyLocalTokenSourceBoundary",
  "live-market-source-required",
  'sourceMode: "fallback"',
]);
requireMarkers("app/api/search/route.ts", [
  "localizeSourceNote",
  "note: localizeSourceNote(source, locale)",
]);
requireMarkers("app/api/search/lens-report/route.ts", [
  "source.evidenceState",
  "compactValue(source.note, 116)",
]);

const realMarkets = read(
  "components/market-integrity/CrossAssetCollapseRadarPanel.tsx",
);
const publicList =
  realMarkets.match(/const PUBLIC_REAL_MARKETS_CATEGORIES:[\s\S]*?\];/)?.[0] ??
  "";
if (publicList.includes('"crypto"')) {
  errors.push("public Real Markets category list must not contain crypto");
}
if (realMarkets.includes("data-testid={`realmarkets-tab-crypto`}")) {
  errors.push("public crypto tab test id must not be rendered");
}

const browser = read("components/search/VelmereIntelligenceSearchClient.tsx");
if (!browser.includes("const showInternalPdfQa = false")) {
  errors.push("internal PDF QA must be hard-disabled on the public Lens surface");
}
if (!browser.includes("z-[2147483647]")) {
  errors.push("Lens preview must sit above the global header stack");
}
if (!browser.includes("data-pass560-global-header-occlusion=\"sealed\"")) {
  errors.push("Lens preview header occlusion seal missing");
}

const pkg = JSON.parse(read("package.json") || "{}");
for (const script of [
  "verify:pass552-558-public-surface-pdf-source-release",
  "typecheck:pass558",
]) {
  if (!pkg.scripts?.[script]) errors.push(`missing package script ${script}`);
}
if (
  !String(pkg.scripts?.build || "").includes(
    "verify:pass552-558-public-surface-pdf-source-release",
  )
) {
  errors.push("PASS552–558 gate missing from build");
}

if (errors.length) {
  console.error(`PASS552–558 gate failed (${errors.length})`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(
  `PASS552–558 gate PASS · ${requiredFiles.length} files · public Shield cleanup · noncrypto Real Markets · body-portaled PDF modals · clean reader · localized source lineage · internal scroll containment`,
);
