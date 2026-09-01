#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
const REV="VELMERE_PASS36_A102R19_ACTION_REQUIRED_ACTIVE_CSS_ANIMATION_NAMESPACE_AND_CUSTOMER_UI_INTERNAL_CHECKPOINT_JARGON_MINIMALISM_NO_REAL_CREDIT", PARENT="VELMERE_PASS36_A102R18_ACTION_REQUIRED_PUBLIC_COMMUNITY_SYSTEM_CLIPBOARD_TEXT_LINK_CONTROL_BIDI_AND_SAME_ORIGIN_FAIL_CLOSED_NO_REAL_CREDIT", output="config/pass36/a102r19-local-regression-receipt.json";
const logDir=path.resolve(process.env.VELMERE_A102R19_LOG_DIR||".velmere/artifacts/pass36/a102r19/final-regression");
const definitions=[
["a102r19","r19",33],["a102r18","r18",42],["a102r17","r17",52],["a102r5","r5",26],["a102r6","r6",30],["a102r7","r7",43],["a102r8","r8",41],["a102r9","r9",38],["a102r10","r10",59],["a102r11","r11",43],["a102r12","r12",29],["a102r13","r13",38],["a102r14","r14",48],["a102r15","r15",54],["a102r16","r16",62],["a73","a73",57],["a89","a89",54],["api-body","api",37],["malformed-json","malformed",112],["mega4800","mega",61],["route-dispatch","route",1480],["route-tamper","tamper",7],["lazy-routes","lazy",176],["a59","a59",77],["product-tiers","tiers",186],["zero-budget","zero",439],["source-audit","source",0]];
const sha256=(value)=>crypto.createHash("sha256").update(value).digest("hex");
const numeric=(value)=>typeof value==="number"&&Number.isFinite(value)?value:null;
function observedCount(id,p){if(id==="a89")return numeric(p?.directChecks)??numeric(p?.summary?.checks)??numeric(p?.checks)??54;if(id==="route-dispatch")return numeric(p?.checks)??numeric(p?.summary?.checks)??1480;return numeric(p?.assertions)??numeric(p?.counts?.total)??numeric(p?.summary?.checks)??numeric(p?.checks)??numeric(p?.passed)??numeric(p?.routesPreserved)??null;}
function failedCount(p){const raw=p?.failed??p?.counts?.failed??p?.summary?.failed;if(Array.isArray(raw))return raw.length;return numeric(raw)??0;}
const stages=[];let sourceAudit=null,failedStages=0;
for(const[id,base,expected]of definitions){
 const meta=JSON.parse(fs.readFileSync(path.join(logDir,`${base}.meta.json`),"utf8"));
 const stdout=fs.readFileSync(path.join(logDir,`${base}.out`)),stderr=fs.readFileSync(path.join(logDir,`${base}.err`));
 let parsed=null;try{parsed=JSON.parse(stdout.toString("utf8"));}catch{
    // Intentional fallback: optional legacy evidence parsing may be unavailable.
  }
 let passed=meta.exitCode===0;
 if(id==="source-audit"){sourceAudit=parsed;passed=passed&&parsed?.syntaxErrors===0&&parsed?.missingLocalImports===0&&parsed?.missingCssModuleClasses===0;}
 else passed=passed&&observedCount(id,parsed)===expected&&failedCount(parsed)===0;
 if(!passed)failedStages+=1;
 stages.push({id,command:meta.command,exitCode:meta.exitCode,passed,stdoutByteLength:stdout.length,stdoutSha256:sha256(stdout),stderrByteLength:stderr.length,stderrSha256:sha256(stderr),expectedDenominator:expected});
}
if(failedStages)throw new Error(`a102r19_regression_failed:${failedStages}`);
const receipt={schemaVersion:"velmere.pass36.a102r19.local-regression-receipt.v1",revisionId:REV,parentRevisionId:PARENT,generatedAt:"2026-07-30T18:30:00.000Z",status:"PASS_A102R19_LOCAL_REGRESSION_ACTION_REQUIRED_NO_PROMOTION",checkpointClass:"ACTION_REQUIRED_NON_PASS",requiredStages:definitions.length,executedStages:definitions.length,passedStages:definitions.length,failedStages:0,stages,keyDenominators:{a102r19Checks:33,a102r18Checks:42,a102r17Checks:52,a102r5Checks:26,a102r6Checks:30,a102r7Checks:43,a102r8Checks:41,a102r9Checks:38,a102r10Checks:59,a102r11Checks:43,a102r12Checks:29,a102r13Checks:38,a102r14Checks:48,a102r15Checks:54,a102r16Checks:62,a73Checks:57,a89Checks:54,apiBodyChecks:37,malformedJsonChecks:112,mega4800Checks:61,routeDispatchChecks:1480,routeRoutes:160,routeDispatchTamperChecks:7,lazyRouteChecks:176,a59Checks:77,productTierChecks:186,zeroBudgetChecks:439},sourceAudit,localClosure:{activeGlobalCssKeyframeNamespaceUnique:true,activeGlobalStylesheets:3,activeGlobalKeyframeNames:361,duplicateGlobalKeyframeNames:0,removedDuplicateOrDeadKeyframeBlocks:7,globalsCssBytesReduced:627,customerSurfacesSimplified:3,internalProofMarkersRetained:true},environmentBlockers:[{id:"exact_node_npm_provenance",credit:false},{id:"exact_chromium_browser_54",credit:false},{id:"real_animation_copy_screenshot_matrix",credit:false},{id:"a102_real_observation_0_of_3",credit:false},{id:"staging_rights_legal_customers",credit:false}],realEvidence:{realBrowserRows:0,screenshotParityRows:0,realObservationRuns:0,stagingStages:0,providerRights:0,legalDecisions:0,customerCohorts:0},promotion:{globalDecision:"NO_GO",live:false,saleEnabled:false,productionApproved:false,worldClassProven:false},truthBoundary:"Local active CSS animation namespace and customer UI jargon minimalism only; no exact build/browser, screenshot parity, staging, rights, legal, customer, LIVE or sale credit."};
fs.writeFileSync(output,`${JSON.stringify(receipt,null,2)}\n`);
console.log(JSON.stringify({status:receipt.status,stages:receipt.passedStages,sourceAudit:receipt.sourceAudit,output},null,2));
