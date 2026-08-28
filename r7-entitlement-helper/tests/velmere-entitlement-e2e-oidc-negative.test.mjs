import assert from "node:assert/strict";
import { verifyGithubOidc, GITHUB_OIDC_POLICY } from "../../supabase/functions/velmere-entitlement-e2e-oidc/oidc.ts";

const now = 1_800_000_000;
const encoder = new TextEncoder();
const keyPair = await crypto.subtle.generateKey(
  {
    name: "RSASSA-PKCS1-v1_5",
    modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: "SHA-256",
  },
  true,
  ["sign", "verify"],
);
const exportedJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
const jwk = { ...exportedJwk, alg: "RS256", kid: "velmere-test-key", key_ops: ["verify"], use: "sig" };

function base64Url(value) {
  const bytes = typeof value === "string" ? encoder.encode(value) : new Uint8Array(value);
  return Buffer.from(bytes).toString("base64url");
}

const baseClaims = Object.freeze({
  actor: GITHUB_OIDC_POLICY.actor,
  actor_id: GITHUB_OIDC_POLICY.actorId,
  aud: GITHUB_OIDC_POLICY.audience,
  event_name: "workflow_dispatch",
  exp: now + 300,
  iat: now - 5,
  iss: "https://token.actions.githubusercontent.com",
  jti: "1c4ec948-76c4-4a5d-b362-fc72bd20bc3f",
  nbf: now - 305,
  ref: `refs/heads/${GITHUB_OIDC_POLICY.branch}`,
  ref_protected: "false",
  ref_type: "branch",
  repository: GITHUB_OIDC_POLICY.repository,
  repository_id: GITHUB_OIDC_POLICY.repositoryId,
  repository_owner: GITHUB_OIDC_POLICY.repositoryOwner,
  repository_owner_id: GITHUB_OIDC_POLICY.repositoryOwnerId,
  run_attempt: "1",
  run_id: "33049743960",
  run_number: "17",
  runner_environment: "github-hosted",
  sha: "a".repeat(40),
  sub: GITHUB_OIDC_POLICY.subject,
  workflow: GITHUB_OIDC_POLICY.workflow,
  workflow_ref: GITHUB_OIDC_POLICY.workflowRef,
  workflow_sha: "a".repeat(40),
});

async function sign(claims = baseClaims, header = { alg: "RS256", kid: jwk.kid, typ: "JWT" }) {
  const head = base64Url(JSON.stringify(header));
  const payload = base64Url(JSON.stringify(claims));
  const signed = `${head}.${payload}`;
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", keyPair.privateKey, encoder.encode(signed));
  return `${signed}.${base64Url(signature)}`;
}

const fetchImpl = async (url, init) => {
  assert.equal(String(url), "https://token.actions.githubusercontent.com/.well-known/jwks");
  assert.equal(init.redirect, "error");
  return new Response(JSON.stringify({ keys: [jwk] }), { status: 200, headers: { "content-type": "application/json" } });
};

async function expectError(name, token, expected, options = {}) {
  await assert.rejects(
    verifyGithubOidc(token, { fetchImpl, nowSeconds: now, ...options }),
    (error) => error instanceof Error && error.message === expected,
    name,
  );
}

const verified = await verifyGithubOidc(await sign(), { fetchImpl, nowSeconds: now });
assert.equal(verified.runId, baseClaims.run_id);
assert.equal(verified.runAttempt, 1);
assert.equal(verified.headSha, baseClaims.sha);
assert.equal(verified.issuedAt, baseClaims.iat);
assert.equal(verified.expiresAt, baseClaims.exp);
const { ref_protected: _omittedRefProtected, ...claimsWithoutRefProtected } = baseClaims;
await verifyGithubOidc(await sign(claimsWithoutRefProtected), { fetchImpl, nowSeconds: now });

