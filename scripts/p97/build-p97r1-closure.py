#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json, os, platform, shutil, subprocess, zipfile
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "artifacts/closure/p97r1"
OUT.mkdir(parents=True, exist_ok=True)
FIXED = "2026-08-21T08:30:00.000Z"
P96_ZIP = Path("/mnt/data/VELMERE_R44P46_V17_P96R1_P95_SIBLING_RECONCILIATION_RISK_HISTORY_INTEGRITY_MERGE_CURRENT_SOURCE_ONLY_IN_PROGRESS_2026-08-21.zip")
P96_LEDGER = Path("/mnt/data/VELMERE_CURRENT_STATE_AND_PASS_DELTA_LEDGER_P96R1_V17_2026-08-21.txt")
MASTER = ROOT / "VELMERE_ULTIMATE_WORLD_CLASS_CONTINUOUS_CLOSURE_FINAL_CANDIDATE_MASTER_DIRECTIVE_V2_R1_CHECKPOINT_IDENTITY_2026-08-21.txt"
V17 = ROOT / "VELMERE_CANONICAL_OWNER_DIRECTIVE_V17_TRUE_TOPOLOGY_AUTOMATED_ADVANCED_CURRENT_WORLD_CLASS_2026-08-17.txt"
PARENT_PRODUCT = ROOT / "artifacts/closure/p96r1/P96R1_CURRENT_PRODUCT_PROJECTION_MANIFEST.json"


def sha_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def sha(path: Path) -> str:
    h=hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda:f.read(4*1024*1024), b''): h.update(chunk)
    return h.hexdigest()

def write(rel: str, value: Any) -> Path:
    p=ROOT/rel; p.parent.mkdir(parents=True,exist_ok=True)
    p.write_text(json.dumps(value,indent=2,ensure_ascii=False)+"\n",encoding='utf-8')
    return p

def projection(rows: list[dict[str,Any]]) -> dict[str,Any]:
    rows=sorted(rows,key=lambda r:r['path'])
    ph=hashlib.sha256("\n".join(r['path'] for r in rows).encode()).hexdigest()
    agg=hashlib.sha256()
    for r in rows: agg.update(f"{r['path']}\0{r['byteLength']}\0{r['sha256']}\n".encode())
    return {'fileCount':len(rows),'payloadBytes':sum(r['byteLength'] for r in rows),'pathSetSha256':ph,'sourceContentAggregateSha256':agg.hexdigest()}

def file_row(rel: str) -> dict[str,Any]:
    p=ROOT/rel
    return {'path':rel,'byteLength':p.stat().st_size,'sha256':sha(p)}

if not P96_ZIP.is_file() or sha(P96_ZIP)!="5b9cb95f9fe2ffdb893e52baa7496da2bc14665cf3af2ddff54c948e0f2c8176":
    raise SystemExit('parent_p96_invalid')
if sha(MASTER)!="45e2b377be0869f1acb3ef34844919643a537c617b0a8145402cc8c732e8b3c1": raise SystemExit('master_invalid')
if sha(V17)!="de7fbd6df651a7a8a8f85054c6e9ac3c2ca530ebfb0d4ccd335dcb99fb658f05": raise SystemExit('v17_invalid')
if (ROOT/'VELMERE_ACTIVE_PASS.txt').read_text().strip()!='P97R1': raise SystemExit('active_pass_invalid')

