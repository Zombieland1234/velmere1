#!/usr/bin/env python3
from __future__ import annotations
import hashlib,json,re,zipfile
from pathlib import Path
from typing import Any
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'artifacts/closure/p98r1';OUT.mkdir(parents=True,exist_ok=True)
FIXED='2026-08-21T12:45:00.000Z'
PARENT_ZIP=Path('/mnt/data/VELMERE_R44P46_V17_P97R1_BROWSER_BASIC_DURABLE_RENDER_ONCE_STORE_FIRST_CURRENT_SOURCE_ONLY_IN_PROGRESS_2026-08-21.zip')
PARENT_LEDGER=Path('/mnt/data/VELMERE_CURRENT_STATE_AND_PASS_DELTA_LEDGER_P97R1_V17_2026-08-21.txt')
MASTER=ROOT/'VELMERE_ULTIMATE_WORLD_CLASS_CONTINUOUS_CLOSURE_FINAL_CANDIDATE_MASTER_DIRECTIVE_V2_R1_CHECKPOINT_IDENTITY_2026-08-21.txt'
V17=ROOT/'VELMERE_CANONICAL_OWNER_DIRECTIVE_V17_TRUE_TOPOLOGY_AUTOMATED_ADVANCED_CURRENT_WORLD_CLASS_2026-08-17.txt'
PARENT_PRODUCT=ROOT/'artifacts/closure/p97r1/P97R1_CURRENT_PRODUCT_PROJECTION_MANIFEST.json'
PARENT_SHA='03e158ef07ebe4b90ebbad9e1248939feeb594d09c153b95c133e1e4d42340c7'
MASTER_SHA='45e2b377be0869f1acb3ef34844919643a537c617b0a8145402cc8c732e8b3c1'
V17_SHA='de7fbd6df651a7a8a8f85054c6e9ac3c2ca530ebfb0d4ccd335dcb99fb658f05'
MODIFIED=[
 'lib/market-integrity/top1-entitlement-report-access.ts',
 'lib/market-integrity/customer-report-tier-value.ts',
 'lib/market-integrity/worldclass-report-commercial-policy.ts',
 'lib/market-integrity/customer-report-delivery-policy.ts',
 'lib/market-integrity/customer-report-payload.ts',
 'lib/market-integrity/real-markets-customer-evidence.ts',
 'lib/market-integrity/real-markets-route-orchestrator.ts',
 'lib/server/market-integrity-route-modules/report.ts',
 'lib/market-integrity/customer-report-layout-model.ts',
 'lib/market-integrity/customer-report-exact-pdf-token.ts',
 'lib/server/market-integrity-route-modules/report-pdf.ts',
]
ADDED=['lib/market-integrity/customer-paid-tier-exact-delivery-policy.ts']

def sha(p:Path)->str:
 h=hashlib.sha256()
 with p.open('rb') as f:
  for c in iter(lambda:f.read(4*1024*1024),b''):h.update(c)
 return h.hexdigest()
def shab(b:bytes)->str:return hashlib.sha256(b).hexdigest()
def write(rel:str,obj:Any):
 p=ROOT/rel;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(obj,indent=2,ensure_ascii=False)+'\n',encoding='utf-8');return p
def row(rel:str):
 p=ROOT/rel;return {'path':rel,'byteLength':p.stat().st_size,'sha256':sha(p)}
def projection(rows):
 rows=sorted(rows,key=lambda x:x['path']);ph=hashlib.sha256('\n'.join(x['path'] for x in rows).encode()).hexdigest();agg=hashlib.sha256()
 for x in rows:agg.update(f"{x['path']}\0{x['byteLength']}\0{x['sha256']}\n".encode())
 return {'fileCount':len(rows),'payloadBytes':sum(x['byteLength'] for x in rows),'pathSetSha256':ph,'sourceContentAggregateSha256':agg.hexdigest()}
