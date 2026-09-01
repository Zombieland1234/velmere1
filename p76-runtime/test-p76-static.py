from __future__ import annotations
import argparse,json,re
from pathlib import Path
ap=argparse.ArgumentParser();ap.add_argument('--source-root',required=True);ap.add_argument('--receipt',required=True);a=ap.parse_args();root=Path(a.source_root);checks=[]
def add(name,ok,detail=None):checks.append({'name':name,'status':'PASS' if ok else 'FAIL','detail':detail})
def read(p):return (root/p).read_text(encoding='utf-8')
env=read('lib/security/advanced-audit-release-envelope.ts')
route=read('lib/server/lazy-route-modules/admin--security--advanced-audit-release.ts')
store=read('lib/security/advanced-audit-release-store.ts')
add('release_schema_v2','pass4801-advanced-audit-release-envelope-v2' in env)
add('human_gate_import_removed','buildPass2823AdvancedHumanReviewGate' not in env)
for needle in ['manual_review_not_releasable','operator_signature_missing','dual_control_approval_missing','advanced_release_primary_review_missing']:
 add('forbidden_blocker_absent:'+needle,needle not in env)
add('automation_completion_gate',all(x in env for x in ['advanced_automation_not_completed','advanced_automation_lease_active','advanced_immutable_snapshot_not_bound']))
add('dual_control_non_gating','required: false as const' in env and 'human_approval_must_not_gate_advanced_v17' in env)
add('optional_qa_cannot_unblock','advanced_release_optional_qa_requires_ready_automation' in env and 'state: blockers.length === 0 ? "ready"' not in env[env.index('export function approveAdvancedAuditReleaseEnvelope'):])
add('route_no_release_time_snapshot_builder','buildProAuditPdfSnapshot' not in route and 'persistAuditReportSnapshot' not in route)
add('route_requires_review_projection','getAuditReviewCustomerProjection' in route and 'review.processingMode !== "advanced_automation"' in route and 'review.state !== "completed"' in route and 'review.automationLeaseActive' in route)
add('route_requires_existing_snapshot','readAuditReportSnapshotForDelivery' in route and 'audit_report_snapshot_not_ready' not in route[route.index('export async function POST'):route.index('export async function PUT')])
add('route_no_primary_reviewer_release_role','operatorRequirement: { role: "primary_reviewer"' not in route[route.index('export async function POST'):route.index('export async function PUT')])
add('route_security_admin_is_auth_not_product_review','operatorRequirement: { role: "security_admin", requirePhishingResistantMfa: true }' in route)
add('route_no_manual_release_payload',all(x not in route for x in ['manualReviewReceiptId','operatorSignature: clean(value.operatorSignature','reviewerNote: clean(value.reviewerNote','requireDualControl:']))
add('route_boundary_automation_bound','Advanced issuance is automation-bound' in route)
add('store_has_no_dual_control_pending_promotion','envelope.blockers.length === 1' not in store and 'dual_control_approval_missing' not in store)
add('legacy_billing_alias_remains_explicitly_non_human', 'LEGACY BILLING ALIAS ONLY' in read('lib/security/audit-tier-contract.ts') and 'humanReviewRequired: false' in read('lib/security/audit-tier-contract.ts'))
failed=[c for c in checks if c['status']=='FAIL']
r={'schemaVersion':'velmere.p76.static-control.v1','status':'FAIL' if failed else 'PASS','checks':checks,'zeroFakeCredit':{'customerFinal':'0/20','auditFinalPdf':'0/3','rights':'2/203','paidValue':'0/10','saleEligible':'0/20','live':False,'note':'P76 release-authority and DB-runtime proof only.'}}
Path(a.receipt).write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(r,indent=2))
if failed:raise SystemExit('P76 static failed:'+','.join(c['name'] for c in failed))
