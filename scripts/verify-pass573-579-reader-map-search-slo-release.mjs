import fs from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const ts = require("typescript");
const errors = [];
const requiredFiles = [
  "lib/search/pass573-pdf-locale-purity.ts",
  "lib/market-integrity/pass574-pdf-page-boundary-matrix.ts",
  "lib/market-integrity/pass575-shield-map-evidence-delta.ts",
  "lib/market-integrity/pass577-provider-slo-console.ts",
  "lib/search/pass579-exact-search-receipt.ts",
  "lib/search/lens-report.ts",
  "components/search/VelmereIntelligenceSearchClient.tsx",
  "components/market-integrity/ShieldMapClient.tsx",
  "components/market-integrity/CrossAssetCollapseRadarPanel.tsx",
  "components/market-integrity/MarketIntegrityClient.tsx",
  "app/globals.css",
  "tsconfig.pass579.json",
];
const read = (file) => (fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "");
const markers = (file, expected) => {
  const source = read(file);
  for (const marker of expected) if (!source.includes(marker)) errors.push(`${file} missing ${marker}`);
};
for (const file of requiredFiles) if (!fs.existsSync(file)) errors.push(`missing ${file}`);
markers("lib/search/pass573-pdf-locale-purity.ts", ['version: "pass573-pdf-locale-purity"', "sanitizePass573PublicPdfText"]);
markers("lib/market-integrity/pass574-pdf-page-boundary-matrix.ts", ['version: "pass574-pdf-page-boundary-matrix"', "characterBudget", "collisions"]);
markers("lib/market-integrity/pass575-shield-map-evidence-delta.ts", ['version: "pass575-shield-map-evidence-delta"', "addedBlockers", "resolvedBlockers"]);
markers("lib/market-integrity/pass577-provider-slo-console.ts", ['version: "pass577-provider-slo-console"', "source_bound", "recoveryMs"]);
markers("lib/search/pass579-exact-search-receipt.ts", ['version: "pass579-exact-search-receipt"', 'match.startsWith("exact_")']);
markers("lib/search/lens-report.ts", ["pass573: Pass573PdfLocalePurity", "pass574: Pass574PdfPageBoundaryMatrix", "buildPass574PdfPageBoundaryMatrix"]);
markers("components/search/VelmereIntelligenceSearchClient.tsx", ["data-pass573-pdf-locale-purity", "data-pass574-page-boundary", "data-pass579-search-receipt"]);
markers("components/market-integrity/ShieldMapClient.tsx", ["data-pass575-evidence-delta", 'data-pass576-right-edge-focus-drawer="true"', "document.documentElement.style.overflow = \"hidden\"", "data-pass579-exact-search"]);
markers("components/market-integrity/CrossAssetCollapseRadarPanel.tsx", ['data-pass577-provider-slo-console="true"', 'data-pass578-full-width-density="no-horizontal-scroll"', "realmarkets-pass578-grid", "data-pass579-exact-search"]);
markers("components/market-integrity/MarketIntegrityClient.tsx", ["shieldSearchReceipt", "exactResolution.receipt.exact", "data-pass579-exact-search"]);
markers("app/globals.css", [".shield-map-focus-drawer", ".realmarkets-provider-slo", ".realmarkets-pass578-table", "prefers-reduced-motion: reduce"]);
const realMarkets = read("components/market-integrity/CrossAssetCollapseRadarPanel.tsx");
const categories = realMarkets.match(/const PUBLIC_REAL_MARKETS_CATEGORIES:[\s\S]*?\];/);
if (!categories) errors.push("Real Markets public category list missing");
else if (categories[0].includes('"crypto"')) errors.push("Real Markets public categories expose crypto");
if (realMarkets.includes('className="min-w-[1240px]"')) errors.push("fixed 1240px table width reintroduced");
for (const file of requiredFiles.filter((file) => /\.tsx?$/.test(file))) {
  const source = read(file);
  const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  for (const diagnostic of parsed.parseDiagnostics ?? []) {
    const pos = parsed.getLineAndCharacterOfPosition(diagnostic.start ?? 0);
    errors.push(`${file}:${pos.line + 1}:${pos.character + 1} ${ts.flattenDiagnosticMessageText(diagnostic.messageText, " ")}`);
  }
}
const pkg = JSON.parse(read("package.json") || "{}");
for (const script of ["verify:pass573-579-reader-map-search-slo-release", "typecheck:pass579"]) if (!pkg.scripts?.[script]) errors.push(`missing package script ${script}`);
if (!String(pkg.scripts?.build || "").includes("verify:pass573-579-reader-map-search-slo-release")) errors.push("PASS573–579 verifier missing from build");
if (errors.length) {
  console.error(`PASS573–579 gate failed (${errors.length})`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log("PASS573–579 gate PASS · locale-pure PDF · A4 boundary guard · Shield Map evidence delta/focus drawer · provider SLO · full-width Real Markets · exact search");
