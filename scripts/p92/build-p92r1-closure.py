#!/usr/bin/env python3
from __future__ import annotations
import hashlib,json,platform,re,subprocess,zipfile
from collections import Counter
from pathlib import Path
from typing import Any
ROOT=Path(__file__).resolve().parents[2]
PARENT_ZIP=Path('/mnt/data/VELMERE_R44P46_V17_P91R1_RISK_HISTORY_EVENT_DRIVEN_VERSIONED_DURABLE_TRUTH_CURRENT_SOURCE_ONLY_IN_PROGRESS_2026-08-20.zip')
OUT=ROOT/'artifacts/closure/p92r1'
GENERATED_AT='2026-08-20T21:00:00.000Z'
MASTER='VELMERE_ULTIMATE_WORLD_CLASS_CONTINUOUS_CLOSURE_FINAL_CANDIDATE_MASTER_DIRECTIVE_V2_COMPLETE_2026-08-20.txt'
MASTER_SHA='9184cd18eb864f50a8c5d3af8f2899e7f138372861095e343901ab9c5e3bcb53'
V17='VELMERE_CANONICAL_OWNER_DIRECTIVE_V17_TRUE_TOPOLOGY_AUTOMATED_ADVANCED_CURRENT_WORLD_CLASS_2026-08-17.txt'
V17_SHA='de7fbd6df651a7a8a8f85054c6e9ac3c2ca530ebfb0d4ccd335dcb99fb658f05'
PARENT_SHA='045f52c70d82cc8f057b4a1dc554a14c29ded4b7647f6abfa135963d2b77e064'
PRODUCT_CHANGES=[
 'lib/market-integrity/risk-history-customer-client.ts',
 'components/market-integrity/RiskHistoryControl.tsx',
 'components/market-integrity/ShieldRealMarketsParityClient.tsx',
 'components/market-integrity/CrossAssetCollapseRadarPanel.tsx',
]
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
  if rel.startswith('artifacts/closure/p92r1/') or rel=='PACKAGE_CONTENT_MANIFEST.tsv':continue
  out[rel]=p.read_bytes()
 return out
def classify(rel:str):
 if rel in PRODUCT_CHANGES:return 'CURRENT_PRODUCT_BUILD_RELEVANT'
 if rel==MASTER:return 'OWNER_MASTER_AUTHORITY_UNCHANGED'
 if rel==V17:return 'CANONICAL_TOPOLOGY_AUTHORITY_UNCHANGED'
 if rel=='VELMERE_ACTIVE_PASS.txt':return 'CONTROL_PLANE_POINTER'
 if rel=='P92R1_PACKAGE_BUILD_RECIPE.json':return 'DETERMINISTIC_PACKAGE_RECIPE'
 if rel.startswith('receipts/p92/'):return 'P92_CURRENT_RECEIPT'
 if rel.startswith('artifacts/p92/'):return 'P92_CURRENT_PROOF_FAILURE_LOG_OR_SNAPSHOT'
 if rel.startswith('scripts/p92/') or rel.startswith('tsconfig.p92-'):return 'P92_HARNESS_OR_CLOSURE_SOURCE'
 return 'CURRENT_SOURCE_SUPPORT'
def source_change_manifest():
 before=parent_entries();after=current_map();changes=[]
 for rel in sorted(set(before)|set(after)):
  a=before.get(rel);b=after.get(rel)
  if a==b:continue
  changes.append({'path':rel,'change':'ADDED' if a is None else 'DELETED' if b is None else 'MODIFIED','classification':classify(rel),'beforeBytes':len(a) if a is not None else None,'beforeSha256':sha_bytes(a) if a is not None else None,'afterBytes':len(b) if b is not None else None,'afterSha256':sha_bytes(b) if b is not None else None})
 actual=sorted(x['path'] for x in changes if x['classification']=='CURRENT_PRODUCT_BUILD_RELEVANT')
 if actual!=sorted(PRODUCT_CHANGES):raise RuntimeError(f'product_delta_mismatch:{actual}')
 payload={'schemaVersion':'velmere.p92r1.source-change-manifest.v1','generatedAt':GENERATED_AT,'status':'PASS_EXACT_PARENT_DIFF','parentSourceOnly':{'name':PARENT_ZIP.name,'bytes':PARENT_ZIP.stat().st_size,'sha256':sha(PARENT_ZIP)},'changeCount':len(changes),'classificationCounts':dict(Counter(x['classification'] for x in changes)),'changedBuildRelevantFiles':PRODUCT_CHANGES,'databaseClosureCriticalFiles':[],'changes':changes,'truthBoundary':'Exact file-level diff from canonical P91 SOURCE_ONLY excluding only the self-referential P92 closure directory and package content manifest rebuilt during packaging.'}
 write(OUT/'P92R1_SOURCE_CHANGE_MANIFEST.json',payload);return payload
