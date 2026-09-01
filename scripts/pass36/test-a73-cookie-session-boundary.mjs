import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  PASS36_A73_COOKIE_SESSION_BOUNDARY_ID,
  SECURITY_COOKIE_PROFILES,
  CookieSessionBoundaryError,
  buildSecurityCookie,
  decodeStrictSignedCookieJson,
  hasSecurityCookieCandidate,
  inspectSecurityCookieHeader,
  readUniqueSecurityCookie,
} from "../../lib/security/cookie-session-boundary.ts";
import {
  buildVelmereAccountCookie,
  buildVelmereAccountSession,
  resolveRequestAccount,
} from "../../lib/auth/account-session.ts";
import {
  buildAuthSessionFamilyCookie,
  hasAuthSessionFamilyCookie,
  readAuthSessionFamily,
} from "../../lib/auth/auth-session-family.ts";
import {
  buildPasswordRecoveryGrantCookie,
  verifyPasswordRecoveryGrant,
} from "../../lib/auth/password-recovery-grant.ts";
import {
  buildSupabaseAuthFlowCookie,
  createSupabaseAuthFlowState,
  readSupabaseAuthFlowState,
} from "../../lib/auth/supabase-auth-flow-state.ts";
import {
  buildSupabaseAuthCookieHeaders,
  readSupabaseAccessTokenCookie,
  readSupabaseRefreshTokenCookie,
} from "../../lib/auth/supabase-auth-cookies.ts";

const REVISION = "VELMERE_PASS36_A73R0_COOKIE_SESSION_AND_AUTH_FLOW_TRUST_BOUNDARY_HARDENING";
const checks = [];
const check = (id, condition, detail = null) => {
  const pass = Boolean(condition);
  checks.push({ id, pass, detail });
  assert.ok(pass, id);
};
const expectCode = (id, fn, code) => {
  try {
    fn();
    check(id, false, "unexpected_success");
  } catch (error) {
    check(id, error instanceof CookieSessionBoundaryError && error.code === code, error instanceof Error ? error.message : String(error));
  }
};
const expectThrow = (id, fn, pattern) => {
  try {
    fn();
    check(id, false, "unexpected_success");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    check(id, pattern.test(message), message);
  }
};
const pair = (setCookie) => setCookie.split(";", 1)[0];
const requestWithCookie = (cookie) => new Request("http://localhost/api/auth/session", { headers: { cookie } });

const originalNodeEnv = process.env.NODE_ENV;
const originalVercelEnv = process.env.VERCEL_ENV;
process.env.NODE_ENV = "test";
delete process.env.VERCEL_ENV;
process.env.VELMERE_ACCOUNT_SESSION_SECRET_CURRENT = "a73-account-session-secret-current-0000000000000001";
process.env.VELMERE_AUTH_SESSION_FAMILY_SECRET_CURRENT = "a73-family-session-secret-current-0000000000000002";
process.env.VELMERE_AUTH_FLOW_SECRET_CURRENT = "a73-auth-flow-secret-current-0000000000000000003";

check("boundary_id_exact", PASS36_A73_COOKIE_SESSION_BOUNDARY_ID === "velmere.pass36.a73.cookie-session-boundary.v1");
check("closed_profile_count", Object.keys(SECURITY_COOKIE_PROFILES).length === 7);
check("profile_paths_exact",
  SECURITY_COOKIE_PROFILES.account_session.path === "/"
  && SECURITY_COOKIE_PROFILES.supabase_refresh.path === "/api/auth/session"
  && SECURITY_COOKIE_PROFILES.auth_flow.path === "/api/auth/callback"
  && SECURITY_COOKIE_PROFILES.password_recovery.path === "/api/auth/recovery");
check("profile_same_site_exact",
  SECURITY_COOKIE_PROFILES.account_session.sameSite === "Lax"
  && SECURITY_COOKIE_PROFILES.auth_flow.sameSite === "Lax"
  && SECURITY_COOKIE_PROFILES.supabase_refresh.sameSite === "Strict"
  && SECURITY_COOKIE_PROFILES.session_family.sameSite === "Strict");

