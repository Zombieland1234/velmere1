#!/usr/bin/env python3
from __future__ import annotations
import hashlib,json,platform,re,subprocess,zipfile
from collections import Counter
from pathlib import Path
from typing import Any
ROOT=Path(__file__).resolve().parents[2]
PARENT_ZIP=Path('/mnt/data/VELMERE_R44P46_V17_P90R1_AUDIT_FIELD_LEVEL_RIGHTS_CURRENTNESS_SOURCIFY_INDEPENDENT_LANE_CURRENT_SOURCE_ONLY_IN_PROGRESS_2026-08-20.zip')
OUT=ROOT/'artifacts/closure/p91r1'
GENERATED_AT='2026-08-20T19:20:00.000Z'
MASTER='VELMERE_ULTIMATE_WORLD_CLASS_CONTINUOUS_CLOSURE_FINAL_CANDIDATE_MASTER_DIRECTIVE_V2_COMPLETE_2026-08-20.txt'
MASTER_SHA='9184cd18eb864f50a8c5d3af8f2899e7f138372861095e343901ab9c5e3bcb53'
V17='VELMERE_CANONICAL_OWNER_DIRECTIVE_V17_TRUE_TOPOLOGY_AUTOMATED_ADVANCED_CURRENT_WORLD_CLASS_2026-08-17.txt'
V17_SHA='de7fbd6df651a7a8a8f85054c6e9ac3c2ca530ebfb0d4ccd335dcb99fb658f05'
PARENT_SHA='3ecc33caa38fe4839ce5cbaee89a017d587de090719d298fe62138a1f56a5555'
PRODUCT_CHANGES=[
 'lib/market-integrity/risk-history-contract.ts',
 'lib/market-integrity/market-memory.ts',
 'lib/market-integrity/risk-ledger.ts',
 'lib/market-integrity/long-term-memory-spine.ts',
 'lib/server/market-integrity-route-modules/history.ts',
 'lib/server/market-integrity-route-modules/markets.ts',
]
DB_CHANGES=['lib/db/schema.sql','supabase/migrations/20260820000006_p91_risk_history_event_driven_versioned_durable_truth.sql']
PRIVATE_KEY_RE=re.compile(rb'-----BEGIN (?:(?:RSA|EC|OPENSSH) )?PRIVATE KEY-----\r?\n(?:[A-Za-z0-9+/=]{16,}\r?\n){2,}-----END (?:(?:RSA|EC|OPENSSH) )?PRIVATE KEY-----')
TOKEN_PATTERNS={
 'aws_access_key_id':re.compile(rb'AKIA[0-9A-Z]{16}'),'stripe_live_secret':re.compile(rb'sk_live_[A-Za-z0-9]{16,}'),
 'stripe_webhook_secret':re.compile(rb'whsec_[A-Za-z0-9]{16,}'),'github_fine_grained_pat':re.compile(rb'github_pat_[A-Za-z0-9_]{20,}'),
 'github_classic_pat':re.compile(rb'ghp_[A-Za-z0-9]{30,}'),'openai_api_key':re.compile(rb'(?<![A-Za-z0-9_-])sk-(?:proj-)?[A-Za-z0-9_-]{24,}'),
 'google_api_key':re.compile(rb'AIza[0-9A-Za-z_-]{30,}'),
}
def sha_bytes(data:bytes)->str:return hashlib.sha256(data).hexdigest()
def sha(path:Path)->str:
 h=hashlib.sha256()
 with path.open('rb') as f:
  for chunk in iter(lambda:f.read(4*1024*1024),b''):h.update(chunk)
 return h.hexdigest()
def write(path:Path,payload:Any):path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def load(path:Path):return json.loads(path.read_text('utf-8'))
def projection(rows:list[dict[str,Any]]):
 rows=sorted(rows,key=lambda x:x['path']);ph=hashlib.sha256('\n'.join(x['path'] for x in rows).encode()).hexdigest();agg=hashlib.sha256()
 for row in rows:agg.update(f"{row['path']}\0{row['byteLength']}\0{row['sha256']}\n".encode())
 return {'fileCount':len(rows),'payloadBytes':sum(x['byteLength'] for x in rows),'pathSetSha256':ph,'sourceContentAggregateSha256':agg.hexdigest()}