def product_projection():
 parent=load(ROOT/'artifacts/closure/p91r1/P91R1_CURRENT_PRODUCT_PROJECTION_MANIFEST.json');rows={r['path']:dict(r) for r in parent['files']};changed=[]
 for rel in PRODUCT_CHANGES:
  p=ROOT/rel;before=rows.get(rel);after={'path':rel,'byteLength':p.stat().st_size,'sha256':sha(p)};rows[rel]=after
  changed.append({'path':rel,'change':'ADDED' if before is None else 'MODIFIED','beforeBytes':before['byteLength'] if before else None,'beforeSha256':before['sha256'] if before else None,'afterBytes':after['byteLength'],'afterSha256':after['sha256']})
 current=projection(list(rows.values()));expected_parent=parent['currentCandidateProjection']
 payload={'schemaVersion':'velmere.p92r1.current-product-projection-manifest.v1','generatedAt':GENERATED_AT,'status':'PASS_LOCAL_DETERMINISTIC_SOURCE_IDENTITY_ONLY','parentCheckpoint':'P91R1_RISK_HISTORY_EVENT_DRIVEN_VERSIONED_DURABLE_TRUTH','parentProjectionReconstructedExactly':projection(parent['files'])==expected_parent,'parentProjection':expected_parent,'currentCandidateProjection':current,'delta':{'fileCount':current['fileCount']-expected_parent['fileCount'],'payloadBytes':current['payloadBytes']-expected_parent['payloadBytes'],'changedBuildRelevantFiles':len(changed)},'changedBuildRelevantFiles':changed,'databaseDeploymentBoundary':{'changedFiles':[],'authorizedDatabaseExecution':'NOT_EXECUTED_P92','stagingRuntimeProof':'WITHHELD_INHERITED_P91'},'files':sorted(rows.values(),key=lambda x:x['path'])}
 if not payload['parentProjectionReconstructedExactly']:raise RuntimeError('parent_projection_mismatch')
 write(OUT/'P92R1_CURRENT_PRODUCT_PROJECTION_MANIFEST.json',payload);return payload
def authority_binding():
 master=ROOT/MASTER;v17=ROOT/V17;text=master.read_text('utf-8');sections=[int(x) for x in re.findall(r'^# (\d+)\.',text,re.M)]
 if sha(master)!=MASTER_SHA or sections!=list(range(89)) or 'START NOW' not in text or 'END-OF-DIRECTIVE' not in text:raise RuntimeError('master_binding')
 if sha(v17)!=V17_SHA:raise RuntimeError('v17_binding')
 payload={'schemaVersion':'velmere.p92r1.authority-binding.v1','generatedAt':GENERATED_AT,'status':'PASS','masterDirective':{'path':MASTER,'bytes':master.stat().st_size,'sha256':sha(master),'sections':'0-88 PRESENT','startNow':True,'sentinel':True,'changed':False},'canonicalOwnerDirective':{'path':V17,'bytes':v17.stat().st_size,'sha256':sha(v17),'changed':False},'parentSourceOnly':{'name':PARENT_ZIP.name,'bytes':PARENT_ZIP.stat().st_size,'sha256':sha(PARENT_ZIP)},'topology':{'families':10,'customerRows':20,'executionProfiles':20,'materialPaidTransitions':10},'truthBoundary':'Master V2 remains the continuous-closure authority and V17 remains the unchanged topology authority. Neither file changed, so no authority rebind is created.'}
 write(OUT/'P92R1_AUTHORITY_BINDING.json',payload);return payload
