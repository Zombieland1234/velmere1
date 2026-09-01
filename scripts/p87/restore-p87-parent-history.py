#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json, shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PARENT = Path('/mnt/data/velmere_p87_work/base')
OUT = ROOT / 'artifacts/p87/P87_PARENT_HISTORY_RESTORE_LAST.json'

def keep_current(rel: Path) -> bool:
    p=rel.parts
    return ((len(p)>=2 and p[0]=='receipts' and p[1]=='p87')
        or (len(p)>=2 and p[0]=='artifacts' and p[1]=='p87')
        or (len(p)>=3 and p[0]=='artifacts' and p[1]=='closure' and p[2].startswith('p87')))

def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

restored=[]; removed=[]; verified=0; mismatches=[]
for base_name in ('receipts','artifacts'):
    parent_root=PARENT/base_name; current_root=ROOT/base_name
    parent_files={p.relative_to(PARENT).as_posix():p for p in parent_root.rglob('*') if p.is_file()}
    if current_root.is_dir():
        for current in sorted((p for p in current_root.rglob('*') if p.is_file()), reverse=True):
            rel=current.relative_to(ROOT)
            if keep_current(rel): continue
            if rel.as_posix() not in parent_files:
                current.unlink(); removed.append(rel.as_posix())
    for rel_s,parent_file in parent_files.items():
        rel=Path(rel_s); current=ROOT/rel; current.parent.mkdir(parents=True,exist_ok=True)
        if not current.is_file() or current.read_bytes()!=parent_file.read_bytes():
            shutil.copyfile(parent_file,current); restored.append(rel_s)
    for rel_s,parent_file in parent_files.items():
        current=ROOT/rel_s; verified+=1
        if not current.is_file() or current.stat().st_size!=parent_file.stat().st_size or digest(current)!=digest(parent_file):
            mismatches.append(rel_s)
payload={'schemaVersion':'velmere.p87.parent-history-restore.last.v1','status':'PASS' if not mismatches else 'FAIL','parentCheckpoint':'P86R1','restoredCount':len(restored),'removedUnexpectedCount':len(removed),'verifiedHistoricalFiles':verified,'mismatchCount':len(mismatches),'restoredPaths':restored,'removedUnexpectedPaths':removed,'mismatches':mismatches}
OUT.parent.mkdir(parents=True,exist_ok=True); OUT.write_text(json.dumps(payload,indent=2)+'\n')
print(json.dumps({k:payload[k] for k in ('status','restoredCount','removedUnexpectedCount','verifiedHistoricalFiles','mismatchCount')},indent=2))
raise SystemExit(0 if payload['status']=='PASS' else 1)
