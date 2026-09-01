import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import {createHash} from 'node:crypto'; import {spawnSync} from 'node:child_process'; import ts from 'typescript';
import {writeJsonToStdoutFully} from '../../lib/build/complete-json-stdout.mjs';
import {treeDigest, writeJson, PASS13_DIR, now, rel} from './common.mjs';
const script=path.resolve(process.argv[1]);
function config(){ const cf=ts.readConfigFile('tsconfig.json',ts.sys.readFile); if(cf.error) throw new Error(ts.flattenDiagnosticMessageText(cf.error.messageText,'\n')); return ts.parseJsonConfigFileContent(cf.config,ts.sys,process.cwd()); }
function chunks(){ const roots=config().fileNames.sort(); const mi=roots.filter(f=>rel(f).startsWith('app/api/market-integrity/')); const sec=roots.filter(f=>rel(f).startsWith('app/api/security/')); const rest=roots.filter(f=>!mi.includes(f)&&!sec.includes(f)); const split=(a,n)=>Array.from({length:n},(_,i)=>a.filter((_,j)=>j%n===i)); return [...split(mi,6),...split(sec,3),...split(rest,10)].filter(x=>x.length); }
if(process.argv[2]==='--worker'){
 const idx=Number(process.argv[3]); const parsed=config(); const groups=chunks(); const roots=groups[idx]; const opts={...parsed.options,noEmit:true,incremental:false,tsBuildInfoFile:undefined}; const t=Date.now();
 const program=ts.createProgram({rootNames:roots,options:opts,projectReferences:parsed.projectReferences}); const diagnostics=ts.getPreEmitDiagnostics(program); const format=d=>{const msg=ts.flattenDiagnosticMessageText(d.messageText,' '); if(!d.file)return`TS${d.code} ${msg}`; const p=d.file.getLineAndCharacterOfPosition(d.start??0); return`${rel(d.file.fileName)}:${p.line+1}:${p.character+1} TS${d.code} ${msg}`};
 const files=program.getSourceFiles().map(x=>path.resolve(x.fileName)).filter(x=>x.startsWith(process.cwd()+path.sep)&&!x.includes(`${path.sep}node_modules${path.sep}`)).map(rel).sort();
 await writeJsonToStdoutFully({idx,roots:roots.map(rel),files,diagnostics:diagnostics.map(format),durationMs:Date.now()-t,typescript:ts.version}); process.exit(diagnostics.length?1:0);
}
const nextEnvPath=path.resolve('next-env.d.ts'); const nextEnvDigest=()=>fs.existsSync(nextEnvPath)?createHash('sha256').update(fs.readFileSync(nextEnvPath)).digest('hex'):null; const nextEnvBefore=nextEnvDigest();
const before=treeDigest({sourceOnly:true}); const groups=chunks(); const parts=[]; let ok=true; const covered=new Set(); const roots=new Set();
// R44P44: file-backed worker transport prevents spawnSync pipe deadlocks on large JSON receipts.
const workerDir=fs.mkdtempSync(path.join(os.tmpdir(),'velmere-pass13-ts-'));
try{
 for(let i=0;i<groups.length;i++){
  const t=Date.now(); const stdoutPath=path.join(workerDir,`partition-${String(i).padStart(2,'0')}.json`); const stderrPath=path.join(workerDir,`partition-${String(i).padStart(2,'0')}.stderr.log`);
  const stdoutFd=fs.openSync(stdoutPath,'w',0o600); const stderrFd=fs.openSync(stderrPath,'w',0o600);
  let r; try{r=spawnSync(process.execPath,[script,'--worker',String(i)],{stdio:['ignore',stdoutFd,stderrFd],timeout:240000,env:{...process.env,NODE_OPTIONS:''}});}finally{fs.closeSync(stdoutFd);fs.closeSync(stderrFd);}
  const stdout=fs.existsSync(stdoutPath)?fs.readFileSync(stdoutPath,'utf8'):''; const stderr=fs.existsSync(stderrPath)?fs.readFileSync(stderrPath,'utf8'):'';
  let data; try{data=JSON.parse(stdout||'{}')}catch{data={idx:i,roots:groups[i].map(rel),files:[],diagnostics:[`worker_output_invalid:${String(stdout).slice(-1000)}`,String(stderr).slice(-1000)],durationMs:Date.now()-t};}
  data.exitCode=r.status??1; data.signal=r.signal??null; data.timedOut=Boolean(r.error?.code==='ETIMEDOUT'); if(stderr)data.workerStderr=stderr; parts.push(data); for(const f of data.files||[])covered.add(f); for(const f of data.roots||[])roots.add(f); if(data.exitCode!==0||data.timedOut||(data.diagnostics||[]).length)ok=false;
  console.log(`PASS13 TS ${String(i+1).padStart(2,'0')}/${groups.length}: ${data.exitCode===0&&!data.timedOut&&!(data.diagnostics||[]).length?'PASS':'FAIL'} · roots ${(data.roots||[]).length} · files ${(data.files||[]).length} · ${((data.durationMs||0)/1000).toFixed(1)}s`);
  if(data.exitCode!==0||data.timedOut||(data.diagnostics||[]).length){
   console.error(`PASS13 TS ${String(i+1).padStart(2,'0')} exact diagnostics:`);
   for(const diagnostic of data.diagnostics||[])console.error(diagnostic);
   if(data.workerStderr)console.error(data.workerStderr);
  }
  if(!ok) break;
 }
}finally{fs.rmSync(workerDir,{recursive:true,force:true});}
// Tooling syntax gate: all first-party TS-family files excluded from the product tsconfig.
const tooling=[]; const exts=new Set(['.ts','.tsx','.mts','.cts']);
const walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name),r=rel(p); if(e.isDirectory()){if(['node_modules','.next','.velmere','artifacts','archive'].includes(e.name)||e.name.startsWith('.next-pass25-'))continue; walk(p);}else if(e.isFile()&&exts.has(path.extname(e.name))&&(r.startsWith('scripts/')||r.startsWith('tests/')))tooling.push(p);}}; walk(process.cwd());
const syntax=[]; for(const f of tooling){const s=fs.readFileSync(f,'utf8');const diagnostics=f.endsWith('.d.ts')?ts.createSourceFile(f,s,ts.ScriptTarget.ES2022,true,ts.ScriptKind.TS).parseDiagnostics??[]:ts.transpileModule(s,{fileName:f,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).diagnostics??[];for(const d of diagnostics)if(d.category===ts.DiagnosticCategory.Error)syntax.push(`${rel(f)} TS${d.code} ${ts.flattenDiagnosticMessageText(d.messageText,' ')}`);}
if(syntax.length)ok=false; const after=treeDigest({sourceOnly:true}); const nextEnvAfter=nextEnvDigest(); const nextEnvImmutable=nextEnvBefore===nextEnvAfter; if(after.sha256!==before.sha256||!nextEnvImmutable)ok=false;
const parsed=config(); const out={schemaVersion:'velmere.pass13.partitioned-typescript.v1',generatedAt:now(),ok,typescriptVersion:ts.version,partitionCount:groups.length,partitions:parts,configuredRootFiles:parsed.fileNames.length,rootFilesCovered:roots.size,transitiveFirstPartyFiles:covered.size,toolingSyntaxFiles:tooling.length,toolingSyntaxErrors:syntax,sourceBefore:before.sha256,sourceAfter:after.sha256,sourceImmutable:before.sha256===after.sha256,nextEnvBeforeSha256:nextEnvBefore,nextEnvAfterSha256:nextEnvAfter,nextEnvImmutable}; writeJson(path.join(PASS13_DIR,'PASS13_PARTITIONED_TYPESCRIPT.json'),out);
console.log(`PASS13 TypeScript: ${parts.filter(x=>x.exitCode===0).length}/${groups.length} partitions · roots ${roots.size}/${parsed.fileNames.length} · transitive ${covered.size} · tooling ${tooling.length} · diagnostics ${parts.flatMap(x=>x.diagnostics||[]).length+syntax.length}`); if(!ok)process.exit(1);
