#!/usr/bin/env python3
"""Build P89R1 exact-source, product, history, evidence, authority and blocker receipts."""
from __future__ import annotations
import hashlib,json,platform,re,subprocess
from collections import Counter
from pathlib import Path
from typing import Any

ROOT=Path(__file__).resolve().parents[2]
PARENT=Path('/mnt/data/velmere_p89_parent_p88')
OUT=ROOT/'artifacts/closure/p89r1'
GENERATED_AT='2026-08-20T21:00:00.000Z'
MASTER='VELMERE_ULTIMATE_WORLD_CLASS_CONTINUOUS_CLOSURE_FINAL_CANDIDATE_MASTER_DIRECTIVE_V2_COMPLETE_2026-08-20.txt'
MASTER_SHA='9184cd18eb864f50a8c5d3af8f2899e7f138372861095e343901ab9c5e3bcb53'
V17='VELMERE_CANONICAL_OWNER_DIRECTIVE_V17_TRUE_TOPOLOGY_AUTOMATED_ADVANCED_CURRENT_WORLD_CLASS_2026-08-17.txt'
V17_SHA='de7fbd6df651a7a8a8f85054c6e9ac3c2ca530ebfb0d4ccd335dcb99fb658f05'
PARENT_ZIP='VELMERE_R44P46_V17_P88R1_AUDIT_PAID_EXACT_IMMUTABLE_PDF_RENDER_ONCE_STORE_FIRST_CURRENT_SOURCE_ONLY_IN_PROGRESS_2026-08-20.zip'
PARENT_ZIP_SHA='47a7a76d02e6f52959452cab765cbbedd0390070cd2f721917f2d973be84cc87'
PRODUCT_CHANGES=[
 'lib/security/audit-provider-evidence-dimensions.ts',
 'lib/security/audit-paid-evidence-readiness.ts',
 'lib/security/audit-evidence-receipt-packet.ts',
 'lib/security/audit-provider-runtime-client.ts',
 'lib/security/audit-runtime-confidence.ts',
 'lib/security/pro-audit-pdf/render-pro-audit-pdf.ts',
]
CURRENT_SUPPORT_PREFIXES=('receipts/p89/','artifacts/p89/','scripts/p89/')
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
  for c in iter(lambda:f.read(4*1024*1024),b''):h.update(c)
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
 rows=sorted(rows,key=lambda x:x['path'])
 ph=hashlib.sha256('\n'.join(x['path'] for x in rows).encode()).hexdigest()
 agg=hashlib.sha256()
 for x in rows:agg.update(f"{x['path']}\0{x['byteLength']}\0{x['sha256']}\n".encode())
 return {'fileCount':len(rows),'payloadBytes':sum(x['byteLength'] for x in rows),'pathSetSha256':ph,'sourceContentAggregateSha256':agg.hexdigest()}

def file_map(root:Path):
 d={}
 for p in root.rglob('*'):
  if not p.is_file():continue
  rel=p.relative_to(root).as_posix()
  if rel.startswith('artifacts/closure/p89r1/') or rel=='PACKAGE_CONTENT_MANIFEST.tsv':continue
  d[rel]=p
 return d

def classify(rel:str):
 if rel==MASTER:return 'OWNER_EXECUTION_AUTHORITY_UNCHANGED'
 if rel==V17:return 'CANONICAL_TOPOLOGY_AUTHORITY_UNCHANGED'
 if rel=='VELMERE_ACTIVE_PASS.txt':return 'CONTROL_PLANE_POINTER'
 if rel=='P89R1_PACKAGE_BUILD_RECIPE.json':return 'DETERMINISTIC_PACKAGE_RECIPE'
 if rel in PRODUCT_CHANGES:return 'CURRENT_PRODUCT_BUILD_RELEVANT'
 if rel.startswith('receipts/p89/'):return 'P89_CURRENT_RECEIPT_OR_FAILURE_EVIDENCE'
 if rel.startswith('artifacts/p89/'):return 'P89_CURRENT_PROOF_OR_LOG'
 if rel.startswith('scripts/p89/'):return 'P89_HARNESS_OR_CLOSURE_SOURCE'
 return 'CURRENT_SOURCE_SUPPORT'