def test_aggregate():
 names=[
  ('P92_CUSTOMER_CLIENT',ROOT/'receipts/p92/P92_RISK_HISTORY_CUSTOMER_CLIENT_RUNTIME.json',48),
  ('P92_CUSTOMER_UI_STATIC',ROOT/'receipts/p92/P92_RISK_HISTORY_UI_STATIC.json',83),
  ('P92_CHANGED_REACHABILITY',ROOT/'receipts/p92/P92_CHANGED_MODULE_REACHABILITY.json',11),
  ('P92_TARGETED_TYPESCRIPT',ROOT/'receipts/p92/P92_TARGETED_STRICT_TYPESCRIPT.json',2),
  ('P92_REPEATABILITY',ROOT/'receipts/p92/P92_RUNTIME_REPEATABILITY.json',16),
  ('P92_CURRENT_BYTE_REGRESSION',ROOT/'receipts/p92/P92_CURRENT_BYTE_REGRESSION.json',1501),
 ]
 rows=[]
 for ident,path,count in names:
  d=load(path);actual=d.get('checks',{}).get('total') if ident!='P92_CURRENT_BYTE_REGRESSION' else d.get('aggregateExecutedChecksAcrossOverlappingHarnesses')
  if not str(d.get('status','')).startswith('PASS') or actual!=count:raise RuntimeError(f'test_receipt:{ident}:{d.get("status")}:{actual}')
  rows.append({'id':ident,'checks':count,'status':d['status'],'receipt':path.relative_to(ROOT).as_posix(),'receiptSha256':sha(path)})
 total=sum(r['checks'] for r in rows)
 payload={'schemaVersion':'velmere.p92r1.test-aggregate.v1','generatedAt':GENERATED_AT,'status':'PASS_BOUNDED','aggregateExecutedChecksAcrossOverlappingHarnesses':total,'rows':rows,'explicitEnvironmentWithholds':2,'zeroFakeCredit':{'independentEvidenceCount':False,'accuracyStatistic':False,'browserRendered':False,'realCustomerJourney':False,'realDatabaseExecuted':False,'realNetworkExecuted':False,'customerFinal':'0/20','riskIndicatorFinal':False},'truthBoundary':'Counts overlap across customer-client runtime, static UI, transpile, targeted compiler, repeatability and parent regression harnesses. They are execution counts only and do not establish Browser/WCAG runtime, staging, production, Customer FINAL or exact-Windows.'}
 write(OUT/'P92R1_TEST_AGGREGATE.json',payload);return payload
def failure_adjudication():
 paths=[
 'artifacts/p92/logs/00A_P92_TYPESCRIPT_TMP_ROOT_HARNESS_DEFECT.log',
 'artifacts/p92/logs/02_P92_RISK_HISTORY_UI_TYPESCRIPT_FIRST.log',
 'artifacts/p92/logs/00C_P92_STATIC_EVENT_ISOLATION_FALSE_POSITIVE.log',
 'artifacts/p92/logs/00D_P92_STATIC_SCORE_FORMAT_EXPECTATION_STALE.log',
 'artifacts/p92/logs/24_P92_P90_CURRENT_REGRESSION_FIRST.log',
 'artifacts/p92/logs/regression/ui-history/01_FINAL_UI.log',
 'artifacts/p92/logs/regression/ui-history/02_CATALOG.log',
 'artifacts/p92/logs/regression/ui-history/03_ACTIVE_VISUAL.log',
 'artifacts/p92/logs/33_P92_CURRENT_BYTE_REGRESSION.log',
 'artifacts/p92/logs/regression/current-byte/17_P90_CROSS.log',
 ]
 rows=[]
 for rel in paths:
  p=ROOT/rel
  if not p.exists():raise RuntimeError(f'missing_failure_log:{rel}')
  rows.append({'path':rel,'bytes':p.stat().st_size,'sha256':sha(p),'credit':0})
 payload={'schemaVersion':'velmere.p92r1.failure-adjudication.v1','generatedAt':GENERATED_AT,'status':'PASS_ALL_NON_GREEN_EXECUTIONS_PRESERVED_ZERO_CREDIT','nonGreenOrIncompleteExecutions':len(rows),'rows':rows,'adjudication':{'typescriptRootFailure':'HARNESS_ROOT_DEFECT_REPAIRED','firstAmbientTypeScriptFailure':'CLOSED_STUB_DEFECT_REPAIRED','staticFalsePositives':'HARNESS_REQUIREMENTS_REPAIRED_WITHOUT_DEAD_SOURCE','historicalUiHarnesses':'SUPERSEDED_ACTIVE_PASS_OR_OLD_TAB_MODEL_ZERO_CREDIT','crossSurfaceModalIdentity':'REAL_DEFECT_REPAIRED_AND_CURRENT_STATIC_PROOF_ADDED','monolithicRunners':'INCOMPLETE_OR_DESCRIPTOR_HANG_ZERO_CREDIT_SEGMENTS_RECONSTRUCTED_FROM_CLOSED_CURRENT_LOGS'},'retryUntilGreenUsed':False,'truthBoundary':'Every known P92 non-green or incomplete execution is preserved with zero credit. Later PASS is credited only after root-cause repair or bounded reconstruction from closed current logs.'}
 write(OUT/'P92R1_FAILURE_ADJUDICATION.json',payload);return payload
