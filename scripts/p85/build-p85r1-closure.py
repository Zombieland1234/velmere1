#!/usr/bin/env python3
"""Build P85R1 closure receipts without granting customer/PDF FINAL credit."""
from __future__ import annotations
import argparse, hashlib, json, platform, re, shutil, subprocess
from collections import Counter
from pathlib import Path
from typing import Any

GENERATED_AT='2026-08-20T02:15:00Z'
DIRECTIVE_FILE='VELMERE_CANONICAL_OWNER_DIRECTIVE_V17_TRUE_TOPOLOGY_AUTOMATED_ADVANCED_CURRENT_WORLD_CLASS_2026-08-17.txt'
DIRECTIVE_SHA256='de7fbd6df651a7a8a8f85054c6e9ac3c2ca530ebfb0d4ccd335dcb99fb658f05'
PARENT_LEDGER_SHA256='6db258bcb7ab207945970f4d3a0c2de9652c109c7c17dabfbf3c9f34da32c79f'
PARENT_LEDGER_BYTES=19156
PARENT_ZIP_SHA256='ed6a4d103bf5afe75fc2ad1fc0a55346886f7cecc70723a0bb1452bbbb188f78'
PARENT_ZIP_BYTES=214630313
PARENT_ZIP_ENTRIES=8254
OUTPUT_NAME='VELMERE_R44P46_V17_P85R1_AUDIT_DATABASE_ENFORCED_PUBLICATION_VISIBILITY_OWNER_RPC_CURRENT_SOURCE_ONLY_IN_PROGRESS_2026-08-20.zip'
IDENTITY_REL='artifacts/closure/p85r1/P85R1_TREE_IDENTITY_EXCLUDING_SELF.json'
PRODUCT_CHANGES=[
 'lib/reporting/account-customer-artifact-store.ts',
 'lib/reporting/account-customer-artifact-owner-visible-read.ts',
 'lib/server/lazy-route-modules/account--customer-artifact.ts',
]
DATABASE_CHANGES=['lib/db/schema.sql','supabase/migrations/20260820000003_p85_audit_customer_artifact_publication_visibility_rls.sql']
PRIVATE_KEY_BLOCK_RE=re.compile(rb'-----BEGIN (?:(?:RSA|EC|OPENSSH) )?PRIVATE KEY-----\r?\n(?:[A-Za-z0-9+/=]{16,}\r?\n){2,}-----END (?:(?:RSA|EC|OPENSSH) )?PRIVATE KEY-----')
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
  for c in iter(lambda:f.read(4*1024*1024),b''): h.update(c)
 return h.hexdigest()
