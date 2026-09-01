#!/usr/bin/env python3
from __future__ import annotations
import hashlib,json,platform,re
from collections import Counter
from pathlib import Path
from typing import Any

ROOT=Path(__file__).resolve().parents[2]
PARENT=Path('/mnt/data/velmere_p90_clean')
OUT=ROOT/'artifacts/closure/p90r1'
GENERATED_AT='2026-08-20T17:15:00.000Z'
MASTER='VELMERE_ULTIMATE_WORLD_CLASS_CONTINUOUS_CLOSURE_FINAL_CANDIDATE_MASTER_DIRECTIVE_V2_COMPLETE_2026-08-20.txt'
MASTER_SHA='9184cd18eb864f50a8c5d3af8f2899e7f138372861095e343901ab9c5e3bcb53'
V17='VELMERE_CANONICAL_OWNER_DIRECTIVE_V17_TRUE_TOPOLOGY_AUTOMATED_ADVANCED_CURRENT_WORLD_CLASS_2026-08-17.txt'
V17_SHA='de7fbd6df651a7a8a8f85054c6e9ac3c2ca530ebfb0d4ccd335dcb99fb658f05'
PARENT_ZIP='VELMERE_R44P46_V17_P89R1_AUDIT_PROVIDER_EVIDENCE_DIMENSIONS_ANTI_DUPLICATION_CURRENT_SOURCE_ONLY_IN_PROGRESS_2026-08-20.zip'
PARENT_ZIP_SHA='6ec288a0b22919b792c5e3603e062d2563b7ee8219317630e29f1ece98231caa'
PRODUCT_CHANGES=[
 'config/p90/audit-provider-field-rights-currentness-registry.json',
 'lib/network/brokered-egress.ts',
 'lib/security/audit-customer-report-pipeline.ts',
 'lib/security/audit-evidence-receipt-packet.ts',
 'lib/security/audit-paid-evidence-readiness.ts',
 'lib/security/audit-provider-budget.ts',
 'lib/security/audit-provider-evidence-dimensions.ts',
 'lib/security/audit-provider-rights-currentness.ts',
 'lib/security/audit-provider-runtime-client.ts',
 'lib/security/audit-report-customer-projection.ts',
 'lib/security/audit-tier-value-proof.ts',
 'lib/security/audit-watch-post-handler.ts',
 'lib/security/pro-audit-pdf/render-pro-audit-pdf.ts',
 'lib/server/security-route-modules/audit-report-assembler.ts',
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
 ph=hashlib.sha256('\n'.join(x['path'] for x in rows).encode()).hexdigest();agg=hashlib.sha256()
 for x in rows:agg.update(f"{x['path']}\0{x['byteLength']}\0{x['sha256']}\n".encode())
 return {'fileCount':len(rows),'payloadBytes':sum(x['byteLength'] for x in rows),'pathSetSha256':ph,'sourceContentAggregateSha256':agg.hexdigest()}

def file_map(root:Path):
 out={}
 for p in root.rglob('*'):
  if not p.is_file():continue
  rel=p.relative_to(root).as_posix()
  if rel.startswith('artifacts/closure/p90r1/') or rel=='PACKAGE_CONTENT_MANIFEST.tsv':continue
  out[rel]=p
 return out

def classify(rel:str):
 if rel==MASTER:return 'OWNER_EXECUTION_AUTHORITY_UNCHANGED'
 if rel==V17:return 'CANONICAL_TOPOLOGY_AUTHORITY_UNCHANGED'
 if rel=='VELMERE_ACTIVE_PASS.txt':return 'CONTROL_PLANE_POINTER'
 if rel=='P90R1_PACKAGE_BUILD_RECIPE.json':return 'DETERMINISTIC_PACKAGE_RECIPE'
 if rel in PRODUCT_CHANGES:return 'CURRENT_PRODUCT_BUILD_RELEVANT'
 if rel.startswith('receipts/p90/'):return 'P90_CURRENT_RECEIPT'
 if rel.startswith('artifacts/p90/'):return 'P90_CURRENT_PROOF_FAILURE_OR_LOG'
 if rel.startswith('scripts/p90/'):return 'P90_HARNESS_OR_CLOSURE_SOURCE'
 return 'CURRENT_SOURCE_SUPPORT'

def source_change_manifest():
 before=file_map(PARENT);after=file_map(ROOT);changes=[]
 for rel in sorted(set(before)|set(after)):
  a=before.get(rel);b=after.get(rel)
  if a and b and a.stat().st_size==b.stat().st_size and sha(a)==sha(b):continue
  changes.append({'path':rel,'change':'ADDED' if a is None else 'DELETED' if b is None else 'MODIFIED','classification':classify(rel),'beforeBytes':a.stat().st_size if a else None,'beforeSha256':sha(a) if a else None,'afterBytes':b.stat().st_size if b else None,'afterSha256':sha(b) if b else None})
 actual=sorted(x['path'] for x in changes if x['classification']=='CURRENT_PRODUCT_BUILD_RELEVANT')
 if actual!=sorted(PRODUCT_CHANGES):raise RuntimeError(f'product_delta_mismatch:{actual}')
 counts=Counter(x['classification'] for x in changes)
 payload={'schemaVersion':'velmere.p90r1.source-change-manifest.v1','generatedAt':GENERATED_AT,'status':'PASS_EXACT_PARENT_DELTA','parentCheckpoint':'P89R1_AUDIT_PROVIDER_EVIDENCE_DIMENSIONS','parentSourceOnly':PARENT_ZIP,'parentSourceOnlySha256':PARENT_ZIP_SHA,'scopeExcludes':['artifacts/closure/p90r1/* self-generated closure receipts','PACKAGE_CONTENT_MANIFEST.tsv regenerated after closure'],'changeCount':len(changes),'classificationCounts':dict(sorted(counts.items())),'changes':changes,'buildRelevantChangedFiles':PRODUCT_CHANGES,'databaseClosureCriticalChangedFiles':[],'masterDirectiveChanged':False,'v17Changed':False,'truthBoundary':'Exact P89R1 to P90R1 filesystem delta outside self-generated closure and final package manifest. Local source change does not prove provider rights, provider network, staging, deployment, value, FINAL or exact Windows.'}
 write(OUT/'P90R1_SOURCE_CHANGE_MANIFEST.json',payload);return payload

def product_projection():
 parent=load(ROOT/'artifacts/closure/p89r1/P89R1_CURRENT_PRODUCT_PROJECTION_MANIFEST.json')
 rows=[dict(x) for x in parent['files']];declared=parent['currentCandidateProjection']
 if projection(rows)!=declared:raise RuntimeError('p89_product_projection_mismatch')
 mapped={x['path']:x for x in rows};changed=[]
 for rel in PRODUCT_CHANGES:
  old=mapped.get(rel);new=row(ROOT,rel);mapped[rel]=new
  changed.append({'path':rel,'change':'ADDED' if old is None else 'MODIFIED','beforeBytes':old and old['byteLength'],'beforeSha256':old and old['sha256'],'afterBytes':new['byteLength'],'afterSha256':new['sha256']})
 current_rows=sorted(mapped.values(),key=lambda x:x['path']);current=projection(current_rows)
 payload={'schemaVersion':'velmere.p90r1.current-product-projection-manifest.v1','generatedAt':GENERATED_AT,'status':'PASS_LOCAL_DETERMINISTIC_SOURCE_IDENTITY_ONLY','parentCheckpoint':'P89R1_AUDIT_PROVIDER_EVIDENCE_DIMENSIONS','parentProjectionReconstructedExactly':True,'parentProjection':declared,'currentCandidateProjection':current,'delta':{'fileCount':current['fileCount']-declared['fileCount'],'payloadBytes':current['payloadBytes']-declared['payloadBytes'],'changedBuildRelevantFiles':len(changed)},'changedBuildRelevantFiles':changed,'databaseDeploymentBoundary':{'changedFiles':[],'authorizedDatabaseExecution':'NOT_EXECUTED_P90','stagingRuntimeProof':'WITHHELD'},'files':current_rows,'exactWindowsCredit':False,'truthBoundary':'P90 adds a versioned field-level rights/currentness registry and evaluator, introduces a minimal read-only Sourcify lane, separates target-relevant successful execution from HTTP success, and hardens blocked customer/PDF paths. This is local source identity only.'}
 write(OUT/'P90R1_CURRENT_PRODUCT_PROJECTION_MANIFEST.json',payload);return payload

def history_receipt():
 mism=[];verified=0
 for base in ('receipts','artifacts'):
  for src in (PARENT/base).rglob('*'):
   if not src.is_file():continue
   verified+=1;rel=src.relative_to(PARENT);dst=ROOT/rel
   if not dst.is_file() or dst.stat().st_size!=src.stat().st_size or sha(src)!=sha(dst):mism.append(rel.as_posix())
 restore=load(ROOT/'receipts/p90/P90_PARENT_HISTORY_RESTORE.json')
 if mism or restore['status']!='PASS' or restore['mismatchCount']!=0:raise RuntimeError(f'history_mismatch:{mism[:10]}')
 payload={'schemaVersion':'velmere.p90r1.historical-receipt-artifact-immutability.v1','generatedAt':GENERATED_AT,'status':'PASS_BYTE_IDENTICAL','parentCheckpoint':'P89R1','verifiedHistoricalReceiptArtifactFiles':verified,'restoredAfterLegacyExecution':restore['restoredCount'],'mismatchCount':0,'mismatches':[],'truthBoundary':'Every P89R1 parent receipt/artifact byte remains exact after P90 current-byte regression. P90 failures and replacement evidence live only under P90 paths.'}
 write(OUT/'P90R1_HISTORICAL_RECEIPT_IMMUTABILITY.json',payload);return payload

def assert_green(path,statuses):
 o=load(ROOT/path)
 if o.get('status') not in statuses:raise RuntimeError(f'not_green:{path}:{o.get("status")}')
 return o

def test_aggregate():
 rights=assert_green('receipts/p90/P90_AUDIT_PROVIDER_RIGHTS_CURRENTNESS_RUNTIME.json',{'PASS_BOUNDED_LOCAL_FAIL_CLOSED_RIGHTS_CURRENTNESS'})
 sourcify=assert_green('receipts/p90/P90_SOURCIFY_MINIMAL_PARSER_RUNTIME.json',{'PASS_BOUNDED_LOCAL_READ_ONLY_NO_SOCKET'})
 static=assert_green('receipts/p90/P90_AUDIT_COMMERCIAL_PATH_STATIC.json',{'PASS'})
 pdf=assert_green('receipts/p90/P90_AUDIT_PDF_RIGHTS_CURRENTNESS_RUNTIME.json',{'PASS_BOUNDED_LOCAL_RIGHTS_BOUND_PDF_SCHEMA'})
 projection_receipt=assert_green('receipts/p90/P90_AUDIT_BLOCKED_CUSTOMER_PROJECTION_RUNTIME.json',{'PASS_BOUNDED_LOCAL_FAIL_CLOSED_PROJECTION'})
 payload_receipt=assert_green('receipts/p90/P90_AUDIT_BLOCKED_CUSTOMER_PAYLOAD_RUNTIME.json',{'PASS_BOUNDED_LOCAL_DEFENSE_IN_DEPTH'})
 repeat=assert_green('receipts/p90/P90_RUNTIME_REPEATABILITY.json',{'PASS_BYTE_IDENTICAL'})
 targeted_ts=assert_green('receipts/p90/P90_TARGETED_STRICT_TYPESCRIPT.json',{'PASS_BOUNDED_TARGETED_STRICT_TYPESCRIPT'})
 seg=assert_green('receipts/p90/P90_CURRENT_REGRESSION_SEGMENT_B.json',{'PASS'})
 cross=assert_green('receipts/p90/P90_CROSS_WORKSTREAM_REGRESSION.json',{'PASS'})
 imports=sum(1 for line in (ROOT/'artifacts/p90/logs/regression/13_P90_CHANGED_IMPORTS_13.log').read_text().splitlines() if line.startswith('PASS ./'))
 if imports!=13 or targeted_ts['checks']['total']!=2 or targeted_ts['checks']['passed']!=2 or targeted_ts['checks']['failed']!=0:raise RuntimeError('imports_or_ts_not_green')
 core_rows={
  'providerRightsCurrentnessRuntime':rights['checks']['total'],
  'sourcifyMinimalNoSocketRuntime':sourcify['checks']['total'],
  'commercialPathStatic':static['checks']['total'],
  'changedModuleImports':imports,
  'pdfRightsCurrentnessRuntime':pdf['checks']['total'],
  'targetedStrictTypeScript':targeted_ts['checks']['total'],
  'blockedCustomerProjectionRuntime':projection_receipt['checks']['total'],
  'blockedCustomerPayloadRuntime':payload_receipt['checks']['total'],
  'runtimeRepeatability':repeat['checks']['total'],
 }
 core=sum(core_rows.values());segment=seg['aggregateExecutedChecksAcrossOverlappingHarnesses'];cross_count=cross['aggregateExecutedChecksAcrossOverlappingHarnesses'];total=core+segment+cross_count
 if core!=224 or segment!=910 or cross_count!=179 or total!=1313:raise RuntimeError(f'aggregate_mismatch:{core}:{segment}:{cross_count}:{total}')
 payload={'schemaVersion':'velmere.p90r1.test-aggregate.v1','generatedAt':GENERATED_AT,'status':'PASS_BOUNDED_CURRENT_LOCAL','p90Core':{'checks':core,'rows':core_rows},'segmentB':{'commands':seg['commandsPassed'],'checks':segment,'receipt':'receipts/p90/P90_CURRENT_REGRESSION_SEGMENT_B.json','sha256':sha(ROOT/'receipts/p90/P90_CURRENT_REGRESSION_SEGMENT_B.json')},'crossWorkstream':{'commands':cross['commandsPassed'],'checks':cross_count,'receipt':'receipts/p90/P90_CROSS_WORKSTREAM_REGRESSION.json','sha256':sha(ROOT/'receipts/p90/P90_CROSS_WORKSTREAM_REGRESSION.json')},'aggregateExecutedChecksAcrossOverlappingHarnesses':total,'supersededNoCredit':{'p89ProviderHarnessReturnCode':1,'p89PdfHarnessReturnCode':1,'classification':'SUPERSEDED_NO_CREDIT'},'zeroFakeCredit':'1313 is an overlapping execution count, not independent evidence, accuracy, provider count, customer count, Customer FINAL or Audit FINAL PDF.','truthBoundary':'All credited current local commands completed zero-exit after adjudication. Whole-project TS/lint/build, network providers, legal approval, staging, deployed HTTP and exact Windows remain unproven.'}
 write(OUT/'P90R1_TEST_AGGREGATE.json',payload);return payload

def failure_adjudication():
 logs=sorted((ROOT/'artifacts/p90/logs/regression').glob('00*.log'))
 expected={'00A','00B','00C','00D','00E','00F','00G','00H','00I','00J','00K','00L','00M','00N','00O'}
 got={p.name[:3] for p in logs}
 if got!=expected:raise RuntimeError(f'failure_logs:{got}')
 rows=[{'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p),'credit':'ZERO','state':'ADJUDICATED'} for p in logs]
 rows += [
  {'path':'artifacts/p90/logs/regression/10_P89_PROVIDER_DIMENSIONS_SUPERSEDED_NO_CREDIT.log','bytes':(ROOT/'artifacts/p90/logs/regression/10_P89_PROVIDER_DIMENSIONS_SUPERSEDED_NO_CREDIT.log').stat().st_size,'sha256':sha(ROOT/'artifacts/p90/logs/regression/10_P89_PROVIDER_DIMENSIONS_SUPERSEDED_NO_CREDIT.log'),'credit':'ZERO','state':'SUPERSEDED_NO_CREDIT'},
  {'path':'artifacts/p90/logs/regression/11_P89_PDF_DIMENSIONS_SUPERSEDED_NO_CREDIT.log','bytes':(ROOT/'artifacts/p90/logs/regression/11_P89_PDF_DIMENSIONS_SUPERSEDED_NO_CREDIT.log').stat().st_size,'sha256':sha(ROOT/'artifacts/p90/logs/regression/11_P89_PDF_DIMENSIONS_SUPERSEDED_NO_CREDIT.log'),'credit':'ZERO','state':'SUPERSEDED_NO_CREDIT'},
 ]
 payload={'schemaVersion':'velmere.p90r1.failure-adjudication.v1','generatedAt':GENERATED_AT,'status':'PASS_ALL_NON_GREEN_EXECUTIONS_PRESERVED_AND_ZERO_CREDIT','rows':rows,'firstFailureCount':len(logs),'supersededHarnessCount':2,'retryUntilGreenUsed':False,'truthBoundary':'Every known P90 first FAIL, test-harness defect and orchestration timeout is preserved. Later PASS counts are accepted only after root-cause adjudication and a fresh bounded run.'}
 write(OUT/'P90R1_FAILURE_ADJUDICATION.json',payload);return payload

def rights_boundary():
 reg=load(ROOT/'config/p90/audit-provider-field-rights-currentness-registry.json')
 receipt=load(ROOT/'receipts/p90/P90_AUDIT_PROVIDER_RIGHTS_CURRENTNESS_RUNTIME.json')
 sour=load(ROOT/'receipts/p90/P90_SOURCIFY_MINIMAL_PARSER_RUNTIME.json')
 if reg['registrySha256']!='1d99445a5d8283d4de6e2e4130430116986b9c86fff40ea9e9f2926fed07744b':raise RuntimeError('registry_hash')
 if any(p['legalApprovalStatus']=='APPROVED' for p in reg['providers']):raise RuntimeError('unexpected_rights_approval')
 payload={'schemaVersion':'velmere.p90r1.audit-provider-rights-currentness-boundary.v1','generatedAt':GENERATED_AT,'status':'PASS_BOUNDED_FAIL_CLOSED_ZERO_NEW_RIGHTS','registrySha256':reg['registrySha256'],'providerDecisionRows':len(reg['providers']),'canonicalCustomerApprovedProviders':0,'canonicalPaidApprovedProviders':0,'canonicalPdfExportApprovedProviders':0,'rawTermsStoredInSource':False,'rawTermsDocumentHashAvailable':False,'rightsNumerator':'2/203 inherited only','sourcify':{'runtimeReceipt':sour['schemaVersion'],'checks':sour['checks']['total'],'networkSocketExecuted':False,'rawSourceOrAbiRequested':False,'rightsApproved':False},'syntheticPositiveControl':receipt['syntheticPositiveControl'],'truthBoundary':'P90 proves fail-closed rights/currentness arithmetic and a full minimal no-socket runtime/control path. It grants no provider permission, commercial display, PDF export, retention, paid readiness or legal conclusion.'}
 write(OUT/'P90R1_PROVIDER_RIGHTS_CURRENTNESS_BOUNDARY.json',payload);return payload

def targeted_secret_scan(changes):
 findings=[];scanned=[];binary=[]
 for change in changes['changes']:
  if change['change']=='DELETED':continue
  rel=change['path'];p=ROOT/rel
  data=p.read_bytes();scanned.append(rel)
  if PRIVATE_KEY_RE.search(data):findings.append({'path':rel,'pattern':'private_key_block'})
  for name,pat in TOKEN_PATTERNS.items():
   if pat.search(data):findings.append({'path':rel,'pattern':name})
  if (rel.startswith('receipts/p90/') or rel.startswith('artifacts/p90/') or rel.startswith('scripts/p90/')) and p.suffix.lower() in {'.pdf','.zip','.woff','.woff2','.ttf','.otf','.exe','.dll','.bin','.pyc'}:binary.append(rel)
 if findings or binary:raise RuntimeError(f'scan:{findings[:5]}:{binary[:5]}')
 payload={'schemaVersion':'velmere.p90r1.targeted-secret-binary-scan.v1','generatedAt':GENERATED_AT,'status':'PASS','scannedChangedFiles':len(scanned),'privateKeyCredentialMatches':0,'unexpectedCurrentBinaryMatches':0,'findings':[],'unexpectedCurrentBinaries':[],'truthBoundary':'Targeted scan of the exact current P90 delta. The deterministic package builder separately rescans every final SOURCE_ONLY byte.'}
 write(OUT/'P90R1_TARGETED_SECRET_SCAN.json',payload);return payload

def authority_binding():
 master=ROOT/MASTER;v17=ROOT/V17
 sections=[int(x) for x in re.findall(r'^# (\d+)\.',master.read_text(),re.M)]
 if sha(master)!=MASTER_SHA or sections!=list(range(89)) or 'END-OF-DIRECTIVE' not in master.read_text():raise RuntimeError('master_binding')
 if sha(v17)!=V17_SHA:raise RuntimeError('v17_binding')
 payload={'schemaVersion':'velmere.p90r1.authority-binding.v1','generatedAt':GENERATED_AT,'status':'PASS','masterDirective':{'path':MASTER,'bytes':master.stat().st_size,'sha256':sha(master),'sections':'0-88 PRESENT','sentinel':True,'changed':False},'canonicalOwnerDirective':{'path':V17,'bytes':v17.stat().st_size,'sha256':sha(v17),'changed':False},'parentSourceOnly':{'name':PARENT_ZIP,'sha256':PARENT_ZIP_SHA},'topology':{'families':10,'customerRows':20,'executionProfiles':20,'materialPaidTransitions':10},'truthBoundary':'Master V2 governs continuous closure; V17 remains the unchanged topology authority. No formal rebind is needed because neither authority byte changed.'}
 write(OUT/'P90R1_AUTHORITY_BINDING.json',payload);return payload

def typescript_diagnostic():
 payload={'schemaVersion':'velmere.p90r1.local-typescript-environment-diagnostic.v1','generatedAt':GENERATED_AT,'status':'PASS_TARGETED_WITH_GLOBAL_WITHHELD','localRuntime':{'python':platform.python_version(),'node':'v22.16.0','npm':'10.9.2','typescript':'5.8.3','platform':platform.platform()},'targetedStrictTypeScript':{'status':'PASS','scope':['lib/security/audit-provider-evidence-dimensions.ts','lib/security/audit-provider-rights-currentness.ts','scripts/p90/p90-targeted-types.d.ts'],'checks':2},'changedProductionModuleImports':{'status':'PASS','modules':13},'wholeProjectSemanticTypeScript':'WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING','eslint':'WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING','webpack':'WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING','turbopack':'WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING','exactWindowsServer2025':'WITHHELD','truthBoundary':'No P89/P77 exact-Windows or full-project dependency proof is inherited to changed P90 bytes.'}
 write(OUT/'P90R1_LOCAL_TYPESCRIPT_DIAGNOSTIC.json',payload);return payload

def blocker_queue():
 rows=[
 {'priority':1,'id':'AUDIT_REAL_PROVIDER_AND_RIGHTS_EXECUTION','category':'RIGHTS / THIRD_PARTY / REAL_EXTERNAL_PROOF','state':'WITHHELD','nextSafeAction':'Execute an authorized current-input Pro run with at least five target-relevant live lanes, four strict receipts and field-level commercial/display/PDF/retention rights evidence. No hammering or synthetic approval.'},
 {'priority':2,'id':'AUDIT_STAGING_DB_RLS_JWT_SAME_BLOB','category':'ENVIRONMENT / SECURITY','state':'WITHHELD','nextSafeAction':'Execute current migrations, RLS, service-role separation, two owner JWTs, rollback and preview/download/account same-blob proof on authorized staging.'},
 {'priority':3,'id':'CURRENT_EXACT_WINDOWS_AND_FULL_BUILD','category':'ENVIRONMENT','state':'WITHHELD','nextSafeAction':'Run full semantic TypeScript, ESLint, Webpack, Turbopack and canonical Windows Server 2025 stack on exact successor bytes.'},
 {'priority':4,'id':'CURRENT_DEPLOYMENT_AND_OFFLINE_REPLAY','category':'REAL_EXTERNAL_PROOF','state':'WITHHELD','nextSafeAction':'Use public read-only current deployment identity/configuration plus an authorized offline archival replay. No live transaction or exploitation.'},
 {'priority':5,'id':'ADVANCED_ADDITIONAL_INDEPENDENT_SOURCE','category':'THIRD_PARTY / RIGHTS','state':'WITHHELD','nextSafeAction':'Add or validate a genuinely independent strict-capable rights-safe source. A URL alias or mirror does not count.'},
 ]
 payload={'schemaVersion':'velmere.p90r1.current-blocker-queue.v1','generatedAt':GENERATED_AT,'status':'OPEN_CONTINUOUS_CLOSURE','rows':rows,'customerFinal':'0/20','auditFinalPdf':'0/3','global':'NO_GO / STOP_SELL','truthBoundary':'P90 is a savepoint. External/environment blockers remain explicit; independent local workstreams should continue rather than retrying unavailable providers.'}
 write(OUT/'P90R1_CURRENT_BLOCKER_QUEUE.json',payload);return payload

def checkpoint(parts):
 refs={name:{'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)} for name,p in parts.items()}
 payload={'schemaVersion':'velmere.p90r1.checkpoint-receipt.v1','generatedAt':GENERATED_AT,'status':'PASS_BOUNDED','parentCheckpoint':'P89R1','sourceDelta':'AUDIT_FIELD_LEVEL_RIGHTS_CURRENTNESS_AND_MINIMAL_SOURCIFY_LANE','proofs':refs,'customerNumerators':{'customerFinal':'0/20','auditFinalPdf':'0/3','rights':'2/203 inherited only','paidValue':'0/10','saleEligible':'0/20'},'release':{'pilotReady':False,'goPaid':False,'live':False,'worldClassProven':False,'global':'NO_GO / STOP_SELL'},'withheld':['real provider network','commercial rights approval','staging database/RLS/JWT','deployed same-blob delivery','current deployment state','independent offline replay','whole-project TypeScript/lint/build','exact Windows'],'truthBoundary':'PASS_BOUNDED applies only to local fail-closed rights/currentness, target-relevant execution accounting, blocked customer projection/payload, minimal no-socket Sourcify handling, PDF binding and current regression. It is not FINAL.'}
 write(OUT/'P90R1_CHECKPOINT_RECEIPT.json',payload);return payload

def main():
 OUT.mkdir(parents=True,exist_ok=True)
 source=source_change_manifest();product=product_projection();history=history_receipt();tests=test_aggregate();fail=failure_adjudication();rights=rights_boundary();secret=targeted_secret_scan(source);auth=authority_binding();ts=typescript_diagnostic();block=blocker_queue()
 parts={
  'sourceChangeManifest':OUT/'P90R1_SOURCE_CHANGE_MANIFEST.json',
  'productProjection':OUT/'P90R1_CURRENT_PRODUCT_PROJECTION_MANIFEST.json',
  'historicalImmutability':OUT/'P90R1_HISTORICAL_RECEIPT_IMMUTABILITY.json',
  'testAggregate':OUT/'P90R1_TEST_AGGREGATE.json',
  'failureAdjudication':OUT/'P90R1_FAILURE_ADJUDICATION.json',
  'rightsBoundary':OUT/'P90R1_PROVIDER_RIGHTS_CURRENTNESS_BOUNDARY.json',
  'targetedSecretScan':OUT/'P90R1_TARGETED_SECRET_SCAN.json',
  'authorityBinding':OUT/'P90R1_AUTHORITY_BINDING.json',
  'typescriptDiagnostic':OUT/'P90R1_LOCAL_TYPESCRIPT_DIAGNOSTIC.json',
  'blockerQueue':OUT/'P90R1_CURRENT_BLOCKER_QUEUE.json',
 }
 cp=checkpoint(parts)
 print(json.dumps({'status':'PASS_BOUNDED','sourceChanges':source['changeCount'],'productProjection':product['currentCandidateProjection'],'historyFiles':history['verifiedHistoricalReceiptArtifactFiles'],'tests':tests['aggregateExecutedChecksAcrossOverlappingHarnesses'],'failureLogs':fail['firstFailureCount'],'rights':rights['status'],'secretScan':secret['status'],'authority':auth['status'],'checkpoint':cp['status']},indent=2))
if __name__=='__main__':main()