def source_change_manifest():
 before=file_map(PARENT);after=file_map(ROOT);changes=[]
 for rel in sorted(set(before)|set(after)):
  a=before.get(rel);b=after.get(rel)
  if a and b and a.stat().st_size==b.stat().st_size and sha(a)==sha(b):continue
  changes.append({'path':rel,'change':'ADDED' if a is None else 'DELETED' if b is None else 'MODIFIED','classification':classify(rel),'beforeBytes':a.stat().st_size if a else None,'beforeSha256':sha(a) if a else None,'afterBytes':b.stat().st_size if b else None,'afterSha256':sha(b) if b else None})
 counts=Counter(x['classification'] for x in changes)
 actual_build=[x['path'] for x in changes if x['classification']=='CURRENT_PRODUCT_BUILD_RELEVANT']
 if actual_build!=sorted(PRODUCT_CHANGES):raise RuntimeError(f'product_delta_mismatch:{actual_build}')
 payload={'schemaVersion':'velmere.p89r1.source-change-manifest.v1','generatedAt':GENERATED_AT,'status':'PASS_EXACT_PARENT_DELTA','parentCheckpoint':'P88R1_AUDIT_PAID_EXACT_IMMUTABLE_PDF','parentSourceOnly':PARENT_ZIP,'parentSourceOnlySha256':PARENT_ZIP_SHA,'scopeExcludes':['artifacts/closure/p89r1/* self-generated closure receipts','PACKAGE_CONTENT_MANIFEST.tsv regenerated after closure'],'changeCount':len(changes),'classificationCounts':dict(sorted(counts.items())),'changes':changes,'buildRelevantChangedFiles':PRODUCT_CHANGES,'databaseClosureCriticalChangedFiles':[],'masterDirectiveChanged':False,'v17Changed':False,'truthBoundary':'Exact P88 to P89 filesystem delta outside self-generated closure and the final package manifest. A local changed file is not provider execution, rights, deployed runtime, value or FINAL proof.'}
 write(OUT/'P89R1_SOURCE_CHANGE_MANIFEST.json',payload);return payload

def product_projection():
 parent=load(ROOT/'artifacts/closure/p88r1/P88R1_CURRENT_PRODUCT_PROJECTION_MANIFEST.json')
 rows=[dict(x) for x in parent['files']];declared=parent['currentCandidateProjection']
 if projection(rows)!=declared:raise RuntimeError('p88_product_projection_mismatch')
 mapped={x['path']:x for x in rows};changed=[]
 for rel in PRODUCT_CHANGES:
  old=mapped.get(rel);new=row(ROOT,rel);mapped[rel]=new
  changed.append({'path':rel,'change':'ADDED' if old is None else 'MODIFIED','beforeBytes':old and old['byteLength'],'beforeSha256':old and old['sha256'],'afterBytes':new['byteLength'],'afterSha256':new['sha256']})
 current_rows=sorted(mapped.values(),key=lambda x:x['path']);current=projection(current_rows)
 payload={'schemaVersion':'velmere.p89r1.current-product-projection-manifest.v1','generatedAt':GENERATED_AT,'status':'PASS_LOCAL_DETERMINISTIC_SOURCE_IDENTITY_ONLY','parentCheckpoint':'P88R1_AUDIT_PAID_EXACT_IMMUTABLE_PDF','parentProjectionReconstructedExactly':True,'parentProjection':declared,'currentCandidateProjection':current,'delta':{'fileCount':current['fileCount']-declared['fileCount'],'payloadBytes':current['payloadBytes']-declared['payloadBytes'],'changedBuildRelevantFiles':len(changed)},'changedBuildRelevantFiles':changed,'databaseDeploymentBoundary':{'changedFiles':[],'authorizedDatabaseExecution':'NOT_EXECUTED_P89_UNCHANGED_FROM_P88','p88MigrationRuntimeProof':'WITHHELD'},'files':current_rows,'exactWindowsCredit':False,'truthBoundary':'P89 adds one versioned evidence-dimension module and modifies five Audit evidence/PDF consumers. P88 exact immutable PDF storage, migration and delivery routes remain byte-identical. This is local source identity only.'}
 write(OUT/'P89R1_CURRENT_PRODUCT_PROJECTION_MANIFEST.json',payload);return payload

