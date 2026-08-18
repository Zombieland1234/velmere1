from __future__ import annotations
import argparse,hashlib,json,re
from pathlib import Path
ap=argparse.ArgumentParser();ap.add_argument('--source-root',required=True);ap.add_argument('--migration',required=True);ap.add_argument('--receipt',required=True);a=ap.parse_args()
root=Path(a.source_root); migration=Path(a.migration); checks=[]
def add(name,ok,detail=None): checks.append({'name':name,'status':'PASS' if ok else 'FAIL','detail':detail})
def read(p): return (root/p).read_text(encoding='utf-8')
def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
add('migration_sha',sha(migration)=='fa56abf0a1dc4d72794ea916e7569f06fe5b601865fee1cd23198737a1773cc2',sha(migration))
s=migration.read_text(encoding='utf-8')
add('migration_dollar_quotes_balanced',s.count('$$')%2==0,s.count('$$'))
add('history_constraints_extended',all(x in s for x in ["'advanced_automation'","'automation_claimed'","'automation_completed'","'advanced_worker_lease'"]))
add('history_rows_not_rewritten',re.search(r'update\s+public\.velmere_audit_case_status_history',s,re.I) is None)
add('queue_maps_current_advanced',"when p_status = 'queued_paid_review' and p_tier = 'advanced' then 'advanced_automation'" in s)
add('legacy_queue_only_compatible',"'advanced_human_review'" in s)
assign=s[s.index('create or replace function public.velmere_assign_advanced_audit_reviewer'):s.index('create or replace function public.velmere_claim_advanced_audit_worker_lease')]
add('optional_qa_does_not_change_execution_state',"review_state = 'assigned'" not in assign and "'advanced', 'queued'" in assign)
add('optional_qa_not_customer_history', 'velmere_append_audit_case_status_history' not in assign)
add('advanced_worker_sql_x3',all(x in s for x in ['velmere_claim_advanced_audit_worker_lease','velmere_settle_advanced_audit_worker_lease','velmere_complete_advanced_audit_with_snapshot']))
add('advanced_snapshot_atomic_tier_binding',"p_snapshot_json->>'tier' <> 'advanced'" in s and "where case_ref = p_case_ref and tier = 'advanced'" in s)
add('service_role_acl',s.count('to service_role;')>=5,s.count('to service_role;'))

history=read('lib/security/audit-case-customer-history.ts')
add('ts_history_current_lane','row.queue_lane === "advanced_automation"' in history)
add('ts_history_advanced_worker_reason','"advanced_worker_lease"' in history)
orch=read('lib/security/audit-review-orchestration.ts')
add('ts_advanced_claim','export async function claimAdvancedAuditWorkerLease' in orch and 'operation: "audit_advanced_worker_lease_claim"' in orch)
add('ts_advanced_settle','export async function settleAdvancedAuditWorkerLease' in orch and 'operation: "audit_advanced_worker_lease_settle"' in orch)
add('customer_projection_hides_human_qa','humanReviewerAssigned: Boolean(' not in orch and 'humanReviewerAssigned: false' in orch)
add('customer_projection_hides_human_sla','dueAt: current.slaDueAt' not in orch and 'dueAt: null' in orch)
add('memory_optional_qa_preserves_state','state: "assigned"' not in orch[orch.index('export async function assignAdvancedAuditReviewer'):orch.index('export async function claimProAuditWorkerLease')])
store=read('lib/security/audit-report-snapshot-store.ts')
add('ts_advanced_atomic_snapshot','completeAdvancedAuditWorkerLeaseWithSnapshot' in store and 'operation: "audit_advanced_worker_complete_with_snapshot"' in store and 'snapshot.tier !== "advanced"' in store)
for p in ['lib/server/lazy-route-modules/security--audit-watch--pro-pdf.ts','lib/server/lazy-route-modules/security--audit-watch--pro-pdf--token.ts']:
 q=read(p);add(p+':no_manual_release','readAdvancedAuditReleaseDeliveryGate' not in q);add(p+':advanced_automation_gate','advanced_automation' in q and 'getAuditReviewCustomerProjection' in q)
legacy=read('lib/server/security-route-modules/audit-advanced-manual-review.ts')
add('legacy_named_status_is_automation_only','readAdvancedAuditReleaseDeliveryGate' not in legacy and 'review.processingMode !== "advanced_automation"' in legacy and 'humanReviewerAssigned:' not in legacy and 'sla: review.sla' not in legacy)
reg=read('lib/db/supabase-rpc-operation-registry.ts')
add('rpc_registry_x3',all(x in reg for x in ['audit_advanced_worker_lease_claim','audit_advanced_worker_lease_settle','audit_advanced_worker_complete_with_snapshot']))
for p in ['app/api/security/audit-review/advanced/claim/route.ts','app/api/security/audit-review/advanced/settle/route.ts','lib/server/lazy-route-modules/security--audit-review--advanced--settle.ts']:
 add(p+':exists',(root/p).is_file())
guard=read('lib/commerce/vlm-paid-surface-guard.ts')
add('stop_sell_guard_unchanged',all(x in guard for x in ['audit_review: { surface: "audit", purpose: "audit", depths: ["pro"] }','audit_pdf_issue: { surface: "audit", purpose: "audit", depths: ["pro"] }','audit_pdf_download: { surface: "audit", purpose: "pdf", depths: ["pro"] }']))
failed=[c for c in checks if c['status']=='FAIL']
r={'schemaVersion':'velmere.p75.static-control.v1','status':'FAIL' if failed else 'PASS','checks':checks,'zeroFakeCredit':{'customerFinal':'0/20','auditFinalPdf':'0/3','paidValue':'0/10','saleEligible':'0/20','live':False,'worldClassProven':False,'note':'P75 is execution/runtime repair only; no vulnerability ground truth or customer-final credit.'}}
Path(a.receipt).write_text(json.dumps(r,indent=2)+'\n',encoding='utf-8');print(json.dumps(r,indent=2))
if failed: raise SystemExit('P75 static controls failed: '+','.join(c['name'] for c in failed))