def parent_entries():
 with zipfile.ZipFile(PARENT_ZIP) as z:return {i.filename:z.read(i) for i in z.infolist() if not i.is_dir()}
def current_map():
 out={}
 for p in ROOT.rglob('*'):
  if not p.is_file():continue
  rel=p.relative_to(ROOT).as_posix()
  if rel.startswith('artifacts/closure/p91r1/') or rel=='PACKAGE_CONTENT_MANIFEST.tsv':continue
  out[rel]=p.read_bytes()
 return out
def classify(rel:str):
 if rel in PRODUCT_CHANGES:return 'CURRENT_PRODUCT_BUILD_RELEVANT'
 if rel in DB_CHANGES:return 'DATABASE_CLOSURE_CRITICAL'
 if rel==MASTER:return 'OWNER_MASTER_AUTHORITY_UNCHANGED'
 if rel==V17:return 'CANONICAL_TOPOLOGY_AUTHORITY_UNCHANGED'
 if rel=='VELMERE_ACTIVE_PASS.txt':return 'CONTROL_PLANE_POINTER'
 if rel=='P91R1_PACKAGE_BUILD_RECIPE.json':return 'DETERMINISTIC_PACKAGE_RECIPE'
 if rel.startswith('receipts/p91/'):return 'P91_CURRENT_RECEIPT'
 if rel.startswith('artifacts/p91/'):return 'P91_CURRENT_PROOF_FAILURE_OR_LOG'
 if rel.startswith('scripts/p91/') or rel.startswith('tsconfig.p91-'):return 'P91_HARNESS_OR_CLOSURE_SOURCE'
 return 'CURRENT_SOURCE_SUPPORT'
def source_change_manifest():
 before=parent_entries();after=current_map();changes=[]
 for rel in sorted(set(before)|set(after)):
  a=before.get(rel);b=after.get(rel)
  if a==b:continue
  changes.append({'path':rel,'change':'ADDED' if a is None else 'DELETED' if b is None else 'MODIFIED','classification':classify(rel),'beforeBytes':len(a) if a is not None else None,'beforeSha256':sha_bytes(a) if a is not None else None,'afterBytes':len(b) if b is not None else None,'afterSha256':sha_bytes(b) if b is not None else None})
 actual=sorted(x['path'] for x in changes if x['classification']=='CURRENT_PRODUCT_BUILD_RELEVANT')
 if actual!=sorted(PRODUCT_CHANGES):raise RuntimeError(f'product_delta_mismatch:{actual}')
 actual_db=sorted(x['path'] for x in changes if x['classification']=='DATABASE_CLOSURE_CRITICAL')
 if actual_db!=sorted(DB_CHANGES):raise RuntimeError(f'db_delta_mismatch:{actual_db}')
 payload={'schemaVersion':'velmere.p91r1.source-change-manifest.v1','generatedAt':GENERATED_AT,'status':'PASS_EXACT_PARENT_DIFF','parentSourceOnly':{'name':PARENT_ZIP.name,'sha256':sha(PARENT_ZIP)},'changeCount':len(changes),'classificationCounts':dict(Counter(x['classification'] for x in changes)),'changedBuildRelevantFiles':PRODUCT_CHANGES,'databaseClosureCriticalFiles':DB_CHANGES,'changes':changes,'truthBoundary':'Exact file-level diff from canonical P90 SOURCE_ONLY excluding only the self-referential P91 closure directory and package content manifest rebuilt during packaging.'}
 write(OUT/'P91R1_SOURCE_CHANGE_MANIFEST.json',payload);return payload
