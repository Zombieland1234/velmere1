import assert from "node:assert/strict";

import { publishCompletedAuditToPrivateVerify } from "@/lib/server/audit-verify-initial-publication-bridge";

const publicProofId = `pubidx-${"a".repeat(48)}`;
const eventDigest = "b".repeat(64);
const snapshotDigest = `sha256:${"c".repeat(64)}`;
const artifactBindingDigest = "d".repeat(64);
const validReceipt = {
  schemaVersion: "velmere.audit-verify-initial-producer-receipt.v1",
  ok: true,
  verifyActive: true,
  publiclyVisible: false,
  publicProofId,
  visibility: "PRIVATE",
  currentStatus: "VERIFIED",
  eventDigest,
  reportId: "AUD-CASE-BASIC-01-basic-v1",
  snapshotDigest,
  artifactBindingDigest,
  idempotent: false,
  reason: null,
  truthBoundary: "Trusted current-source bridge only; no staging, deployment, uptime, customer, FINAL, GO_PAID or LIVE credit.",
} as const;

async function main() {
  const calls: Array<Record<string, unknown>> = [];
  const active = await publishCompletedAuditToPrivateVerify("AUD-CASE-BASIC-01", {
    rpc: (async (input: Record<string, unknown>) => {
      calls.push(input);
      return { data: validReceipt } as never;
    }) as never,
  });
  assert.equal(active.status, "ACTIVE_PRIVATE");
  assert.equal(active.publicProofId, publicProofId);
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.operation, "audit_verify_initial_publish");
  assert.deepEqual(calls[0]?.args, {
    p_case_ref: "AUD-CASE-BASIC-01",
    p_requested_visibility: "PRIVATE",
  });

  const idempotent = await publishCompletedAuditToPrivateVerify("AUD-CASE-BASIC-01", {
    rpc: (async () => ({ data: [{ ...validReceipt, idempotent: true }] })) as never,
  });
  assert.equal(idempotent.status, "ACTIVE_PRIVATE");
  if (idempotent.status === "ACTIVE_PRIVATE") assert.equal(idempotent.idempotent, true);

  const failed = await publishCompletedAuditToPrivateVerify("AUD-CASE-BASIC-01", {
    rpc: (async () => { throw new Error("provider detail must not escape"); }) as never,
  });
  assert.deepEqual(failed, {
    status: "WITHHELD",
    publicProofId: null,
    visibility: "PRIVATE",
    currentStatus: null,
    reason: "VERIFY_PUBLICATION_FAILED",
  });

  for (const tampered of [
    { ...validReceipt, publiclyVisible: true },
    { ...validReceipt, visibility: "PUBLIC" },
    { ...validReceipt, publicProofId: `pubidx-${"a".repeat(47)}` },
    { ...validReceipt, eventDigest: "not-a-digest" },
    { ...validReceipt, privateProviderTopology: "forbidden" },
  ]) {
    const result = await publishCompletedAuditToPrivateVerify("AUD-CASE-BASIC-01", {
      rpc: (async () => ({ data: tampered })) as never,
    });
    assert.equal(result.status, "WITHHELD");
    if (result.status === "WITHHELD") {
      assert.equal(result.reason, "VERIFY_PUBLICATION_RECEIPT_INVALID");
      assert.equal(result.publicProofId, null);
    }
  }

  const stale = await publishCompletedAuditToPrivateVerify("AUD-CASE-BASIC-01", {
    rpc: (async () => ({ data: {
      ...validReceipt,
      verifyActive: false,
      currentStatus: "MONITORING_UNAVAILABLE",
      reason: "VERIFY_MONITORING_NOT_CURRENT",
    } })) as never,
  });
  assert.deepEqual(stale, {
    status: "WITHHELD",
    publicProofId: null,
    visibility: "PRIVATE",
    currentStatus: null,
    reason: "VERIFY_MONITORING_NOT_CURRENT",
  });

  let invalidCalls = 0;
  const invalid = await publishCompletedAuditToPrivateVerify("short", {
    rpc: (async () => {
      invalidCalls += 1;
      return { data: validReceipt } as never;
    }) as never,
  });
  assert.equal(invalid.status, "WITHHELD");
  assert.equal(invalidCalls, 0);

  console.log("V4 Audit→Verify producer runtime: PASS (12/12; PRIVATE only; failure never claims active)");
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