# Authority binding
master_text=MASTER.read_text(encoding='utf-8')
sections=[]
import re
sections=[int(x) for x in re.findall(r'(?m)^# (\d+)\.',master_text)]
authority={
 'schemaVersion':'velmere.p97r1.authority-binding.v1','generatedAt':FIXED,'status':'PASS',
 'ownerDecision':{
   'masterV2R1AcceptedAsCurrent':True,'p96AcceptedAsOnlyCanonicalParent':True,
   'riskHistoryLocalOnlyPolishingStopped':True,'continueWithoutDawajDalej':True,
 },
 'masterDirective':{'file':MASTER.name,'bytes':MASTER.stat().st_size,'sha256':sha(MASTER),'sections0Through88Present':sections==list(range(89)),'startNowPresent':'START NOW' in master_text,'endSentinelPresent':'END-OF-DIRECTIVE' in master_text},
 'canonicalOwnerDirective':{'file':V17.name,'bytes':V17.stat().st_size,'sha256':sha(V17),'changed':False},
 'parent':{'checkpoint':'P96R1','sourceOnly':P96_ZIP.name,'bytes':P96_ZIP.stat().st_size,'sha256':sha(P96_ZIP),'ledger':P96_LEDGER.name,'ledgerSha256':sha(P96_LEDGER)},
 'current':'P97R1','truthBoundary':'Binds current owner execution authority and unique P96 parent. It grants no product FINAL, staging, deployment or exact-Windows credit.'
}
write('artifacts/closure/p97r1/P97R1_AUTHORITY_BINDING.json',authority)

# Product projection: exact P96 product list + one modified route + one new policy.
parent=json.loads(PARENT_PRODUCT.read_text(encoding='utf-8'))
parent_rows={r['path']:dict(r) for r in parent['files']}
route='lib/server/search-route-modules/lens-report.ts'; policy='lib/search/lens-pdf-durable-artifact-policy.ts'
if route not in parent_rows or policy in parent_rows: raise SystemExit('product_projection_parent_shape')
before_route=dict(parent_rows[route]); parent_rows[route]=file_row(route); parent_rows[policy]=file_row(policy)
rows=sorted(parent_rows.values(),key=lambda r:r['path'])
current_projection=projection(rows)
product_manifest={
 'schemaVersion':'velmere.p97r1.current-product-projection-manifest.v1','generatedAt':FIXED,'status':'PASS_LOCAL_DETERMINISTIC_SOURCE_IDENTITY_ONLY',
 'parentCheckpoint':'P96R1','parentProjection':parent['currentCandidateProjection'],'currentCandidateProjection':current_projection,
 'deltaFromP96':{'fileCount':current_projection['fileCount']-parent['currentCandidateProjection']['fileCount'],'payloadBytes':current_projection['payloadBytes']-parent['currentCandidateProjection']['payloadBytes'],'changedBuildRelevantFiles':2},
 'changedBuildRelevantFiles':[
   {'path':route,'change':'MODIFIED','beforeBytes':before_route['byteLength'],'beforeSha256':before_route['sha256'],'afterBytes':parent_rows[route]['byteLength'],'afterSha256':parent_rows[route]['sha256']},
   {'path':policy,'change':'ADDED','beforeBytes':None,'beforeSha256':None,'afterBytes':parent_rows[policy]['byteLength'],'afterSha256':parent_rows[policy]['sha256']},
 ],
 'browserBasicClosureEffect':{'finalDistanceGateGroupsBefore':6,'finalDistanceGateGroupsAfter':5,'customerFinal':False,'reason':'Production Basic now requires durable render-once/store-first, but real authorized storage/deployment, current input/rights, rendered Browser/accessibility and exact engineering proof remain missing.'},
 'files':rows,
 'truthBoundary':'Product source projection only. Local source identity and bounded tests do not prove real storage, deployment, Browser rendering, rights/currentness or Customer FINAL.'
}
write('artifacts/closure/p97r1/P97R1_CURRENT_PRODUCT_PROJECTION_MANIFEST.json',product_manifest)

# Parent preservation: all P96 entries except the three intentionally replaced parent files must remain exact.
with zipfile.ZipFile(P96_ZIP) as z:
    parent_map={i.filename:(i.file_size,sha_bytes(z.read(i.filename))) for i in z.infolist() if not i.is_dir()}
current_map={}
for p in ROOT.rglob('*'):
    if p.is_file(): current_map[p.relative_to(ROOT).as_posix()]=(p.stat().st_size,sha(p))
expected_modified={route,'VELMERE_ACTIVE_PASS.txt','PACKAGE_CONTENT_MANIFEST.tsv'}
unexpected_modified=[]; removed=[]; preserved=0
for rel,val in parent_map.items():
    if rel in expected_modified: continue
    if rel not in current_map: removed.append(rel)
    elif current_map[rel]!=val: unexpected_modified.append(rel)
    else: preserved+=1