const claimCases = [
  ["issuer", { iss: "https://attacker.invalid" }, "oidc_authority_invalid"],
  ["audience", { aud: "velmere-near-match" }, "oidc_authority_invalid"],
  ["audience-array", { aud: [GITHUB_OIDC_POLICY.audience] }, "oidc_authority_invalid"],
  ["repository", { repository: "Zombieland1234/velmere11" }, "oidc_identity_invalid"],
  ["repository-id", { repository_id: "1269597732" }, "oidc_identity_invalid"],
  ["owner", { repository_owner: "Zombieland12345" }, "oidc_identity_invalid"],
  ["owner-id", { repository_owner_id: "213797396" }, "oidc_identity_invalid"],
  ["actor", { actor: "github-actions[bot]" }, "oidc_identity_invalid"],
  ["actor-id", { actor_id: "41898282" }, "oidc_identity_invalid"],
  ["branch", { ref: "refs/heads/main" }, "oidc_identity_invalid"],
  ["ref-type", { ref_type: "tag" }, "oidc_identity_invalid"],
  ["ref-protected-string", { ref_protected: "true" }, "oidc_identity_invalid"],
  ["ref-protected-boolean", { ref_protected: true }, "oidc_identity_invalid"],
  ["subject", { sub: `repo:${GITHUB_OIDC_POLICY.repository}:pull_request` }, "oidc_identity_invalid"],
  ["immutable-subject-not-enabled", { sub: `repo:${GITHUB_OIDC_POLICY.repositoryOwner}@${GITHUB_OIDC_POLICY.repositoryOwnerId}/velmere1@${GITHUB_OIDC_POLICY.repositoryId}:ref:refs/heads/${GITHUB_OIDC_POLICY.branch}` }, "oidc_identity_invalid"],
  ["workflow", { workflow: `${GITHUB_OIDC_POLICY.workflow} Candidate` }, "oidc_identity_invalid"],
  ["workflow-ref-substring", { workflow_ref: `${GITHUB_OIDC_POLICY.workflowRef}-attacker` }, "oidc_identity_invalid"],
  ["workflow-ref-other-branch", { workflow_ref: GITHUB_OIDC_POLICY.workflowRef.replace(GITHUB_OIDC_POLICY.branch, "main") }, "oidc_identity_invalid"],
  ["runner", { runner_environment: "self-hosted" }, "oidc_identity_invalid"],
  ["event", { event_name: "pull_request" }, "oidc_identity_invalid"],
  ["expired", { exp: now - 16 }, "oidc_claim_time_invalid"],
  ["stale", { iat: now - 601, nbf: now - 901 }, "oidc_claim_time_invalid"],
  ["nbf-before-github-window", { nbf: now - 606 }, "oidc_claim_time_invalid"],
  ["future-iat", { iat: now + 31, nbf: now }, "oidc_claim_time_invalid"],
  ["future-nbf", { nbf: now + 31 }, "oidc_claim_time_invalid"],
  ["excess-lifetime", { exp: now + 700 }, "oidc_claim_time_invalid"],
  ["run-id", { run_id: "33049743960x" }, "oidc_run_invalid"],
  ["run-id-number-type", { run_id: 33049743960 }, "oidc_run_invalid"],
  ["run-attempt", { run_attempt: "0" }, "oidc_run_attempt_invalid"],
  ["run-attempt-number-type", { run_attempt: 1 }, "oidc_run_attempt_invalid"],
  ["run-number", { run_number: "0" }, "oidc_run_number_invalid"],
  ["run-number-number-type", { run_number: 17 }, "oidc_run_number_invalid"],
  ["sha", { sha: "A".repeat(40) }, "oidc_run_invalid"],
  ["workflow-sha", { workflow_sha: "b".repeat(40) }, "oidc_run_invalid"],
  ["jti", { jti: "bad id" }, "oidc_run_invalid"],
];

for (const [name, patch, expected] of claimCases) {
  await expectError(name, await sign({ ...baseClaims, ...patch }), expected);
}

