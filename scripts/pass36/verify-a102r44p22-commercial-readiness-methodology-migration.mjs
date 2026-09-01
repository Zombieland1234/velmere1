#!/usr/bin/env node
import crypto from "node:crypto"; import fs from "node:fs"; import {spawnSync} from "node:child_process";
const m=JSON.parse(fs.readFileSync("config/pass36/a102r44p22-commercial-readiness-methodology-migration.json","utf8")); const sha=p=>crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const run=(args)=>spawnSync(process.execPath,["--import","./scripts/pass11/register-offline-ts-loader.mjs",...args],{encoding:"utf8",env:process.env,maxBuffer:32*1024*1024});
const historical=run([m.historicalTest.path]); const current=m.currentTests.map(p=>({path:p,run:run([p])}));
const rows=[]; const add=(id,ok,d=null)=>rows.push({id,passed:Boolean(ok),detail:d});
add("historical-hash",sha(m.historicalTest.path)===m.historicalTest.sha256);
add("historical-negative",historical.status!==0&&m.historicalExpectedFailureIds.every(id=>`${historical.stdout}${historical.stderr}`.includes(id)));
add("implementation-hash",sha(m.currentImplementation.path)===m.currentImplementation.sha256);
for(const x of current) add(`current:${x.path}`,x.run.status===0,{status:x.run.status,stderr:x.run.stderr.slice(0,400)});
add("method-field-level",m.methodChange.some(x=>x.includes("exact fields")));
add("risk-basic-split",m.methodChange.some(x=>x.includes("Risk Basic")));
add("history",m.historyRewritten===false); add("no-collapse",m.denominatorCollapse===false);
const failed=rows.filter(x=>!x.passed); console.log(JSON.stringify({schemaVersion:"velmere.pass36.a102r44p22.commercial-readiness-methodology-migration-verification.v1",status:failed.length?"FAIL":"PASS",checks:rows.length,passed:rows.length-failed.length,failed:failed.length,rows},null,2)); process.exit(failed.length?1:0);
