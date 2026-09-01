#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const migration=JSON.parse(fs.readFileSync(path.join(ROOT,"config/pass36/a102r44p30-inherited-eslint-cleanup-migration.json"),"utf8"));
const parent=JSON.parse(fs.readFileSync(path.join(ROOT,"_velmere/PASS36_A102R44P29_SOURCE_ONLY_MANIFEST.json"),"utf8"));
const parentMap=new Map(parent.entries.map((row)=>[row.path,row]));
const sha=(bytes)=>crypto.createHash("sha256").update(bytes).digest("hex");
const expected=[
"scripts/pass36/a102r44p25-external-evidence-lib.mjs",
"scripts/pass36/a102r44p26-exact-runtime-bridge-admission.mjs",
"scripts/pass36/a102r44p26-import-external-staging-evidence.mjs",
"scripts/pass36/a102r44p26-trusted-external-evidence-lib.mjs",
"scripts/pass36/a102r44p27-external-evidence-admission-journal.mjs",
"scripts/pass36/a102r44p27-import-external-staging-evidence.mjs",
"scripts/pass36/a102r44p27-trusted-external-evidence-lib.mjs",
"scripts/pass36/a102r44p29-evidence-quarantine-lib.mjs",
"scripts/pass36/test-a102r44p29-72h-watchdog.mjs",
"scripts/pass36/verify-a102r44p28-external-ci-evidence.mjs",
];
const checks=[];const add=(id,ok,detail=null)=>checks.push({id,ok:Boolean(ok),detail});
add("schema",migration.schemaVersion==="velmere.pass36.a102r44p30.inherited-eslint-cleanup-migration.v1");
add("revision",migration.revisionId==="VELMERE_PASS36_A102R44P30_ACTION_REQUIRED_EXACT_CURRENT_BYTE_LINUX_DUAL_BUILD_BROWSER_PDF_AND_PARENT_EXTERNAL_RLS_NO_LIVE_CREDIT");
add("exact-paths",migration.rows.length===expected.length&&migration.rows.every((row,index)=>row.path===expected[index]));
for(const row of migration.rows){
 const prior=parentMap.get(row.path);const full=path.join(ROOT,row.path);const bytes=fs.readFileSync(full);const stat=fs.statSync(full);
 add(`before:${row.path}`,Boolean(prior)&&JSON.stringify(row.before)===JSON.stringify(prior));
 add(`after:${row.path}`,row.after.path===row.path&&row.after.byteLength===bytes.length&&row.after.sha256===sha(bytes)&&row.after.mode===(stat.mode&0o777));
 add(`classification:${row.path}`,row.classification==="BEHAVIOR_PRESERVING_LINT_CORRECTION"&&Array.isArray(row.rules)&&row.rules.length>0);
 add(`no-disable:${row.path}`,!bytes.toString("utf8").includes("eslint-disable"));
}
add("no-deletion",migration.deletedFiles===0&&migration.removedTests===0&&migration.removedAssertions===0);
add("no-denominator-reduction",migration.denominatorReduced===false&&migration.eslintDisableAdded===false);
add("decision",migration.decision==="APPROVED_BEHAVIOR_PRESERVING_INHERITED_LINT_MIGRATION_NO_RELEASE_PROMOTION");
const failed=checks.filter((row)=>!row.ok);
console.log(JSON.stringify({schemaVersion:"velmere.pass36.a102r44p30.inherited-eslint-cleanup-migration-verification.v1",status:failed.length?"FAIL":"PASS",checks:checks.length,passed:checks.length-failed.length,failed:failed.length,changedFiles:migration.rows.length,rows:checks},null,2));
if(failed.length)process.exit(1);
