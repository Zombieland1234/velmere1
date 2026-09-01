import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import {
  buildAuditContractTargetHash,
  createAuditIntakeCase,
  getMemoryAuditIntakeCases,
  type AuditIntakeCaseRecord,
} from "@/lib/security/audit-intake-case-vault";
import {
  normalizeAuditBasicCompletionRpcError,
  normalizeAuditBasicStoreFailure,
} from "@/lib/security/audit-basic-report-store";
import {
  claimBasicAuditWorkerLease,
  executeAfterBasicAuditWorkerLeasePreflight,
  getMemoryAuditReviewOrchestration,
  normalizeBasicAuditWorkerLeaseToken,
  settleBasicAuditWorkerLease,
} from "@/lib/security/audit-review-orchestration";
import { POST as postAuditIntake } from "@/lib/server/security-route-modules/audit-intake";

const read = (path: string) => readFileSync(path, "utf8");

const gate = read("lib/security/audit-execution-packet-release-gate.ts");
const orchestration = read("lib/security/audit-review-orchestration.ts");
const intake = read("lib/server/security-route-modules/audit-intake.ts");
const vault = read("lib/security/audit-intake-case-vault.ts");
const registry = read("lib/db/supabase-rpc-operation-registry.ts");
const migration = read("supabase/migrations/20260821000002_current_audit_basic_worker_exact_artifact.sql");
const store = read("lib/security/audit-basic-report-store.ts");
const settleRoute = read("lib/server/lazy-route-modules/security--audit-review--basic--settle.ts");
const pdfRoute = read("lib/server/lazy-route-modules/security--audit-watch--basic-pdf.ts");
const claimRoute = read("app/api/security/audit-review/basic/claim/route.ts");
const auditClient = read("components/security/SecurityAuditsCleanPage.tsx");
const auditWatchPost = read("lib/security/audit-watch-post-handler.ts");

const leaseToken = (seed: string) => createHash("sha256").update(`audit-basic-worker-test:${seed}`).digest("base64url");