const accountHeader = buildSecurityCookie({ profile: "account_session", value: "v2.payload.signature", maxAge: 3600 });
check("set_cookie_core_attributes", accountHeader.includes("Path=/; HttpOnly; SameSite=Lax; Max-Age=3600") && accountHeader.endsWith("Priority=High"));
check("set_cookie_no_domain", !accountHeader.includes("Domain=") && !accountHeader.includes("SameSite=None"));
check("nonproduction_secure_absent", !accountHeader.includes("; Secure"));
process.env.NODE_ENV = "production";
const productionHeader = buildSecurityCookie({ profile: "account_session", value: "v2.payload.signature", maxAge: 3600 });
check("production_secure_required", productionHeader.includes("; Secure; Priority=High"));
process.env.NODE_ENV = "test";
const cleared = buildSecurityCookie({ profile: "account_session", value: "ignored", maxAge: 0, clear: true });
check("clear_cookie_exact", cleared.includes("velmere_account_session=;") && cleared.includes("Max-Age=0") && cleared.includes("Expires=Thu, 01 Jan 1970 00:00:00 GMT"));
expectCode("control_value_rejected", () => buildSecurityCookie({ profile: "account_session", value: "a\r\nb", maxAge: 1 }), "cookie_value_invalid");
expectCode("oversized_value_rejected", () => buildSecurityCookie({ profile: "session_family", value: "x".repeat(2049), maxAge: 1 }), "cookie_value_too_large");
expectCode("negative_max_age_rejected", () => buildSecurityCookie({ profile: "account_session", value: "x", maxAge: -1 }), "cookie_max_age_invalid");
expectCode("excessive_max_age_rejected", () => buildSecurityCookie({ profile: "auth_flow", value: "x", maxAge: 601 }), "cookie_max_age_invalid");
expectCode("legacy_profile_clear_only", () => buildSecurityCookie({ profile: "session_family_legacy_clear", value: "x", maxAge: 0 }), "cookie_clear_profile_required");

const accountPair = pair(accountHeader);
check("unique_cookie_read", readUniqueSecurityCookie(requestWithCookie(`other=1; ${accountPair}`), "account_session") === "v2.payload.signature");
const duplicateInspection = inspectSecurityCookieHeader(requestWithCookie(`${accountPair}; other=1; ${accountPair}`), "account_session");
check("duplicate_cookie_shadowing_rejected", duplicateInspection.status === "invalid" && duplicateInspection.errorCode === "cookie_duplicate_name" && duplicateInspection.occurrences === 2);
check("duplicate_cookie_read_fails_closed", readUniqueSecurityCookie(requestWithCookie(`${accountPair}; ${accountPair}`), "account_session") === null);
check("cookie_candidate_detected_on_duplicate", hasSecurityCookieCandidate(requestWithCookie(`${accountPair}; ${accountPair}`), "account_session") === true);
const malformed = inspectSecurityCookieHeader(requestWithCookie("velmere_account_session=%E0%A4%A"), "account_session");
check("malformed_percent_rejected", malformed.status === "invalid" && malformed.errorCode === "cookie_percent_encoding_invalid");
const huge = inspectSecurityCookieHeader(requestWithCookie(`junk=${"x".repeat(33 * 1024)}`), "account_session");
check("oversized_cookie_header_rejected", huge.status === "invalid" && huge.errorCode === "cookie_header_too_large");
const controlHeader = inspectSecurityCookieHeader(requestWithCookie("velmere_account_session=a\u0007b"), "account_session");
check("cookie_header_control_rejected", controlHeader.status === "invalid" && controlHeader.errorCode === "cookie_header_control_character");

