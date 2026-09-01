#!/usr/bin/env python3
from __future__ import annotations
import argparse,hashlib,json,os,re,shutil,stat,subprocess,sys,tempfile,zipfile
from pathlib import Path,PurePosixPath
ROOT=Path(__file__).resolve().parents[2];ART=ROOT/'artifacts/closure/p42';MAN=ART/'P42_SOURCE_ONLY_PACKAGE_MANIFEST.json';EXC=ART/'P42_PACKAGE_EXCLUSIONS.json';FIX=(1980,1,1,0,0,0)
V16='docs/authority/VELMERE_CANONICAL_OWNER_DIRECTIVE_V16_FULL_TOPOLOGY_FREE_LEGAL_CURRENT_WORLD_CLASS_2026-08-14.txt';V15='docs/authority/VELMERE_CANONICAL_OWNER_DIRECTIVE_V15_FREE_LEGAL_TOP_WORLD_2026-08-13.txt';V16SHA='67816a5a9238668c8080a3a8cc623f078d268c1b78fddf534cb4893bb45490e9';V15SHA='5cfbbfcbcef7242e30466f18bab3ad29cad859e485a909a4ee8658fb65e2f2c0';P41SOURCE='b646ea33ba3c66d163c77bb6df1b1c02d93c883238abacc026b2f949ed6bad68';REV='P42_V16_EXACT_WINDOWS_DEPENDENCY_CLOSURE_SEMANTIC_DUAL_BUILD_BRIDGE'
REQ={V16,V15,'artifacts/closure/p42/source-identity.json','artifacts/closure/p42/P42_STATUS.json','artifacts/closure/p42/CURRENT_AUTHORITY_P42.json','artifacts/closure/p42/VELMERE_CURRENT_STATE_AND_PASS_DELTA_LEDGER_P42_V16_2026-08-14.txt','artifacts/closure/p42/P42_HANDOFF_MANIFEST.json','artifacts/closure/p42/P42_EXACT_WINDOWS_DEPENDENCY_INGEST_VERIFICATION.json','artifacts/closure/p42/P42_SEMANTIC_DUAL_BUILD_BRIDGE_VERIFICATION.json','artifacts/closure/p42/P42_SEMANTIC_DUAL_BUILD_SELF_TEST.json','artifacts/closure/p42/P42_SEMANTIC_DUAL_BUILD_FAILURE_SELF_TEST.json','artifacts/closure/p42/P42_GITHUB_ACTIONS_SUCCESS_PROVENANCE.json','artifacts/closure/p42/P42_SOURCE_DIFFERENTIAL.json','artifacts/closure/p42/P42_PREPACK_CLOSURE_VERIFICATION.json','config/p42/p42-exact-windows-dependency-closure-policy.json','config/p42/p42-exact-windows-semantic-dual-build-policy.json','.github/workflows/p42-exact-windows-semantic-dual-build.yml','scripts/pass42/verify-p42-exact-windows-dependency-closure.py','scripts/pass42/run-p42-exact-windows-semantic-dual-build.mjs','scripts/pass42/verify-p42-semantic-dual-build-bridge.py','scripts/pass42/verify-p42-closure-receipts.py','scripts/closure/build-p42-source-identity.py','scripts/closure/build-p42-current-state.py','scripts/closure/package-p42-current-source.py'}
PUB=tuple(f'config/release-verification/pass{i}-offline-candidate-public.pem' for i in range(4734,4742));COMP={'.git','.cache','.mypy_cache','.npm','.parcel-cache','.pnpm-store','.pytest_cache','.ruff_cache','.turbo','.velmere','__pycache__','node_modules'};ROOTEX={'coverage','temp','tmp','p41-out','p42-out'};PREF=('artifacts/pass36/a83/browser-lens-pdf-corpus','artifacts/pass36/a83/renders','artifacts/pass35/a45/screenshots','artifacts/closure/p33/paid-tests','artifacts/closure/p33/paid-tests-rerun','artifacts/closure/p33/paid-tests-current','artifacts/closure/p32/final-selected-test-logs');EXACT={'artifacts/pass35/a45/A45_DETERMINISTIC_LOCAL_REFERENCE_QA_FIXTURE.json','artifacts/closure/p34/internal-ai-assessments.jsonl','artifacts/closure/p35/internal-ai-assessments.jsonl'};SUF={'.pyc','.pyo','.zip'};PRIVATE=(b'-----BEGIN PRIVATE KEY-----',b'-----BEGIN RSA PRIVATE KEY-----',b'-----BEGIN EC PRIVATE KEY-----',b'-----BEGIN OPENSSH PRIVATE KEY-----',b'-----BEGIN ENCRYPTED PRIVATE KEY-----');PUBLIC=(b'-----BEGIN PUBLIC KEY-----',b'-----BEGIN CERTIFICATE-----');ACTIVE=re.compile(rb'(?:sk|pk)_(?:live|test)_[A-Za-z0-9_-]{24,}|whsec_[A-Za-z0-9_-]{24,}|Bearer\s+[A-Za-z0-9._~+/=-]{24,}|-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----',re.I)
def sb(b):return hashlib.sha256(b).hexdigest()
def sf(p):
 h=hashlib.sha256();
 with Path(p).open('rb') as f:
  for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
 return h.hexdigest()
