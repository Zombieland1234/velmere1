#!/usr/bin/env python3
from __future__ import annotations
import argparse,hashlib,json,re,zipfile
from pathlib import Path
def sha(path:Path):
 h=hashlib.sha256()
 with path.open('rb') as f:
  for c in iter(lambda:f.read(4*1024*1024),b''):h.update(c)
 return h.hexdigest()
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--master',required=True);ap.add_argument('--v17',required=True);ap.add_argument('--ledger',required=True);ap.add_argument('--zip',required=True);ap.add_argument('--package-verification',required=True);ap.add_argument('--output',required=True);args=ap.parse_args()
 master=Path(args.master);v17=Path(args.v17);ledger=Path(args.ledger);source=Path(args.zip);pv=json.loads(Path(args.package_verification).read_text());checks=[]
 def check(cid,condition,detail=None):
  checks.append({'id':cid,'status':'PASS' if condition else 'FAIL','detail':detail})
  if not condition:raise AssertionError(f'{cid}:{detail}')
 check('master_exists',master.is_file());check('master_bytes',master.stat().st_size==38471,master.stat().st_size);check('master_sha',sha(master)=='9184cd18eb864f50a8c5d3af8f2899e7f138372861095e343901ab9c5e3bcb53',sha(master));text=master.read_text();sections=[int(x) for x in re.findall(r'^# (\d+)\.',text,re.M)];check('master_sections',sections==list(range(89)));check('master_start','START NOW' in text);check('master_sentinel','END-OF-DIRECTIVE' in text)
 check('v17_exists',v17.is_file());check('v17_bytes',v17.stat().st_size==66416,v17.stat().st_size);check('v17_sha',sha(v17)=='de7fbd6df651a7a8a8f85054c6e9ac3c2ca530ebfb0d4ccd335dcb99fb658f05',sha(v17))
 check('ledger_exists',ledger.is_file());lt=ledger.read_text();check('ledger_p92','P92R1' in lt);check('ledger_zero_final','Customer FINAL: 0/20' in lt);check('ledger_package_hash',pv['final']['sha256'] in lt);check('ledger_rights','Rights: 2/203 inherited only' in lt);check('ledger_no_go','NO_GO / STOP_SELL' in lt)
 check('zip_exists',source.is_file());check('zip_bytes',source.stat().st_size==pv['final']['bytes'],source.stat().st_size);check('zip_sha',sha(source)==pv['final']['sha256'],sha(source))
 with zipfile.ZipFile(source) as z:
  infos=z.infolist();names=[x.filename for x in infos];s=set(names);check('zip_entries',len(infos)==pv['final']['entryCount'],len(infos));check('zip_crc',z.testzip() is None);check('zip_sorted',names==sorted(names));check('zip_no_dirs',not any(x.is_dir() or x.filename.endswith('/') for x in infos));check('zip_timestamp',all(x.date_time==(1980,1,1,0,0,0) for x in infos));check('zip_create_system',all(x.create_system==0 for x in infos));check('zip_master',master.name in s);check('zip_v17',v17.name in s);check('zip_no_ledger',ledger.name not in s);check('zip_identity','artifacts/closure/p92r1/P92R1_TREE_IDENTITY_EXCLUDING_SELF.json' in s);check('zip_checkpoint','artifacts/closure/p92r1/P92R1_CHECKPOINT_RECEIPT.json' in s);check('zip_ui_boundary','artifacts/closure/p92r1/P92R1_RISK_HISTORY_CUSTOMER_UI_BOUNDARY.json' in s);check('zip_failure_adjudication','artifacts/closure/p92r1/P92R1_FAILURE_ADJUDICATION.json' in s);check('zip_client','lib/market-integrity/risk-history-customer-client.ts' in s);check('zip_control','components/market-integrity/RiskHistoryControl.tsx' in s)
 check('package_verification_pass',pv['status']=='PASS');check('deterministic_2_2',pv['deterministicRebuild']=='2/2 BYTE_IDENTICAL');check('secret_scan',pv['privateKeySecretScan']['matches']==0);check('binary_scan',pv['unexpectedCurrentBinaryScan']['matches']==0);check('manifest_exact',pv['packageContentManifest']['verifiedExact'] is True);check('clean_unpack',pv['final']['cleanUnpack']=='PASS_PATH_AND_CONTENT_IDENTITY')
 failed=[x for x in checks if x['status']=='FAIL'];payload={'schemaVersion':'velmere.p92r1.final-four-file-verification.v1','status':'PASS' if not failed else 'FAIL','checks':{'total':len(checks),'passed':len(checks)-len(failed),'failed':len(failed),'rows':checks},'files':{'master':{'path':str(master),'bytes':master.stat().st_size,'sha256':sha(master)},'v17':{'path':str(v17),'bytes':v17.stat().st_size,'sha256':sha(v17)},'ledger':{'path':str(ledger),'bytes':ledger.stat().st_size,'sha256':sha(ledger)},'sourceOnly':{'path':str(source),'bytes':source.stat().st_size,'sha256':sha(source),'entries':pv['final']['entryCount']}},'truthBoundary':'Four-file handoff identity and package integrity only; no product FINAL, Browser, staging, provider rights, deployment or exact-Windows promotion.'}
 output=Path(args.output);output.parent.mkdir(parents=True,exist_ok=True);output.write_text(json.dumps(payload,indent=2)+'\n');print(json.dumps({'status':payload['status'],'passed':payload['checks']['passed'],'total':payload['checks']['total'],'files':payload['files']},indent=2))
if __name__=='__main__':main()
