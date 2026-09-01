#!/usr/bin/env node
import fs from "node:fs";
import {verifyR44P4OfficialToolEvidence} from "../../lib/security/official-tool-evidence-verifier.mjs";
const load=(p)=>JSON.parse(fs.readFileSync(p,"utf8"));const clone=(v)=>structuredClone(v);
const policy=load("config/pass36/a102r44p4-official-toolchain-platform-policy.json");const index=load("evaluation/pass36/a102r44p4-official-tool-execution-index.json");const corpus=load("evaluation/pass36/a102r44p4-official-tool-corpus-index.json");
const checks=[];const check=(id,pass,detail=null)=>checks.push({id,passed:Boolean(pass),detail});
const clean=verifyR44P4OfficialToolEvidence(policy,index,corpus);check("clean:passes",clean.failed===0,clean);
const scenarios=[
 ["wrong-version",(p,_i,_c)=>{p.tools.find(x=>x.toolId==="semgrep").requiredVersion="1.129.0";}],
 ["wrong-executable-hash",(p)=>{p.tools[0].executableSha256="0".repeat(64);}],
 ["wrong-identity-hash",(p)=>{p.tools[1].identitySha256="1".repeat(64);}],
 ["missing-row",(p,i)=>{i.rows.pop();}],
 ["duplicate-row",(p,i)=>{i.rows.push(structuredClone(i.rows[0]));}],
 ["unknown-tool",(p,i)=>{i.rows[0].tool="unknown";}],
 ["wrong-source",(p,i)=>{i.rows[0].sourceSha256="2".repeat(64);}],
 ["malformed-receipt-hash",(p,i)=>{i.rows[0].receiptSha256="bad";}],
 ["real-credit-escalation",(p,i)=>{i.rows[0].realAuditCredit=true;}],
 ["live-credit-escalation",(p,i)=>{i.rows[0].liveCredit=true;}],
 ["slither-255-as-success",(p,i)=>{const r=i.rows.find(x=>x.tool==="slither"&&x.exitCode===255);r.terminalStatus="EXECUTED_SUCCESS";}],
 ["slither-findings-without-json-success",(p,i)=>{const r=i.rows.find(x=>x.tool==="slither"&&x.exitCode===255);r.parsedResult.jsonSuccess=false;}],
 ["semgrep-findings-with-error",(p,i)=>{const r=i.rows.find(x=>x.tool==="semgrep"&&x.terminalStatus==="EXECUTED_FINDINGS");r.parsedResult.errorCount=1;}],
 ["wrong-summary",(p,i)=>{i.completedOfficialExecutions=199;}],
 ["wrong-corpus-count",(p,i,c)=>{c.cases.pop();}],
];
for(const [id,mutate] of scenarios){const p=clone(policy),i=clone(index),c=clone(corpus);mutate(p,i,c);const r=verifyR44P4OfficialToolEvidence(p,i,c);check(`tamper:${id}:rejected`,r.failed>0,{failed:r.failed,first:r.failures[0]});}
const failed=checks.filter(x=>!x.passed);const out={schemaVersion:"velmere.pass36.a102r44p4.official-tool-evidence-tamper-test.v1",status:failed.length?"FAIL":"PASS",checks:checks.length,passed:checks.length-failed.length,failed:failed.length,rows:checks,realAuditCredit:0,liveCredit:0};console.log(JSON.stringify(out,null,2));if(failed.length)process.exit(1);
