#!/usr/bin/env node
import fs from "node:fs";import os from "node:os";import path from "node:path";import {verifyA102R44P5} from "./verify-a102r44p5-exact-npm-lockfile-migration.mjs";
const source=process.cwd();const rows=[];const check=(id,passed,detail)=>rows.push({id,passed:Boolean(passed),detail});
function copy(rel,root){const dst=path.join(root,rel);fs.mkdirSync(path.dirname(dst),{recursive:true});fs.copyFileSync(path.join(source,rel),dst)}
function fixture(){const root=fs.mkdtempSync(path.join(os.tmpdir(),"velmere-r44p5-tamper-"));for(const rel of ["package.json","package-lock.json","lib/security/vlm-audit-product.ts","config/pass36/a102r44p5-exact-npm-lockfile-migration.json","_velmere/PASS36_A102R44P4_SOURCE_MANIFEST.json"])copy(rel,root);return root}
function mutateJson(root,rel,fn){const p=path.join(root,rel),x=JSON.parse(fs.readFileSync(p,"utf8"));fn(x);fs.writeFileSync(p,JSON.stringify(x,null,2)+"\n")}
const clean=verifyA102R44P5(source);check("clean-passes",clean.failed===0,{passed:clean.passed,checks:clean.checks});
const cases=[
 ["lock-byte-tamper",r=>fs.appendFileSync(path.join(r,"package-lock.json")," ")],
 ["old-hash-tamper",r=>mutateJson(r,"config/pass36/a102r44p5-exact-npm-lockfile-migration.json",x=>x.parent.lockSha256="0".repeat(64))],
 ["new-hash-tamper",r=>mutateJson(r,"config/pass36/a102r44p5-exact-npm-lockfile-migration.json",x=>x.current.lockSha256="1".repeat(64))],
 ["added-collapse",r=>mutateJson(r,"config/pass36/a102r44p5-exact-npm-lockfile-migration.json",x=>x.diff.addedCount=0)],
 ["removed-collapse",r=>mutateJson(r,"config/pass36/a102r44p5-exact-npm-lockfile-migration.json",x=>x.diff.removedCount=0)],
 ["semantic-collapse",r=>mutateJson(r,"config/pass36/a102r44p5-exact-npm-lockfile-migration.json",x=>x.diff.semanticChangedCount=0)],
 ["invent-top-level-diff",r=>mutateJson(r,"config/pass36/a102r44p5-exact-npm-lockfile-migration.json",x=>x.diff.topLevelDiffs=["fake"])],
 ["wrong-node",r=>mutateJson(r,"config/pass36/a102r44p5-exact-npm-lockfile-migration.json",x=>x.runtime.node="24.17.0")],
 ["wrong-npm",r=>mutateJson(r,"config/pass36/a102r44p5-exact-npm-lockfile-migration.json",x=>x.runtime.npm="11.15.0")],
 ["product-field-removal",r=>{const p=path.join(r,"lib/security/vlm-audit-product.ts");fs.writeFileSync(p,fs.readFileSync(p,"utf8").replace('commercialMode: "free_automated_informational_prescreen",',''))}],
 ["internal-registry",r=>mutateJson(r,"package-lock.json",x=>x.packages["node_modules/next"].resolved="https://packages.applied-caas-gateway/internal.tgz")],
 ["package-count",r=>mutateJson(r,"package-lock.json",x=>delete x.packages[Object.keys(x.packages).find(k=>k)])],
 ["parent-manifest",r=>fs.appendFileSync(path.join(r,"_velmere/PASS36_A102R44P4_SOURCE_MANIFEST.json")," ")]
];
for(const [id,fn] of cases){const root=fixture();try{fn(root);const out=verifyA102R44P5(root);check(id,out.failed>0,{failed:out.failed,failures:out.failures})}finally{fs.rmSync(root,{recursive:true,force:true})}}
const failures=rows.filter(x=>!x.passed);const out={schemaVersion:"velmere.pass36.a102r44p5.lockfile-migration-tamper.v1",status:failures.length?"FAIL_A102R44P5_TAMPER":"PASS_A102R44P5_LOCKFILE_MIGRATION_TAMPER_14_OF_14",checks:rows.length,passed:rows.length-failures.length,failed:failures.length,failures:failures.map(x=>x.id),rows,liveCredit:false,saleCredit:false};console.log(JSON.stringify(out,null,2));if(out.failed)process.exit(1);
