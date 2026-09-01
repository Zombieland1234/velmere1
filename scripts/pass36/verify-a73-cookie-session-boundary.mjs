import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (value) => fs.readFileSync(path.join(root, value), "utf8");
const json = (value) => JSON.parse(read(value));
const checks = [];
const check = (id, pass, detail = null) => checks.push({ id, pass: Boolean(pass), detail });
const REVISION = "VELMERE_PASS36_A73R0_COOKIE_SESSION_AND_AUTH_FLOW_TRUST_BOUNDARY_HARDENING";
const PARENT = "VELMERE_PASS36_A72R0_DOWNLOAD_RESPONSE_AND_CONTENT_DISPOSITION_TRUST_BOUNDARY_HARDENING";

const policy = json("config/pass36/a73-cookie-session-and-auth-flow-trust-boundary.json");
const state = json("config/pass36/a73-current-state.json");
const receipt = json("config/pass36/a73-cookie-session-boundary-test-receipt.json");
const current = json("config/pass35/current-revision.json");
const authority = json("config/pass36/current-release-authority.json");
const pkg = json("package.json");
const active = read("VELMERE_ACTIVE_PASS.txt").trim();
const boundary = read("lib/security/cookie-session-boundary.ts");
const lensClient = read("components/search/VelmereIntelligenceSearchClient.tsx");
const shieldMapClient = read("components/market-integrity/ShieldMapCommandClient.tsx");
const coveredFiles = [
  "lib/auth/account-session.ts",
  "lib/auth/auth-session-family.ts",
  "lib/auth/password-recovery-grant.ts",
  "lib/auth/supabase-auth-flow-state.ts",
  "lib/auth/supabase-auth-cookies.ts",
];

