#!/usr/bin/env node
import assert from 'node:assert/strict';
import { evaluateNpmAudit } from './verify-npm-audit.mjs';

function report(overrides={}){
  const base={info:0,low:0,moderate:0,high:0,critical:0,total:0};
  const counts={...base,...overrides};
  if(!Object.hasOwn(overrides,'total')) counts.total=counts.info+counts.low+counts.moderate+counts.high+counts.critical;
  return {auditReportVersion:2,vulnerabilities:{},metadata:{vulnerabilities:counts}};
}

const tests=[];
function test(name,fn){
  try{fn();tests.push({name,ok:true});}
  catch(error){tests.push({name,ok:false,error:error instanceof Error?error.message:String(error)});}
}

test('clean_passes',()=>{
  assert.equal(evaluateNpmAudit({audit:report(),exitCode:0,dependencyReviewOutcome:'success'}).ok,true);
});
test('moderate_only_nonzero_exit_passes_policy',()=>{
  const r=evaluateNpmAudit({audit:report({moderate:2}),exitCode:1,dependencyReviewOutcome:'failure'});
  assert.equal(r.ok,true); assert.equal(r.dependencyDiffEvidence,'UNAVAILABLE_FALLBACK_FULL_LOCKFILE');
});
test('high_fails',()=>assert.equal(evaluateNpmAudit({audit:report({high:1}),exitCode:1}).ok,false));
test('critical_fails',()=>assert.equal(evaluateNpmAudit({audit:report({critical:1}),exitCode:1}).ok,false));
test('missing_metadata_fails',()=>assert.equal(evaluateNpmAudit({audit:{auditReportVersion:2},exitCode:1}).ok,false));
test('malformed_count_fails',()=>{
  const audit=report(); audit.metadata.vulnerabilities.high='0';
  assert.equal(evaluateNpmAudit({audit,exitCode:0}).ok,false);
});
test('inconsistent_total_fails',()=>assert.equal(evaluateNpmAudit({audit:report({low:1,total:0}),exitCode:1}).ok,false));
test('registry_or_protocol_error_fails',()=>{
  const audit={auditReportVersion:2,error:{code:'EAI_AGAIN'},metadata:{vulnerabilities:{info:0,low:0,moderate:0,high:0,critical:0,total:0}}};
  assert.equal(evaluateNpmAudit({audit,exitCode:1}).ok,false);
});
test('nonzero_without_findings_fails_closed',()=>assert.equal(evaluateNpmAudit({audit:report(),exitCode:1}).ok,false));
test('unsupported_report_version_fails',()=>{
  const audit=report(); audit.auditReportVersion=1;
  assert.equal(evaluateNpmAudit({audit,exitCode:0}).ok,false);
});

const failed=tests.filter((row)=>!row.ok);
const result={schemaVersion:'velmere.pass4992.npm-audit-verifier-tests.v1',tests:tests.length,passed:tests.length-failed.length,failed:failed.length,results:tests};
console.log(JSON.stringify(result,null,2));
if(failed.length)process.exit(1);
