#!/usr/bin/env python3
from __future__ import annotations
import hashlib,json,re,zipfile
from pathlib import Path
MASTER=Path('/mnt/data/VELMERE_ULTIMATE_WORLD_CLASS_CONTINUOUS_CLOSURE_FINAL_CANDIDATE_MASTER_DIRECTIVE_V2_R1_CHECKPOINT_IDENTITY_2026-08-21.txt')
V17=Path('/mnt/data/VELMERE_CANONICAL_OWNER_DIRECTIVE_V17_TRUE_TOPOLOGY_AUTOMATED_ADVANCED_CURRENT_WORLD_CLASS_2026-08-17.txt')
LEDGER=Path('/mnt/data/VELMERE_CURRENT_STATE_AND_PASS_DELTA_LEDGER_P99R1_V17_2026-08-21.txt')
ZIP=Path('/mnt/data/VELMERE_R44P46_V17_P99R1_REAL_MARKETS_BASIC_FIELD_RIGHTS_SEMANTIC_REFERENCE_FAIL_CLOSED_CURRENT_SOURCE_ONLY_IN_PROGRESS_2026-08-21.zip')
VERIFY=Path('/mnt/data/P99R1_PACKAGE_VERIFICATION.json')
OUT=Path('/mnt/data/P99R1_FINAL_FOUR_FILE_VERIFICATION.json')
def sha(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for c in iter(lambda:f.read(4*1024*1024),b''):h.update(c)
 return h.hexdigest()
checks=[]
def check(i,c,d=None):checks.append({'id':i,'status':'PASS' if c else 'FAIL',**({} if d is None else {'detail':d})})
for p,n in [(MASTER,'master'),(V17,'v17'),(LEDGER,'ledger'),(ZIP,'zip'),(VERIFY,'package_verification')]:check(f'{n}_exists',p.is_file(),str(p))
mt=MASTER.read_text(); sections=[int(x) for x in re.findall(r'(?m)^# (\d+)\.',mt)]
check('master_sections_0_88',sections==list(range(89)),len(sections));check('master_start_now','START NOW' in mt);check('master_end_sentinel','END-OF-DIRECTIVE' in mt);check('master_unique_checkpoint_rule','UNIQUE CHECKPOINT IDENTITY / BRANCH COLLISION' in mt.upper())
check('master_sha',sha(MASTER)=='45e2b377be0869f1acb3ef34844919643a537c617b0a8145402cc8c732e8b3c1',sha(MASTER));check('v17_sha',sha(V17)=='de7fbd6df651a7a8a8f85054c6e9ac3c2ca530ebfb0d4ccd335dcb99fb658f05',sha(V17))
lt=LEDGER.read_text()
for needle in ['P99R1','Customer FINAL: 0/20','Rights: 2/203 inherited only','Real Markets Basic FINAL: false','NO_GO / STOP_SELL','WITHHELD_RIGHTS_UNVERIFIED','price is aggregated reference data','Next HIGHEST-VALUE WORK'.lower()]:
 check('ledger_'+re.sub(r'\W+','_',needle).strip('_').lower(),needle.lower() in lt.lower())
pv=json.loads(VERIFY.read_text());check('package_status',pv.get('status')=='PASS');check('package_deterministic',pv.get('deterministicRebuild')=='2/2 BYTE_IDENTICAL');check('package_crc',pv.get('buildA',{}).get('crc')=='PASS' and pv.get('buildB',{}).get('crc')=='PASS');check('package_clean_unpack',pv.get('final',{}).get('cleanUnpack')=='PASS_PATH_AND_CONTENT_IDENTITY');check('zip_hash_matches_verification',sha(ZIP)==pv.get('final',{}).get('sha256'));check('zip_size_matches_verification',ZIP.stat().st_size==pv.get('final',{}).get('bytes'))
with zipfile.ZipFile(ZIP) as z:
 names=z.namelist();check('zip_crc_test',z.testzip() is None);check('zip_lexicographic',names==sorted(names));check('zip_no_directories',not any(x.endswith('/') for x in names));check('zip_active_pass',z.read('VELMERE_ACTIVE_PASS.txt').decode().strip()=='P99R1');check('zip_master_exact',hashlib.sha256(z.read(MASTER.name)).hexdigest()==sha(MASTER));check('zip_v17_exact',hashlib.sha256(z.read(V17.name)).hexdigest()==sha(V17));check('zip_p99_policy_present','lib/market-integrity/real-markets-basic-field-policy.ts' in names);check('zip_p99_registry_present','config/p99/real-markets-basic-field-rights-currentness-registry.json' in names);check('zip_p99_receipts_present','receipts/p99/P99_AFFECTED_SCOPE_REGRESSION.json' in names);check('zip_no_ledger_inside',LEDGER.name not in names)
failed=[r for r in checks if r['status']!='PASS']
receipt={'schemaVersion':'velmere.p99r1.final-four-file-verification.v1','generatedAt':'2026-08-21T15:20:00.000Z','status':'PASS' if not failed else 'FAIL','checks':{'total':len(checks),'passed':len(checks)-len(failed),'failed':len(failed),'rows':checks},'files':[{'name':p.name,'bytes':p.stat().st_size,'sha256':sha(p)} for p in [MASTER,V17,LEDGER,ZIP]],'truthBoundary':'Final four-file identity and package verification only. No rights, provider, deployment, Browser, exact Windows or Customer FINAL credit.'}
OUT.write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps({'status':receipt['status'],'checks':receipt['checks'],'files':receipt['files']},indent=2));raise SystemExit(1 if failed else 0)