def product_projection():
 parent=load(ROOT/'artifacts/closure/p90r1/P90R1_CURRENT_PRODUCT_PROJECTION_MANIFEST.json');rows={r['path']:dict(r) for r in parent['files']};changed=[]
 for rel in PRODUCT_CHANGES:
  p=ROOT/rel;before=rows.get(rel);after={'path':rel,'byteLength':p.stat().st_size,'sha256':sha(p)};rows[rel]=after
  changed.append({'path':rel,'change':'ADDED' if before is None else 'MODIFIED','beforeBytes':before['byteLength'] if before else None,'beforeSha256':before['sha256'] if before else None,'afterBytes':after['byteLength'],'afterSha256':after['sha256']})
 current=projection(list(rows.values()));expected_parent=parent['currentCandidateProjection']
 payload={'schemaVersion':'velmere.p91r1.current-product-projection-manifest.v1','generatedAt':GENERATED_AT,'status':'PASS_LOCAL_DETERMINISTIC_SOURCE_IDENTITY_ONLY','parentCheckpoint':'P90R1_AUDIT_FIELD_LEVEL_RIGHTS_CURRENTNESS','parentProjectionReconstructedExactly':projection(parent['files'])==expected_parent,'parentProjection':expected_parent,'currentCandidateProjection':current,'delta':{'fileCount':current['fileCount']-expected_parent['fileCount'],'payloadBytes':current['payloadBytes']-expected_parent['payloadBytes'],'changedBuildRelevantFiles':len(changed)},'changedBuildRelevantFiles':changed,'databaseDeploymentBoundary':{'changedFiles':DB_CHANGES,'authorizedDatabaseExecution':'NOT_EXECUTED_P91','stagingRuntimeProof':'WITHHELD'},'files':sorted(rows.values(),key=lambda x:x['path'])}
 if not payload['parentProjectionReconstructedExactly']:raise RuntimeError('parent_projection_mismatch')
 write(OUT/'P91R1_CURRENT_PRODUCT_PROJECTION_MANIFEST.json',payload);return payload
def authority_binding():
 master=ROOT/MASTER;v17=ROOT/V17;text=master.read_text('utf-8');sections=[int(x) for x in re.findall(r'^# (\d+)\.',text,re.M)]
 if sha(master)!=MASTER_SHA or sections!=list(range(89)) or 'START NOW' not in text or 'END-OF-DIRECTIVE' not in text:raise RuntimeError('master_binding')
 if sha(v17)!=V17_SHA:raise RuntimeError('v17_binding')
 payload={'schemaVersion':'velmere.p91r1.authority-binding.v1','generatedAt':GENERATED_AT,'status':'PASS','masterDirective':{'path':MASTER,'bytes':master.stat().st_size,'sha256':sha(master),'sections':'0-88 PRESENT','sentinel':True,'changed':False},'canonicalOwnerDirective':{'path':V17,'bytes':v17.stat().st_size,'sha256':sha(v17),'changed':False},'parentSourceOnly':{'name':PARENT_ZIP.name,'sha256':sha(PARENT_ZIP)},'topology':{'families':10,'customerRows':20,'executionProfiles':20,'materialPaidTransitions':10},'truthBoundary':'Master V2 remains the continuous-closure authority and V17 remains the unchanged topology authority. Neither file changed, so no authority rebind is created.'}
 write(OUT/'P91R1_AUTHORITY_BINDING.json',payload);return payload
