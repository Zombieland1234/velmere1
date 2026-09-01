#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
const REV="VELMERE_PASS36_A102R44P43_ACTION_REQUIRED_PUBLIC_BALANCED_HOLDOUT_LEGACY_COMPILER_AST_AND_CONTROL_ALERT_RATE_TEST_CYCLE_2_OF_3_NO_LIVE_CREDIT";
const PARENT_SOURCE="VELMERE_PASS36_A102R44P41_ACTION_REQUIRED_OFFICIAL_FOUNDRY_INVARIANTS_ANVIL_RAW_RPC_EXACT_OFFLINE_FULL_LINUX_RELEASE_NO_LIVE_CREDIT";
const PARENT_CHECKPOINT="VELMERE_PASS36_A102R44P41_ACTION_REQUIRED_OFFICIAL_FOUNDRY_INVARIANTS_ANVIL_RAW_RPC_EXACT_OFFLINE_FULL_LINUX_RELEASE_NO_LIVE_CREDIT";
const root=path.resolve(process.argv[2]??process.cwd());
const manifestRelative="_velmere/PASS36_A102R44P43_SOURCE_ONLY_MANIFEST.json";
const manifestPath=path.join(root,...manifestRelative.split("/"));
const excludedParts=new Set(["node_modules",".git",".next",".turbo",".cache","coverage","test-results","playwright-report","__pycache__",".pytest_cache","tmp","temp","out","cache","failures"]);
const excluded=(relativePath)=>relativePath.split("/").some((part)=>excludedParts.has(part)||part.startsWith(".next-"));
const compareUtf8=(a,b)=>Buffer.compare(Buffer.from(a,"utf8"),Buffer.from(b,"utf8"));
const sha256=(bytes)=>crypto.createHash("sha256").update(bytes).digest("hex");
function walk(directory,base=""){const rows=[];for(const entry of fs.readdirSync(directory,{withFileTypes:true})){const relative=base?`${base}/${entry.name}`:entry.name;if(excluded(relative))continue;const absolute=path.join(directory,entry.name);const stat=fs.lstatSync(absolute);if(stat.isSymbolicLink())throw new Error(`symlink_forbidden:${relative}`);if(entry.isDirectory())rows.push(...walk(absolute,relative));else if(entry.isFile()&&relative!==manifestRelative){const bytes=fs.readFileSync(absolute);rows.push({path:relative,byteLength:bytes.length,sha256:sha256(bytes)});}}return rows;}
const files=walk(root).sort((a,b)=>compareUtf8(a.path,b.path));
const aggregate=crypto.createHash("sha256");for(const row of files)aggregate.update(`${row.path}\0${row.byteLength}\0${row.sha256}\n`);
const sourceAggregateSha256=aggregate.digest("hex");
const pathSetSha256=sha256(Buffer.from(`${files.map((r)=>r.path).join("\n")}\n`,"utf8"));
const manifest={schemaVersion:"velmere.pass36.a102r44p43.source-manifest.v1",revisionId:REV,parentSourceRevisionId:PARENT_SOURCE,parentCheckpointRevisionId:PARENT_CHECKPOINT,pathOrderAlgorithm:"UTF8_BYTEWISE_ASCENDING_V1",fileCount:files.length,payloadBytes:files.reduce((s,r)=>s+r.byteLength,0),sourceAggregateSha256,pathSetSha256,files,excludedGenerated:["node_modules",".next*",".turbo",".cache","coverage","test-results","playwright-report","out","cache","failures"]};
fs.mkdirSync(path.dirname(manifestPath),{recursive:true});fs.writeFileSync(manifestPath,`${JSON.stringify(manifest,null,2)}\n`);
console.log(JSON.stringify({status:"BUILT_R44P43_SOURCE_MANIFEST",manifestPath:manifestRelative,fileCount:manifest.fileCount,payloadBytes:manifest.payloadBytes,sourceAggregateSha256,pathSetSha256},null,2));
