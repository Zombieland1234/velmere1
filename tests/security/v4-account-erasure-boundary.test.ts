import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  accountErasureExecutionBlockers,
  buildAccountErasureRevocationReceipt,
  buildPublicAccountErasureMetadata,
  parseAccountErasureRecord,
  type AccountErasureRecord,
} from "../../lib/account/account-erasure";
import { BoundedSupabaseRpcError } from "../../lib/db/bounded-supabase-rpc";
import {
  handleAccountErasureGet,
  handleAccountErasurePost,
  type AccountErasureRouteDependencies,
} from "../../lib/server/lazy-route-modules/account--erasure";

const REQUEST_ID = "11111111-1111-4111-8111-111111111111";
const EXPORT_ID = "22222222-2222-4222-8222-222222222222";
const ACCOUNT_A = "supabase:11111111-1111-4111-8111-111111111111";
const ACCOUNT_B = "supabase:22222222-2222-4222-8222-222222222222";
const accountHash = (accountId: string) => createHash("sha256")
  .update(`velmere-account-binding-v1:${accountId}`, "utf8")
  .digest("hex");

function pending(overrides: Partial<AccountErasureRecord> = {}): AccountErasureRecord {
  return {
    schemaVersion: "velmere.account-erasure-request-record.v1",
    requestId: REQUEST_ID,
    accountId: ACCOUNT_A,
    accountIdHash: accountHash(ACCOUNT_A),
    idempotencyKeyHash: "a".repeat(64),
    exportId: EXPORT_ID,
    exportPayloadSha256: `sha256:${"b".repeat(64)}`,
    exportGeneratedAt: "2026-08-21T20:00:00.000Z",
    exportExpiresAt: "2026-08-22T20:00:00.000Z",
    state: "SESSION_REVOCATION_PENDING",
    sessionRevocationState: "PENDING",
    sessionRevocationReceiptSha256: null,
    executionPolicyState: "OWNER_LEGAL_POLICY_REQUIRED",
    requestedAt: "2026-08-21T20:01:00.000Z",
    sessionRevocationConfirmedAt: null,
    cancelledAt: null,
    updatedAt: "2026-08-21T20:01:00.000Z",
    ...overrides,
  };
}

function policyBlocked(overrides: Partial<AccountErasureRecord> = {}): AccountErasureRecord {
  return pending({
    state: "POLICY_BLOCKED",
    sessionRevocationState: "CONFIRMED",
    sessionRevocationReceiptSha256: `sha256:${"c".repeat(64)}`,
    sessionRevocationConfirmedAt: "2026-08-21T20:02:00.000Z",
    updatedAt: "2026-08-21T20:02:00.000Z",
    ...overrides,
  });
}

function cancelled(): AccountErasureRecord {
  return policyBlocked({
    state: "CANCELLED",
    cancelledAt: "2026-08-21T20:03:00.000Z",
    updatedAt: "2026-08-21T20:03:00.000Z",
  });
}

function rpcError(providerCode: string) {
  return new BoundedSupabaseRpcError({
    code: "rpc_failed",
    operation: "account_erasure_request",
    capability: "user_rls",
    providerCode,
  });
}

type Counters = { requested: number; cancelled: number; read: number; revoked: number; confirmed: number };
function dependencies(overrides: Partial<AccountErasureRouteDependencies> = {}) {
  const counters: Counters = { requested: 0, cancelled: 0, read: 0, revoked: 0, confirmed: 0 };
  let receipt = "";
  const boundary = { accountId: ACCOUNT_A, client: {} } as never;
  const deps: AccountErasureRouteDependencies = {
    resolveAccount: async () => ({
      accountId: ACCOUNT_A,
      displayName: "Owner A",
      handle: "@owner.a",
      email: "owner@example.test",
      provider: "email",
      sessionSource: "cookie",
    }),
    resolveBoundary: async () => boundary,
    applyRateLimit: async () => ({ ok: true } as const),
    requestErasure: async () => { counters.requested += 1; return pending(); },
    cancelErasure: async () => { counters.cancelled += 1; return cancelled(); },
    readErasure: async () => { counters.read += 1; return policyBlocked(); },
    revokeSessions: async () => {
      counters.revoked += 1;
      return { providerRevoked: true, localRevoked: true, reason: "revoked" };
    },
    confirmRevocation: async (input) => {
      counters.confirmed += 1;
      receipt = input.receiptSha256;
      return policyBlocked({ sessionRevocationReceiptSha256: input.receiptSha256 });
    },
    requestId: () => REQUEST_ID,
    ...overrides,
  };
  return { deps, counters, receipt: () => receipt };
}

