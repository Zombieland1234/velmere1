#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json, re, zipfile
from pathlib import Path
from typing import Any
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'artifacts/closure/p99r1'; OUT.mkdir(parents=True,exist_ok=True)
FIXED='2026-08-21T15:00:00.000Z'
PARENT_ZIP=Path('/mnt/data/VELMERE_R44P46_V17_P98R1_EXACT_PAID_TIER_DELIVERY_NO_IMPLICIT_DOWNGRADE_CURRENT_SOURCE_ONLY_IN_PROGRESS_2026-08-21.zip')
PARENT_LEDGER=Path('/mnt/data/VELMERE_CURRENT_STATE_AND_PASS_DELTA_LEDGER_P98R1_V17_2026-08-21.txt')
MASTER=ROOT/'VELMERE_ULTIMATE_WORLD_CLASS_CONTINUOUS_CLOSURE_FINAL_CANDIDATE_MASTER_DIRECTIVE_V2_R1_CHECKPOINT_IDENTITY_2026-08-21.txt'
V17=ROOT/'VELMERE_CANONICAL_OWNER_DIRECTIVE_V17_TRUE_TOPOLOGY_AUTOMATED_ADVANCED_CURRENT_WORLD_CLASS_2026-08-17.txt'
PARENT_PRODUCT=ROOT/'artifacts/closure/p98r1/P98R1_CURRENT_PRODUCT_PROJECTION_MANIFEST.json'
PARENT_SHA='84db768e729af06a72939252bf1cfe9a5eaa8d953e076135be746c5ac4f5cec1'
PARENT_LEDGER_SHA='8b8ff4f3e328560d3f351cb7c50c1df6fd0e009fc9ee1e270d39433e80784ba5'
MASTER_SHA='45e2b377be0869f1acb3ef34844919643a537c617b0a8145402cc8c732e8b3c1'
V17_SHA='de7fbd6df651a7a8a8f85054c6e9ac3c2ca530ebfb0d4ccd335dcb99fb658f05'
MODIFIED=[
 'lib/market-integrity/market-row-delivery-gate.ts',
 'lib/server/market-integrity-route-modules/markets.ts',
]
ADDED=[
 'config/p99/real-markets-basic-field-rights-currentness-registry.json',
 'lib/compliance/provider-delivery-rights-gate.d.mts',
 'lib/market-integrity/real-markets-basic-field-policy.ts',
]

def sha(p:Path)->str:
 h=hashlib.sha256()
 with p.open('rb') as f:
  for c in iter(lambda:f.read(4*1024*1024),b''): h.update(c)
 return h.hexdigest()
def shab(b:bytes)->str:return hashlib.sha256(b).hexdigest()
def write(rel:str,obj:Any):
 p=ROOT/rel;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(obj,indent=2,ensure_ascii=False)+'\n',encoding='utf-8');return p
def row(rel:str):
 p=ROOT/rel;return {'path':rel,'byteLength':p.stat().st_size,'sha256':sha(p)}
def projection(rows):
 ordered=sorted(rows,key=lambda x:x['path']); ph=hashlib.sha256('\n'.join(x['path'] for x in ordered).encode()).hexdigest(); agg=hashlib.sha256()
 for x in ordered:agg.update(f"{x['path']}\0{x['byteLength']}\0{x['sha256']}\n".encode())
 return {'fileCount':len(ordered),'payloadBytes':sum(x['byteLength'] for x in ordered),'pathSetSha256':ph,'sourceContentAggregateSha256':agg.hexdigest()}

