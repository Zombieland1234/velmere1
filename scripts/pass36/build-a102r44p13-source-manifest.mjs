import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const revisionId="VELMERE_PASS36_A102R44P13_ACTION_REQUIRED_FINAL_FROZEN_LINUX_DUAL_BUILD_BROWSER_57_SCREENSHOT_29_AND_CURRENT_BYTE_STATIC_CLOSURE_NO_LIVE_CREDIT";
const parentRevisionId="VELMERE_PASS36_A102R44P12_ACTION_REQUIRED_REAL_PUBLIC_PROVIDER_DIAGNOSTIC_15_ASSET_TWO_PROVIDER_IDENTITY_FRESHNESS_CONFLICT_AND_RIGHTS_BOUNDARY_NO_LIVE_CREDIT";
const manifestRel="_velmere/PASS36_A102R44P13_SOURCE_MANIFEST.json";
const forbiddenNames=new Set(["node_modules",".next",".turbo",".cache","coverage","test-results","playwright-report","__pycache__",".pytest_cache"]);
const sha=(b)=>crypto.createHash("sha256").update(b).digest("hex");
function walk(dir){const rows=[];for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const full=path.join(dir,entry.name);const rel=path.relative(root,full).split(path.sep).join("/");const stat=fs.lstatSync(full);if(stat.isSymbolicLink())throw new Error(`symlink forbidden: ${rel}`);if(entry.isDirectory()){if(forbiddenNames.has(entry.name)||entry.name.startsWith(".next-"))throw new Error(`generated directory forbidden: ${rel}`);rows.push(...walk(full));}else if(entry.isFile()){if(rel===manifestRel)continue;if(/(^|\/)\.env(?:\.|$)/i.test(rel))throw new Error(`environment file forbidden: ${rel}`);rows.push({path:rel,byteLength:stat.size,sha256:sha(fs.readFileSync(full)),mode:stat.mode&0o777});}else throw new Error(`non-regular entry: ${rel}`);}return rows;}
const entries=walk(root).sort((a,b)=>a.path.localeCompare(b.path));
const pathSetSha256=sha(entries.map(x=>x.path).join("\n")+"\n");
const aggregateSha256=sha(entries.map(x=>`${x.path}\0${x.byteLength}\0${x.sha256}\0${x.mode}\n`).join(""));
const doc={schemaVersion:"velmere.pass36.a102r44p13.source-manifest.v1",revisionId,parentRevisionId,manifestPath:manifestRel,manifestSelfExcluded:true,parentSourceArchive:{filename:"VELMERE_PASS36_A102R44P12_ACTION_REQUIRED_REAL_PUBLIC_PROVIDER_DIAGNOSTIC_15_ASSET_TWO_PROVIDER_IDENTITY_FRESHNESS_CONFLICT_AND_RIGHTS_BOUNDARY_NO_LIVE_CREDIT_SOURCE_ONLY.zip",byteLength:56478782,sha256:"dd5363b8bd8b6ea16790c6b086a1172fd2a612b86e7ce1a9d6234ef56e4d481a"},fileCount:entries.length,byteLength:entries.reduce((s,x)=>s+x.byteLength,0),pathSetSha256,aggregateSha256,forbiddenPathsDetected:[],globalDecision:"NO_GO",live:false,saleEnabled:false,productionApproved:false,worldClassProven:false,entries};
const out=path.join(root,manifestRel);fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(doc,null,2)+"\n",{encoding:"utf8",mode:0o644});console.log(JSON.stringify({status:"PASS_R44P13_SOURCE_MANIFEST_BUILT",fileCount:doc.fileCount,byteLength:doc.byteLength,pathSetSha256,aggregateSha256},null,2));
