#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
const root=process.cwd();
const matrix=JSON.parse(fs.readFileSync(path.join(root,"config/pass23/rls-staging-case-matrix.json"),"utf8"));
const classification=JSON.parse(fs.readFileSync(path.join(root,"config/pass23/rls-table-classification.json"),"utf8"));
const sql=fs.readFileSync(path.join(root,"tests/staging/pass23/rls-policy-structural-preflight.sql"),"utf8");
const runner=fs.readFileSync(path.join(root,"scripts/pass23/run-rls-staging-harness.mjs"),"utf8");
const errors=[];
const cases=matrix.cases??[];
if(cases.length!==19) errors.push(`expected 19 cases, got ${cases.length}`);
if(new Set(cases.map(c=>c.table)).size!==19) errors.push("duplicate table cases");
if(cases.filter(c=>c.kind==='owner').length!==13) errors.push("expected 13 owner cases");
if(cases.filter(c=>c.kind==='operator').length!==6) errors.push("expected 6 operator cases");
for(const c of cases){
 if(!c.policy||!c.caseId||c.executionStatus!=="PENDING_STAGING") errors.push(`invalid case ${c.table}`);
 if(!Array.isArray(c.negative)||c.negative.length<3) errors.push(`insufficient negatives ${c.table}`);
 if(!classification.tables.some(r=>r.table===c.table&&r.requiresMultiUserStagingProof)) errors.push(`classification missing ${c.table}`);
 if(!sql.includes(c.table)) errors.push(`SQL preflight missing ${c.table}`);
}
const serviceRows=classification.tables.filter(r=>r.classification==='SERVICE_ROLE_ONLY_DEFAULT_DENY');
if(serviceRows.length!==27) errors.push(`expected 27 explicit service rows, got ${serviceRows.length}`);
for(const r of serviceRows){if(!r.explicitPrivilegeBoundary||!r.serviceRoleBoundaryEvidence) errors.push(`service boundary evidence missing ${r.table}`);}
for(const token of ["I_UNDERSTAND_THIS_USES_A_DISPOSABLE_STAGING_DATABASE","PREPARED_NOT_EXECUTED","psql","ROLLBACK"]){if(!runner.includes(token)&&!sql.toUpperCase().includes(token)) errors.push(`missing safety token ${token}`);}
const result={schemaVersion:"velmere.pass23.rls-staging-harness-verification.v1",ok:errors.length===0,errors,summary:{cases:cases.length,ownerCases:cases.filter(c=>c.kind==='owner').length,operatorCases:cases.filter(c=>c.kind==='operator').length,serviceRoleOnlyExplicit:serviceRows.length,executed:0,passed:0,status:"PREPARED_NOT_EXECUTED"},truthBoundary:matrix.truthBoundary};
fs.mkdirSync(path.join(root,'.velmere','pass23-diagnostics'),{recursive:true});
fs.writeFileSync(path.join(root,'.velmere','pass23-diagnostics','rls-staging-harness-verification.json'),`${JSON.stringify(result,null,2)}\n`);
console.log(JSON.stringify(result,null,2));
if(!result.ok) process.exit(1);
