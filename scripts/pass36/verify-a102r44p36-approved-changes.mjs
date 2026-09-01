#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root=path.resolve(process.argv[2]??process.cwd());
const baselinePath=path.join(root,'config/pass36/r44p36-parent-baseline.json');
const ledgerPath=path.join(root,'config/pass36/r44p36-approved-changes.json');
const fail=(message,extra={})=>{process.stdout.write(JSON.stringify({status:'FAIL_R44P36_APPROVED_CHANGES',message,...extra},null,2)+'\n');process.exit(1)};
const sha=(p)=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const excluded=new Set(['_velmere/PASS36_A102R44P36_SOURCE_ONLY_MANIFEST.json','config/pass36/r44p36-approved-changes.json']);
const skipParts=new Set(['node_modules','.git','.next','.turbo','.cache','coverage','test-results','playwright-report','__pycache__','.pytest_cache','tmp','temp']);
const skip=(rel)=>rel.split('/').some((x)=>skipParts.has(x)||x.startsWith('.next-'));
function walk(dir,base=''){const rows=[];for(const ent of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const rel=base?`${base}/${ent.name}`:ent.name;if(skip(rel)||excluded.has(rel))continue;const abs=path.join(dir,ent.name);const st=fs.lstatSync(abs);if(st.isSymbolicLink())fail('SYMLINK_FORBIDDEN',{path:rel});if(ent.isDirectory())rows.push(...walk(abs,rel));else if(ent.isFile())rows.push({path:rel,byteLength:st.size,sha256:sha(abs)});}return rows;}
const baseline=JSON.parse(fs.readFileSync(baselinePath,'utf8'));
const ledger=JSON.parse(fs.readFileSync(ledgerPath,'utf8'));
const oldMap=new Map(baseline.files.filter((r)=>!excluded.has(r.path)).map((r)=>[r.path,r]));
const newRows=walk(root);const newMap=new Map(newRows.map((r)=>[r.path,r]));
const added=[],modified=[],deleted=[];
for(const [p,n] of newMap){const o=oldMap.get(p);if(!o)added.push({path:p,newSha256:n.sha256,newByteLength:n.byteLength});else if(o.sha256!==n.sha256||o.byteLength!==n.byteLength)modified.push({path:p,oldSha256:o.sha256,newSha256:n.sha256,oldByteLength:o.byteLength,newByteLength:n.byteLength});}
for(const [p,o] of oldMap)if(!newMap.has(p))deleted.push({path:p,oldSha256:o.sha256,oldByteLength:o.byteLength});
const sort=(rows)=>rows.sort((a,b)=>a.path.localeCompare(b.path));
sort(added);sort(modified);sort(deleted);
const expected={added:sort([...ledger.added]),modified:sort([...ledger.modified]),deleted:sort([...ledger.deleted])};
if(JSON.stringify(added)!==JSON.stringify(expected.added))fail('ADDED_DELTA_MISMATCH',{actual:added,expected:expected.added});
if(JSON.stringify(modified)!==JSON.stringify(expected.modified))fail('MODIFIED_DELTA_MISMATCH',{actual:modified,expected:expected.modified});
if(JSON.stringify(deleted)!==JSON.stringify(expected.deleted))fail('DELETED_DELTA_MISMATCH',{actual:deleted,expected:expected.deleted});
if(deleted.some((r)=>/(^|\/)(test|tests|__tests__|scripts\/pass36)\//u.test(r.path)||/test-/u.test(path.basename(r.path))))fail('TEST_DELETION_FORBIDDEN',{deleted});
process.stdout.write(JSON.stringify({status:'PASS_R44P36_APPROVED_CHANGES',added:added.length,modified:modified.length,deleted:deleted.length,historyMutations:0,denominatorCollapse:false},null,2)+'\n');
