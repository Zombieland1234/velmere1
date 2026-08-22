from __future__ import annotations
import argparse,hashlib,json
from pathlib import Path

PARENT={'fileCount':1601,'payloadBytes':21035262,'pathSetSha256':'40b966b3bc2497a1d1d18b967ec867f182f76030af23d15329e42c6057268d59','sourceContentAggregateSha256':'c53dcbc3b106f3f686ea392c6188afd3b189fbf1834d6fcb8ce102821d58acca'}
EXPECTED={'fileCount':1601,'payloadBytes':21035367,'pathSetSha256':'40b966b3bc2497a1d1d18b967ec867f182f76030af23d15329e42c6057268d59','sourceContentAggregateSha256':'687f2280a3d4c688f653ca7c13e9028710a0d3bc15d237ad1256c9edcd539fa2'}
REL='lib/security/advanced-audit-release-envelope.ts'
BEFORE_BYTES=18521;BEFORE_SHA='01aafcb3c8beaf5e53f941f7e89490b3dda7eba86cbe36f5d0c0df2ef092877f';AFTER_BYTES=18626;AFTER_SHA='b4d8fa17062f559e8933969b9a1d0819213e6ea4d912aabed92481931b1da627'
OLD='  if (envelope.dualControl?.required === true) integrityBlockers.add("human_approval_must_not_gate_advanced_v17");\n'
NEW='  const rawDualControl = (envelope as unknown as { dualControl?: { required?: unknown } | null }).dualControl;\n  if (rawDualControl?.required === true) integrityBlockers.add("human_approval_must_not_gate_advanced_v17");\n'
def sha(b:bytes):return hashlib.sha256(b).hexdigest()
def identity(rows):
 rows=sorted(rows,key=lambda r:r['path']);pathset=hashlib.sha256('\n'.join(r['path'] for r in rows).encode()).hexdigest();h=hashlib.sha256()
 for r in rows:h.update(f"{r['path']}\0{r['byteLength']}\0{r['sha256']}\n".encode())
 return {'fileCount':len(rows),'payloadBytes':sum(int(r['byteLength']) for r in rows),'pathSetSha256':pathset,'sourceContentAggregateSha256':h.hexdigest()}
ap=argparse.ArgumentParser();ap.add_argument('--source-root',required=True);ap.add_argument('--parent-manifest',required=True);ap.add_argument('--manifest',required=True);ap.add_argument('--receipt',required=True);a=ap.parse_args();root=Path(a.source_root);m=json.loads(Path(a.parent_manifest).read_text(encoding='utf-8'))
for k,v in PARENT.items():
 if m['projection'].get(k)!=v:raise SystemExit(f'P76R2 parent projection mismatch:{k}:{m["projection"].get(k)}:{v}')
p=root/REL;b=p.read_bytes()
if len(b)!=BEFORE_BYTES or sha(b)!=BEFORE_SHA:raise SystemExit(f'P76R2 preimage mismatch:{len(b)}:{sha(b)}')
s=b.decode('utf-8')
if s.count(OLD)!=1:raise SystemExit(f'P76R2 TS2367 anchor mismatch:{s.count(OLD)}')
out=s.replace(OLD,NEW,1).encode('utf-8')
if len(out)!=AFTER_BYTES or sha(out)!=AFTER_SHA:raise SystemExit(f'P76R2 output mismatch:{len(out)}:{sha(out)}')
p.write_bytes(out);rows=[]
for r in m['files']:
 x=dict(r)
 if x['path']==REL:x['byteLength']=len(out);x['sha256']=sha(out)
 rows.append(x)
observed=identity(rows)
if observed!=EXPECTED:raise SystemExit(f'P76R2 projection mismatch:{observed} != {EXPECTED}')
new=dict(m);new['schemaVersion']='velmere.p76r2.build-relevant-projection.v1';new['classification']='CURRENT_PRODUCT_PROJECTION_P76R2_ADVANCED_RELEASE_TS2367_REPAIR';new['projection']=dict(m['projection']);new['projection'].update(EXPECTED);new['projection']['purpose']='Exact Windows proof for the minimal P76R2 TypeScript semantic repair preserving malicious human-gate rejection.';new['projection']['excludedFromCredit']=['live production Supabase deployment','vulnerability/exploitability ground truth','customer FINAL','Audit FINAL PDF','rights expansion','paid value','sale eligibility','LIVE','world-class proof'];new['files']=sorted(rows,key=lambda r:r['path']);new['p76r2Delta']={'parent':'P76R1_FAILED_TYPESCRIPT','changedBuildRelevantFiles':[{'path':REL,'beforeBytes':BEFORE_BYTES,'beforeSha256':BEFORE_SHA,'afterBytes':AFTER_BYTES,'afterSha256':AFTER_SHA}],'rootCause':'TS2367: dualControl.required is typed as false, making direct comparison to true statically impossible.','repair':'Inspect the runtime-unknown dualControl shape before rejecting required=true; preserve fail-closed human-approval gate rejection without an impossible typed comparison.','customerFinalOutputCredit':0,'auditFinalPdfCredit':0,'rightsCredit':0,'paidValueCredit':0,'saleCredit':0,'live':False};Path(a.manifest).write_text(json.dumps(new,indent=2)+'\n',encoding='utf-8')
r={'schemaVersion':'velmere.p76r2.typescript-repair.v1','status':'PASS','parentProjection':PARENT,'projection':observed,'changedPath':REL,'beforeSha256':BEFORE_SHA,'afterSha256':AFTER_SHA,'rootCause':new['p76r2Delta']['rootCause'],'repair':new['p76r2Delta']['repair'],'zeroFakeCredit':{'customerFinal':'0/20','auditFinalPdf':'0/3','rights':'2/203','paidValue':'0/10','saleEligible':'0/20','live':False}};Path(a.receipt).write_text(json.dumps(r,indent=2)+'\n',encoding='utf-8');print(json.dumps(r,indent=2))
