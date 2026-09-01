#!/usr/bin/env node
import fs from "node:fs";import path from "node:path";import process from "node:process";import {spawnSync} from "node:child_process";const root=path.resolve(process.argv[2]??process.cwd());const evidence=path.resolve(process.argv[3]??"");const solcRoot=path.resolve(process.argv[4]??"");const tsRoot=path.resolve(process.argv[5]??"");const output=process.argv[6];const steps=[
 ["authority-before","scripts/pass36/verify-a102r44p38-source-authority.mjs",[root]],
 ["approved-changes","scripts/pass36/verify-a102r44p38-approved-source-changes.mjs",[]],
 ["current-pointers","scripts/pass36/verify-a102r44p38-current-release-pointers.mjs",[]],
 ["static-policy","scripts/pass36/test-a102r44p38-static-policy.mjs",[]],
 ["compiler-evidence","scripts/pass36/verify-a102r44p38-compiler-ast-evidence.mjs",[evidence]],
 ["input-boundary","scripts/pass36/test-a102r44p38-compiler-ast-input-boundary.mjs",["--solc-root",solcRoot]],
 ["audit-adapter","scripts/pass36/test-a102r44p38-audit-compiler-ast-adapter.mjs",["--solc-root",solcRoot]],
 ["targeted-typescript","scripts/pass36/test-a102r44p38-targeted-typescript.mjs",["--typescript-root",tsRoot]],
 ["authority-after","scripts/pass36/verify-a102r44p38-source-authority.mjs",[root]],
];const rows=[];for(const [id,script,args] of steps){const r=spawnSync(process.execPath,[script,...args],{cwd:root,encoding:"utf8",maxBuffer:128*1024*1024,shell:false});rows.push({id,script,exitCode:r.status,stdout:r.stdout,stderr:r.stderr,passed:r.status===0&&r.stderr.length===0});if(r.status!==0||r.stderr.length!==0)break;}const passed=rows.length===steps.length&&rows.every(r=>r.passed);const receipt={schemaVersion:"velmere.pass36.a102r44p38.clean-unpack-sequence.v1",status:passed?"PASS_R44P38_CLEAN_UNPACK":"FAIL_R44P38_CLEAN_UNPACK",firstChildLiteral:steps[0][1]==="scripts/pass36/verify-a102r44p38-source-authority.mjs",requiredSteps:steps.length,executedSteps:rows.length,passedSteps:rows.filter(r=>r.passed).length,sourceImmutable:passed,rows};if(output)fs.writeFileSync(path.resolve(output),JSON.stringify(receipt,null,2)+"\n");console.log(JSON.stringify(receipt,null,2));if(!passed)process.exit(1);