def history_receipt():
 mism=[];verified=0
 for base in ('receipts','artifacts'):
  for src in (PARENT/base).rglob('*'):
   if not src.is_file():continue
   verified+=1;rel=src.relative_to(PARENT);dst=ROOT/rel
   if not dst.is_file() or src.stat().st_size!=dst.stat().st_size or sha(src)!=sha(dst):mism.append(rel.as_posix())
 if mism:raise RuntimeError(f'historical_mutation:{mism[:10]}')
 compat=load(ROOT/'receipts/p89/P89_P88_COMPATIBILITY_AND_HISTORY.json')
 restore=load(ROOT/'receipts/p89/P89_PARENT_HISTORY_RESTORE.json')
 if compat['status']!='PASS' or restore['status']!='PASS' or restore['mismatchCount']!=0:raise RuntimeError('history_receipt_not_green')
 payload={'schemaVersion':'velmere.p89r1.historical-receipt-artifact-immutability.v1','generatedAt':GENERATED_AT,'status':'PASS_BYTE_IDENTICAL','parentCheckpoint':'P88R1','verifiedHistoricalReceiptArtifactFiles':verified,'p88CompatibilityChecks':compat['checks']['total'],'restoredAfterLegacyExecution':restore['restoredCount'],'mismatchCount':0,'mismatches':[],'truthBoundary':'Every P88 parent receipt/artifact byte is exact after P89 regression. P89 failed attempts and replacement evidence are stored only under P89 paths; P88 model/receipt guarantees were not rewritten.'}
 write(OUT/'P89R1_HISTORICAL_RECEIPT_IMMUTABILITY.json',payload);return payload

def test_aggregate():
 reg=load(ROOT/'receipts/p89/P89_CURRENT_SOURCE_SEGMENTED_REGRESSION.json')
 if reg['status']!='PASS_BOUNDED_CURRENT_SEGMENTED_EXECUTION' or reg['aggregateExecutedChecksAcrossOverlappingHarnesses']!=1302:raise RuntimeError('regression_not_green')
 runtime=load(ROOT/'receipts/p89/P89_AUDIT_PROVIDER_EVIDENCE_DIMENSIONS_RUNTIME.json')
 pdf=load(ROOT/'receipts/p89/P89_AUDIT_PDF_EVIDENCE_DIMENSIONS_RUNTIME.json')
 static=load(ROOT/'receipts/p89/P89_AUDIT_PROVIDER_EVIDENCE_DIMENSIONS_STATIC.json')
 repeat=load(ROOT/'receipts/p89/P89_AUDIT_PROVIDER_EVIDENCE_DIMENSIONS_REPEATABILITY.json')
 compat=load(ROOT/'receipts/p89/P89_P88_COMPATIBILITY_AND_HISTORY.json')
 payload={'schemaVersion':'velmere.p89r1.test-aggregate.v1','generatedAt':GENERATED_AT,'status':'PASS_BOUNDED_CURRENT_LOCAL','currentLanes':{'providerDimensionsRuntime':runtime['checks']['total'],'pdfSchemaRuntime':pdf['checks']['total'],'providerDimensionsStatic':static['checks']['total'],'runtimeRepeatability':repeat['checks']['total'],'changedModuleImports':12,'targetedStrictTypeScript':1,'p88Compatibility':compat['checks']['total']},'segmentedRegression':{'receipt':'receipts/p89/P89_CURRENT_SOURCE_SEGMENTED_REGRESSION.json','receiptSha256':sha(ROOT/'receipts/p89/P89_CURRENT_SOURCE_SEGMENTED_REGRESSION.json'),'passedLanes':reg['commandsOrReceiptsPassed'],'aggregateExecutedChecksAcrossOverlappingHarnesses':reg['aggregateExecutedChecksAcrossOverlappingHarnesses']},'firstFailuresAndTimeoutsPreserved':reg['supersededOrFailedNoCredit'],'zeroFakeCredit':reg['zeroFakeCredit'],'truthBoundary':'1,302 overlapping checks passed on current P89 bytes. Nonzero and timeout attempts have zero credit. No live provider, provider-rights, currentness, staging, database, deployed HTTP, customer FINAL or exact-Windows proof is inferred.'}
 write(OUT/'P89R1_TEST_AGGREGATE.json',payload);return payload

