#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json
from pathlib import Path
from zipfile import ZipFile

ROOT=Path(__file__).resolve().parents[2]
PARENT=Path('/mnt/data/VELMERE_R44P46_METHOD_V12_P34_INTERNAL_AI_DUAL_LEDGER_CURRENT_SOURCE_ONLY_IN_PROGRESS.zip')
OUT=ROOT/'artifacts/closure/p35/p34-vs-p35-current-diff.json'
EXCLUDED_PREFIXES=('.git/','.next/','node_modules/','.velmere/','tmp/','temp/')
EXCLUDED_PARTS={'__pycache__'}
EXCLUDED_SUFFIXES={'.pyc','.pyo'}

def sha_bytes(b:bytes)->str:return hashlib.sha256(b).hexdigest()
def sha_file(p:Path)->str:
 h=hashlib.sha256()
 with p.open('rb') as f:
  for c in iter(lambda:f.read(1024*1024),b''):h.update(c)
 return h.hexdigest()
def included(rel:str)->bool:
 p=Path(rel)
 if any(part in EXCLUDED_PARTS for part in p.parts) or p.suffix in EXCLUDED_SUFFIXES:return False
 return not any(rel==x.rstrip('/') or rel.startswith(x) for x in EXCLUDED_PREFIXES)
with ZipFile(PARENT) as z:
 parent={i.filename.replace('\\','/'):sha_bytes(z.read(i)) for i in z.infolist() if not i.is_dir()}
current={}
for p in ROOT.rglob('*'):
 if not p.is_file() or p.is_symlink():continue
 rel=p.relative_to(ROOT).as_posix()
 if included(rel):current[rel]=sha_file(p)
only_parent=sorted(set(parent)-set(current))
only_current=sorted(set(current)-set(parent))
changed=sorted(k for k in set(parent)&set(current) if parent[k]!=current[k])
result={
 'schemaVersion':'velmere.p35.parent-diff.v1','parentArchive':str(PARENT),'parentArchiveSha256':sha_file(PARENT),
 'parentFiles':len(parent),'currentFiles':len(current),'onlyParent':only_parent,'onlyCurrent':only_current,
 'changed':[{'path':k,'parentSha256':parent[k],'currentSha256':current[k]} for k in changed],
 'counts':{'onlyParent':len(only_parent),'onlyCurrent':len(only_current),'changed':len(changed),'totalDifferent':len(only_parent)+len(only_current)+len(changed)},
 'truthBoundary':'This is a byte diff against the physically preserved P34 archive. Generated P35 closure artifacts are expected additions; missing paths require explicit review and receive no silent deletion credit.'
}
OUT.parent.mkdir(parents=True,exist_ok=True)
OUT.write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n')
print(json.dumps({'status':'PASS_P35_PARENT_DIFF_BUILT',**result['counts'],'output':str(OUT.relative_to(ROOT))}))
