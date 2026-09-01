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

const parentManifest=JSON.parse(fs.readFileSync(path.join(ROOT,PARENT_MAN),"utf8"));
const ledger=JSON.parse(fs.readFileSync(path.join(ROOT,LEDGER),"utf8"));
const currentRows=collectRows();
const current=new Map(currentRows.filter((x)=>x.path!==LEDGER).map((x)=>[x.path,x]));
const parentRows=new Map(parentManifest.entries.map((x)=>[x.path,x]));
const excluded=new Set([LEDGER]);
const changes=[];
for(const p of [...new Set([...parentRows.keys(),...current.keys()])].sort()){
  if(excluded.has(p)) continue;
  const a=parentRows.get(p), b=current.get(p);
  if(!a&&b) changes.push({path:p,change:"ADDED",after:b});
  else if(a&&!b) changes.push({path:p,change:"DELETED",before:a});
  else if(a&&b&&(a.sha256!==b.sha256||a.byteLength!==b.byteLength||a.mode!==b.mode)) changes.push({path:p,change:"MODIFIED",before:a,after:b});
}
const canonical=(x)=>JSON.stringify(x, (k,v)=>v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))) : v);
const checks=[]; const add=(id,ok,detail=null)=>checks.push({id,ok:Boolean(ok),detail});
add("schema",ledger.schemaVersion==="velmere.pass36.a102r44p21.approved-current-source-changes.v1");
add("revision",ledger.revisionId===REV&&ledger.parentRevisionId===PARENT);
add("parent-manifest",ledger.parentManifestPath===PARENT_MAN&&ledger.parentManifestSha256===sha(fs.readFileSync(path.join(ROOT,PARENT_MAN))));
add("exact-changes",canonical(ledger.changes)===canonical(changes),{expected:changes.length,actual:ledger.changes?.length});
add("counts",ledger.addedCount===changes.filter(x=>x.change==="ADDED").length&&ledger.modifiedCount===changes.filter(x=>x.change==="MODIFIED").length&&ledger.deletedCount===changes.filter(x=>x.change==="DELETED").length);
add("no-deletions",ledger.deletedCount===0);
add("no-removed-tests",ledger.removedTests===0);
add("no-denominator-collapse",ledger.denominatorCollapse===false);
add("no-history-mutations",ledger.historyMutations===0);
add("r44p21-files-present",["lib/commerce/vlm-field-level-readiness.ts","lib/commerce/vlm-current-commercial-evidence.ts","scripts/pass36/test-a102r44p21-field-commercial-readiness.mjs","scripts/pass36/verify-a102r44p21-source-authority.mjs","scripts/pass36/verify-a102r44p21-static-policy.mjs"].every((p)=>current.has(p)));
add("historical-r44p20-manifest-retained",current.has(PARENT_MAN));
add("no-parent-history-rewrite",changes.filter(x=>/^config\/pass36\/a102r44p20-|^scripts\/pass36\/.*r44p20|^VELMERE_A102R44P20_PATCH/.test(x.path)).length===0);
const failed=checks.filter(x=>!x.ok);
console.log(JSON.stringify({schemaVersion:"velmere.pass36.a102r44p21.approved-source-changes-verification.v1",status:failed.length?"FAIL":"PASS_R44P21_APPROVED_SOURCE_CHANGES",checks:checks.length,passed:checks.length-failed.length,failed:failed.length,changes:changes.length,rows:checks},null,2));
if(failed.length) process.exit(1);