def environment_truth():
 def cmd(args):
  try:return subprocess.check_output(args,text=True,stderr=subprocess.STDOUT).strip()
  except Exception as e:return f'UNAVAILABLE:{type(e).__name__}'
 payload={'schemaVersion':'velmere.p92r1.environment-truth.v1','generatedAt':GENERATED_AT,'status':'PASS_TRUTHFUL_WITHHELDS','local':{'platform':platform.platform(),'node':cmd(['node','--version']),'npm':cmd(['npm','--version']),'python':platform.python_version(),'nodeModulesPresent':(ROOT/'node_modules').is_dir(),'reactDependencyGraphPresent':(ROOT/'node_modules/react').exists(),'zodDependencyPresent':(ROOT/'node_modules/zod').exists()},'target':{'os':'Windows Server 2025','node':'24.18.0','npm':'11.16.0'},'proof':{'pureCustomerClientSemanticTypeScript':'PASS_BOUNDED','tsxClosedAmbientTypeScript':'PASS_BOUNDED','wholeProjectSemanticTypeScript':'WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING','eslint':'WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING','webpack':'WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING','turbopack':'WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING','browserRuntime':'WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING','exactWindows':'WITHHELD'},'truthBoundary':'Closed ambient TSX proof and isolated transpilation do not substitute for the installed React/Next graph, Browser, full type/lint/build or exact Windows.'}
 write(OUT/'P92R1_ENVIRONMENT_TRUTH.json',payload);return payload
def ui_boundary():
 payload={'schemaVersion':'velmere.p92r1.risk-history-customer-ui-boundary.v1','generatedAt':GENERATED_AT,'status':'PASS_BOUNDED_LOCAL_CUSTOMER_UI_SOURCE_AND_CLIENT','implementation':{'strictSameOriginClient':True,'boundedJsonBytes':524288,'maxEvents':144,'noStore':True,'exactClosedSchema':True,'hoverCompactPopover':True,'focusCompactPopover':True,'clickExpandedDialog':True,'keyboardFocusTrapAndReturn':True,'mobileSeparatePrimaryAndHistoryActions':True,'nestedInteractiveControls':False,'currentScoreMayBeWithheldWhileHistoryRemainsAvailable':True,'methodologySegmentsVisible':True,'eventLabelsReconstructedFromClosedTypes':True,'locales':['pl','en','de'],'utcExplicit':True,'scoreProbabilitySemantics':False,'rawSnapshotRendered':False,'storedChangeReasonRendered':False,'providerTopologyRendered':False,'sourceReceiptsRendered':False,'modalProductIdentity':{'shield':'Velmère Shield','realMarkets':'Velmère Real Markets'}},'proof':{'customerClientRuntime':'48/48 PASS','uiStatic':'83/83 PASS','changedModuleReachability':'11/11 PASS','targetedTypeScript':'2/2 PASS','repeatability':'16/16 PASS'},'withheld':{'browserRendered':True,'wcagRuntime':True,'realHttpRoute':True,'realCustomerInput':True,'mobileDeviceRuntime':True,'crossBrowserRuntime':True,'riskIndicatorFinal':True},'truthBoundary':'PASS_BOUNDED covers strict parsing, local client behavior, source-level accessibility/security integration and isolated compilation. No rendered Browser, real HTTP, staging, real user or Risk Indicator FINAL proof exists.'}
 write(OUT/'P92R1_RISK_HISTORY_CUSTOMER_UI_BOUNDARY.json',payload);return payload