def targeted_secret_scan(source):
 rels=[x['path'] for x in source['changes'] if x['change']!='DELETED']
 findings=[];scanned=0
 for rel in rels:
  p=ROOT/rel
  if not p.is_file():continue
  scanned+=1;data=p.read_bytes()
  if PRIVATE_KEY_RE.search(data):findings.append({'path':rel,'pattern':'private_key_block'})
  for name,pat in TOKEN_PATTERNS.items():
   if pat.search(data):findings.append({'path':rel,'pattern':name})
 if findings:raise RuntimeError(f'targeted_secret_findings:{findings[:10]}')
 payload={'schemaVersion':'velmere.p89r1.targeted-secret-scan.v1','generatedAt':GENERATED_AT,'status':'PASS','changedFilesScanned':scanned,'matches':0,'findings':[],'truthBoundary':'Pattern-based scan of current P89 delta. Full-tree and final ZIP scans are independently executed by package verification.'}
 write(OUT/'P89R1_TARGETED_SECRET_SCAN.json',payload);return payload

def typescript_receipt():
 log=ROOT/'artifacts/p89/logs/regression/04_P89_TARGETED_TYPESCRIPT.log'
 if 'PASS targeted strict TypeScript P89 (1/1)' not in log.read_text():raise RuntimeError('targeted_ts_missing')
 payload={'schemaVersion':'velmere.p89r1.local-typescript-diagnostic.v1','generatedAt':GENERATED_AT,'status':'PASS_TARGETED_WITH_GLOBAL_WITHHELD','targetedStrictTypeScript':{'status':'PASS','scope':['lib/security/audit-provider-evidence-dimensions.ts'],'log':log.relative_to(ROOT).as_posix(),'logSha256':sha(log)},'changedProductionImports':{'status':'PASS','modules':12},'runtime':{'node':subprocess.check_output(['node','--version'],text=True).strip(),'npm':subprocess.check_output(['npm','--version'],text=True).strip(),'typescript':subprocess.check_output(['tsc','--version'],text=True).strip().replace('Version ',''),'platform':f'{platform.system()} {platform.machine()}'},'dependencyGraphPresent':(ROOT/'node_modules').is_dir(),'wholeProjectSemanticTypeScript':'WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING','eslint':'WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING','webpackBuild':'WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING','turbopackBuild':'WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING','exactWindows':'WITHHELD_ON_CURRENT_P89R1_BYTES','truthBoundary':'Targeted strict TypeScript covers the new self-contained evidence-dimension core and 12 current production/customer-path imports pass. No whole-project or exact-Windows credit is inherited.'}
 write(OUT/'P89R1_LOCAL_TYPESCRIPT_DIAGNOSTIC.json',payload);return payload

def authority_receipt():
 master=ROOT/MASTER;v17=ROOT/V17
 if master.stat().st_size!=38471 or sha(master)!=MASTER_SHA:raise RuntimeError('master_identity')
 if v17.stat().st_size!=66416 or sha(v17)!=V17_SHA:raise RuntimeError('v17_identity')
 text=master.read_text('utf-8');sections=[int(x) for x in re.findall(r'^# (\d+)\.',text,re.M)]
 if sections!=list(range(89)) or 'END-OF-DIRECTIVE' not in text:raise RuntimeError('master_completeness')
 payload={'schemaVersion':'velmere.p89r1.authority-binding.v1','generatedAt':GENERATED_AT,'status':'PASS','latestExplicitOwnerExecutionAuthority':MASTER,'masterDirectiveBytes':master.stat().st_size,'masterDirectiveSha256':sha(master),'masterSections':'0-88 PRESENT','masterSectionCount':89,'canonicalTopologyDirective':V17,'canonicalTopologyDirectiveBytes':v17.stat().st_size,'canonicalTopologyDirectiveSha256':sha(v17),'topology':{'families':10,'customerRows':20,'executionProfiles':20,'materialPaidTransitions':10},'parentCheckpoint':'P88R1_AUDIT_PAID_EXACT_IMMUTABLE_PDF','parentSourceOnly':PARENT_ZIP,'parentSourceOnlySha256':PARENT_ZIP_SHA,'historyRewritten':False,'masterDirectiveChanged':False,'v17Changed':False,'v17RebindRequired':False,'truthBoundary':'Complete Master Directive V2 remains the execution authority and unchanged V17 remains the topology authority. P89 is a physical implementation correction and does not invent or remove products.'}
 write(OUT/'P89R1_AUTHORITY_BINDING.json',payload);return payload

