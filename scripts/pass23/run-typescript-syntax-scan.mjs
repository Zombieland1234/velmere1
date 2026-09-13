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

const mod=await loadTypeScript();
const ts=mod.default??mod;
const extensions=new Set(['.ts','.tsx','.mts','.cts']);
const excludedTopLevel=new Set(['node_modules','.next','.git','.velmere','artifacts','coverage','dist','out','build']);

// Scan the immutable Git subject, not the mutable working directory. The old
// recursive filesystem walk could ingest npm/generated files created by earlier
// gate steps and then misclassify those untracked files as release source.
const tracked = execFileSync('git',['ls-files','-z'],{cwd:root,encoding:'utf8',maxBuffer:64*1024*1024})
  .split('\0')
  .filter(Boolean)
  .map((relative)=>relative.replaceAll('\\','/'))
  .filter((relative)=>extensions.has(path.extname(relative)))
  .filter((relative)=>!excludedTopLevel.has(relative.split('/')[0]))
  .filter((relative)=>fs.existsSync(path.join(root,relative)))
  .sort();

const errors=[];
const digest=createHash('sha256');
for(const relative of tracked){
  const file=path.join(root,relative);
  const text=fs.readFileSync(file,'utf8');
  digest.update(relative).update('\0').update(text).update('\0');
  const kind=relative.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS;
  const source=ts.createSourceFile(relative,text,ts.ScriptTarget.Latest,true,kind);
  for(const diagnostic of source.parseDiagnostics??[]){
    const p=source.getLineAndCharacterOfPosition(diagnostic.start??0);
    errors.push({
      file:relative,
      line:p.line+1,
      column:p.character+1,
      code:diagnostic.code,
      message:ts.flattenDiagnosticMessageText(diagnostic.messageText,' ')
    });
  }
}

const result={
  schemaVersion:'velmere.pass23.typescript-syntax-scan.v2',
  generatedAt:new Date().toISOString(),
  scope:'GIT_TRACKED_TYPESCRIPT_RELEASE_SOURCE',
  typescriptVersion:ts.version,
  files:tracked.length,
  parseErrors:errors.length,
  errors,
  sourceSha256:digest.digest('hex'),
  truthBoundary:'Deterministic syntax-only scan of Git-tracked TypeScript-family release source. It intentionally ignores untracked/generated working-tree files created by npm/build/gate steps. This is not semantic typecheck, lint, dependency resolution or build proof.'
};

const diagnosticsDir=path.join(root,'.velmere','pass23-diagnostics');
fs.mkdirSync(diagnosticsDir,{recursive:true});
fs.writeFileSync(path.join(diagnosticsDir,'typescript-syntax-scan.json'),`${JSON.stringify(result,null,2)}\n`,'utf8');
console.log(JSON.stringify({
  schemaVersion:result.schemaVersion,
  scope:result.scope,
  typescriptVersion:result.typescriptVersion,
  files:result.files,
  parseErrors:result.parseErrors,
  errors:result.errors
},null,2));
if(errors.length)process.exit(1);