def history_immutability():
 d=load(ROOT/'receipts/p92/P92_PARENT_HISTORY_IMMUTABILITY.json')
 if d.get('status')!='PASS_BYTE_IDENTICAL' or d.get('postRestore',{}).get('differences')!=0:raise RuntimeError('history_not_immutable')
 payload={'schemaVersion':'velmere.p92r1.historical-receipt-immutability.v1','generatedAt':GENERATED_AT,'status':'PASS_BYTE_IDENTICAL','parentZip':d['parent'],'historyFiles':d['parent']['historyFiles'],'restoredDuringCurrentRegression':10,'finalDifferences':0,'unexpectedHistoricalFiles':0,'sourceReceipt':'receipts/p92/P92_PARENT_HISTORY_IMMUTABILITY.json','sourceReceiptSha256':sha(ROOT/'receipts/p92/P92_PARENT_HISTORY_IMMUTABILITY.json'),'truthBoundary':'Canonical P91 history is byte-identical after P92 current-byte regressions. Current evidence lives only under P92 paths.'}
 write(OUT/'P92R1_HISTORICAL_RECEIPT_IMMUTABILITY.json',payload);return payload
def targeted_secret_scan(source_manifest):
 findings=[];scanned=0
 for row in source_manifest['changes']:
  if row['change']=='DELETED':continue
  p=ROOT/row['path'];data=p.read_bytes();scanned+=1
  if PRIVATE_KEY_RE.search(data):findings.append({'path':row['path'],'pattern':'private_key_block'})
  for name,pat in TOKEN_PATTERNS.items():
   if pat.search(data):findings.append({'path':row['path'],'pattern':name})
 payload={'schemaVersion':'velmere.p92r1.targeted-secret-scan.v1','generatedAt':GENERATED_AT,'status':'PASS' if not findings else 'FAIL','filesScanned':scanned,'matches':len(findings),'findings':findings,'truthBoundary':'Scans the exact P92 delta. Full-package scan is repeated by the deterministic package builder.'}
 if findings:raise RuntimeError(f'secret_findings:{findings[:5]}')
 write(OUT/'P92R1_TARGETED_SECRET_SCAN.json',payload);return payload
def blocker_queue():
 payload={'schemaVersion':'velmere.p92r1.current-blocker-queue.v1','generatedAt':GENERATED_AT,'status':'OPEN','rows':[
  {'priority':1,'category':'ENVIRONMENT','blocker':'Install the exact dependency graph and run rendered Browser/WCAG/mobile/cross-browser Risk History journeys plus full TypeScript, ESLint and dual builds.','state':'WITHHELD'},
  {'priority':2,'category':'DATABASE','blocker':'Apply the inherited P91 event-driven migration on authorized PostgreSQL/Supabase staging and prove RLS, service-role isolation, append/readback, concurrency, rollback, backup and restore.','state':'WITHHELD'},
  {'priority':3,'category':'PRODUCT','blocker':'Bind deployed customer-safe Risk History to the actual Risk Indicator row and prove current input, output, account/auth boundaries and end-to-end customer artifact behavior.','state':'WITHHELD'},
  {'priority':4,'category':'RIGHTS','blocker':'Execute Audit Pro with five target-relevant live lanes, four strict receipts, three independent families, six evidence rows and field-level customer/PDF/retention rights.','state':'WITHHELD'},
  {'priority':5,'category':'ENVIRONMENT','blocker':'Run canonical Windows Server 2025 / Node 24.18.0 / npm 11.16.0 release stack on exact successor bytes.','state':'WITHHELD'},
 ],'customerNumerators':{'customerFinal':'0/20','auditFinalPdf':'0/3','rights':'2/203 inherited only','paidValue':'0/10','saleEligible':'0/20'},'release':{'pilotReady':False,'goPaid':False,'live':False,'worldClassProven':False,'global':'NO_GO / STOP_SELL'}}
 write(OUT/'P92R1_CURRENT_BLOCKER_QUEUE.json',payload);return payload