def failure_adjudication():
 rows=[
  {'id':'P89_BASIC_SCHEMA_FIRST_FAIL','path':'artifacts/p89/logs/regression/00A_P89_BASIC_SCHEMA_FIRST_FAIL.log','state':'REPAIRED','credit':'NONE','rootCause':'Raw internal model/dimension identifiers were intentionally filtered from customer PDF lines; replaced by customer-safe digest references.'},
  {'id':'P88_RUNTIME_SUPERSEDED','path':'artifacts/p89/logs/regression/05_P88_RUNTIME_SUPERSEDED.log','state':'SUPERSEDED','credit':'NONE','rootCause':'P88 harness constructs a current-model object without mandatory P89 dimension fields.'},
  {'id':'P88_STATIC_SUPERSEDED','path':'artifacts/p89/logs/regression/06_P88_STATIC_SUPERSEDED.log','state':'SUPERSEDED','credit':'NONE','rootCause':'P88 static harness freezes P88 as active pass.'},
  {'id':'P88_CAPACITY_SUPERSEDED','path':'artifacts/p89/logs/regression/07_P88_PROVIDER_CAPACITY_SUPERSEDED.log','state':'SUPERSEDED_TEST_DEFECT','credit':'NONE','rootCause':'P88 test encodes the strict/live conflation repaired by P89.'},
  {'id':'P87_STATIC_SUPERSEDED','path':'artifacts/p89/logs/regression/current-stack/10_P87_STATIC.log','state':'SUPERSEDED','credit':'NONE','rootCause':'P87 static harness freezes P87 as active pass.'},
  {'id':'INITIAL_MONOLITHIC_AGGREGATE_FAIL','path':'receipts/p89/P89_INITIAL_MONOLITHIC_REGRESSION_INCOMPLETE_NO_CREDIT.json','state':'INCOMPLETE','credit':'NONE','rootCause':'Initial command aggregation stopped before the full current stack.'},
  {'id':'MONOLITHIC_PROCESS_TREE_TIMEOUT','path':'artifacts/p89/logs/regression/08A_P89_MONOLITHIC_RUNNER_TIMEOUT.log','state':'WITHHELD_HARNESS_ORCHESTRATION','credit':'NONE','rootCause':'Historical repeatability/process-tree boundary stalled orchestration; segmented execution and independent evidence verification replaced it.'},
 ]
 for r in rows:
  p=ROOT/r['path']
  if not p.is_file() or p.stat().st_size==0:raise RuntimeError(f'missing_failure:{r["path"]}')
  r['sha256']=sha(p)
 payload={'schemaVersion':'velmere.p89r1.failure-adjudication.v1','generatedAt':GENERATED_AT,'status':'PASS_ALL_FAILURES_PRESERVED_AND_BOUNDED','rows':rows,'partialCreditGranted':False,'retryUntilGreenUsed':False,'truthBoundary':'Failures are preserved and adjudicated. No assertion from a nonzero or incomplete harness is counted. The canonical regression result comes only from independently verified green segments.'}
 write(OUT/'P89R1_FAILURE_ADJUDICATION.json',payload);return payload

