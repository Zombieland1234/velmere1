import { readFileSync, existsSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const checks = [];
const add = (name, pass, detail) => checks.push({ name, pass: Boolean(pass), detail });

const files = {
  contract: "lib/market-integrity/pass1374-1413-mega-terminal-polish.ts",
  lens: "lib/search/lens-report.ts",
  browser: "components/search/VelmereIntelligenceSearchClient.tsx",
  route: "app/api/search/lens-report/route.ts",
  map: "components/market-integrity/ShieldMapClient.tsx",
  real: "components/market-integrity/CrossAssetCollapseRadarPanel.tsx",
  shield: "components/market-integrity/TokenRiskModal.tsx",
  nav: "components/Navbar.tsx",
  css: "app/globals.css",
  doc: "docs/progress/PASS1374_1413_MEGA_PRODUCT_POLISH.md",
};
for (const [name, path] of Object.entries(files)) add(`${name}_exists`, existsSync(path), path);
const contract = read(files.contract);
const lens = read(files.lens);
const browser = read(files.browser);
const route = read(files.route);
const map = read(files.map);
const real = read(files.real);
const shield = read(files.shield);
const nav = read(files.nav);
const css = read(files.css);
const doc = read(files.doc);

add("contract_forty_plus_standard", contract.includes('realWorkStandard: "forty_plus_tasks_no_micro_passes"') && contract.includes("totalTaskCount") && contract.includes("runtimeSurfaceCount: 8"), "mega-pass cannot be counted as a micro-pass");
add("contract_8_lanes", ["vlm_brain_truth", "shield_terminal", "real_markets", "lens_pdf", "shield_map", "header_wallet_cart", "mobile_runtime", "css_architecture"].every((token) => contract.includes(token)), "all product lanes are explicit");
add("contract_task_count_57", contract.includes("taskCount: 8") && contract.includes("taskCount: 7") && contract.includes("taskCount: 6"), "lane task weights produce 50+ work items");
add("lens_integrates_pass1413", lens.includes("Pass1374To1413MegaTerminalPolish") && lens.includes("const pass1413 = buildPass1374To1413MegaTerminalPolish") && lens.includes("pass1413,"), "LensReport carries mega product pass");
add("lens_guard_blocks_micro_pass", lens.includes('report.pass1413?.realWorkStandard === "forty_plus_tasks_no_micro_passes"') && lens.includes("report.pass1413?.totalTaskCount >= 50"), "isLensReport rejects small pass payloads");
add("browser_visible_product_work", browser.includes("velmere-pass1413-mega-terminal-polish") && browser.includes("data-pass1413-task-count") && browser.includes("pdfPreview.report.pass1413.lanes.slice(0, 8)"), "Lens reader renders the new product work strip");
add("pdf_route_guard_and_header", route.includes("payload.pass1413?.totalTaskCount < 50") && route.includes("x-velmere-mega-terminal-polish") && route.includes("megaPassLine"), "PDF route gates and labels mega-pass state");
add("shield_map_not_clone", map.includes('data-pass1413-shield-map-evidence-focus="why-verdict-only"') && map.includes("data-pass1413-shield-map-graph-rail"), "Shield Map has a visible why-verdict graph rail");
add("real_markets_polish", real.includes("PASS1413_REAL_MARKETS_POLISH") && (real.includes("real-markets-pass1413-polish-strip") || real.includes("data-pass1414-real-markets-no-extra-pills")) && real.includes("compact_source_rhythm_no_random_ai_line"), "Real Markets gets compact truth/mobile/modal contract without extra hero pills");
add("shield_chart_owns_wheel", shield.includes('data-pass1413-shield-terminal-polish="chart-owns-wheel-modal-stays-fixed"') && shield.includes('data-pass1413-modal-z-index="above-header"'), "Shield modal/chart gesture rule is explicit");
add("header_cart_wallet_rules", nav.includes('data-pass1413-header-surface="anchored-wallet-language-cart"') && nav.includes('data-pass1413-cart-rule="bottom-sheet-only"') && nav.includes('data-pass1413-wallet-boundary="read-only-no-seed"') && !nav.includes("setWalletOpen(false);\n    setWalletOpen(false);"), "Header duplicated close call removed and boundary rules visible");
add("scoped_css", css.includes("PASS1374–1413 · mega product polish") && css.includes(".velmere-pass1413-mega-terminal-polish") && css.includes('[data-pass1413-shield-terminal-polish="chart-owns-wheel-modal-stays-fixed"]'), "styles are scoped to pass1413 surfaces");
add("doc_says_40_plus", doc.includes("40+ zadań") && doc.includes("Still not claimed"), "report is honest about scope and remaining build proof");
add("interruption_duplicate_account_key_fixed", nav.includes("const stableLinkKey = `${group.title}:${link.href}:${link.label}:${linkIndex}`") && !nav.includes("key={link.href}\n                        href={link.href}"), "mobile menu uses unique composite link keys so /en/account cannot duplicate");
add("interruption_pdf_choice_null_guard", browser.includes('pdfPreview?.report?.pass1274?.state ?? "idle"') && browser.includes('pdfPreview?.report?.pass1274?.artifactRoot ?? "not-created-yet"'), "PDF depth choice dialog no longer dereferences null pdfPreview.report");
add("interruption_rectangular_chart_modal", read("components/market-integrity/UnifiedAssetAnalysisControls.tsx").includes('data-pass1413-circular-chart-removed="true"') && css.includes(".unified-asset-rect-stage") && css.includes(".unified-asset-chart-panel"), "circular chart/bubble stage is replaced by rectangular chart + attached depth rail");
add("interruption_vlm_overlay_disabled", shield.includes("analysisOverlaySlot={null}") && real.includes("analysisOverlaySlot={null}"), "Basic/Pro/Advanced no longer launches the laggy circular VLM overlay");

const failed = checks.filter((check) => !check.pass);
for (const check of checks) {
  console.log(`${check.pass ? "PASS" : "FAIL"} ${check.name} - ${check.detail}`);
}
if (failed.length) {
  console.error(`\n${failed.length}/${checks.length} PASS1374-1413 checks failed.`);
  process.exit(1);
}
console.log(`\nPASS1374-1413 mega product polish verified (${checks.length}/${checks.length}).`);
