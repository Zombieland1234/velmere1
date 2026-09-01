import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  getSecurityAdminGateSnapshot,
  verifySecurityAdminToken,
  verifySecurityApproverToken,
} from "../../lib/security/security-admin-auth";

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

async function main() {
  const names = [
    "NODE_ENV",
    "VERCEL_ENV",
    "VELMERE_SECURITY_ADMIN_ENABLED",
    "VELMERE_SECURITY_ADMIN_TOKEN",
    "VELMERE_SECURITY_ADMIN_TOKEN_SHA256",
    "VELMERE_SECURITY_ADMIN_SCOPES",
    "VELMERE_SECURITY_APPROVER_TOKEN",
    "VELMERE_SECURITY_APPROVER_TOKEN_SHA256",
  ] as const;
  const saved = Object.fromEntries(names.map((name) => [name, process.env[name]])) as Record<typeof names[number], string | undefined>;
  try {
    process.env.NODE_ENV = "production";
    delete process.env.VERCEL_ENV;
    process.env.VELMERE_SECURITY_ADMIN_ENABLED = "true";
    process.env.VELMERE_SECURITY_ADMIN_TOKEN = "plaintext-production-admin-token-forbidden";
    delete process.env.VELMERE_SECURITY_ADMIN_TOKEN_SHA256;
    process.env.VELMERE_SECURITY_ADMIN_SCOPES = "security:events";
    assert.notEqual(getSecurityAdminGateSnapshot(["security:events"]).status, "ready");

    const token = "pass6-production-admin-token-1234567890abcdef";
    delete process.env.VELMERE_SECURITY_ADMIN_TOKEN;
    process.env.VELMERE_SECURITY_ADMIN_TOKEN_SHA256 = digest(token);
    delete process.env.VELMERE_SECURITY_ADMIN_SCOPES;
    assert.notEqual(getSecurityAdminGateSnapshot(["security:events"]).status, "ready");

    process.env.VELMERE_SECURITY_ADMIN_SCOPES = "security:events";
    assert.equal(getSecurityAdminGateSnapshot(["security:events"]).status, "ready");
    const mutation = new Request("https://velmere.test/api/security/payment-runtime-evidence", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
    });
    const noMiddleware = verifySecurityAdminToken(mutation, ["security:events"]);
    assert.equal(noMiddleware.ok, false);
    if (!noMiddleware.ok) {
      const body = await noMiddleware.response.json() as { mode?: string };
      assert.equal(body.mode, "security_admin_mutation_assertion_middleware_required");
    }
    const deferred = verifySecurityAdminToken(mutation, ["security:events"], undefined, { deferBodyBoundMutationAssertion: true });
    assert.equal(deferred.ok, true);

    const read = verifySecurityAdminToken(new Request("https://velmere.test/api/security/events", {
      headers: { authorization: `Bearer ${token}` },
    }), ["security:events"]);
    assert.equal(read.ok, true);

    process.env.VELMERE_SECURITY_APPROVER_TOKEN = "plaintext-production-approver-token-forbidden";
    delete process.env.VELMERE_SECURITY_APPROVER_TOKEN_SHA256;
    const approver = verifySecurityApproverToken(new Request("https://velmere.test/api/admin/security/advanced-audit-release", {
      method: "PUT",
      headers: { "x-velmere-security-approver-token": process.env.VELMERE_SECURITY_APPROVER_TOKEN },
    }));
    assert.equal(approver.ok, false);
    if (!approver.ok) assert.equal(approver.response.status, 503);

    console.log(JSON.stringify({
      suite: "PASS6_ADMIN_IAM_FAIL_CLOSED",
      status: "PASS",
      assertions: 8,
      plaintextProductionCredentialRejected: true,
      scopesDenyByDefault: true,
      mutationMiddlewareMandatory: true,
      readTokenGateStillOperational: true,
    }, null, 2));
  } finally {
    for (const name of names) {
      const value = saved[name];
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
}

void main();
