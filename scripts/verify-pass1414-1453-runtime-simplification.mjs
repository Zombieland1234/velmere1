import { readFileSync, existsSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const checks = [];
const add = (name, pass, detail) => checks.push({ name, pass: Boolean(pass), detail });

const files = {
  contract: "lib/market-integrity/pass1414-1453-runtime-simplification.ts",
  nav: "components/Navbar.tsx",
  browser: "components/search/VelmereIntelligenceSearchClient.tsx",
  controls: "components/market-integrity/UnifiedAssetAnalysisControls.tsx",
  shield: "components/market-integrity/TokenRiskModal.tsx",
  real: "components/market-integrity/CrossAssetCollapseRadarPanel.tsx",
  css: "app/globals.css",
  doc: "docs/progress/PASS1414_1453_RUNTIME_SIMPLIFICATION.md",
};
for (const [name, path] of Object.entries(files)) add(`${name}_exists`, existsSync(path), path);

const contract = read(files.contract);
const nav = read(files.nav);
const browser = read(files.browser);
const controls = read(files.controls);
const shield = read(files.shield);
const real = read(files.real);
const css = read(files.css);
const doc = read(files.doc);

add("contract_runtime_first", contract.includes('realWorkStandard: "forty_plus_tasks_runtime_first"') && contract.includes("taskCount: 46"), "mega pass has real task weight");
add("contract_forbids_public_circular_overlay", contract.includes("public_circular_asset_overlay") && contract.includes("simple_rectangular_market_modals"), "public circular overlay stays removed");
add("navbar_account_links_deduped", nav.includes("const accountMenuLinks") && nav.includes("findIndex((candidate) => candidate.href === link.href)"), "account drawer cannot render duplicate /en/account hrefs");
add("navbar_keys_are_composite", nav.includes("desktop:${link.href}:${link.label}:${linkIndex}") && nav.includes("legal:${link.href}:${link.label}:${linkIndex}") && nav.includes("const stableLinkKey"), "visible nav lists avoid href-only key collisions");
add("pdf_choice_null_guard_kept", browser.includes('pdfPreview?.report?.pass1274?.state ?? "idle"') && browser.includes('pdfPreview?.report?.pass1274?.artifactRoot ?? "not-created-yet"'), "depth chooser cannot dereference null report");
add("rectangular_modal_explicit", controls.includes('data-pass1414-simple-rectangular-modal="chart-scroll-zoom-plus-attached-rail"') && controls.includes('data-pass1414-depth-rail="basic-pro-advanced-rectangular"'), "modal states chart + rail contract in DOM");
add("no_bubble_depth_buttons", controls.includes('data-pass1414-no-bubble-depth="true"') && css.includes('[data-pass1414-no-bubble-depth="true"] .unified-asset-depth-button'), "Basic/Pro/Advanced are rectangular controls");
add("chart_wheel_owner_explicit", controls.includes('data-pass1414-chart-wheel-owner="true"') && css.includes('[data-pass1414-chart-wheel-owner="true"]'), "chart panel owns wheel/touch gestures");
add("chart_hover_throttled", shield.includes("const scheduleHoverIndex = useCallback") && shield.includes('data-pass1414-pointer-throttle="request-animation-frame"'), "chart hover rerender is RAF throttled");
add("public_overlay_disabled", shield.includes("analysisOverlaySlot={null}") && real.includes("analysisOverlaySlot={null}") && css.includes(".unified-asset-analysis-overlay {\n  display: none !important;"), "laggy circular overlay remains disabled");
add("real_markets_extra_pills_removed", real.includes('data-pass1414-real-markets-no-extra-pills="true"') && !real.includes('className="real-markets-pass1413-polish-strip'), "Real Markets hero no longer renders extra pill controls");
add("sort_headers_not_pills", real.includes('data-pass1414-sort-header="inline-not-extra-pill"') && css.includes('.realmarkets-sort-header-cell[data-pass1414-sort-header="inline-not-extra-pill"]'), "sort remains inline table header, not extra buttons");
add("dropdowns_viewport_bounded", css.includes('[data-velmere-dropdown-root="true"]') && css.includes("max-height: calc(100dvh - 6rem)"), "dropdown surfaces cannot disappear outside viewport");
add("doc_honest", doc.includes("Still not claimed") && doc.includes("Node 24"), "report stays honest about remaining build proof");

const failed = checks.filter((check) => !check.pass);
for (const check of checks) console.log(`${check.pass ? "PASS" : "FAIL"} ${check.name} - ${check.detail}`);
if (failed.length) {
  console.error(`\n${failed.length}/${checks.length} PASS1414-1453 checks failed.`);
  process.exit(1);
}
console.log(`\nPASS1414-1453 runtime simplification verified (${checks.length}/${checks.length}).`);
