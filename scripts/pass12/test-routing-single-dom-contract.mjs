import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const count = (value, token) => value.split(token).length - 1;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const checks = [];
const check = (id, condition, evidence) => {
  checks.push({ id, ok: Boolean(condition), evidence });
  assert.ok(condition, id);
};

const proxy = read("proxy.ts");
const transition = read("components/PageTransition.tsx");
const audits = read("components/security/SecurityAuditsCleanPage.tsx");
const lens = read("components/search/VelmereIntelligenceSearchClient.tsx");
const realMarkets = read("components/market-integrity/CrossAssetCollapseRadarPanel.tsx");
const e2e = read("tests/e2e/pass2945-2960-worldclass-full-closure.spec.ts");

check("proxy_matches_all_non_internal_paths", proxy.includes('"/((?!api|_next|_vercel).*)"'), sha256(proxy));
check("proxy_has_no_broad_extension_matcher", !proxy.includes("webmanifest|webp|woff|woff2") && !proxy.includes(".*\\\\.(?:"), "extension exclusion removed from matcher");
for (const prefix of ["/images/", "/market-logos/", "/products/", "/velmere/", "/wallets/"]) {
  check(`public_prefix_${prefix}`, proxy.includes(`"${prefix}"`), prefix);
}
check("public_asset_bypass_is_explicit", proxy.includes("isKnownPublicAssetPath(normalizedPath)") && proxy.includes("return NextResponse.next();"), "guarded bypass");
check("public_asset_guard_rejects_encoded_paths", proxy.includes('pathname.includes("%")'), "encoded separators never enter asset fast path");
check("public_asset_guard_decodes_all_escapes", proxy.includes("decodeURIComponent(pathname)"), "defensive canonical decoding after encoded-path rejection");
check("public_asset_guard_rejects_dot_segments", proxy.includes('segment === "." || segment === ".."'), "dot-segment rejection");
check("public_json_assets_remain_supported", proxy.includes("jpg|json|png"), "current public JSON data files remain reachable");
const loader = read("scripts/pass11/offline-ts-loader.mjs");
check("next_intl_shims_are_test_loader_only", loader.includes('"next-intl/middleware"') && loader.includes('"next-intl/routing"'), sha256(loader));
check("transition_wrapper_not_keyed_by_path", !transition.includes("<motion.div\n      key={pathname}"), sha256(transition));
check("transition_decorative_wash_is_keyed", transition.includes('<span key={pathname} className="velmere-route-wash"'), "decorative-only key");
check("transition_children_render_once", count(transition, "{children}") === 1, count(transition, "{children}"));
check("transition_has_no_animate_presence", !transition.includes("AnimatePresence"), "no retained outgoing tree");
check("transition_uses_same_node_animation", transition.includes("element.animate(") && transition.includes("data-pass12-single-active-route-dom"), "WAAPI stable node");
check("audits_root_selector_unique_in_source", count(audits, "data-pass4609-audit-clean") === 1, count(audits, "data-pass4609-audit-clean"));
check("lens_input_selector_unique_in_source", count(lens, 'data-testid="lens-search-input"') === 1, count(lens, 'data-testid="lens-search-input"'));
check("real_markets_hidden_debug_probe_removed", !realMarkets.includes("pass4576-provider-receipt-probe") && !realMarkets.includes("pass4576ProviderReceiptProbe"), sha256(realMarkets));
check("real_markets_has_no_dangerous_html_sink", !realMarkets.includes("dangerouslySetInnerHTML"), "customer DOM has no hidden JSON HTML sink");
check("e2e_asserts_single_audit_root", e2e.includes("await expect(auditRoot).toHaveCount(1)"), sha256(e2e));
check("e2e_asserts_single_lens_input", e2e.includes("await expect(input).toHaveCount(1)"), sha256(e2e));
check("e2e_asserts_dotted_pdf_404", e2e.includes("pass12.missing-document.pdf") && e2e.includes("toBe(404)"), "dotted pdf 404 matrix");

const receipt = {
  schemaVersion: "velmere.pass12.routing-single-dom-contract.v1",
  generatedAt: new Date().toISOString(),
  runtime: { node: process.version, platform: process.platform, arch: process.arch },
  status: "PASS",
  checkCount: checks.length,
  checks,
  sourceSha256: {
    proxy: sha256(proxy),
    pageTransition: sha256(transition),
    audits: sha256(audits),
    lens: sha256(lens),
    realMarkets: sha256(realMarkets),
    e2e: sha256(e2e),
  },
  truthBoundary: "Static/source contract plus proxy unit coverage. Browser runtime proof still requires a fresh Next build and Playwright execution.",
};
mkdirSync("artifacts/pass12", { recursive: true });
writeFileSync("artifacts/pass12/PASS12_ROUTING_SINGLE_DOM_CONTRACT.json", `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify(receipt, null, 2));