check("revision:policy", policy.revisionId === REVISION && policy.parentRevisionId === PARENT);
check("revision:state", state.revisionId === REVISION && state.parentRevisionId === PARENT);
check("revision:current", current.sourceRevisionId === authority.currentSource?.revisionId && current.currentReleaseAuthorityRevisionId === authority.authorityRevisionId);
check("revision:active", active === authority.currentSource?.revisionId);
check("current:a73", current.cookieSessionTrustBoundaryRevisionId === REVISION && current.cookieSessionTrustBoundaryImplemented === true);
check("current:a72-retained", current.downloadResponseTrustBoundaryRevisionId === PARENT && current.downloadResponseTrustBoundaryImplemented === true);
check("policy:central", policy.requirements?.singleCentralCookieSerializerAndParser === true && policy.requirements?.closedCookieProfiles === true);
check("policy:duplicates", policy.requirements?.duplicateCookieShadowingRejected === true);
check("policy:budgets", policy.requirements?.cookieHeaderAndValueBudgetsEnforced === true);
check("policy:encoding", policy.requirements?.controlCharactersAndMalformedPercentEncodingRejected === true);
check("policy:attributes", policy.requirements?.productionSecureAndHttpOnlyRequired === true && policy.requirements?.exactPathAndSameSiteProfilesRequired === true);
check("policy:clear", policy.requirements?.clearCookiesRequireMaxAgeZeroAndEpochExpires === true);
check("policy:strict-json", policy.requirements?.signedCookiePayloadsUseStrictJsonBoundary === true && policy.requirements?.duplicateAndDangerousSignedJsonKeysRejected === true);
check("policy:canonical-signing", policy.requirements?.canonicalBase64UrlAndSignatureShapeRequired === true);
check("policy:ttl", policy.requirements?.authFlowAndRecoveryTtlChronologyEnforced === true && policy.requirements?.supabaseSessionExpiryStrictlyValidated === true);
check("policy:no-manual", policy.requirements?.manualCookieSerializersAndParsersForbidden === true);
check("policy:paid-depth", policy.requirements?.paidDepthRequiresVerifiedEntitlementPath === true && policy.coveredPaidDepthTruthSurfaces === 2);
check("policy:coverage", policy.coveredProductionAuthModules === 5 && policy.closedCookieProfiles === 7 && policy.distinctCookieNames === 6);
check("boundary:id", boundary.includes("PASS36_A73_COOKIE_SESSION_BOUNDARY_ID") && boundary.includes("velmere.pass36.a73.cookie-session-boundary.v1"));
check("boundary:profiles", boundary.includes("SECURITY_COOKIE_PROFILES") && boundary.includes('account_session:') && boundary.includes('supabase_refresh:') && boundary.includes('password_recovery:'));
check("boundary:duplicate", boundary.includes("cookie_duplicate_name") && boundary.includes("matches.length !== 1"));
check("boundary:header-budget", boundary.includes("MAX_COOKIE_HEADER_BYTES") && boundary.includes("cookie_header_too_large"));
check("boundary:value-budget", boundary.includes("cookie_value_too_large") && boundary.includes("maxValueBytes"));
check("boundary:control", boundary.includes("cookie_header_control_character") && boundary.includes("cookie_value_invalid"));
check("boundary:secure", boundary.includes('"Secure"') && boundary.includes('"HttpOnly"') && boundary.includes('"Priority=High"'));
check("boundary:no-domain", !boundary.includes('"Domain="') && !boundary.includes("SameSite=None"));
check("boundary:clear-expiry", boundary.includes("Expires=Thu, 01 Jan 1970 00:00:00 GMT") && boundary.includes("cookie_clear_profile_required"));
check("boundary:strict-json", boundary.includes("parseStrictJsonText") && boundary.includes("rejectDuplicateKeys: true") && boundary.includes("rejectDangerousKeys: true"));
check("boundary:canonical-base64", boundary.includes("bytes.toString(\"base64url\") !== input.encodedPayload") && boundary.includes("cookie_signed_payload_encoding_invalid"));
for (const file of coveredFiles) {
  const text = read(file);
  check(`covered:${file}`, text.includes("cookie-session-boundary"));
  check(`covered:no-manual-parse:${file}`, !text.includes('.split(";")') && !text.includes("decodeURIComponent(item.slice") && !text.includes("decodeURIComponent(raw.slice"));
  check(`covered:no-manual-serializer:${file}`, !text.includes("HttpOnly; SameSite=") && !text.includes("Max-Age=${"));
  check(`covered:no-signed-json-parse:${file}`, !/JSON\.parse\(Buffer\.from\([^\n]+base64url/u.test(text));
}
const account = read("lib/auth/account-session.ts");
const family = read("lib/auth/auth-session-family.ts");
const recovery = read("lib/auth/password-recovery-grant.ts");
const flow = read("lib/auth/supabase-auth-flow-state.ts");
const supabase = read("lib/auth/supabase-auth-cookies.ts");
check("migration:account", account.includes('readUniqueSecurityCookie(request, "account_session")') && account.includes('profile: "account_session"'));
check("migration:family", family.includes('readUniqueSecurityCookie(request, "session_family")') && family.includes('profile: "session_family_legacy_clear"'));
check("migration:recovery", recovery.includes('readUniqueSecurityCookie(request, "password_recovery")') && recovery.includes('profile: "password_recovery"'));
check("migration:flow", flow.includes('readUniqueSecurityCookie(request, "auth_flow")') && flow.includes('profile: "auth_flow"'));
check("migration:supabase", supabase.includes('readUniqueSecurityCookie(request, "supabase_access")') && supabase.includes('profile: "supabase_refresh"'));
check("migration:expiry", supabase.includes("Number.isFinite(rawExpiry)") && supabase.includes("Number.isInteger(rawExpiry)") && supabase.includes("supabase_session_expiry_invalid"));
const paidPdfProductMappings = lensClient.match(/depth === "pro"\s*\?\s*"vlm_pro_pdf_single"\s*:\s*"vlm_advanced_pdf_single"/g) ?? [];
check("paid-depth:lens-products", paidPdfProductMappings.length >= 2, paidPdfProductMappings.length);
check("paid-depth:shield-map-basic", shieldMapClient.includes('depth="basic"') && !shieldMapClient.includes('depth={showDeepDive ? "advanced" : "basic"}'));
check("test:all-pass", receipt.counts?.total >= 57 && receipt.counts?.passed === receipt.counts.total && receipt.counts.failed === 0, receipt.counts);
for (const id of [
  "duplicate_cookie_shadowing_rejected",
  "oversized_cookie_header_rejected",
  "strict_signed_duplicate_key_rejected",
  "strict_signed_proto_rejected",
  "account_duplicate_rejected",
  "session_family_duplicate_rejected",
  "signed_flow_duplicate_json_rejected",
  "recovery_grant_duplicate_rejected",
  "supabase_nan_expiry_rejected",
  "no_manual_set_cookie_serializers",
]) check(`test:${id}`, receipt.checks?.some((row) => row.id === id && row.pass === true));
check("package:test", pkg.scripts?.["test:pass36:a73"] === "node --experimental-strip-types --import ./scripts/pass11/register-offline-ts-loader.mjs scripts/pass36/test-a73-cookie-session-boundary.mjs");
check("package:verify", pkg.scripts?.["verify:pass36:a73"] === "node scripts/pass36/verify-a73-cookie-session-boundary.mjs");
check("package:metadata", pkg.velmereCookieSessionTrustBoundaryPass === REVISION);
check("truth:no-real-auth", state.realAuthProviderFlowExecuted === false && state.productionBrowserCookieCompatibilityExecuted === false);
check("truth:no-release-credit", state.exactFinalByteBuildExecuted === false && state.criticalOfflineGatePassed === false && state.realStagingExecuted === false && state.saleEnabled === false && state.liveProven === false);

const failed = checks.filter((row) => !row.pass);
const output = {
  schemaVersion: "velmere.pass36.a73.cookie-session-boundary-verification.v1",
  revisionId: REVISION,
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  coveredProductionAuthModules: coveredFiles.length,
  closedCookieProfiles: policy.closedCookieProfiles,
  checks,
};
console.log(JSON.stringify(output, null, 2));
if (failed.length) process.exit(1);
