#!/usr/bin/env python3
from __future__ import annotations
import json, re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
checks=[]
def check(i,c,d=None):
    row={'id':i,'status':'PASS' if c else 'FAIL'}
    if d is not None: row['detail']=d
    checks.append(row)
    if not c: raise AssertionError(f'{i}: {d}')
def text(rel): return (ROOT/rel).read_text(encoding='utf-8')
policy=text('lib/market-integrity/customer-paid-tier-exact-delivery-policy.ts')
access=text('lib/market-integrity/top1-entitlement-report-access.ts')
tier=text('lib/market-integrity/customer-report-tier-value.ts')
commercial=text('lib/market-integrity/worldclass-report-commercial-policy.ts')
delivery=text('lib/market-integrity/customer-report-delivery-policy.ts')
payload=text('lib/market-integrity/customer-report-payload.ts')
evidence=text('lib/market-integrity/real-markets-customer-evidence.ts')
orch=text('lib/market-integrity/real-markets-route-orchestrator.ts')
report=text('lib/server/market-integrity-route-modules/report.ts')
layout=text('lib/market-integrity/customer-report-layout-model.ts')
token=text('lib/market-integrity/customer-report-exact-pdf-token.ts')
pdf=text('lib/server/market-integrity-route-modules/report-pdf.ts')

# exact-tier policy and full deterministic input binding
for needle in [
 'payloadTier: VelmereTier | null', 'deliveryPolicyStatus: DeliveryPolicyStatus | null',
 'deliveryPolicyPaidEvidenceAllowed: boolean', 'canonicalJson(rebuilt) === canonicalJson(decision)',
 'silentDowngradeAllowed: false', 'humanReviewRequired: false',
 'explicitDowngradeAcceptanceRequired', 'toP98CustomerPaidTierDeliveryProjection',
 'toP98CustomerPaidTierWithheldPayload', 'p98_withheld_payload_requires_verified_decision',
]: check('policy_'+re.sub(r'\W+','_',needle).strip('_'), needle in policy)
check('policy_closed_decision_shape', 'const DECISION_KEYS = [' in policy and 'keys.length !== DECISION_KEYS.length' in policy)
check('policy_full_rebuild_uses_payload_tier', 'payloadTier: decision.payloadTier' in policy)
check('policy_full_rebuild_uses_delivery_status', 'status: decision.deliveryPolicyStatus' in policy)
check('policy_full_rebuild_uses_paid_flag', 'paidEvidenceAllowed: decision.deliveryPolicyPaidEvidenceAllowed' in policy)
check('policy_no_partial_field_comparison_verifier', 'rebuilt.requestedTier === decision.requestedTier' not in policy)
check('policy_customer_delivery_projection_hides_inputs', 'analyzedTier:' not in policy[policy.index('export type P98CustomerPaidTierDeliveryProjection'):policy.index('type DeliveryPolicyLike')])
check('policy_withheld_projection_no_decision_digest', 'decisionDigest' not in policy[policy.index('export function toP98CustomerPaidTierWithheldPayload'):])

# exact requested tier in both customer routes
check('orchestrator_exact_analysis_tier', 'const automatedDeliveryTier = requestedTier;' in orch)
check('report_exact_analysis_tier', 'const reportTier: VelmereTier = requestedReportTier;' in report)
for forbidden in ['pass4818AutomatedDeliveryTier', 'proFallbackDelivered', 'pending_manual_review']:
    check('orchestrator_no_'+forbidden, forbidden not in orch)
check('report_no_advanced_to_pro_map', 'requestedReportTier === "Advanced" ? "Pro"' not in report)
check('report_no_basic_fallback_payload', 'basicFallbackAvailable' not in report)
check('report_no_internal_readiness_response', 'commercialReadiness: pass4645AnalysisReadiness' not in report)
check('report_no_provider_ledger_response_on_withheld', 'providerEvidenceLedger: pass4645ProviderEvidenceLedger' not in report)
check('orchestrator_no_access_object_in_entitlement_error', 'access: pass2812RealMarketsAccessDecision' not in orch)
check('report_no_access_object_in_entitlement_error', 'access: pass2812ReportAccessDecision' not in report)

# all paid withholding paths use the closed P98 projection
check('report_source_failure_uses_p98_withheld', 'toP98CustomerPaidTierWithheldPayload(pass98SourceEvidenceWithheld)' in report)
check('report_entitlement_failure_uses_p98_withheld', 'toP98CustomerPaidTierWithheldPayload(pass98EntitlementWithheld)' in report)
check('report_readiness_failure_uses_p98_withheld', 'toP98CustomerPaidTierWithheldPayload(pass98ReadinessWithheld)' in report)
check('orchestrator_entitlement_failure_uses_p98_withheld', 'toP98CustomerPaidTierWithheldPayload(pass98EntitlementWithheld)' in orch)
check('orchestrator_final_failure_uses_p98_withheld', 'toP98CustomerPaidTierWithheldPayload(pass98CustomerPaidTierDeliveryDecision)' in orch)
check('report_final_failure_uses_p98_withheld', 'toP98CustomerPaidTierWithheldPayload(pass98PaidTierDeliveryDecision)' in report)