const validEncoded = Buffer.from('{"ok":true,"nested":{"value":1}}', "utf8").toString("base64url");
const strictDecoded = decodeStrictSignedCookieJson({ encodedPayload: validEncoded, maxDecodedBytes: 512, maxDepth: 4, maxNodes: 16 });
check("strict_signed_payload_valid", strictDecoded.ok === true && strictDecoded.nested.value === 1);
const duplicateEncoded = Buffer.from('{"ok":true,"ok":false}', "utf8").toString("base64url");
expectThrow("strict_signed_duplicate_key_rejected", () => decodeStrictSignedCookieJson({ encodedPayload: duplicateEncoded, maxDecodedBytes: 512, maxDepth: 4, maxNodes: 16 }), /strict_json_duplicate_key/u);
const protoEncoded = Buffer.from('{"__proto__":{"admin":true}}', "utf8").toString("base64url");
expectThrow("strict_signed_proto_rejected", () => decodeStrictSignedCookieJson({ encodedPayload: protoEncoded, maxDecodedBytes: 512, maxDepth: 4, maxNodes: 16 }), /strict_json_forbidden_key/u);
expectCode("noncanonical_base64url_rejected", () => decodeStrictSignedCookieJson({ encodedPayload: "eyJvayI6dHJ1ZX0=", maxDecodedBytes: 512, maxDepth: 4, maxNodes: 16 }), "cookie_signed_payload_encoding_invalid");

const accountSession = buildVelmereAccountSession({ provider: "preview", email: "member@example.com", displayName: "Member" });
const accountCookie = buildVelmereAccountCookie(accountSession);
const resolved = await resolveRequestAccount(requestWithCookie(pair(accountCookie)));
check("account_cookie_roundtrip", resolved?.accountId === accountSession.accountId && resolved.sessionSource === "cookie");
const accountDuplicate = await resolveRequestAccount(requestWithCookie(`${pair(accountCookie)}; ${pair(accountCookie)}`));
check("account_duplicate_rejected", accountDuplicate === null);

const familyState = {
  schemaVersion: "velmere.auth-session-family.v1",
  familyId: randomUUID(),
  generation: 1,
  subjectFingerprint: "a".repeat(32),
  expiresAt: Math.floor(Date.now() / 1000) + 3600,
};
const familyCookie = buildAuthSessionFamilyCookie(familyState);
const familyRead = readAuthSessionFamily(requestWithCookie(pair(familyCookie)));
check("session_family_roundtrip", familyRead?.familyId === familyState.familyId && familyRead.generation === 1);
check("session_family_duplicate_rejected", readAuthSessionFamily(requestWithCookie(`${pair(familyCookie)}; ${pair(familyCookie)}`)) === null);
check("session_family_candidate_duplicate", hasAuthSessionFamilyCookie(requestWithCookie(`${pair(familyCookie)}; ${pair(familyCookie)}`)) === true);

const flowState = createSupabaseAuthFlowState({ intent: "google_oauth", locale: "pl", returnPath: "/pl/account", storage: { verifier: "abc" } });
const flowCookie = buildSupabaseAuthFlowCookie(flowState);
const flowRead = readSupabaseAuthFlowState(requestWithCookie(pair(flowCookie)));
check("auth_flow_roundtrip", flowRead?.nonce === flowState.nonce && flowRead.returnPath === "/pl/account");
check("auth_flow_duplicate_rejected", readSupabaseAuthFlowState(requestWithCookie(`${pair(flowCookie)}; ${pair(flowCookie)}`)) === null);

const maliciousRaw = `{"schemaVersion":"velmere.supabase-auth-flow.v1","nonce":"${"a".repeat(32)}","intent":"google_oauth","intent":"password_recovery","locale":"en","returnPath":"/en/account","storage":{},"issuedAt":${Math.floor(Date.now()/1000)},"expiresAt":${Math.floor(Date.now()/1000)+600}}`;
const maliciousBody = Buffer.from(maliciousRaw, "utf8").toString("base64url");
const maliciousSignature = createHmac("sha256", process.env.VELMERE_AUTH_FLOW_SECRET_CURRENT).update(maliciousBody, "utf8").digest("base64url");
const maliciousFlow = `velmere_supabase_flow=${encodeURIComponent(`${maliciousBody}.${maliciousSignature}`)}`;
check("signed_flow_duplicate_json_rejected", readSupabaseAuthFlowState(requestWithCookie(maliciousFlow)) === null);

