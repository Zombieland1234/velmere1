#!/usr/bin/env python3
from __future__ import annotations
import argparse,hashlib,json,re,zipfile
from pathlib import Path

def sha(p:Path)->str:
 h=hashlib.sha256()
 with p.open('rb') as f:
  for c in iter(lambda:f.read(4*1024*1024),b''):h.update(c)
 return h.hexdigest()
ap=argparse.ArgumentParser();
for name in ['master','v17','ledger','zip','package_verification','output']:ap.add_argument('--'+name.replace('_','-'),dest=name,required=True)
a=ap.parse_args(); master=Path(a.master);v17=Path(a.v17);ledger=Path(a.ledger);package=Path(a.zip);verification=json.loads(Path(a.package_verification).read_text())
checks=[]
def check(i,c,d=None):checks.append({'id':i,'status':'PASS' if c else 'FAIL',**({} if d is None else {'detail':d})})
for i,p in [('master_exists',master),('v17_exists',v17),('ledger_exists',ledger),('zip_exists',package)]:check(i,p.is_file())
mt=master.read_text();lt=ledger.read_text();sections=[int(x) for x in re.findall(r'(?m)^# (\d+)\.',mt)]
check('master_sections_0_88',sections==list(range(89)),len(sections));check('master_start_now','START NOW' in mt);check('master_end_sentinel','END-OF-DIRECTIVE' in mt);check('master_r1','V2 R1' in mt);check('master_unique_checkpoint_rule','UNIQUE CHECKPOINT IDENTITY / BRANCH COLLISION' in mt)
check('master_sha',sha(master)=='45e2b377be0869f1acb3ef34844919643a537c617b0a8145402cc8c732e8b3c1',sha(master));check('v17_sha',sha(v17)=='de7fbd6df651a7a8a8f85054c6e9ac3c2ca530ebfb0d4ccd335dcb99fb658f05',sha(v17))
check('ledger_p97','P97R1 / V17' in lt);check('ledger_parent_p96','Parent canonical checkpoint: P96R1' in lt);check('ledger_external_blocker','EXTERNAL_BLOCKER_CONFIRMED' in lt);check('ledger_browser_basic_no_final','Browser Basic FINAL: false' in lt);check('ledger_no_fake_final','Customer FINAL: 0/20' in lt and 'Global: NO_GO / STOP_SELL' in lt)
check('package_verification_pass',verification.get('status')=='PASS');check('package_name',verification.get('output')==package.name);check('package_sha',verification['final']['sha256']==sha(package),sha(package));check('package_bytes',verification['final']['bytes']==package.stat().st_size,package.stat().st_size)
with zipfile.ZipFile(package) as z:
 names=z.namelist();bad=z.testzip();infos=z.infolist()
 check('zip_crc',bad is None,bad);check('zip_order',names==sorted(names));check('zip_no_directories',all(not n.endswith('/') for n in names));check('zip_fixed_time',all(i.date_time==(1980,1,1,0,0,0) for i in infos));check('zip_create_system',all(i.create_system==0 for i in infos));check('zip_contains_master',master.name in names);check('zip_contains_v17',v17.name in names);check('zip_active_p97',z.read('VELMERE_ACTIVE_PASS.txt').decode().strip()=='P97R1');check('zip_contains_policy','lib/search/lens-pdf-durable-artifact-policy.ts' in names);check('zip_contains_route','lib/server/search-route-modules/lens-report.ts' in names);check('zip_contains_checkpoint','artifacts/closure/p97r1/P97R1_CHECKPOINT_RECEIPT.json' in names);check('zip_contains_external_blocker','receipts/p97/P97_EXTERNAL_BLOCKER_CONFIRMED.json' in names);check('zip_contains_20_row_map','receipts/p97/P97_CURRENT_20_ROW_FINAL_DISTANCE_MAP.json' in names);check('zip_contains_failure_adjudication','receipts/p97/P97_FAILURE_ADJUDICATION.json' in names);check('zip_no_p97_ledger',ledger.name not in names);check('zip_no_current_fonts',not any(n.startswith(('receipts/p97/','artifacts/p97/','scripts/p97/','artifacts/closure/p97r1/')) and Path(n).suffix.lower() in {'.ttf','.otf','.woff','.woff2'} for n in names))
check('ledger_package_name',package.name in lt);check('ledger_package_sha',sha(package) in lt);check('ledger_package_bytes',f"Bytes: {package.stat().st_size:,}" in lt);check('ledger_master_sha',sha(master) in lt);check('ledger_v17_sha',sha(v17) in lt);check('four_unique_files',len({master.resolve(),v17.resolve(),ledger.resolve(),package.resolve()})==4)
failed=[r for r in checks if r['status']!='PASS'];receipt={'schemaVersion':'velmere.p97r1.final-four-file-verification.v1','generatedAt':'2026-08-21T09:00:00.000Z','status':'PASS' if not failed else 'FAIL','checks':{'total':len(checks),'passed':len(checks)-len(failed),'failed':len(failed),'rows':checks},'files':[{'name':p.name,'bytes':p.stat().st_size,'sha256':sha(p)} for p in (master,v17,ledger,package)],'truthBoundary':'Exact four-file handoff identity and package integrity only; no deployment, Browser rendering, staging or Customer FINAL credit.'}
Path(a.output).write_text(json.dumps(receipt,indent=2,ensure_ascii=False)+"\n");print(json.dumps({'status':receipt['status'],'checks':receipt['checks'],'files':receipt['files']},indent=2,ensure_ascii=False));raise SystemExit(1 if failed else 0)
