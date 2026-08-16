from __future__ import annotations
import argparse, hashlib, json
from pathlib import Path

TARGET='lib/security/pro-audit-pdf/customer-safe-renderer.ts'
BEFORE_SHA='8a7f174dacc6543fa88a761e0644b1e8a902be1dcba288dabf0bbb042bb2de51'
AFTER_SHA='7bbc9aadaf0dcc05eb74abe94ab7ff7f1353cbc67ca0711e5a7096995bd15865'
AFTER_BYTES=27659
EXPECTED_PARENT_PAYLOAD=20973279
EXPECTED_PARENT_AGG='a06455eba15fc74a8f3b04a73d637872d2657d743768fb321a9bb0ae9df68892'
EXPECTED_OUTPUT_PAYLOAD=20973292
EXPECTED_OUTPUT_AGG='6d400af1c8a042b9f1b9876744dc4e00d8786bb480a989cb78b477674760ee54'
EXPECTED_PATHSET='b8d9b3c2753e3f7f0c0b3a6054cf8c254d2a91b9c9c5d8f37310add478ac3f73'

def sha(b:bytes)->str:return hashlib.sha256(b).hexdigest()
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
if parent['fileCount']!=1597 or parent['payloadBytes']!=EXPECTED_PARENT_PAYLOAD or parent['pathSetSha256']!=EXPECTED_PATHSET or parent['sourceContentAggregateSha256']!=EXPECTED_PARENT_AGG: raise SystemExit(f'P70R1 parent identity mismatch:{parent}')
p=root/TARGET; b=p.read_bytes()
if sha(b)!=BEFORE_SHA: raise SystemExit(f'P70R1 renderer preimage mismatch:{len(b)}:{sha(b)}')
s=b.decode('utf-8')
old='const PUBLIC_TARGET_ADDRESS_LINE = /^(target|contract(?: address)?|audited address):\\s*0x[a-fA-F0-9]{40}$/i;'
new='const PUBLIC_TARGET_ADDRESS_LINE = /^(?:\\d+\\.\\s*)?(target|contract(?: address)?|audited address):\\s*0x[a-fA-F0-9]{40}$/i;'
if s.count(old)!=1: raise SystemExit('P70R1 renderer insertion preimage missing')
out=s.replace(old,new).encode('utf-8'); p.write_bytes(out)
if len(out)!=AFTER_BYTES or sha(out)!=AFTER_SHA: raise SystemExit(f'P70R1 renderer output mismatch:{len(out)}:{sha(out)}')
current=projection(root,m)
if current['fileCount']!=1597 or current['payloadBytes']!=EXPECTED_OUTPUT_PAYLOAD or current['pathSetSha256']!=EXPECTED_PATHSET or current['sourceContentAggregateSha256']!=EXPECTED_OUTPUT_AGG: raise SystemExit(f'P70R1 output identity mismatch:{current}')
outm=dict(m);outm['files']=current.pop('files');outm['projection']=current;Path(args.output_manifest).write_text(json.dumps(outm,indent=2)+'\n')
receipt={'schemaVersion':'velmere.p70r1.numbered-public-target-renderer-repair.v1','status':'PASS_CONTROLLED_PRODUCT_SOURCE_REPAIR_NO_PROMOTION','changedFile':{'path':TARGET,'beforeSha256':BEFORE_SHA,'afterSha256':AFTER_SHA,'afterBytes':AFTER_BYTES},'parentProjection':{'fileCount':1597,'payloadBytes':EXPECTED_PARENT_PAYLOAD,'pathSetSha256':EXPECTED_PATHSET,'sourceContentAggregateSha256':EXPECTED_PARENT_AGG},'outputProjection':current,'rootCause':'Audit customer sections are numbered before PDF safety filtering; PUBLIC_TARGET_ADDRESS_LINE allowed only an unnumbered Target: 0x... line, so the safe renderer dropped the exact target address from physically rendered PDFs.','repair':'Allow an optional numeric list prefix only for the existing public target/address allow-list pattern. The general EVM-address filter remains fail-closed for every other line.','securityBoundary':'No general address allow-list expansion. Only exact target/contract/audited-address lines, optionally prefixed by a numeric list marker, may pass the existing EVM address safety filter.','truthBoundary':'Functional customer-artifact identity repair only. It does not grant vulnerability correctness, customer-final, rights, value, sale, LIVE or WORLD_CLASS credit.'}
Path(args.receipt).write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt,indent=2))
