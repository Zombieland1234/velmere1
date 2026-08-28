import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const workflow = await readFile(".github/workflows/velmere-shared-entitlement-e2e.yml", "utf8");
const handler = await readFile("supabase/functions/velmere-entitlement-e2e-oidc/index.ts", "utf8");
const verifier = await readFile("supabase/functions/velmere-entitlement-e2e-oidc/oidc.ts", "utf8");
const sql = await readFile("r7-entitlement-helper/sql/shared-entitlement-helper-prerequisites-v1.sql", "utf8");
const denoConfig = await readFile("supabase/functions/velmere-entitlement-e2e-oidc/deno.json", "utf8");
const oidcNegatives = await readFile("r7-entitlement-helper/tests/velmere-entitlement-e2e-oidc-negative.test.mjs", "utf8");
const sourceContract = await readFile("r7-entitlement-helper/tests/velmere-entitlement-source-contract.test.mjs", "utf8");
const packet = await readFile("r7-entitlement-helper/DEPLOYMENT_AND_VERIFICATION_PACKET.md", "utf8");

assert.match(workflow, /permissions:\s*\n\s+contents: read\s*\n\s+id-token: write/u);
assert.doesNotMatch(workflow, /SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEYS|secrets\./u);
assert.doesNotMatch(workflow, /entitlementServerCapability/u);
assert.match(workflow, /persist-credentials: false/u);
assert.match(workflow, /missing_capability_not_denied/u);
assert.match(workflow, /cross_account_pro_not_denied/u);
assert.match(workflow, /cross_account_advanced_not_denied/u);
assert.match(workflow, /advanced_grant_active_replay_not_idempotent/u);
assert.match(workflow, /revoked_advanced_replay_not_denied/u);
assert.match(workflow, /sessionReconnectVerified=\$true/u);
assert.match(workflow, /cleanupVerified=\$true/u);
assert.match(workflow, /\$Cleanup=PostHelper/u);
assert.match(workflow, /cleanupUsesFreshOidcAuthorization=\$true/u);
assert.match(workflow, /authUsersAndBindingsCleanupVerified=\$true/u);
assert.match(workflow, /oidc_jti_same_body_replay_not_denied/u);
assert.match(workflow, /oidc_jti_different_body_replay_not_denied/u);
assert.match(workflow, /oidcJtiSingleConsumption=\$true/u);
assert.match(workflow, /oidcRequestBodyBound=\$true/u);
assert.match(workflow, /automaticRedirectsAllowed=\$false/u);
assert.match(workflow, /denoConfigSha256=\$DenoConfigSha/u);
assert.match(workflow, /steps\.upload\.outputs\.artifact-digest/u);
assert.match(workflow, /entitlement_artifact_digest_missing/u);
assert.equal((workflow.match(/MaximumRedirection 0/gu) ?? []).length, 2);
assert.match(workflow, /DnsSafeHost\.EndsWith\('\.actions\.githubusercontent\.com'/u);
assert.match(workflow, /customerFinalCredit=\$false/u);
assert.match(workflow, /paidValueFinalCredit=\$false/u);
assert.ok(workflow.indexOf("entitlement_cleanup_not_verified") < workflow.indexOf("VELMERE_SHARED_ENTITLEMENT_E2E.json"));
assert.doesNotMatch(workflow, /\.Body\.reason/u, "live bridge does not return a reason field");

assert.match(handler, /Deno\.env\.get\("SUPABASE_SERVICE_ROLE_KEY"\)/u);
assert.doesNotMatch(handler, /console\.(?:log|error|warn)/u);
assert.match(handler, /velmere_current_active_session_account_id/u);
assert.match(handler, /old_session_still_active_/u);
assert.match(handler, /serverCapabilityReturned: false/g);
assert.match(handler, /velmere_r7_grant_browser_advanced_preserving_pro_test_v1/u);
assert.match(handler, /velmere_r7_verify_browser_test_entitlement_cleanup_v1/u);
assert.match(handler, /metadata\.r7_oidc_jti_sha256/u);
assert.match(handler, /metadata\.r7_head_sha/u);
assert.doesNotMatch(handler, /metadata\.r7_oidc_jti\s/u);
assert.match(handler, /velmere_r7_consume_shared_entitlement_oidc_jti_v1/u);
assert.match(handler, /velmere_r7_verify_shared_entitlement_user_cleanup_v1/u);
assert.match(handler, /requestSha256 = await sha256Hex\(parsedBody\.raw\)/u);
assert.match(handler, /tokenIdSha256 = await sha256Hex\(verified\.tokenId\)/u);
assert.match(handler, /error: "oidc_jti_replayed"/u);
assert.match(handler, /const EXPECTED_SUPABASE_URL = "https:\/\/yljjyowcvjgjcamffnvd\.supabase\.co"/u);
assert.match(handler, /redirect: "error"/u);
assert.match(handler, /const noRedirectFetch: typeof fetch/u);
assert.equal((handler.match(/fetch: noRedirectFetch/gu) ?? []).length, 6);
assert.match(handler, /readBodyTextBounded\(request, 8_192, "invalid_body", "request_too_large"\)/u);
assert.match(handler, /readBodyTextBounded\(bridgeResponse, 65_536, "bridge_response_too_large"\)/u);
assert.match(handler, /bridgeContentType\.includes\("application\/json"\)/u);
assert.match(handler, /await reader\.cancel\(sizeErrorCode\)/u);
assert.match(handler, /serviceRoleReturned: false/g);
assert.match(handler, /paidValueFinalCredit: false/g);
assert.doesNotMatch(handler, /partialUsersCleaned: true/u);
assert.match(handler, /partialCleanupVerified: entitlementCleanupSucceeded/u);
assert.match(handler, /&& identityCleanupSucceeded/u);

assert.match(verifier, /claims\.workflow_ref === GITHUB_OIDC_POLICY\.workflowRef/u);
assert.doesNotMatch(verifier, /workflow_ref[^\n]*\.includes/u);
assert.match(verifier, /workflowSha !== headSha/u);
assert.match(verifier, /expiresAt - issuedAt > 600/u);
assert.match(verifier, /claims\.sub === GITHUB_OIDC_POLICY\.subject/u);
assert.match(verifier, /repo:Zombieland1234\/velmere1:ref:refs\/heads\/velmere-r7-successor-delta-20260825/u);
assert.match(verifier, /positiveDecimalStringClaim\(claims, "run_attempt"\)/u);
assert.match(verifier, /positiveDecimalStringClaim\(claims, "run_number"\)/u);
assert.match(verifier, /redirect: "error"/u);
assert.match(verifier, /claims\.runner_environment === GITHUB_OIDC_POLICY\.runnerEnvironment/u);
assert.match(verifier, /claims\.ref_protected === undefined/u);
assert.match(verifier, /claims\.ref_protected === GITHUB_OIDC_POLICY\.refProtected/u);
assert.match(verifier, /const MAX_JWKS_BYTES = 65_536/u);
assert.match(verifier, /const MAX_JWKS_KEYS = 16/u);
assert.match(verifier, /readResponseTextBounded\(jwksResponse, MAX_JWKS_BYTES\)/u);
assert.match(verifier, /matchingKeys\.length !== 1/u);
assert.match(verifier, /reader\.cancel\("oidc_jwks_too_large"\)/u);

assert.match(sql, /security definer/giu);
assert.equal((sql.match(/set search_path = ''/gu) ?? []).length, 4);
assert.match(sql, /^begin;/mu);
assert.match(sql, /set local lock_timeout = '5s'/u);
assert.match(sql, /set local statement_timeout = '60s'/u);
assert.match(sql, /r7_entitlement_helper_target_already_exists/u);
assert.match(sql, /r7_entitlement_helper_function_postflight_failed/u);
assert.match(sql, /owner to postgres/gu);
assert.match(sql, /v_function\.proconfig is distinct from array\['search_path=""'\]::text\[\]/u);
assert.match(sql, /commit;\s*$/u);
assert.match(sql, /tier = 'pro'/u);
assert.match(sql, /tier = 'advanced'/u);
assert.match(sql, /IDEMPOTENT_ACTIVE/u);
assert.match(sql, /r7_browser_advanced_regrant_after_revocation_denied/u);
assert.match(sql, /r7_entitlement_oidc_jti_consumptions/u);
assert.match(sql, /on conflict \(jti_sha256\) do nothing/u);
assert.match(sql, /request_sha256/u);
assert.match(sql, /force row level security/u);
assert.match(sql, /usersAbsent/u);
assert.match(sql, /bindingsAbsent/u);
assert.equal((sql.match(/request\.jwt\.claims/gu) ?? []).length, 4);
assert.doesNotMatch(
  sql.slice(
    sql.indexOf("velmere_r7_grant_browser_advanced_preserving_pro_test_v1"),
    sql.indexOf("velmere_r7_verify_browser_test_entitlement_cleanup_v1"),
  ),
  /update\s+velmere_private\.r7_browser_paid_entitlements/iu,
  "Advanced grant must not revoke or overwrite the independent Pro row",
);
assert.equal((sql.match(/revoke all on function/gu) ?? []).length, 4);
assert.equal((sql.match(/grant execute on function/gu) ?? []).length, 4);
assert.doesNotMatch(sql, /customer_final|paid_value_final/iu);
assert.doesNotMatch(sql, /finaliz/iu);

for (const [path, content] of [
  [".github/workflows/velmere-shared-entitlement-e2e.yml", workflow],
  ["supabase/functions/velmere-entitlement-e2e-oidc/index.ts", handler],
  ["supabase/functions/velmere-entitlement-e2e-oidc/oidc.ts", verifier],
  ["supabase/functions/velmere-entitlement-e2e-oidc/deno.json", denoConfig],
  ["r7-entitlement-helper/sql/shared-entitlement-helper-prerequisites-v1.sql", sql],
  ["r7-entitlement-helper/tests/velmere-entitlement-e2e-oidc-negative.test.mjs", oidcNegatives],
  ["r7-entitlement-helper/tests/velmere-entitlement-source-contract.test.mjs", sourceContract],
]) {
  const digest = createHash("sha256").update(content).digest("hex");
  assert.ok(packet.includes(`| \`${path}\` | \`${digest}\` |`), `deployment packet pin mismatch: ${path}`);
}

console.log("Shared entitlement source/security contract: PASS");
