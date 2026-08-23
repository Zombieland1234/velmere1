from __future__ import annotations
import argparse, hashlib, json
from pathlib import Path

REL='lib/security/audit-adjudicated-authority-evidence.ts'
BASE_COUNT=1598
BASE_PAYLOAD=21014969
BASE_PATHSET='9cb47f15e73ec678e32fe214b8e2947a4bfbaa624d8fb5101650296700d3dd25'
BASE_AGG='1c0f505f6d580ef49cc3b6fdb1e52518b341e4da96a3f2729b5b7d05cd9a4401'
BEFORE_BYTES=19198
BEFORE_SHA='55479510801b8af3f6c61b1d24a05cc4e4c0fca0ad85295a6e1eb8ca85e032df'

def sha(b:bytes)->str:return hashlib.sha256(b).hexdigest()
def replace_once(s:str,old:str,new:str,label:str)->str:
    n=s.count(old)
    if n!=1: raise SystemExit(f'P73R6 anchor mismatch:{label}:{n}')
    return s.replace(old,new,1)
def identity(rows):
    ordered=sorted(rows,key=lambda r:r['path']);payload=sum(int(r['byteLength']) for r in ordered)
    pathset=hashlib.sha256('\n'.join(r['path'] for r in ordered).encode()).hexdigest();h=hashlib.sha256()
    for r in ordered:h.update(f"{r['path']}\0{r['byteLength']}\0{r['sha256']}\n".encode())
    return len(ordered),payload,pathset,h.hexdigest(),ordered

ap=argparse.ArgumentParser();ap.add_argument('--source-root',required=True);ap.add_argument('--manifest',required=True);ap.add_argument('--output-manifest',required=True);ap.add_argument('--receipt',required=True);a=ap.parse_args()
root=Path(a.source_root);m=json.loads(Path(a.manifest).read_text(encoding='utf-8'));p=m['projection']
observed=(p.get('fileCount'),p.get('payloadBytes'),p.get('pathSetSha256'),p.get('sourceContentAggregateSha256'))
if observed!=(BASE_COUNT,BASE_PAYLOAD,BASE_PATHSET,BASE_AGG):raise SystemExit(f'P73R6 parent identity mismatch:{observed}')
rows={r['path']:dict(r) for r in m['files']};f=root/REL;b=f.read_bytes()
if len(b)!=BEFORE_BYTES or sha(b)!=BEFORE_SHA:raise SystemExit(f'P73R6 source preimage mismatch:{len(b)}:{sha(b)}')
row=rows.get(REL)
if not row or int(row['byteLength'])!=BEFORE_BYTES or row['sha256']!=BEFORE_SHA:raise SystemExit('P73R6 manifest preimage mismatch')
s=b.decode('utf-8')
old='''function addressesNearProject(text: string, projectName: string) {
  const lower = text.toLowerCase();
  const needle = projectName.toLowerCase();
  const addresses = new Set<string>();
  let index = lower.indexOf(needle);
  while (index >= 0 && addresses.size < 12) {
    const start = Math.max(0, index - 220);
    const end = Math.min(text.length, index + needle.length + 420);
    for (const value of text.slice(start, end).match(ADDRESS_PATTERN) ?? []) addresses.add(value.toLowerCase());
    index = lower.indexOf(needle, index + needle.length);
  }
  return Array.from(addresses);
}'''
new='''function addressesBoundToProjectLabel(text: string, projectName: string) {
  const escaped = projectName.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&");
  const pattern = new RegExp(`${escaped}\\\\s*(?:[:=\\-–—]\\\\s*)?(0x[a-fA-F0-9]{40})(?=\\\\s|$)`, "gi");
  const addresses = new Set<string>();
  let match: RegExpExecArray | null = pattern.exec(text);
  while (match && addresses.size < 8) {
    const address = match[1]?.toLowerCase() ?? null;
    if (address) addresses.add(address);
    match = pattern.exec(text);
  }
  return Array.from(addresses);
}'''
s=replace_once(s,old,new,'row-bound-parser')
s=replace_once(s,'    const nearAddresses = addressesNearProject(docs.text, reference.projectName);\n    const documentedAlternateAddress = nearAddresses.find((address) => address !== contractAddress) ?? null;', '    const projectBoundAddresses = addressesBoundToProjectLabel(docs.text, reference.projectName);\n    const documentedAlternateAddress = projectBoundAddresses.find((address) => address !== contractAddress) ?? null;','row-bound-call')
s=replace_once(s,'        `requested_address_absent:${!nearAddresses.includes(contractAddress)}`,','        `requested_address_absent:${!projectBoundAddresses.includes(contractAddress)}`,','receipt-bound-addresses')
out=s.encode('utf-8');f.write_bytes(out);after_sha=sha(out)
row['byteLength']=len(out);row['sha256']=after_sha;rows[REL]=row
ident=identity(list(rows.values()));m['files']=ident[4]
m['projection']['fileCount']=ident[0];m['projection']['payloadBytes']=ident[1];m['projection']['pathSetSha256']=ident[2];m['projection']['sourceContentAggregateSha256']=ident[3]
truth='P73R6 fixes an official-chain-document parsing bug that could bind a neighboring contract address to Multicall3. An alternate deployment address is now accepted only when it is directly label-bound to the project name in normalized authority text. The parser remains fail-closed; two independent authority roots, pinned maintainer source, current-runtime-bytecode blocker, and Pro/Advanced isolation remain unchanged.'
m['p73r6Delta']={'classification':'ROW_BOUND_OFFICIAL_CHAIN_AUTHORITY_PARSER_REPAIR','changedBuildRelevantFiles':[{'path':REL,'beforeSha256':BEFORE_SHA,'afterSha256':after_sha,'beforeBytes':BEFORE_BYTES,'afterBytes':len(out)}],'customerFinalOutputCredit':0,'auditFinalPdfCredit':0,'rightsCredit':0,'paidValueCredit':0,'saleCredit':0,'live':False,'truthBoundary':truth}
Path(a.output_manifest).write_text(json.dumps(m,indent=2)+'\n',encoding='utf-8')
r={'schemaVersion':'velmere.p73r6.row-bound-chain-docs-parser-repair.v1','status':'PASS','parentAggregateSha256':BASE_AGG,'path':REL,'beforeBytes':BEFORE_BYTES,'beforeSha256':BEFORE_SHA,'afterBytes':len(out),'afterSha256':after_sha,'fileCount':ident[0],'payloadBytes':ident[1],'pathSetSha256':ident[2],'aggregateSha256':ident[3],'customerFinalOutputCredit':0,'auditFinalPdfCredit':0,'rightsCredit':0,'paidValueCredit':0,'saleCredit':0,'live':False,'truthBoundary':truth}
Path(a.receipt).write_text(json.dumps(r,indent=2)+'\n',encoding='utf-8');print(json.dumps(r,indent=2))
