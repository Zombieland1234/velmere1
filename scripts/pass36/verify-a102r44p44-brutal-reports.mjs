#!/usr/bin/env node
import crypto from "node:crypto";import fs from "node:fs";import path from "node:path";
const args=process.argv.slice(2);const idx=args.indexOf("--reports");if(idx<0||!args[idx+1])throw new Error("reports_required");const dir=path.resolve(args[idx+1]);
const fail=(m,x={})=>{console.log(JSON.stringify({status:"FAIL_R44P44_BRUTAL_REPORTS",message:m,...x},null,2));process.exit(1)};
const read=(n)=>JSON.parse(fs.readFileSync(path.join(dir,n),"utf8"));
const summary=read("R44P44_BRUTAL_PRODUCT_REALITY_SUMMARY.json"),contracts=read("R44P44_CONTRACT50_TIER150.json"),angel=read("R44P44_ANGEL120_EVALUATION.json"),personas=read("R44P44_PERSONA100_JOURNEY2400.json"),claims=read("R44P44_CLAIM_SCAN.json"),manifest=read("R44P44_REPORTS_MANIFEST.json");
const checks=[];const add=(id,v)=>checks.push({id,passed:Boolean(v)});
add("global-no-go",summary.globalDecision==="NO_GO");
add("contracts-list",Array.isArray(contracts));
add("tier-150",contracts.length===150);
add("contract-50",new Set(contracts.map(r=>r.caseId)).size===50);
add("same-three-tiers",[...new Set(contracts.map(r=>r.tier))].sort().join(",")==="Advanced,Basic,Pro");
add("truth-invariant",contracts.every(r=>r.findingTruthSameAcrossTiers===true));
add("single-accuracy-forbidden",summary.contractCorpus?.singleAccuracyForbidden===true || summary.singleAccuracyForbidden===true || !Object.hasOwn(summary,"accuracy"));
add("angel-min",Number(angel.cases??angel.rows?.length??0)>=100);
add("angel-no-live-model",angel.realModelCalls===0);
add("angel-customer-zero",angel.customerProof===0&&angel.realCustomerCredit===0);
add("personas-list",Array.isArray(personas));
add("persona-100",new Set(personas.map(r=>r.personaId)).size===100);
add("journey-2400",personas.length===2400);
add("persona-customer-zero",personas.every(r=>r.customerProofCredit===0));
add("claim-scan",Array.isArray(claims)&&claims.length>0);
add("manifest-count",Array.isArray(manifest.files)&&manifest.files.length>=10);
for(const row of manifest.files??[]){const rel=row.path??row.name;const p=path.join(dir,rel);if(!fs.existsSync(p))fail("REPORT_MISSING",{path:rel});const bytes=fs.readFileSync(p),sha=crypto.createHash("sha256").update(bytes).digest("hex");if(row.sha256&&row.sha256!==sha)fail("REPORT_HASH",{path:rel,expected:row.sha256,actual:sha})}
if(checks.some(c=>!c.passed))fail("CHECKS",{checks,summary});console.log(JSON.stringify({status:"PASS_R44P44_BRUTAL_REPORTS",passed:checks.length,required:checks.length,contracts:50,tierRows:150,angelCases:angel.cases,personas:100,journeyRows:2400,claimMatches:claims.length,checks},null,2));
