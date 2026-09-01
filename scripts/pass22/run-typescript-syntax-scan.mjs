#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
async function loadTypeScript() {
  try { return await import('typescript'); } catch (ignoredError) { void ignoredError; }
  const candidates=[];
  try { candidates.push(path.join(execFileSync('npm',['root','-g'],{encoding:'utf8',timeout:5000}).trim(),'typescript','lib','typescript.js')); } catch (ignoredError) { void ignoredError; }
  candidates.push('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
  for (const candidate of candidates) if (fs.existsSync(candidate)) return import(pathToFileURL(candidate).href);
  throw new Error('TypeScript parser unavailable; exact dependencies are required for semantic proof.');
}
const mod=await loadTypeScript(); const ts=mod.default??mod;
const extensions=new Set(['.ts','.tsx','.mts','.cts']);
const excludedDirs=new Set(['node_modules','.next','.git','.velmere','artifacts','coverage','dist','out','build']);
const files=[];
function walk(dir){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
    if(entry.isDirectory()&&excludedDirs.has(entry.name))continue;
    const full=path.join(dir,entry.name);
    if(entry.isDirectory())walk(full);
    else if(entry.isFile()&&extensions.has(path.extname(entry.name)))files.push(full);
  }
}
walk(root); files.sort();
const errors=[]; const digest=createHash('sha256');
for(const file of files){
 const text=fs.readFileSync(file,'utf8'); const relative=path.relative(root,file).replaceAll(path.sep,'/');
 digest.update(relative).update('\0').update(text).update('\0');
 const kind=file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS;
 const source=ts.createSourceFile(relative,text,ts.ScriptTarget.Latest,true,kind);
 for(const diagnostic of source.parseDiagnostics??[]){const p=source.getLineAndCharacterOfPosition(diagnostic.start??0); errors.push({file:relative,line:p.line+1,column:p.character+1,code:diagnostic.code,message:ts.flattenDiagnosticMessageText(diagnostic.messageText,' ')});}
}
const result={schemaVersion:'velmere.pass22.typescript-syntax-scan.v1',generatedAt:'2026-07-20T16:00:00.000Z',typescriptVersion:ts.version,files:files.length,parseErrors:errors.length,errors,sourceSha256:digest.digest('hex'),truthBoundary:'Deterministic syntax-only scan of manifestable clean-source TypeScript files. Excludes generated .velmere outputs; not semantic typecheck, lint, dependency resolution or build proof.'};
fs.writeFileSync(path.join(root,'config/pass22/typescript-syntax-scan.json'),`${JSON.stringify(result,null,2)}\n`,'utf8');
console.log(JSON.stringify({typescriptVersion:result.typescriptVersion,files:result.files,parseErrors:result.parseErrors},null,2)); if(errors.length)process.exit(1);
