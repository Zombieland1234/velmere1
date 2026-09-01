#!/usr/bin/env node
import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";

const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const sha = (p) => crypto.createHash("sha256").update(fs.readFileSync(path.join(root, p))).digest("hex");
const checks = [];
const check = (name, condition, detail = null) => { checks.push({ name, status: condition ? "PASS" : "FAIL", detail }); if (!condition) process.exitCode = 1; };

check("P4615 frozen", sha("supabase/migrations/20260707000004_4615_audit_customer_safe_status_history.sql") === "cc8e1aea64e72c0d0096490b16ad8422843c069eb368ee9e1b6d280b2fc41210");
check("P4616 frozen", sha("supabase/migrations/20260707000005_4616_audit_review_assignment_sla_worker_lease.sql") === "6705b5d377255d2f48bb9b1b548249387495ca4d00694a85ba8a32e93e00047e");
check("P4806 frozen", sha("supabase/migrations/20260716000001_4806_audit_report_snapshot_delivery_gate.sql") === "0aa8eaf748a3c2dbf5b3d892be9ded58d16ba472b31748626fb02ca0b086bb0e");

const migration = read("supabase/migrations/20260817000001_p75_advanced_audit_automation_runtime.sql");
check("new queue lane", migration.includes("then 'advanced_automation'"));
check("legacy queue retained", migration.includes("'advanced_human_review'"));
check("expanded event constraint", migration.includes("'automation_claimed'") && migration.includes("'automation_completed'"));
check("reason allowlist", migration.includes("'advanced_worker_lease'") && migration.includes("v_reason_code := case"));
check("no history rewrite", !/update\s+public\.velmere_audit_case_status_history/i.test(migration));
check("optional QA no customer append", !/velmere_assign_advanced_audit_reviewer[\s\S]*?perform public\.velmere_append_audit_case_status_history[\s\S]*?create or replace function public\.velmere_claim_advanced_audit_worker_lease/i.test(migration));
check("advanced claim RPC", migration.includes("velmere_claim_advanced_audit_worker_lease"));
check("advanced settle RPC", migration.includes("velmere_settle_advanced_audit_worker_lease"));
check("advanced atomic snapshot RPC", migration.includes("velmere_complete_advanced_audit_with_snapshot"));
check("service-role-only claim", migration.includes("grant execute on function public.velmere_claim_advanced_audit_worker_lease") && migration.includes("to service_role"));

const history = read("lib/security/audit-case-customer-history.ts");
check("TS reads advanced automation lane", history.includes('row.queue_lane === "advanced_automation"'));
check("TS advanced worker reason", history.includes('"advanced_worker_lease"'));

const orchestration = read("lib/security/audit-review-orchestration.ts");
check("Advanced processing mode", orchestration.includes('return tier === "advanced" ? "advanced_automation"'));
check("Advanced claim export", orchestration.includes("export async function claimAdvancedAuditWorkerLease"));
check("Advanced settle export", orchestration.includes("export async function settleAdvancedAuditWorkerLease"));
check("Advanced claim operation", orchestration.includes('operation: "audit_advanced_worker_lease_claim"'));
check("Advanced settle operation", orchestration.includes('operation: "audit_advanced_worker_lease_settle"'));
check("customer reviewer hidden", !orchestration.includes("humanReviewerAssigned: Boolean("));
check("customer SLA assignment hidden", !orchestration.includes("dueAt: current.slaDueAt"));
check("optional QA does not append memory customer history", !/assignAdvancedAuditReviewer[\s\S]*?appendMemoryAuditCaseHistoryEvent[\s\S]*?claimProAuditWorkerLease/.test(orchestration));

const snapshots = read("lib/security/audit-report-snapshot-store.ts");
check("Advanced atomic TS boundary", snapshots.includes("completeAdvancedAuditWorkerLeaseWithSnapshot") && snapshots.includes('operation: "audit_advanced_worker_complete_with_snapshot"'));
check("Advanced atomic tier binding", snapshots.includes('snapshot.tier !== "advanced"'));

for (const p of ["lib/server/lazy-route-modules/security--audit-watch--pro-pdf.ts", "lib/server/lazy-route-modules/security--audit-watch--pro-pdf--token.ts"]) {
  const s = read(p);
  check(`${p} no manual release gate`, !s.includes("readAdvancedAuditReleaseDeliveryGate"));
  check(`${p} automation gate`, s.includes("advanced_automation") && s.includes("getAuditReviewCustomerProjection"));
}

const legacyStatus = read("lib/server/security-route-modules/audit-advanced-manual-review.ts");
check("legacy status no manual gate", !legacyStatus.includes("readAdvancedAuditReleaseDeliveryGate"));
check("legacy status no human fields", !legacyStatus.includes("humanReviewerAssigned:") && !legacyStatus.includes("sla: review.sla"));
check("legacy status automated deliverable", legacyStatus.includes('review.processingMode !== "advanced_automation"') && legacyStatus.includes('review.state === "completed"'));

const registry = read("lib/db/supabase-rpc-operation-registry.ts");
check("RPC registry Advanced x3", registry.includes("audit_advanced_worker_lease_claim") && registry.includes("audit_advanced_worker_lease_settle") && registry.includes("audit_advanced_worker_complete_with_snapshot"));
check("Advanced claim route exists", fs.existsSync(path.join(root, "app/api/security/audit-review/advanced/claim/route.ts")));
check("Advanced settle route exists", fs.existsSync(path.join(root, "app/api/security/audit-review/advanced/settle/route.ts")));
check("Advanced settle implementation exists", fs.existsSync(path.join(root, "lib/server/lazy-route-modules/security--audit-review--advanced--settle.ts")));

const guard = read("lib/commerce/vlm-paid-surface-guard.ts");
check("STOP_SELL guard unchanged for Audit Advanced", guard.includes('audit_review: { surface: "audit", purpose: "audit", depths: ["pro"] }') && guard.includes('audit_pdf_issue: { surface: "audit", purpose: "audit", depths: ["pro"] }') && guard.includes('audit_pdf_download: { surface: "audit", purpose: "pdf", depths: ["pro"] }'));

const failed = checks.filter((x) => x.status === "FAIL");
const receipt = {
  schemaVersion: "velmere.p75.advanced-automation-runtime-static.v1",
  status: failed.length ? "FAIL" : "PASS",
  checks,
  zeroFakeCredit: {
    customerFinal: "0/20",
    auditFinalPdf: "0/3",
    paidValue: "0/10",
    saleEligible: "0/20",
    live: false,
    note: "P75 repairs current execution semantics only. It does not prove vulnerability ground truth, customer FINAL, PDF FINAL, rights, paid value, sale eligibility or LIVE readiness."
  }
};
console.log(JSON.stringify(receipt, null, 2));
