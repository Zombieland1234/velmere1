#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";

const checks = [];
function check(id, condition, detail = undefined) {
  const row = { id, status: condition ? "PASS" : "FAIL", ...(detail === undefined ? {} : { detail }) };
  checks.push(row);
  if (!condition) throw new Error(`P97 Browser durable PDF runtime failed: ${id} ${JSON.stringify(detail ?? null)}`);
}
async function rejects(id, fn, expected) {
  let caught = null;
  try { await fn(); } catch (error) { caught = error; }
  const message = caught instanceof Error ? caught.message : String(caught ?? "");
  check(id, caught !== null && (!expected || message.includes(expected)), { message });
}
function clone(value) { return structuredClone(value); }

for (const key of [
  "SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
]) delete process.env[key];

const policyModule = await import("../../lib/search/lens-pdf-durable-artifact-policy.ts");
const durable = await import("../../lib/jobs/durable-computation-replay.ts");
const crypto = await import("../../lib/security/cryptographic-digest.ts");

const reportId = `lens-report-${"a".repeat(64)}`;
const otherReportId = `lens-report-${"b".repeat(64)}`;
const basicPolicy = policyModule.buildP97LensPdfDurableArtifactPolicy({ depth: "basic", reportId });
check("basic_policy_verifies", policyModule.verifyP97LensPdfDurableArtifactPolicy(basicPolicy), basicPolicy);
check("basic_requires_durable_store", basicPolicy.requireDurableStore === true && basicPolicy.directNonDurableAllowed === false);
check("anonymous_subject_uses_signed_report", basicPolicy.subjectBinding.kind === "anonymous"
  && basicPolicy.subjectBinding.value === `signed-lens-report:${reportId}`
  && basicPolicy.canonicalRequestId === `signed-lens-report:${reportId}`);
check("basic_policy_digest_canonical", /^sha256:[a-f0-9]{64}$/.test(basicPolicy.policyDigest));

const accountPolicy = policyModule.buildP97LensPdfDurableArtifactPolicy({ depth: "pro", reportId, accountId: "account-p97-owner" });
check("account_policy_verifies", policyModule.verifyP97LensPdfDurableArtifactPolicy(accountPolicy));
check("account_binding_is_exact", accountPolicy.accountBound === true
  && accountPolicy.subjectBinding.kind === "account"
  && accountPolicy.subjectBinding.value === "account-p97-owner");

for (const [id, mutate] of [
  ["policy_rejects_basic_nondurable", (value) => { value.requireDurableStore = false; }],
  ["policy_rejects_direct_mode_permission", (value) => { value.directNonDurableAllowed = true; }],
  ["policy_rejects_request_id_swap", (value) => { value.canonicalRequestId = "signed-lens-report:forged"; }],
  ["policy_rejects_subject_swap", (value) => { value.subjectBinding.value = "signed-lens-report:forged"; }],
  ["policy_rejects_report_swap", (value) => { value.reportId = otherReportId; }],
  ["policy_rejects_digest_recompute_omission", (value) => { value.policyDigest = `sha256:${"0".repeat(64)}`; }],
]) {
  const mutated = clone(basicPolicy);
  mutate(mutated);
  check(id, policyModule.verifyP97LensPdfDurableArtifactPolicy(mutated) === false);
}

const requestA = new Request("https://velmere.test/api/search/lens-report?tier=basic", {
  method: "POST",
  headers: {
    "accept-language": "pl-PL",
    "user-agent": "P97-A",
    "x-forwarded-for": "203.0.113.97",
    "x-velmere-request-id": "attacker-controlled-a",
  },
});
const requestB = new Request("https://velmere.test/api/search/lens-report?tier=basic", {
  method: "POST",
  headers: {
    "accept-language": "de-DE",
    "user-agent": "P97-B",
    "x-forwarded-for": "198.51.100.97",
    "x-velmere-request-id": "attacker-controlled-b",
  },
});
const input = { reportId, depth: "basic", reportDigest: `sha256:${"c".repeat(64)}` };
const identityA = durable.buildDurableComputationIdentity({
  kind: "lens_pdf_render", request: requestA, requestId: basicPolicy.canonicalRequestId,
  subjectBinding: basicPolicy.subjectBinding, input,
});
const identityB = durable.buildDurableComputationIdentity({
  kind: "lens_pdf_render", request: requestB, requestId: basicPolicy.canonicalRequestId,
  subjectBinding: basicPolicy.subjectBinding, input,
});
check("transport_metadata_cannot_fork_canonical_job", JSON.stringify(identityA) === JSON.stringify(identityB), { identityA, identityB });
const otherPolicy = policyModule.buildP97LensPdfDurableArtifactPolicy({ depth: "basic", reportId: otherReportId });
const otherIdentity = durable.buildDurableComputationIdentity({
  kind: "lens_pdf_render", request: requestA, requestId: otherPolicy.canonicalRequestId,
  subjectBinding: otherPolicy.subjectBinding, input: { ...input, reportId: otherReportId },
});
check("different_signed_report_gets_different_job", otherIdentity.jobId !== identityA.jobId);