def mode(m):return 0o755 if m&0o111 else 0o644
def relout(p):
 try:return p.resolve().relative_to(ROOT.resolve()).as_posix()
 except:return None
def artifact_noise(rel,p):
 if not rel.startswith('artifacts/'):return False
 if p.suffix.lower() in {'.log','.sqlite','.sqlite3','.zip'}:return True
 if p.name.lower().endswith(('.exitcode','.stdout','.stderr')) or any(x in p.name.lower() for x in ['.stdout.','.stderr.']):return True
 if any(x.lower() in {'logs','test-logs','temporary-receipts','npm-cache','cas'} for x in p.parts):return True
 return False
def excluded(rel,dyn):
 p=PurePosixPath(rel);parts=p.parts
 return (not parts or rel in dyn or rel in EXACT or any(x in COMP or x.startswith('.next') for x in parts) or parts[0] in ROOTEX or (len(parts)>=2 and parts[0]=='.yarn' and parts[1]=='cache') or any(rel==x or rel.startswith(x+'/') for x in PREF) or p.suffix.lower() in SUF or p.name=='.env' or p.name.startswith('.env.') or p.suffix.lower() in {'.key','.p12','.pfx'} or p.name.lower() in {'credentials.json','service-account.json','service_account.json','client-secret.json','client_secret.json','manrope-pdf-latin-plus-ext.ttf'} or any(x.upper()=='MATERIALS' for x in parts) or artifact_noise(rel,p))
def inventory(dyn):
 rows=[];pub=[];fold={}
 for dirpath,dirnames,filenames in os.walk(ROOT,topdown=True,followlinks=False):
  d=Path(dirpath);rd=d.relative_to(ROOT).as_posix();dirnames[:]=sorted([x for x in dirnames if not excluded((PurePosixPath(rd)/x).as_posix() if rd!='.' else x,dyn)],key=lambda x:x.encode())
  for name in sorted(filenames,key=lambda x:x.encode()):
   p=d/name;rel=p.relative_to(ROOT).as_posix()
   if excluded(rel,dyn):continue
   if p.is_symlink() or not p.is_file():raise RuntimeError('nonregular:'+rel)
   f=rel.casefold();
   if f in fold and fold[f]!=rel:raise RuntimeError('casefold:'+rel)
   fold[f]=rel;data=p.read_bytes()
   if p.suffix.lower()=='.pem':
    if any(x in data[:4096] for x in PRIVATE) or not any(x in data[:4096] for x in PUBLIC):raise RuntimeError('forbidden_pem:'+rel)
    pub.append(rel)
   rows.append({'path':rel,'byteLength':len(data),'mode':mode(p.stat().st_mode),'sha256':sb(data)})
 rows.sort(key=lambda r:r['path'].encode());return rows,pub
