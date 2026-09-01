#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const REV="VELMERE_PASS36_A102R44P18_ACTION_REQUIRED_OFFICIAL_PROVIDER_RIGHTS_FAIL_CLOSED_CUSTOMER_DELIVERY_COINPAPRIKA_COINBASE_NO_LIVE_CREDIT";
const PARENT="VELMERE_PASS36_A102R44P17_ACTION_REQUIRED_DETERMINISTIC_50_ASSET_REAL_NETWORK_DIAGNOSTIC_CROSS_SURFACE_VALUE_AND_RIGHTS_BOUNDARY_NO_LIVE_CREDIT";
const MANIFEST_REL="_velmere/PASS36_A102R44P18_SOURCE_ONLY_MANIFEST.json";
const manifest=JSON.parse(fs.readFileSync(path.join(ROOT,MANIFEST_REL),"utf8"));
const excludedTop=new Set(["node_modules",".git",".velmere","artifacts","coverage","test-results","playwright-report",".cache","tmp","temp","__pycache__"]);
const forbiddenParts=new Set(["node_modules",".git",".velmere","artifacts","coverage","test-results","playwright-report",".cache","__pycache__"]);
const sha=b=>crypto.createHash("sha256").update(b).digest("hex");
const rows=[];
function walk(dir,rel=""){
 for(const e of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
  const r=rel?`${rel}/${e.name}`:e.name;
  if(!rel&&(excludedTop.has(e.name)||e.name.startsWith(".next")))continue;
  if(r===MANIFEST_REL)continue;
  const full=path.join(dir,e.name),st=fs.lstatSync(full);
  if(st.isSymbolicLink())throw new Error(`symlink_forbidden:${r}`);
  if(e.isDirectory()){walk(full,r);continue;}
  if(!e.isFile())throw new Error(`non_regular_forbidden:${r}`);
  if(r.split("/").some(p=>forbiddenParts.has(p)||p.startsWith(".next")||p===".env"||p.startsWith(".env.")))throw new Error(`forbidden_path:${r}`);
  const bytes=fs.readFileSync(full);rows.push({path:r,byteLength:bytes.length,sha256:sha(bytes),mode:st.mode&0o777});
 }
}
walk(ROOT);
const order=new Map(manifest.entries.map((r,i)=>[r.path,i]));rows.sort((a,b)=>(order.get(a.path)??Number.MAX_SAFE_INTEGER)-(order.get(b.path)??Number.MAX_SAFE_INTEGER));
const byteLength=rows.reduce((s,r)=>s+r.byteLength,0);
const pathSetSha256=sha(Buffer.from(rows.map(r=>r.path).join("\n")+"\n"));
const aggregateSha256=sha(Buffer.from(rows.map(r=>`${r.path}\0${r.byteLength}\0${r.sha256}\0${r.mode.toString(8)}`).join("\n")+"\n"));
const checks=[];const c=(id,ok,d=null)=>checks.push({id,ok:Boolean(ok),detail:d});
c("schema",manifest.schemaVersion==="velmere.pass36.a102r44p18.source-manifest.v1");
c("revision",manifest.revisionId===REV&&manifest.parentRevisionId===PARENT);
c("file-count",manifest.fileCount===rows.length,{expected:manifest.fileCount,actual:rows.length});
c("byte-length",manifest.byteLength===byteLength,{expected:manifest.byteLength,actual:byteLength});
c("path-set",manifest.pathSetSha256===pathSetSha256);
c("aggregate",manifest.aggregateSha256===aggregateSha256);
const canon=v=>Array.isArray(v)?v.map(canon):v&&typeof v==="object"?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canon(v[k])])):v;
c("entries",JSON.stringify(canon(manifest.entries))===JSON.stringify(canon(rows)));
c("active-pass",fs.readFileSync(path.join(ROOT,"VELMERE_ACTIVE_PASS.txt"),"utf8").trim()===REV);
const state=JSON.parse(fs.readFileSync(path.join(ROOT,"config/pass36/a102r44p18-action-required-current-state.json"),"utf8"));
c("truth-flags",state.globalDecision==="NO_GO"&&state.LIVE===false&&state.saleEnabled===false&&state.productionApproved===false&&state.worldClassProven===false);
c("rights-zero",state.providerRights?.rightsApprovedProviders===0&&state.providerRights?.customerDisplayAllowedProviders===0&&state.providerRights?.paidTierAllowedProviders===0);
c("approved-bound",manifest.approvedChangesPath==="config/pass36/a102r44p18-approved-current-source-changes.json"&&/^[0-9a-f]{64}$/u.test(manifest.approvedChangesSha256));
c("parent-bound",manifest.parentManifestPath==="_velmere/PASS36_A102R44P17_SOURCE_ONLY_MANIFEST.json"&&/^[0-9a-f]{64}$/u.test(manifest.parentManifestSha256));
c("no-forbidden",rows.every(r=>!r.path.split("/").some(p=>forbiddenParts.has(p)||p.startsWith(".next")||p===".env"||p.startsWith(".env."))));
c("policy-present",fs.existsSync(path.join(ROOT,"config/pass36/a102r44p18-official-provider-rights-decision-matrix.json"))&&fs.existsSync(path.join(ROOT,"lib/compliance/provider-delivery-rights-gate.mjs")));
const failed=checks.filter(x=>!x.ok);const result={schemaVersion:"velmere.pass36.a102r44p18.source-authority-receipt.v1",status:failed.length?"FAIL":"PASS_R44P18_SOURCE_AUTHORITY",checks:checks.length,passed:checks.length-failed.length,failed:failed.length,revisionId:REV,manifestSha256:sha(fs.readFileSync(path.join(ROOT,MANIFEST_REL))),aggregateSha256,fileCount:rows.length,sourceImmutable:true,rows:checks};console.log(JSON.stringify(result,null,2));if(failed.length)process.exit(1);
