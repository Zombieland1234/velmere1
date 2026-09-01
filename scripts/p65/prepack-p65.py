from __future__ import annotations
import json,pathlib,re,hashlib
ROOT=pathlib.Path(__file__).resolve().parents[2]; P64=pathlib.Path('/mnt/data/velmere_recover/p64_work'); OUT=ROOT/'artifacts/closure/p65'
def fmap(r): return {p.relative_to(r).as_posix():p for p in r.rglob('*') if p.is_file()}
def sha(p): return hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
a=fmap(P64);b=fmap(ROOT)
missing=sorted(set(a)-set(b)); diff=[]
for r in sorted(set(a)&set(b)):
 if a[r].stat().st_size!=b[r].stat().st_size or sha(a[r])!=sha(b[r]):diff.append(r)
# all JSON syntax
json_fail=[]; json_count=0
for p in ROOT.rglob('*.json'):
 try: json.loads(p.read_text(encoding='utf-8-sig')); json_count+=1
 except Exception as e: json_fail.append({'path':p.relative_to(ROOT).as_posix(),'error':str(e)})
# actual private key material - conservative exact patterns.
key_name=[]; pem=[]
for p in ROOT.rglob('*'):
 if not p.is_file(): continue
 rel=p.relative_to(ROOT).as_posix(); low=p.name.lower()
 if low in {'id_rsa','id_dsa','id_ecdsa','id_ed25519'} or ('private' in low and 'key' in low and p.suffix.lower() in {'.pem','.key','.p12','.pfx'}): key_name.append(rel)
 try:
  if p.stat().st_size<5_000_000:
   t=p.read_text(encoding='utf-8',errors='ignore')
   if re.search(r'(?m)^-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----\s*$',t): pem.append(rel)
 except Exception: pass
# new P65 credential literal scan only. Avoid checking historic test fixtures.
new=sorted(set(b)-set(a)); cred=[]
pat=re.compile(r'(?i)(?:api[_-]?key|secret[_-]?key|private[_-]?key|access[_-]?token|bearer[_-]?token|password)\s*[:=]\s*["\']?[A-Za-z0-9_\-+/=]{20,}')
for rel in new:
 p=b[rel]
 if p.stat().st_size>3_000_000: continue
 try:
  t=p.read_text(encoding='utf-8',errors='ignore')
 except Exception: continue
 if pat.search(t): cred.append(rel)
# receipt/verifier/release invariants
D=json.loads((OUT/'P65_CURRENT_SOURCE_DECISION_RECEIPTS.json').read_text()); V=json.loads((OUT/'P65_CURRENT_SOURCE_VERIFIER.json').read_text()); I=json.loads((OUT/'P65_INDEPENDENT_CURRENT_SOURCE_VERIFIER.json').read_text()); W=json.loads((OUT/'windows/P65_EXACT_WINDOWS_CURRENT_SOURCE_RECEIPT.json').read_text(encoding='utf-8-sig'))
checks={
 'parentPreservation': not missing and not diff,
 'jsonSyntax': not json_fail,
 'privateKeyFilenames': not key_name,
 'privatePemBlocks': not pem,
 'newP65CredentialLiterals': not cred,
 'currentSourceVerifier': V['failed']==0 and V['passed']==29,
 'independentVerifier': I['failed']==0 and I['passed']==18,
 'exactWindows': W['status']=='PASS_P65_EXACT_WINDOWS_CURRENT_OFFICIAL_SOURCE_RECEIPTS_NO_PROMOTION',
 'denominators': D['denominators']['customerRowsCurrentSourceDecisionReceipt']==6 and D['denominators']['profilesCurrentSourceDecisionReceipt']==12 and D['denominators']['targetFieldsAdjudicated']==74,
 'noPromotion': D['denominators']['customerRowsFinalCustomerOutput']==0 and D['denominators']['profilesFinalCustomerOutput']==0 and D['denominators']['legalSourceFieldsPassed']==0 and D['denominators']['saleEligibleRows']==0
}
out={'schemaVersion':'velmere.p65.prepack-verification.v1','generatedAt':'2026-08-16T15:20:00.000Z','revision':'P65/V16','checks':checks,
 'jsonSyntaxValidation':{'status':'PASS_ALL_JSON_PARSE' if not json_fail else 'FAIL','filesParsed':json_count,'failures':json_fail},
 'actualPrivateKeyFilenameScan':{'status':'PASS_0_HITS' if not key_name else 'FAIL','hits':key_name},'actualPrivatePemBlockScan':{'status':'PASS_0_HITS' if not pem else 'FAIL','hits':pem},
 'newP65CredentialLiteralScan':{'status':'PASS_0_HITS' if not cred else 'FAIL','hits':cred},
 'parentP64Preservation':{'byteIdentical':len(a)-len(missing)-len(diff),'parentFiles':len(a),'unexpectedChanges':len(diff),'missing':len(missing)},
 'currentSourceDecisionCoverage':{'targetFields':'74/74 target slice','customerRows':'6/17','internalProfiles':'12/33','finalCustomerRows':'0/17','finalProfiles':'0/33','legalSourceFields':'0/176','sale':'0/17'},
 'verifier':'29/29 PASS','independentVerifier':'18/18 PASS','exactWindows':{'runId':31954673253,'node':'v24.18.0','npm':'11.16.0','status':W['status']},
 'status':'PASS_P65_PREPACK_HYGIENE_AND_DECISION_CONSISTENCY' if all(checks.values()) else 'FAIL_P65_PREPACK',
 'truthBoundary':'Prepack hygiene and decision consistency only. Final package determinism/CRC/clean-unpack are checked after freeze; final output/legal/value/sale remain withheld.'}
(OUT/'P65_PREPACK_VERIFICATION.json').write_text(json.dumps(out,indent=2,sort_keys=True)+'\n')
print(json.dumps({'status':out['status'],'json':json_count,'parent':out['parentP64Preservation'],'newFiles':len(new),'privateKeyHits':len(key_name)+len(pem),'credentialHits':len(cred)},indent=2))
if out['status'].startswith('FAIL'): raise SystemExit(2)
