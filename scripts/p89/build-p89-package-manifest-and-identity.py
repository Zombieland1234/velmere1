#!/usr/bin/env python3
from __future__ import annotations
import hashlib,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
MANIFEST_REL='PACKAGE_CONTENT_MANIFEST.tsv'
IDENTITY_REL='artifacts/closure/p89r1/P89R1_TREE_IDENTITY_EXCLUDING_SELF.json'
SCOPE_REL='artifacts/closure/p89r1/P89R1_PACKAGE_MANIFEST_SCOPE.json'
FIXED='2026-08-20T21:10:00.000Z'

def sha(p:Path):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for c in iter(lambda:f.read(4*1024*1024),b''):h.update(c)
 return h.hexdigest()
def row(p:Path):return {'path':p.relative_to(ROOT).as_posix(),'byteLength':p.stat().st_size,'sha256':sha(p)}
def rows(exclude:set[str]):
 out=[]
 for p in sorted((x for x in ROOT.rglob('*') if x.is_file()),key=lambda x:x.relative_to(ROOT).as_posix()):
  rel=p.relative_to(ROOT).as_posix()
  if rel in exclude:continue
  if p.is_symlink():raise RuntimeError(f'symlink:{rel}')
  if rel.endswith('.pyc') or '/__pycache__/' in f'/{rel}/':raise RuntimeError(f'python_cache:{rel}')
  if rel.startswith('node_modules/'):raise RuntimeError(f'node_modules:{rel}')
  out.append(row(p))
 return out
def projection(items):
 items=sorted(items,key=lambda x:x['path']);ph=hashlib.sha256('\n'.join(x['path'] for x in items).encode()).hexdigest();agg=hashlib.sha256()
 for x in items:agg.update(f"{x['path']}\0{x['byteLength']}\0{x['sha256']}\n".encode())
 return {'fileCount':len(items),'payloadBytes':sum(x['byteLength'] for x in items),'pathSetSha256':ph,'sourceContentAggregateSha256':agg.hexdigest()}

identity=ROOT/IDENTITY_REL
if identity.exists():identity.unlink()
scope={'schemaVersion':'velmere.p89r1.package-manifest-scope.v1','generatedAt':FIXED,'status':'PASS','manifest':MANIFEST_REL,'manifestExcludesExactly':[MANIFEST_REL,IDENTITY_REL],'reason':'The TSV cannot include its own digest and intentionally excludes the later self-excluding tree identity. The tree identity includes the finalized TSV and excludes only itself.','ledgerInsideZip':False}
p=ROOT/SCOPE_REL;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(scope,indent=2)+'\n')
manifest_rows=rows({MANIFEST_REL,IDENTITY_REL})
manifest=ROOT/MANIFEST_REL
with manifest.open('w',encoding='utf-8',newline='\n') as f:
 f.write('relative_path\tbyte_length\tsha256\n')
 for x in manifest_rows:f.write(f"{x['path']}\t{x['byteLength']}\t{x['sha256']}\n")
identity_rows=rows({IDENTITY_REL});ident=projection(identity_rows)
payload={'schemaVersion':'velmere.p89r1.tree-identity-excluding-self.v1','generatedAt':FIXED,'status':'PASS','excludedOnly':IDENTITY_REL,**ident,'fullPackageFileCountIncludingThisIdentityFile':ident['fileCount']+1,'packageContentManifest':{'path':MANIFEST_REL,'bytes':manifest.stat().st_size,'sha256':sha(manifest),'listedFiles':len(manifest_rows),'excludesExactly':[MANIFEST_REL,IDENTITY_REL]},'truthBoundary':'Canonical identity of every current SOURCE_ONLY file except this self-referential identity receipt. The finalized manifest is included in this identity and explicitly excludes only itself and this identity file.'}
identity.write_text(json.dumps(payload,indent=2)+'\n')
print(json.dumps({'status':'PASS','manifestRows':len(manifest_rows),'manifestBytes':manifest.stat().st_size,'manifestSha256':sha(manifest),'identity':payload},indent=2))