# policy must run before any customer paid artifact/token/layout creation
for src,name,decision,layout_marker,artifact_marker in [
 (orch,'orchestrator','const pass98CustomerPaidTierDeliveryDecision','const pass4819CustomerReportPreviewLayout','createPass4823RealMarketsPaidAccountArtifact'),
 (report,'report','const pass98PaidTierDeliveryDecision','const customerReportPreviewLayout','createPass4823RealMarketsPaidAccountArtifact'),
]:
    di=src.index(decision); li=src.index(layout_marker); ai=src.index(artifact_marker, di)
    check(name+'_decision_before_layout', di < li, {'decision':di,'layout':li})
    check(name+'_decision_before_paid_artifact', di < ai, {'decision':di,'artifact':ai})
    check(name+'_withheld_return_before_layout', src.index('toP98CustomerPaidTierWithheldPayload',di) < li)
check('orchestrator_success_uses_safe_projection', 'pass98CustomerPaidTierDelivery: toP98CustomerPaidTierDeliveryProjection' in orch)
check('report_success_uses_safe_projection', 'pass98PaidTierDelivery: toP98CustomerPaidTierDeliveryProjection' in report)
check('orchestrator_never_returns_full_p98_decision', 'pass98CustomerPaidTierDelivery: pass98CustomerPaidTierDeliveryDecision' not in orch)
check('report_never_returns_full_p98_decision', 'pass98PaidTierDelivery: pass98PaidTierDeliveryDecision' not in report)

# automated Advanced is not a manual-review SKU
for src,name in [(access,'access'),(tier,'tier_value'),(commercial,'commercial'),(delivery,'delivery'),(payload,'payload'),(layout,'layout'),(token,'token'),(pdf,'pdf')]:
    check(name+'_knows_advanced_delivery_mode', 'advancedDeliveryMode' in src)
check('access_automated_manual_signal_not_required', 'Human QA is optional and cannot create entitlement' in access)
check('access_automated_paid_ready', '"paid_evidence_ready"' in access)
check('tier_advanced_automation_gate', 'advanced_automation_not_verified' in tier and 'advanced_automation_test_missing' in tier)
check('tier_advanced_stress_gate', 'advanced_stress_scenarios_not_executed' in tier)
check('tier_advanced_evidence_gate', 'advanced_evidence_ledger_not_verified' in tier)
check('commercial_advanced_automated_not_for_sale', 'Optional human QA cannot unlock, substitute for, or add entitlement credit' in commercial)
check('delivery_advanced_exact_requested_rule', 'exact requested automated Advanced dossier' in delivery)
check('evidence_advanced_automated_section', 'real-markets-advanced-automated-synthesis' in evidence)
check('evidence_no_advanced_analyst_review', 'Advanced analyst review' not in evidence)
check('layout_automated_copy', 'Advanced automated' in layout or 'automated Advanced' in layout)
check('pdf_manual_gate_only_manual_mode', 'advancedDeliveryMode === "manual_review"' in pdf)

# current payload passes automation facts rather than human authority
check('payload_accepts_automation_verified', 'advancedAutomationVerified?: boolean' in payload)
check('orchestrator_automation_verified_explicit', 'pass98AdvancedAutomationVerified' in orch)
check('orchestrator_stress_false_explicit', 'pass98AutomatedStressScenarioExecuted = false' in orch)
check('report_automation_verified_explicit', 'advancedAutomationVerified:' in report)
check('report_advanced_stress_and_ledger_required', 'customerReportStressEvidenceReady' in report and 'customerReportEvidenceLedgerReady' in report)

failed=[r for r in checks if r['status']!='PASS']
receipt={
 'schemaVersion':'velmere.p98.paid-tier-exact-delivery-static.v1',
 'generatedAt':'2026-08-21T12:00:00.000Z',
 'status':'PASS_BOUNDED' if not failed else 'FAIL',
 'checks':{'total':len(checks),'passed':len(checks)-len(failed),'failed':len(failed),'rows':checks},
 'zeroFakeCredit':{'routeExecuted':False,'realEntitlement':False,'realProviderEvidence':False,'pdfGenerated':False,'accountArtifactCreated':False,'customerFinal':'0/20'},
 'truthBoundary':'Static source-order and contract proof for P98 exact paid-tier delivery. It does not execute Next.js routes, entitlement, providers, PDF storage, account delivery, builds or Customer FINAL.'
}
raw=json.dumps(receipt,indent=2)+'\n'
for rel in ['receipts/p98/P98_PAID_TIER_EXACT_DELIVERY_STATIC.json','artifacts/p98/P98_PAID_TIER_EXACT_DELIVERY_STATIC.json']:
 p=ROOT/rel;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(raw,encoding='utf-8')
print(json.dumps({'status':receipt['status'],'checks':receipt['checks']}))
raise SystemExit(1 if failed else 0)