if not PARENT_ZIP.is_file() or sha(PARENT_ZIP)!=PARENT_SHA:raise SystemExit('parent_p98_invalid')
if not PARENT_LEDGER.is_file() or sha(PARENT_LEDGER)!=PARENT_LEDGER_SHA:raise SystemExit('parent_ledger_invalid')
if sha(MASTER)!=MASTER_SHA or sha(V17)!=V17_SHA:raise SystemExit('authority_invalid')
if (ROOT/'VELMERE_ACTIVE_PASS.txt').read_text().strip()!='P99R1':raise SystemExit('active_pass_invalid')
master_text=MASTER.read_text(encoding='utf-8'); sections=[int(x) for x in re.findall(r'(?m)^# (\d+)\.',master_text)]
authority={
 'schemaVersion':'velmere.p99r1.authority-binding.v1','generatedAt':FIXED,'status':'PASS',
 'ownerDecision':{'masterV2R1Current':True,'originalV2FrozenHistory':True,'v17Unchanged':True,'p96UniqueMergeAccepted':True,'continueAutonomously':True,'riskHistoryLocalPolishingStopped':True},
 'masterDirective':{'file':MASTER.name,'bytes':MASTER.stat().st_size,'sha256':sha(MASTER),'sections0Through88Present':sections==list(range(89)),'startNowPresent':'START NOW' in master_text,'endSentinelPresent':'END-OF-DIRECTIVE' in master_text,'uniqueCheckpointIdentityRulePresent':'UNIQUE CHECKPOINT IDENTITY / BRANCH COLLISION' in master_text.upper(),'changedInP99':False},
 'canonicalOwnerDirective':{'file':V17.name,'bytes':V17.stat().st_size,'sha256':sha(V17),'changedInP99':False},
 'parent':{'checkpoint':'P98R1','sourceOnly':PARENT_ZIP.name,'bytes':PARENT_ZIP.stat().st_size,'sha256':sha(PARENT_ZIP),'ledger':PARENT_LEDGER.name,'ledgerSha256':sha(PARENT_LEDGER)},
 'current':'P99R1','truthBoundary':'Authority, unique parent and current checkpoint binding only. No rights approval, provider execution, deployment, build or Customer FINAL credit.'
}
write('artifacts/closure/p99r1/P99R1_AUTHORITY_BINDING.json',authority)

parent=json.loads(PARENT_PRODUCT.read_text()); rows={x['path']:dict(x) for x in parent['files']}; changes=[]
for rel in MODIFIED:
 if rel not in rows:raise SystemExit(f'product_parent_missing:{rel}')
 before=dict(rows[rel]);rows[rel]=row(rel);changes.append({'path':rel,'change':'MODIFIED','beforeBytes':before['byteLength'],'beforeSha256':before['sha256'],'afterBytes':rows[rel]['byteLength'],'afterSha256':rows[rel]['sha256']})
for rel in ADDED:
 if rel in rows:raise SystemExit(f'product_added_already_exists:{rel}')
 rows[rel]=row(rel);changes.append({'path':rel,'change':'ADDED','beforeBytes':None,'beforeSha256':None,'afterBytes':rows[rel]['byteLength'],'afterSha256':rows[rel]['sha256']})
product_rows=sorted(rows.values(),key=lambda x:x['path']);proj=projection(product_rows);pp=parent['currentCandidateProjection']
product={
 'schemaVersion':'velmere.p99r1.current-product-projection-manifest.v1','generatedAt':FIXED,'status':'PASS_LOCAL_DETERMINISTIC_SOURCE_IDENTITY_ONLY',
 'parentCheckpoint':'P98R1','parentProjection':pp,'currentCandidateProjection':proj,
 'deltaFromP98':{'fileCount':proj['fileCount']-pp['fileCount'],'payloadBytes':proj['payloadBytes']-pp['payloadBytes'],'changedBuildRelevantFiles':len(changes)},
 'changedBuildRelevantFiles':changes,
 'customerEffect':{'affectedRows':['real-markets-basic'],'unapprovedProviderNetworkBlockedBeforeCall':True,'localReferenceCustomerFallbackRemoved':True,'fieldSemanticContracts':23,'priceSemanticClass':'reference','liveClaimed':False,'executableQuoteClaimed':False,'customerFinalPromotions':0,'rightsPromotions':0,'saleEligiblePromotions':0},
 'riskHistoryProductFilesChanged':[], 'files':product_rows,
 'truthBoundary':'Product source projection only. P99 proves field-level rights/currentness semantics and fail-closed source behavior. It does not approve rights, execute providers/routes, prove current data, deploy, render Browser, build, run exact Windows or promote FINAL.'
}
write('artifacts/closure/p99r1/P99R1_CURRENT_PRODUCT_PROJECTION_MANIFEST.json',product)

