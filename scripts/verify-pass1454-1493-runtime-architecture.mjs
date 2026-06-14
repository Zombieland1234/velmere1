import { readFileSync, existsSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const checks = [];
const add = (name, ok, note) => checks.push({ name, ok: Boolean(ok), note });

const contractPath = "lib/market-integrity/pass1454-1493-runtime-architecture.ts";
const contract = existsSync(contractPath) ? read(contractPath) : "";
const controls = read("components/market-integrity/UnifiedAssetAnalysisControls.tsx");
const overlay = read("components/ui/OverlayPrimitives.tsx");
const navbar = read("components/Navbar.tsx");
const cart = read("components/CartDrawer.tsx");
const real = read("components/market-integrity/CrossAssetCollapseRadarPanel.tsx");
const shield = read("components/market-integrity/TokenRiskModal.tsx");
const css = read("app/globals.css");
const pkg = read("package.json");
const doc = existsSync("docs/progress/PASS1454_1493_RUNTIME_ARCHITECTURE.md")
  ? read("docs/progress/PASS1454_1493_RUNTIME_ARCHITECTURE.md")
  : "";

add("contract_exists_with_66_tasks", contract.includes("PASS1454_1493_RUNTIME_ARCHITECTURE") && contract.includes("taskCount: 66"), "heavy pass has real task budget");
add("contract_forbids_public_bubble_orbit", contract.includes("Only the calm rectangular chart") && contract.includes("public bubble/orbit overlay"), "public modal rule is explicit");
add("shared_modal_has_pass1454_runtime_attrs", controls.includes('data-pass1454-runtime-architecture="mobile-performance-rectangular-terminal"') && controls.includes('data-pass1454-public-modal-rule="rectangular-chart-attached-depth-rail-only"'), "shared shell carries runtime architecture contract");
add("chart_stops_wheel_touch_pointer_bubbling", controls.includes('data-pass1454-chart-gesture-containment="wheel-touch-pointer"') && controls.includes("onWheel={(event) => event.stopPropagation()}") && controls.includes("onTouchMove={(event) => event.stopPropagation()}") && controls.includes("onPointerMove={(event) => event.stopPropagation()}"), "chart panel owns gestures before modal/page scroll");
add("depth_rail_compact_three_buttons", controls.includes('data-pass1454-depth-rail="compact-linear-three-buttons"') && controls.includes('data-pass1454-depth-controls="basic-pro-advanced-rectangular-only"'), "Basic/Pro/Advanced rail stays rectangular and compact");
add("dropdown_position_has_max_height", overlay.includes("type DropdownPosition = { top: number; left: number; minWidth: number; maxHeight: number }") || overlay.includes("maxHeight: number"), "dropdown position includes visual viewport height budget");
add("dropdown_style_uses_max_height", overlay.includes("maxHeight: resolvedPosition.maxHeight") && overlay.includes('data-pass1454-dropdown-viewport-budget="max-height-from-visual-viewport"'), "dropdown DOM uses max-height and pass marker");
add("navbar_close_callback_defined_before_effect", navbar.indexOf("const closeHeaderSurfaces = useCallback") < navbar.indexOf("useEffect(() => {\n    setMenuOpen(false)"), "header close callback cannot TDZ crash");
add("navbar_header_triggers_tagged", navbar.includes('data-pass1454-header-runtime="exclusive-dropdowns-cart-bottom-sheet"') && navbar.includes('data-pass1454-header-trigger="language-anchor-bounded"') && navbar.includes('data-pass1454-header-trigger="wallet-anchor-bounded"') && navbar.includes('data-pass1454-header-trigger="account-anchor-bounded"') && navbar.includes('data-pass1454-header-trigger="cart-bottom-sheet-only"'), "language/wallet/account/cart triggers have runtime tags");
add("cart_bottom_sheet_safe_area", cart.includes('"pass1454-cart": "bottom-sheet-safe-area-only"') && cart.includes('data-pass1454-cart-scroll-owner="cart-items-only"'), "cart remains bottom sheet with its own scroll owner");
add("realmarkets_architecture_attrs", real.includes("PASS1454_REAL_MARKETS_ARCHITECTURE") && real.includes('data-pass1454-real-markets-architecture={PASS1454_REAL_MARKETS_ARCHITECTURE.version}') && real.includes('data-pass1454-real-markets-modal-scroll="single-owner"'), "Real Markets has table/source/modal architecture markers");
add("shield_rectangular_proof_attrs", shield.includes('data-pass1454-shield-modal="rectangular-chart-depth-rail"') && shield.includes('data-pass1454-shield-details="source-gaps-next-step-secondary"'), "Shield modal is explicitly rectangular with secondary details");
add("css_suppresses_old_orbit_bubble_inside_public_shell", css.includes('[data-pass1454-public-modal-rule="rectangular-chart-attached-depth-rail-only"] .unified-asset-orbit-stage') && css.includes('[data-pass1454-public-modal-rule="rectangular-chart-attached-depth-rail-only"] .unified-asset-bubble-button') && css.includes("display: none !important"), "old bubble/orbit cascade is actively suppressed inside current modal shell");
add("css_mobile_depth_three_buttons", css.includes('@media (max-width: 640px)') && css.includes('[data-pass1454-depth-controls="basic-pro-advanced-rectangular-only"]') && css.includes('grid-template-columns: repeat(3, minmax(0, 1fr)) !important'), "mobile depth rail is compact 3-button row");
add("css_reduced_motion_guard", css.includes('@media (prefers-reduced-motion: reduce)') && css.includes('[data-pass1454-runtime-architecture="mobile-performance-rectangular-terminal"] *'), "motion is throttled for reduced-motion users");
add("doc_exists", doc.includes("PASS1454–1493") && doc.includes("rectangular"), "progress doc records the product rule");
add("package_script_registered", pkg.includes('"verify:pass1454-1493-runtime-architecture"'), "package exposes verifier script");

const failed = checks.filter((check) => !check.ok);
for (const check of checks) {
  console.log(`${check.ok ? "PASS" : "FAIL"} ${check.name} — ${check.note}`);
}
if (failed.length) {
  console.error(`\n${failed.length}/${checks.length} checks failed.`);
  process.exit(1);
}
console.log(`\nPASS1454–1493 runtime architecture verifier passed ${checks.length}/${checks.length}.`);