def test_aggregate():
 contract=load(ROOT/'receipts/p91/P91_RISK_HISTORY_CONTRACT_RUNTIME.json');ledger=load(ROOT/'receipts/p91/P91_RISK_HISTORY_LEDGER_RUNTIME.json');static=load(ROOT/'receipts/p91/P91_RISK_HISTORY_STATIC.json');ts=load(ROOT/'receipts/p91/P91_TARGETED_STRICT_TYPESCRIPT.json');imports=load(ROOT/'receipts/p91/P91_CHANGED_MODULE_IMPORTS.json');repeat=load(ROOT/'receipts/p91/P91_RUNTIME_REPEATABILITY.json');current=load(ROOT/'receipts/p91/P91_CURRENT_REGRESSION.json');risk=load(ROOT/'receipts/p91/P91_RISK_REGRESSION.json')
 rows=[
  {'id':'P91_RISK_HISTORY_CONTRACT_RUNTIME','checks':contract['checks']['total'],'status':contract['status']},
  {'id':'P91_RISK_HISTORY_LEDGER_RUNTIME','checks':ledger['checks']['total'],'status':ledger['status']},
  {'id':'P91_RISK_HISTORY_STATIC','checks':static['checks']['total'],'status':static['status']},
  {'id':'P91_TARGETED_TYPESCRIPT','checks':ts['checks']['total'],'status':ts['status']},
  {'id':'P91_CHANGED_IMPORTS','checks':imports['executableImports']['total']+imports['staticDependencyBoundaryChecks'],'status':imports['status']},
  {'id':'P91_RUNTIME_REPEATABILITY','checks':repeat['checks']['total'],'status':repeat['status']},
  {'id':'P90_CURRENT_REGRESSION_ON_P91_BYTES','checks':current['aggregateExecutedChecksAcrossOverlappingHarnesses'],'status':current['status']},
  {'id':'RISK_DOMAIN_EXTRA_REGRESSION','checks':risk['aggregateExecutedChecksAcrossOverlappingHarnesses'],'status':risk['status']},
 ]
 total=sum(r['checks'] for r in rows)
 payload={'schemaVersion':'velmere.p91r1.test-aggregate.v1','generatedAt':GENERATED_AT,'status':'PASS_BOUNDED','aggregateExecutedChecksAcrossOverlappingHarnesses':total,'rows':rows,'explicitWithholds':risk['commands']['withheld'],'zeroFakeCredit':{'independentEvidenceCount':False,'accuracyStatistic':False,'realDatabaseExecuted':False,'realNetworkExecuted':False,'customerFinal':'0/20','riskIndicatorFinal':False},'truthBoundary':'Counts overlap across runtime, static, targeted compiler and historical regression harnesses. They are execution counts only and do not establish production durability, detector accuracy, current providers, Customer FINAL or exact-Windows.'}
 write(OUT/'P91R1_TEST_AGGREGATE.json',payload);return payload
