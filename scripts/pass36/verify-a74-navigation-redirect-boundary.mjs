import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (value) => fs.readFileSync(path.join(root, value), "utf8");
const json = (value) => JSON.parse(read(value));
const checks = [];
const check = (id, pass, detail = null) => checks.push({ id, pass: Boolean(pass), detail });
const REVISION = "VELMERE_PASS36_A74R0_NAVIGATION_REDIRECT_AND_CALLBACK_TRUST_BOUNDARY_HARDENING";
const PARENT = "VELMERE_PASS36_A73R0_COOKIE_SESSION_AND_AUTH_FLOW_TRUST_BOUNDARY_HARDENING";

const policy = json("config/pass36/a74-navigation-redirect-and-callback-trust-boundary.json");
const state = json("config/pass36/a74-current-state.json");
const receipt = json("config/pass36/a74-navigation-redirect-boundary-test-receipt.json");
const current = json("config/pass35/current-revision.json");
const authority = json("config/pass36/current-release-authority.json");
const CURRENT_REVISION = authority.authorityRevisionId;
const pkg = json("package.json");
const active = read("VELMERE_ACTIVE_PASS.txt").trim();
const boundary = read("lib/security/navigation-redirect-boundary.ts");
const callback = read("app/api/auth/callback/route.ts");
const authFlow = read("lib/auth/supabase-auth-flow.ts");
const authGate = read("components/auth/AuthGate.tsx");
const checkoutRoute = read("app/api/checkout/vlm-service/route.ts");
const paidAccess = read("lib/commerce/vlm-paid-access.ts");
const paidClient = read("lib/commerce/vlm-paid-access-client.ts");
const auditPage = read("components/security/SecurityAuditsCleanPage.tsx");
const checkoutClient = read("components/checkout/VelmereCheckoutFlowClient.tsx");
const modal = read("components/market-integrity/AssetDetailModal.tsx");
const coveredFiles = [
  "app/api/auth/callback/route.ts",
  "lib/auth/supabase-auth-flow.ts",
  "components/auth/AuthGate.tsx",
  "app/api/checkout/vlm-service/route.ts",
  "lib/commerce/vlm-paid-access.ts",
  "lib/commerce/vlm-paid-access-client.ts",
  "components/security/SecurityAuditsCleanPage.tsx",
  "components/checkout/VelmereCheckoutFlowClient.tsx",
  "components/market-integrity/AssetDetailModal.tsx",
];

