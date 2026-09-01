#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const REV = "VELMERE_PASS36_A102R44P21_ACTION_REQUIRED_FIELD_LEVEL_DATA_PROVENANCE_MODULAR_SALE_READINESS_AND_LEGAL_ALTERNATIVE_ROUTING_NO_LIVE_CREDIT";
const PARENT = "VELMERE_PASS36_A102R44P20_ACTION_REQUIRED_CURRENT_BYTE_DUAL_BUILD_BROWSER_PDF_AND_BASIC_FREE_PRO_ADVANCED_RELEASE_CLOSURE_NO_LIVE_CREDIT";
const MAN = "_velmere/PASS36_A102R44P21_SOURCE_ONLY_MANIFEST.json";
const LEDGER = "config/pass36/a102r44p21-approved-current-source-changes.json";
const PARENT_MAN = "_velmere/PASS36_A102R44P20_SOURCE_ONLY_MANIFEST.json";
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
const forbiddenTop = new Set(["node_modules", ".git", ".velmere", "artifacts", "coverage", "out", "build", "dist", ".cache", "cache", "tmp", "temp", "__pycache__", ".turbo", "test-results", "playwright-report"]);
const reject = (r) => {
  const ps = r.split("/");
  const top = ps[0] ?? "";
  return forbiddenTop.has(top) || top.startsWith(".next") || top === ".env" || top.startsWith(".env.") || ps.includes("__pycache__") || r.endsWith(".tsbuildinfo") || r.endsWith(".pyc");
};
function collectRows(order = null) {
  const rows = [];
  function walk(dir, rel = "") {
    for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a,b)=>a.name.localeCompare(b.name))) {
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (r === MAN) continue;
      const full = path.join(dir, e.name);
      const st = fs.lstatSync(full);
      if (st.isSymbolicLink()) throw new Error(`symlink:${r}`);
      if (e.isDirectory()) { if (!reject(r)) walk(full, r); continue; }
      if (!e.isFile()) throw new Error(`non_regular:${r}`);
      if (reject(r)) continue;
      const b = fs.readFileSync(full);
      rows.push({ path:r, byteLength:b.length, sha256:sha(b), mode:st.mode & 0o777 });
    }
  }
  walk(ROOT);
  if (order) rows.sort((a,b)=>(order.get(a.path) ?? Number.MAX_SAFE_INTEGER)-(order.get(b.path) ?? Number.MAX_SAFE_INTEGER) || a.path.localeCompare(b.path));
  else rows.sort((a,b)=>a.path.localeCompare(b.path));
  return rows;
}

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, MAN), "utf8"));
const order = new Map(manifest.entries.map((x,i)=>[x.path,i]));
const rows = collectRows(order);
const bytes = rows.reduce((s,x)=>s+x.byteLength,0);
const pset = sha(Buffer.from(rows.map((x)=>x.path).join("\n")+"\n"));
const agg = sha(Buffer.from(rows.map((x)=>`${x.path}\0${x.byteLength}\0${x.sha256}\0${x.mode.toString(8)}`).join("\n")+"\n"));
const state = JSON.parse(fs.readFileSync(path.join(ROOT,"config/pass36/a102r44p21-action-required-current-state.json"),"utf8"));
const policy = JSON.parse(fs.readFileSync(path.join(ROOT,"config/pass36/a102r44p21-field-level-commercial-readiness-policy.json"),"utf8"));
const checks=[]; const add=(id,ok,detail=null)=>checks.push({id,ok:Boolean(ok),detail});
add("schema", manifest.schemaVersion === "velmere.pass36.a102r44p21.source-manifest.v1");
add("revision", manifest.revisionId === REV && manifest.parentRevisionId === PARENT);
add("count", manifest.fileCount === rows.length);
add("bytes", manifest.byteLength === bytes);
add("pathset", manifest.pathSetSha256 === pset);
add("aggregate", manifest.aggregateSha256 === agg);
add("entries", manifest.entries.length===rows.length && manifest.entries.every((m,i)=>m.path===rows[i].path&&m.byteLength===rows[i].byteLength&&m.sha256===rows[i].sha256&&m.mode===rows[i].mode));
add("active-pass", fs.readFileSync(path.join(ROOT,"VELMERE_ACTIVE_PASS.txt"),"utf8").trim() === REV);
add("flags", state.globalDecision === "NO_GO" && state.LIVE===false && state.saleEnabled===false && state.productionApproved===false && state.worldClassProven===false);
add("field-contract", state.implemented?.fieldDefinitions===86 && state.implemented?.families===10 && policy.catalog?.fieldDefinitions===86 && policy.catalog?.families===10);
add("basic-free-target", state.skuDecisions?.basic === "GO_FREE_TARGET_FAIL_CLOSED_UNTIL_REQUIRED_GATES");
add("pro-beta-target", state.skuDecisions?.pro === "CONTROLLED_BETA_TARGET_THEN_GO_PAID_AFTER_EVIDENCE");
add("advanced-blocked", state.skuDecisions?.advanced === "NOT_FOR_SALE_UNTIL_INDEPENDENT_PROFESSIONAL_VALUE_PROVEN");
add("approved-bound", manifest.approvedChangesPath===LEDGER && manifest.approvedChangesSha256===sha(fs.readFileSync(path.join(ROOT,LEDGER))));
add("parent-bound", manifest.parentManifestPath===PARENT_MAN && manifest.parentManifestSha256===sha(fs.readFileSync(path.join(ROOT,PARENT_MAN))));
add("no-forbidden", rows.every((r)=>!reject(r.path)));
const failed=checks.filter((x)=>!x.ok);
const result={schemaVersion:"velmere.pass36.a102r44p21.source-authority-receipt.v1",status:failed.length?"FAIL":"PASS_R44P21_SOURCE_AUTHORITY",checks:checks.length,passed:checks.length-failed.length,failed:failed.length,revisionId:REV,manifestSha256:sha(fs.readFileSync(path.join(ROOT,MAN))),aggregateSha256:agg,fileCount:rows.length,sourceImmutable:true,rows:checks};
console.log(JSON.stringify(result,null,2));
if(failed.length) process.exit(1);
