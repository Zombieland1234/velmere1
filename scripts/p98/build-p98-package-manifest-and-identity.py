#!/usr/bin/env python3
from __future__ import annotations
import hashlib,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
MANIFEST_REL='PACKAGE_CONTENT_MANIFEST.tsv'
IDENTITY_REL='artifacts/closure/p98r1/P98R1_TREE_IDENTITY_EXCLUDING_SELF.json'
SCOPE_REL='artifacts/closure/p98r1/P98R1_PACKAGE_MANIFEST_SCOPE.json'
FIXED='2026-08-21T13:00:00.000Z'
def sha(p:Path)->str:
 h=hashlib.sha256()
 with p.open('rb') as f:
  for c in iter(lambda:f.read(4*1024*1024),b''):h.update(c)
 return h.hexdigest()
def rows(exclude:set[str]):
 out=[]
 for p in sorted((x for x in ROOT.rglob('*') if x.is_file()),key=lambda x:x.relative_to(ROOT).as_posix()):
  rel=p.relative_to(ROOT).as_posix()
  if rel in exclude:continue
  if p.is_symlink():raise RuntimeError(f'symlink:{rel}')
  if rel.endswith(('.pyc','.pyo')) or '/__pycache__/' in f'/{rel}/':raise RuntimeError(f'python_cache:{rel}')
  if rel.startswith('node_modules/'):raise RuntimeError(f'node_modules:{rel}')
  out.append({'path':rel,'byteLength':p.stat().st_size,'sha256':sha(p)})
 return out
def projection(items):
 items=sorted(items,key=lambda r:r['path']);ph=hashlib.sha256('\n'.join(r['path'] for r in items).encode()).hexdigest();agg=hashlib.sha256()
 for r in items:agg.update(f"{r['path']}\0{r['byteLength']}\0{r['sha256']}\n".encode())
 return {'fileCount':len(items),'payloadBytes':sum(r['byteLength'] for r in items),'pathSetSha256':ph,'sourceContentAggregateSha256':agg.hexdigest()}
identity=ROOT/IDENTITY_REL;identity.unlink(missing_ok=True)
scope={'schemaVersion':'velmere.p98r1.package-manifest-scope.v1','generatedAt':FIXED,'status':'PASS','manifest':MANIFEST_REL,'manifestExcludesExactly':[MANIFEST_REL,IDENTITY_REL],'reason':'The TSV cannot include its own digest and intentionally excludes the later self-excluding tree identity. The tree identity includes the finalized TSV and excludes only itself.','ledgerInsideZip':False,'packageVerificationInsideZip':False}
sp=ROOT/SCOPE_REL;sp.parent.mkdir(parents=True,exist_ok=True);sp.write_text(json.dumps(scope,indent=2)+'\n')
manifest_rows=rows({MANIFEST_REL,IDENTITY_REL});manifest=ROOT/MANIFEST_REL
with manifest.open('w',encoding='utf-8',newline='\n') as f:
 f.write('relative_path\tbyte_length\tsha256\n')
 for r in manifest_rows:f.write(f"{r['path']}\t{r['byteLength']}\t{r['sha256']}\n")
identity_rows=rows({IDENTITY_REL});proj=projection(identity_rows)
payload={'schemaVersion':'velmere.p98r1.tree-identity-excluding-self.v1','generatedAt':FIXED,'status':'PASS','excludedOnly':IDENTITY_REL,**proj,'fullPackageFileCountIncludingThisIdentityFile':proj['fileCount']+1,'packageContentManifest':{'path':MANIFEST_REL,'bytes':manifest.stat().st_size,'sha256':sha(manifest),'listedFiles':len(manifest_rows),'excludesExactly':[MANIFEST_REL,IDENTITY_REL]},'truthBoundary':'Canonical identity of every P98 SOURCE_ONLY file except this self-referential receipt. The finalized package manifest is included.'}
identity.write_text(json.dumps(payload,indent=2)+'\n')
print(json.dumps({'status':'PASS','manifestRows':len(manifest_rows),'manifestBytes':manifest.stat().st_size,'manifestSha256':sha(manifest),'identity':payload},indent=2))
