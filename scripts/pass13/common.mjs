import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const ROOT = process.cwd();
export const PASS13_DIR = path.join(ROOT, 'artifacts', 'pass13');
fs.mkdirSync(PASS13_DIR, {recursive: true});

export function sha256(data) { return crypto.createHash('sha256').update(data).digest('hex'); }
export function readJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
export function writeJson(p, value) { fs.mkdirSync(path.dirname(p), {recursive:true}); fs.writeFileSync(p, JSON.stringify(value, null, 2) + '\n'); }
export function rel(p) { return path.relative(ROOT, p).split(path.sep).join('/'); }

const SOURCE_EXCLUDED_DIRS = new Set(['node_modules', '.next', '.velmere', 'out', 'coverage']);
const SOURCE_EXCLUDED_ROOT_DIRS = new Set(['build']);
const SOURCE_EXCLUDED_ROOT_PREFIXES = ['.next-pass25-'];
const SOURCE_EXCLUDED_PREFIXES = ['.velmere/npm-cache/', '.velmere/exact-runtime/', 'artifacts/pass13/'];
export function walkFiles(start=ROOT, {sourceOnly=false}={}) {
  const out=[];
  const visit=(dir)=>{
    for(const e of fs.readdirSync(dir,{withFileTypes:true})){
      const abs=path.join(dir,e.name); const r=rel(abs);
      if(e.isSymbolicLink()) continue;
      if(e.isDirectory()){
        if(SOURCE_EXCLUDED_DIRS.has(e.name) || (dir === ROOT && (SOURCE_EXCLUDED_ROOT_DIRS.has(e.name) || SOURCE_EXCLUDED_ROOT_PREFIXES.some((prefix) => e.name.startsWith(prefix))))) continue;
        if(sourceOnly && (r==='artifacts' || r.startsWith('artifacts/') || r==='archive' || r.startsWith('archive/'))) continue;
        visit(abs);
      } else if(e.isFile()){
        if(sourceOnly && SOURCE_EXCLUDED_PREFIXES.some(x=>r.startsWith(x))) continue;
        out.push(abs);
      }
    }
  };
  visit(start); return out.sort((a,b)=>rel(a).localeCompare(rel(b)));
}

export function treeDigest({sourceOnly=true}={}){
  const rows=[]; let bytes=0;
  for(const f of walkFiles(ROOT,{sourceOnly})){
    const b=fs.readFileSync(f); bytes+=b.length; rows.push(`${rel(f)}\0${b.length}\0${sha256(b)}`);
  }
  return {sha256:sha256(Buffer.from(rows.join('\n'))),fileCount:rows.length,totalBytes:bytes,rows};
}

export function runtimeInfo(){ return {node:process.version,npm:process.env.npm_config_user_agent||null,platform:process.platform,arch:process.arch}; }
export function now(){ return new Date().toISOString(); }