if not PARENT_ZIP.is_file() or sha(PARENT_ZIP)!=PARENT_SHA:raise SystemExit('parent_p97_invalid')
if not PARENT_LEDGER.is_file():raise SystemExit('parent_ledger_missing')
if sha(MASTER)!=MASTER_SHA or sha(V17)!=V17_SHA:raise SystemExit('authority_file_invalid')
if (ROOT/'VELMERE_ACTIVE_PASS.txt').read_text().strip()!='P98R1':raise SystemExit('active_pass_invalid')
master_text=MASTER.read_text(encoding='utf-8');sections=[int(x) for x in re.findall(r'(?m)^# (\d+)\.',master_text)]
authority={
 'schemaVersion':'velmere.p98r1.authority-binding.v1','generatedAt':FIXED,'status':'PASS',
 'ownerDecision':{'masterV2R1Current':True,'originalV2FrozenHistory':True,'v17Unchanged':True,'p96UniqueMergeAccepted':True,'continueFromP97':True,'riskHistoryLocalPolishingStopped':True},
 'masterDirective':{'file':MASTER.name,'bytes':MASTER.stat().st_size,'sha256':sha(MASTER),'sections0Through88Present':sections==list(range(89)),'startNowPresent':'START NOW' in master_text,'endSentinelPresent':'END-OF-DIRECTIVE' in master_text,'changedInP98':False},
 'canonicalOwnerDirective':{'file':V17.name,'bytes':V17.stat().st_size,'sha256':sha(V17),'changedInP98':False},
 'parent':{'checkpoint':'P97R1','sourceOnly':PARENT_ZIP.name,'bytes':PARENT_ZIP.stat().st_size,'sha256':sha(PARENT_ZIP),'ledger':PARENT_LEDGER.name,'ledgerSha256':sha(PARENT_LEDGER)},
 'current':'P98R1','truthBoundary':'Authority and unique parent binding only. No Customer FINAL, paid value, sale eligibility, deployment or exact-Windows credit.'
}
write('artifacts/closure/p98r1/P98R1_AUTHORITY_BINDING.json',authority)

parent=json.loads(PARENT_PRODUCT.read_text())
rows={x['path']:dict(x) for x in parent['files']};changes=[]
for rel in MODIFIED:
 if rel not in rows:raise SystemExit(f'product_parent_missing:{rel}')
 before=dict(rows[rel]);rows[rel]=row(rel);changes.append({'path':rel,'change':'MODIFIED','beforeBytes':before['byteLength'],'beforeSha256':before['sha256'],'afterBytes':rows[rel]['byteLength'],'afterSha256':rows[rel]['sha256']})
for rel in ADDED:
 if rel in rows:raise SystemExit(f'product_added_already_exists:{rel}')
 rows[rel]=row(rel);changes.append({'path':rel,'change':'ADDED','beforeBytes':None,'beforeSha256':None,'afterBytes':rows[rel]['byteLength'],'afterSha256':rows[rel]['sha256']})
product_rows=sorted(rows.values(),key=lambda x:x['path']);proj=projection(product_rows);pp=parent['currentCandidateProjection']
product={
 'schemaVersion':'velmere.p98r1.current-product-projection-manifest.v1','generatedAt':FIXED,'status':'PASS_LOCAL_DETERMINISTIC_SOURCE_IDENTITY_ONLY',
 'parentCheckpoint':'P97R1','parentProjection':pp,'currentCandidateProjection':proj,
 'deltaFromP97':{'fileCount':proj['fileCount']-pp['fileCount'],'payloadBytes':proj['payloadBytes']-pp['payloadBytes'],'changedBuildRelevantFiles':len(changes)},
 'changedBuildRelevantFiles':changes,
 'customerEffect':{'affectedRows':['real-markets-pro','real-markets-advanced'],'crossProductRoute':'shared_market_report_paid_tiers','implicitDowngradeRemoved':True,'withheldArtifactAuthority':False,'customerFinalPromotions':0,'paidValuePromotions':0,'saleEligiblePromotions':0},
 'riskHistoryProductFilesChanged':[], 'files':product_rows,
 'truthBoundary':'Product source projection only. P98 proves exact-tier source semantics and bounded local controls; it does not prove real data, rights, entitlement, paid value, artifact delivery, deployment, builds, exact Windows or Customer FINAL.'
}
write('artifacts/closure/p98r1/P98R1_CURRENT_PRODUCT_PROJECTION_MANIFEST.json',product)