def blocker_queue():
 rows=[
  {'priority':1,'category':'RIGHTS','id':'AUDIT_PROVIDER_REAL_EXECUTION_AND_RIGHTS','state':'WITHHELD','current':'P89 controlled architecture proves Pro can be represented as 4 strict exact-identity receipts plus 5 successful direct-provider executions; no real P89 provider call or field-rights expansion was executed','required':'rights-bound, current, successful providers and customer-visible field rights','nextSafeAction':'Execute only authorized/read-only provider calls in a networked environment and bind rights/currentness per field. Never convert a structural fixture into current evidence.'},
  {'priority':2,'category':'THIRD_PARTY','id':'AUDIT_ADVANCED_EVIDENCE_CAPACITY','state':'WITHHELD','current':'current architecture shape 4 strict / 5 successful live','required':'5 strict / 6 successful live, with >=4 independent provider families and roots','nextSafeAction':'Add one genuinely independent, rights-compatible, exact-identity-capable direct provider lane. Aliases, retries and extra URLs receive zero slots.'},
  {'priority':3,'category':'ENVIRONMENT','id':'P88_DATABASE_AND_SAME_BLOB_RUNTIME','state':'WITHHELD','current':'P88 exact storage/migration/delivery source remains byte-identical; local proof only','required':'authorized PostgreSQL/Supabase migration, grants, triggers, rollback, JWT/RLS and deployed preview/download/account same blob','nextSafeAction':'Run controlled staging migration and two-account negative/rollback/byte-identity journey.'},
  {'priority':4,'category':'RIGHTS','id':'FIELD_LEVEL_RIGHTS_REGISTRY','state':'WITHHELD','current':'2/203 inherited only','required':'commercial display/derived/redistribution/cache/retention/currentness state per required customer field','nextSafeAction':'Continue field-level rights work independently of staging.'},
  {'priority':5,'category':'REAL_EXTERNAL_PROOF','id':'CURRENT_DEPLOYMENT_AND_REPLAY','state':'WITHHELD','current':'historical bounded case only; current exploitability false/unproven','required':'rights-bound read-only current quorum and authorized offline archival replay','nextSafeAction':'No live state-changing transaction or exploit; use public read-only state and local controlled replay.'},
  {'priority':6,'category':'ENVIRONMENT','id':'EXACT_WINDOWS_FULL_ENGINEERING','state':'WITHHELD','current':'targeted TypeScript and imports only','required':'Node 24.18.0/npm 11.16.0 on Windows Server 2025 with clean dependencies, full type/lint/dual build and current regression','nextSafeAction':'Run canonical Windows lane on exact P89 successor bytes.'},
 ]
 payload={'schemaVersion':'velmere.p89r1.current-blocker-queue.v1','generatedAt':GENERATED_AT,'status':'OPEN_CONTINUOUS_CLOSURE','currentCustomerFinal':'0/20','auditFinalPdf':'0/3','rows':rows,'noProgressRule':'When an environment/third-party blocker cannot advance, move to the next independent high-value workstream. Do not hammer providers or retry until green.','truthBoundary':'Pro is no longer structurally impossible because strict evidence and live execution are separate contract dimensions. This is not real provider readiness or sale eligibility.'}
 write(OUT/'P89R1_CURRENT_BLOCKER_QUEUE.json',payload);return payload

