#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const REV='VELMERE_PASS36_A102R30_ACTION_REQUIRED_CHART_PROVIDER_CADENCE_CANONICAL_SESSION_AND_EVIDENCE_STATE_TRUTH_RECOVERY_NO_REAL_CREDIT';
const PARENT='VELMERE_PASS36_A102R29_ACTION_REQUIRED_CANONICAL_ASSET_CLASS_LOCALE_INDEPENDENT_CHART_ROUTE_CACHE_AND_NESTED_AUTHORITY_PROGRAM_DRIFT_RECOVERY_NO_REAL_CREDIT';
const ledger=JSON.parse(fs.readFileSync(path.join(root,'config/pass36/a102r30-approved-route-cache-authority-changes.json'),'utf8'));
const sha=(b)=>crypto.createHash('sha256').update(b).digest('hex');
let checks=0; const ok=(v,id)=>{checks++;assert.ok(v,id)};
ok(ledger.schemaVersion==='velmere.pass36.a102r30.approved-route-cache-authority-changes.v1','schema');
ok(ledger.revisionId===REV,'revision'); ok(ledger.parentRevisionId===PARENT,'parent');
ok(Number.isInteger(ledger.fileCount)&&ledger.fileCount>=12,'file_count_floor');
ok(Array.isArray(ledger.approvedFiles)&&ledger.approvedFiles.length===ledger.fileCount,'rows');
ok(new Set(ledger.approvedFiles.map((r)=>r.path)).size===ledger.fileCount,'unique');
for(const row of ledger.approvedFiles){
 ok(typeof row.path==='string'&&!path.isAbsolute(row.path)&&!row.path.includes('\\')&&!row.path.split('/').some((part)=>!part||part==='.'||part==='..'),`path:${row.path}`);
 const bytes=fs.readFileSync(path.join(root,row.path));
 ok(bytes.length===row.currentByteLength,`bytes:${row.path}`); ok(sha(bytes)===row.currentSha256,`sha:${row.path}`);
 ok(row.changeType==='ADDED'||row.changeType==='MODIFIED',`type:${row.path}`);
 if(row.changeType==='ADDED') ok(row.parentSha256===null&&row.parentByteLength===null,`added-parent-null:${row.path}`);
 else {ok(/^[a-f0-9]{64}$/u.test(row.parentSha256)&&Number.isInteger(row.parentByteLength)&&row.parentByteLength>=0,`modified-parent-shape:${row.path}`);ok(row.parentSha256!==row.currentSha256,`changed:${row.path}`);}
}
console.log(JSON.stringify({status:'PASS_A102R30_APPROVED_ROUTE_CACHE_AUTHORITY_CHANGES_NO_PROMOTION',checksPassed:checks,checksFailed:0,fileCount:ledger.fileCount},null,2));
