#!/usr/bin/env python3
"""Build P87R1 exact source, product projection, test, history and checkpoint receipts."""
from __future__ import annotations

import hashlib
import json
import platform
import re
import shutil
import subprocess
from collections import Counter
from pathlib import Path
from typing import Any

ROOT=Path(__file__).resolve().parents[2]
PARENT=Path('/mnt/data/velmere_p87_work/base')
OUT=ROOT/'artifacts/closure/p87r1'
GENERATED_AT='2026-08-20T12:45:00.000Z'
IDENTITY_REL='artifacts/closure/p87r1/P87R1_TREE_IDENTITY_EXCLUDING_SELF.json'
DIRECTIVE='VELMERE_CANONICAL_OWNER_DIRECTIVE_V17_TRUE_TOPOLOGY_AUTOMATED_ADVANCED_CURRENT_WORLD_CLASS_2026-08-17.txt'
DIRECTIVE_SHA='de7fbd6df651a7a8a8f85054c6e9ac3c2ca530ebfb0d4ccd335dcb99fb658f05'
PARENT_LEDGER_SHA='d4eb25c70cb75c57398585295142798499ed4428b3d463438f4d8d51e0edb85b'
PARENT_ZIP_SHA='2640f3945fd58abd5ff314912e503f912152153f5adcff6c7e3bbf0cfe830455'
PRODUCT_CHANGES=[
 'lib/market-integrity/customer-report-exact-pdf-token.ts',
 'lib/market-integrity/real-markets-paid-account-artifact.ts',
 'lib/server/market-integrity-route-modules/report-pdf.ts',
 'lib/server/market-integrity-route-modules/report.ts',
]
PRIVATE_KEY_RE=re.compile(rb'-----BEGIN (?:(?:RSA|EC|OPENSSH) )?PRIVATE KEY-----\r?\n(?:[A-Za-z0-9+/=]{16,}\r?\n){2,}-----END (?:(?:RSA|EC|OPENSSH) )?PRIVATE KEY-----')
TOKEN_PATTERNS={
 'aws_access_key_id':re.compile(rb'AKIA[0-9A-Z]{16}'),
 'stripe_live_secret':re.compile(rb'sk_live_[A-Za-z0-9]{16,}'),
 'stripe_webhook_secret':re.compile(rb'whsec_[A-Za-z0-9]{16,}'),
 'github_fine_grained_pat':re.compile(rb'github_pat_[A-Za-z0-9_]{20,}'),
 'github_classic_pat':re.compile(rb'ghp_[A-Za-z0-9]{30,}'),
 'openai_api_key':re.compile(rb'(?<![A-Za-z0-9_-])sk-(?:proj-)?[A-Za-z0-9_-]{24,}'),
 'google_api_key':re.compile(rb'AIza[0-9A-Za-z_-]{30,}'),
}

def sha(path:Path)->str:
 h=hashlib.sha256()
 with path.open('rb') as f:
  for chunk in iter(lambda:f.read(4*1024*1024),b''): h.update(chunk)
 return h.hexdigest()

