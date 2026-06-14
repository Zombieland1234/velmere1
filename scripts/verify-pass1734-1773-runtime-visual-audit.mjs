import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));

const checks = [];
function add(label, condition, detail = "") {
  checks.push({ label, ok: Boolean(condition), detail });
}

const contract = read("lib/ui/pass1734-runtime-cleanliness-contract.ts");
const overlay = read("components/ui/OverlayPrimitives.tsx");
const navbar = read("components/Navbar.tsx");
const cartProvider = read("components/CartProvider.tsx");
const cart = read("components/CartDrawer.tsx");
const unified = read("components/market-integrity/UnifiedAssetAnalysisControls.tsx");
const css = read("app/globals.css");
const pkg = JSON.parse(read("package.json"));
const routes = read("scripts/smoke-routes-static.mjs");

add("contract_exists", exists("lib/ui/pass1734-runtime-cleanliness-contract.ts"));
add("contract_has_8_lanes", [
  "header_language_wallet_account_dropdowns",
  "cart_bottom_sheet_visibility",
  "rectangular_asset_modal_only",
  "chart_wheel_zoom_ownership",
  "real_markets_minimal_table_flow",
  "mobile_safe_area_and_overflow",
  "color_noise_reduction",
  "z_index_scroll_lock_audit",
].every((token) => contract.includes(token)));
add("contract_has_29_required_checks", contract.includes("PASS1734_RUNTIME_CLEANLINESS_CHECKLIST") && (contract.match(/required: true/g)?.length ?? 0) >= 29);
add("navbar_imports_contract", navbar.includes("getPass1734RuntimeCleanlinessSummary") && navbar.includes("runtimeCleanliness.requiredChecks"));
add("navbar_exclusive_surface_helper", navbar.includes("openExclusiveHeaderSurface") && navbar.includes('surface === "cart"') && navbar.includes('surface === "language"') && navbar.includes('surface === "wallet"') && navbar.includes('surface === "account"'));
add("navbar_pass1734_trigger_markers", [
  'data-pass1734-popup-trigger="language-exclusive"',
  'data-pass1734-popup-trigger="wallet-exclusive"',
  'data-pass1734-popup-trigger="account-exclusive"',
  'data-pass1734-popup-trigger="cart-bottom-sheet"',
].every((token) => navbar.includes(token)));
add("navbar_dropdown_surface_markers", navbar.includes('pass1734: "popup-visible-bounded"') && navbar.includes('pass1734: "exclusive-drawer"'));
add("navbar_unique_keys_still_hardened", navbar.includes("stableLinkKey") && !navbar.includes("key={link.href}\n"));
add("overlay_dropdown_has_placement_state", overlay.includes('placement: "anchored" | "fallback"') && overlay.includes('placement: "anchored"') && overlay.includes('placement: "fallback"'));
add("overlay_dropdown_has_pass1734_markers", overlay.includes('data-pass1734-popup-root="anchored-bounded-visible"') && overlay.includes("data-pass1734-dropdown-placement") && overlay.includes("data-pass1734-dropdown-no-left-corner"));
add("overlay_width_clamped_to_viewport", overlay.includes("Math.max(rect.width, preferredWidth)") && overlay.includes("Math.max(144, viewportWidth - 24)"));
add("overlay_modal_drawer_scroll_lock_marked", overlay.includes('data-pass1734-modal-scroll-lock="ref-counted-body-portal"') && overlay.includes('data-pass1734-drawer-scroll-lock="ref-counted-body-portal"'));
add("cart_provider_dispatches_rich_open_event", cartProvider.includes('pass1734: "cart-open-request"') && cartProvider.includes('surfaceId: "velmere-cart-bottom-sheet"'));
add("cart_drawer_has_pass1734_bottom_sheet_marker", cart.includes('"pass1734-cart": "bottom-sheet-visible-scroll-owned"') && cart.includes("rounded-t-[1.6rem]"));
add("unified_modal_has_rectangular_runtime_marker", unified.includes('data-pass1734-runtime-cleanliness="rectangular-popup-only"') && unified.includes('data-pass1734-color-rule="gold-primary-cyan-state-only"'));
add("unified_chart_owns_wheel_capture", unified.includes('data-pass1734-chart-wheel-owner="zoom-not-page-scroll"') && unified.includes("onWheelCapture") && unified.includes("event.preventDefault()"));
add("unified_depth_controls_no_bubbles", unified.includes('data-pass1734-depth-controls="three-rectangles-no-bubbles"') && unified.includes('data-pass1734-depth-rail="basic-pro-advanced-attached"'));
add("css_dropdown_visible_bounded", css.includes('[data-pass1734-popup-root="anchored-bounded-visible"]') && css.includes("max-width: calc(100vw - 1rem)"));
add("css_cart_bottom_sheet_visible", css.includes('[data-pass1734-cart="bottom-sheet-visible-scroll-owned"]') && css.includes("border-radius: 1.6rem 1.6rem 0 0"));
add("css_rectangular_modal_suppresses_orbit_bubble", css.includes('[data-pass1734-runtime-cleanliness="rectangular-popup-only"] .unified-asset-orbit-stage') && css.includes('[data-pass1734-runtime-cleanliness="rectangular-popup-only"] .unified-asset-bubble-button') && css.includes("display: none !important"));
add("css_chart_wheel_owner", css.includes('[data-pass1734-chart-wheel-owner="zoom-not-page-scroll"]') && css.includes("touch-action: none !important"));
add("css_mobile_three_button_row", css.includes('@media (max-width: 720px)') && css.includes('[data-pass1734-depth-controls="three-rectangles-no-bubbles"]'));
add("package_script_registered", Boolean(pkg.scripts["verify:pass1734-1773-runtime-visual-audit"]));
add("routes_still_include_audit_pages", routes.includes('/security/audits/pricing') && routes.includes('/security/audits/sample') && routes.includes('/security/audits/export/sample'));
add("legacy_runtime_simplification_script_still_present", Boolean(pkg.scripts["verify:pass1454-1493-runtime-architecture"]));
add("business_flow_script_still_present", Boolean(pkg.scripts["verify:pass1694-1733-audit-business-flow"]));

const failed = checks.filter((check) => !check.ok);
for (const check of checks) {
  console.log(`${check.ok ? "✓" : "✕"} ${check.label}${check.detail ? ` — ${check.detail}` : ""}`);
}
if (failed.length) {
  console.error(`verify-pass1734-1773-runtime-visual-audit failed ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log(`verify-pass1734-1773-runtime-visual-audit ok ${checks.length}/${checks.length}`);
