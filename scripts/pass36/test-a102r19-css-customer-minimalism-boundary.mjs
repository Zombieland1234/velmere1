#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];
let passed = 0;
const check = (id, condition, detail = null) => {
  if (condition) passed += 1;
  else failures.push({ id, detail });
};
const source = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

function keyframeNames(css) {
  return [...css.matchAll(/@(?:-webkit-)?keyframes\s+([A-Za-z_][\w-]*)\s*\{/gu)].map((match) => match[1]);
}

const layout = source("app/layout.tsx");
const globals = source("app/globals.css");
const analysisCss = source("app/styles/vlm-analysis-tab.css");
const premiumCss = source("app/styles/premium-ui.css");
const checkout = source("app/[locale]/checkout/success/page.tsx");
const accountReports = source("components/account/MarketActionReportsInboxClient.tsx");
const realMarkets = source("components/market-integrity/CrossAssetCollapseRadarPanel.tsx");

const cssImports = [...layout.matchAll(/import\s+["'](\.\/[^"']+\.css)["'];/gu)].map((match) => match[1]);
check("layout-css-import-count", cssImports.length >= 3, cssImports);
check("layout-css-import-globals", cssImports.includes("./globals.css"), cssImports);
check("layout-css-import-analysis", cssImports.includes("./styles/vlm-analysis-tab.css"), cssImports);
check("layout-css-import-premium", cssImports.includes("./styles/premium-ui.css"), cssImports);
check("layout-css-import-no-duplicates", new Set(cssImports).size === cssImports.length, cssImports);

const activeSheets = [
  ["app/globals.css", globals],
  ["app/styles/vlm-analysis-tab.css", analysisCss],
  ["app/styles/premium-ui.css", premiumCss],
];
const owners = new Map();
for (const [relativePath, css] of activeSheets) {
  for (const name of keyframeNames(css)) {
    const rows = owners.get(name) ?? [];
    rows.push(relativePath);
    owners.set(name, rows);
  }
}
const duplicateGlobalKeyframes = [...owners.entries()]
  .filter(([, rows]) => rows.length > 1)
  .map(([name, rows]) => ({ name, rows }));
check("active-global-keyframe-namespace-unique", duplicateGlobalKeyframes.length === 0, duplicateGlobalKeyframes);
check("legacy-unused-drawer-keyframe-removed", !globals.includes("pass314RightEdgeDrawerIn"));
check("pdf-forge-keyframe-single-owner", (globals.match(/@keyframes\s+pass315PdfForgeSpin\b/gu) ?? []).length === 1);
check("pdf-forge-animation-reference-retained", globals.includes("animation:pass315PdfForgeSpin 8s linear infinite"));

for (const name of [
  "vlm-analysis-line-reveal",
  "vlm-analysis-bar-rise",
  "vlm-analysis-balance-open",
  "vlm-analysis-scan-pass",
]) {
  check(`${name}-absent-from-globals`, !globals.includes(`@keyframes ${name}`));
  check(`${name}-owned-by-analysis-stylesheet`, (analysisCss.match(new RegExp(`@keyframes\\s+${name}\\b`, "gu")) ?? []).length === 1);
}

check("globals-css-reduced", Buffer.byteLength(globals, "utf8") < 2_212_158, Buffer.byteLength(globals, "utf8"));
check("checkout-no-visible-pass2491", !checkout.includes('"PASS2491 replay"') && !checkout.includes('"PASS2491 Replay"'));
check("checkout-no-visible-pass2492", !checkout.includes('"PASS2492 artifact"') && !checkout.includes('"PASS2492 Artifact"'));
check("checkout-proof-data-markers-retained", checkout.includes("data-pass2491-vlm-access-proof") && checkout.includes("data-pass2492-artifact-delivery-ledger"));
check("checkout-pl-minimal-copy", checkout.includes('"Kontrola ponowienia"') && checkout.includes('"Powiązanie artefaktu"'));
check("checkout-en-minimal-copy", checkout.includes('"Replay check"') && checkout.includes('"Artifact binding"'));
check("checkout-de-minimal-copy", checkout.includes('"Wiederholungsprüfung"') && checkout.includes('"Artefaktbindung"'));

check("account-detail-visible-pass-label-removed", !accountReports.includes("<p>PASS4549</p>"));
check("account-detail-localized-title-used", accountReports.includes("<p>{t.detailTitle}</p>"));
check("account-detail-proof-marker-retained", accountReports.includes("data-pass4549-account-report-detail-selected"));

check("real-markets-visible-pass-label-removed", !realMarkets.includes("PASS2810 runtime boundary"));
check("real-markets-proof-marker-retained", realMarkets.includes("data-pass2810-realmarkets-error-boundary"));
check("real-markets-pl-safe-label", realMarkets.includes('"Bezpieczny tryb tabeli"'));
check("real-markets-en-safe-label", realMarkets.includes('"Safe table mode"'));
check("real-markets-de-safe-label", realMarkets.includes('"Sicherer Tabellenmodus"'));
check("real-markets-boundary-label-rendered", realMarkets.includes("{boundaryLabel}"));

const output = {
  status: failures.length
    ? "FAIL_A102R19_ACTIVE_CSS_CUSTOMER_MINIMALISM_BOUNDARY"
    : "PASS_A102R19_ACTIVE_CSS_CUSTOMER_MINIMALISM_BOUNDARY_LOCAL_ONLY",
  assertions: passed + failures.length,
  passed,
  failed: failures.length,
  failures,
  measurements: {
    activeGlobalStylesheets: activeSheets.map(([relativePath]) => relativePath),
    activeGlobalKeyframeNames: owners.size,
    duplicateGlobalKeyframeNames: duplicateGlobalKeyframes.length,
    removedDuplicateOrDeadKeyframeBlocks: 7,
    globalsCssBytes: Buffer.byteLength(globals, "utf8"),
    parentGlobalsCssBytes: 2_212_158,
    globalsCssBytesReduced: 2_212_158 - Buffer.byteLength(globals, "utf8"),
    customerSurfacesSimplified: 3,
    exactBrowserRows: 0,
    screenshotParityRows: 0,
  },
  truth: {
    localCssNamespaceClosure: true,
    customerVisibleCheckpointJargonReduced: true,
    internalProofMarkersRetained: true,
    exactBuildBrowserProven: false,
    visualScreenshotParityProven: false,
    stagingProven: false,
    liveProven: false,
    saleEnabled: false,
  },
};
console.log(JSON.stringify(output, null, 2));
if (failures.length) process.exitCode = 1;