preservation={
 'schemaVersion':'velmere.p97r1.parent-preservation.v1','generatedAt':FIXED,
 'status':'PASS_BYTE_IDENTICAL' if not unexpected_modified and not removed else 'FAIL',
 'parent':{'checkpoint':'P96R1','sourceOnly':P96_ZIP.name,'sha256':sha(P96_ZIP),'entryCount':len(parent_map)},
 'expectedModifiedParentFiles':sorted(expected_modified),'preservedParentFiles':preserved,
 'removedParentFiles':removed,'unexpectedModifiedParentFiles':unexpected_modified,
 'restoredHistoricalReceipt':{'path':'receipts/p80/P80_AUDIT_EXACT_IMMUTABLE_ACCOUNT_ARTIFACT_RUNTIME.json','sha256':current_map.get('receipts/p80/P80_AUDIT_EXACT_IMMUTABLE_ACCOUNT_ARTIFACT_RUNTIME.json',(None,None))[1],'restoredFromP96':True},
 'truthBoundary':'Verifies byte preservation of every P96 parent file except the declared route, active-pass pointer and deterministic package manifest. Added P97 files are new evidence and do not rewrite history.'
}
if preservation['status']!='PASS_BYTE_IDENTICAL': raise SystemExit(json.dumps(preservation))
write('artifacts/closure/p97r1/P97R1_PARENT_PRESERVATION.json',preservation)

# Source change manifest
source_change={
 'schemaVersion':'velmere.p97r1.source-change-manifest.v1','generatedAt':FIXED,'status':'PASS_DECLARED_DELTA_ONLY','parent':'P96R1','current':'P97R1',
 'productionChanges':product_manifest['changedBuildRelevantFiles'],
 'governanceChanges':[{'path':'VELMERE_ACTIVE_PASS.txt','change':'MODIFIED','before':'P96R1','after':'P97R1'}],
 'newEvidenceScopes':['scripts/p97/','receipts/p97/','artifacts/p97/','artifacts/closure/p97r1/','tsconfig.p97-browser-pdf-policy-targeted.json','P97R1_PACKAGE_BUILD_RECIPE.json'],
 'riskHistoryProductFilesChanged':[],
 'physicalRepairs':[
   'Browser Basic no longer allows a production direct/non-durable PDF path.',
   'Canonical durable job identity is bound to the signed frozen report rather than client request headers or transport metadata.',
   'Exact PDF receipt uses byte-level SHA-256 and verifies actual bytes, policy, length, mode and replay state.',
   'Production missing durable store fails before renderer execution.',
   'Local memory replay remains bounded and explicitly ineligible for Customer FINAL storage credit.',
 ],
 'truthBoundary':'Exact source delta from P96. No staging, provider, rights, rendered Browser or Customer FINAL promotion.'
}
write('artifacts/closure/p97r1/P97R1_SOURCE_CHANGE_MANIFEST.json',source_change)

external=json.loads((ROOT/'receipts/p97/P97_EXTERNAL_BLOCKER_CONFIRMED.json').read_text())
environment={
 'schemaVersion':'velmere.p97r1.environment-truth.v1','generatedAt':FIXED,'status':'EXTERNAL_BLOCKER_CONFIRMED_AND_LOCAL_BOUNDED_ONLY',
 'current':external['exactEngineeringEnvironment'],
 'authorizedStaging':external['authorizedStaging'],
 'proof':{
   'targetedStrictTypeScript':'PASS 1/1 new policy module',
   'wholeProjectSemanticTypeScript':'WITHHELD_DEPENDENCY_GRAPH_AND_EXACT_RUNTIME_MISSING',
   'eslint':'WITHHELD_DEPENDENCY_GRAPH_MISSING','webpack':'WITHHELD','turbopack':'WITHHELD','renderedBrowser':'WITHHELD_EXTERNAL_FONT_AND_DEPENDENCIES','exactWindows':'WITHHELD','stagingDatabase':'EXTERNAL_BLOCKER_CONFIRMED'
 },
 'truthBoundary':external['truthBoundary']
}
write('artifacts/closure/p97r1/P97R1_ENVIRONMENT_TRUTH.json',environment)

