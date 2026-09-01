import fs from "node:fs";
import path from "node:path";
import { assignAdvancedAuditReviewer, claimAdvancedAuditWorkerLease, getAuditReviewCustomerProjection, settleAdvancedAuditWorkerLease } from "@/lib/security/audit-review-orchestration";
import { getAuditCaseCustomerHistory } from "@/lib/security/audit-case-customer-history";
import type { AuditIntakeCaseRecord } from "@/lib/security/audit-intake-case-vault";

function invariant(ok: unknown, message: string): asserts ok { if (!ok) throw new Error(message); }
function record(caseRef: string): AuditIntakeCaseRecord {
  const now = new Date().toISOString();
  return {
    caseRef, tier: "advanced", status: "queued_paid_review", entitlementVerified: true,
    entitlementRequired: true, analysisStarted: false, durable: false, createdAt: now, updatedAt: now,
  } as unknown as AuditIntakeCaseRecord;
}

const qaCase = record("AUD-P75ADVQA01");
const initial = await getAuditReviewCustomerProjection(qaCase);
invariant(initial.processingMode === "advanced_automation" && initial.state === "queued", "initial advanced automation projection mismatch");
const qa = await assignAdvancedAuditReviewer({ record: qaCase, reviewerPrincipal: "internal-qa@example.com", assignmentRequestId: "p75_optional_qa", slaMinutes: 60 });
invariant(qa.ok && qa.state === "queued", "optional QA changed execution state");
const afterQa = await getAuditReviewCustomerProjection(qaCase);
invariant(afterQa.humanReviewerAssigned === false && afterQa.sla.assignedAt === null && afterQa.sla.dueAt === null && afterQa.state === "queued", "optional QA leaked into customer projection");

const retryCase = record("AUD-P75ADVRT01");
const retryToken = "p75_retry_lease_token_abcdefghijklmnopqrstuvwxyz";
const claimed = await claimAdvancedAuditWorkerLease({ record: retryCase, workerPrincipal: "worker:p75", claimRequestId: "claim_retry_1", leaseToken: retryToken, leaseSeconds: 300 });
invariant(claimed.ok && claimed.state === "leased", "advanced claim failed");
const claimedAgain = await claimAdvancedAuditWorkerLease({ record: retryCase, workerPrincipal: "worker:p75", claimRequestId: "claim_retry_1", leaseToken: retryToken, leaseSeconds: 300 });
invariant(claimedAgain.ok && claimedAgain.idempotent === true, "advanced claim idempotency failed");
const retry = await settleAdvancedAuditWorkerLease({ record: retryCase, workerPrincipal: "worker:p75", leaseToken: retryToken, outcome: "retry", reasonCode: "evidence_quorum_not_met" });
invariant(retry.ok && retry.state === "retry_wait" && retry.attemptCount === 1, "advanced retry state failed");
const blocked = await claimAdvancedAuditWorkerLease({ record: retryCase, workerPrincipal: "worker:p75", claimRequestId: "claim_retry_2", leaseToken: "p75_retry_lease_token_2_abcdefghijklmnopqrstuvwxyz", leaseSeconds: 300 });
invariant(!blocked.ok && blocked.error === "lease_unavailable", "retry backoff did not fail closed");
const history = await getAuditCaseCustomerHistory({ caseRef: retryCase.caseRef, accountId: "memory-only", durable: false });
invariant(history.available && history.events.some((e) => e.type === "automation_claimed" && e.queueLane === "advanced_automation" && e.reason === "advanced_worker_lease"), "advanced automation history lane/reason missing");

const completeCase = record("AUD-P75ADVCP01");
const completeToken = "p75_complete_lease_token_abcdefghijklmnopqrstuvwxyz";
const c1 = await claimAdvancedAuditWorkerLease({ record: completeCase, workerPrincipal: "worker:p75", claimRequestId: "claim_complete_1", leaseToken: completeToken, leaseSeconds: 300 });
invariant(c1.ok && c1.state === "leased", "advanced complete-case claim failed");
const c2 = await settleAdvancedAuditWorkerLease({ record: completeCase, workerPrincipal: "worker:p75", leaseToken: completeToken, outcome: "complete", reasonCode: "worker_result" });
invariant(c2.ok && c2.state === "completed", "advanced completion failed");
const completedProjection = await getAuditReviewCustomerProjection(completeCase);
invariant(completedProjection.processingMode === "advanced_automation" && completedProjection.state === "completed" && completedProjection.humanReviewerAssigned === false, "completed projection mismatch");

const receipt = {
  schemaVersion: "velmere.p75.advanced-automation-memory-runtime.v1",
  status: "PASS",
  checks: 11,
  processingMode: completedProjection.processingMode,
  finalState: completedProjection.state,
  retryState: retry.state,
  customerHumanQaVisible: completedProjection.humanReviewerAssigned,
  zeroFakeCredit: { customerFinal: "0/20", auditFinalPdf: "0/3", paidValue: "0/10", saleEligible: "0/20", live: false }
};
const outDir = process.env.P75_RESULT_DIR;
if (outDir) { fs.mkdirSync(outDir, { recursive: true }); fs.writeFileSync(path.join(outDir, "P75_ADVANCED_MEMORY_RUNTIME.json"), JSON.stringify(receipt, null, 2) + "\n", "utf8"); }
console.log(JSON.stringify(receipt, null, 2));
