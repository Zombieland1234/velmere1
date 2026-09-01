#!/usr/bin/env python3
from __future__ import annotations
import argparse,hashlib,json,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
def sha(p):
 h=hashlib.sha256();
 with Path(p).open('rb') as f:
  for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
 return h.hexdigest()
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--root',default=str(ROOT));ap.add_argument('--output',required=True);a=ap.parse_args();root=Path(a.root).resolve();out=Path(a.output).resolve();tmp=out.parent/'p42-dependency-reverify.json';tmp2=out.parent/'p42-bridge-reverify.json';checks={}
 r=subprocess.run([sys.executable,str(root/'scripts/pass42/verify-p42-exact-windows-dependency-closure.py'),'--root',str(root),'--output',str(tmp)],cwd=root,capture_output=True,text=True);checks['dependencyVerifierExit']=r.returncode==0;checks['dependencyReceiptPass']=tmp.exists() and json.load(open(tmp)).get('status')=='PASS'
 r2=subprocess.run([sys.executable,str(root/'scripts/pass42/verify-p42-semantic-dual-build-bridge.py'),'--root',str(root),'--output',str(tmp2)],cwd=root,capture_output=True,text=True);checks['bridgeVerifierExit']=r2.returncode==0;checks['bridgeReceiptPass']=tmp2.exists() and json.load(open(tmp2)).get('status')=='PASS'
 for rel in ['artifacts/closure/p42/source-identity.json','artifacts/closure/p42/P42_STATUS.json','artifacts/closure/p42/CURRENT_AUTHORITY_P42.json','artifacts/closure/p42/VELMERE_CURRENT_STATE_AND_PASS_DELTA_LEDGER_P42_V16_2026-08-14.txt','artifacts/closure/p42/P42_HANDOFF_MANIFEST.json']:
  checks['exists:'+rel]=(root/rel).is_file()
 status='PASS' if all(checks.values()) else 'FAIL';res={'schemaVersion':'velmere.p42.closure-receipts-verification.v1','revision':'P42_V16_EXACT_WINDOWS_DEPENDENCY_CLOSURE_SEMANTIC_DUAL_BUILD_BRIDGE','generatedAt':'2026-08-14T10:28:00.000Z','status':status,'checks':checks,'dependencyVerifierStdoutSha256':hashlib.sha256(r.stdout.encode()).hexdigest(),'bridgeVerifierStdoutSha256':hashlib.sha256(r2.stdout.encode()).hexdigest(),'releaseState':'NO_GO'};res['integritySha256']=hashlib.sha256(json.dumps(res,sort_keys=True,separators=(',',':')).encode()).hexdigest();out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(res,indent=2)+'\n');tmp.unlink(missing_ok=True);tmp2.unlink(missing_ok=True);print(json.dumps({'status':status,'output':str(out)}));return 0 if status=='PASS' else 1
if __name__=='__main__':raise SystemExit(main())