await expectError("wrong-alg", await sign(baseClaims, { alg: "HS256", kid: jwk.kid, typ: "JWT" }), "oidc_header_invalid");
await expectError("unknown-kid", await sign(baseClaims, { alg: "RS256", kid: "unknown", typ: "JWT" }), "oidc_kid_unknown");
const validToken = await sign();
const validSegments = validToken.split(".");
const tamperedSignature = Buffer.from(validSegments[2], "base64url");
tamperedSignature[0] ^= 1;
const tampered = `${validSegments[0]}.${validSegments[1]}.${tamperedSignature.toString("base64url")}`;
await expectError("tampered-signature", tampered, "oidc_signature_invalid");
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const lastSignatureIndex = alphabet.indexOf(validSegments[2].at(-1));
const noncanonicalLast = alphabet[lastSignatureIndex ^ 1];
const noncanonical = `${validSegments[0]}.${validSegments[1]}.${validSegments[2].slice(0, -1)}${noncanonicalLast}`;
await expectError("noncanonical-signature", noncanonical, "oidc_segment_invalid");
await expectError(
  "jwks-unavailable",
  validToken,
  "oidc_jwks_unavailable",
  { fetchImpl: async () => new Response("unavailable", { status: 503 }) },
);
await expectError(
  "jwks-rate-limited",
  validToken,
  "oidc_jwks_unavailable",
  { fetchImpl: async () => new Response("rate limited", { status: 429 }) },
);
await expectError(
  "jwks-redirect-denied",
  validToken,
  "oidc_jwks_unavailable",
  {
    fetchImpl: async () => new Response("redirect", {
      status: 302,
      headers: { location: "https://attacker.invalid/jwks" },
    }),
  },
);
await expectError(
  "jwks-network-failure",
  validToken,
  "oidc_jwks_unavailable",
  { fetchImpl: async () => { throw new Error("network failure"); } },
);
await expectError(
  "jwks-malformed",
  validToken,
  "oidc_jwks_invalid",
  { fetchImpl: async () => new Response("not-json", { status: 200, headers: { "content-type": "application/json" } }) },
);
await expectError(
  "jwks-wrong-content-type",
  validToken,
  "oidc_jwks_invalid",
  { fetchImpl: async () => new Response(JSON.stringify({ keys: [jwk] }), { status: 200, headers: { "content-type": "text/plain" } }) },
);
await expectError(
  "jwks-declared-oversize",
  validToken,
  "oidc_jwks_invalid",
  { fetchImpl: async () => new Response(JSON.stringify({ keys: [jwk] }), { status: 200, headers: { "content-type": "application/json", "content-length": "65537" } }) },
);
await expectError(
  "jwks-streamed-oversize",
  validToken,
  "oidc_jwks_invalid",
  { fetchImpl: async () => new Response(JSON.stringify({ keys: [jwk], padding: "x".repeat(66_000) }), { status: 200, headers: { "content-type": "application/json" } }) },
);
await expectError(
  "jwks-invalid-utf8",
  validToken,
  "oidc_jwks_invalid",
  { fetchImpl: async () => new Response(new Uint8Array([0xff]), { status: 200, headers: { "content-type": "application/json" } }) },
);
await expectError(
  "jwks-too-many-keys",
  validToken,
  "oidc_jwks_invalid",
  { fetchImpl: async () => new Response(JSON.stringify({ keys: Array.from({ length: 17 }, (_, index) => ({ ...jwk, kid: `key-${index}` })) }), { status: 200, headers: { "content-type": "application/json" } }) },
);
await expectError(
  "jwks-duplicate-kid",
  validToken,
  "oidc_jwk_invalid",
  { fetchImpl: async () => new Response(JSON.stringify({ keys: [jwk, { ...jwk }] }), { status: 200, headers: { "content-type": "application/json" } }) },
);
await expectError(
  "jwk-wrong-key-type",
  validToken,
  "oidc_jwk_invalid",
  { fetchImpl: async () => new Response(JSON.stringify({ keys: [{ ...jwk, kty: "EC" }] }), { status: 200, headers: { "content-type": "application/json" } }) },
);
await expectError("shape", "not-a-jwt", "oidc_shape_invalid");

console.log(`Shared entitlement exact OIDC negatives: PASS (${claimCases.length + 18} negative cases)`);