with zipfile.ZipFile(PARENT_ZIP) as z: parent_map={i.filename:(i.file_size,shab(z.read(i.filename))) for i in z.infolist() if not i.is_dir()}
current_map={p.relative_to(ROOT).as_posix():(p.stat().st_size,sha(p)) for p in ROOT.rglob('*') if p.is_file()}
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
restored='receipts/p87/P87_REAL_MARKETS_EXACT_PDF_RUNTIME.json'
preservation={
 'schemaVersion':'velmere.p99r1.parent-preservation.v1','generatedAt':FIXED,'status':'PASS_BYTE_IDENTICAL',
 'parent':{'checkpoint':'P98R1','sourceOnly':PARENT_ZIP.name,'sha256':PARENT_SHA,'entryCount':len(parent_map)},
 'declaredModifiedParentFiles':sorted(expected),'actuallyModifiedParentFilesBeforePackageFreeze':sorted(actual),'packageManifestWillBeRebuilt':True,
 'preservedParentFiles':preserved,'removedParentFiles':removed,'unexpectedModifiedParentFiles':unexpected,
 'addedProductionFiles':ADDED,
 'restoredHistoricalReceipt':{'path':restored,'sha256':current_map[restored][1],'expectedSha256':'d2ca95d05f5dc727f3b0ef1e1038e21811b18a847fbf47628ee1d98ebf1793ca','restoredByteIdentical':current_map[restored][1]=='d2ca95d05f5dc727f3b0ef1e1038e21811b18a847fbf47628ee1d98ebf1793ca'},
 'truthBoundary':'Every P98 parent file remains byte-identical except the declared current source files, active pass and final package-manifest replacement. New P99 files are additions; frozen historical receipts are restored before packaging.'
}
write('artifacts/closure/p99r1/P99R1_PARENT_PRESERVATION.json',preservation)
source={
 'schemaVersion':'velmere.p99r1.source-change-manifest.v1','generatedAt':FIXED,'status':'PASS_DECLARED_DELTA_ONLY','parent':'P98R1','current':'P99R1',
 'productionChanges':changes,'governanceChanges':[{'path':'VELMERE_ACTIVE_PASS.txt','change':'MODIFIED','before':'P98R1','after':'P99R1'}],
 'newEvidenceScopes':['scripts/p99/','receipts/p99/','artifacts/p99/','artifacts/closure/p99r1/','tsconfig.p99-real-markets-basic-targeted.json','P99R1_PACKAGE_BUILD_RECIPE.json'],
 'riskHistoryProductFilesChanged':[],
 'physicalRepairs':[
  'Real Markets Basic verifies exact field-level rights/currentness policy before any CoinGecko/Binance provider, durable-cache or fallback execution.',
  'Current unverified rights produce a minimal customer-safe WITHHELD response with no market rows or internal provider topology.',
  'The deterministic local customer reference fallback was removed from the customer markets route.',
  'All 23 required fields have explicit semantic class, unit/currency, venue scope, currentness class, maximum age and execution-ineligibility contracts.',
  'Price is classified as aggregated reference data and is never claimed live, venue-specific, executable or a trade quote.',
  'Market-row evidence and public projections carry the semantic/currentness contract rather than inferring live status from HTTP success.',
  'The field-policy verifier fully rebuilds the expected decision and rejects self-consistent recomputed-digest mutations.',
  'A matching .d.mts declaration repairs Bundler TypeScript reachability for the existing .mjs rights gate.'
 ],
 'truthBoundary':'Exact source delta from P98. No customer-display right, commercial right, provider call, route execution, real field, deployment, rendered Browser, build or FINAL promotion.'
}
write('artifacts/closure/p99r1/P99R1_SOURCE_CHANGE_MANIFEST.json',source)