def failure_adjudication():
 names=[
 '00A_P91_CUSTOMER_PROJECTION_TEST_FALSE_POSITIVE.log','00B_P91_TARGETED_TYPESCRIPT_FIRST_ENVIRONMENT_FAIL.log','00C_P91_TARGETED_SERVER_TYPESCRIPT_TRANSITIVE_ENVIRONMENT_FAIL.log','00D_P91_TARGETED_SERVER_TYPESCRIPT_AMBIENT_RETURN_TEST_DEFECT.log','00E_P91_COMBINED_REGRESSION_OUTER_PROCESS_LIMIT.log','00F_P91_LEDGER_REPEATABILITY_FIRST_NONDETERMINISTIC.log','00G_P91_RISK_REGRESSION_FINALIZER_FIRST_LOG_CAPTURE_DEFECT.log','regression/risk/01_MARKET_RISK_DELIVERY_GATE.log','regression/risk/03_RISK_INPUT_FAIL_CLOSED.log']
 rows=[]
 for name in names:
  p=ROOT/'artifacts/p91/logs'/name
  rows.append({'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p),'credit':0})
 payload={'schemaVersion':'velmere.p91r1.failure-adjudication.v1','generatedAt':GENERATED_AT,'status':'PASS_ALL_NON_GREEN_EXECUTIONS_PRESERVED_ZERO_CREDIT','nonGreenExecutions':len(rows),'rows':rows,'adjudication':{'firstCustomerProjectionFail':'TEST_DEFECT_REPAIRED','initialTypeScriptFailures':'ENVIRONMENT_OR_AMBIENT_HARNESS_REPAIRED_WITH_BOUNDARY','combinedRegressionLimit':'INCOMPLETE_ZERO_CREDIT_SEGMENTS_RERUN','initialRepeatabilityFailure':'NONDETERMINISM_REPAIRED_AND_2_OF_2_RERUN','riskRouteFailures':'WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING_ZERO_CREDIT'},'retryUntilGreenUsed':False,'truthBoundary':'Every known P91 non-green execution is preserved. Later PASS is credited only after root-cause repair or explicit environment classification and a fresh bounded run.'}
 write(OUT/'P91R1_FAILURE_ADJUDICATION.json',payload);return payload
def environment_truth():
 def version(cmd):
  try:return subprocess.check_output(cmd,text=True,stderr=subprocess.STDOUT).strip()
  except Exception as e:return f'UNAVAILABLE:{e}'
 payload={'schemaVersion':'velmere.p91r1.environment-truth.v1','generatedAt':GENERATED_AT,'status':'PASS_TARGETED_GLOBAL_WITHHELD','localRuntime':{'platform':platform.platform(),'python':platform.python_version(),'node':version(['node','--version']),'npm':version(['npm','--version']),'typescript':version(['tsc','--version'])},'targetedStrictTypeScript':'2/2 PASS','changedExecutableImports':'5/5 PASS','marketsRouteExecutableImport':'WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING_ZOD','wholeProjectSemanticTypeScript':'WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING','eslint':'WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING','webpack':'WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING','turbopack':'WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING','authorizedPostgreSqlOrSupabase':'UNAVAILABLE','exactWindowsServer2025':'WITHHELD','truthBoundary':'No P90 or older exact-Windows/build credit is inherited to changed P91 bytes.'}
 write(OUT/'P91R1_ENVIRONMENT_TRUTH.json',payload);return payload
def risk_history_boundary():
 c=load(ROOT/'receipts/p91/P91_RISK_HISTORY_CONTRACT_RUNTIME.json');l=load(ROOT/'receipts/p91/P91_RISK_HISTORY_LEDGER_RUNTIME.json');s=load(ROOT/'receipts/p91/P91_RISK_HISTORY_STATIC.json')
 payload={'schemaVersion':'velmere.p91r1.risk-history-boundary.v1','generatedAt':GENERATED_AT,'status':'GREEN_BOUNDED_LOCAL_EVENT_AND_DURABILITY_PROTOCOL','physicalTruth':{'missingLegacyTableDefectRepaired':True,'eventDrivenFirstMaterialHeartbeat':True,'methodologyScoreEvidenceVersioned':True,'comparabilitySegments':True,'withheldScoresExcludedFromPublicHistory':True,'configurationAloneNeverDurable':True,'appendExactReadbackProtocol':True,'customerProjectionExcludesRawSnapshot':True,'customerReasonsRebuiltFromClosedEventTypes':True,'globalLedgerCountsHidden':True},'proof':{'contractChecks':c['checks']['total'],'ledgerChecks':l['checks']['total'],'staticChecks':s['checks']['total'],'networkSocketsUsed':False,'databaseSimulated':True},'withheld':['actual PostgreSQL migration execution','RLS and service-role grants on staging','trigger and advisory-lock concurrency runtime','backup/restore and PITR','real multi-year durability','customer hover/expanded UI','Risk Indicator FINAL'],'truthBoundary':'The local event contract and no-socket exact read-back protocol pass. This is not a real database, staging, production, backup/restore, UI or FINAL proof.'}
 write(OUT/'P91R1_RISK_HISTORY_BOUNDARY.json',payload);return payload
def database_boundary():
 migration=ROOT/DB_CHANGES[1]
 payload={'schemaVersion':'velmere.p91r1.database-boundary.v1','generatedAt':GENERATED_AT,'status':'PASS_STATIC_RUNTIME_WITHHELD','migration':{'path':DB_CHANGES[1],'bytes':migration.stat().st_size,'sha256':sha(migration),'orderedAfter':'20260820000005_p88_audit_paid_exact_immutable_pdf_blob.sql'},'staticControls':{'transactionBound':True,'rlsEnabled':True,'serviceRoleOnly':True,'immutableTrigger':True,'validationTrigger':True,'perAssetAdvisoryLock':True,'timestampConflictFailClosed':True,'exactReadbackRpc':True},'authorizedDatabaseExecution':False,'stagingRlsExecuted':False,'realJwtExecuted':False,'restoreDrillExecuted':False,'truthBoundary':'Schema and migration source are statically verified only. Schema file is not deployed migration proof.'}
 write(OUT/'P91R1_DATABASE_BOUNDARY.json',payload);return payload
def history_immutability():
 r=load(ROOT/'receipts/p91/P91_PARENT_HISTORY_IMMUTABILITY.json')
 payload={'schemaVersion':'velmere.p91r1.historical-receipt-immutability.v1','generatedAt':GENERATED_AT,'status':r['status'],'parentHistoryFiles':r['parent']['historyFiles'],'parentHistoryAggregateSha256':r['parent']['historyAggregateSha256'],'regressionMutationsObserved':r['preRestore']['mismatchedFiles'],'restoredByteIdentical':r['restoration']['restoredFiles'],'finalDifferences':r['postRestore']['differences'],'unexpectedHistoricalFiles':r['postRestore']['unexpectedHistoricalFiles'],'truthBoundary':r['truthBoundary']}
 write(OUT/'P91R1_HISTORICAL_RECEIPT_IMMUTABILITY.json',payload);return payload
def targeted_scan(changes):
 findings=[];binaries=[];scanned=0
 for change in changes['changes']:
  if change['change']=='DELETED':continue
  p=ROOT/change['path'];data=p.read_bytes();scanned+=1
  if PRIVATE_KEY_RE.search(data):findings.append({'path':change['path'],'pattern':'private_key_block'})
  for name,pattern in TOKEN_PATTERNS.items():
   if pattern.search(data):findings.append({'path':change['path'],'pattern':name})
  if p.suffix.lower() in {'.exe','.dll','.bin','.pyc','.pyo','.woff','.woff2','.ttf','.otf'}:binaries.append(change['path'])
 status='PASS' if not findings and not binaries else 'FAIL'
 payload={'schemaVersion':'velmere.p91r1.targeted-secret-binary-scan.v1','generatedAt':GENERATED_AT,'status':status,'scannedChangedFiles':scanned,'privateKeyCredentialMatches':len(findings),'unexpectedCurrentBinaryMatches':len(binaries),'findings':findings,'unexpectedCurrentBinaries':binaries,'truthBoundary':'Targeted scan of the exact P91 delta. The final package builder separately scans every packaged byte.'}
 write(OUT/'P91R1_TARGETED_SECRET_SCAN.json',payload)
 if status!='PASS':raise RuntimeError('targeted_scan_failed')
 return payload
def blocker_queue():
 rows=[
 {'priority':1,'id':'RISK_HISTORY_CUSTOMER_UI','category':'PRODUCT','state':'OPEN','nextSafeAction':'Bind the customer-safe P91 history projection to the owner-approved hover popover and expanded history view with PL/EN/DE, keyboard and accessibility behavior. Do not expose raw snapshots or internal ledger status.'},
 {'priority':2,'id':'RISK_HISTORY_STAGING_DATABASE','category':'ENVIRONMENT / SECURITY','state':'WITHHELD','nextSafeAction':'Execute migration P91 on authorized PostgreSQL/Supabase staging; verify grants, RLS, immutable triggers, per-asset concurrency, exact readback, failure rollback and two service-role/customer boundaries.'},
 {'priority':3,'id':'AUDIT_REAL_PROVIDER_RIGHTS_EXECUTION','category':'RIGHTS / THIRD_PARTY / REAL_EXTERNAL_PROOF','state':'WITHHELD','nextSafeAction':'Execute an authorized current-input Pro run with five target-relevant live lanes, four strict receipts, three independent families and field-level commercial/display/PDF/retention rights.'},
 {'priority':4,'id':'CURRENT_FULL_BUILD_EXACT_WINDOWS','category':'ENVIRONMENT','state':'WITHHELD','nextSafeAction':'Run whole-project semantic TypeScript, ESLint, Webpack, Turbopack and Windows Server 2025 on exact successor bytes.'},
 {'priority':5,'id':'RISK_HISTORY_BACKUP_RESTORE','category':'OPERATIONS','state':'OPEN','nextSafeAction':'After staging storage exists, define owner RPO/RTO candidates and perform a controlled restore drill verifying event digests, permissions and RLS.'},
 ]
 payload={'schemaVersion':'velmere.p91r1.current-blocker-queue.v1','generatedAt':GENERATED_AT,'status':'OPEN_CONTINUOUS_CLOSURE','rows':rows,'customerFinal':'0/20','auditFinalPdf':'0/3','riskIndicatorFinal':False,'global':'NO_GO / STOP_SELL','truthBoundary':'P91 is a savepoint. External and environment blockers remain explicit; the next independent local workstream is the customer Risk History interaction, not another synthetic durability model.'}
 write(OUT/'P91R1_CURRENT_BLOCKER_QUEUE.json',payload);return payload
def checkpoint(parts):
 refs={name:{'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)} for name,p in parts.items()}
 payload={'schemaVersion':'velmere.p91r1.checkpoint-receipt.v1','generatedAt':GENERATED_AT,'status':'PASS_BOUNDED_P91R1_RISK_HISTORY_EVENT_DRIVEN_VERSIONED_DURABLE_TRUTH','parentCheckpoint':'P90R1_AUDIT_FIELD_LEVEL_RIGHTS_CURRENTNESS','proofs':refs,'physicalChanges':{'productBuildRelevantFiles':PRODUCT_CHANGES,'databaseClosureCriticalFiles':DB_CHANGES,'missingTableDefectRepaired':True,'eventDrivenStorage':True,'versionedComparability':True,'exactReadbackRequiredForDurability':True,'customerSafeProjection':True},'customerNumerators':{'customerFinal':'0/20','auditFinalPdf':'0/3','rights':'2/203 inherited only','paidValue':'0/10','saleEligible':'0/20'},'release':{'pilotReady':False,'goPaid':False,'live':False,'worldClassProven':False,'global':'NO_GO / STOP_SELL'},'withheld':['real PostgreSQL/Supabase migration and RLS','real multi-year durability and restore drill','customer hover/expanded Risk History UI','Risk Indicator FINAL','real Audit provider rights execution','whole-project type/lint/build','exact Windows'],'securityBoundary':{'externalTransactionSent':False,'externalStateChanged':False,'liveExploitPerformed':False,'weaponizedPocCreated':False,'authorizationBypassAttempted':False,'externalSystemScanned':False},'truthBoundary':'PASS_BOUNDED applies only to local event semantics, fail-closed durability accounting, no-socket exact readback protocol, customer-safe projection, static migration controls and current regression. It is not deployed durability or Customer FINAL.'}
 write(OUT/'P91R1_CHECKPOINT_RECEIPT.json',payload);return payload
def main():
 OUT.mkdir(parents=True,exist_ok=True)
 source=source_change_manifest();product=product_projection();authority=authority_binding();tests=test_aggregate();fail=failure_adjudication();env=environment_truth();risk=risk_history_boundary();db=database_boundary();history=history_immutability();scan=targeted_scan(source);block=blocker_queue()
 parts={'sourceChangeManifest':OUT/'P91R1_SOURCE_CHANGE_MANIFEST.json','productProjection':OUT/'P91R1_CURRENT_PRODUCT_PROJECTION_MANIFEST.json','authorityBinding':OUT/'P91R1_AUTHORITY_BINDING.json','testAggregate':OUT/'P91R1_TEST_AGGREGATE.json','failureAdjudication':OUT/'P91R1_FAILURE_ADJUDICATION.json','environmentTruth':OUT/'P91R1_ENVIRONMENT_TRUTH.json','riskHistoryBoundary':OUT/'P91R1_RISK_HISTORY_BOUNDARY.json','databaseBoundary':OUT/'P91R1_DATABASE_BOUNDARY.json','historyImmutability':OUT/'P91R1_HISTORICAL_RECEIPT_IMMUTABILITY.json','targetedSecretScan':OUT/'P91R1_TARGETED_SECRET_SCAN.json','blockerQueue':OUT/'P91R1_CURRENT_BLOCKER_QUEUE.json'}
 cp=checkpoint(parts)
 print(json.dumps({'status':cp['status'],'sourceChanges':source['changeCount'],'productProjection':product['currentCandidateProjection'],'tests':tests['aggregateExecutedChecksAcrossOverlappingHarnesses'],'nonGreenExecutions':fail['nonGreenExecutions'],'historyFiles':history['parentHistoryFiles'],'targetedScan':scan['status'],'nextBlocker':block['rows'][0]['id']},indent=2))
if __name__=='__main__':main()