with zipfile.ZipFile(PARENT_ZIP) as z: parent_map={i.filename:(i.file_size,shab(z.read(i.filename))) for i in z.infolist() if not i.is_dir()}
current_map={}
for p in ROOT.rglob('*'):
 if p.is_file():current_map[p.relative_to(ROOT).as_posix()]=(p.stat().st_size,sha(p))
expected=set(MODIFIED+['VELMERE_ACTIVE_PASS.txt','PACKAGE_CONTENT_MANIFEST.tsv'])
unexpected=[];removed=[];preserved=0;actual=[]
for rel,val in parent_map.items():
 if rel in expected:
  if rel in current_map and current_map[rel]!=val:actual.append(rel)
  continue
 if rel not in current_map:removed.append(rel)
 elif current_map[rel]!=val:unexpected.append(rel)
 else:preserved+=1
if unexpected or removed:raise SystemExit(json.dumps({'unexpected':unexpected,'removed':removed}))
preservation={
 'schemaVersion':'velmere.p98r1.parent-preservation.v1','generatedAt':FIXED,'status':'PASS_BYTE_IDENTICAL',
 'parent':{'checkpoint':'P97R1','sourceOnly':PARENT_ZIP.name,'sha256':PARENT_SHA,'entryCount':len(parent_map)},
 'declaredModifiedParentFiles':sorted(expected),'actuallyModifiedParentFilesAtClosure':sorted(actual),'preservedParentFiles':preserved,'removedParentFiles':removed,'unexpectedModifiedParentFiles':unexpected,
 'addedProductionFiles':ADDED,'restoredHistoricalReceipt':{'path':'receipts/p87/P87_REAL_MARKETS_EXACT_PDF_RUNTIME.json','sha256':current_map['receipts/p87/P87_REAL_MARKETS_EXACT_PDF_RUNTIME.json'][1],'restoredFromP97':True},
 'truthBoundary':'Every P97 parent file remains byte-identical except declared current source, active-pass and package-manifest replacements. New P98 files are additions and history is not rewritten.'
}
write('artifacts/closure/p98r1/P98R1_PARENT_PRESERVATION.json',preservation)
source={
 'schemaVersion':'velmere.p98r1.source-change-manifest.v1','generatedAt':FIXED,'status':'PASS_DECLARED_DELTA_ONLY','parent':'P97R1','current':'P98R1',
 'productionChanges':changes,'governanceChanges':[{'path':'VELMERE_ACTIVE_PASS.txt','change':'MODIFIED','before':'P97R1','after':'P98R1'}],
 'newEvidenceScopes':['scripts/p98/','receipts/p98/','artifacts/p98/','artifacts/closure/p98r1/','tsconfig.p98-paid-tier-exact-targeted.json','P98R1_PACKAGE_BUILD_RECIPE.json'],
 'riskHistoryProductFilesChanged':[],
 'physicalRepairs':[
  'Requested paid tier is analyzed exactly; Advanced is no longer silently mapped to Pro.',
  'All paid failures return a closed customer-safe WITHHELD projection before layout, PDF token or account-artifact creation.',
  'The exact-tier receipt binds requested, analyzed, payload and visible tiers plus delivery-policy status and paid-evidence authority.',
  'Self-consistent recomputed-hash mutations are rejected through full deterministic reconstruction.',
  'Customer success responses expose only a minimal exact-delivery projection rather than internal policy inputs.',
  'Automated Advanced requires automated evidence, stress/scenario and evidence-ledger gates; optional human QA adds no entitlement or release authority.',
  'Advanced remains NOT_FOR_SALE and receives no paid-value or sale-eligibility credit.'
 ],
 'truthBoundary':'Exact source delta from P97. No real entitlement, provider evidence, rights, payment, artifact, deployment, rendered Browser, build or FINAL promotion.'
}
write('artifacts/closure/p98r1/P98R1_SOURCE_CHANGE_MANIFEST.json',source)