runtime=json.loads((ROOT/'receipts/p99/P99_REAL_MARKETS_BASIC_RIGHTS_SEMANTICS_RUNTIME.json').read_text());static=json.loads((ROOT/'receipts/p99/P99_REAL_MARKETS_BASIC_RIGHTS_SEMANTICS_STATIC.json').read_text());ts=json.loads((ROOT/'receipts/p99/P99_TARGETED_STRICT_TYPESCRIPT.json').read_text());reach=json.loads((ROOT/'receipts/p99/P99_CHANGED_MODULE_REACHABILITY.json').read_text());reg=json.loads((ROOT/'receipts/p99/P99_AFFECTED_SCOPE_REGRESSION.json').read_text());repeat=json.loads((ROOT/'receipts/p99/P99_REPEATABILITY.json').read_text());fail=json.loads((ROOT/'receipts/p99/P99_FAILURE_ADJUDICATION.json').read_text());rowmap=json.loads((ROOT/'receipts/p99/P99_CURRENT_20_ROW_FINAL_DISTANCE_MAP.json').read_text())
tests={
 'schemaVersion':'velmere.p99r1.test-aggregate.v1','generatedAt':FIXED,'status':'PASS_BOUNDED_WITH_DEPENDENCY_WITHHELD',
 'currentCore':{'runtime':runtime['checks'],'static':static['checks'],'targetedStrictTypeScript':ts['checks'],'reachability':reach['checks']},
 'affectedScopeRegression':reg,'repeatability':repeat['checks'],
 'overlappingChecks':reg['overlappingChecks'],'failedChecksCredited':0,'failureAdjudication':fail['summary'],
 'warning':'The 355 passed checks overlap and are not independent evidence, provider count, customer count, accuracy metric, full-project regression or FINAL numerator.',
 'truthBoundary':'Bounded local runtime, static, targeted TypeScript, import/transpile and selected current-byte regression only. Two imports remain dependency-environment WITHHELD. No real route, provider, rights, database, Browser, build, exact Windows or Customer FINAL proof.'
}
write('artifacts/closure/p99r1/P99R1_TEST_AGGREGATE.json',tests)
env={
 'schemaVersion':'velmere.p99r1.environment-truth.v1','generatedAt':FIXED,'status':'EXTERNAL_BLOCKER_CONFIRMED_AND_DEPENDENCY_ENVIRONMENT_MISSING',
 'authorizedStaging':'EXTERNAL_BLOCKER_CONFIRMED for this execution environment: no credentials, psql, Supabase CLI or container runtime.',
 'current':{'platform':'Linux x64','node':'v22.16.0','npm':'10.9.2','globalTypeScript':'5.8.3','nodeModulesPresent':False,'zodAvailable':False},
 'target':{'platform':'Windows Server 2025','node':'24.18.0','npm':'11.16.0'},
 'proof':{'newPolicyImport':'PASS','changedSourceTranspile':'PASS 3/3','marketGateAndRouteImports':'WITHHELD 2 missing zod','targetedStrictTypeScript':'PASS_BOUNDED exact new policy boundary','wholeProjectSemanticTypeScript':'WITHHELD','eslint':'WITHHELD','webpack':'WITHHELD','turbopack':'WITHHELD','renderedBrowser':'WITHHELD','exactWindows':'WITHHELD'},
 'truthBoundary':'Describes this execution environment only. It does not prove the owner lacks staging elsewhere and does not convert source transpile/static checks into route, provider, deployment or FINAL credit.'
}
write('artifacts/closure/p99r1/P99R1_ENVIRONMENT_TRUTH.json',env)
closure={
 'schemaVersion':'velmere.p99r1.closure-boundary.v1','generatedAt':FIXED,'status':'PASS_BOUNDED_NO_FINAL_PROMOTION',
 'subScope':{'fieldRegistryIntegrity':'PASS_BOUNDED','preNetworkRightsGate':'PASS_SOURCE_STATIC_AND_POLICY_RUNTIME','customerDeliveryState':'WITHHELD_RIGHTS_UNVERIFIED','fieldSemanticContracts':23,'realProviderExecution':False,'rightsApproved':False},
 'numerators':{'customerFinal':'0/20','auditFinalPdf':'0/3','rights':'2/203 inherited only','paidValue':'0/10','saleEligible':'0/20'},
 'rows':{'realMarketsBasic':'WITHHELD','realMarketsPro':'WITHHELD','realMarketsAdvanced':'WITHHELD','allOtherRows':'unchanged from current 20-row map'},
 'remaining':['field-level commercial display/derived/cache/retention rights','real customer-authorized current market fields','provider/venue/session timestamps and freshness','deployed customer route and durable artifact','rendered accessibility/i18n/cross-browser','whole-project typecheck/lint/build','exact Windows','final adjudication'],
 'truthBoundary':'P99 prevents unapproved Real Markets Basic data from reaching the customer and defines honest semantic classes. It does not itself obtain lawful rights, current market data, deployment or FINAL.'
}
write('artifacts/closure/p99r1/P99R1_CLOSURE_BOUNDARY.json',closure)
blockers={
 'schemaVersion':'velmere.p99r1.current-blocker-map.v1','generatedAt':FIXED,'status':'OPEN_WITHHELD_QUEUE',
 'highestPriority':[{'category':'ENVIRONMENT','id':'authorized_staging_and_exact_engineering','state':'EXTERNAL_BLOCKER_CONFIRMED','affects':['risk-indicator','browser-basic','all deployed FINAL chains']},{'category':'RIGHTS','id':'real_markets_basic_field_rights','state':'WITHHELD_UNVERIFIED','affects':['real-markets-basic']},{'category':'ENVIRONMENT','id':'complete_dependency_graph_zod_build_windows','state':'WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING','affects':['all rows']},{'category':'PRODUCT','id':'shield_basic_real_current_evidence_and_risk_ground_truth','state':'OPEN','affects':['shield-basic']}],
 'nextIndependentWorkstream':'Shield Basic real-current evidence, rights, risk-logic and customer fail-closed path while staging and Real Markets rights remain externally blocked.',
 'all20RowsClassified':len(rowmap['rows'])==20,'customerFinal':'0/20'
}
write('artifacts/closure/p99r1/P99R1_CURRENT_BLOCKER_MAP.json',blockers)
checkpoint={
 'schemaVersion':'velmere.p99r1.checkpoint-receipt.v1','generatedAt':FIXED,'status':'PASS_BOUNDED','parent':'P98R1','current':'P99R1','authorityBinding':'PASS','parentPreservation':'PASS_BYTE_IDENTICAL','sourceDelta':'PASS_DECLARED_DELTA_ONLY','productProjection':proj,'tests':{'overlappingPassedChecks':reg['overlappingChecks']['passed'],'withheldChecks':reg['overlappingChecks']['withheld'],'repeatability':'4/4 commands 2/2 byte-identical'},'numerators':closure['numerators'],'global':'NO_GO / STOP_SELL','truthBoundary':closure['truthBoundary']
}
write('artifacts/closure/p99r1/P99R1_CHECKPOINT_RECEIPT.json',checkpoint)
recipe={
 'schemaVersion':'velmere.p99r1.package-build-recipe.v1','checkpoint':'P99R1','parentCheckpoint':'P98R1','ordering':'lexicographic-relative-path','timestamp':'1980-01-01T00:00:00Z','directoryEntries':0,'zipCreateSystem':0,'externalMode':'0600','compression':'ZIP_DEFLATED','compressionLevel':1,'deterministicRebuildsRequired':2,'manifest':'PACKAGE_CONTENT_MANIFEST.tsv','identityReceipt':'artifacts/closure/p99r1/P99R1_TREE_IDENTITY_EXCLUDING_SELF.json','truthBoundary':'Packaging recipe only. It does not prove rights, providers, route deployment, Browser, Customer FINAL or exact Windows.'
}
write('P99R1_PACKAGE_BUILD_RECIPE.json',recipe)
print(json.dumps({'status':'PASS','projection':proj,'parentPreserved':preserved,'overlappingPassedChecks':reg['overlappingChecks']['passed'],'withheld':reg['overlappingChecks']['withheld']},indent=2))
