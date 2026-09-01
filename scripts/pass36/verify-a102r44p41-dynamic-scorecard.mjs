#!/usr/bin/env node
import fs from "node:fs";
const REV="VELMERE_PASS36_A102R44P41_ACTION_REQUIRED_OFFICIAL_FOUNDRY_INVARIANTS_ANVIL_RAW_RPC_EXACT_OFFLINE_FULL_LINUX_RELEASE_NO_LIVE_CREDIT";
const data=JSON.parse(fs.readFileSync("config/pass36/r44p41-dynamic-scorecard.json","utf8"));
const parent=JSON.parse(fs.readFileSync("config/pass36/r44p39-dynamic-scorecard.json","utf8"));
const rows=[];const check=(id,passed,detail=null)=>rows.push({id,passed:Boolean(passed),detail});
check("revision",data.revisionId===REV&&data.testCycle==="0/3");
check("products",data.products.length===17&&new Set(data.products.map(r=>r.productId)).size===17);
const moved=data.products.filter(r=>r.deltaDynamicQuality!==0);
check("only-audit-moves",moved.length===3&&moved.every(r=>r.productClass==="AUDIT"),moved.map(r=>r.productId));
for(const product of data.products){const old=parent.products.find(r=>r.productId===product.productId);check(`previous:${product.productId}`,old&&product.previousDynamicQuality===old.dynamicQuality);if(product.productClass!=="AUDIT")check(`unchanged:${product.productId}`,product.dynamicQuality===old.dynamicQuality&&product.deltaDynamicQuality===0);check(`customer-zero:${product.productId}`,product.customerProof===0);check(`world-class-cap:${product.productId}`,product.worldClassEvidence<50);}
for(const id of ["audit-basic","audit-pro","audit-advanced"]){const p=data.products.find(r=>r.productId===id);for(const gate of ["official-foundry-invariant-campaign","replayable-counterexamples","local-anvil-raw-rpc-binding"])check(`${id}:${gate}`,p.changedGates.some(r=>r.gateId===gate&&r.after==="RUNTIME_TESTED"));}
check("no-promotion",data.globalDecision==="NO_GO"&&data.live===false&&data.saleEnabled===false&&data.productionApproved===false&&data.worldClassProven===false);
const failed=rows.filter(r=>!r.passed);console.log(JSON.stringify({schemaVersion:"velmere.pass36.a102r44p41.dynamic-scorecard-verification.v1",status:failed.length?"FAIL_R44P41_DYNAMIC_SCORECARD":"PASS_R44P41_DYNAMIC_SCORECARD",checks:rows.length,passed:rows.length-failed.length,failed:failed.length,rows},null,2));if(failed.length)process.exit(1);