def write(path:Path,payload:Any):
 path.parent.mkdir(parents=True,exist_ok=True); path.write_text(json.dumps(payload,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
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
 if rel.startswith('receipts/p85/'): return 'P85_CURRENT_RECEIPT'
 if rel.startswith('artifacts/p85/'): return 'P85_LOCAL_PROOF_OR_LOG'
 if rel.startswith('scripts/p85/'): return 'P85_HARNESS_OR_CLOSURE_SOURCE'
 return 'CURRENT_SOURCE_SUPPORT'

def source_changes(root:Path,parent:Path,out:Path):
 def fmap(base):
  m={}
  for p in base.rglob('*'):
   if not p.is_file(): continue
   rel=p.relative_to(base).as_posix()
   if rel.startswith('artifacts/closure/p85r1/'): continue
   # Cheap equality first; hash only rows needed for the exact delta.
   m[rel]={'size':p.stat().st_size,'path':p}
  return m
 b=fmap(parent); a=fmap(root); changes=[]
 for rel in sorted(set(b)|set(a)):
  old=b.get(rel); new=a.get(rel)
  equal=False
  if old and new and old['size']==new['size']:
   equal=old['path'].read_bytes()==new['path'].read_bytes()
  if equal: continue
  orow=row(parent,rel) if old else None; nrow=row(root,rel) if new else None
  changes.append({'path':rel,'change':'ADDED' if not old else 'DELETED' if not new else 'MODIFIED','classification':classify(rel),'beforeBytes':orow and orow['byteLength'],'beforeSha256':orow and orow['sha256'],'afterBytes':nrow and nrow['byteLength'],'afterSha256':nrow and nrow['sha256']})
 counts=Counter(x['classification'] for x in changes)
 payload={'schemaVersion':'velmere.p85r1.source-change-manifest.v1','generatedAt':GENERATED_AT,'status':'PASS_EXACT_PARENT_DELTA','parentCheckpoint':'P84R1','scopeExcludes':['artifacts/closure/p85r1/* (self-generated closure receipts)'],'changeCount':len(changes),'classificationCounts':dict(sorted(counts.items())),'changes':changes,'buildRelevantChangedFiles':PRODUCT_CHANGES,'databaseClosureCriticalChangedFiles':DATABASE_CHANGES,'directiveChanged':False,'truthBoundary':'Exact filesystem delta from P84R1 outside self-generated P85 closure. Changed files alone do not establish staging runtime, customer value or FINAL.'}
 write(out/'P85R1_SOURCE_CHANGE_MANIFEST.json',payload); return payload

def product_projection(root:Path,out:Path):
 pm=load(root/'artifacts/closure/p84r1/P84R1_CURRENT_PRODUCT_PROJECTION_MANIFEST.json'); rows=[dict(x) for x in pm['files']]; declared=pm['currentCandidateProjection']
 if projection(rows)!=declared: raise RuntimeError('p84_projection_identity_mismatch')
 m={x['path']:x for x in rows}; changed=[]
 for rel in PRODUCT_CHANGES:
  before=m.get(rel); after=row(root,rel); m[rel]=after
  changed.append({'path':rel,'change':'ADDED' if before is None else 'MODIFIED','beforeBytes':before and before['byteLength'],'beforeSha256':before and before['sha256'],'afterBytes':after['byteLength'],'afterSha256':after['sha256']})
 current_rows=sorted(m.values(),key=lambda x:x['path']); current=projection(current_rows)
 payload={'schemaVersion':'velmere.p85r1.current-product-projection-manifest.v1','generatedAt':GENERATED_AT,'status':'PASS_LOCAL_DETERMINISTIC_SOURCE_IDENTITY_ONLY','parentCheckpoint':'P84R1','parentProjectionReconstructedExactly':True,'parentProjection':declared,'currentCandidateProjection':current,'delta':{'fileCount':current['fileCount']-declared['fileCount'],'payloadBytes':current['payloadBytes']-declared['payloadBytes'],'changedBuildRelevantFiles':len(changed)},'changedBuildRelevantFiles':changed,'databaseDeploymentBoundary':{'orderedMigration':DATABASE_CHANGES[1],'canonicalSchemaMirror':DATABASE_CHANGES[0],'includedInProductBuildProjection':False,'authorizedPostgresExecution':'WITHHELD_NO_SERVER_BINARY_OR_NETWORK_RETRIEVAL','realOwnerJwtRlsIsolation':'WITHHELD'},'files':current_rows,'exactWindowsCredit':False,'truthBoundary':'P85 updates the exact P84 product projection with three build-relevant customer read-path modules. Database migration/schema are closure-critical but outside the historical build projection. This is local source identity only.'}
 write(out/'P85R1_CURRENT_PRODUCT_PROJECTION_MANIFEST.json',payload); return payload

def historical(root:Path,parent:Path,out:Path):
 candidates=[]
 for base in [parent/'receipts',parent/'artifacts/closure']:
  candidates += [p for p in base.rglob('*') if p.is_file()]
 for p in [parent/'artifacts/p80/P80_AUDIT_LOCAL_FIXTURE_NOT_CUSTOMER_FINAL.pdf',parent/'artifacts/p82/P82_LOCAL_READONLY_QUORUM_HARDENING_FIXTURE_RECEIPT.json']:
  if p.is_file(): candidates.append(p)
 unique={p.relative_to(parent).as_posix():p for p in candidates}; mism=[]
 for rel,p in sorted(unique.items()):
  q=root/rel
  if not q.is_file(): mism.append({'path':rel,'reason':'missing'})
  elif p.stat().st_size!=q.stat().st_size or sha(p)!=sha(q): mism.append({'path':rel,'reason':'changed','expectedSha256':sha(p),'actualSha256':sha(q)})
 payload={'schemaVersion':'velmere.p85r1.historical-receipt-immutability.v1','generatedAt':GENERATED_AT,'status':'PASS' if not mism else 'FAIL','verifiedHistoricalFiles':len(unique),'mismatchCount':len(mism),'mismatches':mism,'scope':['all P84-parent receipts','all P84-parent closure artifacts','P80 exact fixture PDF','P82 local quorum fixture receipt'],'truthBoundary':'Current tests were rerun, then all historical receipts/artifacts were restored byte-for-byte from the independently verified P84 parent. New evidence is stored only under P85 paths.'}
 if mism: raise RuntimeError(f'historical_mutation:{mism[:5]}')
 write(out/'P85R1_HISTORICAL_RECEIPT_IMMUTABILITY.json',payload); return payload

def test_aggregate(root:Path,out:Path):
 d=load(root/'receipts/p85/P85_CURRENT_SOURCE_REGRESSION_SUMMARY.json')
 if d.get('status')!='PASS' or d.get('aggregate')!={'passed':1161,'total':1161,'failedLanes':0}: raise RuntimeError('p85_regression_not_green')
 controls=[]
 for lane in d['lanes']:
  if lane['status']!='PASS' or lane['passed']!=lane['total']: raise RuntimeError(f'lane_fail:{lane}')
  p=root/lane['evidence']
  if not p.is_file(): raise RuntimeError(f'evidence_missing:{p}')
  controls.append({'label':lane['name'],'path':lane['evidence'],'sha256':sha(p),'checks':lane['total'],'passed':True,'status':'PASS'})
 payload={'schemaVersion':'velmere.p85r1.current-source-test-aggregate.v1','generatedAt':GENERATED_AT,'status':'PASS','controls':controls,'aggregateExecutedChecksAcrossOverlappingHarnesses':1161,'aggregateIndependenceClaim':False,'supersededHistoricalHarnesses':d['supersededHistoricalHarnesses'],'commandExecution':d['commandExecution'],'historicalReceiptsRewritten':False,'truthBoundary':'1161 is a deliberately non-duplicative current aggregate after replacing superseded P84/P80/P83/current-module lanes. It remains overlapping and is not an independent evidence, accuracy, provider, customer or FINAL numerator.'}
 write(out/'P85R1_TEST_AGGREGATE.json',payload); return payload

def pdf_receipt(root:Path,out:Path):
 unit=(root/'artifacts/p85/logs/EXACT_PDF_UNIT.log').read_text(errors='replace'); integ=(root/'artifacts/p85/logs/EXACT_PDF_INTEGRATION.log').read_text(errors='replace')
 if 'PASS (22/22)' not in unit or '# fail 0' not in unit: raise RuntimeError('pdf_unit_log_invalid')
 if 'PASS_P36_EXACT_CUSTOMER_PDF_STORAGE_TO_DELIVERY_INTEGRATION' not in integ or '"assertions": 55' not in integ or '# fail 0' not in integ: raise RuntimeError('pdf_integration_log_invalid')
 payload={'schemaVersion':'velmere.p85r1.exact-pdf-test-rerun.v1','generatedAt':GENERATED_AT,'status':'PASS','unit':{'assertions':22,'status':'PASS','logPath':'artifacts/p85/logs/EXACT_PDF_UNIT.log','logSha256':sha(root/'artifacts/p85/logs/EXACT_PDF_UNIT.log')},'integration':{'assertions':55,'status':'PASS','logPath':'artifacts/p85/logs/EXACT_PDF_INTEGRATION.log','logSha256':sha(root/'artifacts/p85/logs/EXACT_PDF_INTEGRATION.log'),'authorizedPostgresExecuted':False,'deployedHttpExecuted':False},'zeroFakeCredit':{'customerFinal':'0/20','auditFinalPdf':'0/3','deployedPreviewDownloadAccountParity':'WITHHELD','exactWindows':'WITHHELD'}}
 write(out/'P85R1_EXACT_PDF_TEST_RERUN.json',payload); return payload

def type_receipt(root:Path,out:Path):
 ts=root/'artifacts/p85/logs/P85_TARGETED_TYPESCRIPT.log'; imp=root/'artifacts/p85/logs/P85_CHANGED_MODULE_IMPORTS.log'
 if ts.read_bytes()!=b'': raise RuntimeError('targeted_ts_not_clean')
 text=imp.read_text(errors='replace')
 if 'P85 changed production module imports: PASS (3/3)' not in text: raise RuntimeError('imports_log_invalid')
 shutil.copyfile(ts,out/'P85R1_TARGETED_TYPESCRIPT.log'); shutil.copyfile(imp,out/'P85R1_CHANGED_MODULE_IMPORTS.log')
 payload={'schemaVersion':'velmere.p85r1.local-typescript-diagnostic.v1','generatedAt':GENERATED_AT,'status':'PASS_TARGETED_AND_CHANGED_MODULE_IMPORTS_WITHHELD_FULL_PROJECT','targetedStrictTypeScript':{'status':'PASS','command':'tsc --noEmit --target ES2022 --lib ES2022,DOM --module ESNext --moduleResolution Bundler --skipLibCheck --strict --noResolve scripts/p85/p85-targeted-types.d.ts lib/reporting/account-customer-artifact-owner-visible-read.ts','logSha256':sha(ts)},'currentRuntimeModuleImports':{'status':'PASS','moduleCount':3,'modules':PRODUCT_CHANGES,'logSha256':sha(imp)},'environment':{'node':subprocess.check_output(['node','--version'],text=True).strip(),'npm':subprocess.check_output(['npm','--version'],text=True).strip(),'tsc':subprocess.check_output(['tsc','--version'],text=True).strip().replace('Version ',''),'platform':f'{platform.system().lower()} {platform.machine()}','postgresBinary':shutil.which('postgres'),'psqlBinary':shutil.which('psql'),'dockerBinary':shutil.which('docker'),'supabaseCli':shutil.which('supabase')},'authorizedPostgresRuntime':'WITHHELD_NO_SERVER_BINARY_OR_NETWORK_RETRIEVAL','fullProjectSemanticTypeScript':'WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING','eslint':'WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING','dualProductionBuild':'WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING','exactWindows':'WITHHELD_ON_CURRENT_P85R1_BYTES'}
 write(out/'P85R1_LOCAL_TYPESCRIPT_DIAGNOSTIC.json',payload); return payload

def secret_scan(root:Path,source:dict,out:Path):
 findings=[]; scanned=[]
 for ch in source['changes']:
  rel=ch['path']; p=root/rel
  if ch['change']=='DELETED' or not p.is_file(): continue
  scanned.append(rel); data=p.read_bytes()
  if PRIVATE_KEY_BLOCK_RE.search(data): findings.append({'path':rel,'pattern':'private_key_block'})
  for name,pat in TOKEN_PATTERNS.items():
   if pat.search(data): findings.append({'path':rel,'pattern':name})
 payload={'schemaVersion':'velmere.p85r1.targeted-secret-scan.v1','generatedAt':GENERATED_AT,'status':'PASS' if not findings else 'FAIL','scannedChangedFiles':len(scanned),'matches':len(findings),'findings':findings,'fullPackageRescanRequiredAtBuild':True}
 if findings: raise RuntimeError(f'secret_findings:{findings[:5]}')
 write(out/'P85R1_TARGETED_SECRET_SCAN.json',payload); return payload

def checkpoint(root:Path,out:Path,proj,src,tests,secrets,history):
 rt=load(root/'receipts/p85/P85_OWNER_VISIBLE_CUSTOMER_ARTIFACT_RUNTIME.json'); rep=load(root/'receipts/p85/P85_OWNER_VISIBLE_CUSTOMER_ARTIFACT_REPEATABILITY.json'); st=load(root/'receipts/p85/P85_OWNER_VISIBLE_CUSTOMER_ARTIFACT_STATIC.json')
 payload={'schemaVersion':'velmere.p85r1.checkpoint-receipt.v1','generatedAt':GENERATED_AT,'status':'PASS_BOUNDED_P85R1_AUDIT_DATABASE_ENFORCED_PUBLICATION_VISIBILITY_OWNER_RPC','canonicalBinding':{'directiveFile':DIRECTIVE_FILE,'directiveSha256':DIRECTIVE_SHA256,'directiveChanged':False,'directiveChangeReason':'V17 already requires object-level authorization, immutable stored bytes and fail-closed delivery. P85 closes an implementation gap without authority churn.','parentCheckpoint':'P84R1','parentLedgerSha256':PARENT_LEDGER_SHA256,'parentLedgerBytes':PARENT_LEDGER_BYTES,'parentSourceOnlySha256':PARENT_ZIP_SHA256,'parentSourceOnlyBytes':PARENT_ZIP_BYTES,'parentSourceOnlyEntries':PARENT_ZIP_ENTRIES},'productProjection':proj['currentCandidateProjection'],'discoveredDefects':st['discoveredDefects'],'physicalChanges':{'deltaFilesOutsideSelfGeneratedClosure':src['changeCount'],'buildRelevantChangedFiles':len(PRODUCT_CHANGES),'databaseRlsPublicationBoundaryAdded':True,'ownerScopedSecurityInvokerListRpc':'velmere_list_owner_visible_customer_artifacts_v1','ownerScopedSecurityInvokerGetRpc':'velmere_get_owner_visible_customer_artifact_v1','callerAccountIdParameterAccepted':False,'directTableCallsInDurableReadHelper':0,'publicationVisibilityFilteredBeforeLimit':True,'routeNPlusOneRemoved':True,'previewAccountRejectedByDurableReadHelper':True,'p84WriteBoundaryByteFrozen':True,'historicalReceiptsByteIdentical':history['status']=='PASS','runtimeReceiptRepeatability':rep['status']},'localDeterministicFixture':{'classification':rt['classification'],'status':rt['status'],'runtimeChecks':rt['checks']['total'],'repeatabilityChecks':rep['checks']['total'],'staticChecks':st['checks']['total'],'rpcModel':rt['implementation'],'fixtures':rt['fixtures'],'customerFinalEligible':False,'auditFinalPdfEligible':False},'controls':tests['controls'],'aggregateExecutedChecksAcrossOverlappingHarnesses':1161,'aggregateIndependenceClaim':False,'environment':{'localNode':rt['runtime']['node'],'localNpm':subprocess.check_output(['npm','--version'],text=True).strip(),'localTsc':subprocess.check_output(['tsc','--version'],text=True).strip().replace('Version ',''),'platform':f'{platform.system().lower()} {platform.machine()}','authorizedPostgresMigrationExecuted':False,'realRlsJwtTwoAccountIsolationExecuted':False,'directPostgrestOrphanDenialExecuted':False,'deployedHttpExecuted':False,'currentExternalRpcQuorumExecuted':False,'semanticTypeScriptCurrentBytes':'WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING','eslintCurrentBytes':'WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING','dualProductionBuildCurrentBytes':'WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING','exactWindowsCurrentBytes':'WITHHELD'},'targetedSecretScan':{'status':secrets['status'],'matches':secrets['matches']},'securityBoundary':{'externalTransactionSent':False,'stateChangePerformedOnExternalChain':False,'liveExploitPerformed':False,'weaponizedPocCreated':False,'authorizationBypassAttempted':False,'rawSolidityAbiRuntimeTraceStateRedistributed':False,'fullInternalMessageExposedToCustomer':False},'zeroFakeCredit':{'customerFinal':'0/20','auditFinalPdf':'0/3','rights':'2/203 inherited only','paidValue':'0/10','saleEligible':'0/20','live':False,'global':'NO_GO / STOP_SELL'},'nextBlocker':'Apply P83/P84/P85 migrations on an authorized staging PostgreSQL/Supabase instance; prove service-role publication, authenticated owner visibility only after exact link commit, anon/cross-owner denial, direct PostgREST orphan snapshot/blob denial, >50-orphan starvation resistance, full rollback, and deployed preview/download/account byte identity. Current BSC quorum, offline replay, rights/currentness and exact Windows remain separate gates.','truthBoundary':'P85 proves source/static and mocked owner-token RPC behavior. It does not execute PostgreSQL/Supabase, real JWT/RLS, PostgREST, deployed HTTP, current chain facts, exploitability, rights expansion, Customer FINAL or Audit FINAL PDF.'}
 write(out/'P85R1_CHECKPOINT_RECEIPT.json',payload); return payload

def recipe(root:Path,out:Path):
 current=len([p for p in root.rglob('*') if p.is_file()]); payload={'schemaVersion':'velmere.p85r1.deterministic-package-recipe.v1','generatedAt':GENERATED_AT,'status':'READY_FOR_DETERMINISTIC_BUILD','outputName':OUTPUT_NAME,'entryOrdering':'lexicographic_posix_relative_path','directoryEntries':False,'timestamp':'1980-01-01T00:00:00Z','createSystem':0,'externalMode':'0600','compression':'ZIP_DEFLATED','compressionLevel':1,'expectedEntryCountIncludingIdentityReceipt':current+2,'ledgerInsideZip':False,'identityReceipt':IDENTITY_REL,'identityReceiptExcludesOnlySelf':True}
 write(out/'P85R1_PACKAGE_BUILD_RECIPE.json',payload); return payload

def tree_identity(root:Path,out:Path,rec):
 rows=all_rows(root,exclude_identity=True); p=projection(rows); payload={'schemaVersion':'velmere.p85r1.tree-identity-excluding-self.v1','generatedAt':GENERATED_AT,'status':'PASS',**p,'fullPackageFileCountIncludingThisIdentityFile':len(rows)+1,'excludedPath':IDENTITY_REL,'excludedOnlySelf':True}
 if payload['fullPackageFileCountIncludingThisIdentityFile']!=rec['expectedEntryCountIncludingIdentityReceipt']: raise RuntimeError('recipe_count_mismatch')
 write(out/'P85R1_TREE_IDENTITY_EXCLUDING_SELF.json',payload)
 if len([p for p in root.rglob('*') if p.is_file()])!=payload['fullPackageFileCountIncludingThisIdentityFile']: raise RuntimeError('identity_final_count_mismatch')
 return payload

def main():
 ap=argparse.ArgumentParser(); ap.add_argument('--root',required=True); ap.add_argument('--parent',required=True); a=ap.parse_args(); root=Path(a.root).resolve(); parent=Path(a.parent).resolve(); out=root/'artifacts/closure/p85r1'
 if out.exists(): shutil.rmtree(out)
 out.mkdir(parents=True)
 if sha(root/DIRECTIVE_FILE)!=DIRECTIVE_SHA256: raise RuntimeError('directive_hash_mismatch')
 (root/'VELMERE_ACTIVE_PASS.txt').write_text('VELMERE_P85R1_AUDIT_DATABASE_ENFORCED_PUBLICATION_VISIBILITY_OWNER_RPC_NO_CUSTOMER_FINAL_OR_PDF_FINAL_CREDIT\n',encoding='utf-8')
 src=source_changes(root,parent,out); proj=product_projection(root,out); hist=historical(root,parent,out); tests=test_aggregate(root,out); pdf_receipt(root,out); type_receipt(root,out); sec=secret_scan(root,src,out); checkpoint(root,out,proj,src,tests,sec,hist); rec=recipe(root,out); ident=tree_identity(root,out,rec)
 print(json.dumps({'status':'PASS','closureDirectory':out.relative_to(root).as_posix(),'sourceChanges':src['changeCount'],'productProjection':proj['currentCandidateProjection'],'testAggregate':1161,'historicalFiles':hist['verifiedHistoricalFiles'],'treeIdentity':ident},indent=2))
if __name__=='__main__': main()
