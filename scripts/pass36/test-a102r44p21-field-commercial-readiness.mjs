#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  VLM_FIELD_DEFINITIONS,
  buildVlmFieldSourceClassCounts,
  evaluateVlmFieldLevelReadiness,
  isVlmFieldDirectlyReady,
  validateVlmFieldDefinitions,
} from "../../lib/commerce/vlm-field-level-readiness.ts";
import {
  buildVlmCommercialReadinessMatrix,
  controlledBetaCommercialGates,
  evaluateVlmCommercialReadiness,
  freeReleaseCommercialGates,
  paidSaleCommercialGates,
  requiredCommercialGates,
} from "../../lib/commerce/vlm-commercial-readiness.ts";
import {
  buildCurrentR44P21CommercialEvidence,
  currentR44P21CommercialEvidenceSnapshot,
} from "../../lib/commerce/vlm-current-commercial-evidence.ts";

const families=["audit","pdf","browser","shield","shield-map","real-markets","market-impact","whale-watch","angel","risk"];
const tiers=["basic","pro","advanced"];
const checks=[];
const check=(id,fn)=>{try{fn();checks.push({id,ok:true});}catch(error){checks.push({id,ok:false,error:error?.message??String(error)});}};
const readyState={
  VELMERE_OWNED:"AVAILABLE_OWNED",
  PUBLIC_BLOCKCHAIN_DIRECT:"AVAILABLE_PUBLIC_CHAIN",
  VELMERE_DERIVED:"AVAILABLE_DERIVED",
  USER_SUPPLIED:"AVAILABLE_USER_SUPPLIED",
  EXTERNAL_PROVIDER:"AVAILABLE_RIGHTS_APPROVED_PROVIDER",
  PUBLIC_REGULATOR_DATA:"AVAILABLE_PUBLIC_REGULATOR",
  MANUAL_REVIEW:"AVAILABLE_MANUAL_REVIEW",
  SYNTHETIC_FIXTURE:"SYNTHETIC_ONLY",
};
const fullFieldEvidence=Object.fromEntries(VLM_FIELD_DEFINITIONS.map((field)=>[field.id,{availability:readyState[field.sourceClass],alternativeReady:false}]));
const blockedProviderEvidence=Object.fromEntries(VLM_FIELD_DEFINITIONS.map((field)=>[field.id,{
  availability:field.sourceClass==="EXTERNAL_PROVIDER"?"BLOCKED_RIGHTS":field.sourceClass==="MANUAL_REVIEW"?"BLOCKED_OPERATIONS":readyState[field.sourceClass],
  alternativeReady:field.sourceClass==="EXTERNAL_PROVIDER"&&field.alternative.strategy==="HIDE_FIELD",
}]));
const allGateIds=[...new Set(families.flatMap((family)=>[
  ...freeReleaseCommercialGates(family),
  ...controlledBetaCommercialGates(family),
  ...paidSaleCommercialGates(family,"pro"),
  ...paidSaleCommercialGates(family,"advanced"),
]))];
const allGates=Object.fromEntries(allGateIds.map((id)=>[id,true]));
const none={gates:{},fieldEvidence:{},auditRecallBps:null,controlFlagBps:null,independentlyReviewedCases:0,realCustomerCases:0,rightsApprovedRows:0};
const full={gates:allGates,fieldEvidence:fullFieldEvidence,auditRecallBps:10_000,controlFlagBps:0,independentlyReviewedCases:50,realCustomerCases:10,rightsApprovedRows:100};

check("catalog:valid",()=>validateVlmFieldDefinitions());
check("catalog:exact-86",()=>assert.equal(VLM_FIELD_DEFINITIONS.length,86));
check("catalog:unique-ids",()=>assert.equal(new Set(VLM_FIELD_DEFINITIONS.map((x)=>x.id)).size,86));
check("catalog:all-families",()=>assert.deepEqual([...new Set(VLM_FIELD_DEFINITIONS.map((x)=>x.family))].sort(),[...families].sort()));
check("catalog:source-count-sum",()=>assert.equal(Object.values(buildVlmFieldSourceClassCounts()).reduce((a,b)=>a+b,0),86));

for(const field of VLM_FIELD_DEFINITIONS){
  check(`field:${field.id}:positive-weight`,()=>assert.ok(field.valueWeight>0));
  check(`field:${field.id}:source-ready-contract`,()=>{
    const expected=field.sourceClass!=="SYNTHETIC_FIXTURE";
    assert.equal(isVlmFieldDirectlyReady(field,{availability:readyState[field.sourceClass]}),expected);
  });
  if(field.sourceClass==="EXTERNAL_PROVIDER"){
    check(`field:${field.id}:provider-cannot-self-assert-owned`,()=>assert.equal(isVlmFieldDirectlyReady(field,{availability:"AVAILABLE_OWNED"}),false));
  }
}

