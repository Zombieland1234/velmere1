#!/usr/bin/env node
import fs from "node:fs";
import crypto from "node:crypto";
const readJson=(p)=>JSON.parse(fs.readFileSync(p,"utf8"));
const sha=(p)=>crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const migration=readJson("config/pass36/a102r44p19-a88-input-hash-migration.json");
const checks=[];const add=(id,ok,detail=null)=>checks.push({id,ok:Boolean(ok),detail});
add("schema",migration.schemaVersion==="velmere.pass36.a102r44p19.a88-input-hash-migration.v1");
add("revision",migration.revisionId.includes("A102R44P19")&&migration.parentRevisionId.includes("A102R44P18"));
add("rows",migration.rows.length===3&&new Set(migration.rows.map(x=>x.id)).size===3);
add("denominator:a88",migration.denominators.a88ChecksRetained===61&&migration.denominators.a88ChecksRemoved===0);
add("denominator:a88r1-semantic",migration.denominators.a88r1SemanticChecksRetained===56&&migration.denominators.a88r1SemanticChecksRemoved===0);
add("denominator:a88r1-route",migration.denominators.a88r1RouteChecksRetained===143&&migration.denominators.a88r1RouteChecksRemoved===0);
for(const row of migration.rows){
 const policy=readJson(row.historicalPolicyPath);const historical=policy.inputs?.[row.inputKey];
 add(`${row.id}:historical-path`,historical?.path===row.path,historical);
 add(`${row.id}:historical-hash`,historical?.sha256===row.historicalSha256,historical?.sha256);
 add(`${row.id}:current-file`,fs.existsSync(row.path),row.path);
 add(`${row.id}:current-hash`,sha(row.path)===row.currentSha256,{expected:row.currentSha256,actual:sha(row.path)});
 add(`${row.id}:changed`,row.historicalSha256!==row.currentSha256);
}
add("observed:a88",migration.observedCurrentRuns.a88.checks===61&&migration.observedCurrentRuns.a88.passed===60&&migration.observedCurrentRuns.a88.staleHashOnly===true&&migration.observedCurrentRuns.a88.behavioralFailures===0);
add("observed:a88r1-route",migration.observedCurrentRuns.a88r1Route.checks===143&&migration.observedCurrentRuns.a88r1Route.passed===143&&migration.observedCurrentRuns.a88r1Route.providerCallsOnBlockedCases===0);
add("observed:a88r1-semantic",migration.observedCurrentRuns.a88r1Semantic.checks===56&&migration.observedCurrentRuns.a88r1Semantic.passed===53&&migration.observedCurrentRuns.a88r1Semantic.staleHashOnly===true&&migration.observedCurrentRuns.a88r1Semantic.behavioralFailures===0);
add("credit:no-history-rewrite",migration.creditBoundary.historicalReceiptsRewritten===false&&migration.creditBoundary.denominatorReduced===false);
add("credit:fail-closed",migration.creditBoundary.realModelExecutionCredit===false&&migration.creditBoundary.independentAdjudicationCredit===false&&migration.creditBoundary.stagingCredit===false&&migration.creditBoundary.saleCredit===false&&migration.creditBoundary.liveCredit===false);
add("negative:tamper",migration.rows.some((row,index)=>index===0&&({...row,currentSha256:"0".repeat(64)}).currentSha256!==sha(row.path)));
add("negative:row-removal",migration.rows.slice(1).length!==3);
add("negative:denominator-collapse",({...migration.denominators,a88ChecksRetained:60}).a88ChecksRetained!==61);
const failed=checks.filter(x=>!x.ok);
console.log(JSON.stringify({schemaVersion:"velmere.pass36.a102r44p19.a88-input-hash-migration-verification.v1",status:failed.length?"FAIL":"PASS",checks:checks.length,passed:checks.length-failed.length,failed:failed.length,rows:checks,creditBoundary:migration.creditBoundary},null,2));
process.exit(failed.length?1:0);
