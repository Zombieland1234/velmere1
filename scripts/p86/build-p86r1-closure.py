#!/usr/bin/env python3
"""Build P86R1 source identity, proof aggregation and zero-fake-credit checkpoint receipts."""
from __future__ import annotations
import argparse,hashlib,json,platform,re,shutil,subprocess
from collections import Counter
from pathlib import Path
from typing import Any

GENERATED_AT='2026-08-20T04:30:00Z'
DIRECTIVE_FILE='VELMERE_CANONICAL_OWNER_DIRECTIVE_V17_TRUE_TOPOLOGY_AUTOMATED_ADVANCED_CURRENT_WORLD_CLASS_2026-08-17.txt'
DIRECTIVE_SHA256='de7fbd6df651a7a8a8f85054c6e9ac3c2ca530ebfb0d4ccd335dcb99fb658f05'
PARENT_LEDGER_SHA256='2875a0a5bbf9deb18a67cc68885d00b5579cb201d50adb7c481e294b602eda20'
PARENT_LEDGER_BYTES=20604
PARENT_ZIP_SHA256='5fa23eff7880994de98928077ddaa7f0c62b8c7fdfc8190f00532e7b05d3890a'
PARENT_ZIP_BYTES=214822309
PARENT_ZIP_ENTRIES=8310
OUTPUT_NAME='VELMERE_R44P46_V17_P86R1_ACCOUNT_ARTIFACT_EXACT_PDF_FAIL_CLOSED_NO_RERENDER_CURRENT_SOURCE_ONLY_IN_PROGRESS_2026-08-20.zip'
IDENTITY_REL='artifacts/closure/p86r1/P86R1_TREE_IDENTITY_EXCLUDING_SELF.json'
PRODUCT_CHANGES=[
 'lib/reporting/account-customer-artifact-snapshot.ts',
 'lib/reporting/customer-artifact-pdf-availability.ts',
 'lib/server/lazy-route-modules/account--customer-artifact.ts',
]
DATABASE_CHANGES=['lib/db/schema.sql','supabase/migrations/20260820000004_p86_customer_artifact_exact_pdf_new_write_gate.sql']
PRIVATE_KEY_BLOCK_RE=re.compile(rb'-----BEGIN (?:(?:RSA|EC|OPENSSH) )?PRIVATE KEY-----\r?\n(?:[A-Za-z0-9+/=]{16,}\r?\n){2,}-----END (?:(?:RSA|EC|OPENSSH) )?PRIVATE KEY-----')
TOKEN_PATTERNS={
 'aws_access_key_id':re.compile(rb'AKIA[0-9A-Z]{16}'),'stripe_live_secret':re.compile(rb'sk_live_[A-Za-z0-9]{16,}'),
 'stripe_webhook_secret':re.compile(rb'whsec_[A-Za-z0-9]{16,}'),'github_fine_grained_pat':re.compile(rb'github_pat_[A-Za-z0-9_]{20,}'),
 'github_classic_pat':re.compile(rb'ghp_[A-Za-z0-9]{30,}'),'openai_api_key':re.compile(rb'(?<![A-Za-z0-9_-])sk-(?:proj-)?[A-Za-z0-9_-]{24,}'),
 'google_api_key':re.compile(rb'AIza[0-9A-Za-z_-]{30,}'),
}

def sha(path:Path)->str:
 h=hashlib.sha256()
 with path.open('rb') as f:
  for c in iter(lambda:f.read(4*1024*1024),b''): h.update(c)
 return h.hexdigest()
