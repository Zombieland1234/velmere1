#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { REV, PARENT, MANIFEST, walk, aggregate, pathSet } from "./r44p44-source-lib.mjs";
const root=path.resolve(process.argv[2]??process.cwd());
const out=path.join(root,...MANIFEST.split("/"));
const files=walk(root,new Set([MANIFEST]));
const manifest={
  schemaVersion:"velmere.pass36.a102r44p44.source-manifest.v1",
  revisionId:REV,
  parentSourceRevisionId:PARENT,
  parentCheckpointRevisionId:PARENT,
  pathOrderAlgorithm:"UTF8_BYTEWISE_ASCENDING_V1",
  fileCount:files.length,
  payloadBytes:files.reduce((sum,row)=>sum+row.byteLength,0),
  sourceAggregateSha256:aggregate(files),
  pathSetSha256:pathSet(files),
  files,
  excludedGenerated:["node_modules","artifacts",".velmere",".next*",".turbo",".cache","coverage","test-results","playwright-report","out","cache","failures","__pycache__","*.tsbuildinfo"]
};
fs.mkdirSync(path.dirname(out),{recursive:true});
fs.writeFileSync(out,`${JSON.stringify(manifest,null,2)}
`);
console.log(JSON.stringify({status:"BUILT_R44P44_SOURCE_MANIFEST",manifestPath:MANIFEST,fileCount:manifest.fileCount,payloadBytes:manifest.payloadBytes,sourceAggregateSha256:manifest.sourceAggregateSha256,pathSetSha256:manifest.pathSetSha256},null,2));