const pdfBytes = new Uint8Array(Buffer.concat([
  Buffer.from("%PDF-1.7\nP97 EXACT BASIC PDF BYTES\n", "utf8"),
  Buffer.from([0x00, 0xff, 0x80, 0x0a]),
  Buffer.from("%%EOF\n", "utf8"),
]));
const pdfSha256 = crypto.sha256BytesDigest(pdfBytes);
let executeCount = 0;
durable.resetDurableComputationMemoryForTests();
const runArgs = {
  kind: "lens_pdf_render",
  request: requestA,
  requestId: basicPolicy.canonicalRequestId,
  subjectBinding: basicPolicy.subjectBinding,
  input,
  env: { NODE_ENV: "test" },
  requireDurableStore: basicPolicy.requireDurableStore,
  maxResultBytes: 4 * 1024 * 1024,
  execute: async () => { executeCount += 1; return pdfBytes; },
};
const first = await durable.runDurableBinaryComputation(runArgs);
const second = await durable.runDurableBinaryComputation({ ...runArgs, request: requestB });
check("local_first_run_memory_bounded", first.mode === "memory_non_production" && first.replayed === false);
check("local_second_run_replays_exact_blob", second.mode === "memory_non_production" && second.replayed === true);
check("same_signed_report_executes_once", executeCount === 1, { executeCount });
check("same_signed_report_same_job", first.jobId === second.jobId && first.jobId === identityA.jobId, { first: first.jobId, second: second.jobId, expected: identityA.jobId });
check("memory_replay_exact_bytes", Buffer.from(first.value).equals(Buffer.from(pdfBytes))
  && Buffer.from(second.value).equals(Buffer.from(pdfBytes)));
check("byte_digest_is_exact_pdf_digest", crypto.sha256BytesDigest(first.value) === pdfSha256);
check("text_digest_is_not_substituted_for_byte_digest", crypto.sha256Digest(String(Buffer.from(pdfBytes))) !== pdfSha256);

const memoryReceipt = policyModule.buildP97LensPdfDurabilityReceipt({
  policy: basicPolicy,
  computationMode: first.mode,
  replayed: second.replayed,
  pdfSha256,
  pdfByteLength: pdfBytes.byteLength,
});
check("memory_receipt_verifies", policyModule.verifyP97LensPdfDurabilityReceipt({ receipt: memoryReceipt, policy: basicPolicy, pdfBytes }), memoryReceipt);
check("memory_receipt_bounded_not_final", memoryReceipt.storageState === "LOCAL_MEMORY_EXACT_BLOB_BOUNDED"
  && memoryReceipt.customerFinalStorageEligible === false
  && memoryReceipt.durableRetentionClaimed === false
  && memoryReceipt.backupRestoreProven === false);
check("receipt_binds_policy_digest", memoryReceipt.policyDigest === basicPolicy.policyDigest);

const directReceipt = policyModule.buildP97LensPdfDurabilityReceipt({
  policy: basicPolicy,
  computationMode: "direct_non_durable",
  replayed: false,
  pdfSha256,
  pdfByteLength: pdfBytes.byteLength,
});
check("direct_receipt_verifies_as_rejected_state", policyModule.verifyP97LensPdfDurabilityReceipt({ receipt: directReceipt, policy: basicPolicy, pdfBytes }));
check("direct_mode_explicitly_noneligible", directReceipt.storageState === "NON_DURABLE_REJECTED"
  && directReceipt.customerFinalStorageEligible === false);

const databaseReceipt = policyModule.buildP97LensPdfDurabilityReceipt({
  policy: accountPolicy,
  computationMode: "supabase",
  replayed: true,
  pdfSha256,
  pdfByteLength: pdfBytes.byteLength,
});
check("database_receipt_verifies", policyModule.verifyP97LensPdfDurabilityReceipt({ receipt: databaseReceipt, policy: accountPolicy, pdfBytes }));
check("database_receipt_only_storage_axis_eligible", databaseReceipt.customerFinalStorageEligible === true
  && databaseReceipt.durableRetentionClaimed === false
  && databaseReceipt.backupRestoreProven === false);

