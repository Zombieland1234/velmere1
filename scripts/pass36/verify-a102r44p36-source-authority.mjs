#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = path.resolve(process.argv[2] ?? process.cwd());
const manifestPath = path.join(root, '_velmere', 'PASS36_A102R44P36_SOURCE_ONLY_MANIFEST.json');
const fail = (message, extra={}) => {
  process.stdout.write(JSON.stringify({status:'FAIL_R44P36_SOURCE_AUTHORITY',message,...extra},null,2)+'\n');
  process.exit(1);
};
const sha = (file) => {
  const h=crypto.createHash('sha256');
  h.update(fs.readFileSync(file));
  return h.digest('hex');
};
const excludedParts = new Set(['node_modules','.git','.next','.turbo','.cache','coverage','test-results','playwright-report','__pycache__','.pytest_cache','tmp','temp']);
const excluded = (rel) => rel.split('/').some((part)=>excludedParts.has(part) || part.startsWith('.next-'));
function walk(dir, base='') {
  const rows=[];
  for (const ent of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))) {
    const rel=base ? `${base}/${ent.name}` : ent.name;
    if (excluded(rel)) continue;
    const abs=path.join(dir,ent.name);
    const st=fs.lstatSync(abs);
    if (st.isSymbolicLink()) fail('SYMLINK_FORBIDDEN',{path:rel});
    if (ent.isDirectory()) rows.push(...walk(abs,rel));
    else if (ent.isFile() && rel !== '_velmere/PASS36_A102R44P36_SOURCE_ONLY_MANIFEST.json') {
      rows.push({path:rel,byteLength:st.size,sha256:sha(abs)});
    }
  }
  return rows;
}
if (!fs.existsSync(manifestPath)) fail('MANIFEST_MISSING');
const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
const actual=walk(root).sort((a,b)=>a.path.localeCompare(b.path));
const expected=[...manifest.files].sort((a,b)=>a.path.localeCompare(b.path));
if (actual.length!==expected.length) fail('FILE_COUNT_MISMATCH',{actual:actual.length,expected:expected.length});
for (let i=0;i<actual.length;i++) {
  const a=actual[i],e=expected[i];
  if (a.path!==e.path || a.byteLength!==e.byteLength || a.sha256!==e.sha256) {
    fail('FILE_BINDING_MISMATCH',{index:i,actual:a,expected:e});
  }
}
const aggregate=crypto.createHash('sha256');
for (const row of actual) aggregate.update(`${row.path}\0${row.byteLength}\0${row.sha256}\n`);
const aggregateSha256=aggregate.digest('hex');
if (aggregateSha256!==manifest.sourceAggregateSha256) fail('AGGREGATE_MISMATCH',{actual:aggregateSha256,expected:manifest.sourceAggregateSha256});
const pathSet=crypto.createHash('sha256').update(actual.map((r)=>r.path).join('\n')+'\n').digest('hex');
if (pathSet!==manifest.pathSetSha256) fail('PATH_SET_MISMATCH',{actual:pathSet,expected:manifest.pathSetSha256});
if (manifest.fileCount!==actual.length) fail('MANIFEST_FILE_COUNT_FIELD_MISMATCH');
const bytes=actual.reduce((n,r)=>n+r.byteLength,0);
if (manifest.payloadBytes!==bytes) fail('PAYLOAD_BYTES_MISMATCH',{actual:bytes,expected:manifest.payloadBytes});
process.stdout.write(JSON.stringify({
  status:'PASS_R44P36_SOURCE_AUTHORITY',
  revisionId:manifest.revisionId,
  fileCount:actual.length,
  payloadBytes:bytes,
  sourceAggregateSha256:aggregateSha256,
  pathSetSha256:pathSet,
  sourceImmutable:true
},null,2)+'\n');
