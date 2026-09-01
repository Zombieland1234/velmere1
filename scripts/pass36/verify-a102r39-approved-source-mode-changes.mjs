#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { collectA102R39Inventory } from "./package-a102r39-deterministic.mjs";
const REV="VELMERE_PASS36_A102R39_ACTION_REQUIRED_CROSS_PLATFORM_SOURCE_MODE_IDENTITY_WINDOWS_UNPACK_AND_POSIX_EXECUTABLE_POLICY_NO_LIVE_CREDIT";
const PARENT="VELMERE_PASS36_A102R38_ACTION_REQUIRED_PRODUCTION_SMOKE_UNIQUE_ASSERTION_RESULT_DENOMINATOR_AND_SOURCE_AUTHORITY_RECONCILIATION_NO_LIVE_CREDIT";
const ledger=JSON.parse(fs.readFileSync("config/pass36/a102r39-approved-source-mode-changes.json","utf8"));
const parent=JSON.parse(fs.readFileSync("config/pass36/a102r39-parent-source-package-manifest.json","utf8"));
let checks=0;const ok=(v,id)=>{checks++;assert.ok(v,id)};
ok(ledger.schemaVersion==="velmere.pass36.a102r39.approved-source-mode-changes.v1","schema");
ok(ledger.revisionId===REV&&ledger.parentRevisionId===PARENT,"identity");
ok(ledger.parentSourceArchiveSha256==="7adb67981020b48ee7698e1fd3b47dbfa623053e87c57975af2be70f61ac5189","parent-archive");
ok(ledger.parentSourceTreeSha256===parent.aggregateSha256,"parent-tree");
ok(ledger.deletedFiles.length===0,"deleted");
ok(ledger.approvedFiles.length===ledger.fileCount&&new Set(ledger.approvedFiles.map((x)=>x.path)).size===ledger.fileCount,"rows");
const excluded=new Set(ledger.selfExcludedPaths);ok(excluded.has("config/pass36/a102r39-approved-source-mode-changes.json")&&excluded.has("config/pass36/a102r39-current-root-descendant-manifest.json"),"exclusions");
const parentMap=new Map(parent.entries.map((x)=>[x.path,x]));
const {rows}=collectA102R39Inventory(process.cwd(),"source");const currentMap=new Map(rows.map(({content,...x})=>[x.path,x]));
const observed=[];
for(const p of [...new Set([...parentMap.keys(),...currentMap.keys()])].sort()){if(excluded.has(p))continue;const a=parentMap.get(p),b=currentMap.get(p);if(!a&&b)observed.push({path:p,changeType:"ADDED",parentByteLength:null,parentSha256:null,parentMode:null,currentByteLength:b.byteLength,currentSha256:b.sha256,currentMode:b.mode});else if(a&&!b)observed.push({path:p,changeType:"DELETED",parentByteLength:a.byteLength,parentSha256:a.sha256,parentMode:a.mode,currentByteLength:null,currentSha256:null,currentMode:null});else if(a&&b&&(a.byteLength!==b.byteLength||a.sha256!==b.sha256||a.mode!==b.mode))observed.push({path:p,changeType:"MODIFIED",parentByteLength:a.byteLength,parentSha256:a.sha256,parentMode:a.mode,currentByteLength:b.byteLength,currentSha256:b.sha256,currentMode:b.mode});}
const declared=ledger.approvedFiles.map(({family,...x})=>x).sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
ok(JSON.stringify(observed)===JSON.stringify(declared),"complete-exact-diff");
for(const row of ledger.approvedFiles){ok(typeof row.path==="string"&&!path.isAbsolute(row.path)&&!row.path.includes("\\")&&!row.path.split("/").some((x)=>!x||x==="."||x===".."),`path:${row.path}`);ok(row.currentMode===33188||row.currentMode===33261,`mode:${row.path}`);if(row.changeType==="ADDED")ok(row.parentSha256===null&&row.parentByteLength===null&&row.parentMode===null,`added:${row.path}`);else ok(row.changeType==="MODIFIED"&&/^[a-f0-9]{64}$/u.test(row.parentSha256)&&(row.parentSha256!==row.currentSha256||row.parentMode!==row.currentMode),`modified:${row.path}`);}
ok(ledger.globalDecision==="NO_GO"&&!ledger.live&&!ledger.saleEnabled&&!ledger.productionApproved&&!ledger.worldClassProven,"promotion");
console.log(JSON.stringify({status:"PASS_A102R39_APPROVED_SOURCE_MODE_CHANGES_COMPLETE_NO_PROMOTION",checksPassed:checks,checksFailed:0,fileCount:ledger.fileCount,addedFiles:ledger.addedFiles,modifiedFiles:ledger.modifiedFiles},null,2));