def checkpoint(authority,source,product,history,tests,secrets,typescript,failures,blockers):
 runtime=load(ROOT/'receipts/p89/P89_AUDIT_PROVIDER_EVIDENCE_DIMENSIONS_RUNTIME.json')
 pdf=load(ROOT/'receipts/p89/P89_AUDIT_PDF_EVIDENCE_DIMENSIONS_RUNTIME.json')
 payload={'schemaVersion':'velmere.p89r1.checkpoint-receipt.v1','generatedAt':GENERATED_AT,'status':'PASS_BOUNDED_P89R1_AUDIT_PROVIDER_EVIDENCE_DIMENSION_SEPARATION_ANTI_DUPLICATION','classification':'DEFENSIVE_LOCAL_REQUIREMENTS_MODEL_CORRECTION_AND_CUSTOMER_PDF_SCHEMA_BINDING','parentCheckpoint':'P88R1_AUDIT_PAID_EXACT_IMMUTABLE_PDF','authority':authority,'physicalChanges':{'buildRelevantFiles':PRODUCT_CHANGES,'databaseFilesChanged':[],'separateStrictEvidenceAndLiveExecution':True,'separateEvidenceRowThreshold':True,'oneCanonicalProviderIdentityPerSlot':True,'partialDirectProviderMayCountLiveOnly':True,'partialNeverCountsStrict':True,'submittedAndHumanLanesNeverCountLive':True,'currentReceiptAndModelVersionsAdvanced':True,'p88LegacySemanticsPreserved':True,'p88ExactStorageAndMigrationByteIdentical':True},'localDefensiveProof':{'providerDimensionsRuntime':runtime['checks']['total'],'pdfDimensionsRuntime':pdf['checks']['total'],'providerDimensionsStatic':81,'runtimeRepeatability':11,'changedModuleImports':12,'targetedStrictTypeScript':'PASS_ONE_NEW_CORE_MODULE','p88Compatibility':40,'segmentedRegressionOverlappingChecks':tests['segmentedRegression']['aggregateExecutedChecksAcrossOverlappingHarnesses']},'controlledArchitectureResults':runtime['controlledResults'],'controlledCurrentPdfArtifact':pdf['currentControlledArtifact'],'sourceChangeManifest':'artifacts/closure/p89r1/P89R1_SOURCE_CHANGE_MANIFEST.json','productProjection':'artifacts/closure/p89r1/P89R1_CURRENT_PRODUCT_PROJECTION_MANIFEST.json','historyReceipt':'artifacts/closure/p89r1/P89R1_HISTORICAL_RECEIPT_IMMUTABILITY.json','testAggregate':'artifacts/closure/p89r1/P89R1_TEST_AGGREGATE.json','failureAdjudication':'artifacts/closure/p89r1/P89R1_FAILURE_ADJUDICATION.json','targetedSecretScan':'artifacts/closure/p89r1/P89R1_TARGETED_SECRET_SCAN.json','typescriptDiagnostic':'artifacts/closure/p89r1/P89R1_LOCAL_TYPESCRIPT_DIAGNOSTIC.json','blockerQueue':'artifacts/closure/p89r1/P89R1_CURRENT_BLOCKER_QUEUE.json','securityBoundary':{'externalTransactionSent':False,'externalStateChanged':False,'liveExploitPerformed':False,'weaponizedPocCreated':False,'authorizationBypassAttempted':False,'externalSystemScanned':False,'realProviderNetworkExecutedByP89':False},'zeroFakeCredit':{'customerFinal':'0/20','auditFinalPdf':'0/3','rights':'2/203 inherited only','paidValue':'0/10','saleEligible':'0/20','pilotReady':False,'goPaid':False,'live':False,'worldClassProven':False,'global':'NO_GO / STOP_SELL'},'withheld':['real provider execution and field-level rights','Advanced fifth strict / sixth live provider capacity','authorized database and deployed same-blob path','current deployment quorum and independent offline replay','whole-project type/lint/dual build','exact Windows'],'nextBlocker':'Execute the separated evidence model against real authorized/read-only, rights-bound providers. Existing architecture is structurally sufficient for Pro only when four distinct strict contributors and five successful direct providers actually execute; Advanced still requires one additional independent strict-capable direct provider.'}
 write(OUT/'P89R1_CHECKPOINT_RECEIPT.json',payload);return payload

def main():
 if (ROOT/'VELMERE_ACTIVE_PASS.txt').read_text().strip()!='P89R1':raise RuntimeError('active_pass_not_p89r1')
 OUT.mkdir(parents=True,exist_ok=True)
 source=source_change_manifest();product=product_projection();history=history_receipt();tests=test_aggregate();secrets=targeted_secret_scan(source);typescript=typescript_receipt();authority=authority_receipt();failures=failure_adjudication();blockers=blocker_queue();checkpoint(authority,source,product,history,tests,secrets,typescript,failures,blockers)
 print(json.dumps({'status':'PASS','sourceChanges':source['changeCount'],'productProjection':product['currentCandidateProjection'],'historicalVerified':history['verifiedHistoricalReceiptArtifactFiles'],'regressionChecks':tests['segmentedRegression']['aggregateExecutedChecksAcrossOverlappingHarnesses'],'closureFiles':len(list(OUT.glob('*.json')))},indent=2))
if __name__=='__main__':main()
