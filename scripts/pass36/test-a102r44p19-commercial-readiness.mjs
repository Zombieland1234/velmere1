#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  buildVlmCommercialReadinessMatrix,
  evaluateVlmCommercialReadiness,
  requiredCommercialGates,
} from "../../lib/commerce/vlm-commercial-readiness.ts";
import { currentSkuTruthSnapshot, getVlmCurrentSkuTruth } from "../../lib/commerce/vlm-current-sku-truth.ts";
import { buildVlmAdvancedOnlyTierPolicies } from "../../lib/commerce/vlm-tier-presentation-policy.ts";

const policy = JSON.parse(fs.readFileSync("config/pass36/a102r44p19-basic-free-pro-advanced-commercial-readiness-policy.json", "utf8"));
const families = ["audit","pdf","browser","shield","shield-map","real-markets","market-impact","whale-watch","angel","risk"];
const tiers = ["basic","pro","advanced"];
const locales = ["pl","en","de"];
const checks=[];
const check=(id,fn)=>{try{fn();checks.push({id,ok:true});}catch(error){checks.push({id,ok:false,error:error.message});}};
const allGates = Object.fromEntries(policy.gateIds.map((id)=>[id,true]));
const none = {gates:{},auditRecallBps:null,controlFlagBps:null,independentlyReviewedCases:0,realCustomerCases:0,rightsApprovedRows:0};
const full = {gates:allGates,auditRecallBps:10_000,controlFlagBps:0,independentlyReviewedCases:50,realCustomerCases:10,rightsApprovedRows:100};

for(const locale of locales){
  const snapshot=currentSkuTruthSnapshot(locale);
  check(`${locale}:snapshot-basic-free`,()=>{assert.equal(snapshot.basicAlwaysFree,true);assert.equal(snapshot.tiers.basic.freeAccessGuaranteed,true);assert.equal(snapshot.tiers.basic.commercialTarget,"GO_FREE");});
  check(`${locale}:snapshot-paid-targets`,()=>{assert.equal(snapshot.tiers.pro.commercialTarget,"GO_PAID");assert.equal(snapshot.tiers.advanced.commercialTarget,"GO_PAID");});
  const presentation=buildVlmAdvancedOnlyTierPolicies(locale);
  check(`${locale}:presentation-basic`,()=>{assert.equal(presentation.basic.paid,false);assert.equal(presentation.basic.targetPaid,false);assert.equal(presentation.basic.freeAccessGuaranteed,true);assert.deepEqual(presentation.basic.paymentRails,[]);});
  check(`${locale}:presentation-pro-advanced`,()=>{assert.equal(presentation.pro.targetPaid,true);assert.equal(presentation.advanced.targetPaid,true);assert.equal(presentation.pro.publicCheckoutAllowed,false);assert.equal(presentation.advanced.publicCheckoutAllowed,false);});
  for(const tier of tiers){
    const truth=getVlmCurrentSkuTruth(tier,locale);
    check(`${locale}:${tier}:no-current-charge`,()=>{assert.equal(truth.publicCheckoutAllowed,false);assert.equal(truth.publicPrice,null);assert.equal(truth.saleEnabled,false);assert.equal(truth.live,false);});
  }
}

for(const family of families){
  for(const tier of tiers){
    const blocked=evaluateVlmCommercialReadiness({family,tier,evidence:none});
    check(`${family}:${tier}:blocked-current`,()=>{assert.equal(blocked.readyForReleaseReview,false);assert.equal(blocked.chargeAllowed,false);assert.equal(blocked.publicCheckoutAllowed,false);assert.equal(blocked.publicPrice,null);assert.ok(blocked.blockers.length>0);});
    const ready=evaluateVlmCommercialReadiness({family,tier,evidence:full});
    check(`${family}:${tier}:all-evidence-review-ready`,()=>{assert.equal(ready.readyForReleaseReview,true);assert.equal(ready.blockers.length,0);assert.equal(ready.gateCompletionBps,10_000);assert.equal(ready.chargeAllowed,false);assert.equal(ready.publicCheckoutAllowed,false);});
    if(tier==="basic"){
      check(`${family}:basic:always-free`,()=>{assert.equal(ready.commercialTarget,"GO_FREE");assert.equal(ready.freeAccessGuaranteed,true);assert.equal(ready.targetPaid,false);assert.equal(ready.readinessState,"READY_FOR_FREE_RELEASE_REVIEW");});
    }else{
      check(`${family}:${tier}:sale-preparation-only`,()=>{assert.equal(ready.commercialTarget,"GO_PAID");assert.equal(ready.freeAccessGuaranteed,false);assert.equal(ready.targetPaid,true);assert.equal(ready.readinessState,"READY_FOR_PAID_RELEASE_REVIEW");assert.equal(ready.saleEnabled,false);});
    }
    for(const gate of requiredCommercialGates(family,tier)){
      const gates={...allGates,[gate]:false};
      const result=evaluateVlmCommercialReadiness({family,tier,evidence:{...full,gates}});
      check(`${family}:${tier}:missing-${gate}-blocks`,()=>{assert.equal(result.readyForReleaseReview,false);assert.ok(result.blockers.includes(`missing_gate:${gate}`));});
    }
  }
}

check("audit:basic-recall-threshold",()=>{const r=evaluateVlmCommercialReadiness({family:"audit",tier:"basic",evidence:{...full,auditRecallBps:7999}});assert.ok(r.blockers.includes("audit_recall_below_8000_bps"));});
check("audit:pro-recall-threshold",()=>{const r=evaluateVlmCommercialReadiness({family:"audit",tier:"pro",evidence:{...full,auditRecallBps:8999}});assert.ok(r.blockers.includes("audit_recall_below_9000_bps"));});
check("audit:advanced-recall-threshold",()=>{const r=evaluateVlmCommercialReadiness({family:"audit",tier:"advanced",evidence:{...full,auditRecallBps:9499}});assert.ok(r.blockers.includes("audit_recall_below_9500_bps"));});
check("audit:control-threshold",()=>{const r=evaluateVlmCommercialReadiness({family:"audit",tier:"advanced",evidence:{...full,controlFlagBps:251}});assert.ok(r.blockers.includes("control_flag_rate_above_250_bps"));});
check("advanced:independent-cases",()=>{const r=evaluateVlmCommercialReadiness({family:"browser",tier:"advanced",evidence:{...full,independentlyReviewedCases:49}});assert.ok(r.blockers.includes("independent_review_cases_below_50"));});
check("pro:customer-cases",()=>{const r=evaluateVlmCommercialReadiness({family:"browser",tier:"pro",evidence:{...full,realCustomerCases:9}});assert.ok(r.blockers.includes("real_customer_value_cases_below_10"));});
check("data:rights-rows",()=>{const r=evaluateVlmCommercialReadiness({family:"shield",tier:"basic",evidence:{...full,rightsApprovedRows:0}});assert.ok(r.blockers.includes("rights_approved_rows_zero"));});
check("unknown-family-throws",()=>assert.throws(()=>evaluateVlmCommercialReadiness({family:"unknown",tier:"basic",evidence:full}),/unsupported_commercial_family/));
check("matrix-30-rows",()=>{const rows=buildVlmCommercialReadinessMatrix({evidenceByFamily:{}});assert.equal(rows.length,30);});

const failed=checks.filter(x=>!x.ok);
console.log(JSON.stringify({schemaVersion:"velmere.pass36.a102r44p19.commercial-readiness-test.v1",status:failed.length?"FAIL":"PASS",checks:checks.length,passed:checks.length-failed.length,failed:failed.length,rows:checks},null,2));
process.exit(failed.length?1:0);
