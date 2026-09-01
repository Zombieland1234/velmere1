#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, json
from pathlib import Path
from typing import Any
ROOT=Path(__file__).resolve().parents[2]
POLICY=ROOT/'config/p42/p42-exact-windows-dependency-closure-policy.json'
ART=ROOT/'artifacts/closure/p42/exact-windows-dependency-closure'
DEFAULT=ROOT/'artifacts/closure/p42/P42_EXACT_WINDOWS_DEPENDENCY_INGEST_VERIFICATION.json'
def sha(p:Path)->str:
 h=hashlib.sha256();
 with p.open('rb') as f:
  for b in iter(lambda:f.read(1024*1024),b''): h.update(b)
 return h.hexdigest()
def can(x:Any)->bytes:return json.dumps(x,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()
def write(p:Path,x:dict):
 x=dict(x); x.pop('integritySha256',None); x['integritySha256']=hashlib.sha256(can(x)).hexdigest(); p.parent.mkdir(parents=True,exist_ok=True); p.write_text(json.dumps(x,indent=2,ensure_ascii=False)+'\n')
def derive(lock):
 g={}; paths=0
 for lp,e in lock.get('packages',{}).items():
  if not lp or not isinstance(e,dict) or not e.get('resolved') or not e.get('integrity'): continue
  paths+=1; key=(e['resolved'],e['integrity']); g.setdefault(key,[]).append(lp)
 return paths,{k:sorted(v) for k,v in g.items()}
def main():
 ap=argparse.ArgumentParser(); ap.add_argument('--root',default=str(ROOT)); ap.add_argument('--output',default=str(DEFAULT)); a=ap.parse_args(); root=Path(a.root).resolve(); out=Path(a.output).resolve()
 policy=json.load(open(root/'config/p42/p42-exact-windows-dependency-closure-policy.json'))
 art=root/'artifacts/closure/p42/exact-windows-dependency-closure'
 receipt=json.load(open(art/'P41_EXACT_WINDOWS_NODE24_DEPENDENCY_CLOSURE_RECEIPT.json'))
 manifest=json.load(open(art/'dependency-cas-manifest.json'))
 derived=json.load(open(art/'derived-dependency-list.json'))
 online=json.load(open(art/'npm-ci-online.json')); offline=json.load(open(art/'npm-ci-offline.json'))
 current_pkg=root/'package.json'; current_lock=root/'package-lock.json'; copied_pkg=art/'package.json'; copied_lock=art/'package-lock.json'
 lock=json.load(open(current_lock)); paths,group=derive(lock)
 rows=manifest.get('rows',[]); rowmap={(r['resolved'],r['integrity']):sorted(r['lockPaths']) for r in rows}
 manifest_core=dict(manifest); claimed=manifest_core.pop('manifestCoreSha256',None)
 # JS insertion-order canonicalization used by producer.
 core_bytes=json.dumps(manifest_core,separators=(',',':'),ensure_ascii=False).encode()
 checks={
  'policyCurrentPackageHash':sha(current_pkg)==policy['currentRoot']['packageJsonSha256'],
  'policyCurrentLockHash':sha(current_lock)==policy['currentRoot']['packageLockSha256'],
  'copiedPackageEqualsCurrent':current_pkg.read_bytes()==copied_pkg.read_bytes(),
  'copiedLockEqualsCurrent':current_lock.read_bytes()==copied_lock.read_bytes(),
  'receiptStatusPass':receipt.get('status')=='PASS',
  'exactWindows':receipt.get('runtime',{}).get('platform')=='win32' and receipt.get('runtime',{}).get('arch')=='x64',
  'exactNode':receipt.get('runtime',{}).get('nodeVersion')=='v24.18.0',
  'exactNpm':receipt.get('runtime',{}).get('npmVersion')=='11.16.0',
  'receiptPayloadHashesCurrent':receipt.get('payloadReceipt',{}).get('packageJsonSha256')==sha(current_pkg) and receipt.get('payloadReceipt',{}).get('packageLockSha256')==sha(current_lock),
  'onlineNpmCiPass':online.get('status')==0 and receipt.get('npmCi',{}).get('online',{}).get('status')==0,
  'offlineNpmCiPass':offline.get('status')==0 and receipt.get('npmCi',{}).get('offlineReplay',{}).get('status')==0,
  'ignoreScriptsHonest':receipt.get('npmCi',{}).get('online',{}).get('ignoreScripts') is True and receipt.get('npmCi',{}).get('offlineReplay',{}).get('ignoreScripts') is True and receipt.get('npmCi',{}).get('lifecycleScriptsExecuted') is False,
  'lockPaths661':paths==661 and receipt.get('dependencyClosure',{}).get('lockPathsWithTarball')==661 and manifest.get('denominator',{}).get('lockPathsWithTarball')==661,
  'uniqueTarballs618':len(group)==618 and len(rows)==618 and receipt.get('dependencyClosure',{}).get('uniqueTarballs')==618,
  'allTarballsDownloaded':receipt.get('dependencyClosure',{}).get('downloadedUniqueTarballs')==618 and manifest.get('denominator',{}).get('downloadedUniqueTarballs')==618,
  'allPathsCovered':receipt.get('dependencyClosure',{}).get('coveredLockPaths')==661 and manifest.get('denominator',{}).get('coveredLockPaths')==661,
  'zeroFailures':receipt.get('dependencyClosure',{}).get('failedUniqueTarballs')==0 and not manifest.get('failures'),
  'manifestTopologyMatchesLock':rowmap==group,
  'verifiedIntegrityEqualsExpected':all(r.get('verifiedIntegrity')==r.get('integrity') for r in rows),
  'contentAddressedNames':all(r.get('casFile')==f"cas/{r.get('sha256')}.tgz" for r in rows),
  'positiveByteLengths':all(isinstance(r.get('byteLength'),int) and r['byteLength']>0 for r in rows),
  'manifestCoreHash':claimed==hashlib.sha256(core_bytes).hexdigest()==receipt.get('dependencyClosure',{}).get('manifestCoreSha256'),
  'derivedTopology':derived.get('lockPathsWithTarball')==661 and derived.get('uniqueTarballs')==618 and len(derived.get('rows',[]))==618,
 }
 status='PASS' if all(checks.values()) else 'FAIL'
 result={'schemaVersion':'velmere.p42.exact-windows-dependency-ingest-verification.v1','revision':'P42_V16_EXACT_WINDOWS_DEPENDENCY_CLOSURE_SEMANTIC_DUAL_BUILD_BRIDGE','generatedAt':'2026-08-14T10:24:00.000Z','status':status,'classification':'EXACT_WINDOWS_CURRENT_PACKAGE_LOCK_DEPENDENCY_GRAPH_AND_OFFLINE_INSTALL_CLOSURE_BOUND' if status=='PASS' else 'INGEST_VERIFICATION_FAIL','checks':checks,'denominator':{'lockPaths':paths,'uniqueTarballs':len(group),'manifestRows':len(rows),'failures':len(manifest.get('failures',[]))},'hashes':{'packageJson':sha(current_pkg),'packageLock':sha(current_lock),'nativeReceipt':sha(art/'P41_EXACT_WINDOWS_NODE24_DEPENDENCY_CLOSURE_RECEIPT.json'),'manifest':sha(art/'dependency-cas-manifest.json'),'derived':sha(art/'derived-dependency-list.json')},'credit':{'exactWindowsToolchain':status=='PASS','dependencyGraphClosure':status=='PASS','onlineOfflineNpmCiIgnoreScripts':status=='PASS','sriVerificationProducerReceipt':status=='PASS','localTarballByteReplay':False,'lifecycleScripts':False,'currentRootApplicationBuild':False},'truthBoundary':'All native receipt, manifest, current package/lock and denominator relationships are independently checked. Tarball bytes were not included in the artifact, so local second-party SRI replay is not claimed; the upstream exact-Windows producer receipt records 618/618 SRI verification.'}
 write(out,result)
 print(json.dumps({'status':status,'lockPaths':paths,'uniqueTarballs':len(group),'output':str(out)}))
 return 0 if status=='PASS' else 1
if __name__=='__main__': raise SystemExit(main())
