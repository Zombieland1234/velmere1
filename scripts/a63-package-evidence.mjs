#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { writeDeterministicZip } from "./pass4826/release-package-contract.mjs";
import { canonicalJson, sha256 } from "./pass35/source-inventory.mjs";
const root=process.cwd();
const policy=JSON.parse(fs.readFileSync(path.join(root,"config/pass36/a63-staging-program-orchestrator.json"),"utf8"));
const base=path.join(root,"artifacts/pass36/a63");
const receiptPath=path.join(base,"PASS36_A63_STAGING_PROGRAM_ORCHESTRATOR.json");
if(!fs.existsSync(receiptPath)) throw new Error("a63_receipt_missing");
const receipt=JSON.parse(fs.readFileSync(receiptPath,"utf8"));
if(receipt.decision!==policy.decisions.verified||receipt.fixtureMode===true||receipt.saleEnabled!==false||receipt.liveProven!==false||receipt.sourceUnchanged!==true||receipt.summary?.stagesVerified!==policy.stages.length) throw new Error(`a63_evidence_not_verified:${receipt.decision}`);
const files=[];
function add(absolute,relative){const bytes=fs.readFileSync(absolute);files.push({path:relative,role:"A63_VERIFIED_EVIDENCE",byteLength:bytes.length,sha256:sha256(bytes),mode:0o100644,content:bytes});}
add(receiptPath,"PASS36_A63_STAGING_PROGRAM_ORCHESTRATOR.json");
const md=path.join(base,"PASS36_A63_STAGING_PROGRAM_ORCHESTRATOR.md");if(fs.existsSync(md))add(md,"PASS36_A63_STAGING_PROGRAM_ORCHESTRATOR.md");
const runs=path.join(base,"runs");if(fs.existsSync(runs)){const walk=(dir)=>{for(const e of fs.readdirSync(dir,{withFileTypes:true})){const a=path.join(dir,e.name);if(e.isDirectory())walk(a);else add(a,path.relative(base,a).replaceAll("\\","/"));}};walk(runs);}
files.sort((a,b)=>a.path.localeCompare(b.path));
const manifestCore={schemaVersion:"velmere.pass36.a63.evidence-manifest.v1",revisionId:policy.revisionId,fileCount:files.length,files:files.map(({path,byteLength,sha256,mode})=>({path,byteLength,sha256,mode})),saleEnabled:false,liveProven:false};
const manifest={...manifestCore,manifestSha256:sha256(canonicalJson(manifestCore))};
files.push({path:"PASS36_A63_EVIDENCE_MANIFEST.json",role:"A63_EVIDENCE_MANIFEST",byteLength:Buffer.byteLength(JSON.stringify(manifest,null,2)+"\n"),sha256:sha256(Buffer.from(JSON.stringify(manifest,null,2)+"\n")),mode:0o100644,content:Buffer.from(JSON.stringify(manifest,null,2)+"\n")});
const output=path.join(root,"artifacts/pass36/PASS36_A63_STAGING_PROGRAM_ORCHESTRATOR_EVIDENCE.zip");writeDeterministicZip(output,files);
console.log(JSON.stringify({status:"PASS",output:path.relative(root,output).replaceAll("\\","/"),files:files.length,sha256:sha256(fs.readFileSync(output))},null,2));