assert.doesNotMatch(gate, /basic_audit_worker_not_implemented/u);
assert.match(gate, /expectedTier:\s*AuditIntakeTier/u);
assert.match(orchestration, /export async function claimBasicAuditWorkerLease/u);
assert.match(orchestration, /export async function settleBasicAuditWorkerLease/u);
assert.match(intake, /if \(!account\)/u);
const unsupportedTargetGuardIndex = intake.indexOf('recognizedTarget.kind !== "contract"');
const chainGuardIndex = intake.indexOf('requestedChainId !== "56"');
const createCaseIndex = intake.indexOf("await createAuditIntakeCase");
const mutationReceiptIndex = intake.indexOf("await appendPass2178MutationReceipt");
assert.ok(unsupportedTargetGuardIndex >= 0 && chainGuardIndex > unsupportedTargetGuardIndex);
assert.ok(createCaseIndex > chainGuardIndex && mutationReceiptIndex > createCaseIndex);
assert.doesNotMatch(intake, /\bfetch\s*\(|collectP82CurrentDeploymentReadonlyQuorumFromEnvironment|buildPass2570AuditSourceQuorumReport/u);
assert.match(intake, /basic_execution_target_withheld/u);
assert.match(intake, /recognizedFutureTargets/u);
assert.doesNotMatch(intake, /acceptedTargets/u);
assert.match(auditClient, /Current execution target: BSC contract · chainId 56\./u);
assert.match(auditClient, /recognized future target types, but are currently WITHHELD and never queued/u);
assert.ok(auditWatchPost.indexOf("if (earlyReadinessTier)") < auditWatchPost.indexOf("buildPass2570AuditSourceQuorumReport({"));
assert.match(registry, /audit_basic_worker_lease_claim/u);
assert.match(registry, /audit_basic_worker_lease_preflight:\s*\{\s*rpcName:\s*"velmere_preflight_basic_audit_worker_lease"/u);
assert.match(registry, /audit_basic_worker_complete_with_exact_pdf/u);
assert.match(registry, /audit_basic_worker_complete_with_exact_pdf:\s*\{\s*rpcName:\s*"velmere_complete_basic_audit_with_exact_pdf_v1"/u);

for (const path of [
  "app/api/security/audit-review/basic/claim/route.ts",
  "app/api/security/audit-review/basic/settle/route.ts",
  "app/api/security/audit-watch/basic-pdf/route.ts",
  "lib/security/audit-basic-report-store.ts",
  "lib/server/lazy-route-modules/security--audit-review--basic--settle.ts",
  "lib/server/lazy-route-modules/security--audit-watch--basic-pdf.ts",
  "supabase/migrations/20260821000002_current_audit_basic_worker_exact_artifact.sql",
]) {
  assert.doesNotThrow(() => read(path), `missing ${path}`);
}

assert.match(migration, /revoke all on public\.velmere_audit_basic_report_artifacts from public, anon, authenticated, service_role/u);
assert.match(migration, /grant select on public\.velmere_audit_basic_report_artifacts to service_role/u);
assert.doesNotMatch(migration, /grant\s+(?:select\s*,\s*)?insert[^;]*service_role/iu);
assert.match(migration, /drop constraint if exists velmere_audit_intake_cases_request_id_key/u);
assert.match(migration, /unique index if not exists velmere_audit_intake_account_request_uidx[\s\S]*\(account_id, request_id\) nulls not distinct/u);
assert.match(migration, /add column if not exists target_chain_id text/u);
assert.match(migration, /target_chain_id = '56' and target_chain_name = 'BSC'/u);
assert.match(migration, /velmere-audit-contract-target-v1:/u);
assert.match(migration, /before insert on public\.velmere_audit_intake_cases[\s\S]*velmere_reject_non_current_audit_target_v1/u);
assert.match(vault, /findSupabaseCaseByRequestId\(accountId: string, requestId: string\)[\s\S]*\.eq\("account_id", sanitizeText\(accountId, 120\)\)[\s\S]*\.eq\("request_id", sanitizeRequestId\(requestId\)\)/u);
assert.match(vault, /memoryCaseKey\(accountId, requestId\)/u);
assert.notEqual(buildAuditContractTargetHash("1", `0x${"1".repeat(40)}`), buildAuditContractTargetHash("56", `0x${"1".repeat(40)}`));
assert.match(migration, /for select to authenticated[\s\S]*account_id_hash = public\.velmere_current_account_binding_hash\(\)/u);
assert.match(migration, /pg_advisory_xact_lock/u);
assert.match(migration, /create or replace function public\.velmere_preflight_basic_audit_worker_lease/u);
assert.match(migration, /revoke all on function public\.velmere_preflight_basic_audit_worker_lease\(text,text,text\)[\s\S]*from public, anon, authenticated, service_role/u);
assert.match(migration, /audit_basic_atomic_completion_required/u);
assert.match(migration, /p_lease_seconds is null or p_lease_seconds not between 60 and 900/u);
assert.equal((migration.match(/lease_expires_at\s*<=\s*v_now/gu) ?? []).length, 3, "preflight, settle, and atomic completion must reject an exactly-expired lease");
assert.match(migration, /review_state = v_state,[\s\S]*attempt_count = v_attempt_count,[\s\S]*'staleLease', true/u);
assert.doesNotMatch(claimRoute, /randomBytes/u);
assert.match(claimRoute, /normalizeBasicAuditWorkerLeaseToken\(body\.leaseToken\)/u);
assert.match(claimRoute, /acceptedRange: \[60, 900\]/u);
assert.match(claimRoute, /signed\/MFA-bound worker supplies and retains/u);
assert.match(migration, /before update or delete[\s\S]*audit_basic_report_immutable/u);
const insertIndex = migration.indexOf("insert into public.velmere_audit_basic_report_artifacts");
const completeIndex = migration.indexOf("review_state = 'completed'", insertIndex);
assert.ok(insertIndex >= 0 && completeIndex > insertIndex, "artifact insert must precede orchestration completion in one transaction");
assert.match(store, /operation:\s*"audit_basic_worker_complete_with_exact_pdf"/u);
assert.match(store, /snapshot\.auditExecutionRelease\?\.expectedTier !== "basic"/u);
assert.match(store, /snapshot\.customerEligibility\?\.commercialUseReady !== true/u);
assert.doesNotMatch(store, /error instanceof Error \? error\.message|throw new Error\(error\.message\)/u);
assert.match(settleRoute, /expectedTier:\s*"basic"/u);
assert.match(settleRoute, /audit_execution_packet_withheld/u);
const releaseGateCallIndex = settleRoute.indexOf("auditExecutionRelease = buildAuditExecutionPacketReleaseGate");
const leasePreflightCallIndex = settleRoute.indexOf("const protectedBuild = await executeAfterBasicAuditWorkerLeasePreflight");
const renderCallIndex = settleRoute.indexOf("execute: () => buildProAuditPdfSnapshotArtifact({");
const atomicCompletionCallIndex = settleRoute.indexOf("await completeBasicAuditWorkerLeaseWithExactPdf");
assert.ok([releaseGateCallIndex, leasePreflightCallIndex, renderCallIndex, atomicCompletionCallIndex].every((index) => index >= 0));
assert.ok(releaseGateCallIndex < leasePreflightCallIndex);
assert.ok(leasePreflightCallIndex < renderCallIndex);
assert.ok(renderCallIndex < atomicCompletionCallIndex);
assert.match(pdfRoute, /getAuditCaseForOwningAccount/u);
assert.match(pdfRoute, /readAuditBasicReportForOwner/u);
assert.match(pdfRoute, /same_immutable_blob/u);
assert.doesNotMatch(pdfRoute, /paid_entitlement|download_token|capability/iu);
const syntheticProviderFailure = new Error("postgres://secret-user:secret-pass@private-db.example/internal SQL select customer_email");
for (const code of [
  normalizeAuditBasicStoreFailure("read", syntheticProviderFailure),
  normalizeAuditBasicStoreFailure("complete", syntheticProviderFailure),
  normalizeAuditBasicCompletionRpcError(syntheticProviderFailure.message),
]) {
  assert.doesNotMatch(code, /secret|postgres|private-db|customer_email/iu);
}
assert.equal(normalizeAuditBasicStoreFailure("read", syntheticProviderFailure), "audit_basic_report_read_failed");
assert.equal(normalizeAuditBasicStoreFailure("complete", syntheticProviderFailure), "audit_basic_exact_pdf_atomic_completion_failed");
assert.equal(normalizeAuditBasicCompletionRpcError(syntheticProviderFailure.message), "audit_basic_exact_pdf_atomic_completion_rejected");
for (const customerOrAdminPayload of [
  { ok: false, error: normalizeAuditBasicStoreFailure("read", syntheticProviderFailure), retryable: true },
  { ok: false, error: normalizeAuditBasicCompletionRpcError(syntheticProviderFailure.message), retryable: false },
]) {
  assert.doesNotMatch(JSON.stringify(customerOrAdminPayload), /secret|postgres|private-db|customer_email|select/iu);
}

function memoryBasicRecord(suffix: string, accountId = `account-${suffix}`, durable = false): AuditIntakeCaseRecord {
  const canonicalTarget = `0x${createHash("sha256").update(`audit-basic-target:${suffix}`).digest("hex").slice(0, 40)}`;
  return {
    caseId: `case-basic-${suffix}`,
    caseRef: `AUD-BASIC${suffix}`,
    requestId: `request-basic-${suffix}`,
    target: {
      kind: "contract",
      canonicalTarget,
      displayLabel: `Basic ${suffix}`,
      targetHash: buildAuditContractTargetHash("56", canonicalTarget),
      chainId: "56",
      chainName: "BSC",
    },
    sourceCandidates: {},
    tier: "basic",
    locale: "en",
    status: "queued_basic_prescreen",
    accountId,
    entitlementRequired: false,
    entitlementVerified: false,
    analysisStarted: false,
    createdAt: "2026-08-21T12:00:00.000Z",
    updatedAt: "2026-08-21T12:00:00.000Z",
    storageMode: durable ? "supabase_durable" : "memory_runtime_only",
    durable,
  };
}

const savedEnvironment = new Map([
  "NODE_ENV",
  "VERCEL_ENV",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
].map((key) => [key, process.env[key]]));
try {
  delete process.env.NODE_ENV;
  delete process.env.VERCEL_ENV;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;

  const apiCasesBeforeWithheld = getMemoryAuditIntakeCases().length;
  const postIntake = (body: Record<string, unknown>) => postAuditIntake(new Request("http://localhost/api/security/audit-intake", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }));
  const withheldUrlResponse = await postIntake({
    target: "https://github.com/velmere/future-target",
    tier: "basic",
    requestId: "api-withheld-url-20260821",
  });
  assert.equal(withheldUrlResponse.status, 422);
  assert.equal((await withheldUrlResponse.json()).error, "basic_execution_target_withheld");
  const missingChainResponse = await postIntake({
    target: `0x${"4".repeat(40)}`,
    tier: "basic",
    requestId: "api-missing-chain-20260821",
  });
  assert.equal(missingChainResponse.status, 422);
  assert.equal((await missingChainResponse.json()).error, "audit_execution_chain_required");
  const wrongChainResponse = await postIntake({
    target: `0x${"4".repeat(40)}`,
    chainId: "1",
    chainName: "Ethereum",
    tier: "advanced",
    requestId: "api-wrong-chain-20260821",
  });
  assert.equal(wrongChainResponse.status, 422);
  assert.equal((await wrongChainResponse.json()).error, "audit_execution_chain_withheld");
  assert.equal(getMemoryAuditIntakeCases().length, apiCasesBeforeWithheld, "API target/chain WITHHELD responses must have zero case effects");

  const sharedRequestId = "basic-account-isolation-20260821";
  const sharedTarget = {
    kind: "contract" as const,
    canonicalTarget: `0x${"1".repeat(40)}`,
    displayLabel: "Basic account isolation",
    targetHash: buildAuditContractTargetHash("56", `0x${"1".repeat(40)}`),
    chainId: "56",
    chainName: "BSC",
  };
  const casesBeforeWithheldTargets = getMemoryAuditIntakeCases().length;
  const unsupportedTarget = await createAuditIntakeCase({
    requestId: "basic-url-withheld-20260821",
    target: {
      kind: "url",
      canonicalTarget: "https://example.com",
      displayLabel: "example.com",
      targetHash: `sha256:${"b".repeat(64)}`,
    },
    tier: "basic",
    locale: "en",
    accountId: "account-withheld",
  });
  const missingChainTarget = await createAuditIntakeCase({
    requestId: "basic-chain-missing-20260821",
    target: {
      kind: "contract",
      canonicalTarget: `0x${"2".repeat(40)}`,
      displayLabel: "missing chain",
      targetHash: `sha256:${"c".repeat(64)}`,
    },
    tier: "basic",
    locale: "en",
    accountId: "account-withheld",
  });
  const wrongChainTarget = await createAuditIntakeCase({
    requestId: "basic-chain-wrong-20260821",
    target: {
      kind: "contract",
      canonicalTarget: `0x${"2".repeat(40)}`,
      displayLabel: "wrong chain",
      targetHash: buildAuditContractTargetHash("1", `0x${"2".repeat(40)}`),
      chainId: "1",
      chainName: "Ethereum",
    },
    tier: "basic",
    locale: "en",
    accountId: "account-withheld",
  });
  assert.equal(unsupportedTarget.error, "case_target_withheld");
  assert.equal(missingChainTarget.error, "case_target_revalidation_required");
  assert.equal(wrongChainTarget.error, "case_target_revalidation_required");
  assert.equal(getMemoryAuditIntakeCases().length, casesBeforeWithheldTargets, "withheld/missing/wrong-chain targets must create zero cases");
  const accountACase = await createAuditIntakeCase({
    requestId: sharedRequestId,
    target: sharedTarget,
    tier: "basic",
    locale: "en",
    accountId: "account-isolation-a",
  });
  const accountBCase = await createAuditIntakeCase({
    requestId: sharedRequestId,
    target: sharedTarget,
    tier: "basic",
    locale: "en",
    accountId: "account-isolation-b",
  });
  const accountAReplay = await createAuditIntakeCase({
    requestId: sharedRequestId,
    target: sharedTarget,
    tier: "basic",
    locale: "en",
    accountId: "account-isolation-a",
  });
  assert.equal(accountACase.ok, true);
  assert.equal(accountBCase.ok, true);
  assert.equal(accountACase.duplicate, false);
  assert.equal(accountBCase.duplicate, false);
  assert.notEqual(accountACase.record?.caseId, accountBCase.record?.caseId);
  assert.equal(accountACase.record?.accountId, "account-isolation-a");
  assert.equal(accountBCase.record?.accountId, "account-isolation-b");
  assert.equal(accountAReplay.duplicate, true);
  assert.equal(accountAReplay.record?.caseId, accountACase.record?.caseId);

  assert.equal(normalizeBasicAuditWorkerLeaseToken("A".repeat(43)), "");
  assert.equal(normalizeBasicAuditWorkerLeaseToken("not+base64/url"), "");
  assert.equal(normalizeBasicAuditWorkerLeaseToken(leaseToken("valid-token")), leaseToken("valid-token"));

  const recordA = memoryBasicRecord("A0010001");
  const tokenA = leaseToken("record-a");
  const claimA = await claimBasicAuditWorkerLease({
    record: recordA,
    workerPrincipal: "worker-a",
    claimRequestId: "claim-a-001",
    leaseToken: tokenA,
  });
  assert.equal(claimA.ok, true);
  const replayA = await claimBasicAuditWorkerLease({
    record: recordA,
    workerPrincipal: "worker-a",
    claimRequestId: "claim-a-001",
    leaseToken: tokenA,
  });
  assert.equal(replayA.ok, true);
  assert.equal(replayA.idempotent, true);
  let protectedExecutionCount = 0;
  const bogusPreflight = await executeAfterBasicAuditWorkerLeasePreflight({
    record: recordA,
    workerPrincipal: "worker-a",
    leaseToken: leaseToken("bogus-a"),
    execute: async () => {
      protectedExecutionCount += 1;
      return "must-not-run";
    },
  });
  assert.equal(bogusPreflight.ok, false);
  assert.equal(bogusPreflight.preflight.error, "lease_mismatch");
  assert.equal(protectedExecutionCount, 0, "bogus lease must make renderer/provider calls zero");
  assert.equal((await settleBasicAuditWorkerLease({ record: recordA, workerPrincipal: "worker-b", leaseToken: tokenA, outcome: "retry" })).error, "lease_mismatch");
  assert.equal((await settleBasicAuditWorkerLease({ record: recordA, workerPrincipal: "worker-a", leaseToken: leaseToken("wrong-a"), outcome: "retry" })).error, "lease_mismatch");
  assert.equal((await claimBasicAuditWorkerLease({
    record: recordA,
    workerPrincipal: "worker-a",
    claimRequestId: "claim-a-001",
    leaseToken: leaseToken("changed-token"),
  })).error, "lease_unavailable");
  assert.equal((await claimBasicAuditWorkerLease({
    record: recordA,
    workerPrincipal: "worker-a",
    claimRequestId: "claim-low-entropy",
    leaseToken: "A".repeat(43),
  })).error, "invalid_request");

  const recordB = memoryBasicRecord("B0010001");
  const contenders = [
    { workerPrincipal: "worker-b1", claimRequestId: "claim-b1", leaseToken: leaseToken("record-b1") },
    { workerPrincipal: "worker-b2", claimRequestId: "claim-b2", leaseToken: leaseToken("record-b2") },
  ];
  const concurrent = await Promise.all(contenders.map((candidate) => claimBasicAuditWorkerLease({ record: recordB, ...candidate })));
  assert.equal(concurrent.filter((row) => row.ok).length, 1);
  assert.equal(concurrent.filter((row) => !row.ok && row.error === "lease_unavailable").length, 1);
  const winner = contenders[concurrent.findIndex((row) => row.ok)];
  assert.equal((await settleBasicAuditWorkerLease({ record: recordA, workerPrincipal: winner.workerPrincipal, leaseToken: winner.leaseToken, outcome: "dead_letter" })).error, "lease_mismatch");
  const settledB = await settleBasicAuditWorkerLease({ record: recordB, workerPrincipal: winner.workerPrincipal, leaseToken: winner.leaseToken, outcome: "dead_letter" });
  assert.equal(settledB.ok, true);
  assert.equal(settledB.state, "dead_letter");
  assert.equal(getMemoryAuditReviewOrchestration(recordA.caseRef)?.state, "leased");
  assert.equal(getMemoryAuditReviewOrchestration(recordB.caseRef)?.state, "dead_letter");

  const expiredRecord = memoryBasicRecord("D0010001");
  const expiredToken = leaseToken("expired-preflight");
  const expiredClaim = await claimBasicAuditWorkerLease({
    record: expiredRecord,
    workerPrincipal: "worker-expired",
    claimRequestId: "claim-expired",
    leaseToken: expiredToken,
    leaseSeconds: 60,
  });
  assert.equal(expiredClaim.ok, true);
  const originalDateNow = Date.now;
  try {
    Object.defineProperty(Date, "now", { configurable: true, value: () => Date.parse(expiredClaim.leaseExpiresAt ?? "") });
    const expiredPreflight = await executeAfterBasicAuditWorkerLeasePreflight({
      record: expiredRecord,
      workerPrincipal: "worker-expired",
      leaseToken: expiredToken,
      execute: async () => {
        protectedExecutionCount += 1;
        return "must-not-run";
      },
    });
    assert.equal(expiredPreflight.ok, false);
    assert.equal(expiredPreflight.preflight.error, "lease_mismatch");
    assert.equal(expiredPreflight.preflight.staleLease, true);
  } finally {
    Object.defineProperty(Date, "now", { configurable: true, value: originalDateNow });
  }
  assert.equal(protectedExecutionCount, 0, "expired lease must make renderer/provider calls zero");

  const rangeRecord = memoryBasicRecord("R0010001");
  assert.equal((await claimBasicAuditWorkerLease({
    record: rangeRecord,
    workerPrincipal: "worker-range",
    claimRequestId: "claim-range-low",
    leaseToken: leaseToken("range-low"),
    leaseSeconds: 59,
  })).error, "invalid_request");
  assert.equal((await claimBasicAuditWorkerLease({
    record: rangeRecord,
    workerPrincipal: "worker-range",
    claimRequestId: "claim-range-high",
    leaseToken: leaseToken("range-high"),
    leaseSeconds: 901,
  })).error, "invalid_request");

  const reclaimRecord = memoryBasicRecord("X0010001");
  const savedDateNow = Date.now;
  let clockMs = savedDateNow();
  try {
    Object.defineProperty(Date, "now", { configurable: true, value: () => clockMs });
    const firstLease = await claimBasicAuditWorkerLease({
      record: reclaimRecord,
      workerPrincipal: "worker-reclaim-1",
      claimRequestId: "claim-reclaim-1",
      leaseToken: leaseToken("reclaim-1"),
      leaseSeconds: 60,
    });
    assert.equal(firstLease.ok, true);
    clockMs = Date.parse(firstLease.leaseExpiresAt ?? "") + 1;
    const firstExpiry = await claimBasicAuditWorkerLease({
      record: reclaimRecord,
      workerPrincipal: "worker-reclaim-2",
      claimRequestId: "claim-reclaim-2",
      leaseToken: leaseToken("reclaim-2"),
      leaseSeconds: 60,
    });
    assert.equal(firstExpiry.ok, false);
    assert.equal(firstExpiry.staleLease, true);
    assert.equal(firstExpiry.state, "retry_wait");
    assert.equal(firstExpiry.attemptCount, 1);
    clockMs = Date.parse(firstExpiry.retryAt ?? "") + 1;
    const secondLease = await claimBasicAuditWorkerLease({
      record: reclaimRecord,
      workerPrincipal: "worker-reclaim-2",
      claimRequestId: "claim-reclaim-2",
      leaseToken: leaseToken("reclaim-2"),
      leaseSeconds: 60,
    });
    assert.equal(secondLease.ok, true);
    assert.equal(secondLease.attemptCount, 1);
    clockMs = Date.parse(secondLease.leaseExpiresAt ?? "") + 1;
    const secondExpiry = await claimBasicAuditWorkerLease({
      record: reclaimRecord,
      workerPrincipal: "worker-reclaim-3",
      claimRequestId: "claim-reclaim-3",
      leaseToken: leaseToken("reclaim-3"),
      leaseSeconds: 60,
    });
    assert.equal(secondExpiry.state, "retry_wait");
    assert.equal(secondExpiry.attemptCount, 2);
    clockMs = Date.parse(secondExpiry.retryAt ?? "") + 1;
    const thirdLease = await claimBasicAuditWorkerLease({
      record: reclaimRecord,
      workerPrincipal: "worker-reclaim-3",
      claimRequestId: "claim-reclaim-3",
      leaseToken: leaseToken("reclaim-3"),
      leaseSeconds: 60,
    });
    assert.equal(thirdLease.ok, true);
    clockMs = Date.parse(thirdLease.leaseExpiresAt ?? "") + 1;
    const terminalExpiry = await claimBasicAuditWorkerLease({
      record: reclaimRecord,
      workerPrincipal: "worker-reclaim-4",
      claimRequestId: "claim-reclaim-4",
      leaseToken: leaseToken("reclaim-4"),
      leaseSeconds: 60,
    });
    assert.equal(terminalExpiry.ok, false);
    assert.equal(terminalExpiry.staleLease, true);
    assert.equal(terminalExpiry.state, "dead_letter");
    assert.equal(terminalExpiry.attemptCount, 3);
    assert.equal(getMemoryAuditReviewOrchestration(reclaimRecord.caseRef)?.state, "dead_letter");
  } finally {
    Object.defineProperty(Date, "now", { configurable: true, value: savedDateNow });
  }

  const durableRecord = memoryBasicRecord("E0010001", "account-durable", true);
  assert.equal((await claimBasicAuditWorkerLease({
    record: durableRecord,
    workerPrincipal: "worker-durable",
    claimRequestId: "claim-durable",
    leaseToken: leaseToken("durable"),
  })).error, "review_orchestration_unavailable");
  assert.equal((await settleBasicAuditWorkerLease({
    record: durableRecord,
    workerPrincipal: "worker-durable",
    leaseToken: leaseToken("durable"),
    outcome: "retry",
  })).error, "review_orchestration_unavailable");

  const ownerless = memoryBasicRecord("C0010001", "");
  const ownerlessClaim = await claimBasicAuditWorkerLease({
    record: ownerless,
    workerPrincipal: "worker-c",
    claimRequestId: "claim-c",
    leaseToken: leaseToken("ownerless"),
  });
  assert.equal(ownerlessClaim.ok, false);
  assert.equal(ownerlessClaim.error, "case_not_eligible");
} finally {
  for (const [key, value] of savedEnvironment) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

console.log("Audit Basic worker closure: PASS");
