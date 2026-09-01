#!/usr/bin/env python3
from __future__ import annotations
import hashlib,json,os,pathlib
ROOT=pathlib.Path(__file__).resolve().parents[2]
SELF={
 'CURRENT_CANDIDATE_CONTENT_MANIFEST.tsv','CURRENT_CANDIDATE_RECEIPT.json',
 'CURRENT_CANDIDATE_TREE_IDENTITY_EXCLUDING_SELF.json','VELMERE_R7_CURRENT_SOURCE_MANIFEST.tsv',
 'artifacts/r7/VELMERE_R7_SOURCE_IDENTITY.json',
 'artifacts/r7/VELMERE_R7_FULL_SOURCE_IDENTITY.json',
}
PREFIXES=('.git/','.velmere/','node_modules/','.next/','.pytest_cache/','current-execution-out/','artifacts/r7/local/')
def excluded(rel:str)->bool:
 return rel in SELF or rel.startswith(PREFIXES) or rel.startswith('artifacts/r7/VELMERE_R7_SOURCE_IDENTITY_BUILD') or '/__pycache__/' in f'/{rel}/' or rel.endswith('.pyc')
def h(b:bytes)->str:return hashlib.sha256(b).hexdigest()
rows=[]
for base,dirs,files in os.walk(ROOT):
 rd=pathlib.Path(base).relative_to(ROOT)
 dirs[:]=sorted(d for d in dirs if not excluded((rd/d).as_posix()+'/'))
 for n in sorted(files):
  rel=(rd/n).as_posix()
  if excluded(rel):continue
  b=(ROOT/rel).read_bytes();rows.append((rel,len(b),h(b)))
rows.sort(key=lambda x:x[0].encode())
manifest=('path\tbytes\tsha256\n'+''.join(f'{p}\t{s}\t{x}\n' for p,s,x in rows)).encode()
body=b''.join(f'{p}\t{s}\t{x}\n'.encode() for p,s,x in rows)
paths=b''.join(f'{p}\n'.encode() for p,_,_ in rows)
identity={'schemaVersion':'velmere.r7.current-candidate-tree-identity-excluding-self.v1','generatedAt':'2026-08-24T00:00:00.000Z','canonicalCheckpoint':'P101R1','candidate':'R7_MERGED_CURRENT_SOURCE','ancestry':{'commonBase':'R4','siblingBranches':['R5','R6']},'excludedSelfPaths':sorted(SELF),'runtimeExclusions':list(PREFIXES)+['**/__pycache__/**','**/*.pyc'],'fileCount':len(rows),'totalBytes':sum(s for _,s,_ in rows),'pathSetSha256':h(paths),'aggregateIdentitySha256':h(body),'manifestBodySha256':h(body),'manifestWithHeaderSha256':h(manifest),'packageJsonSha256':h((ROOT/'package.json').read_bytes()),'packageLockSha256':h((ROOT/'package-lock.json').read_bytes()),'customerFinalCredit':False,'truthBoundary':'Exact R7 merged source identity excluding self-referential and transient runtime paths. No runtime, Windows, staging, rights, or Customer FINAL credit.'}
(ROOT/'CURRENT_CANDIDATE_CONTENT_MANIFEST.tsv').write_bytes(manifest)
(ROOT/'VELMERE_R7_CURRENT_SOURCE_MANIFEST.tsv').write_bytes(manifest)
(ROOT/'CURRENT_CANDIDATE_TREE_IDENTITY_EXCLUDING_SELF.json').write_text(json.dumps(identity,indent=2)+'\n')
(ROOT/'artifacts/r7').mkdir(parents=True,exist_ok=True)
(ROOT/'artifacts/r7/VELMERE_R7_SOURCE_IDENTITY.json').write_text(json.dumps(identity,indent=2)+'\n')
(ROOT/'artifacts/r7/VELMERE_R7_FULL_SOURCE_IDENTITY.json').write_text(json.dumps(identity,indent=2)+'\n')
receipt={'schemaVersion':'velmere.current-candidate-receipt.r7.v1','generatedAt':'2026-08-24T00:00:00.000Z','classification':'MERGED_AUDITED_CURRENT_SOURCE_CANDIDATE_R7','canonicalCheckpoint':'P101R1','ancestry':identity['ancestry'],'notCanonicalCheckpoint':True,'globalState':'NO_GO_STOP_SELL','customerFinal':'0/20','paidValueFinal':'0/10','identity':identity,'manifests':{'currentCandidate':'CURRENT_CANDIDATE_CONTENT_MANIFEST.tsv','r7Source':'VELMERE_R7_CURRENT_SOURCE_MANIFEST.tsv','sha256':h(manifest)},'authority':'config/r7/r7-internal-customer-final-authority.json','nextPhysicalAction':'HOSTED_EXACT_WINDOWS_52_X2_THEN_STAGING_THEN_BROWSER_BASIC_FINAL','customerFinalCredit':False,'truthBoundary':'Merge and source identity only. Exact dependencies have separate hosted evidence; full Windows campaign and staging remain required.'}
(ROOT/'CURRENT_CANDIDATE_RECEIPT.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps(identity,indent=2))