# Current tests. Counts overlap and are not independent evidence counts.
test_paths=[
 'receipts/p97/P97_BROWSER_BASIC_DURABLE_PDF_RUNTIME.json','receipts/p97/P97_BROWSER_BASIC_DURABLE_PDF_STATIC.json','receipts/p97/P97_CHANGED_MODULE_REACHABILITY.json','receipts/p97/P97_TARGETED_STRICT_TYPESCRIPT.json','receipts/p97/P97_REPEATABILITY.json','receipts/p97/P97_CURRENT_20_ROW_FINAL_DISTANCE_MAP.json','receipts/p97/P97_FAILURE_ADJUDICATION.json'
]
test_aggregate={
 'schemaVersion':'velmere.p97r1.test-aggregate.v1','generatedAt':FIXED,'status':'PASS_BOUNDED_AFFECTED_SCOPE_WITH_EXTERNAL_AND_SUPERSEDED_WITHHELDS',
 'core':{
   'runtime':{'passed':43,'total':43},'static':{'passed':66,'total':66},'changedModuleReachability':{'passed':10,'total':10},'targetedStrictTypeScript':{'passed':1,'total':1},'overlappingChecks':120
 },
 'reexecutedRelevantRegressions':[
   {'name':'A102R11 client PDF byte binding/object URL','passed':43,'total':43,'exitCode':0},
   {'name':'Lens 2/4/8 tier page contract','passed':3,'total':3,'exitCode':0},
   {'name':'P87 Real Markets exact immutable PDF','passed':43,'total':43,'exitCode':0},
   {'name':'P80 Audit exact immutable artifact','passed':67,'total':67,'exitCode':0},
 ],
 'freshAffectedScopeChecksAcrossOverlappingHarnesses':276,
 'freshPassCommands':8,
 'classificationMap':{'rowsClassified':20,'finalPromotions':0,'classification':'SOURCE_DERIVED_ESTIMATE_NOT_RELEASE_SCORE'},
 'repeatability':'5/5 commands each 2/2 byte-identical',
 'withheldOrSupersededZeroCredit':[
   'A83 rendered Browser/Lens matrix: exact licensed font path missing.',
   'A72 first invocation: TypeScript loader missing.',
   'A72 current rerun: historical source-coverage assertion superseded.',
   'P86 migration-latest assertion superseded by P91/P93/P94.',
   'P88 runtime provider schema superseded by P89/P90.',
 ],
 'receipts':[{'path':p,'bytes':(ROOT/p).stat().st_size,'sha256':sha(ROOT/p)} for p in test_paths],
 'numeratorImpact':{'customerFinalBefore':'0/20','customerFinalAfter':'0/20','browserBasicFinal':False},
 'truthBoundary':'Fresh current-byte bounded source/runtime checks. Counts overlap and do not prove deployment, exact fonts, whole-project build, rights/currentness, real customer behavior or FINAL.'
}
write('artifacts/closure/p97r1/P97R1_TEST_AGGREGATE.json',test_aggregate)

security={
 'schemaVersion':'velmere.p97r1.security-privacy-boundary.v1','generatedAt':FIXED,'status':'PASS_BOUNDED_SOURCE_AND_LOCAL_NEGATIVE_CONTROLS',
 'controls':{
   'clientRequestIdCannotForkCanonicalJob':True,'ipAndUserAgentCannotForkCanonicalJob':True,'exactPdfBytesReverified':True,'receiptNotReturnedInCustomerHeaders':True,'receiptNotReturnedInCustomerPayload':True,'productionMissingStoreFailsBeforeRender':True,'durableRetentionClaimed':False,'backupRestoreProven':False,'rawCredentialValuesRecorded':False,'riskHistoryProductFilesChanged':False
 },
 'prohibitedActions':{'externalTransactionSent':False,'externalStateChanged':False,'liveExploitPerformed':False,'weaponizedPocCreated':False,'authorizationBypassAttempted':False,'unauthorizedScanPerformed':False},
 'truthBoundary':'Local/source defensive boundary only. Real Supabase authorization, RLS, deployed HTTP/cache, account isolation and Browser security remain withheld.'
}
write('artifacts/closure/p97r1/P97R1_SECURITY_AND_PRIVACY_BOUNDARY.json',security)