function postRequest(body: unknown) {
  return new Request("https://velmere.test/api/account/erasure", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://velmere.test" },
    body: JSON.stringify(body),
  });
}

let assertions = 0;
function check(value: unknown, message: string) {
  assertions += 1;
  assert.ok(value, message);
}

async function main() {
  const parsedPending = parseAccountErasureRecord(pending());
  check(parsedPending.state === "SESSION_REVOCATION_PENDING", "a valid pending record must parse");
  assert.throws(() => parseAccountErasureRecord(pending({ accountIdHash: accountHash(ACCOUNT_B) })), /integrity/u);
  assertions += 1;
  assert.throws(() => parseAccountErasureRecord(pending({ state: "POLICY_BLOCKED" })), /revocation/u);
  assertions += 1;
  check(accountErasureExecutionBlockers(parsedPending)[0] === "SESSION_REVOCATION_REQUIRED", "pending revocation must block execution");
  check(accountErasureExecutionBlockers(policyBlocked()).includes("ERASURE_EXECUTOR_NOT_IMPLEMENTED"), "even confirmed sessions must remain executor-blocked");
  const publicMetadata = buildPublicAccountErasureMetadata(policyBlocked());
  check(publicMetadata.executionEligible === false && publicMetadata.dataDeleted === false && publicMetadata.legalDeletionClaimed === false, "public state must never imply deletion or legal completion");
  check(!("accountId" in publicMetadata), "public erasure metadata must not echo the account id");
  check(!("sessionRevocationReceiptSha256" in publicMetadata), "public erasure metadata must not disclose internal revocation receipts");
  const receipt = buildAccountErasureRevocationReceipt(pending(), { providerRevoked: true, localRevoked: true, reason: "revoked" });
  check(/^sha256:[a-f0-9]{64}$/.test(receipt), "complete server revocation must produce a bounded digest receipt");
  assert.throws(() => buildAccountErasureRevocationReceipt(pending(), { providerRevoked: false, localRevoked: true, reason: "provider_rejected" }), /incomplete/u);
  assertions += 1;

  const unauth = dependencies({ resolveAccount: async () => null });
  const unauthResponse = await handleAccountErasurePost(postRequest({
    action: "request",
    idempotencyKey: "account-erasure-request-0001",
    confirmation: "DELETE MY ACCOUNT",
  }), unauth.deps);
  check(unauthResponse.status === 401, "missing authenticated account must be rejected");
  check(unauth.counters.requested === 0 && unauth.counters.revoked === 0, "unauthenticated input must not reach storage or session revocation");

  const mismatch = dependencies({
    resolveBoundary: async () => ({ accountId: ACCOUNT_B, client: {} } as never),
  });
  const mismatchResponse = await handleAccountErasurePost(postRequest({
    action: "request",
    idempotencyKey: "account-erasure-request-0001",
    confirmation: "DELETE MY ACCOUNT",
  }), mismatch.deps);
  check(mismatchResponse.status === 403, "cookie/JWT account disagreement must fail closed");
  check(mismatch.counters.requested === 0 && mismatch.counters.revoked === 0, "account mismatch must stop before mutation");

  const invalid = dependencies();
  const massAssignment = await handleAccountErasurePost(postRequest({
    action: "request",
    idempotencyKey: "account-erasure-request-0001",
    confirmation: "DELETE MY ACCOUNT",
    accountId: ACCOUNT_B,
  }), invalid.deps);
  check(massAssignment.status === 400, "account id mass assignment must be rejected");
  check(invalid.counters.requested === 0 && invalid.counters.revoked === 0, "invalid body must have zero side effects");
  const weakConfirmation = await handleAccountErasurePost(postRequest({
    action: "request",
    idempotencyKey: "account-erasure-request-0001",
    confirmation: "yes",
  }), invalid.deps);
  check(weakConfirmation.status === 400, "exact destructive-intent confirmation must be required");

  const noExport = dependencies({ requestErasure: async () => { throw rpcError("VE001"); } });
  const noExportResponse = await handleAccountErasurePost(postRequest({
    action: "request",
    idempotencyKey: "account-erasure-request-0001",
    confirmation: "DELETE MY ACCOUNT",
  }), noExport.deps);
  const noExportBody = await noExportResponse.json() as Record<string, unknown>;
  check(noExportResponse.status === 409 && noExportBody.error === "account_export_required_before_erasure", "erasure request must require a current exact export first");
  check(noExport.counters.revoked === 0, "missing export must not revoke sessions");

  const staleAuth = dependencies({ requestErasure: async () => { throw rpcError("VE002"); } });
  const staleAuthResponse = await handleAccountErasurePost(postRequest({
    action: "request",
    idempotencyKey: "account-erasure-request-0001",
    confirmation: "DELETE MY ACCOUNT",
  }), staleAuth.deps);
  check(staleAuthResponse.status === 401, "high-risk request must require recent JWT authentication");
  check(staleAuth.counters.revoked === 0, "stale-auth rejection must have zero revocation side effects");

  const happy = dependencies();
  const happyResponse = await handleAccountErasurePost(postRequest({
    action: "request",
    idempotencyKey: "account-erasure-request-0001",
    confirmation: "DELETE MY ACCOUNT",
  }), happy.deps);
  const happyBody = await happyResponse.json() as Record<string, unknown>;
  check(happyResponse.status === 202, "complete technical request must be accepted, not represented as deleted");
  check(happy.counters.requested === 1 && happy.counters.revoked === 1 && happy.counters.confirmed === 1, "request, global revoke and service confirmation must each execute exactly once");
  check(/^sha256:[a-f0-9]{64}$/.test(happy.receipt()), "route must bind a sanitized revocation receipt");
  check(happyBody.status === "POLICY_BLOCKED" && happyBody.sessionRevocation === "CONFIRMED", "successful technical request must stop at policy blocker");
  check(happyBody.executionEligible === false && happyBody.dataDeleted === false && happyBody.legalDeletionClaimed === false, "202 must not claim data deletion or legal completion");
  check(!JSON.stringify(happyBody).includes(ACCOUNT_A), "public response must not expose internal account identity");
  const setCookie = happyResponse.headers.get("set-cookie") ?? "";
  check(setCookie.includes("Max-Age=0"), "accepted request must clear browser session cookies after global revocation");

  const partial = dependencies({
    revokeSessions: async () => ({ providerRevoked: false, localRevoked: true, reason: "provider_rejected" }),
  });
  const partialResponse = await handleAccountErasurePost(postRequest({
    action: "request",
    idempotencyKey: "account-erasure-request-0001",
    confirmation: "DELETE MY ACCOUNT",
  }), partial.deps);
  const partialBody = await partialResponse.json() as Record<string, unknown>;
  check(partialResponse.status === 503 && partialBody.status === "SESSION_REVOCATION_PENDING", "partial revocation must fail closed and preserve pending state");
  check(partial.counters.confirmed === 0, "partial revocation must never be service-confirmed");
  check(partialBody.dataDeleted === false, "partial revocation failure must not claim deletion");

  const uncertain = dependencies({ revokeSessions: async () => { throw new Error("revocation_transition_uncertain"); } });
  const uncertainResponse = await handleAccountErasurePost(postRequest({
    action: "request",
    idempotencyKey: "account-erasure-request-0001",
    confirmation: "DELETE MY ACCOUNT",
  }), uncertain.deps);
  check(uncertainResponse.status === 503, "uncertain revocation transition must remain retryable and blocked");
  check((uncertainResponse.headers.get("set-cookie") ?? "").includes("Max-Age=0"), "uncertain partial revocation must clear browser credentials fail closed");
  check(uncertain.counters.confirmed === 0, "uncertain revocation must never be service-confirmed");

  const confirmFailure = dependencies({ confirmRevocation: async () => { throw new Error("service_role_unavailable"); } });
  const confirmFailureResponse = await handleAccountErasurePost(postRequest({
    action: "request",
    idempotencyKey: "account-erasure-request-0001",
    confirmation: "DELETE MY ACCOUNT",
  }), confirmFailure.deps);
  check(confirmFailureResponse.status === 503, "missing service-role confirmation must keep erasure blocked");
  check((confirmFailureResponse.headers.get("set-cookie") ?? "").includes("Max-Age=0"), "already-revoked sessions must still be cleared when confirmation storage fails");

  const status = dependencies();
  const statusResponse = await handleAccountErasureGet(new Request("https://velmere.test/api/account/erasure"), status.deps);
  const statusBody = await statusResponse.json() as Record<string, unknown>;
  check(statusResponse.status === 200 && statusBody.status === "POLICY_BLOCKED", "owner must be able to read latest request status");
  check(status.counters.read === 1, "status must perform one owner-scoped read");
  const missing = dependencies({ readErasure: async () => null });
  const missingResponse = await handleAccountErasureGet(new Request(`https://velmere.test/api/account/erasure?id=${REQUEST_ID}`), missing.deps);
  check(missingResponse.status === 404, "missing and cross-account RLS rows must be non-enumerable");
  const badId = await handleAccountErasureGet(new Request("https://velmere.test/api/account/erasure?id=../../victim"), status.deps);
  check(badId.status === 400, "invalid request ids must fail before storage");

  const cancel = dependencies();
  const cancelResponse = await handleAccountErasurePost(postRequest({
    action: "cancel",
    requestId: REQUEST_ID,
    confirmation: "CANCEL ACCOUNT DELETION",
  }), cancel.deps);
  const cancelBody = await cancelResponse.json() as Record<string, unknown>;
  check(cancelResponse.status === 200 && cancelBody.status === "CANCELLED", "owner must be able to cancel a non-executing request");
  check(cancel.counters.cancelled === 1 && cancel.counters.revoked === 0, "cancellation must not invoke session revocation");
  check(cancelBody.dataDeleted === false && cancelBody.executionEligible === false, "cancelled request must remain non-destructive");

  const migration = fs.readFileSync(path.join(process.cwd(), "supabase/migrations/20260821000006_v4_account_erasure_request_policy_gate.sql"), "utf8");
  const route = fs.readFileSync(path.join(process.cwd(), "lib/server/lazy-route-modules/account--erasure.ts"), "utf8");
  const rpcRegistry = fs.readFileSync(path.join(process.cwd(), "lib/db/supabase-rpc-operation-registry.ts"), "utf8");
  const panel = fs.readFileSync(path.join(process.cwd(), "components/account/AccountErasurePanel.tsx"), "utf8");
  const dashboard = fs.readFileSync(path.join(process.cwd(), "components/dashboard/DashboardClient.tsx"), "utf8");
  check(migration.includes("velmere_account_erasure_requests"), "migration must create durable owner request state");
  check(migration.includes("auth.jwt()->>'auth_time'"), "database must enforce recent JWT authentication");
  check(migration.includes("velmere_account_data_exports"), "database must bind a current exact export before request creation");
  check(migration.includes("to service_role") && migration.includes("velmere_confirm_account_erasure_session_revocation_v1"), "only service role may confirm server session revocation");
  check(migration.includes("execution_policy_state = 'OWNER_LEGAL_POLICY_REQUIRED'"), "all request states must remain policy blocked");
  check(!migration.includes("velmere_execute_account_erasure"), "migration must not create an unapproved destructive executor");
  check(!/delete\s+from\s+public\./iu.test(migration), "technical request migration must not delete product/customer data");
  check(route.includes("revokeSupabaseCookieSession"), "request route must invoke global provider/local session revocation");
  check(route.includes("buildClearedSupabaseAuthCookieHeaders"), "request route must clear local auth material");
  check(rpcRegistry.includes('account_erasure_session_revocation_confirm: { rpcName: "velmere_confirm_account_erasure_session_revocation_v1"'), "service confirmation must use the bounded auth RPC registry");
  check(panel.includes("No data deletion") && panel.includes("żadne dane nie są usuwane") && panel.includes("keine Daten gelöscht"), "PL/EN/DE UI must state the non-deletion truth boundary");
  check(panel.includes('credentials: "same-origin"'), "customer erasure UI must use same-origin credentials only");
  check(dashboard.includes("<AccountErasurePanel />"), "real account security surface must expose request/status/cancel workflow");

  console.log(`V4 account erasure boundary: PASS (${assertions}/${assertions})`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
