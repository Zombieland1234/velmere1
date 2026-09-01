#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { REV, MANIFEST, walk, aggregate, pathSet } from "./r44p44-source-lib.mjs";
const root=path.resolve(process.argv[2]??process.cwd());
const manifestPath=path.join(root,...MANIFEST.split("/"));
const fail=(message,extra={})=>{console.log(JSON.stringify({status:"FAIL_R44P44_SOURCE_AUTHORITY",message,...extra},null,2));process.exit(1);};
if(!fs.existsSync(manifestPath)) fail("MANIFEST_MISSING");
const manifest=JSON.parse(fs.readFileSync(manifestPath,"utf8"));
if(manifest.revisionId!==REV) fail("REVISION_MISMATCH",{actual:manifest.revisionId,expected:REV});
const actual=walk(root,new Set([MANIFEST]));
const expected=[...manifest.files];
if(actual.length!==expected.length) fail("FILE_COUNT_MISMATCH",{actual:actual.length,expected:expected.length});
for(let index=0;index<actual.length;index++){
  const a=actual[index],e=expected[index];
  if(a.path!==e.path||a.byteLength!==e.byteLength||a.sha256!==e.sha256) fail("FILE_BINDING_MISMATCH",{index,actual:a,expected:e});
}
const sourceAggregateSha256=aggregate(actual);
const pathSetSha256=pathSet(actual);
const payloadBytes=actual.reduce((sum,row)=>sum+row.byteLength,0);
if(sourceAggregateSha256!==manifest.sourceAggregateSha256) fail("AGGREGATE_MISMATCH",{actual:sourceAggregateSha256,expected:manifest.sourceAggregateSha256});
if(pathSetSha256!==manifest.pathSetSha256||payloadBytes!==manifest.payloadBytes) fail("TOTAL_MISMATCH",{pathSetSha256,payloadBytes});
console.log(JSON.stringify({status:"PASS_R44P44_SOURCE_AUTHORITY",revisionId:REV,fileCount:actual.length,payloadBytes,sourceAggregateSha256,pathSetSha256,sourceImmutable:true},null,2));