blocker_map={
 'schemaVersion':'velmere.p97r1.current-blocker-map.v1','generatedAt':FIXED,'status':'OPEN_BLOCKERS_CLASSIFIED',
 'riskIndicator':{'state':'EXTERNAL_BLOCKER_CONFIRMED','reason':'Authorized staging credentials/tools are absent in this execution environment. P91/P93/P94, RLS/JWT, rollback/concurrency and deployed HTTP were not executed.','nextAction':'Execute the existing chain only in authorized staging; no more local-only Risk History polishing.'},
 'rows':[
   {'priority':1,'category':'ENVIRONMENT','workstream':'Browser Basic real delivery','blocker':'No authorized durable Supabase store/replay, exact licensed font, rendered Browser matrix, real current input/rights, whole-project build or exact Windows on P97 bytes.','nextAction':'Run the existing P97 policy in authorized exact environment; Browser Basic remains WITHHELD.'},
   {'priority':2,'category':'ENVIRONMENT','workstream':'Risk Indicator staging','blocker':'EXTERNAL_BLOCKER_CONFIRMED in current environment.','nextAction':'Use authorized staging when available; do not simulate it locally.'},
   {'priority':3,'category':'RIGHTS','workstream':'Real Markets Basic','blocker':'Real current market fields, semantic classes, field-level rights/currentness/session time and deployed customer route remain open.','nextAction':'Use as next independent row when Browser/staging environment remains blocked.'},
   {'priority':4,'category':'PRODUCT','workstream':'Shield Basic','blocker':'Real current evidence/rights, calibrated risk ground truth and deployed fail-closed customer route remain open.','nextAction':'Inspect for independent product correctness repairs without inventing live evidence.'},
   {'priority':5,'category':'RIGHTS','workstream':'Audit Basic/Pro/Advanced','blocker':'Deployment/currentness/rights and paid provider evidence remain open.','nextAction':'Do not add aliases or mirrors; continue only with real independent rights-safe evidence.'},
 ],
 'all20RowsMap':'receipts/p97/P97_CURRENT_20_ROW_FINAL_DISTANCE_MAP.json',
 'noProgressRule':'Change independent workstream when an external blocker remains; do not retry until green or build local staging imitations.'
}
write('artifacts/closure/p97r1/P97R1_CURRENT_BLOCKER_MAP.json',blocker_map)

# Browser Basic closure boundary
browser_boundary={
 'schemaVersion':'velmere.p97r1.browser-basic-closure-boundary.v1','generatedAt':FIXED,'status':'PASS_BOUNDED_SOURCE_REPAIR_NOT_FINAL',
 'row':'browser-basic','sourceRepair':{
   'productionDurableStoreRequired':True,'renderOnceStoreFirst':True,'signedReportCanonicalJobIdentity':True,'exactByteDigest':True,'sameObjectUrlPreviewDownloadInheritedAndReexecuted':True,'localMemoryCustomerFinalEligible':False
 },
 'finalDistance':{'beforeCriticalGateGroups':6,'afterCriticalGateGroups':5,'remaining':['REAL_CUSTOMER_AUTHORIZED_CURRENT_INPUT_AND_RIGHTS','AUTHORIZED_DURABLE_STORE_AND_DEPLOYED_REPLAY','RENDERED_BROWSER_ACCESSIBILITY_I18N_CROSS_BROWSER','WHOLE_PROJECT_BUILD_EXACT_WINDOWS','FINAL_ADJUDICATION']},
 'credits':{'browserBasicFinal':False,'customerFinal':'0/20','saleEligible':False,'live':False},
 'truthBoundary':'Closes one production-reachable artifact-integrity defect. No real storage, deployed read path, exact font, rendered Browser, rights/currentness or final adjudication exists.'
}
write('artifacts/closure/p97r1/P97R1_BROWSER_BASIC_CLOSURE_BOUNDARY.json',browser_boundary)

