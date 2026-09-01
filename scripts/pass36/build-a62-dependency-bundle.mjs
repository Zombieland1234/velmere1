#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { expectedLockPackages, sha256 } from "./a62-offline-runtime-dependency-lib.mjs";

const root=process.cwd();
const policy=JSON.parse(fs.readFileSync(path.join(root,"config/pass36/a62-offline-exact-runtime-dependency-bootstrap.json"),"utf8"));
const output=path.resolve(process.argv[2]??path.join(root,"artifacts/pass36/a62/A62_DEPENDENCY_BUNDLE.zip"));
const confirm=String(process.env.VELMERE_A62_BUILD_DEPENDENCY_BUNDLE_CONFIRM??"");
if(confirm!=="I_UNDERSTAND_A62_DOWNLOADS_ONLY_PACKAGE_LOCK_BOUND_NPM_TARBALLS") throw new Error("a62_dependency_bundle_build_confirmation_invalid");
const lockBytes=fs.readFileSync(path.join(root,policy.packageLock.path));
if(sha256(lockBytes)!==policy.packageLock.sha256) throw new Error("a62_dependency_bundle_build_lock_anchor_mismatch");
const lock=JSON.parse(lockBytes.toString("utf8")); const expected=expectedLockPackages(lock);
if(expected.length!==policy.packageLock.expectedRemotePackages) throw new Error(`a62_dependency_bundle_build_denominator:${expected.length}`);
const allowedHosts=new Set(expected.map((row)=>new URL(row.resolved).hostname));
if(allowedHosts.size!==1||!allowedHosts.has("registry.npmjs.org")) throw new Error(`a62_dependency_bundle_build_hosts:${[...allowedHosts].join(",")}`);
const temp=fs.mkdtempSync(path.join(os.tmpdir(),"velmere-a62-dependency-bundle-")); const tarRoot=path.join(temp,"tarballs"); fs.mkdirSync(tarRoot,{recursive:true});
function integrity(bytes,sri){const [alg,encoded]=sri.split("-",2);return crypto.createHash(alg).update(bytes).digest("base64")===encoded;}
async function download(row,index){
  const url=new URL(row.resolved); if(url.protocol!=="https:"||!allowedHosts.has(url.hostname)||url.username||url.password||url.hash) throw new Error(`a62_dependency_url_invalid:${row.lockPath}`);
  let last=null;
  for(let attempt=1;attempt<=3;attempt++){
    try{
      const response=await fetch(url,{redirect:"error",signal:AbortSignal.timeout(60_000),headers:{"user-agent":"Velmere-A62-Offline-Bundle/1"}});
      if(!response.ok) throw new Error(`http_${response.status}`);
      const length=Number(response.headers.get("content-length")??0); if(length>policy.dependencyBundle.budgets.maximumSingleFileBytes) throw new Error(`content_length_budget:${length}`);
      const bytes=Buffer.from(await response.arrayBuffer()); if(bytes.length>policy.dependencyBundle.budgets.maximumSingleFileBytes) throw new Error(`tarball_budget:${bytes.length}`);
      if(!integrity(bytes,row.integrity)) throw new Error("sri_mismatch");
      const digest=sha256(bytes); const tarballPath=`tarballs/${String(index).padStart(4,"0")}-${digest}.tgz`;
      fs.writeFileSync(path.join(temp,tarballPath),bytes,{flag:"wx"});
      return {...row,tarballPath,byteLength:bytes.length,sha256:digest};
    }catch(error){last=error instanceof Error?error.message:String(error); if(attempt<3) await new Promise((resolve)=>setTimeout(resolve,attempt*1000));}
  }
  throw new Error(`a62_dependency_download_failed:${row.lockPath}:${last}`);
}
try{
  const rows=new Array(expected.length); let cursor=0;
  async function worker(){while(true){const index=cursor++; if(index>=expected.length)return; rows[index]=await download(expected[index],index);}}
  await Promise.all(Array.from({length:Math.min(8,expected.length)},()=>worker()));
  const manifest={schemaVersion:policy.dependencyBundle.schemaVersion,packageLockSha256:policy.packageLock.sha256,packages:rows};
  fs.writeFileSync(path.join(temp,policy.dependencyBundle.manifestPath),`${JSON.stringify(manifest,null,2)}\n`);
  const zipped=spawnSync(policy.pythonCommand??"python3",["scripts/pass36/a62_deterministic_zip.py",temp,output],{cwd:root,encoding:"utf8",timeout:60*60_000});
  if(zipped.status!==0) throw new Error(zipped.stderr||zipped.stdout||"a62_dependency_bundle_zip_failed");
  const archive=fs.readFileSync(output);
  console.log(JSON.stringify({status:"PASS_A62_DEPENDENCY_BUNDLE_BUILD",output,sha256:sha256(archive),byteLength:archive.length,packages:rows.length,packageLockSha256:policy.packageLock.sha256},null,2));
}finally{fs.rmSync(temp,{recursive:true,force:true});}
