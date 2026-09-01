import assert from "node:assert/strict";
import {
  issueSecurityOperatorAssertion,
  verifyAndConsumeSecurityOperatorAssertion,
  verifySecurityOperatorAssertion,
} from "../../lib/security/security-operator-assertion";

async function main() {
  const saved = {
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
    durableRequired: process.env.VELMERE_DURABLE_IDEMPOTENCY_REQUIRED,
    failClosed: process.env.VELMERE_IDEMPOTENCY_FAIL_CLOSED,
    upstashUrl: process.env.UPSTASH_REDIS_REST_URL,
    upstashToken: process.env.UPSTASH_REDIS_REST_TOKEN,
    supabaseUrl: process.env.SUPABASE_URL,
    publicSupabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceRole: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
  const restore = (name: string, value: string | undefined) => {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  };
  try {
    process.env.NODE_ENV = "test";
    delete process.env.VERCEL_ENV;
    delete process.env.VELMERE_DURABLE_IDEMPOTENCY_REQUIRED;
    delete process.env.VELMERE_IDEMPOTENCY_FAIL_CLOSED;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const secret = "pass6-operator-assertion-body-replay-secret-1234567890";
    const body = { action: "approve", caseRef: "AUD-PASS6", version: 2 };
    const signed = issueSecurityOperatorAssertion({
      secret,
      operatorId: "operator-pass6-primary",
      role: "primary_reviewer",
      scopes: ["security:events", "security:export"],
      mfa: "webauthn",
      request: { method: "POST", path: "/api/admin/security/advanced-audit-release", body },
      nonce: "nonce-pass6-body-bound-0001",
      issuedAt: "2026-07-18T12:00:00.000Z",
      expiresInSeconds: 300,
    });
    const request = new Request("https://velmere.test/api/admin/security/advanced-audit-release", {
      method: "POST",
      headers: {
        "x-velmere-security-operator-assertion": signed.assertion,
        "x-velmere-security-operator-signature": signed.signature,
      },
    });
    const verifyArgs = {
      request,
      secret,
      requiredRole: "primary_reviewer" as const,
      requiredScopes: ["security:events", "security:export"],
      requirePhishingResistantMfa: true,
      requestBody: body,
      now: "2026-07-18T12:00:30.000Z",
    };
    const valid = verifySecurityOperatorAssertion(verifyArgs);
    assert.equal(valid.ok, true);

    const changedBody = verifySecurityOperatorAssertion({ ...verifyArgs, requestBody: { ...body, action: "revoke" } });
    assert.equal(changedBody.ok, false);
    if (!changedBody.ok) assert.equal(changedBody.error, "operator_assertion_body_binding_mismatch");

    const missingBody = verifySecurityOperatorAssertion({
      request,
      secret,
      requiredRole: "primary_reviewer",
      requiredScopes: ["security:events", "security:export"],
      now: "2026-07-18T12:00:30.000Z",
    });
    assert.equal(missingBody.ok, false);
    if (!missingBody.ok) assert.equal(missingBody.error, "operator_assertion_body_digest_required");

    const first = await verifyAndConsumeSecurityOperatorAssertion(verifyArgs);
    assert.equal(first.ok, true);
    if (first.ok) assert.equal(first.replayProtection.storageMode, "memory_runtime_only");
    const replay = await verifyAndConsumeSecurityOperatorAssertion(verifyArgs);
    assert.equal(replay.ok, false);
    if (!replay.ok) assert.equal(replay.error, "operator_assertion_nonce_replayed");

    process.env.NODE_ENV = "production";
    const productionBody = { action: "release", caseRef: "AUD-PASS6-PROD" };
    const productionSigned = issueSecurityOperatorAssertion({
      secret,
      operatorId: "operator-pass6-production",
      role: "security_admin",
      scopes: ["security:events"],
      mfa: "webauthn",
      request: { method: "PATCH", path: "/api/admin/security/advanced-audit-release", body: productionBody },
      nonce: "nonce-pass6-production-0002",
      issuedAt: "2026-07-18T12:00:00.000Z",
    });
    const productionRequest = new Request("https://velmere.test/api/admin/security/advanced-audit-release", {
      method: "PATCH",
      headers: {
        "x-velmere-security-operator-assertion": productionSigned.assertion,
        "x-velmere-security-operator-signature": productionSigned.signature,
      },
    });
    const production = await verifyAndConsumeSecurityOperatorAssertion({
      request: productionRequest,
      secret,
      requiredRole: "security_admin",
      requiredScopes: ["security:events"],
      requirePhishingResistantMfa: true,
      requestBody: productionBody,
      now: "2026-07-18T12:00:30.000Z",
    });
    assert.equal(production.ok, false);
    if (!production.ok) assert.equal(production.error, "operator_assertion_nonce_store_unavailable");

    console.log(JSON.stringify({
      suite: "PASS6_OPERATOR_ASSERTION_BODY_REPLAY",
      status: "PASS",
      assertions: 10,
      bodyMutationBlocked: true,
      duplicateNonceBlocked: true,
      productionNoDurableStoreBlocked: true,
    }, null, 2));
  } finally {
    restore("NODE_ENV", saved.nodeEnv);
    restore("VERCEL_ENV", saved.vercelEnv);
    restore("VELMERE_DURABLE_IDEMPOTENCY_REQUIRED", saved.durableRequired);
    restore("VELMERE_IDEMPOTENCY_FAIL_CLOSED", saved.failClosed);
    restore("UPSTASH_REDIS_REST_URL", saved.upstashUrl);
    restore("UPSTASH_REDIS_REST_TOKEN", saved.upstashToken);
    restore("SUPABASE_URL", saved.supabaseUrl);
    restore("NEXT_PUBLIC_SUPABASE_URL", saved.publicSupabaseUrl);
    restore("SUPABASE_SERVICE_ROLE_KEY", saved.serviceRole);
  }
}

void main();
