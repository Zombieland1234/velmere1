#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

const run=spawnSync(process.execPath,["scripts/pass36/build-a102r44p22-ruthless-customer-matrix.mjs"],{cwd:process.cwd(),encoding:"utf8",maxBuffer:16*1024*1024});
assert.equal(run.status,0,run.stderr);
const matrix=JSON.parse(run.stdout);
const checks=[];
const check=(id,fn)=>{try{fn();checks.push({id,ok:true});}catch(error){checks.push({id,ok:false,error:error?.message??String(error)});}};
check("matrix:15-personas",()=>assert.equal(matrix.summary.personas,15));
check("matrix:20-steps",()=>assert.equal(matrix.summary.stepsPerPersona,20));
check("matrix:300-rows",()=>assert.equal(matrix.rows.length,300));
check("matrix:unique-persona-step",()=>assert.equal(new Set(matrix.rows.map((row)=>`${row.personaId}:${row.stepId}`)).size,300));
check("matrix:required-fields",()=>{for(const row of matrix.rows)for(const key of ["persona","step","expectation","actual","problem","severity","purchaseImpact","trustImpact","refundImpact","implementation","acceptanceTest","status"])assert.ok(String(row[key]??"").length>0,`${row.personaId}:${row.stepId}:${key}`);});
check("matrix:all-personas-have-preview",()=>assert.equal(matrix.rows.filter((row)=>row.stepId==="paid-preview").length,15));
check("matrix:all-personas-have-refund",()=>assert.equal(matrix.rows.filter((row)=>row.stepId==="refund").length,15));
check("matrix:external-lifecycle-not-falsely-proven",()=>{for(const row of matrix.rows.filter((row)=>["checkout","access-grant","access-revocation","refund","account-delete"].includes(row.stepId)))assert.equal(row.status,"BLOCKED");});
check("matrix:preview-acceptance-no-leak",()=>{for(const row of matrix.rows.filter((row)=>row.stepId==="paid-preview"))assert.match(row.acceptanceTest,/No report ID, target, source, token, entitlement/);});
check("matrix:no-live",()=>{assert.equal(matrix.globalDecision,"NO_GO");assert.equal(matrix.saleEnabled,false);assert.equal(matrix.customerProven,false);});
const failed=checks.filter((row)=>!row.ok);
console.log(JSON.stringify({schemaVersion:"velmere.pass36.a102r44p22.ruthless-customer-matrix-test.v1",status:failed.length?"FAIL":"PASS",checks:checks.length,passed:checks.length-failed.length,failed:failed.length,rows:checks},null,2));
process.exit(failed.length?1:0);