runtime=json.loads((ROOT/'receipts/p98/P98_PAID_TIER_EXACT_DELIVERY_RUNTIME.json').read_text());static=json.loads((ROOT/'receipts/p98/P98_PAID_TIER_EXACT_DELIVERY_STATIC.json').read_text());ts=json.loads((ROOT/'receipts/p98/P98_TARGETED_STRICT_TYPESCRIPT.json').read_text());reach=json.loads((ROOT/'receipts/p98/P98_CHANGED_MODULE_REACHABILITY.json').read_text());reg=json.loads((ROOT/'receipts/p98/P98_AFFECTED_SCOPE_REGRESSION.json').read_text());repeat=json.loads((ROOT/'receipts/p98/P98_RUNTIME_REPEATABILITY.json').read_text());fail=json.loads((ROOT/'receipts/p98/P98_FAILURE_ADJUDICATION.json').read_text());rowmap=json.loads((ROOT/'receipts/p98/P98_CURRENT_20_ROW_FINAL_DISTANCE_MAP.json').read_text())
pass_checks=runtime['checks']['passed']+static['checks']['passed']+ts['checks']['passed']+reach['checks']['passed']+reg['aggregateChecks']
tests={
 'schemaVersion':'velmere.p98r1.test-aggregate.v1','generatedAt':FIXED,'status':'PASS_BOUNDED_WITH_ENVIRONMENT_WITHHELD',
 'currentCore':{'runtime':runtime['checks'],'static':static['checks'],'targetedStrictTypeScript':ts['checks'],'reachability':reach['checks']},
 'selectedAffectedScopeRegression':reg,'repeatability':repeat['checks'],'overlappingPassChecks':pass_checks,'withheldChecks':reach['checks'].get('withheld',0),'failedChecksCredited':0,
 'failureAdjudication':fail['summary'],
 'warning':'The pass-check total overlaps heavily and is not an independent evidence count, accuracy statistic, provider count, customer count or FINAL numerator.',
 'truthBoundary':'Bounded local runtime, static, targeted TypeScript, import/transpile and selected regression proof only. Two route imports remain dependency-environment WITHHELD. No real route, entitlement, provider, database, artifact delivery, build, exact Windows or Customer FINAL proof.'
}
write('artifacts/closure/p98r1/P98R1_TEST_AGGREGATE.json',tests)
env={
 'schemaVersion':'velmere.p98r1.environment-truth.v1','generatedAt':FIXED,'status':'EXTERNAL_BLOCKER_CONFIRMED_AND_DEPENDENCY_ENVIRONMENT_MISSING',
 'inheritedAuthorizedStaging':'EXTERNAL_BLOCKER_CONFIRMED from P97; no authorized PostgreSQL/Supabase credentials or tooling in this execution environment.',
 'current':{'platform':'Linux x64','node':'v22.16.0','npm':'10.9.2','globalTypeScript':'5.8.3','nodeModulesPresent':False,'zodAvailable':False},
 'target':{'platform':'Windows Server 2025','node':'24.18.0','npm':'11.16.0'},
 'proof':{'targetedStrictTypeScript':'PASS_BOUNDED 4 core modules','allChangedFilesTranspile':'PASS 12/12','changedModuleImports':'PASS 10; WITHHELD 2 route imports missing zod','wholeProjectSemanticTypeScript':'WITHHELD','eslint':'WITHHELD','webpack':'WITHHELD','turbopack':'WITHHELD','exactWindows':'WITHHELD','stagingDatabase':'EXTERNAL_BLOCKER_CONFIRMED'},
 'truthBoundary':'Describes only this execution environment. It neither proves the owner has no staging nor converts source transpile into route/build/deployment credit.'
}
write('artifacts/closure/p98r1/P98R1_ENVIRONMENT_TRUTH.json',env)
closure={
 'schemaVersion':'velmere.p98r1.closure-boundary.v1','generatedAt':FIXED,'status':'PASS_BOUNDED_NO_FINAL_PROMOTION',
 'subScope':{'exactRequestedPaidTierSemantics':'PASS_BOUNDED','implicitDowngradeBlocked':True,'artifactBeforeExactDecision':False,'automatedAdvancedHumanGateRemoved':True,'advancedSaleEligible':False},
 'numerators':{'customerFinal':'0/20','auditFinalPdf':'0/3','rights':'2/203 inherited only','paidValue':'0/10','saleEligible':'0/20'},
 'rows':{'realMarketsPro':'WITHHELD','realMarketsAdvanced':'WITHHELD','allOtherRows':'unchanged from current 20-row map'},
 'remaining':[
  'real current market data and field semantic classes','field-level rights/currentness/session-time proof','real paid entitlement and account isolation','material matched-input Pro/Advanced value','deployed immutable artifact/customer route','rendered accessibility/i18n/cross-browser','whole-project typecheck/lint/build','exact Windows','final adjudication'
 ],
 'truthBoundary':'P98 closes source-level exact-tier customer integrity only. It does not create an entitlement, charge, paid artifact, provider evidence, customer value, deployment, FINAL or sale eligibility.'
}
write('artifacts/closure/p98r1/P98R1_CLOSURE_BOUNDARY.json',closure)
blockers={
 'schemaVersion':'velmere.p98r1.current-blocker-map.v1','generatedAt':FIXED,'status':'OPEN_WITHHELD_QUEUE',
 'highestPriority':[{'category':'ENVIRONMENT','id':'authorized_staging_and_exact_engineering','state':'EXTERNAL_BLOCKER_CONFIRMED','affects':['risk-indicator','browser-basic','all deployed FINAL chains']},{'category':'RIGHTS','id':'real_markets_field_level_rights_currentness','state':'WITHHELD','affects':['real-markets-basic','real-markets-pro','real-markets-advanced']},{'category':'PRODUCT','id':'real_markets_material_paid_value','state':'WITHHELD','affects':['real-markets-pro','real-markets-advanced']},{'category':'ENVIRONMENT','id':'complete_dependency_graph_zod_build_windows','state':'WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING','affects':['all rows']}],
 'nextIndependentWorkstream':'Real Markets Basic field semantic-class and fail-closed customer truth, unless authorized staging/exact engineering becomes available.',
 'all20RowsClassified':len(rowmap['rows'])==20,'customerFinal':'0/20'
}
write('artifacts/closure/p98r1/P98R1_CURRENT_BLOCKER_MAP.json',blockers)
checkpoint={
 'schemaVersion':'velmere.p98r1.checkpoint-receipt.v1','generatedAt':FIXED,'status':'PASS_BOUNDED','parent':'P97R1','current':'P98R1','authorityBinding':'PASS','parentPreservation':'PASS_BYTE_IDENTICAL','sourceDelta':'PASS_DECLARED_DELTA_ONLY','productProjection':proj,'tests':{'overlappingPassChecks':pass_checks,'withheldRouteImports':2,'repeatability':'4/4 commands 2/2 byte-identical'},'numerators':closure['numerators'],'global':'NO_GO / STOP_SELL','truthBoundary':closure['truthBoundary']
}
write('artifacts/closure/p98r1/P98R1_CHECKPOINT_RECEIPT.json',checkpoint)
print(json.dumps({'status':'PASS','projection':proj,'parentPreserved':preserved,'tests':pass_checks},indent=2))