check("revision:policy", policy.revisionId === REVISION && policy.parentRevisionId === PARENT);
check("revision:state", state.revisionId === REVISION && state.parentRevisionId === PARENT);
check("revision:authority", typeof CURRENT_REVISION === "string" && CURRENT_REVISION === authority.currentSource?.revisionId);
check("revision:current", current.sourceRevisionId === CURRENT_REVISION);
check("revision:active", active === CURRENT_REVISION);
check("current:a74", current.navigationRedirectTrustBoundaryRevisionId === REVISION && current.navigationRedirectTrustBoundaryImplemented === true);
check("current:a73-retained", current.cookieSessionTrustBoundaryRevisionId === PARENT && current.cookieSessionTrustBoundaryImplemented === true);
check("policy:central", policy.requirements?.singleCentralNavigationRedirectBoundary === true);
check("policy:canonical", policy.requirements?.productionCanonicalOriginMustBeExplicit === true && policy.requirements?.requestHostCannotDefineProductionCallbackOrigin === true);
check("policy:internal", policy.requirements?.internalReturnPathsMustBeRootRelative === true && policy.requirements?.schemeRelativeAndEncodedSeparatorPathsRejected === true);
check("policy:characters", policy.requirements?.controlBidiAndFragmentPayloadsRejected === true);
check("policy:auth", policy.requirements?.authReturnPathsClosedAllowlist === true);
check("policy:paid", policy.requirements?.paidReturnPathsCannotLoopIntoSuccessOrLogin === true);
check("policy:same-origin", policy.requirements?.sameOriginBrowserRedirectsExactOrigin === true);
check("policy:stripe", policy.requirements?.stripeCheckoutExactHostAndPath === true);
check("policy:supabase", policy.requirements?.supabaseOAuthExactConfiguredOriginAndPath === true);
check("policy:credentials", policy.requirements?.credentialsAndUnexpectedPortsRejected === true);
check("policy:query", policy.requirements?.queryCountAndByteBudgetsEnforced === true);
check("policy:assign", policy.requirements?.unvalidatedPayloadLocationAssignForbidden === true);
check("policy:coverage", policy.coveredProductionFiles === 9 && policy.redirectProfiles === 4);
check("boundary:id", boundary.includes("PASS36_A74_NAVIGATION_REDIRECT_BOUNDARY_ID") && boundary.includes("velmere.pass36.a74.navigation-redirect-boundary.v1"));
check("boundary:canonical", boundary.includes("resolveCanonicalSiteOrigin") && boundary.includes("if (isProduction) throw"));
check("boundary:internal", boundary.includes("normalizeInternalNavigationPath") && boundary.includes('profile === "auth_return"') && boundary.includes('profile === "paid_return"'));
check("boundary:encoded", boundary.includes("ENCODED_DANGEROUS") && boundary.includes("navigation_encoding_invalid"));
check("boundary:query-budget", boundary.includes("rows.length > 16") && boundary.includes("bytes > 2048"));
check("boundary:same-origin", boundary.includes('profile === "same_origin"') && boundary.includes("url.origin !== expected"));
check("boundary:stripe-exact", boundary.includes('url.hostname !== "checkout.stripe.com"') && !boundary.includes('endsWith(".stripe.com")'));
check("boundary:stripe-path", boundary.includes('url.pathname.startsWith("/c/pay/")') && boundary.includes('url.pathname.startsWith("/pay/")'));
check("boundary:supabase-origin", boundary.includes("expectedSupabase") && boundary.includes("url.origin !== expectedSupabase"));
check("boundary:supabase-path", boundary.includes('url.pathname !== "/auth/v1/authorize"'));
check("boundary:credentials", boundary.includes("url.username || url.password") && boundary.includes("navigation_credentials_forbidden"));
check("boundary:fragment", boundary.includes("navigation_fragment_forbidden"));
for (const file of coveredFiles) check(`covered:${file}`, read(file).includes("navigation-redirect-boundary"));
check("migration:callback", callback.includes("buildCanonicalSameOriginUrl") && !callback.includes("new URL(result.returnPath, request.url)"));
check("migration:callback-fail-closed", callback.includes("AUTH_CALLBACK_ORIGIN_UNAVAILABLE") && callback.includes("configuredSiteUrl: process.env.NEXT_PUBLIC_SITE_URL"));
check("migration:auth-flow-origin", authFlow.includes("resolveCanonicalSiteOrigin") && !authFlow.includes("const candidate = configured || new URL(request.url).origin"));
check("migration:auth-flow-provider", authFlow.includes('profile: "supabase_oauth"') && authFlow.includes("NEXT_PUBLIC_SUPABASE_URL"));
check("migration:auth-gate", authGate.includes('profile: "supabase_oauth"') && authGate.includes("assertBrowserRedirectUrl(payload.redirectUrl"));
check("migration:checkout-origin", checkoutRoute.includes("resolveCanonicalSiteOrigin") && !checkoutRoute.includes("NEXT_PUBLIC_SITE_URL?.replace"));
check("migration:checkout-cancel", checkoutRoute.includes("new URL(returnPath, siteUrl).toString()"));
check("migration:paid-return", paidAccess.includes("normalizeInternalNavigationPath") && paidAccess.includes('profile: "paid_return"'));
check("migration:paid-client", paidClient.includes("assertCheckoutRedirectUrl(payload.url"));
check("migration:audit-client", auditPage.includes("assertCheckoutRedirectUrl(checkoutPayload.url") && !auditPage.includes('hostname.endsWith(".stripe.com")'));
check("migration:checkout-client", checkoutClient.includes("assertCheckoutRedirectUrl(url"));
check("migration:modal", modal.includes('profile: "same_origin"') && modal.includes("assertBrowserRedirectUrl(analysisGateAction.href"));
const combined = [authGate, paidClient, auditPage, checkoutClient].join("\n");
check("migration:no-direct-payload-assign", !combined.includes("window.location.assign(payload.url);") && !combined.includes("window.location.assign(checkoutPayload.url);"));
check("test:all-pass", receipt.counts?.total >= 58 && receipt.counts?.passed === receipt.counts.total && receipt.counts.failed === 0, receipt.counts);
for (const id of [
  "canonical_production_requires_config",
  "internal_scheme_relative_fallback",
  "internal_encoded_slash_fallback",
  "server_redirect_uses_configured_origin",
  "browser_cross_origin_rejected",
  "stripe_subdomain_rejected",
  "stripe_path_rejected",
  "supabase_origin_mismatch_rejected",
  "supabase_path_rejected",
  "callback_no_request_origin_redirect",
  "clients_no_unvalidated_payload_assign",
]) check(`test:${id}`, receipt.checks?.some((row) => row.id === id && row.pass === true));
check("package:test", pkg.scripts?.["test:pass36:a74"] === "node --experimental-strip-types --import ./scripts/pass11/register-offline-ts-loader.mjs scripts/pass36/test-a74-navigation-redirect-boundary.mjs");
check("package:verify", pkg.scripts?.["verify:pass36:a74"] === "node scripts/pass36/verify-a74-navigation-redirect-boundary.mjs");
check("package:metadata", pkg.velmereNavigationRedirectTrustBoundaryPass === REVISION);
check("truth:no-real-auth", state.realAuthProviderFlowExecuted === false && state.productionBrowserNavigationExecuted === false);
check("truth:no-real-stripe", state.realStripeCheckoutRedirectExecuted === false);
check("truth:no-release-credit", state.exactFinalByteBuildExecuted === false && state.criticalOfflineGatePassed === false && state.realStagingExecuted === false && state.saleEnabled === false && state.liveProven === false);

const failed = checks.filter((row) => !row.pass);
const output = {
  schemaVersion: "velmere.pass36.a74.navigation-redirect-boundary-verification.v1",
  revisionId: REVISION,
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  coveredProductionFiles: coveredFiles.length,
  redirectProfiles: policy.redirectProfiles,
  checks,
};
console.log(JSON.stringify(output, null, 2));
if (failed.length) process.exit(1);
