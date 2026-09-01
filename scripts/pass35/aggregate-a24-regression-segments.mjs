#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
const ranges=[{id:"0_30",start:0,end:30},{id:"30_60",start:30,end:60},{id:"60_82",start:60,end:82}];
const receipts=[];const logs=[];const results=[];
for(const range of ranges){
 const rp=`artifacts/pass35/PASS35_A24_NONDESTRUCTIVE_REGRESSION_SEGMENT_${range.id}_RECEIPT.json`;
 const lp=`artifacts/pass35/PASS35_A24_NONDESTRUCTIVE_REGRESSION_SEGMENT_${range.id}.log`;
 if(!existsSync(rp)||!existsSync(lp))throw new Error(`a24_segment_missing:${range.id}`);
 const receipt=JSON.parse(readFileSync(rp,"utf8"));
 if(receipt.status!=="PASS"||receipt.startIndex!==range.start||receipt.endIndexExclusive!==range.end||receipt.testCountExecuted!==range.end-range.start||receipt.passed!==range.end-range.start||receipt.failed!==0)throw new Error(`a24_segment_invalid:${range.id}`);
 receipts.push(receipt);logs.push(`===== SEGMENT ${range.id} =====\n${readFileSync(lp,"utf8")}`);results.push(...receipt.results.map((row,index)=>({...row,index:range.start+index})));
}
results.sort((a,b)=>a.index-b.index);
if(results.length!==82||results.some((row,index)=>row.index!==index||row.status!=="PASS"))throw new Error("a24_segment_coverage_invalid");
const logText=logs.join("\n");
const core={schemaVersion:"velmere.pass35.a24-nondestructive-regression-receipt.v1",startedAt:receipts[0].startedAt,completedAt:receipts.at(-1).completedAt,status:"PASS",exactRuntimeClaimed:false,observedRuntime:receipts[0].observedRuntime,requiredRuntime:receipts[0].requiredRuntime,totalSuiteCount:82,testCountPlanned:82,testCountExecuted:82,passed:82,failed:0,segmentReceipts:receipts.map((r)=>({segmentId:r.segmentId,startIndex:r.startIndex,endIndexExclusive:r.endIndexExclusive,receiptSha256:r.receiptSha256})),results:results.map(({index,...row})=>row),logPath:"artifacts/pass35/PASS35_A24_NONDESTRUCTIVE_REGRESSION.log",logSha256:`sha256:${createHash("sha256").update(logText).digest("hex")}`,truthBoundary:"This aggregated receipt proves all 82 non-mutating current-source A4-A24 regression cases passed in three explicit segments. It does not grant exact Node/npm, staging, LIVE, customer, legal, provider-rights or independent-assurance credit."};
const receipt={...core,receiptSha256:`sha256:${createHash("sha256").update(JSON.stringify(core)).digest("hex")}`};
writeFileSync(core.logPath,logText);writeFileSync("artifacts/pass35/PASS35_A24_NONDESTRUCTIVE_REGRESSION_RECEIPT.json",`${JSON.stringify(receipt,null,2)}\n`);
console.log(JSON.stringify({status:"PASS_A24_REGRESSION_AGGREGATED",segments:receipts.length,testCountExecuted:82,passed:82,failed:0,receiptSha256:receipt.receiptSha256},null,2));
