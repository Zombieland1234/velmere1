import fs from "node:fs";
import path from "node:path";
import { buildPass2587ServerPaymentAccountDeliveryGateReport } from "../p75-work/source/lib/security/server-payment-account-delivery-gate";
import { buildPass2594AuditEvidenceQaReleaseGateMatrixReport } from "../p75-work/source/lib/security/audit-evidence-qa-release-gate-matrix";
import { buildPass4643AuditTierValueProof } from "../p75-work/source/lib/security/audit-tier-value-proof";
import { buildAuditAccountCustomerSnapshot } from "../p75-work/source/lib/security/audit-account-customer-snapshot";
import { buildPass2376FinalDeliveryGate } from "../p75-work/source/lib/security/final-delivery-gate";

const outDir=process.env.P77_RESULT_DIR??process.cwd();
const fixed="2026-08-18T00:45:00.000Z";
const operatorBlocked={target:{chain:"ethereum",contractAddress:"0x1111111111111111111111111111111111111111",projectName:"P77"},summary:{canCustomerDeliverAdvanced:false,canFinalSignAdvanced:false,finalSignReadiness:0,operatorConsoleReadiness:0,critical:true,nextCriticalStep:"human lane intentionally unavailable"}} as any;
const paid={ok:true,ledgerMode:"memory",entitlement:{id:"ent-p77",auditQueueId:"AUD-P77Q01"}} as any;
const account={id:"msg-p77-0001",requestId:"req-p77-0001",accountId:"acct-p77",auditQueueId:"AUD-P77Q01",deliveryStatus:"analysis_queue"} as any;
const delivery=buildPass2587ServerPaymentAccountDeliveryGateReport({locale:"en",chain:"ethereum",contractAddress:"0x1111111111111111111111111111111111111111",projectName:"P77",reviewLevel:"advanced_review",paidAccessReceipt:paid,accountMessage:account,advancedOperatorConsoleMerge:operatorBlocked});
if(!delivery.summary.canDeliverAdvancedPrivately) throw new Error(`p77_operator_still_gates_payment_delivery:${JSON.stringify(delivery.summary)}`);
const paymentGate=delivery.gates.find((g)=>g.id==="advanced-private-queue");
if(!paymentGate || paymentGate.requiredProof.includes("operator console readiness")) throw new Error("p77_operator_proof_still_required");

const qa=buildPass2594AuditEvidenceQaReleaseGateMatrixReport({locale:"en",serverPaymentAccountDeliveryGate:delivery,advancedOperatorConsoleMerge:operatorBlocked} as any);
const advancedGate=qa.gates.find((g)=>g.id==="qa-advanced-deterministic-delivery");
if(!advancedGate || advancedGate.status!=="pass" || advancedGate.blocksAdvancedFinalSign) throw new Error(`p77_qa_deterministic_gate_failed:${JSON.stringify(advancedGate)}`);
if(!qa.summary.canReleaseAdvancedDeterministically) {
  const otherBlockers=qa.gates.filter((g)=>g.blocksAdvancedFinalSign && g.id!=="qa-advanced-deterministic-delivery");
  if(!otherBlockers.length) throw new Error("p77_qa_summary_inconsistent");
}

const valueBlocked=buildPass4643AuditTierValueProof({automatedFinalDeliveryReady:false,operatorFinalSignReady:true} as any);
const valueAutomated=buildPass4643AuditTierValueProof({automatedFinalDeliveryReady:true,operatorFinalSignReady:false} as any);
if(!valueBlocked.tiers.advanced.deliveryBlockers.includes("automated_final_delivery_not_ready")) throw new Error("p77_automated_delivery_blocker_missing");
if(valueAutomated.tiers.advanced.deliveryBlockers.includes("automated_final_delivery_not_ready")) throw new Error("p77_automated_delivery_blocker_not_removed");
if(valueAutomated.tiers.advanced.deliveryBlockers.some((x)=>x.includes("operator_final_sign"))) throw new Error("p77_legacy_operator_blocker_returned");

