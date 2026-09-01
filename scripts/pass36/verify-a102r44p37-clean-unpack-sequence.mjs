#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const root=path.resolve(process.argv[2]??process.cwd());
const steps=[
  ["authority-before","scripts/pass36/verify-a102r44p37-source-authority.mjs"],
  ["approved-changes","scripts/pass36/verify-a102r44p37-approved-source-changes.mjs"],
  ["current-pointers","scripts/pass36/verify-a102r44p37-current-release-pointers.mjs"],
  ["static-policy","scripts/pass36/test-a102r44p37-static-policy.mjs"],
  ["customer-truth","scripts/pass36/test-a102r44p37-customer-truth-repair.mjs"],
  ["a87-a88-migration","scripts/pass36/verify-a102r44p37-a87-a88-input-hash-migration.mjs"],
  ["a42-critical","scripts/pass36/verify-a102r44p37-a42-critical-rebaseline.mjs"],
  ["authority-after","scripts/pass36/verify-a102r44p37-source-authority.mjs"],
];
const rows=[];
for(const [id,script] of steps){
  const result=spawnSync(process.execPath,[script],{cwd:root,encoding:"utf8",maxBuffer:64*1024*1024,shell:false});
  rows.push({id,script,exitCode:result.status,stdout:result.stdout,stderr:result.stderr,passed:result.status===0&&result.stderr.length===0});
  if(result.status!==0||result.stderr.length!==0)break;
}
const passed=rows.length===steps.length&&rows.every((row)=>row.passed);
const receipt={schemaVersion:"velmere.pass36.a102r44p37.clean-unpack-sequence.v1",status:passed?"PASS_R44P37_CLEAN_UNPACK":"FAIL_R44P37_CLEAN_UNPACK",firstChildLiteral:steps[0][1]==="scripts/pass36/verify-a102r44p37-source-authority.mjs",requiredSteps:steps.length,executedSteps:rows.length,passedSteps:rows.filter((row)=>row.passed).length,sourceImmutable:passed,rows};
const output=process.argv[3];
if(output)fs.writeFileSync(path.resolve(output),`${JSON.stringify(receipt,null,2)}\n`);
console.log(JSON.stringify(receipt,null,2));
if(!passed)process.exit(1);
