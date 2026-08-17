from __future__ import annotations
import argparse,hashlib,json
from pathlib import Path
REL='lib/security/audit-adjudicated-authority-evidence.ts'
BASE_COUNT=1598;BASE_PAYLOAD=21014960;BASE_PATHSET='9cb47f15e73ec678e32fe214b8e2947a4bfbaa624d8fb5101650296700d3dd25';BASE_AGG='a2a10789ed3359f9880354abf3a6272ce34445b596fbee21711109c1bdee3c82'
BEFORE_BYTES=19189;BEFORE_SHA='39172b59d97adbc1e94af0c01a4db2e98c607b68eab75962e2318d032bd687a4'
def sha(b):return hashlib.sha256(b).hexdigest()
def identity(rows):
 o=sorted(rows,key=lambda r:r['path']);payload=sum(int(r['byteLength']) for r in o);ps=hashlib.sha256('\n'.join(r['path'] for r in o).encode()).hexdigest();h=hashlib.sha256()
 for r in o:h.update(f"{r['path']}\0{r['byteLength']}\0{r['sha256']}\n".encode())
 return len(o),payload,ps,h.hexdigest(),o
ap=argparse.ArgumentParser();ap.add_argument('--source-root',required=True);ap.add_argument('--manifest',required=True);ap.add_argument('--output-manifest',required=True);ap.add_argument('--receipt',required=True);a=ap.parse_args()
root=Path(a.source_root);m=json.loads(Path(a.manifest).read_text());p=m['projection']
if (p.get('fileCount'),p.get('payloadBytes'),p.get('pathSetSha256'),p.get('sourceContentAggregateSha256'))!=(BASE_COUNT,BASE_PAYLOAD,BASE_PATHSET,BASE_AGG):raise SystemExit('P73R7 parent identity mismatch')
rows={r['path']:dict(r) for r in m['files']};f=root/REL;b=f.read_bytes()
if len(b)!=BEFORE_BYTES or sha(b)!=BEFORE_SHA:raise SystemExit(f'P73R7 preimage mismatch:{len(b)}:{sha(b)}')
s=b.decode('utf-8')
old='const ADDRESS_PATTERN = /0x[a-fA-F0-9]{40}/g;\n'
if s.count(old)!=1:raise SystemExit(f'P73R7 ADDRESS_PATTERN anchor mismatch:{s.count(old)}')
s=s.replace(old,'',1)
old_regex='(?:[:=\-–—]\\s*)?'
new_regex='(?:[:=–—-]\\s*)?'
if s.count(old_regex)!=1:raise SystemExit(f'P73R7 regex anchor mismatch:{s.count(old_regex)}')
s=s.replace(old_regex,new_regex,1)
out=s.encode();f.write_bytes(out);after=sha(out);row=rows[REL];row['byteLength']=len(out);row['sha256']=after;rows[REL]=row
ident=identity(list(rows.values()));m['files']=ident[4];m['projection']['fileCount']=ident[0];m['projection']['payloadBytes']=ident[1];m['projection']['pathSetSha256']=ident[2];m['projection']['sourceContentAggregateSha256']=ident[3]
truth='P73R7 removes only the stale unused ADDRESS_PATTERN constant and an unnecessary escaped hyphen exposed by zero-warning ESLint after P73R6. Row-bound authority semantics, pinned source binding, two-root quorum, runtime-bytecode blocker and release numerators are unchanged.'
m['p73r7Delta']={'classification':'ROW_BOUND_PARSER_LINT_CORRECTNESS_REPAIR','changedBuildRelevantFiles':[{'path':REL,'beforeSha256':BEFORE_SHA,'afterSha256':after,'beforeBytes':BEFORE_BYTES,'afterBytes':len(out)}],'customerFinalOutputCredit':0,'auditFinalPdfCredit':0,'rightsCredit':0,'paidValueCredit':0,'saleCredit':0,'live':False,'truthBoundary':truth}
Path(a.output_manifest).write_text(json.dumps(m,indent=2)+'\n');r={'schemaVersion':'velmere.p73r7.row-parser-lint-repair.v1','status':'PASS','parentAggregateSha256':BASE_AGG,'path':REL,'beforeBytes':BEFORE_BYTES,'beforeSha256':BEFORE_SHA,'afterBytes':len(out),'afterSha256':after,'fileCount':ident[0],'payloadBytes':ident[1],'pathSetSha256':ident[2],'aggregateSha256':ident[3],'customerFinalOutputCredit':0,'auditFinalPdfCredit':0,'rightsCredit':0,'paidValueCredit':0,'saleCredit':0,'live':False,'truthBoundary':truth};Path(a.receipt).write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(r,indent=2))
