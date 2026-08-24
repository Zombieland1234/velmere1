import fs from "node:fs";
import path from "node:path";
import {
  approveAdvancedAuditReleaseEnvelope,
  buildAdvancedAuditReleaseEnvelope,
  revokeAdvancedAuditReleaseEnvelope,
  verifyAdvancedAuditReleaseEnvelope,
} from "../p75-work/source/lib/security/advanced-audit-release-envelope";

const outDir = process.env.P76_RESULT_DIR ?? process.cwd();
const secret = "p76-test-secret-0123456789-abcdefghijklmnopqrstuvwxyz";
const d = (c: string) => `sha256:${c.repeat(64)}`;
const base = {
  secret,
  caseRef: "AUD-P76TEST1",
  target: "0xca11bde05977b3631167028862be2a173976ca11",
  accountRef: "account-p76",
  entitlementRef: "entitlement-p76",
  entitlementState: "active" as const,
  paymentVerified: true,
  scopeConsentVerified: true,
  evidenceReadinessMet: true,
  redactionPassed: true,
  evidencePacketId: "packet-p76",
  payloadHash: d("a"),
  sourceReceiptRoot: d("b"),
  pdfDigest: d("c"),
  automationCompleted: true,
  automationLeaseActive: false,
  immutableSnapshotBound: true,
  automationCompletedAt: "2026-08-18T00:00:00.000Z",
  issuedAt: "2026-08-18T00:01:00.000Z",
};
const checks: Array<{name:string;status:"PASS"|"FAIL";detail?:unknown}> = [];
const check = (name:string, ok:boolean, detail?:unknown) => { checks.push({name,status:ok?"PASS":"FAIL",detail}); if(!ok) throw new Error(name); };

const ready = buildAdvancedAuditReleaseEnvelope(base);
let v = verifyAdvancedAuditReleaseEnvelope({ envelope: ready, secret, now: "2026-08-18T00:02:00.000Z" });
check("ready_without_human_review", v.deliverable && ready.state === "ready" && ready.review === null && ready.dualControl?.required === false, v);
check("automation_binding_present", ready.automation.processingMode === "advanced_automation" && ready.automation.completionState === "completed" && ready.automation.immutableSnapshotBound && !ready.automation.automationLeaseActive);

const incomplete = buildAdvancedAuditReleaseEnvelope({ ...base, automationCompleted: false, automationCompletedAt: null });
v = verifyAdvancedAuditReleaseEnvelope({ envelope: incomplete, secret, now: "2026-08-18T00:02:00.000Z" });
check("incomplete_automation_blocks", !v.deliverable && v.blockers.includes("advanced_automation_not_completed"), v);
const leased = buildAdvancedAuditReleaseEnvelope({ ...base, automationLeaseActive: true });
v = verifyAdvancedAuditReleaseEnvelope({ envelope: leased, secret, now: "2026-08-18T00:02:00.000Z" });
check("active_lease_blocks", !v.deliverable && v.blockers.includes("advanced_automation_lease_active"), v);
const noSnapshot = buildAdvancedAuditReleaseEnvelope({ ...base, immutableSnapshotBound: false });
v = verifyAdvancedAuditReleaseEnvelope({ envelope: noSnapshot, secret, now: "2026-08-18T00:02:00.000Z" });
check("missing_immutable_snapshot_blocks", !v.deliverable && v.blockers.includes("advanced_immutable_snapshot_not_bound"), v);

const qa = approveAdvancedAuditReleaseEnvelope({
  envelope: ready, secret, approverId: "internal-qa-2", approverSignature: "signature-for-internal-qa-only",
  approvalReceiptId: "qa-p76-001", approvedAt: "2026-08-18T00:03:00.000Z", now: "2026-08-18T00:03:00.000Z",
});
v = verifyAdvancedAuditReleaseEnvelope({ envelope: qa, secret, now: "2026-08-18T00:04:00.000Z" });
check("optional_qa_does_not_change_release_state", v.deliverable && qa.state === ready.state && JSON.stringify(qa.blockers) === JSON.stringify(ready.blockers) && qa.dualControl?.required === false, v);
let blockedQaRejected = false;
try { approveAdvancedAuditReleaseEnvelope({ envelope: incomplete, secret, approverId:"qa", approverSignature:"1234567890123456", approvalReceiptId:"qa-blocked", now:"2026-08-18T00:03:00.000Z" }); } catch { blockedQaRejected = true; }
check("optional_qa_cannot_unblock", blockedQaRejected);

const tampered = structuredClone(ready);
tampered.automation.immutableSnapshotBound = false;
v = verifyAdvancedAuditReleaseEnvelope({ envelope: tampered, secret, now: "2026-08-18T00:02:00.000Z" });
check("automation_tamper_detected", !v.integrityValid && !v.deliverable, v);
const revoked = revokeAdvancedAuditReleaseEnvelope({ envelope: ready, secret, reason: "evidence_recalled" });
v = verifyAdvancedAuditReleaseEnvelope({ envelope: revoked, secret, now: "2026-08-18T00:02:00.000Z" });
check("revocation_terminal", revoked.state === "revoked" && !v.deliverable && v.blockers.some((x)=>x.startsWith("release_revoked")), v);

const receipt = { schemaVersion:"velmere.p76.release-envelope-runtime.v1", status:"PASS", checks, zeroFakeCredit:{customerFinal:"0/20",auditFinalPdf:"0/3",rights:"2/203",paidValue:"0/10",saleEligible:"0/20",live:false} };
fs.mkdirSync(outDir,{recursive:true});fs.writeFileSync(path.join(outDir,"P76_RELEASE_ENVELOPE_RUNTIME.json"),JSON.stringify(receipt,null,2)+"\n");console.log(JSON.stringify(receipt,null,2));
