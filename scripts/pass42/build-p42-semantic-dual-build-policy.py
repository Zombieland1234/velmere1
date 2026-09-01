#!/usr/bin/env python3
"""Build deterministic fail-closed P42 exact-Windows semantic/dual-build policy."""
from __future__ import annotations
import argparse, hashlib, json
from pathlib import Path
from typing import Any
ROOT=Path(__file__).resolve().parents[2]
GENERATED_AT='2026-08-14T11:25:00.000Z'
REVISION='P42_V16_EXACT_WINDOWS_CURRENT_ROOT_SEMANTIC_DUAL_BUILD_V2'
def sha(p:Path)->str:
 h=hashlib.sha256()
 with p.open('rb') as f:
  for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
 return h.hexdigest()
def bind(root:Path,rel:str)->dict[str,Any]:
 p=root/rel;return {'path':rel,'sha256':sha(p),'byteLength':p.stat().st_size}
def canonical(v:Any)->str:return hashlib.sha256(json.dumps(v,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()
def main()->int:
 ap=argparse.ArgumentParser();ap.add_argument('--root',type=Path,default=ROOT);ap.add_argument('--output',type=Path,default=Path('config/p42/p42-exact-windows-semantic-dual-build-policy.json'));a=ap.parse_args();root=a.root.resolve();out=a.output if a.output.is_absolute() else root/a.output
 policy={
  'schemaVersion':'velmere.p42.exact-windows-semantic-dual-build-policy.v2','revision':REVISION,'generatedAt':GENERATED_AT,'parentRoot':'R44P46','checkpoint':'P42',
  'authoritySha256':'67816a5a9238668c8080a3a8cc623f078d268c1b78fddf534cb4893bb45490e9',
  'exactTarget':{'os':'windows-2025','platform':'win32','arch':'x64','node':'v24.18.0','npm':'11.16.0'},
  'currentRootBindings':{
   'packageJson':bind(root,'package.json'),'packageLock':bind(root,'package-lock.json'),
   'authority':bind(root,'docs/authority/VELMERE_CANONICAL_OWNER_DIRECTIVE_V16_FULL_TOPOLOGY_FREE_LEGAL_CURRENT_WORLD_CLASS_2026-08-14.txt'),
   'lifecyclePolicy':bind(root,'config/p42/p42-lifecycle-quarantine-policy.json'),
   'lifecycleAllowlist':bind(root,'config/p42/p42-lifecycle-execution-allowlist.json'),
   'actionPins':bind(root,'config/p42/p42-github-action-pins.json'),
   'workflow':bind(root,'.github/workflows/p42-exact-windows-semantic-dual-build.yml'),
   'runner':bind(root,'scripts/pass42/run-p42-exact-windows-semantic-dual-build.mjs'),
   'nativeProbe':bind(root,'scripts/pass42/verify-p42-native-platform-availability.mjs'),
   'lifecycleVerifier':bind(root,'scripts/pass42/verify-p42-lifecycle-quarantine.py'),
   'policyBuilder':bind(root,'scripts/pass42/build-p42-semantic-dual-build-policy.py'),
  },
  'commands':{
   'lifecycleQuarantine':['python','scripts/pass42/verify-p42-lifecycle-quarantine.py','--root','.','--output','p42-out/P42_EXACT_WINDOWS_LIFECYCLE_QUARANTINE_RECEIPT.json','--require-windows'],
   'npmCi':['npm','ci','--ignore-scripts','--audit=false','--fund=false','--prefer-online','--loglevel=notice'],
   'npmLs':['npm','ls','--all','--json'],
   'nativeProbe':['node','scripts/pass42/verify-p42-native-platform-availability.mjs','--output','p42-out/P42_NATIVE_PLATFORM_AVAILABILITY.json'],
   'typecheck':['npm','run','typecheck'],
   'lint':['npm','run','lint'],
   'webpack':['npm','run','build:webpack'],
   'turbopack':['npm','run','build:turbopack'],
  },
  'forbiddenCommands':['npm run install:trusted-native','npm rebuild','npm ci without --ignore-scripts'],
  'gates':{
   'dependencyLifecycleExecutionAllowed':False,'lifecycleQuarantinePassRequired':True,'npmCiIgnoreScriptsRequired':True,
   'nativePlatformProbePassRequired':True,'typecheckLintDualBuildAllowedOnlyAfterPriorGates':True,
  },
  'creditBoundary':{
   'selfTest':'BRIDGE_CONTRACT_ONLY','normalPass':'EXACT_WINDOWS_CURRENT_ROOT_SEMANTIC_DUAL_BUILD_ONLY',
   'browser':False,'pdf':False,'rights':False,'sale':False,'goInternal':False,'goPaid':False,'live':False,'worldClass':False,
  },
 }
 policy['integritySha256']=canonical(policy)
 out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(policy,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
 print(json.dumps({'status':'PASS','output':str(out),'integritySha256':policy['integritySha256']},indent=2));return 0
if __name__=='__main__':raise SystemExit(main())
