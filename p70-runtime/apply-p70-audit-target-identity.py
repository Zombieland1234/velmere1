from __future__ import annotations
import argparse, hashlib, json
from pathlib import Path

TARGET='lib/security/audit-account-customer-snapshot.ts'
BEFORE_SHA='3929e379b41a81c9fc38c68a517d861745a0220dc308069733e96d074a68f456'
AFTER_SHA='9a16f5ac334beb280ed50ec608049ab54c5722fe06a4bf0dd52dea82d0274912'
AFTER_BYTES=17276
EXPECTED_PARENT_PAYLOAD=20973109
EXPECTED_PARENT_AGG='e0b5f045c7c20f87c0704b6c8fff8be70655ec98e69c5cf2f4f588207b0bab6f'
EXPECTED_OUTPUT_PAYLOAD=20973279
EXPECTED_OUTPUT_AGG='a06455eba15fc74a8f3b04a73d637872d2657d743768fb321a9bb0ae9df68892'
EXPECTED_PATHSET='b8d9b3c2753e3f7f0c0b3a6054cf8c254d2a91b9c9c5d8f37310add478ac3f73'

def sha(b:bytes)->str:return hashlib.sha256(b).hexdigest()
def file_sha(p:Path)->str:return sha(p.read_bytes())
def projection(root:Path, manifest:dict):
 rows=[]; total=0
 for exp in manifest['files']:
  p=root/exp['path']; b=p.read_bytes(); h=sha(b); rows.append({'path':exp['path'],'byteLength':len(b),'sha256':h}); total+=len(b)
 pathset=sha('\n'.join(r['path'] for r in rows).encode())
 a=hashlib.sha256()
 for r in rows:a.update(f"{r['path']}\0{r['byteLength']}\0{r['sha256']}\n".encode())
 return {'fileCount':len(rows),'payloadBytes':total,'pathSetSha256':pathset,'sourceContentAggregateSha256':a.hexdigest(),'files':rows}

ap=argparse.ArgumentParser();ap.add_argument('--source-root',required=True);ap.add_argument('--manifest',required=True);ap.add_argument('--output-manifest',required=True);ap.add_argument('--receipt',required=True);args=ap.parse_args()
root=Path(args.source_root); m=json.loads(Path(args.manifest).read_text())
parent=projection(root,m)
if parent['fileCount']!=1597 or parent['payloadBytes']!=EXPECTED_PARENT_PAYLOAD or parent['pathSetSha256']!=EXPECTED_PATHSET or parent['sourceContentAggregateSha256']!=EXPECTED_PARENT_AGG: raise SystemExit(f'P70 parent identity mismatch:{parent}')
p=root/TARGET; b=p.read_bytes()
if sha(b)!=BEFORE_SHA: raise SystemExit(f'P70 target preimage mismatch:{len(b)}:{sha(b)}')
s=b.decode('utf-8')
old='''  const sections = unique([\n    ...decisionSections.map((section) => `${section.title}: ${section.summary}`),\n    ...findingLines,\n    ...sourceTruthLines,\n  ], 28);'''
new='''  const customerTargetLine = /^0x[a-fA-F0-9]{40}$/.test(targetLabel)\n    ? `Target: ${targetLabel.toLowerCase()}`\n    : `Target: ${targetLabel}`;\n  const sections = unique([\n    customerTargetLine,\n    ...decisionSections.map((section) => `${section.title}: ${section.summary}`),\n    ...findingLines,\n    ...sourceTruthLines,\n  ], 28);'''
if s.count(old)!=1: raise SystemExit('P70 target insertion preimage missing')
out=s.replace(old,new).encode('utf-8'); p.write_bytes(out)
if len(out)!=AFTER_BYTES or sha(out)!=AFTER_SHA: raise SystemExit(f'P70 target output mismatch:{len(out)}:{sha(out)}')
current=projection(root,m)
if current['fileCount']!=1597 or current['payloadBytes']!=EXPECTED_OUTPUT_PAYLOAD or current['pathSetSha256']!=EXPECTED_PATHSET or current['sourceContentAggregateSha256']!=EXPECTED_OUTPUT_AGG: raise SystemExit(f'P70 output identity mismatch:{current}')
outm=dict(m);outm['files']=current.pop('files');outm['projection']=current;Path(args.output_manifest).write_text(json.dumps(outm,indent=2)+'\n')
receipt={'schemaVersion':'velmere.p70.audit-target-identity-source-repair.v1','status':'PASS_CONTROLLED_PRODUCT_SOURCE_REPAIR_NO_PROMOTION','changedFile':{'path':TARGET,'beforeSha256':BEFORE_SHA,'afterSha256':AFTER_SHA,'afterBytes':AFTER_BYTES},'parentProjection':{'fileCount':1597,'payloadBytes':EXPECTED_PARENT_PAYLOAD,'pathSetSha256':EXPECTED_PATHSET,'sourceContentAggregateSha256':EXPECTED_PARENT_AGG},'outputProjection':current,'repair':'Bind the exact customer target label into Audit customer-safe sections. An EVM address passed as targetLabel renders as the existing safe Target: 0x... form instead of disappearing from the customer PDF.','truthBoundary':'Functional Audit artifact identity repair only. It does not grant vulnerability correctness, customer-final, rights, paid-value, sale, LIVE or WORLD_CLASS credit.'}
Path(args.receipt).write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps(receipt,indent=2))
