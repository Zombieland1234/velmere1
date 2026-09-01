#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
const m=JSON.parse(fs.readFileSync("config/pass36/a102r44p22-download-boundary-denominator-migration.json","utf8"));
const sha=p=>crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const assignments=[];
for (const base of ["app","lib"]) {
 const walk=d=>{ for(const e of fs.readdirSync(d,{withFileTypes:true})){ const f=path.join(d,e.name); if(e.isDirectory()) walk(f); else if(e.isFile()&&/\.(?:ts|tsx|js|mjs|cjs)$/u.test(e.name)){ const rel=path.relative(process.cwd(),f).split(path.sep).join("/"); for(const [i,line] of fs.readFileSync(f,"utf8").split(/\r?\n/u).entries()) if(/['"]content-disposition['"]\s*:/u.test(line)) assignments.push({path:rel,line:i+1,text:line.trim()}); } } };
 walk(base);
}
const old=spawnSync(process.execPath,["--import","./scripts/pass11/register-offline-ts-loader.mjs","scripts/pass36/test-a72-download-response-boundary.mjs"],{encoding:"utf8",env:process.env});
const rows=[]; const add=(id,ok,detail=null)=>rows.push({id,passed:Boolean(ok),detail});
add("parent-test-hash", sha(m.parentTest.path)===m.parentTest.sha256);
add("old-denominator", m.oldDenominator===12);
add("new-denominator", m.newDenominator===13);
add("retained", m.retainedAssignments===12);
add("added-one", m.addedAssignments===1 && m.removedAssignments===0);
add("current-count", assignments.length===13,assignments);
add("all-centralized", assignments.every(x=>x.text.includes("contentDisposition")),assignments.filter(x=>!x.text.includes("contentDisposition")));
add("preview-assignment-present", assignments.some(x=>x.path===m.addedPath.path));
add("preview-hash", sha(m.addedPath.path)===m.addedPath.sha256);
add("historical-negative-exact", old.status!==0 && /assignment_count_complete/u.test(`${old.stderr}${old.stdout}`));
add("history-not-rewritten", m.historyRewritten===false);
add("no-collapse", m.denominatorCollapse===false);
const failed=rows.filter(x=>!x.passed); console.log(JSON.stringify({schemaVersion:"velmere.pass36.a102r44p22.download-boundary-migration-verification.v1",status:failed.length?"FAIL":"PASS",checks:rows.length,passed:rows.length-failed.length,failed:failed.length,rows},null,2)); process.exit(failed.length?1:0);
