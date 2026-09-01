#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const baseline=JSON.parse(readFileSync('config/pass35/a9-visual-freeze-baseline.json','utf8'));
let checks=0; const check=(v,m)=>{assert.ok(v,m);checks++;};
check(baseline.schemaVersion==='velmere.pass35.a9-visual-freeze-baseline.v1','schema invalid');
check(baseline.visualOwner==='CODEX_FRONTEND_WORKSTREAM','visual owner invalid');
check(Array.isArray(baseline.files) && baseline.files.length===baseline.fileCount && baseline.fileCount>100,'baseline incomplete');
const mismatches=[];
for(const item of baseline.files){
 if(!existsSync(item.path)){mismatches.push({path:item.path,reason:'missing'});continue;}
 const bytes=readFileSync(item.path); const hash=createHash('sha256').update(bytes).digest('hex');
 if(bytes.length!==item.size || hash!==item.sha256) mismatches.push({path:item.path,reason:'changed'});
 checks++;
}
check(mismatches.length===0,`visual files changed:${JSON.stringify(mismatches.slice(0,10))}`);
console.log(JSON.stringify({status:'PASS_A9_VISUAL_FREEZE',checks,fileCount:baseline.fileCount,mismatches:0,visualChangesMade:false},null,2));
