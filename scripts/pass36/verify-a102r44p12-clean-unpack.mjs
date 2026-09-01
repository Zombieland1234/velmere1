import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

const args=process.argv.slice(2);const zipIndex=args.indexOf("--source-zip");const outIndex=args.indexOf("--receipt-dir");if(zipIndex<0||outIndex<0||!args[zipIndex+1]||!args[outIndex+1])throw new Error("usage: --source-zip <zip> --receipt-dir <dir>");
const sourceZip=path.resolve(args[zipIndex+1]);const receiptDir=path.resolve(args[outIndex+1]);if(fs.existsSync(receiptDir))throw new Error("receipt dir must not exist");fs.mkdirSync(receiptDir,{recursive:true});
const cleanRoot=`${receiptDir}.clean-source`;if(fs.existsSync(cleanRoot))throw new Error("clean root exists");fs.mkdirSync(cleanRoot,{recursive:true});
const py=`import os,stat,sys,zipfile,pathlib
z=zipfile.ZipFile(sys.argv[1])
r=pathlib.Path(sys.argv[2])
for i in z.infolist():
 p=pathlib.PurePosixPath(i.filename)
 if p.is_absolute() or '..' in p.parts or chr(92) in i.filename: raise SystemExit('unsafe path')
 raw_mode=(i.external_attr>>16)&0xffff
 if stat.S_ISLNK(raw_mode): raise SystemExit('symlink entry forbidden')
 t=r.joinpath(*p.parts)
 if i.is_dir():
  t.mkdir(parents=True,exist_ok=True)
  os.chmod(t,raw_mode&0o777 or 0o755)
 else:
  t.parent.mkdir(parents=True,exist_ok=True)
  t.write_bytes(z.read(i))
  os.chmod(t,raw_mode&0o777 or 0o644)
`;
const extract=spawnSync("python3",["-c",py,sourceZip,cleanRoot],{encoding:"utf8",maxBuffer:8*1024*1024});if(extract.status!==0)throw new Error(`extract failed: ${extract.stderr}`);
const node=process.execPath;const stages=[
 ["01-authority-literal-first","scripts/pass36/verify-a102r44p12-source-authority.mjs",[]],
 ["02-approved-changes","scripts/pass36/verify-a102r44p12-approved-source-changes.mjs",[]],
 ["03-static-policy","scripts/pass36/verify-a102r44p12-static-policy.mjs",[]],
 ["04-independent-audit","scripts/pass36/verify-a102r44p12-independent-final-audit.mjs",[]],
];
const results=[];for(const [id,script,extra] of stages){const run=spawnSync(node,[script,...extra],{cwd:cleanRoot,encoding:"utf8",maxBuffer:32*1024*1024,env:{PATH:process.env.PATH??"",HOME:process.env.HOME??"",LANG:"C.UTF-8",LC_ALL:"C.UTF-8"}});fs.writeFileSync(path.join(receiptDir,`${id}.stdout.log`),run.stdout??"");fs.writeFileSync(path.join(receiptDir,`${id}.stderr.log`),run.stderr??"");results.push({id,script,exitCode:run.status,stdoutSha256:crypto.createHash("sha256").update(run.stdout??"").digest("hex"),stderrBytes:Buffer.byteLength(run.stderr??"")});if(run.status!==0)break;}
const firstChildLiteral=results[0]?.script==="scripts/pass36/verify-a102r44p12-source-authority.mjs";const result={schemaVersion:"velmere.pass36.a102r44p12.clean-unpack-receipt.v1",status:results.length===stages.length&&results.every((x)=>x.exitCode===0)&&firstChildLiteral?"PASS_R44P12_CLEAN_UNPACK":"FAIL_R44P12_CLEAN_UNPACK",sourceZip:{path:sourceZip,byteLength:fs.statSync(sourceZip).size,sha256:crypto.createHash("sha256").update(fs.readFileSync(sourceZip)).digest("hex")},cleanRoot,requiredSteps:stages.length,executedSteps:results.length,passedSteps:results.filter((x)=>x.exitCode===0).length,failedSteps:results.filter((x)=>x.exitCode!==0).map((x)=>x.id),firstChildLiteral,results,globalDecision:"NO_GO",live:false,saleEnabled:false,productionApproved:false,worldClassProven:false};fs.writeFileSync(path.join(receiptDir,"R44P12_CLEAN_UNPACK_RECEIPT.json"),JSON.stringify(result,null,2)+"\n");console.log(JSON.stringify(result,null,2));if(!result.status.startsWith("PASS"))process.exit(1);