def checkpoint(proofs,projection_data):
 def ref(name):
  p=OUT/name;return {'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)}
 payload={'schemaVersion':'velmere.p92r1.checkpoint-receipt.v1','generatedAt':GENERATED_AT,'status':'PASS_BOUNDED_P92R1_RISK_HISTORY_CUSTOMER_HOVER_EXPAND_SAFE_UI','parentCheckpoint':'P91R1_RISK_HISTORY_EVENT_DRIVEN_VERSIONED_DURABLE_TRUTH','proofs':{k:ref(v) for k,v in proofs.items()},'physicalChanges':{'productBuildRelevantFiles':PRODUCT_CHANGES,'databaseClosureCriticalFiles':[],'customerClientAdded':True,'hoverFocusPopoverAdded':True,'expandedDialogAdded':True,'mobileNestedControlsPrevented':True,'historyAvailableDuringCurrentScoreWithheld':True,'closedEventLabelsAndSegmentUI':True,'explicitModalProductIdentity':True},'productProjection':projection_data['currentCandidateProjection'],'customerNumerators':{'customerFinal':'0/20','auditFinalPdf':'0/3','rights':'2/203 inherited only','paidValue':'0/10','saleEligible':'0/20'},'release':{'pilotReady':False,'goPaid':False,'live':False,'worldClassProven':False,'global':'NO_GO / STOP_SELL'},'withheld':['rendered Browser/WCAG/mobile/cross-browser runtime','real HTTP customer route','authorized PostgreSQL/Supabase durability and restore','Risk Indicator Customer FINAL','real Audit provider rights execution','whole-project type/lint/build','exact Windows'],'securityBoundary':{'externalTransactionSent':False,'externalStateChanged':False,'liveExploitPerformed':False,'weaponizedPocCreated':False,'authorizationBypassAttempted':False,'externalSystemScanned':False},'truthBoundary':'PASS_BOUNDED applies only to local customer-client parsing, source-level UI/accessibility/security integration, isolated compilation, repeatability and current regression. It is not Browser, staging, deployed Risk History or Customer FINAL.'}
 write(OUT/'P92R1_CHECKPOINT_RECEIPT.json',payload);return payload
def main():
 if not PARENT_ZIP.is_file() or sha(PARENT_ZIP)!=PARENT_SHA:raise RuntimeError('parent_zip_identity')
 OUT.mkdir(parents=True,exist_ok=True)
 source=source_change_manifest();proj=product_projection();authority_binding();test_aggregate();failure_adjudication();environment_truth();ui_boundary();history_immutability();targeted_secret_scan(source);blocker_queue()
 proofs={'sourceChangeManifest':'P92R1_SOURCE_CHANGE_MANIFEST.json','productProjection':'P92R1_CURRENT_PRODUCT_PROJECTION_MANIFEST.json','authorityBinding':'P92R1_AUTHORITY_BINDING.json','testAggregate':'P92R1_TEST_AGGREGATE.json','failureAdjudication':'P92R1_FAILURE_ADJUDICATION.json','environmentTruth':'P92R1_ENVIRONMENT_TRUTH.json','riskHistoryUiBoundary':'P92R1_RISK_HISTORY_CUSTOMER_UI_BOUNDARY.json','historyImmutability':'P92R1_HISTORICAL_RECEIPT_IMMUTABILITY.json','targetedSecretScan':'P92R1_TARGETED_SECRET_SCAN.json','blockerQueue':'P92R1_CURRENT_BLOCKER_QUEUE.json'}
 checkpoint(proofs,proj)
 print(json.dumps({'status':'PASS_BOUNDED','closureFiles':len(list(OUT.glob('*.json'))),'productProjection':proj['currentCandidateProjection'],'testAggregate':load(OUT/'P92R1_TEST_AGGREGATE.json')['aggregateExecutedChecksAcrossOverlappingHarnesses']},indent=2))
if __name__=='__main__':main()