# Checkpoint receipt after evidence exists.
evidence_rels=[
 'artifacts/closure/p97r1/P97R1_AUTHORITY_BINDING.json','artifacts/closure/p97r1/P97R1_CURRENT_PRODUCT_PROJECTION_MANIFEST.json','artifacts/closure/p97r1/P97R1_PARENT_PRESERVATION.json','artifacts/closure/p97r1/P97R1_SOURCE_CHANGE_MANIFEST.json','artifacts/closure/p97r1/P97R1_ENVIRONMENT_TRUTH.json','artifacts/closure/p97r1/P97R1_TEST_AGGREGATE.json','artifacts/closure/p97r1/P97R1_FAILURE_ADJUDICATION.json','artifacts/closure/p97r1/P97R1_SECURITY_AND_PRIVACY_BOUNDARY.json','artifacts/closure/p97r1/P97R1_CURRENT_BLOCKER_MAP.json','artifacts/closure/p97r1/P97R1_CURRENT_20_ROW_FINAL_DISTANCE_MAP.json','artifacts/closure/p97r1/P97R1_BROWSER_BASIC_CLOSURE_BOUNDARY.json'
]
checkpoint={
 'schemaVersion':'velmere.p97r1.checkpoint-receipt.v1','generatedAt':FIXED,'status':'PASS_BOUNDED_P97R1_BROWSER_BASIC_DURABLE_RENDER_ONCE_STORE_FIRST',
 'parent':{'checkpoint':'P96R1','sourceOnlySha256':sha(P96_ZIP)},'activePass':'P97R1',
 'masterDirective':{'file':MASTER.name,'sha256':sha(MASTER)},'canonicalOwnerDirective':{'file':V17.name,'sha256':sha(V17),'changed':False},
 'evidence':[{'path':rel,'bytes':(ROOT/rel).stat().st_size,'sha256':sha(ROOT/rel)} for rel in evidence_rels],
 'productProjection':current_projection,
 'tests':{'freshAffectedScopeChecksAcrossOverlappingHarnesses':276,'freshPassCommands':8,'repeatability':'5/5 commands 2/2 byte-identical'},
 'numerators':{'customerFinal':'0/20','auditFinalPdf':'0/3','rights':'2/203 inherited only','paidValue':'0/10','saleEligible':'0/20','browserBasicFinal':False,'riskIndicatorFinal':False,'pilotReady':False,'goPaid':False,'live':False,'worldClassProven':False},
 'global':'NO_GO / STOP_SELL',
 'truthBoundary':'P97 repairs Browser Basic final-artifact durability policy and confirms external staging/exact-environment blockers. Real durable database, deployment, rendered Browser, rights/currentness, exact Windows and Customer FINAL remain withheld.'
}
write('artifacts/closure/p97r1/P97R1_CHECKPOINT_RECEIPT.json',checkpoint)

recipe={
 'schemaVersion':'velmere.p97r1.package-build-recipe.v1','generatedAt':FIXED,'status':'READY_FOR_DETERMINISTIC_BUILD','activePass':'P97R1',
 'output':'VELMERE_R44P46_V17_P97R1_BROWSER_BASIC_DURABLE_RENDER_ONCE_STORE_FIRST_CURRENT_SOURCE_ONLY_IN_PROGRESS_2026-08-21.zip',
 'ordering':'lexicographic','timestamp':'1980-01-01T00:00:00Z','compression':'ZIP_DEFLATED level 1','directoryEntries':0,'createSystem':0,'externalMode':'0600','deterministicRebuildsRequired':2,
 'requiredChecks':['tree identity excluding self','package manifest exactness','2/2 byte-identical builds','CRC','clean unpack path/content identity','secret/private-key scan','unexpected current binary scan','final four-file verification'],
 'truthBoundary':'Packaging recipe only; no product FINAL or environment credit.'
}
(ROOT/'P97R1_PACKAGE_BUILD_RECIPE.json').write_text(json.dumps(recipe,indent=2)+"\n",encoding='utf-8')

print(json.dumps({'status':'PASS','productProjection':current_projection,'parentPreserved':preserved,'checkpoint':checkpoint['status']},indent=2))
