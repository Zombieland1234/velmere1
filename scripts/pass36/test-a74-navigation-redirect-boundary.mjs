import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  PASS36_A74_NAVIGATION_REDIRECT_BOUNDARY_ID,
  NavigationRedirectBoundaryError,
  assertBrowserRedirectUrl,
  assertCheckoutRedirectUrl,
  buildCanonicalSameOriginUrl,
  normalizeInternalNavigationPath,
  resolveCanonicalSiteOrigin,
} from "../../lib/security/navigation-redirect-boundary.ts";
import { buildVlmPaidReturnPath } from "../../lib/commerce/vlm-paid-access.ts";
import { createSupabaseAuthFlowState } from "../../lib/auth/supabase-auth-flow-state.ts";

const REVISION = "VELMERE_PASS36_A74R0_NAVIGATION_REDIRECT_AND_CALLBACK_TRUST_BOUNDARY_HARDENING";
const checks = [];
const check = (id, condition, detail = null) => {
  const pass = Boolean(condition);
  checks.push({ id, pass, detail });
  assert.ok(pass, id);
};
const expectCode = (id, fn, code) => {
  try { fn(); check(id, false, "unexpected_success"); }
  catch (error) {
    check(id, error instanceof NavigationRedirectBoundaryError && error.code === code, error instanceof Error ? error.message : String(error));
  }
};

const originalNodeEnv = process.env.NODE_ENV;
const originalVercelEnv = process.env.VERCEL_ENV;
process.env.NODE_ENV = "test";
delete process.env.VERCEL_ENV;

check("boundary_id_exact", PASS36_A74_NAVIGATION_REDIRECT_BOUNDARY_ID === "velmere.pass36.a74.navigation-redirect-boundary.v1");
check("canonical_configured_https", resolveCanonicalSiteOrigin({ requestUrl: "https://attacker.example/path", configuredSiteUrl: "https://velmere.example" }) === "https://velmere.example");
check("canonical_dev_request_fallback", resolveCanonicalSiteOrigin({ requestUrl: "http://localhost:3000/api/auth/callback", production: false }) === "http://localhost:3000");
check("canonical_vercel_preview_branch_fallback", resolveCanonicalSiteOrigin({
  requestUrl: "https://deployment-id.vercel.app/api/auth/callback",
  production: true,
  environment: { VERCEL_ENV: "preview", VERCEL_BRANCH_URL: "velmere-git-browser-basic-owner.vercel.app" },
}) === "https://velmere-git-browser-basic-owner.vercel.app");
check("canonical_explicit_precedes_vercel_preview", resolveCanonicalSiteOrigin({
  requestUrl: "https://attacker.example/path",
  configuredSiteUrl: "https://velmere.example",
  production: true,
  environment: { VERCEL_ENV: "preview", VERCEL_BRANCH_URL: "other-preview.vercel.app" },
}) === "https://velmere.example");
expectCode("canonical_production_requires_config", () => resolveCanonicalSiteOrigin({ requestUrl: "https://attacker.example/path", production: true }), "navigation_origin_invalid");
expectCode("canonical_vercel_production_fallback_denied", () => resolveCanonicalSiteOrigin({
  requestUrl: "https://velmere.example/path",
  production: false,
  environment: { VERCEL_ENV: "production", VERCEL_BRANCH_URL: "velmere-production.vercel.app" },
}), "navigation_origin_invalid");
expectCode("canonical_invalid_vercel_preview_denied", () => resolveCanonicalSiteOrigin({
  requestUrl: "https://deployment-id.vercel.app/path",
  production: false,
  environment: { VERCEL_ENV: "preview", VERCEL_BRANCH_URL: "https://evil.vercel.app/path" },
}), "navigation_origin_invalid");
expectCode("canonical_credentials_rejected", () => resolveCanonicalSiteOrigin({ requestUrl: "https://velmere.example", configuredSiteUrl: "https://user:pass@velmere.example" }), "navigation_credentials_forbidden");
expectCode("canonical_path_rejected", () => resolveCanonicalSiteOrigin({ requestUrl: "https://velmere.example", configuredSiteUrl: "https://velmere.example/app" }), "navigation_origin_invalid");
expectCode("canonical_query_rejected", () => resolveCanonicalSiteOrigin({ requestUrl: "https://velmere.example", configuredSiteUrl: "https://velmere.example/?x=1" }), "navigation_origin_invalid");
expectCode("canonical_http_production_rejected", () => resolveCanonicalSiteOrigin({ requestUrl: "https://velmere.example", configuredSiteUrl: "http://velmere.example", production: true }), "navigation_protocol_invalid");