def write(path:Path,payload:Any):
 path.parent.mkdir(parents=True,exist_ok=True)
 path.write_text(json.dumps(payload,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')

def load(path:Path): return json.loads(path.read_text(encoding='utf-8'))

def row(root:Path,rel:str):
 p=root/rel
 if not p.is_file(): raise RuntimeError(f'missing:{rel}')
 return {'path':rel,'byteLength':p.stat().st_size,'sha256':sha(p)}

def projection(rows:list[dict[str,Any]]):
 ordered=sorted(rows,key=lambda x:x['path'])
 path_hash=hashlib.sha256('\n'.join(x['path'] for x in ordered).encode()).hexdigest()
 aggregate=hashlib.sha256()
 for x in ordered: aggregate.update(f"{x['path']}\0{x['byteLength']}\0{x['sha256']}\n".encode())
 return {'fileCount':len(ordered),'payloadBytes':sum(x['byteLength'] for x in ordered),'pathSetSha256':path_hash,'sourceContentAggregateSha256':aggregate.hexdigest()}

def all_rows(root:Path,exclude_identity:bool=False):
 rows=[]
 for p in sorted((x for x in root.rglob('*') if x.is_file()),key=lambda x:x.relative_to(root).as_posix()):
  rel=p.relative_to(root).as_posix()
  if exclude_identity and rel==IDENTITY_REL: continue
  if p.is_symlink(): raise RuntimeError(f'symlink_not_allowed:{rel}')
  if rel.endswith('.pyc') or '/__pycache__/' in f'/{rel}/': raise RuntimeError(f'python_cache_not_allowed:{rel}')
  rows.append(row(root,rel))
 return rows

def classify(rel:str):
 if rel=='VELMERE_ACTIVE_PASS.txt': return 'CONTROL_PLANE_POINTER'
 if rel in PRODUCT_CHANGES: return 'CURRENT_PRODUCT_BUILD_RELEVANT'
 if rel.startswith('receipts/p87/'): return 'P87_CURRENT_RECEIPT'
 if rel.startswith('artifacts/p87/'): return 'P87_LOCAL_PROOF_OR_LOG'
 if rel.startswith('scripts/p87/'): return 'P87_HARNESS_OR_CLOSURE_SOURCE'
 return 'CURRENT_SOURCE_SUPPORT'

def build_source_change_manifest():
 def fmap(base:Path):
  result={}
  for p in base.rglob('*'):
   if not p.is_file(): continue
   rel=p.relative_to(base).as_posix()
   if rel.startswith('artifacts/closure/p87r1/'): continue
   result[rel]=p
  return result
 before=fmap(PARENT); after=fmap(ROOT); changes=[]
 for rel in sorted(set(before)|set(after)):
  a=before.get(rel); b=after.get(rel)
  if a and b and a.stat().st_size==b.stat().st_size and a.read_bytes()==b.read_bytes(): continue
  changes.append({
   'path':rel,
   'change':'ADDED' if a is None else 'DELETED' if b is None else 'MODIFIED',
   'classification':classify(rel),
   'beforeBytes':a.stat().st_size if a else None,
   'beforeSha256':sha(a) if a else None,
   'afterBytes':b.stat().st_size if b else None,
   'afterSha256':sha(b) if b else None,
  })
 counts=Counter(x['classification'] for x in changes)
 payload={
  'schemaVersion':'velmere.p87r1.source-change-manifest.v1','generatedAt':GENERATED_AT,'status':'PASS_EXACT_PARENT_DELTA',
  'parentCheckpoint':'P86R1','parentLedgerSha256':PARENT_LEDGER_SHA,'parentSourceOnlySha256':PARENT_ZIP_SHA,
  'scopeExcludes':['artifacts/closure/p87r1/* self-generated closure receipts'],
  'changeCount':len(changes),'classificationCounts':dict(sorted(counts.items())),'changes':changes,
  'buildRelevantChangedFiles':PRODUCT_CHANGES,'databaseClosureCriticalChangedFiles':[],
  'directiveChanged':False,'masterDirectiveBindingChanged':False,
  'truthBoundary':'Exact filesystem delta from P86R1 outside self-generated P87 closure. A changed file is not deployment, rights, value or FINAL proof.',
 }
 write(OUT/'P87R1_SOURCE_CHANGE_MANIFEST.json',payload); return payload

def build_product_projection():
 parent=load(ROOT/'artifacts/closure/p86r1/P86R1_CURRENT_PRODUCT_PROJECTION_MANIFEST.json')
 rows=[dict(x) for x in parent['files']]; declared=parent['currentCandidateProjection']
 if projection(rows)!=declared: raise RuntimeError('p86_product_projection_identity_mismatch')
 mapped={x['path']:x for x in rows}; changed=[]
 for rel in PRODUCT_CHANGES:
  old=mapped.get(rel); new=row(ROOT,rel); mapped[rel]=new
  changed.append({'path':rel,'change':'ADDED' if old is None else 'MODIFIED','beforeBytes':old and old['byteLength'],'beforeSha256':old and old['sha256'],'afterBytes':new['byteLength'],'afterSha256':new['sha256']})
 current_rows=sorted(mapped.values(),key=lambda x:x['path']); current=projection(current_rows)
 payload={
  'schemaVersion':'velmere.p87r1.current-product-projection-manifest.v1','generatedAt':GENERATED_AT,
  'status':'PASS_LOCAL_DETERMINISTIC_SOURCE_IDENTITY_ONLY','parentCheckpoint':'P86R1','parentProjectionReconstructedExactly':True,
  'parentProjection':declared,'currentCandidateProjection':current,
  'delta':{'fileCount':current['fileCount']-declared['fileCount'],'payloadBytes':current['payloadBytes']-declared['payloadBytes'],'changedBuildRelevantFiles':len(changed)},
  'changedBuildRelevantFiles':changed,'databaseDeploymentBoundary':{'newMigrationInP87':False,'authorizedDatabaseExecution':'WITHHELD'},
  'files':current_rows,'exactWindowsCredit':False,
  'truthBoundary':'P87 updates the exact P86 product projection with one new and three modified Real Markets/customer-PDF modules. This is local source identity only.',
 }
 write(OUT/'P87R1_CURRENT_PRODUCT_PROJECTION_MANIFEST.json',payload); return payload

def build_history_receipt():
 mism=[]; verified=0
 for base_name in ('receipts','artifacts'):
  for src in (PARENT/base_name).rglob('*'):
   if not src.is_file(): continue
   verified+=1; rel=src.relative_to(PARENT); dst=ROOT/rel
   if not dst.is_file() or src.stat().st_size!=dst.stat().st_size or sha(src)!=sha(dst):
    mism.append({'path':rel.as_posix(),'expectedSha256':sha(src),'actualSha256':sha(dst) if dst.is_file() else None})
 if mism: raise RuntimeError(f'historical_mutation:{mism[:5]}')
 payload={'schemaVersion':'velmere.p87r1.historical-receipt-artifact-immutability.v1','generatedAt':GENERATED_AT,'status':'PASS','parentCheckpoint':'P86R1','verifiedHistoricalFiles':verified,'mismatchCount':0,'mismatches':[],'scope':['all P86-parent receipts','all P86-parent artifacts'],'truthBoundary':'All parent receipt/artifact bytes remain exact. Current evidence is written only under P87 paths; historical harness output is restored after execution.'}
 write(OUT/'P87R1_HISTORICAL_RECEIPT_IMMUTABILITY.json',payload); return payload

def build_tests():
 summary=load(ROOT/'receipts/p87/P87_CURRENT_SOURCE_REGRESSION_SUMMARY.json')
 if summary.get('status')!='PASS' or summary.get('aggregate')!={'passed':1248,'total':1248,'failedLanes':0}: raise RuntimeError('p87_regression_summary_not_green')
 controls=[]
 for lane in summary['lanes']:
  p=ROOT/lane['evidence']
  if lane['status']!='PASS' or lane['passed']!=lane['total'] or not p.is_file(): raise RuntimeError(f'invalid_test_lane:{lane}')
  controls.append({'label':lane['name'],'path':lane['evidence'],'sha256':sha(p),'checks':lane['total'],'passed':True,'status':'PASS'})
 payload={'schemaVersion':'velmere.p87r1.current-source-test-aggregate.v1','generatedAt':GENERATED_AT,'status':'PASS','controls':controls,'aggregateExecutedChecksAcrossOverlappingHarnesses':1248,'aggregateIndependentEvidenceClaim':False,'commands':summary['commandExecution'],'supersededHistoricalHarnesses':summary['supersededHistoricalHarnesses'],'zeroFakeCredit':summary['finalCredit'],'truthBoundary':summary['countingBoundary']}
 write(OUT/'P87R1_TEST_AGGREGATE.json',payload); return payload

def build_secret_scan():
 paths=[]
 for rel in PRODUCT_CHANGES:
  paths.append(ROOT/rel)
 for base in (ROOT/'scripts/p87',ROOT/'receipts/p87'):
  paths += [p for p in base.rglob('*') if p.is_file()]
 findings=[]
 for p in sorted(set(paths)):
  data=p.read_bytes()
  m=PRIVATE_KEY_RE.search(data)
  if m: findings.append({'path':p.relative_to(ROOT).as_posix(),'pattern':'private_key_block','offset':m.start()})
  for name,pattern in TOKEN_PATTERNS.items():
   for match in pattern.finditer(data): findings.append({'path':p.relative_to(ROOT).as_posix(),'pattern':name,'offset':match.start()})
 if findings: raise RuntimeError(f'secret_findings:{findings[:10]}')
 payload={'schemaVersion':'velmere.p87r1.targeted-secret-scan.v1','generatedAt':GENERATED_AT,'status':'PASS','filesScanned':len(set(paths)),'matches':0,'findings':[],'patterns':sorted(['private_key_block',*TOKEN_PATTERNS]),'truthBoundary':'Targeted current-delta scan. Final deterministic packaging separately scans the complete tree.'}
 write(OUT/'P87R1_TARGETED_SECRET_SCAN.json',payload); return payload

def build_typescript_diagnostic():
 ts=ROOT/'artifacts/p87/logs/P87_TARGETED_STRICT_TYPESCRIPT.log'; imports=ROOT/'artifacts/p87/logs/P87_CHANGED_MODULE_IMPORTS.log'
 if 'PASS targeted strict TypeScript 5.8.3' not in ts.read_text(): raise RuntimeError('targeted_typescript_not_green')
 if 'PASS (3/3)' not in imports.read_text(): raise RuntimeError('module_imports_not_green')
 report_import='WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING_ZOD'
 payload={'schemaVersion':'velmere.p87r1.local-typescript-diagnostic.v1','generatedAt':GENERATED_AT,'status':'PASS_TARGETED_AND_3_MODULE_IMPORTS_WITHHELD_FULL_PROJECT','targetedStrictTypeScript':{'status':'PASS','scope':['lib/market-integrity/customer-report-exact-pdf-token.ts'],'command':'tsc --noEmit --target ES2022 --lib ES2022,DOM --module ESNext --moduleResolution Bundler --skipLibCheck --strict --noResolve scripts/p87/p87-targeted-types.d.ts lib/market-integrity/customer-report-exact-pdf-token.ts','logSha256':sha(ts)},'currentRuntimeModuleImports':{'status':'PASS','moduleCount':3,'modules':PRODUCT_CHANGES[:3],'logSha256':sha(imports)},'directReportRouteImport':report_import,'environment':{'node':subprocess.check_output(['node','--version'],text=True).strip(),'npm':subprocess.check_output(['npm','--version'],text=True).strip(),'tsc':subprocess.check_output(['tsc','--version'],text=True).strip().replace('Version ',''),'platform':f'{platform.system().lower()} {platform.machine()}'},'fullProjectSemanticTypeScript':'WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING','eslint':'WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING','dualProductionBuild':'WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING','exactWindows':'WITHHELD_ON_CURRENT_P87R1_BYTES','truthBoundary':'Targeted token TypeScript and three direct runtime imports pass. The report route import is blocked by the absent repository dependency graph (zod); this is not whole-project type/lint/build or exact-Windows proof.'}
 write(OUT/'P87R1_LOCAL_TYPESCRIPT_DIAGNOSTIC.json',payload); return payload

def build_authority():
 directive=ROOT/DIRECTIVE
 if directive.stat().st_size!=66416 or sha(directive)!=DIRECTIVE_SHA: raise RuntimeError('directive_identity_mismatch')
 binding=ROOT/'receipts/p86/P86_MASTER_DIRECTIVE_V2_OWNER_AUTHORITY_BINDING.json'
 parent_binding=PARENT/'receipts/p86/P86_MASTER_DIRECTIVE_V2_OWNER_AUTHORITY_BINDING.json'
 if binding.read_bytes()!=parent_binding.read_bytes(): raise RuntimeError('master_directive_binding_changed')
 payload={'schemaVersion':'velmere.p87r1.authority-continuity.v1','generatedAt':GENERATED_AT,'status':'PASS','latestExplicitOwnerExecutionAuthority':'VELMÈRE — ULTIMATE WORLD-CLASS CONTINUOUS CLOSURE / FINAL CANDIDATE MASTER DIRECTIVE V2','bindingReceipt':'receipts/p86/P86_MASTER_DIRECTIVE_V2_OWNER_AUTHORITY_BINDING.json','bindingReceiptSha256':sha(binding),'canonicalTopologyDirective':DIRECTIVE,'canonicalTopologyDirectiveSha256':DIRECTIVE_SHA,'productTopology':{'families':10,'customerRows':20,'executionProfiles':20,'materialPaidTransitions':10},'currentActivePass':'P87R1','historyRewritten':False,'truthBoundary':'Master V2 execution authority and V17 topology authority remain separate and unchanged. The unseen/truncated tail of the owner message is not invented.'}
 write(OUT/'P87R1_AUTHORITY_CONTINUITY.json',payload); return payload

def build_checkpoint(source,product,history,tests,secrets,typescript,authority):
 runtime=load(ROOT/'receipts/p87/P87_REAL_MARKETS_EXACT_PDF_RUNTIME.json')
 payload={'schemaVersion':'velmere.p87r1.checkpoint-receipt.v1','generatedAt':GENERATED_AT,'status':'PASS_BOUNDED_P87R1_REAL_MARKETS_EXACT_IMMUTABLE_PDF','classification':'DEFENSIVE_LOCAL_RENDER_ONCE_STORE_FIRST_EXACT_BLOB_DELIVERY','parentCheckpoint':'P86R1','authority':authority,'physicalChanges':{'buildRelevantFiles':PRODUCT_CHANGES,'exactPaidTokenContainsPayload':False,'exactPaidTokenContainsPdfBytes':False,'renderOnceBeforeStore':True,'tokenAuthorityIssuedAfterPersistence':True,'paidDownloadUsesStoredBlob':True,'legacyPaidV1RejectedBeforeRerender':True,'legacyBasicDynamicCompatibilityExplicitlyNotFinal':True,'historicalReceiptsByteIdentical':True},'localDefensiveProof':{'runtimeStatus':runtime['status'],'runtimeChecks':runtime['checks']['total'],'runtimeRepeatability':'PASS_2_OF_2_BYTE_IDENTICAL','staticChecks':100,'compatibilityChecks':21,'aggregateExecutedChecksAcrossOverlappingHarnesses':1248,'aggregateIndependenceClaim':False},'sourceChangeManifest':'artifacts/closure/p87r1/P87R1_SOURCE_CHANGE_MANIFEST.json','productProjection':'artifacts/closure/p87r1/P87R1_CURRENT_PRODUCT_PROJECTION_MANIFEST.json','historyReceipt':'artifacts/closure/p87r1/P87R1_HISTORICAL_RECEIPT_IMMUTABILITY.json','testAggregate':'artifacts/closure/p87r1/P87R1_TEST_AGGREGATE.json','targetedSecretScan':'artifacts/closure/p87r1/P87R1_TARGETED_SECRET_SCAN.json','typescriptDiagnostic':'artifacts/closure/p87r1/P87R1_LOCAL_TYPESCRIPT_DIAGNOSTIC.json','securityBoundary':{'externalTransactionSent':False,'externalStateChanged':False,'liveExploitPerformed':False,'weaponizedPocCreated':False,'authorizationBypassAttempted':False,'externalSystemScanned':False,'rawProviderPayloadRedistributed':False},'zeroFakeCredit':{'customerFinal':'0/20','auditFinalPdf':'0/3','rights':'2/203 inherited only','paidValue':'0/10','saleEligible':'0/20','live':False,'global':'NO_GO / STOP_SELL'},'withheld':['authorized database and deployed HTTP execution','real owner JWT/RLS','current rights-bound market provider evidence','real tier-value/customer proof','whole-project type/lint/build','exact Windows'], 'nextBlocker':'Audit the remaining customer PDF routes. The next known candidate is security/audit-watch/pro-pdf, which may still reconstruct output during download instead of serving a canonical immutable account blob. Repair only if confirmed on current source.'}
 write(OUT/'P87R1_CHECKPOINT_RECEIPT.json',payload); return payload

def build_identity():
 rows=all_rows(ROOT,exclude_identity=True); ident=projection(rows)
 payload={'schemaVersion':'velmere.p87r1.tree-identity-excluding-self.v1','generatedAt':GENERATED_AT,'status':'PASS','excludedOnly':IDENTITY_REL,**ident,'fullPackageFileCountIncludingThisIdentityFile':ident['fileCount']+1,'truthBoundary':'Canonical identity of every current SOURCE_ONLY file except this self-referential identity receipt. Final ZIP bytes are bound separately by deterministic package verification.'}
 write(OUT/'P87R1_TREE_IDENTITY_EXCLUDING_SELF.json',payload); return payload

def main():
 if (ROOT/'VELMERE_ACTIVE_PASS.txt').read_text().strip()!='P87R1': raise RuntimeError('active_pass_not_p87r1')
 OUT.mkdir(parents=True,exist_ok=True)
 source=build_source_change_manifest(); product=build_product_projection(); history=build_history_receipt(); tests=build_tests(); secrets=build_secret_scan(); typescript=build_typescript_diagnostic(); authority=build_authority(); checkpoint=build_checkpoint(source,product,history,tests,secrets,typescript,authority); identity=build_identity()
 print(json.dumps({'status':'PASS','sourceChanges':source['changeCount'],'productProjection':product['currentCandidateProjection'],'historicalVerified':history['verifiedHistoricalFiles'],'tests':tests['aggregateExecutedChecksAcrossOverlappingHarnesses'],'identity':identity},indent=2))

if __name__=='__main__': main()
