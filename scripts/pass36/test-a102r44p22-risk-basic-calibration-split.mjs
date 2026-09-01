#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  controlledBetaCommercialGates,
  evaluateVlmCommercialReadiness,
  freeReleaseCommercialGates,
  paidSaleCommercialGates,
} from "../../lib/commerce/vlm-commercial-readiness.ts";
import { VLM_FIELD_DEFINITIONS } from "../../lib/commerce/vlm-field-level-readiness.ts";

const checks=[];
const check=(id,fn)=>{try{fn();checks.push({id,ok:true});}catch(error){checks.push({id,ok:false,error:error?.message??String(error)});}};
const readyState={
  VELMERE_OWNED:"AVAILABLE_OWNED",PUBLIC_BLOCKCHAIN_DIRECT:"AVAILABLE_PUBLIC_CHAIN",VELMERE_DERIVED:"AVAILABLE_DERIVED",
  USER_SUPPLIED:"AVAILABLE_USER_SUPPLIED",EXTERNAL_PROVIDER:"AVAILABLE_RIGHTS_APPROVED_PROVIDER",PUBLIC_REGULATOR_DATA:"AVAILABLE_PUBLIC_REGULATOR",
  MANUAL_REVIEW:"AVAILABLE_MANUAL_REVIEW",SYNTHETIC_FIXTURE:"SYNTHETIC_ONLY",
};
const fields=Object.fromEntries(VLM_FIELD_DEFINITIONS.map((field)=>[field.id,{availability:readyState[field.sourceClass],alternativeReady:false}]));
const gates=[...new Set([
  ...freeReleaseCommercialGates("risk"),
  ...controlledBetaCommercialGates("risk","pro"),
  ...paidSaleCommercialGates("risk","advanced"),
])];
const all=Object.fromEntries(gates.map((gate)=>[gate,true]));
const evidence={gates:all,fieldEvidence:fields,auditRecallBps:10_000,controlFlagBps:0,independentlyReviewedCases:50,realCustomerCases:10,rightsApprovedRows:100};

check("basic:free-gates-exclude-probability",()=>assert.equal(freeReleaseCommercialGates("risk").includes("probability_calibration"),false));
check("pro:beta-gates-require-probability",()=>assert.equal(controlledBetaCommercialGates("risk","pro").includes("probability_calibration"),true));
check("advanced:paid-gates-require-probability",()=>assert.equal(paidSaleCommercialGates("risk","advanced").includes("probability_calibration"),true));
check("basic:ready-without-probability-calibration",()=>{
  const result=evaluateVlmCommercialReadiness({family:"risk",tier:"basic",evidence:{...evidence,gates:{...all,probability_calibration:false}}});
  assert.equal(result.readyForFreeReleaseReview,true);
  assert.equal(result.freeReleaseBlockers.includes("missing_gate:probability_calibration"),false);
});
check("pro:blocked-without-probability-calibration",()=>{
  const result=evaluateVlmCommercialReadiness({family:"risk",tier:"pro",evidence:{...evidence,gates:{...all,probability_calibration:false}}});
  assert.equal(result.readyForControlledBetaReview,false);
  assert.ok(result.controlledBetaBlockers.includes("missing_gate:probability_calibration"));
});
check("advanced:blocked-without-probability-calibration",()=>{
  const result=evaluateVlmCommercialReadiness({family:"risk",tier:"advanced",evidence:{...evidence,gates:{...all,probability_calibration:false}}});
  assert.equal(result.readyForPaidSaleReview,false);
  assert.ok(result.paidSaleBlockers.includes("missing_gate:probability_calibration"));
});
check("basic:still-descriptive-field-model",()=>{
  const probability=VLM_FIELD_DEFINITIONS.find((field)=>field.id==="risk_probability_calibration");
  assert.ok(probability);
  assert.equal(probability.includedTiers.includes("basic"),false);
});

const failed=checks.filter((row)=>!row.ok);
console.log(JSON.stringify({
  schemaVersion:"velmere.pass36.a102r44p22.risk-basic-calibration-split-test.v1",
  status:failed.length?"FAIL":"PASS",checks:checks.length,passed:checks.length-failed.length,failed:failed.length,rows:checks,
},null,2));
process.exit(failed.length?1:0);