check("internal_account_path", normalizeInternalNavigationPath("/pl/account", { fallback: "/pl", locale: "pl", profile: "auth_return" }) === "/pl/account");
check("internal_recovery_path", normalizeInternalNavigationPath("/de/login?recovery=1", { fallback: "/de", locale: "de", profile: "auth_return" }) === "/de/login?recovery=1");
check("internal_auth_unknown_fallback", normalizeInternalNavigationPath("/en/shop", { fallback: "/en/account", locale: "en", profile: "auth_return" }) === "/en/account");
check("internal_absolute_fallback", normalizeInternalNavigationPath("https://evil.example", { fallback: "/en", locale: "en" }) === "/en");
check("internal_scheme_relative_fallback", normalizeInternalNavigationPath("//evil.example/path", { fallback: "/en", locale: "en" }) === "/en");
check("internal_backslash_fallback", normalizeInternalNavigationPath("/en\\evil", { fallback: "/en", locale: "en" }) === "/en");
check("internal_encoded_slash_fallback", normalizeInternalNavigationPath("/en/%2f%2fevil.example", { fallback: "/en", locale: "en" }) === "/en");
check("internal_crlf_fallback", normalizeInternalNavigationPath("/en/account%0d%0aLocation:https://evil.example", { fallback: "/en", locale: "en" }) === "/en");
check("internal_fragment_fallback", normalizeInternalNavigationPath("/en/account#token", { fallback: "/en", locale: "en" }) === "/en");
check("internal_api_fallback", normalizeInternalNavigationPath("/en/api/auth/session", { fallback: "/en", locale: "en" }) === "/en/api/auth/session");
check("internal_root_api_fallback", normalizeInternalNavigationPath("/api/auth/session", { fallback: "/en", locale: "en" }) === "/en");
check("paid_success_loop_rejected", normalizeInternalNavigationPath("/en/checkout/success?session=x", { fallback: "/en", locale: "en", profile: "paid_return" }) === "/en");
check("paid_login_rejected", normalizeInternalNavigationPath("/en/login", { fallback: "/en", locale: "en", profile: "paid_return" }) === "/en");
check("paid_asset_return_valid", normalizeInternalNavigationPath("/en/market-integrity?asset=BTC", { fallback: "/en", locale: "en", profile: "paid_return" }) === "/en/market-integrity?asset=BTC");
check("paid_query_budget_fallback", normalizeInternalNavigationPath(`/en/account?${Array.from({length:17},(_,i)=>`x${i}=1`).join("&")}`, { fallback: "/en", locale: "en", profile: "paid_return" }) === "/en");

const canonicalRedirect = buildCanonicalSameOriginUrl({ path: "/pl/account", requestUrl: "https://attacker.example/callback", configuredSiteUrl: "https://velmere.example", locale: "pl", profile: "auth_return" });
check("server_redirect_uses_configured_origin", canonicalRedirect.toString() === "https://velmere.example/pl/account");
const errorRedirect = buildCanonicalSameOriginUrl({ path: "/en/login?auth_error=callback_rejected", requestUrl: "https://evil.example", configuredSiteUrl: "https://velmere.example", locale: "en", profile: "locale_navigation" });
check("server_error_redirect_same_origin", errorRedirect.origin === "https://velmere.example" && errorRedirect.pathname === "/en/login");

check("browser_same_origin_relative", assertBrowserRedirectUrl("/en/account", { profile: "same_origin", browserOrigin: "https://velmere.example" }) === "https://velmere.example/en/account");
check("browser_same_origin_dev_port", assertBrowserRedirectUrl("http://localhost:3000/en/account", { profile: "same_origin", browserOrigin: "http://localhost:3000" }) === "http://localhost:3000/en/account");
expectCode("browser_cross_origin_rejected", () => assertBrowserRedirectUrl("https://evil.example/en/account", { profile: "same_origin", browserOrigin: "https://velmere.example" }), "navigation_origin_invalid");
expectCode("browser_credentials_rejected", () => assertBrowserRedirectUrl("https://u:p@velmere.example/en", { profile: "same_origin", browserOrigin: "https://velmere.example" }), "navigation_credentials_forbidden");
expectCode("browser_fragment_rejected", () => assertBrowserRedirectUrl("https://velmere.example/en#token", { profile: "same_origin", browserOrigin: "https://velmere.example" }), "navigation_fragment_forbidden");