const pipeline={requestedTier:"advanced",deliveredTier:"advanced",releaseState:"INTERNAL_FIXTURE_ONLY",pipelineDigest:`sha256:${"2".repeat(64)}`,projection:{projectionDigest:`sha256:${"1".repeat(64)}`,report:{topFindings:[{severity:"high",title:"Evidence-bound fixture",publicLine:"Public evidence line",proLine:"Extended evidence line",advancedAction:"Automated re-check action",sourceFamily:"fixture"}]}},sourceTruth:{providerReceiptCount:5,contentBoundProviderReceiptCount:5,strictUpstreamRoots:["fixture-a","fixture-b"]},customerReportPreviewLayout:{layoutDigest:`sha256:${"3".repeat(64)}`},customerReport:{reportId:"p77-advanced-en-fixture",generatedAt:fixed,locale:"en",target:{name:"P77 Deterministic Delivery",symbol:"P77"},summary:{riskScore:42,confidenceScore:78},deliveryPolicy:{visibleTier:"ADVANCED"},decisionSections:[{title:"Risk summary",summary:"Evidence-bound fixture summary",actions:["Re-check current evidence"]}],missingEvidence:[]}} as any;
const snapshot=buildAuditAccountCustomerSnapshot({pipeline,accountIdHash:"a".repeat(64),requestId:"req-p77-0001",projectName:"P77 Deterministic Delivery",targetLabel:"P77"});
const messageBase={...account,locale:"en",canonicalCustomerSnapshot:snapshot} as any;
const routeHealth={ok:true,passId:"pass2374-customer-safe-route-health-endpoint-ping",locale:"en",generatedAt:fixed,routeHealthEndpoint:"/api/security/audit-watch/route-health?id=msg-p77-0001",focus:{id:account.id,requestId:account.requestId,accountMessageId:account.id,accountId:account.accountId},counts:{ready:3,linked:1,missing:0,admin_only:1,blocked:0},checks:[],recommendedAction:"none",safeBoundary:"fixture"} as any;
const ping={id:"ping-p77",passId:"pass2375-route-health-history-last-ping-stale-delivery-warning",focusKey:"route-p77",locale:"en",pingedAt:fixed,pingSource:"route_health_endpoint",routeHealthEndpoint:routeHealth.routeHealthEndpoint,deliveryWarningLevel:"ok",counts:routeHealth.counts,routeStates:{customer_report:"ready",safe_pdf_packet:"ready",account_message:"ready"},missingKeys:[],readyKeys:["customer_report","safe_pdf_packet","account_message"],blockedKeys:[],focus:routeHealth.focus,safeBoundary:"fixture"} as any;
const ledgerBase={ok:true,passId:"pass2375-route-health-history-last-ping-stale-delivery-warning",generatedAt:fixed,focusKey:"route-p77",source:"memory",durableStorageReady:false,lastPing:ping,lastEndpointPing:ping,lastPingAgeMinutes:1,lastEndpointPingAgeMinutes:1,staleAfterMinutes:15,deliveryWarningLevel:"ok",warnings:[],history:[ping],customerDeliveryAllowed:true,recommendedAction:"none",safeBoundary:"fixture"} as any;
async function gate(operatorStatus:string, ledger=ledgerBase, rh=routeHealth, snap:any=snapshot){return buildPass2376FinalDeliveryGate({locale:"en",message:{...messageBase,operatorStatus,canonicalCustomerSnapshot:snap} as any,routeHealth:rh,routeHealthLedger:ledger,staleAfterMinutes:15});}
const notMarked=await gate("pdf_attached"); const marked=await gate("customer_safe_ready");
if(!notMarked.canDeliver || !marked.canDeliver) throw new Error(`p77_operator_status_changes_delivery:${JSON.stringify({notMarked,marked})}`);
const withoutSnapshot=await gate("customer_safe_ready",ledgerBase,routeHealth,null);if(withoutSnapshot.canDeliver || !withoutSnapshot.reasons.some((r)=>r.key==="canonical_customer_snapshot_required")) throw new Error("p77_snapshot_gate_weakened");
const stale=await gate("pdf_attached",{...ledgerBase,lastEndpointPingAgeMinutes:99} as any);if(stale.canDeliver || !stale.reasons.some((r)=>r.key==="fresh_endpoint_ping_required")) throw new Error("p77_fresh_ping_gate_weakened");
const blockedWarning={key:"blocked-fixture",level:"blocked",summary:"blocked",nextAction:"fix"};const warned=await gate("pdf_attached",{...ledgerBase,customerDeliveryAllowed:false,deliveryWarningLevel:"blocked",warnings:[blockedWarning]} as any);if(warned.canDeliver) throw new Error("p77_warning_gate_weakened");
const noIdentity=await buildPass2376FinalDeliveryGate({locale:"en",message:{...messageBase,id:undefined,requestId:undefined,operatorStatus:"customer_safe_ready"} as any,routeHealth,routeHealthLedger:ledgerBase,staleAfterMinutes:15});if(noIdentity.canDeliver) throw new Error("p77_identity_gate_weakened");
const receipt={schemaVersion:"velmere.p77.deterministic-delivery-runtime.v1",status:"PASS",checks:["pass2587_operator_non_gating","pass2594_deterministic_advanced_gate","pass4643_automated_delivery_blocker","final_gate_operator_status_non_gating","immutable_snapshot_required","fresh_endpoint_ping_required","blocked_warning_fail_closed","message_identity_required"],zeroFakeCredit:{customerFinal:"0/20",auditFinalPdf:"0/3",rights:"2/203",paidValue:"0/10",saleEligible:"0/20",live:false}};
fs.mkdirSync(outDir,{recursive:true});fs.writeFileSync(path.join(outDir,"P77_DETERMINISTIC_DELIVERY_RUNTIME.json"),JSON.stringify(receipt,null,2)+"\n");console.log(JSON.stringify(receipt,null,2));
