import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const expect = (file, markers) => {
  const source = read(file);
  for (const marker of markers) {
    if (!source.includes(marker)) failures.push(`${file}: missing ${marker}`);
  }
  return source;
};

const depthSource = expect("lib/market-integrity/pass477-unified-depth-contract.ts", [
  'version: "pass477-unified-depth-contract"',
  'fieldBudget: selectedDepth === "basic" ? 10 : selectedDepth === "pro" ? 14 : 20',
  "readerMatchesPdfPayload: true",
  "downloadMatchesPreviewBlob: true",
  "missingDataMayNotBecomeFact: true",
]);

for (const [depth, count] of [["basic", 10], ["pro", 14], ["advanced", 20]]) {
  const match = depthSource.match(new RegExp(`${depth}: \\[([\\s\\S]*?)\\n  \\]`, "m"));
  const actual = match ? [...match[1].matchAll(/"[^"]+"/g)].length : 0;
  if (actual !== count) failures.push(`PASS477 ${depth} metric budget mismatch: expected ${count}, got ${actual}`);
}

expect("lib/market-integrity/pass478-human-evidence-brief.ts", [
  'version: "pass478-human-evidence-brief"',
  "confirmedFacts",
  "confidenceLimits",
  "whatWouldChangeTheRead",
  "It does not forecast price",
  "Nie prognozuje ceny",
  "Er prognostiziert keinen Preis",
]);

const reportSource = expect("lib/search/lens-report.ts", [
  "pass477: Pass477UnifiedDepthContract",
  "pass478: Pass478HumanEvidenceBrief",
  "selectedDepth: LensReportDepth",
  "buildPass477UnifiedDepthContract(result, safeLocale, requestedDepth)",
  "buildPass478HumanEvidenceBrief(result, safeLocale, pass477, pass455)",
]);
if (!reportSource.includes("pass477.selectedDepth")) failures.push("Lens report does not bind PASS466 to PASS477 depth.");

const browserSource = expect("components/search/VelmereIntelligenceSearchClient.tsx", [
  "buildLensReport(result, safeLocale, depth)",
  'data-pass477-unified-depth-contract="true"',
  'data-pass478-human-evidence-brief="true"',
  "pdfPreview.report.pass478.confirmedFacts",
  "pdfPreview.report.pass478.confidenceLimits",
  'data-pass479-header-occlusion-fix="full-viewport"',
  "z-[2000000]",
]);
if (browserSource.includes("report.pass466 = buildPass466ConfidenceWaterfall")) {
  failures.push("Browser still mutates PASS466 after report creation.");
}

expect("app/api/search/lens-report/route.ts", [
  'error: "depth_mismatch"',
  '"x-velmere-depth-contract": "pass477"',
  '"x-velmere-human-evidence-brief": "pass478"',
  "report.pass478.confirmedFacts",
  "report.pass478.confidenceLimits",
]);

const marketsSource = expect("components/market-integrity/CrossAssetCollapseRadarPanel.tsx", [
  'data-pass479-realmarkets-card-grid="true"',
  'data-pass479-realmarkets-desktop-table="true"',
  'data-pass479-search-stable-table="true"',
  'className="mt-5 grid gap-3 xl:hidden"',
  "xl:block",
  'data-testid="realmarkets-row-mobile"',
]);
if (!marketsSource.includes("const displayRows = useMemo(() => {\n    if (!sort) return rows;")) {
  failures.push("Real Markets display rows no longer preserve the stable catalog before explicit sorting.");
}
if (marketsSource.includes('className="relative min-w-[18rem]"')) {
  failures.push("Real Markets search can still overflow narrow mobile screens.");
}

if (failures.length) {
  console.error(`PASS477–479 verifier failed (${failures.length})`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("PASS477–479 unified depth / human evidence / mobile Real Markets verifier OK");