const stripe = assertCheckoutRedirectUrl("https://checkout.stripe.com/c/pay/cs_test_123#fidkd", "https://velmere.example");
check("stripe_checkout_exact_host_valid", stripe.startsWith("https://checkout.stripe.com/c/pay/cs_test_123"));
check("checkout_same_origin_valid", assertCheckoutRedirectUrl("/en/checkout/success?demo=1", "https://velmere.example") === "https://velmere.example/en/checkout/success?demo=1");
expectCode("stripe_subdomain_rejected", () => assertBrowserRedirectUrl("https://evil.stripe.com/c/pay/x", { profile: "stripe_checkout", browserOrigin: "https://velmere.example" }), "navigation_provider_origin_invalid");
expectCode("stripe_http_rejected", () => assertBrowserRedirectUrl("http://checkout.stripe.com/c/pay/x", { profile: "stripe_checkout", browserOrigin: "https://velmere.example" }), "navigation_protocol_invalid");
expectCode("stripe_port_rejected", () => assertBrowserRedirectUrl("https://checkout.stripe.com:444/c/pay/x", { profile: "stripe_checkout", browserOrigin: "https://velmere.example" }), "navigation_port_forbidden");
expectCode("stripe_path_rejected", () => assertBrowserRedirectUrl("https://checkout.stripe.com/redirect/evil", { profile: "stripe_checkout", browserOrigin: "https://velmere.example" }), "navigation_path_forbidden");

check("supabase_oauth_exact_origin_valid", assertBrowserRedirectUrl("https://project.supabase.co/auth/v1/authorize?provider=google", { profile: "supabase_oauth", browserOrigin: "https://velmere.example", supabaseOrigin: "https://project.supabase.co" }).startsWith("https://project.supabase.co/auth/v1/authorize"));
expectCode("supabase_origin_mismatch_rejected", () => assertBrowserRedirectUrl("https://other.supabase.co/auth/v1/authorize", { profile: "supabase_oauth", browserOrigin: "https://velmere.example", supabaseOrigin: "https://project.supabase.co" }), "navigation_provider_origin_invalid");
expectCode("supabase_path_rejected", () => assertBrowserRedirectUrl("https://project.supabase.co/rest/v1/authorize", { profile: "supabase_oauth", browserOrigin: "https://velmere.example", supabaseOrigin: "https://project.supabase.co" }), "navigation_path_forbidden");
expectCode("supabase_fragment_rejected", () => assertBrowserRedirectUrl("https://project.supabase.co/auth/v1/authorize#token", { profile: "supabase_oauth", browserOrigin: "https://velmere.example", supabaseOrigin: "https://project.supabase.co" }), "navigation_fragment_forbidden");

check("paid_access_return_uses_boundary", buildVlmPaidReturnPath({ locale: "en", returnPath: "https://evil.example" }, "/en") === "/en");
check("paid_access_return_valid", buildVlmPaidReturnPath({ locale: "pl", returnPath: "/pl/market-integrity?asset=ETH" }, "/pl") === "/pl/market-integrity?asset=ETH");
const authState = createSupabaseAuthFlowState({ intent: "google_oauth", locale: "en", returnPath: "https://evil.example" });
check("auth_state_external_return_rejected", authState.returnPath === "/en/account");

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
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
for (const file of coveredFiles) check(`covered:${file}`, read(file).includes("navigation-redirect-boundary"));
const callback = read("app/api/auth/callback/route.ts");
const flow = read("lib/auth/supabase-auth-flow.ts");
const checkout = read("app/api/checkout/vlm-service/route.ts");
const clients = coveredFiles.slice(2).map(read).join("\n");
check("callback_no_request_origin_redirect", !callback.includes("new URL(result.returnPath, request.url)") && callback.includes("buildCanonicalSameOriginUrl"));
check("oauth_server_validates_provider_url", flow.includes('profile: "supabase_oauth"') && flow.includes("NEXT_PUBLIC_SUPABASE_URL"));
check("checkout_server_canonical_origin", checkout.includes("resolveCanonicalSiteOrigin") && !checkout.includes('process.env.NEXT_PUBLIC_SITE_URL?.replace'));
check("checkout_cancel_url_canonical", checkout.includes("new URL(returnPath, siteUrl).toString()"));
check("clients_no_unvalidated_payload_assign", !clients.includes("window.location.assign(payload.url);") && !clients.includes("window.location.assign(checkoutPayload.url);"));
check("checkout_exact_stripe_host", !read("components/security/SecurityAuditsCleanPage.tsx").includes('hostname.endsWith(".stripe.com")'));

process.env.NODE_ENV = originalNodeEnv;
if (originalVercelEnv === undefined) delete process.env.VERCEL_ENV; else process.env.VERCEL_ENV = originalVercelEnv;

const failed = checks.filter((row) => !row.pass);
const receipt = {
  schemaVersion: "velmere.pass36.a74.navigation-redirect-boundary-test.v1",
  revisionId: REVISION,
  counts: { total: checks.length, passed: checks.length - failed.length, failed: failed.length },
  coveredProductionFiles: coveredFiles.length,
  redirectProfiles: 4,
  checks,
};
console.log(JSON.stringify(receipt, null, 2));
if (failed.length) process.exit(1);
