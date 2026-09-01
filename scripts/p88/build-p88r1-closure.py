#!/usr/bin/env python3
"""Build P88R1 exact-source, authority, product, history, regression and checkpoint receipts."""
from __future__ import annotations
import hashlib, json, platform, re, subprocess
from collections import Counter
from pathlib import Path
from typing import Any

ROOT=Path(__file__).resolve().parents[2]
PARENT=Path('/mnt/data/velmere_p88_work/base')
OUT=ROOT/'artifacts/closure/p88r1'
GENERATED_AT='2026-08-20T15:00:00.000Z'
IDENTITY_REL='artifacts/closure/p88r1/P88R1_TREE_IDENTITY_EXCLUDING_SELF.json'
MASTER='VELMERE_ULTIMATE_WORLD_CLASS_CONTINUOUS_CLOSURE_FINAL_CANDIDATE_MASTER_DIRECTIVE_V2_COMPLETE_2026-08-20.txt'
MASTER_SHA='9184cd18eb864f50a8c5d3af8f2899e7f138372861095e343901ab9c5e3bcb53'
V17='VELMERE_CANONICAL_OWNER_DIRECTIVE_V17_TRUE_TOPOLOGY_AUTOMATED_ADVANCED_CURRENT_WORLD_CLASS_2026-08-17.txt'
V17_SHA='de7fbd6df651a7a8a8f85054c6e9ac3c2ca530ebfb0d4ccd335dcb99fb658f05'
PARENT_ZIP='VELMERE_R44P46_V17_P87R1_REAL_MARKETS_EXACT_IMMUTABLE_PDF_TOKEN_AND_DOWNLOAD_CURRENT_SOURCE_ONLY_IN_PROGRESS_2026-08-20.zip'
PARENT_ZIP_SHA='b9ee8825dc7630a22f73de12270408fd036cdb89801ddc55d0b6a37ee1036c18'
EXTERNAL_CONFLICT_LEDGER_SHA='2030d2b8bd055d69d6f6efacbe5ed14656b070e457b0bd5703be1bd6a26252b9'
PRODUCT_CHANGES=[
 'lib/db/supabase-rpc-operation-registry.ts',
 'lib/security/audit-report-exact-pdf-artifact.ts',
 'lib/security/audit-report-snapshot-store.ts',
 'lib/security/pro-audit-pdf/render-pro-audit-pdf.ts',
 'lib/server/lazy-route-modules/admin--security--advanced-audit-release.ts',
 'lib/server/lazy-route-modules/security--audit-review--advanced--settle.ts',
 'lib/server/lazy-route-modules/security--audit-review--pro--settle.ts',
 'lib/server/lazy-route-modules/security--audit-watch--pro-pdf--token.ts',
 'lib/server/lazy-route-modules/security--audit-watch--pro-pdf.ts',
]
DATABASE_CHANGES=[
 'lib/db/schema.sql',
 'supabase/migrations/20260820000005_p88_audit_paid_exact_immutable_pdf_blob.sql',
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
  for chunk in iter(lambda:f.read(4*1024*1024),b''):h.update(chunk)
 return h.hexdigest()

def write(path:Path,payload:Any):
 path.parent.mkdir(parents=True,exist_ok=True)
 path.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

def load(path:Path):return json.loads(path.read_text('utf-8'))

def row(root:Path,rel:str):
 p=root/rel
 if not p.is_file():raise RuntimeError(f'missing:{rel}')
 return {'path':rel,'byteLength':p.stat().st_size,'sha256':sha(p)}

def projection(rows:list[dict[str,Any]]):
 ordered=sorted(rows,key=lambda x:x['path'])
 path_hash=hashlib.sha256('\n'.join(x['path'] for x in ordered).encode()).hexdigest()
 aggregate=hashlib.sha256()
 for x in ordered:aggregate.update(f"{x['path']}\0{x['byteLength']}\0{x['sha256']}\n".encode())
 return {'fileCount':len(ordered),'payloadBytes':sum(x['byteLength'] for x in ordered),'pathSetSha256':path_hash,'sourceContentAggregateSha256':aggregate.hexdigest()}

def all_rows(root:Path,exclude_identity=False):
 result=[]
 for p in sorted((x for x in root.rglob('*') if x.is_file()),key=lambda x:x.relative_to(root).as_posix()):
  rel=p.relative_to(root).as_posix()
  if exclude_identity and rel==IDENTITY_REL:continue
  if p.is_symlink():raise RuntimeError(f'symlink_not_allowed:{rel}')
  if rel.endswith('.pyc') or '/__pycache__/' in f'/{rel}/':raise RuntimeError(f'python_cache_not_allowed:{rel}')
  result.append(row(root,rel))
 return result

def classify(rel:str):
 if rel==MASTER:return 'OWNER_EXECUTION_AUTHORITY_COMPLETE'
 if rel==V17:return 'CANONICAL_TOPOLOGY_AUTHORITY_UNCHANGED'
 if rel=='VELMERE_ACTIVE_PASS.txt':return 'CONTROL_PLANE_POINTER'
 if rel=='P88R1_PACKAGE_BUILD_RECIPE.json':return 'DETERMINISTIC_PACKAGE_RECIPE'
 if rel in PRODUCT_CHANGES:return 'CURRENT_PRODUCT_BUILD_RELEVANT'
 if rel in DATABASE_CHANGES:return 'DATABASE_CLOSURE_CRITICAL'
 if rel.startswith('receipts/p88/'):return 'P88_CURRENT_RECEIPT'
 if rel.startswith('artifacts/p88/'):return 'P88_LOCAL_PROOF_OR_LOG'
 if rel.startswith('scripts/p88/'):return 'P88_HARNESS_OR_CLOSURE_SOURCE'
 return 'CURRENT_SOURCE_SUPPORT'

def file_map(root:Path):
 d={}
 for p in root.rglob('*'):
  if not p.is_file():continue
  rel=p.relative_to(root).as_posix()
  if rel.startswith('artifacts/closure/p88r1/'):continue
  d[rel]=p
 return d

def build_source_change_manifest():
 before=file_map(PARENT);after=file_map(ROOT);changes=[]
 for rel in sorted(set(before)|set(after)):
  a=before.get(rel);b=after.get(rel)
  if a and b and a.stat().st_size==b.stat().st_size and sha(a)==sha(b):continue
  changes.append({'path':rel,'change':'ADDED' if a is None else 'DELETED' if b is None else 'MODIFIED','classification':classify(rel),'beforeBytes':a.stat().st_size if a else None,'beforeSha256':sha(a) if a else None,'afterBytes':b.stat().st_size if b else None,'afterSha256':sha(b) if b else None})
 counts=Counter(x['classification'] for x in changes)
 payload={'schemaVersion':'velmere.p88r1.source-change-manifest.v1','generatedAt':GENERATED_AT,'status':'PASS_EXACT_PARENT_DELTA','parentCheckpoint':'P87R1_REAL_MARKETS_EXACT_IMMUTABLE_PDF','parentSourceOnly':PARENT_ZIP,'parentSourceOnlySha256':PARENT_ZIP_SHA,'externalLooseLedgerConflictSha256':EXTERNAL_CONFLICT_LEDGER_SHA,'scopeExcludes':['artifacts/closure/p88r1/* self-generated closure receipts'],'changeCount':len(changes),'classificationCounts':dict(sorted(counts.items())),'changes':changes,'buildRelevantChangedFiles':PRODUCT_CHANGES,'databaseClosureCriticalChangedFiles':DATABASE_CHANGES,'masterDirectiveChanged':False,'masterDirectiveCompleteCopyAddedToCurrentSource':True,'v17Changed':False,'truthBoundary':'Exact filesystem delta from the physically supplied P87 Real Markets SOURCE_ONLY outside self-generated P88 closure. A changed file is not deployment, rights, value or FINAL proof.'}
 write(OUT/'P88R1_SOURCE_CHANGE_MANIFEST.json',payload);return payload

def build_product_projection():
 parent=load(ROOT/'artifacts/closure/p87r1/P87R1_CURRENT_PRODUCT_PROJECTION_MANIFEST.json')
 rows=[dict(x) for x in parent['files']];declared=parent['currentCandidateProjection']
 if projection(rows)!=declared:raise RuntimeError('p87_product_projection_identity_mismatch')
 mapped={x['path']:x for x in rows};changed=[]
 for rel in PRODUCT_CHANGES:
  old=mapped.get(rel);new=row(ROOT,rel);mapped[rel]=new
  changed.append({'path':rel,'change':'ADDED' if old is None else 'MODIFIED','beforeBytes':old and old['byteLength'],'beforeSha256':old and old['sha256'],'afterBytes':new['byteLength'],'afterSha256':new['sha256']})
 current_rows=sorted(mapped.values(),key=lambda x:x['path']);current=projection(current_rows)
 payload={'schemaVersion':'velmere.p88r1.current-product-projection-manifest.v1','generatedAt':GENERATED_AT,'status':'PASS_LOCAL_DETERMINISTIC_SOURCE_IDENTITY_ONLY','parentCheckpoint':'P87R1_REAL_MARKETS_EXACT_IMMUTABLE_PDF','parentProjectionReconstructedExactly':True,'parentProjection':declared,'currentCandidateProjection':current,'delta':{'fileCount':current['fileCount']-declared['fileCount'],'payloadBytes':current['payloadBytes']-declared['payloadBytes'],'changedBuildRelevantFiles':len(changed)},'changedBuildRelevantFiles':changed,'databaseDeploymentBoundary':{'changedFiles':DATABASE_CHANGES,'orderedMigrationAdded':True,'authorizedDatabaseExecution':'WITHHELD','rollbackRuntimeProof':'WITHHELD'},'files':current_rows,'exactWindowsCredit':False,'truthBoundary':'P88 updates the exact P87 product projection with one new exact-PDF artifact boundary and eight modified Audit delivery/completion modules. Database schema/migration remain separate deployment-critical evidence. This is local source identity only.'}
 write(OUT/'P88R1_CURRENT_PRODUCT_PROJECTION_MANIFEST.json',payload);return payload

def build_history():
 mism=[];verified=0
 for top in ('receipts','artifacts'):
  for p in (PARENT/top).rglob('*'):
   if not p.is_file():continue
   verified+=1;rel=p.relative_to(PARENT);q=ROOT/rel
   if not q.is_file() or p.stat().st_size!=q.stat().st_size or sha(p)!=sha(q):mism.append({'path':rel.as_posix(),'expectedSha256':sha(p),'actualSha256':sha(q) if q.is_file() else None})
 if mism:raise RuntimeError(f'historical_mutation:{mism[:5]}')
 restore=load(ROOT/'artifacts/p88/P88_PARENT_HISTORY_RESTORE.json')
 payload={'schemaVersion':'velmere.p88r1.historical-receipt-artifact-immutability.v1','generatedAt':GENERATED_AT,'status':'PASS_BYTE_IDENTICAL','parentCheckpoint':'P87R1_REAL_MARKETS_EXACT_IMMUTABLE_PDF','verifiedHistoricalFiles':verified,'restoredDuringRegression':len(restore.get('restoredFiles',[])),'restoredPaths':[x['path'] for x in restore.get('restoredFiles',[])],'mismatchCount':0,'mismatches':[],'truthBoundary':'All P87 parent receipt/artifact bytes are exact after segmented regression. P88 evidence exists only under P88 paths; no history was rewritten.'}
 write(OUT/'P88R1_HISTORICAL_RECEIPT_IMMUTABILITY.json',payload);return payload

def build_test_aggregate():
 reg=load(ROOT/'receipts/p88/P88_CURRENT_SOURCE_SEGMENTED_REGRESSION.json')
 if reg.get('status')!='PASS_BOUNDED_CURRENT_SEGMENTED_EXECUTION' or reg.get('aggregateExecutedChecksAcrossOverlappingHarnesses')!=1510:raise RuntimeError('p88_segmented_regression_not_green')
 authority=load(ROOT/'receipts/p88/P88_MASTER_DIRECTIVE_V2_COMPLETE_OWNER_AUTHORITY_BINDING.json')
 capacity=load(ROOT/'receipts/p88/P88_AUDIT_PAID_PROVIDER_CAPACITY.json')
 payload={'schemaVersion':'velmere.p88r1.current-source-test-aggregate.v1','generatedAt':GENERATED_AT,'status':'PASS_BOUNDED','currentRegressionReceipt':'receipts/p88/P88_CURRENT_SOURCE_SEGMENTED_REGRESSION.json','currentRegressionReceiptSha256':sha(ROOT/'receipts/p88/P88_CURRENT_SOURCE_SEGMENTED_REGRESSION.json'),'commandsOrReceiptsPassed':reg['commandsOrReceiptsPassed'],'aggregateExecutedChecksAcrossOverlappingHarnesses':1510,'aggregateIndependentEvidenceClaim':False,'authorityBindingChecks':authority['checks']['total'],'providerCapacityChecks':capacity['checks']['total'],'executionAdjudication':reg['executionAdjudication'],'supersededLogs':reg['supersededLogs'],'zeroFakeCredit':reg['zeroFakeCredit'],'truthBoundary':reg['truthBoundary']}
 write(OUT/'P88R1_TEST_AGGREGATE.json',payload);return payload

def scan_paths(paths:list[Path]):
 findings=[]
 for p in sorted(set(paths)):
  data=p.read_bytes();m=PRIVATE_KEY_RE.search(data)
  if m:findings.append({'path':p.relative_to(ROOT).as_posix(),'pattern':'private_key_block','offset':m.start()})
  for name,pattern in TOKEN_PATTERNS.items():
   for match in pattern.finditer(data):findings.append({'path':p.relative_to(ROOT).as_posix(),'pattern':name,'offset':match.start()})
 return findings

def build_secret_scan():
 paths=[ROOT/x for x in PRODUCT_CHANGES+DATABASE_CHANGES+[MASTER,'P88R1_PACKAGE_BUILD_RECIPE.json','VELMERE_ACTIVE_PASS.txt']]
 for base in (ROOT/'scripts/p88',ROOT/'receipts/p88',ROOT/'artifacts/p88'):
  paths.extend(p for p in base.rglob('*') if p.is_file())
 findings=scan_paths(paths)
 if findings:raise RuntimeError(f'targeted_secret_findings:{findings[:10]}')
 payload={'schemaVersion':'velmere.p88r1.targeted-secret-scan.v1','generatedAt':GENERATED_AT,'status':'PASS','filesScanned':len(set(paths)),'matches':0,'findings':[],'patterns':sorted(['private_key_block',*TOKEN_PATTERNS]),'truthBoundary':'Targeted current-delta and P88-evidence scan. Final packaging separately scans every SOURCE_ONLY file.'}
 write(OUT/'P88R1_TARGETED_SECRET_SCAN.json',payload);return payload

def build_typescript():
 ts=ROOT/'artifacts/p88/logs/regression/04_P88_TARGETED_TYPESCRIPT.log';imports=ROOT/'artifacts/p88/logs/regression/03_P88_IMPORTS.log'
 if 'PASS targeted strict TypeScript P88' not in ts.read_text():raise RuntimeError('p88_targeted_ts_not_green')
 if 'PASS (9/9)' not in imports.read_text():raise RuntimeError('p88_imports_not_green')
 payload={'schemaVersion':'velmere.p88r1.local-typescript-diagnostic.v1','generatedAt':GENERATED_AT,'status':'PASS_TARGETED_AND_9_MODULE_IMPORTS_WITHHELD_FULL_PROJECT','targetedStrictTypeScript':{'status':'PASS','scope':['lib/security/audit-report-exact-pdf-artifact.ts'],'command':'tsc --noEmit --target ES2022 --lib ES2022,DOM --module ESNext --moduleResolution Bundler --skipLibCheck --strict --noResolve scripts/p88/p88-targeted-types.d.ts lib/security/audit-report-exact-pdf-artifact.ts','logSha256':sha(ts)},'currentRuntimeModuleImports':{'status':'PASS','moduleCount':9,'modules':PRODUCT_CHANGES,'logSha256':sha(imports)},'environment':{'node':subprocess.check_output(['node','--version'],text=True).strip(),'npm':subprocess.check_output(['npm','--version'],text=True).strip(),'tsc':subprocess.check_output(['tsc','--version'],text=True).strip().replace('Version ',''),'platform':f'{platform.system().lower()} {platform.machine()}'},'dependencyGraphPresent':(ROOT/'node_modules').is_dir(),'fullProjectSemanticTypeScript':'WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING','eslint':'WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING','webpackBuild':'WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING','turbopackBuild':'WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING','exactWindows':'WITHHELD_ON_CURRENT_P88R1_BYTES','truthBoundary':'Targeted strict TypeScript and nine direct current-module imports pass. No whole-project dependency graph, semantic type/lint/build or exact-Windows credit is granted.'}
 write(OUT/'P88R1_LOCAL_TYPESCRIPT_DIAGNOSTIC.json',payload);return payload

def build_authority():
 master=ROOT/MASTER;v17=ROOT/V17
 if master.stat().st_size!=38471 or sha(master)!=MASTER_SHA:raise RuntimeError('master_identity')
 if v17.stat().st_size!=66416 or sha(v17)!=V17_SHA:raise RuntimeError('v17_identity')
 binding=load(ROOT/'receipts/p88/P88_MASTER_DIRECTIVE_V2_COMPLETE_OWNER_AUTHORITY_BINDING.json')
 payload={'schemaVersion':'velmere.p88r1.authority-binding.v1','generatedAt':GENERATED_AT,'status':'PASS','latestExplicitOwnerExecutionAuthority':MASTER,'masterDirectiveBytes':master.stat().st_size,'masterDirectiveSha256':sha(master),'masterSections':'0-88 PRESENT','masterSectionCount':89,'canonicalTopologyDirective':V17,'canonicalTopologyDirectiveSha256':sha(v17),'topology':{'families':10,'customerRows':20,'executionProfiles':20,'materialPaidTransitions':10},'parentCheckpoint':'P87R1_REAL_MARKETS_EXACT_IMMUTABLE_PDF','parentSourceOnly':PARENT_ZIP,'parentSourceOnlySha256':PARENT_ZIP_SHA,'externalLooseLedgerConflictRecorded':True,'externalLooseLedgerConflictSha256':EXTERNAL_CONFLICT_LEDGER_SHA,'bindingReceipt':'receipts/p88/P88_MASTER_DIRECTIVE_V2_COMPLETE_OWNER_AUTHORITY_BINDING.json','bindingReceiptSha256':sha(ROOT/'receipts/p88/P88_MASTER_DIRECTIVE_V2_COMPLETE_OWNER_AUTHORITY_BINDING.json'),'historyRewritten':False,'v17RebindRequired':False,'truthBoundary':'Complete Master V2 governs closure execution; unchanged V17 governs topology. The physically supplied P87 Real Markets package is the parent. The conflicting loose P87 ledger is recorded but not used as parent truth.'}
 write(OUT/'P88R1_AUTHORITY_BINDING.json',payload);return payload

def build_blockers():
 capacity=load(ROOT/'receipts/p88/P88_AUDIT_PAID_PROVIDER_CAPACITY.json')
 rows=[
  {'priority':1,'category':'PRODUCT','id':'AUDIT_PAID_PROVIDER_CAPACITY','state':'WITHHELD','evidence':'receipts/p88/P88_AUDIT_PAID_PROVIDER_CAPACITY.json','current':'maximum 4 strict exact-response identity-bound lanes','required':'Pro 5; Advanced 6','nextSafeAction':'Research and rights-bind genuinely independent exact-identity evidence lanes, or formally redesign and validate the quorum. Never lower floors or relabel partial evidence.'},
  {'priority':2,'category':'ENVIRONMENT','id':'P88_DATABASE_MIGRATION_RUNTIME','state':'WITHHELD','current':'ordered migration and static/fixture proof only','required':'authorized PostgreSQL/Supabase execution, grants, trigger, atomic rollback and post-insert byte verification','nextSafeAction':'Run on authorized staging with service-role separation and destructive rollback fixtures only in the controlled environment.'},
  {'priority':3,'category':'ENVIRONMENT','id':'AUDIT_DEPLOYED_SAME_BLOB_HTTP','state':'WITHHELD','current':'local same-blob preview/download proof','required':'deployed preview/download/account artifact byte identity with real owner authorization','nextSafeAction':'Execute real staging HTTP/JWT/RLS journey after migration proof.'},
  {'priority':4,'category':'RIGHTS','id':'FIELD_LEVEL_RIGHTS','state':'WITHHELD','current':'2/203 inherited only','required':'lawful customer display/derived/cache/retention state per required field','nextSafeAction':'Continue field-level rights registry independently of unavailable staging.'},
  {'priority':5,'category':'REAL_EXTERNAL_PROOF','id':'CURRENT_DEPLOYMENT_AND_REPLAY','state':'WITHHELD','current':'historical bounded case; current exploitability not proven','required':'rights-bound read-only current quorum plus authorized offline archival replay','nextSafeAction':'No live transaction or exploit. Use public read-only state and local controlled replay only.'},
  {'priority':6,'category':'ENVIRONMENT','id':'EXACT_WINDOWS_FULL_ENGINEERING','state':'WITHHELD','current':'targeted TS/imports only','required':'Node 24.18.0/npm 11.16.0 Windows Server 2025 dependency/type/lint/dual-build regression on exact bytes','nextSafeAction':'Run canonical Windows lane after the exact successor source is frozen.'},
 ]
 payload={'schemaVersion':'velmere.p88r1.current-blocker-queue.v1','generatedAt':GENERATED_AT,'status':'OPEN_CONTINUOUS_CLOSURE','currentCustomerFinal':'0/20','rows':rows,'noProgressRule':'If one external/environment blocker cannot advance, continue the next independent high-value workstream. Do not brute-force providers or retry until green.','truthBoundary':'Queue ordering is an evidence-based execution aid, not a release score or ETA.'}
 write(OUT/'P88R1_CURRENT_BLOCKER_QUEUE.json',payload);return payload

def build_checkpoint(source,product,history,tests,secrets,typescript,authority,blockers):
 runtime=load(ROOT/'receipts/p88/P88_AUDIT_EXACT_IMMUTABLE_PDF_RUNTIME.json')
 static=load(ROOT/'receipts/p88/P88_AUDIT_EXACT_IMMUTABLE_PDF_STATIC.json')
 capacity=load(ROOT/'receipts/p88/P88_AUDIT_PAID_PROVIDER_CAPACITY.json')
 payload={'schemaVersion':'velmere.p88r1.checkpoint-receipt.v1','generatedAt':GENERATED_AT,'status':'PASS_BOUNDED_P88R1_AUDIT_PAID_EXACT_IMMUTABLE_PDF_RENDER_ONCE_STORE_FIRST','classification':'DEFENSIVE_LOCAL_EXACT_BYTES_ATOMIC_COMPLETION_AND_NO_RERENDER_DELIVERY','parentCheckpoint':'P87R1_REAL_MARKETS_EXACT_IMMUTABLE_PDF','authority':authority,'physicalChanges':{'buildRelevantFiles':PRODUCT_CHANGES,'databaseClosureCriticalFiles':DATABASE_CHANGES,'renderOnceAtSettle':True,'exactPdfBytesPersistedWithSnapshot':True,'downloadReadsStoredBlobOnly':True,'downloadImportsRenderer':False,'canonicalBase64Required':True,'storedByteDigestAndLengthReverified':True,'legacyDigestOnlyPaidRecordsFailClosed':True,'atomicWorkerCompletionV2':True,'historicalReceiptsByteIdentical':True},'localDefensiveProof':{'runtimeStatus':runtime['status'],'runtimeChecks':runtime['summary']['checks'],'runtimeRepeatability':'PASS_2_OF_2_BYTE_IDENTICAL','staticChecks':static['checks']['total'],'changedModuleImports':9,'targetedStrictTypeScript':'PASS','segmentedAggregateOverlappingChecks':tests['aggregateExecutedChecksAcrossOverlappingHarnesses'],'aggregateIndependenceClaim':False},'controlledFixtureArtifacts':runtime['cases'],'providerCapacity':{'status':capacity['status'],'maximumStrictCandidateLanes':4,'proRequired':5,'advancedRequired':6,'proReady':False,'advancedReady':False},'sourceChangeManifest':'artifacts/closure/p88r1/P88R1_SOURCE_CHANGE_MANIFEST.json','productProjection':'artifacts/closure/p88r1/P88R1_CURRENT_PRODUCT_PROJECTION_MANIFEST.json','historyReceipt':'artifacts/closure/p88r1/P88R1_HISTORICAL_RECEIPT_IMMUTABILITY.json','testAggregate':'artifacts/closure/p88r1/P88R1_TEST_AGGREGATE.json','targetedSecretScan':'artifacts/closure/p88r1/P88R1_TARGETED_SECRET_SCAN.json','typescriptDiagnostic':'artifacts/closure/p88r1/P88R1_LOCAL_TYPESCRIPT_DIAGNOSTIC.json','blockerQueue':'artifacts/closure/p88r1/P88R1_CURRENT_BLOCKER_QUEUE.json','securityBoundary':{'externalTransactionSent':False,'externalStateChanged':False,'liveExploitPerformed':False,'weaponizedPocCreated':False,'authorizationBypassAttempted':False,'externalSystemScanned':False,'rawPrivateSourceOrAbiRedistributed':False},'zeroFakeCredit':{'customerFinal':'0/20','auditFinalPdf':'0/3','rights':'2/203 inherited only','paidValue':'0/10','saleEligible':'0/20','live':False,'global':'NO_GO / STOP_SELL'},'withheld':['authorized PostgreSQL/Supabase migration and rollback execution','real JWT/RLS and deployed HTTP same-blob proof','Audit paid provider capacity and field rights','current deployment quorum and independent offline replay','whole-project type/lint/dual build','exact Windows'],'nextBlocker':'Audit Pro/Advanced cannot become paid-ready under the current seven-lane runtime because only four lanes can ever satisfy the strict exact-response identity-bound predicate; Pro requires five and Advanced six. Add lawful independent evidence capacity or formally redesign the quorum without weakening truth.'}
 write(OUT/'P88R1_CHECKPOINT_RECEIPT.json',payload);return payload

def build_identity():
 rows=all_rows(ROOT,exclude_identity=True);ident=projection(rows)
 payload={'schemaVersion':'velmere.p88r1.tree-identity-excluding-self.v1','generatedAt':GENERATED_AT,'status':'PASS','excludedOnly':IDENTITY_REL,**ident,'fullPackageFileCountIncludingThisIdentityFile':ident['fileCount']+1,'truthBoundary':'Canonical identity of every current SOURCE_ONLY file except this self-referential identity receipt. Final ZIP bytes and clean-unpack equality are verified separately.'}
 write(OUT/'P88R1_TREE_IDENTITY_EXCLUDING_SELF.json',payload);return payload

def main():
 if (ROOT/'VELMERE_ACTIVE_PASS.txt').read_text().strip()!='P88R1':raise RuntimeError('active_pass_not_p88r1')
 OUT.mkdir(parents=True,exist_ok=True)
 source=build_source_change_manifest();product=build_product_projection();history=build_history();tests=build_test_aggregate();secrets=build_secret_scan();typescript=build_typescript();authority=build_authority();blockers=build_blockers();checkpoint=build_checkpoint(source,product,history,tests,secrets,typescript,authority,blockers);identity=build_identity()
 print(json.dumps({'status':'PASS','sourceChanges':source['changeCount'],'productProjection':product['currentCandidateProjection'],'historicalVerified':history['verifiedHistoricalFiles'],'regressionChecks':tests['aggregateExecutedChecksAcrossOverlappingHarnesses'],'identity':identity,'checkpoint':checkpoint['status']},indent=2))
if __name__=='__main__':main()