for(const family of families){
  for(const tier of tiers){
    const fullFields=evaluateVlmFieldLevelReadiness({family,tier,evidence:fullFieldEvidence});
    check(`${family}:${tier}:full-fields-core`,()=>assert.equal(fullFields.coreDeliverable,true));
    check(`${family}:${tier}:full-fields-10000`,()=>{assert.equal(fullFields.fieldCompletionBps,10_000);assert.equal(fullFields.valueCompletionBps,10_000);});
    const emptyFields=evaluateVlmFieldLevelReadiness({family,tier,evidence:{}});
    check(`${family}:${tier}:empty-fields-block`,()=>assert.equal(emptyFields.coreDeliverable,false));
    const blocked=evaluateVlmCommercialReadiness({family,tier,evidence:none});
    check(`${family}:${tier}:empty-commercial-blocked`,()=>{assert.equal(blocked.readyForReleaseReview,false);assert.equal(blocked.saleEnabled,false);assert.equal(blocked.live,false);});
    const ready=evaluateVlmCommercialReadiness({family,tier,evidence:full});
    check(`${family}:${tier}:full-commercial-ready`,()=>{assert.equal(ready.readyForReleaseReview,true);assert.equal(ready.blockers.length,0);assert.equal(ready.gateCompletionBps,10_000);});
    check(`${family}:${tier}:never-auto-charges`,()=>{assert.equal(ready.publicPrice,null);assert.equal(ready.publicCheckoutAllowed,false);assert.equal(ready.chargeAllowed,false);assert.equal(ready.saleEnabled,false);});
    if(tier==="basic"){
      check(`${family}:basic:always-free`,()=>{assert.equal(ready.commercialTarget,"GO_FREE");assert.equal(ready.freeAccessGuaranteed,true);assert.equal(ready.targetPaid,false);assert.equal(ready.readyForFreeReleaseReview,true);});
    }else{
      check(`${family}:${tier}:paid-target-only`,()=>{assert.equal(ready.commercialTarget,"GO_PAID");assert.equal(ready.freeAccessGuaranteed,false);assert.equal(ready.targetPaid,true);assert.equal(ready.readyForControlledBetaReview,true);assert.equal(ready.readyForPaidSaleReview,true);});
    }
    for(const gate of requiredCommercialGates(family,tier)){
      const evidence={...full,gates:{...allGates,[gate]:false}};
      const result=evaluateVlmCommercialReadiness({family,tier,evidence});
      check(`${family}:${tier}:missing-${gate}-blocks`,()=>{assert.equal(result.readyForReleaseReview,false);assert.ok(result.blockers.includes(`missing_gate:${gate}`));});
    }
  }
}

for(const family of ["shield","shield-map","real-markets","market-impact","whale-watch","browser","audit","pdf","angel","risk"]){
  const result=evaluateVlmFieldLevelReadiness({family,tier:"basic",evidence:blockedProviderEvidence});
  check(`${family}:basic:provider-block-does-not-zero-owned-value`,()=>assert.ok(result.ownOnchainDerivedCompletionBps>0));
  check(`${family}:basic:provider-completion-zero`,()=>assert.equal(result.providerFieldCompletionBps,0));
}
for(const family of ["shield","shield-map","real-markets","market-impact","whale-watch"]){
  const result=evaluateVlmFieldLevelReadiness({family,tier:"basic",evidence:blockedProviderEvidence});
  check(`${family}:basic:core-survives-optional-provider`,()=>assert.equal(result.coreDeliverable,true));
}

check("shield:basic:quote-hidden-not-core-blocker",()=>{
  const result=evaluateVlmFieldLevelReadiness({family:"shield",tier:"basic",evidence:blockedProviderEvidence});
  assert.ok(result.hiddenFieldIds.includes("shield_quote"));
  assert.ok(!result.blockedFieldIds.includes("shield_quote"));
});
check("shield:pro:required-order-book-blocks",()=>{
  const result=evaluateVlmFieldLevelReadiness({family:"shield",tier:"pro",evidence:blockedProviderEvidence});
  assert.ok(result.blockedFieldIds.includes("shield_order_book"));
  assert.equal(result.coreDeliverable,false);
});
check("real-markets:basic:realtime-hidden",()=>{
  const result=evaluateVlmFieldLevelReadiness({family:"real-markets",tier:"basic",evidence:blockedProviderEvidence});
  assert.ok(result.hiddenFieldIds.includes("markets_current_quote"));
  assert.equal(result.coreDeliverable,true);
});
check("impact:basic:simulation-survives",()=>{
  const result=evaluateVlmFieldLevelReadiness({family:"market-impact",tier:"basic",evidence:blockedProviderEvidence});
  assert.equal(result.coreDeliverable,true);
  assert.ok(result.valueCompletionBps>5_000);
});
check("whale:basic:unclassified-is-safe",()=>{
  const result=evaluateVlmFieldLevelReadiness({family:"whale-watch",tier:"basic",evidence:blockedProviderEvidence});
  assert.equal(result.coreDeliverable,true);
  assert.ok(result.hiddenFieldIds.includes("whale_entity_labels"));
});

