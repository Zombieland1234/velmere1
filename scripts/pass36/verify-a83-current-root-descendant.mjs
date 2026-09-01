#!/usr/bin/env node
import { collectPass35Inventory } from "../pass35/source-inventory.mjs";
import { digestValid, readJson, sha256, verifyCurrentAuthority, verifyHistoricalDescendantChain } from "./historical-descendant-chain-lib.mjs";
const root=process.cwd();
const REV="VELMERE_PASS36_A83R0_BROWSER_LENS_PDF_REAL_PACKET_MATRIX_AND_SECURE_DELIVERY_PARITY";
const policy=readJson(root,"config/pass36/a83-browser-lens-pdf-real-packet-policy.json");
const parent=readJson(root,policy.parentDescendantManifestPath);
const manifest=readJson(root,policy.descendantManifestPath);
const authorityResult=verifyCurrentAuthority(root);
const checks=[]; const add=(id,p,d=null)=>checks.push({id,passed:Boolean(p),detail:d});
add("parent:digest",digestValid(parent),parent.manifestDigestSha256);
add("parent:revision",parent.revisionId===policy.parentRevisionId,parent.revisionId);
add("manifest:digest",digestValid(manifest),manifest.manifestDigestSha256);
add("manifest:revision",manifest.revisionId===REV,manifest.revisionId);
add("manifest:parent",manifest.parentDescendantManifestDigestSha256===parent.manifestDigestSha256);
add("claims:no-credit",manifest.claims?.realPacketsVerified===0&&manifest.claims?.productionBrowserRuns===0&&manifest.claims?.secureDeliveries===0&&manifest.claims?.paidGateEligible===false&&manifest.claims?.liveProven===false&&manifest.claims?.saleEnabled===false,manifest.claims);
if(authorityResult.current.sourceRevisionId===REV){
 const ex=new Set(policy.descendantManifestExclusions), inv=collectPass35Inventory(root), rows=inv.entries.filter(r=>r.sourceIncluded&&!ex.has(r.path)).map(r=>({path:r.path,byteLength:r.byteLength,sha256:r.sha256,mode:r.mode})).sort((a,b)=>a.path.localeCompare(b.path,"en"));
 const observed={fileCount:rows.length,byteLength:rows.reduce((s,r)=>s+r.byteLength,0),pathSetSha256:sha256(rows.map(r=>r.path).join("\n")),aggregateSha256:sha256(rows.map(r=>`${r.path}\0${r.byteLength}\0${r.sha256}\0${r.mode}`).join("\n"))};
 for(const k of Object.keys(observed))add(`payload:${k}`,manifest.payload?.[k]===observed[k],{declared:manifest.payload?.[k],observed:observed[k]});
 add("inventory:unknown",inv.unknownCount===0,inv.unknownCount);
}else{
 const chain=verifyHistoricalDescendantChain(root,policy.descendantManifestPath,authorityResult.current.sourceRevisionId);
 for(const row of chain.checks)add(`historical:${row.id}`,row.passed,row.detail);
}
for(const row of authorityResult.checks)add(row.id,row.passed,row.detail);
const failed=checks.filter(r=>!r.passed);
const report={schemaVersion:"velmere.pass36.a83.current-root-descendant-verification.v2",revisionId:REV,status:failed.length?"FAIL_A83_DESCENDANT":"PASS_A83_HISTORICAL_OR_CURRENT_DESCENDANT_CHAIN",checks:checks.length,passed:checks.length-failed.length,failed:failed.length,failures:failed,payload:manifest.payload,currentRevisionId:authorityResult.current.sourceRevisionId,historicalPayloadRecomputedAgainstCurrentTree:false,realPacketsVerified:0,productionBrowserRuns:0,liveProven:false,saleEnabled:false};
console.log(JSON.stringify(report,null,2)); if(failed.length)process.exit(1);
