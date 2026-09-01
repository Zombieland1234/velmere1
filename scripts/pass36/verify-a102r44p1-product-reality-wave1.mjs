#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const manifestRel = "_velmere/PASS36_A102R44P1_PATCH_SOURCE_MANIFEST.json";
const excludedTop = new Set(["artifacts", ".velmere", "node_modules", ".cache", ".turbo", "coverage", "test-results", "playwright-report", "__pycache__"]);
const sha256 = (b) => createHash("sha256").update(b).digest("hex");
const norm = (p) => p.split(path.sep).join("/");
function walk(dir, prefix = "") {
  const rows = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a,b)=>a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
    if (!prefix && (excludedTop.has(entry.name) || entry.name.startsWith(".next"))) continue;
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (rel === manifestRel) continue;
    const abs = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`symlink_forbidden:${rel}`);
    if (entry.isDirectory()) rows.push(...walk(abs, rel));
    else if (entry.isFile()) {
      const b = fs.readFileSync(abs);
      rows.push({ path: norm(rel), byteLength: b.length, sha256: sha256(b), mode: fs.statSync(abs).mode });
    }
  }
  return rows;
}
const ordinal = (a,b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0;
const manifest = JSON.parse(fs.readFileSync(path.join(root, manifestRel), "utf8"));
const rows = walk(root).sort(ordinal);
const aggregate = createHash("sha256");
for (const row of rows) aggregate.update(`${row.path}\0${row.byteLength}\0${row.sha256}\0${row.mode}\n`);
const pathSet = sha256(Buffer.from(rows.map((r)=>r.path).join("\n")+"\n"));
const expected = new Map(manifest.entries.map((r)=>[r.path,r]));
const failures = [];
const add = (id, ok, detail=null) => { if (!ok) failures.push({id,detail}); };
add("manifest:schema", manifest.schemaVersion === "velmere.pass36.a102r44p1.patch-source-manifest.v1");
add("manifest:file-count", rows.length === manifest.fileCount, {actual:rows.length,expected:manifest.fileCount});
add("manifest:aggregate", aggregate.digest("hex") === manifest.aggregateSha256);
add("manifest:path-set", pathSet === manifest.pathSetSha256);
for (const row of rows) {
  const e = expected.get(row.path);
  add(`file:${row.path}`, Boolean(e) && e.byteLength === row.byteLength && e.sha256 === row.sha256 && e.mode === row.mode, {actual:row,expected:e});
}
add("manifest:no-extra", expected.size === rows.length);
for (const [id,args] of [
  ["patch",["scripts/pass36/test-a102r44-product-reality-wave1-patch.mjs"]],
  ["visual",["scripts/pass36/verify-a102r44p1-current-visual-freeze.mjs"]],
]) {
  const run=spawnSync(process.execPath,args,{cwd:root,encoding:"utf8",shell:false,windowsHide:true,maxBuffer:32*1024*1024});
  add(`test:${id}`,run.status===0,{status:run.status,stderr:(run.stderr||"").slice(0,600)});
}
const state=JSON.parse(fs.readFileSync(path.join(root,"config/pass36/a102r44p1-product-reality-wave1-state.json"),"utf8"));
add("truth:fail-closed",state.globalDecision==="NO_GO"&&state.live===false&&state.saleEnabled===false&&state.productionApproved===false&&state.worldClassProven===false);
add("truth:no-exact-windows-claim",state.environment.exactWindowsExecuted===false&&state.environment.browserExecuted===false&&state.environment.buildExecuted===false);
const result={schemaVersion:"velmere.pass36.a102r44p1.patch-verification.v1",status:failures.length?"FAIL_A102R44P1_PATCH":"PASS_A102R44P1_PATCH_LOCAL_ONLY",fileCount:rows.length,aggregateSha256:manifest.aggregateSha256,pathSetSha256:pathSet,checks:rows.length+10,failed:failures.length,globalDecision:"NO_GO",live:false,saleEnabled:false,productionApproved:false,worldClassProven:false,failures};
console.log(JSON.stringify(result,null,2));
if(failures.length) process.exit(1);