check("beta:does-not-require-customer-outcomes-before-start",()=>{
  const gates={...allGates,customer_value:false,support_refund_operations:false,payment_test_lifecycle:false,entitlement_revocation:false};
  const result=evaluateVlmCommercialReadiness({family:"audit",tier:"pro",evidence:{...full,gates,realCustomerCases:0}});
  assert.equal(result.readyForControlledBetaReview,true);
  assert.equal(result.readyForPaidSaleReview,false);
  assert.equal(result.readinessState,"READY_FOR_CONTROLLED_BETA_REVIEW");
});
check("paid:requires-customer-outcomes",()=>{
  const result=evaluateVlmCommercialReadiness({family:"audit",tier:"pro",evidence:{...full,realCustomerCases:9}});
  assert.ok(result.paidSaleBlockers.includes("real_customer_value_cases_below_10"));
  assert.equal(result.readyForPaidSaleReview,false);
});
check("advanced:requires-independent-50",()=>{
  const result=evaluateVlmCommercialReadiness({family:"audit",tier:"advanced",evidence:{...full,independentlyReviewedCases:49}});
  assert.ok(result.paidSaleBlockers.includes("independent_review_cases_below_50"));
});
check("provider:wrong-state-never-ready",()=>{
  const field=VLM_FIELD_DEFINITIONS.find((x)=>x.id==="shield_quote");
  assert.ok(field);
  assert.equal(isVlmFieldDirectlyReady(field,{availability:"AVAILABLE_OWNED"}),false);
});
check("synthetic:never-real-ready",()=>{
  const definition={...VLM_FIELD_DEFINITIONS[0],id:"synthetic-test",sourceClass:"SYNTHETIC_FIXTURE"};
  assert.equal(isVlmFieldDirectlyReady(definition,{availability:"SYNTHETIC_ONLY"}),false);
});
check("validation:duplicate-rejected",()=>assert.throws(()=>validateVlmFieldDefinitions([VLM_FIELD_DEFINITIONS[0],VLM_FIELD_DEFINITIONS[0]]),/field_id_duplicate/));
check("validation:bad-weight-rejected",()=>assert.throws(()=>validateVlmFieldDefinitions([{...VLM_FIELD_DEFINITIONS[0],id:"bad-weight",valueWeight:0}]),/field_weight_invalid/));
check("validation:required-not-included-rejected",()=>assert.throws(()=>validateVlmFieldDefinitions([{...VLM_FIELD_DEFINITIONS[0],id:"bad-required",includedTiers:["basic"],requiredTiers:["pro"],criticalTiers:[]}]),/required_tier_not_included/));
check("validation:critical-not-required-rejected",()=>assert.throws(()=>validateVlmFieldDefinitions([{...VLM_FIELD_DEFINITIONS[0],id:"bad-critical",includedTiers:["basic"],requiredTiers:[],criticalTiers:["basic"],coreDeliverable:false}]),/critical_tier_not_required/));
check("matrix:30-rows",()=>assert.equal(buildVlmCommercialReadinessMatrix({evidenceByFamily:{}}).length,30));

check("current-evidence:fail-closed-exact-windows",()=>{
  const snapshot=currentR44P21CommercialEvidenceSnapshot();
  assert.equal(snapshot.currentLocalGates.exact_windows,false);
  assert.equal(snapshot.rightsApprovedRows,0);
  assert.equal(snapshot.saleEnabled,false);
});
check("current-evidence:shield-basic-nonzero-with-provider-block",()=>{
  const result=evaluateVlmCommercialReadiness({family:"shield",tier:"basic",evidence:buildCurrentR44P21CommercialEvidence("shield")});
  assert.ok(result.overallReadinessBps>0);
  assert.equal(result.providerFieldCompletionBps,0);
  assert.equal(result.coreDeliverable,true);
});
check("current-evidence:shield-pro-required-provider-blocks",()=>{
  const result=evaluateVlmCommercialReadiness({family:"shield",tier:"pro",evidence:buildCurrentR44P21CommercialEvidence("shield")});
  assert.equal(result.coreDeliverable,false);
  assert.ok(result.blockedFieldIds.includes("shield_order_book"));
});
check("public-route:exposes-bounded-commercial-readiness",()=>{
  const route=fs.readFileSync("app/api/checkout/vlm-service/readiness/route.ts","utf8");
  assert.ok(route.includes("commercialReadiness"));
  assert.ok(route.includes("readyForPaidSaleReview"));
  assert.ok(route.includes("never returns Stripe secrets"));
  assert.ok(!route.includes("provider payloads: product"));
});

const failed=checks.filter((row)=>!row.ok);
console.log(JSON.stringify({
  schemaVersion:"velmere.pass36.a102r44p21.field-commercial-readiness-test.v1",
  status:failed.length?"FAIL":"PASS",
  checks:checks.length,
  passed:checks.length-failed.length,
  failed:failed.length,
  fieldDefinitions:VLM_FIELD_DEFINITIONS.length,
  rows:checks,
},null,2));
process.exit(failed.length?1:0);
