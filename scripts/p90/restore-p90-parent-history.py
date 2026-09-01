#!/usr/bin/env python3
from __future__ import annotations
import hashlib,json,shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
PARENT=Path('/mnt/data/velmere_p90_clean')
OUT=ROOT/'receipts/p90/P90_PARENT_HISTORY_RESTORE.json'

def sha(p:Path):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for c in iter(lambda:f.read(4*1024*1024),b''):h.update(c)
 return h.hexdigest()
restored=[];mismatches=[];verified=0
for base in ('receipts','artifacts'):
 for src in sorted((PARENT/base).rglob('*')):
  if not src.is_file(): continue
  rel=src.relative_to(PARENT)
  dst=ROOT/rel
  verified+=1
  same=dst.is_file() and dst.stat().st_size==src.stat().st_size and sha(dst)==sha(src)
  if not same:
   dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(src,dst)
   restored.append({'path':rel.as_posix(),'parentSha256':sha(src),'currentSha256':sha(dst),'byteIdentical':dst.stat().st_size==src.stat().st_size and sha(dst)==sha(src)})
for base in ('receipts','artifacts'):
 for src in sorted((PARENT/base).rglob('*')):
  if not src.is_file():continue
  rel=src.relative_to(PARENT);dst=ROOT/rel
  if not dst.is_file() or dst.stat().st_size!=src.stat().st_size or sha(dst)!=sha(src):mismatches.append(rel.as_posix())
payload={'schemaVersion':'velmere.p90.parent-history-restore.v2','generatedAt':'2026-08-20T21:50:00.000Z','status':'PASS' if not mismatches else 'FAIL','restoredCount':len(restored),'restoredRows':restored,'verifiedUnchangedParentFiles':verified,'mismatchCount':len(mismatches),'mismatches':mismatches,'truthBoundary':'Historical parent receipt/artifact outputs modified by legacy current-byte harnesses are restored byte-for-byte from the verified P89R1 parent. P90 evidence is written only under P90 paths.'}
OUT.write_text(json.dumps(payload,indent=2)+'\n')
print(json.dumps({'status':payload['status'],'restored':len(restored),'verified':verified,'mismatches':len(mismatches)},indent=2))
raise SystemExit(0 if not mismatches else 1)