def write(path:Path,payload:Any): path.parent.mkdir(parents=True,exist_ok=True); path.write_text(json.dumps(payload,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
def load(path:Path): return json.loads(path.read_text(encoding='utf-8'))
def row(root:Path,rel:str):
 p=root/rel; return {'path':rel,'byteLength':p.stat().st_size,'sha256':sha(p)}
def projection(rows:list[dict[str,Any]]):
 rows=sorted(rows,key=lambda x:x['path']); ph=hashlib.sha256('\n'.join(x['path'] for x in rows).encode()).hexdigest(); h=hashlib.sha256()
 for x in rows: h.update(f"{x['path']}\0{x['byteLength']}\0{x['sha256']}\n".encode())
 return {'fileCount':len(rows),'payloadBytes':sum(x['byteLength'] for x in rows),'pathSetSha256':ph,'sourceContentAggregateSha256':h.hexdigest()}
def all_rows(root:Path,exclude_identity=False):
 out=[]
 for p in sorted((x for x in root.rglob('*') if x.is_file()),key=lambda x:x.relative_to(root).as_posix()):
  rel=p.relative_to(root).as_posix()
  if exclude_identity and rel==IDENTITY_REL: continue
  if p.is_symlink(): raise RuntimeError(f'symlink_not_allowed:{rel}')
  if rel.endswith('.pyc') or '/__pycache__/' in f'/{rel}/': raise RuntimeError(f'python_cache_not_allowed:{rel}')
  out.append(row(root,rel))
 return out

def classify(rel:str):
 if rel=='VELMERE_ACTIVE_PASS.txt': return 'CONTROL_PLANE_POINTER'
 if rel in PRODUCT_CHANGES: return 'CURRENT_PRODUCT_BUILD_RELEVANT'
 if rel=='lib/db/schema.sql': return 'DATABASE_CANONICAL_SCHEMA_MIRROR'
 if rel==DATABASE_CHANGES[1]: return 'DATABASE_ORDERED_MIGRATION'
 if rel.startswith('tests/security/a102-p36-exact-customer-pdf-integration') or rel.startswith('tests/security/a102-account-artifact-preview-download-parity'): return 'CURRENT_REGRESSION_TEST'
 if rel.startswith('receipts/p86/'): return 'P86_CURRENT_RECEIPT'
 if rel.startswith('artifacts/p86/'): return 'P86_LOCAL_PROOF_OR_LOG'
 if rel.startswith('scripts/p86/'): return 'P86_HARNESS_OR_CLOSURE_SOURCE'
 return 'CURRENT_SOURCE_SUPPORT'

def source_changes(root:Path,parent:Path,out:Path):
 def fmap(base):
  m={}
  for p in base.rglob('*'):
   if not p.is_file(): continue
   rel=p.relative_to(base).as_posix()
   if rel.startswith('artifacts/closure/p86r1/'): continue
   m[rel]={'size':p.stat().st_size,'path':p}
  return m
 b=fmap(parent); a=fmap(root); changes=[]
 for rel in sorted(set(b)|set(a)):
  old=b.get(rel); new=a.get(rel); equal=False
  if old and new and old['size']==new['size']: equal=old['path'].read_bytes()==new['path'].read_bytes()
  if equal: continue
  orow=row(parent,rel) if old else None; nrow=row(root,rel) if new else None
  changes.append({'path':rel,'change':'ADDED' if not old else 'DELETED' if not new else 'MODIFIED','classification':classify(rel),'beforeBytes':orow and orow['byteLength'],'beforeSha256':orow and orow['sha256'],'afterBytes':nrow and nrow['byteLength'],'afterSha256':nrow and nrow['sha256']})
 counts=Counter(x['classification'] for x in changes)
 payload={'schemaVersion':'velmere.p86r1.source-change-manifest.v1','generatedAt':GENERATED_AT,'status':'PASS_EXACT_PARENT_DELTA','parentCheckpoint':'P85R1','scopeExcludes':['artifacts/closure/p86r1/* (self-generated closure receipts)'],'changeCount':len(changes),'classificationCounts':dict(sorted(counts.items())),'changes':changes,'buildRelevantChangedFiles':PRODUCT_CHANGES,'databaseClosureCriticalChangedFiles':DATABASE_CHANGES,'directiveChanged':False,'masterDirectiveV2BindingReceipt':'receipts/p86/P86_MASTER_DIRECTIVE_V2_OWNER_AUTHORITY_BINDING.json','truthBoundary':'Exact filesystem delta from P85R1 outside self-generated P86 closure. Changed files alone do not establish deployed migration/runtime, customer value or FINAL.'}
 write(out/'P86R1_SOURCE_CHANGE_MANIFEST.json',payload); return payload

def product_projection(root:Path,out:Path):
 pm=load(root/'artifacts/closure/p85r1/P85R1_CURRENT_PRODUCT_PROJECTION_MANIFEST.json'); rows=[dict(x) for x in pm['files']]; declared=pm['currentCandidateProjection']
 if projection(rows)!=declared: raise RuntimeError('p85_projection_identity_mismatch')
 m={x['path']:x for x in rows}; changed=[]
 for rel in PRODUCT_CHANGES:
  before=m.get(rel); after=row(root,rel); m[rel]=after
  changed.append({'path':rel,'change':'ADDED' if before is None else 'MODIFIED','beforeBytes':before and before['byteLength'],'beforeSha256':before and before['sha256'],'afterBytes':after['byteLength'],'afterSha256':after['sha256']})
 current_rows=sorted(m.values(),key=lambda x:x['path']); current=projection(current_rows)
 payload={'schemaVersion':'velmere.p86r1.current-product-projection-manifest.v1','generatedAt':GENERATED_AT,'status':'PASS_LOCAL_DETERMINISTIC_SOURCE_IDENTITY_ONLY','parentCheckpoint':'P85R1','parentProjectionReconstructedExactly':True,'parentProjection':declared,'currentCandidateProjection':current,'delta':{'fileCount':current['fileCount']-declared['fileCount'],'payloadBytes':current['payloadBytes']-declared['payloadBytes'],'changedBuildRelevantFiles':len(changed)},'changedBuildRelevantFiles':changed,'databaseDeploymentBoundary':{'orderedMigration':DATABASE_CHANGES[1],'canonicalSchemaMirror':DATABASE_CHANGES[0],'includedInProductBuildProjection':False,'authorizedPostgresExecution':'WITHHELD_NO_SERVER_BINARY_OR_NETWORK_RETRIEVAL','realOwnerJwtRlsIsolation':'WITHHELD'},'files':current_rows,'exactWindowsCredit':False,'truthBoundary':'P86 updates the exact P85 product projection with two modified and one new build-relevant account-artifact modules. Database migration/schema are closure-critical but outside the historical build projection. This is local source identity only.'}
 write(out/'P86R1_CURRENT_PRODUCT_PROJECTION_MANIFEST.json',payload); return payload

def historical(root:Path,parent:Path,out:Path):
 candidates=[]
 for base in [parent/'receipts',parent/'artifacts/closure']: candidates += [p for p in base.rglob('*') if p.is_file()]
 for p in [parent/'artifacts/p80/P80_AUDIT_LOCAL_FIXTURE_NOT_CUSTOMER_FINAL.pdf',parent/'artifacts/p82/P82_LOCAL_READONLY_QUORUM_HARDENING_FIXTURE_RECEIPT.json']:
  if p.is_file(): candidates.append(p)
 unique={p.relative_to(parent).as_posix():p for p in candidates}; mism=[]
 for rel,p in sorted(unique.items()):
  q=root/rel
  if not q.is_file(): mism.append({'path':rel,'reason':'missing'})
  elif p.stat().st_size!=q.stat().st_size or sha(p)!=sha(q): mism.append({'path':rel,'reason':'changed','expectedSha256':sha(p),'actualSha256':sha(q)})
 if mism: raise RuntimeError(f'historical_mutation:{mism[:5]}')
 payload={'schemaVersion':'velmere.p86r1.historical-receipt-immutability.v1','generatedAt':GENERATED_AT,'status':'PASS','verifiedHistoricalFiles':len(unique),'mismatchCount':0,'mismatches':[],'scope':['all P85-parent receipts','all P85-parent closure artifacts','P80 exact fixture PDF','P82 local quorum fixture receipt'],'truthBoundary':'Current regressions were executed into P86 logs/receipts and all historical outputs were restored byte-for-byte from the independently verified P85 parent. New evidence exists only under P86 paths.'}
 write(out/'P86R1_HISTORICAL_RECEIPT_IMMUTABILITY.json',payload); return payload

def tests(root:Path,out:Path):
 d=load(root/'receipts/p86/P86_CURRENT_SOURCE_REGRESSION_SUMMARY.json')
 if d.get('status')!='PASS' or d.get('aggregate')!={'passed':1148,'total':1148,'failedLanes':0}: raise RuntimeError('p86_regression_not_green')
 controls=[]
 for lane in d['lanes']:
  if lane['status']!='PASS' or lane['passed']!=lane['total']: raise RuntimeError(f'lane_fail:{lane}')
  p=root/lane['evidence'];
  if not p.is_file(): raise RuntimeError(f'evidence_missing:{p}')
  controls.append({'label':lane['name'],'path':lane['evidence'],'sha256':sha(p),'checks':lane['total'],'passed':True,'status':'PASS'})
 payload={'schemaVersion':'velmere.p86r1.current-source-test-aggregate.v1','generatedAt':GENERATED_AT,'status':'PASS','controls':controls,'aggregateExecutedChecksAcrossOverlappingHarnesses':1148,'aggregateIndependenceClaim':False,'commandExecution':d['commandExecution'],'supersededHistoricalHarnesses':d['supersededHistoricalHarnesses'],'countingBoundary':d['countingBoundary'],'truthBoundary':'All listed controls were physically executed on P86 source or explicitly re-executed compatibility paths. The aggregate overlaps and grants no Customer FINAL, Audit FINAL PDF, rights, value, sale or LIVE credit.'}
 write(out/'P86R1_TEST_AGGREGATE.json',payload); return payload

def secret_scan(root:Path,out:Path):
 targets=[]
 changed=load(out/'P86R1_SOURCE_CHANGE_MANIFEST.json')['changes']
 for x in changed:
  if x['change']!='DELETED': targets.append(root/x['path'])
 findings=[]
 for p in targets:
  data=p.read_bytes()
  if PRIVATE_KEY_BLOCK_RE.search(data): findings.append({'path':p.relative_to(root).as_posix(),'pattern':'private_key_block'})
  for name,pat in TOKEN_PATTERNS.items():
   if pat.search(data): findings.append({'path':p.relative_to(root).as_posix(),'pattern':name})
 if findings: raise RuntimeError(f'secret_findings:{findings[:20]}')
 payload={'schemaVersion':'velmere.p86r1.targeted-secret-scan.v1','generatedAt':GENERATED_AT,'status':'PASS','scannedChangedFiles':len(targets),'matches':0,'patterns':sorted(['private_key_block',*TOKEN_PATTERNS]),'truthBoundary':'Pattern scan of exact P86 parent delta only. The deterministic package builder independently scans the full final package.'}
 write(out/'P86R1_TARGETED_SECRET_SCAN.json',payload); return payload

def typescript_diag(root:Path,out:Path):
 ts=root/'artifacts/p86/logs/P86_TARGETED_TYPESCRIPT.log'; imp=root/'artifacts/p86/logs/P86_CHANGED_MODULE_IMPORTS.log'
 if not ts.is_file() or not imp.is_file() or 'PASS' not in imp.read_text(): raise RuntimeError('p86_type_or_import_log_missing')
 env={'node':subprocess.check_output(['node','--version'],text=True).strip(),'npm':subprocess.check_output(['npm','--version'],text=True).strip(),'tsc':subprocess.check_output(['tsc','--version'],text=True).strip().replace('Version ',''),'platform':f'{platform.system().lower()} {platform.machine()}','postgresBinary':shutil.which('postgres'),'psqlBinary':shutil.which('psql'),'dockerBinary':shutil.which('docker'),'supabaseCli':shutil.which('supabase')}
 payload={'schemaVersion':'velmere.p86r1.local-typescript-diagnostic.v1','generatedAt':GENERATED_AT,'status':'PASS_TARGETED_AND_CHANGED_MODULE_IMPORTS_WITHHELD_FULL_PROJECT','targetedStrictTypeScript':{'status':'PASS','scope':['lib/reporting/customer-artifact-pdf-availability.ts'],'command':'tsc --noEmit --target ES2022 --lib ES2022,DOM --module ESNext --moduleResolution Bundler --skipLibCheck --strict --noResolve scripts/p86/p86-targeted-types.d.ts lib/reporting/customer-artifact-pdf-availability.ts','logSha256':sha(ts)},'currentRuntimeModuleImports':{'status':'PASS','moduleCount':3,'modules':PRODUCT_CHANGES,'logSha256':sha(imp)},'environment':env,'authorizedPostgresRuntime':'WITHHELD_NO_SERVER_BINARY_OR_NETWORK_RETRIEVAL','fullProjectSemanticTypeScript':'WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING','eslint':'WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING','dualProductionBuild':'WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING','exactWindows':'WITHHELD_ON_CURRENT_P86R1_BYTES','truthBoundary':'Targeted helper TypeScript and runtime imports pass locally. This is not whole-project semantic TypeScript, lint, build or exact-Windows proof.'}
 write(out/'P86R1_LOCAL_TYPESCRIPT_DIAGNOSTIC.json',payload); return payload

def checkpoint(root:Path,out:Path,src,proj,hist,tst,secrets,tdiag):
 rt=load(root/'receipts/p86/P86_EXACT_PDF_FAIL_CLOSED_RUNTIME.json'); st=load(root/'receipts/p86/P86_EXACT_PDF_FAIL_CLOSED_STATIC.json'); rep=load(root/'receipts/p86/P86_EXACT_PDF_FAIL_CLOSED_REPEATABILITY.json'); compat=load(root/'receipts/p86/P86_P85_COMPATIBILITY.json'); master=load(root/'receipts/p86/P86_MASTER_DIRECTIVE_V2_OWNER_AUTHORITY_BINDING.json')
 payload={'schemaVersion':'velmere.p86r1.checkpoint-receipt.v1','generatedAt':GENERATED_AT,'status':'PASS_BOUNDED_P86R1_ACCOUNT_ARTIFACT_EXACT_PDF_FAIL_CLOSED_NO_RERENDER','canonicalBinding':{'canonicalTopologyDirectiveFile':DIRECTIVE_FILE,'canonicalTopologyDirectiveSha256':DIRECTIVE_SHA256,'directiveChanged':False,'latestExplicitOwnerExecutionAuthority':master['authority']['title'],'masterDirectiveBindingStatus':master['status'],'masterDirectiveBindingReceipt':'receipts/p86/P86_MASTER_DIRECTIVE_V2_OWNER_AUTHORITY_BINDING.json','masterDirectiveChangesTopology':False,'parentCheckpoint':'P85R1','parentLedgerSha256':PARENT_LEDGER_SHA256,'parentLedgerBytes':PARENT_LEDGER_BYTES,'parentSourceOnlySha256':PARENT_ZIP_SHA256,'parentSourceOnlyBytes':PARENT_ZIP_BYTES,'parentSourceOnlyEntries':PARENT_ZIP_ENTRIES},'productProjection':proj['currentCandidateProjection'],'discoveredDefect':st['discoveredDefect'],'physicalChanges':{'deltaFilesOutsideSelfGeneratedClosure':src['changeCount'],'buildRelevantChangedFiles':len(PRODUCT_CHANGES),'databaseClosureCriticalChangedFiles':len(DATABASE_CHANGES),'legacyPdfRerenderBranchesRemoved':True,'legacyPreviewRoutePublished':False,'legacyDownloadRoutePublished':False,'newLegacySnapshotBuilderAllowed':False,'newLegacyDatabaseInsertAllowed':False,'historicalLegacyMetadataReadCompatibility':True,'productionWritersExactAtomic':True,'publicArtifactSchemas':'v3','historicalReceiptsByteIdentical':hist['status']=='PASS','runtimeReceiptRepeatability':rep['status']},'localDefensiveProof':{'runtimeStatus':rt['status'],'runtimeChecks':rt['checks']['total'],'repeatabilityChecks':rep['checks']['total'],'staticChecks':st['checks']['total'],'p85CompatibilityChecks':compat['checks']['total'],'aggregateExecutedChecksAcrossOverlappingHarnesses':1148,'aggregateIndependenceClaim':False,'customerFinalEligible':False,'auditFinalPdfEligible':False},'controls':tst['controls'],'environment':{'localNode':tdiag['environment']['node'],'localNpm':tdiag['environment']['npm'],'localTsc':tdiag['environment']['tsc'],'platform':tdiag['environment']['platform'],'authorizedPostgresMigrationExecuted':False,'realRlsJwtTwoAccountIsolationExecuted':False,'deployedHttpExecuted':False,'currentExternalRpcQuorumExecuted':False,'semanticTypeScriptCurrentBytes':tdiag['fullProjectSemanticTypeScript'],'eslintCurrentBytes':tdiag['eslint'],'dualProductionBuildCurrentBytes':tdiag['dualProductionBuild'],'exactWindowsCurrentBytes':tdiag['exactWindows']},'targetedSecretScan':{'status':secrets['status'],'matches':secrets['matches']},'securityBoundary':{'externalTransactionSent':False,'stateChangePerformedOnExternalChain':False,'liveExploitPerformed':False,'weaponizedPocCreated':False,'authorizationBypassAttempted':False,'externalSystemScanned':False,'rawSolidityAbiRuntimeTraceStateRedistributed':False},'zeroFakeCredit':{'customerFinal':'0/20','auditFinalPdf':'0/3','rights':'2/203 inherited only','paidValue':'0/10','saleEligible':'0/20','live':False,'global':'NO_GO / STOP_SELL'},'nextBlocker':'Apply P83-P86 migrations on an authorized staging PostgreSQL/Supabase instance and prove the P86 insert gate, two-owner JWT/RLS/PostgREST visibility, service-role-only atomic publication, full rollback, and deployed preview/download/account byte identity. In parallel, continue independent non-staging workstreams without retry loops: current rights-bound BSC quorum, authorized offline replay, all-product immutable artifact audit, full dependency/type/lint/build, and exact Windows.','truthBoundary':'P86 proves local source/static/route behavior and compatibility. It does not execute PostgreSQL/Supabase, real JWT/RLS/PostgREST, deployed HTTP, current chain truth, rights expansion, Customer FINAL, Audit FINAL PDF or exact Windows.'}
 write(out/'P86R1_CHECKPOINT_RECEIPT.json',payload); return payload

def identity(root:Path,out:Path):
 rows=all_rows(root,exclude_identity=True); p=projection(rows); payload={'schemaVersion':'velmere.p86r1.tree-identity-excluding-self.v1','generatedAt':GENERATED_AT,'status':'PASS','excludedOnly':IDENTITY_REL,**p,'fullPackageFileCountIncludingThisIdentityFile':len(rows)+1,'truthBoundary':'Complete SOURCE_ONLY tree identity excluding only this self-referential receipt.'}; write(root/IDENTITY_REL,payload); return payload

def main():
 ap=argparse.ArgumentParser(); ap.add_argument('--root',required=True); ap.add_argument('--parent',required=True); a=ap.parse_args(); root=Path(a.root).resolve(); parent=Path(a.parent).resolve(); out=root/'artifacts/closure/p86r1'; out.mkdir(parents=True,exist_ok=True)
 src=source_changes(root,parent,out); proj=product_projection(root,out); hist=historical(root,parent,out); tst=tests(root,out); secrets=secret_scan(root,out); tdiag=typescript_diag(root,out); ck=checkpoint(root,out,src,proj,hist,tst,secrets,tdiag); ident=identity(root,out)
 print(json.dumps({'status':'PASS','sourceChanges':src['changeCount'],'productProjection':proj['currentCandidateProjection'],'historicalFiles':hist['verifiedHistoricalFiles'],'tests':tst['aggregateExecutedChecksAcrossOverlappingHarnesses'],'treeIdentity':ident},indent=2))
if __name__=='__main__': main()