for (const [id, mutate] of [
  ["receipt_rejects_extra_field", (value) => { value.extra = true; }],
  ["receipt_rejects_policy_digest_swap", (value) => { value.policyDigest = `sha256:${"1".repeat(64)}`; }],
  ["receipt_rejects_pdf_digest_swap", (value) => { value.pdfSha256 = `sha256:${"2".repeat(64)}`; }],
  ["receipt_rejects_pdf_length_swap", (value) => { value.pdfByteLength += 1; }],
  ["receipt_rejects_storage_state_forgery", (value) => { value.storageState = "DURABLE_DATABASE_BLOB_VERIFIED"; }],
  ["receipt_rejects_final_eligibility_forgery", (value) => { value.customerFinalStorageEligible = true; }],
  ["receipt_rejects_retention_forgery", (value) => { value.durableRetentionClaimed = true; }],
  ["receipt_rejects_restore_forgery", (value) => { value.backupRestoreProven = true; }],
  ["receipt_rejects_replayed_flip", (value) => { value.replayed = !value.replayed; }],
  ["receipt_rejects_report_swap", (value) => { value.reportId = otherReportId; }],
  ["receipt_rejects_receipt_digest_swap", (value) => { value.receiptDigest = `sha256:${"3".repeat(64)}`; }],
]) {
  const mutated = clone(memoryReceipt);
  mutate(mutated);
  check(id, policyModule.verifyP97LensPdfDurabilityReceipt({ receipt: mutated, policy: basicPolicy, pdfBytes }) === false, mutated);
}

const forgedPolicyDigestReceipt = clone(memoryReceipt);
forgedPolicyDigestReceipt.policyDigest = `sha256:${"4".repeat(64)}`;
const forgedUnsigned = { ...forgedPolicyDigestReceipt };
delete forgedUnsigned.receiptDigest;
forgedPolicyDigestReceipt.receiptDigest = crypto.sha256Digest((await import("../../lib/security/canonical-json.ts")).canonicalJson(forgedUnsigned));
check("receipt_rejects_self_consistent_forgery_without_expected_policy",
  policyModule.verifyP97LensPdfDurabilityReceipt({ receipt: forgedPolicyDigestReceipt, policy: basicPolicy, pdfBytes }) === false);

const wrongBytes = new Uint8Array(pdfBytes);
wrongBytes[wrongBytes.length - 2] ^= 0x01;
check("receipt_rejects_wrong_exact_bytes",
  policyModule.verifyP97LensPdfDurabilityReceipt({ receipt: memoryReceipt, policy: basicPolicy, pdfBytes: wrongBytes }) === false);

let productionExecuteCount = 0;
durable.resetDurableComputationMemoryForTests();
await rejects("production_missing_store_fails_before_render", async () => {
  await durable.runDurableBinaryComputation({
    ...runArgs,
    env: { NODE_ENV: "production", VERCEL_ENV: "production" },
    execute: async () => { productionExecuteCount += 1; return pdfBytes; },
  });
}, "durable_computation_store_required");
check("production_missing_store_does_not_render", productionExecuteCount === 0, { productionExecuteCount });

const failed = checks.filter((row) => row.status !== "PASS");
const receipt = {
  schemaVersion: "velmere.p97.browser-basic-durable-pdf-runtime.v1",
  generatedAt: "2026-08-21T08:00:00.000Z",
  status: failed.length ? "FAIL" : "PASS_BOUNDED_LOCAL_DURABLE_RENDER_ONCE_REPLAY",
  checks: { total: checks.length, passed: checks.length - failed.length, failed: failed.length, rows: checks },
  exactLocalArtifact: { byteLength: pdfBytes.byteLength, sha256: pdfSha256, executionCount: executeCount, replayed: second.replayed },
  environment: { networkSocketsUsed: false, realSupabaseExecuted: false, productionStoreConfigured: false },
  customerCredit: {
    browserBasicFinal: false,
    customerFinalNumeratorDelta: 0,
    reason: "Memory replay is a local bounded proof. Production without a configured durable store fails before rendering. No deployed route, real database, Browser journey, rights/currentness, exact Windows or customer-authorized input was proven.",
  },
  truthBoundary: "Proves the Browser PDF durable policy, signed-report idempotency, exact binary SHA-256, bounded local memory replay, production fail-closed behavior and receipt mutation rejection. It does not prove Supabase persistence, account storage, deployed preview/download, retention, restore, Browser Basic FINAL or Customer FINAL.",
};
await mkdir("receipts/p97", { recursive: true });
await mkdir("artifacts/p97", { recursive: true });
const text = `${JSON.stringify(receipt, null, 2)}\n`;
await writeFile("receipts/p97/P97_BROWSER_BASIC_DURABLE_PDF_RUNTIME.json", text);
await writeFile("artifacts/p97/P97_BROWSER_BASIC_DURABLE_PDF_RUNTIME.json", text);
console.log(JSON.stringify(receipt));
