#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
const root=process.cwd(); const source=path.join(root,"artifacts/pass35/a49"); const out=path.join(root,"artifacts/pass35/PASS35_A49_STRIPE_TEST_PAYMENT_ACCEPTANCE_EVIDENCE.zip");
fs.mkdirSync(source,{recursive:true}); const files=[]; function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const a=path.join(dir,e.name);if(e.isDirectory())walk(a);else if(a!==out)files.push(a);}} walk(source);
const manifest=files.sort().map(a=>({path:path.relative(source,a).replaceAll("\\","/"),bytes:fs.statSync(a).size,sha256:crypto.createHash("sha256").update(fs.readFileSync(a)).digest("hex")}));
fs.writeFileSync(path.join(source,"PASS35_A49_EVIDENCE_MANIFEST.json"),`${JSON.stringify({schemaVersion:"velmere.pass35.a49.evidence-manifest.v1",revisionId:"VELMERE_PASS35_A49_STRIPE_TEST_PAYMENT_REFUND_RECONCILIATION_ACCEPTANCE",generatedAt:new Date().toISOString(),files:manifest},null,2)}\n`);
if(fs.existsSync(out))fs.rmSync(out,{force:true}); let r;
if(process.platform==="win32"){const ps=`Compress-Archive -Path '${source.replaceAll("'","''")}\\*' -DestinationPath '${out.replaceAll("'","''")}' -CompressionLevel Optimal -Force`;r=spawnSync("powershell",["-NoProfile","-ExecutionPolicy","Bypass","-Command",ps],{cwd:root,encoding:"utf8"});}
else r=spawnSync("python3",["-c","import os,sys,zipfile; s,o=sys.argv[1:]; z=zipfile.ZipFile(o,'w',zipfile.ZIP_DEFLATED); [z.write(os.path.join(r,f),os.path.relpath(os.path.join(r,f),s).replace(os.sep,'/')) for r,_,fs in os.walk(s) for f in fs if os.path.join(r,f)!=o]; z.close()",source,out],{cwd:root,encoding:"utf8"});
if(r.status!==0){console.error(r.stderr||r.stdout);process.exit(1);} console.log(JSON.stringify({output:path.relative(root,out).replaceAll("\\","/"),bytes:fs.statSync(out).size,sha256:crypto.createHash("sha256").update(fs.readFileSync(out)).digest("hex")},null,2));