const subjectId = randomUUID();
const recoveryFamilyId = randomUUID();
const recoveryCookie = buildPasswordRecoveryGrantCookie({ subjectId, familyId: recoveryFamilyId });
check("recovery_grant_roundtrip", verifyPasswordRecoveryGrant(requestWithCookie(pair(recoveryCookie)), { subjectId, familyId: recoveryFamilyId }) === true);
check("recovery_grant_duplicate_rejected", verifyPasswordRecoveryGrant(requestWithCookie(`${pair(recoveryCookie)}; ${pair(recoveryCookie)}`), { subjectId, familyId: recoveryFamilyId }) === false);

const supabaseCookies = buildSupabaseAuthCookieHeaders({ access_token: "header.payload.signature", refresh_token: "refresh-token-value", expires_in: 3600 });
const combinedSupabase = supabaseCookies.map(pair).join("; ");
check("supabase_access_roundtrip", readSupabaseAccessTokenCookie(requestWithCookie(combinedSupabase)) === "header.payload.signature");
check("supabase_refresh_roundtrip", readSupabaseRefreshTokenCookie(requestWithCookie(combinedSupabase)) === "refresh-token-value");
check("supabase_duplicate_access_rejected", readSupabaseAccessTokenCookie(requestWithCookie(`${pair(supabaseCookies[0])}; ${pair(supabaseCookies[0])}`)) === null);
expectThrow("supabase_nan_expiry_rejected", () => buildSupabaseAuthCookieHeaders({ access_token: "a", refresh_token: "b", expires_in: Number.NaN }), /supabase_session_expiry_invalid/u);
expectThrow("supabase_fractional_expiry_rejected", () => buildSupabaseAuthCookieHeaders({ access_token: "a", refresh_token: "b", expires_in: 3600.5 }), /supabase_session_expiry_invalid/u);

const root = process.cwd();
const coveredFiles = [
  "lib/auth/account-session.ts",
  "lib/auth/auth-session-family.ts",
  "lib/auth/password-recovery-grant.ts",
  "lib/auth/supabase-auth-flow-state.ts",
  "lib/auth/supabase-auth-cookies.ts",
];
for (const file of coveredFiles) {
  const text = fs.readFileSync(path.join(root, file), "utf8");
  check(`covered:${file}`, text.includes("cookie-session-boundary"));
  check(`no_manual_cookie_parse:${file}`, !text.includes('.split(";")') && !text.includes("decodeURIComponent(item.slice") && !text.includes("decodeURIComponent(raw.slice"));
  check(`no_signed_json_parse:${file}`, !/JSON\.parse\(Buffer\.from\([^\n]+base64url/u.test(text));
}
const productionText = coveredFiles.map((file) => fs.readFileSync(path.join(root, file), "utf8")).join("\n");
check("no_manual_set_cookie_serializers", !/HttpOnly; SameSite=/u.test(productionText) && !/Max-Age=\$\{/u.test(productionText));
check("central_profile_names_match_exports",
  SECURITY_COOKIE_PROFILES.account_session.name === "velmere_account_session"
  && SECURITY_COOKIE_PROFILES.supabase_access.name === "velmere_supabase_access"
  && SECURITY_COOKIE_PROFILES.supabase_refresh.name === "velmere_supabase_refresh"
  && SECURITY_COOKIE_PROFILES.auth_flow.name === "velmere_supabase_flow"
  && SECURITY_COOKIE_PROFILES.session_family.name === "velmere_auth_family"
  && SECURITY_COOKIE_PROFILES.password_recovery.name === "velmere_password_recovery_grant");

process.env.NODE_ENV = originalNodeEnv;
if (originalVercelEnv === undefined) delete process.env.VERCEL_ENV; else process.env.VERCEL_ENV = originalVercelEnv;

const failed = checks.filter((row) => !row.pass);
const receipt = {
  schemaVersion: "velmere.pass36.a73.cookie-session-boundary-test.v1",
  revisionId: REVISION,
  counts: { total: checks.length, passed: checks.length - failed.length, failed: failed.length },
  coveredProductionFiles: coveredFiles.length,
  profiles: Object.keys(SECURITY_COOKIE_PROFILES).length,
  checks,
};
console.log(JSON.stringify(receipt, null, 2));
if (failed.length) process.exit(1);
