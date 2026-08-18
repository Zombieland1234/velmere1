from __future__ import annotations
import argparse,json
from pathlib import Path
ap=argparse.ArgumentParser();ap.add_argument('--source-root',required=True);ap.add_argument('--receipt',required=True);a=ap.parse_args();root=Path(a.source_root)
paths={
'final':'lib/security/final-delivery-gate.ts','route':'lib/server/lazy-route-modules/admin--security--audit-messages--operator-actions.ts','messages':'lib/account/audit-account-messages.ts','drawer_actions':'lib/security/linked-request-drawer-actions.ts','receipt':'lib/security/delivery-receipt-ledger.ts','vault':'lib/security/audit-case-vault-private-delivery-ledger.ts','payment':'lib/security/server-payment-account-delivery-gate.ts','value':'lib/security/audit-tier-value-proof.ts','qa':'lib/security/audit-evidence-qa-release-gate-matrix.ts','handler':'lib/security/audit-watch-post-handler.ts','drawer':'lib/security/linked-request-drawer.ts','details':'lib/security/payment-evidence-redacted-details.ts'}
t={k:(root/v).read_text(encoding='utf-8') for k,v in paths.items()}
checks=[]
def c(name,ok,detail=None):checks.append({'name':name,'status':'PASS' if ok else 'FAIL','detail':detail})
c('final_delivery_operator_not_in_eligibility','operator_not_customer_safe_ready' not in t['final'] and '&& operatorReady' not in t['final'])
c('final_delivery_immutable_snapshot_retained','canonical_customer_snapshot_required' in t['final'] and 'canonicalSnapshotReady' in t['final'])
c('final_delivery_fresh_endpoint_ping_retained','fresh_endpoint_ping_required' in t['final'] and 'endpointPingFresh' in t['final'])
c('final_delivery_blocked_stale_warning_retained','zeroBlockedWarnings' in t['final'] and 'zeroStaleWarnings' in t['final'])
c('delivery_route_security_admin_auth_only','operatorRequirement: { role: "security_admin", requirePhishingResistantMfa: true }' in t['route'] and 'role: "primary_reviewer"' not in t['route'])
c('mark_ready_optional_non_gating_copy','mark_ready is optional internal annotation only' in t['messages'] and 'does not unlock or block delivery' in t['messages'])
c('drawer_action_recommends_direct_delivery','return "deliver_customer_safe_report"' in t['drawer_actions'] and 'return "mark_ready"' not in t['drawer_actions'])
c('receipt_default_fail_closed_blocked','raw.status ?? "blocked"' in t['receipt'])
c('vault_uses_automated_delivery_ready','const automatedDeliveryReady' in t['vault'] and 'operatorReadiness' in t['vault'] and 'non-gating' in t['vault'])
c('payment_gate_drops_operator_customer_delivery','Boolean(operator?.summary.canCustomerDeliverAdvanced)' not in t['payment'])
c('payment_gate_keeps_receipt_scope_redaction_replay','server delivery gate state' in t['payment'] and 'redaction gate state' in t['payment'] and 'receipt replay' in t['payment'].lower())
c('value_proof_automated_delivery_input','automatedFinalDeliveryReady?: boolean | null' in t['value'])
c('value_proof_no_operator_final_sign_blocker','operator_final_sign_not_ready' not in t['value'] and 'automated_final_delivery_not_ready' in t['value'])
c('value_proof_legacy_operator_ignored','operatorFinalSignIgnoredForEligibility: true' in t['value'])
c('qa_deterministic_advanced_gate','qa-advanced-deterministic-delivery' in t['qa'] and 'qa-advanced-final-signoff' not in t['qa'])
c('qa_advanced_uses_server_delivery','const advancedOk = Boolean(delivery?.summary.canDeliverAdvancedPrivately);' in t['qa'])
c('qa_exposes_deterministic_summary','canReleaseAdvancedDeterministically: boolean' in t['qa'] and 'canReleaseAdvancedDeterministically:' in t['qa'])
c('qa_manual_decision_removed','manual operator decision' not in t['qa'] and 'human final sign' not in t['qa'])
c('handler_value_uses_automated_delivery','automatedFinalDeliveryReady: pass2587ServerPaymentAccountDeliveryGate.summary.canDeliverAdvancedPrivately' in t['handler'])
c('handler_uses_new_qa_gate','qa-advanced-deterministic-delivery' in t['handler'] and 'qa-advanced-final-signoff' not in t['handler'])
c('handler_delivery_uses_deterministic_summary','summary.canReleaseAdvancedDeterministically' in t['handler'])
c('drawer_copy_mark_ready_non_authoritative','mark_ready does not authorize delivery' in t['drawer'])
c('redacted_details_copy_deterministic','deterministic customer-safe delivery gates' in t['details'] and 'mark_ready is optional metadata only' in t['details'])
failed=[x for x in checks if x['status']!='PASS'];receipt={'schemaVersion':'velmere.p77.static-control.v1','status':'PASS' if not failed else 'FAIL','checks':checks,'checkCount':len(checks),'zeroFakeCredit':{'customerFinal':'0/20','auditFinalPdf':'0/3','rights':'2/203','paidValue':'0/10','saleEligible':'0/20','live':False}}
Path(a.receipt).write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8');print(json.dumps(receipt,indent=2));raise SystemExit(1 if failed else 0)
