#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const exists = (relative) => fs.existsSync(path.join(root, relative));
const checks = [];
const assert = (name, condition, detail) => {
  checks.push({ name, passed: Boolean(condition), detail });
  if (!condition) throw new Error(`${name}: ${detail}`);
};

const bootstrap = read("scripts/velmere-dev-bootstrap.mjs");
assert("retired_history_route_not_required", !bootstrap.includes('"app/api/market-integrity/history/route.ts"'), "bootstrap must not require a route removed by PASS15 consolidation");
assert("canonical_dispatch_route_required", bootstrap.includes('"app/api/market-integrity/[operation]/route.ts"'), "generic market-integrity dispatcher must be required");
assert("canonical_history_handler_required", bootstrap.includes('"lib/server/market-integrity-route-modules/history.ts"'), "history handler module must be required");
assert("retired_history_route_absent", !exists("app/api/market-integrity/history/route.ts"), "do not reintroduce duplicate API route");

const layout = read("app/layout.tsx");
assert("localized_skip_link_mounted", layout.includes("<LocalizedSkipLink />"), "localized skip link must be mounted globally");
assert("route_transition_mounted", layout.includes("<VelmereRouteTransition />"), "route transition must be mounted globally");

const loading = read("components/ui/RouteLoadingShell.tsx");
assert("route_loading_mark_reused", loading.includes("VelmereRouteLoadingMark"), "shared V-Shield loading mark must be reused");
assert("route_loading_state_exposed", loading.includes('data-velmere-route-loading="true"'), "route readiness selector must remain observable");

const assetLogo = read("components/market-integrity/AssetLogo.tsx");
const resolver = read("lib/market-integrity/asset-logo-resolver.ts");
assert("logo_viewport_loading", assetLogo.includes("IntersectionObserver"), "logo pipeline must avoid eager-loading the full catalog");
assert("logo_fallback_visible", assetLogo.includes("velmere-asset-logo-fallback"), "labeled fallback must remain visible until imagery loads");
assert("jupiter_logo_supported", resolver.includes('JUP: "/market-logos/jup.svg"'), "Jupiter local vector must be resolvable");
assert("provider_image_fields_supported", ["image?: string", "logo?: string", "icon?: string", "domain?: string"].every((token) => resolver.includes(token)), "provider image/domain fields must be accepted");
assert("controlled_brand_domain", resolver.includes("controlledBrandIconRoute"), "issuer-domain logos must use a controlled route");

const auditPage = read("components/security/SecurityAuditsCleanPage.tsx");
const auditArt = read("components/security/SecurityAuditHeroArt.tsx");
assert("audit_hero_art_mounted", auditPage.includes("<SecurityAuditHeroArt />"), "public audit hero artwork must be mounted");
assert("audit_hero_art_presentation_only", auditArt.includes('aria-hidden="true"'), "audit artwork must not alter semantics");
assert("audit_stop_sell_retained", auditPage.includes("resolvePass35PaidUiStopSell"), "paid audit stop-sell must remain active");

const shieldPro = read("components/market-integrity/ShieldProCleanTerminalClient.tsx");
assert("shield_pro_bounded_json_retained", shieldPro.includes("readJsonResponseBounded"), "Shield Pro must retain bounded response parsing");
assert("shield_pro_false_live_absent", !shieldPro.includes("LIVE · PARTIAL"), "misleading live label must remain absent");

const square = read("components/square/VelmereSquareClient.tsx");
assert("square_customer_auth_retained", square.includes("fetchWithCustomerAuth"), "Square write operations must retain customer auth");

console.log(JSON.stringify({
  status: "PASS_A35_VISUAL_PARITY_CLOSURE",
  checks: checks.length,
  passed: checks.filter((item) => item.passed).length,
  exactRuntimeBuildBrowserClaimed: false,
  sellEnabled: false,
}, null, 2));