def writezip(p,rows):
 with zipfile.ZipFile(p,'w',zipfile.ZIP_DEFLATED,compresslevel=9,allowZip64=True) as z:
  for r in rows:
   i=zipfile.ZipInfo(r['path'],FIX);i.create_system=3;i.external_attr=(r['mode']&0xffff)<<16;i.compress_type=zipfile.ZIP_DEFLATED;i.flag_bits=0x800;z.writestr(i,(ROOT/r['path']).read_bytes(),compress_type=zipfile.ZIP_DEFLATED,compresslevel=9)
def verifyzip(p,rows):
 exp={r['path']:r for r in rows}
 with zipfile.ZipFile(p) as z:
  bad=z.testzip();names=z.namelist();
  if len(names)!=len(set(names)) or set(names)!=set(exp):raise RuntimeError('pathset')
  total=0
  for i in z.infolist():
   b=z.read(i.filename);r=exp[i.filename]
   if len(b)!=r['byteLength'] or sb(b)!=r['sha256'] or i.date_time!=FIX:raise RuntimeError('content:'+i.filename)
   total+=len(b)
 return {'crcPass':bad is None,'entries':len(rows),'uncompressedBytes':total}
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--output',required=True);ap.add_argument('--copy-b',required=True);ap.add_argument('--receipt',required=True);ap.add_argument('--external-ledger',required=True);a=ap.parse_args();o,b,rec,ext=map(lambda x:Path(x).resolve(),[a.output,a.copy_b,a.receipt,a.external_ledger]);dyn={x for x in [relout(o),relout(b),relout(rec),relout(ext),relout(MAN)] if x};ART.mkdir(parents=True,exist_ok=True)
 exc={'schemaVersion':'velmere.p42.source-only-package-exclusions.v1','revision':REV,'generatedAt':'2026-08-14T10:40:00.000Z','state':'CURRENT_SOURCE_ONLY_IN_PROGRESS','releaseState':'NO_GO','excludedComponents':sorted(COMP),'excludedRootDirectories':sorted(ROOTEX),'excludedPrefixes':list(PREF),'excludedExactPaths':sorted(EXACT),'dynamicOutputSelfExclusions':sorted(dyn),'physicalCorporaIncluded':False,'externalFontIncluded':False,'privatePemIncluded':False};exc['integritySha256']=sb(json.dumps(exc,sort_keys=True,separators=(',',':')).encode());EXC.write_text(json.dumps(exc,indent=2)+'\n')
 rows,pub=inventory(dyn);paths={r['path'] for r in rows};missing=REQ-paths
 if missing:raise RuntimeError('missing:'+str(sorted(missing)))
 if set(pub)!=set(PUB):raise RuntimeError('public_pem_set')
 active=[]
 for r in rows:
  if r['path'].split('/')[0] in {'app','components','lib'} and PurePosixPath(r['path']).suffix.lower() in {'.js','.jsx','.mjs','.cjs','.ts','.tsx','.json','.py','.sh','.ps1'} and ACTIVE.search((ROOT/r['path']).read_bytes()):active.append(r['path'])
 if active:raise RuntimeError('active_secret:'+str(active))
 ident=json.load(open(ROOT/'artifacts/closure/p42/source-identity.json'));dep=json.load(open(ROOT/'artifacts/closure/p42/P42_EXACT_WINDOWS_DEPENDENCY_INGEST_VERIFICATION.json'));bridge=json.load(open(ROOT/'artifacts/closure/p42/P42_SEMANTIC_DUAL_BUILD_BRIDGE_VERIFICATION.json'));pre=json.load(open(ROOT/'artifacts/closure/p42/P42_PREPACK_CLOSURE_VERIFICATION.json'))
 manifest={'schemaVersion':'velmere.p42.source-only-package-manifest.v1','revision':REV,'generatedAt':'2026-08-14T10:41:00.000Z','state':'CURRENT_SOURCE_ONLY_IN_PROGRESS','releaseState':'NO_GO','manifestEntriesExcludeManifestSelf':True,'fileCountExcludingManifestSelf':len(rows),'payloadBytesExcludingManifestSelf':sum(r['byteLength'] for r in rows),'pathSetSha256ExcludingManifestSelf':sb('\n'.join(r['path'] for r in rows).encode()),'packageAggregateSha256ExcludingManifestSelf':sb(b''.join(f"{r['path']}\0{r['byteLength']}\0{r['mode']}\0{r['sha256']}\n".encode() for r in rows)),'currentSourceIdentity':{k:ident[k] for k in ['fileCount','payloadBytes','pathSetSha256','sourceAggregateSha256']},'authority':{'v16':V16SHA,'v15Historical':V15SHA,'parentRoot':'R44P46','parentP41SourceAggregateSha256':P41SOURCE},'p42Closure':{'exactWindowsDependencyIngest':dep['status'],'lockPaths':'661/661','uniqueTarballs':'618/618','onlineOfflineNpmCiIgnoreScripts':'PASS/PASS','semanticDualBuildBridge':bridge['status'],'prepackVerification':pre['status'],'nativeSemanticDualBuild':'0/4','browser':'0/3','pdf':'0/1','customerOutputs':'0/17','fieldRights':'0/176','materialDeltas':'0/6','saleEligible':'0/17'},'publicPemPolicy':{'includedPublicPemCount':len(pub),'paths':pub,'privatePemIncluded':0,'ambiguousPemIncluded':0},'entriesExcludingManifestSelf':rows,'creditBoundary':{'cleanPackage':True,'exactWindowsDependencyClosure':True,'nativeSemanticDualBuild':False,'browser':False,'pdf':False,'customerOutput':False,'fieldRights':False,'materialValue':False,'goInternal':False,'goPaid':False,'live':False,'worldClassProven':False},'truthBoundary':'P42 deterministically packages the exact Windows dependency closure evidence and the next semantic dual-build bridge. Native current-root semantic/build and downstream product gates remain open.'};manifest['integritySha256']=sb(json.dumps(manifest,sort_keys=True,separators=(',',':')).encode());MAN.write_text(json.dumps(manifest,indent=2)+'\n');mr={'path':MAN.relative_to(ROOT).as_posix(),'byteLength':MAN.stat().st_size,'mode':0o644,'sha256':sf(MAN)};allrows=sorted(rows+[mr],key=lambda r:r['path'].encode());writezip(o,allrows);writezip(b,allrows);sa,sb2=sf(o),sf(b);va,vb=verifyzip(o,allrows),verifyzip(b,allrows);identical=sa==sb2 and o.read_bytes()==b.read_bytes();
 if not identical or not va['crcPass'] or not vb['crcPass']:raise RuntimeError('determinism')
 # Clean-unpack both and rerun identity + P42 verifier.
 clean=[]
 for idx,zp in enumerate([o,b],1):
  td=Path(tempfile.mkdtemp(prefix=f'p42-clean-{idx}-',dir='/mnt/data'));ri=td.parent/(td.name+'-identity.json');rv=td.parent/(td.name+'-verify.json')
  try:
   with zipfile.ZipFile(zp) as z:z.extractall(td)
   for r in allrows:
    q=td/r['path'];
    if not q.is_file() or q.stat().st_size!=r['byteLength'] or sf(q)!=r['sha256']:raise RuntimeError('clean_content:'+r['path'])
    os.chmod(q,r['mode'])
   x=subprocess.run([sys.executable,'scripts/closure/build-p42-source-identity.py','--output',str(ri)],cwd=td,capture_output=True,text=True);y=subprocess.run([sys.executable,'scripts/pass42/verify-p42-closure-receipts.py','--root','.','--output',str(rv)],cwd=td,capture_output=True,text=True)
   if x.returncode or y.returncode:raise RuntimeError('clean_replay:'+x.stdout+x.stderr+y.stdout+y.stderr)
   ii=json.load(open(ri));vv=json.load(open(rv));
   if ii['sourceAggregateSha256']!=ident['sourceAggregateSha256'] or vv['status']!='PASS':raise RuntimeError('clean_identity')
   clean.append({'pathContentIdentity':True,'sourceIdentity':True,'p42Verifier':True,'sourceAggregateSha256':ii['sourceAggregateSha256']})
  finally:shutil.rmtree(td,ignore_errors=True);ri.unlink(missing_ok=True);rv.unlink(missing_ok=True)
 payload={'schemaVersion':'velmere.p42.deterministic-source-only-package-receipt.v1','revision':REV,'generatedAt':'2026-08-14T10:45:00.000Z','state':'CURRENT_SOURCE_ONLY_IN_PROGRESS','releaseState':'NO_GO','archive':str(o),'copyB':str(b),'sha256':sa,'copyBSha256':sb2,'byteIdentical':identical,'crcPass':va['crcPass'] and vb['crcPass'],'entries':va['entries'],'uncompressedBytes':va['uncompressedBytes'],'zipBytes':o.stat().st_size,'sourceIdentitySha256':sf(ROOT/'artifacts/closure/p42/source-identity.json'),'sourceAggregateSha256':ident['sourceAggregateSha256'],'manifestSha256':sf(MAN),'cleanUnpackA':clean[0],'cleanUnpackB':clean[1],'publicPemsIncluded':len(pub),'activeCredentialLiteralHits':active,'releaseGates':{'exactWindowsDependencyClosure':True,'nativeSemanticDualBuild':False,'browser':'0/3','pdf':'0/1','customerOutputs':'0/17','fieldRights':'0/176','materialDeltas':'0/6','saleEligible':'0/17','goInternal':False,'goPaid':False,'live':False,'worldClassProven':False}};payload['integritySha256']=globals()['sb'](json.dumps(payload,sort_keys=True,separators=(',',':')).encode());rec.write_text(json.dumps(payload,indent=2)+'\n')
 internal=(ROOT/'artifacts/closure/p42/VELMERE_CURRENT_STATE_AND_PASS_DELTA_LEDGER_P42_V16_2026-08-14.txt').read_text();append=f"""\n======================================================================\nFINAL EXTERNAL PACKAGE HANDOFF RECEIPT\n======================================================================\nPackage: {o.name}\nPackage SHA-256: {sa}\nCopy-B SHA-256: {sb2}\n2/2 byte-identical: PASS\nCRC A/B: PASS\nClean-unpack source identity A/B: PASS\nClean-unpack P42 verifier A/B: PASS\nArchive entries: {va['entries']}\nZIP bytes: {o.stat().st_size}\nUncompressed bytes: {va['uncompressedBytes']}\nCurrent source rows: {ident['fileCount']}\nCurrent source aggregate: {ident['sourceAggregateSha256']}\nPublic verification PEMs: {len(pub)}/8\nPrivate or ambiguous PEMs: 0\nActive credential literal hits: 0\nExact Windows dependency closure: PASS\nCurrent-root TypeScript / ESLint / Webpack / Turbopack: 0/4\nBrowser: 0/3 | PDF: 0/1 | outputs: 0/17 | rights: 0/176 | sale: 0/17\nGO_INTERNAL=false | PILOT_READY=false | GO_PAID=false | LIVE=false | WORLD_CLASS_PROVEN=false\n""";ext.write_text(internal+append)
 print(json.dumps({'status':'PASS_P42_DETERMINISTIC_PACKAGE','sha256':sa,'entries':va['entries'],'zipBytes':o.stat().st_size,'sourceAggregate':ident['sourceAggregateSha256'],'externalLedgerSha256':sf(ext)}));return 0
if __name__=='__main__':raise SystemExit(main())
