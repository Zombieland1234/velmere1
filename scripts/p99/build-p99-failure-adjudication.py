#!/usr/bin/env python3
from __future__ import annotations
import hashlib,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
items=[
 ('parent_rights_live_label_defect','00_P99_PARENT_REAL_MARKETS_BASIC_RIGHTS_LIVE_LABEL_DEFECT.log','PRODUCT_RIGHTS_AND_SEMANTIC_DEFECT_FIXED','Parent source could call unapproved CoinGecko/Binance lanes, expose local reference rows, and label aggregated reference data live. P99 blocks before network/cache/fallback and applies field semantic contracts.'),
 ('markets_route_import_missing_zod','01_P99_MARKETS_ROUTE_IMPORT_WITHHELD_MISSING_ZOD.log','WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING','The customer route import cannot execute because the dependency graph lacks zod. Source transpile/static order proof passes; route execution receives no credit.'),
 ('market_row_gate_import_missing_zod','MARKET_ROW_GATE_IMPORT_WITHHELD.log','WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING','The shared market-row gate import cannot execute because zod is unavailable. Transpile passes; no semantic runtime or route credit.'),
 ('typescript_wrong_global_path','02_P99_TARGETED_TYPESCRIPT_WRONG_GLOBAL_PATH.log','TEST_HARNESS_PATH_DEFECT_FIXED','The first compiler path was wrong. It did not adjudicate product source and receives zero credit.'),
 ('mjs_declaration_resolution','03_P99_TARGETED_TYPESCRIPT_MJS_DECLARATION_RESOLUTION.log','TYPE_DECLARATION_REACHABILITY_DEFECT_FIXED','Bundler resolution required a matching .d.mts for the .mjs import. P99 adds the exact declaration and reruns bounded strict TypeScript.'),
 ('pass36_local_reference_harness','04_P99_PASS36_LOCAL_REFERENCE_HARNESS_SUPERSEDED.log','SUPERSEDED_NO_CREDIT','Historical P36 harness is frozen to its old active-pass identity and old local-reference requirement. It is not rewritten to pass P99.'),
 ('pass6_market_gate_dependency','05_P99_PASS6_MARKET_GATE_WITHHELD_MISSING_ZOD.log','WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING','The historical market-risk runtime harness cannot import current dependencies without zod. No retry or PASS credit.'),
 ('p87_receipt_overwrite','06_P99_P87_HISTORICAL_RECEIPT_OVERWRITE_RESTORED.log','HISTORICAL_OUTPUT_MUTATION_RESTORED','Current-byte regression output was copied into P99 scope; frozen P87 receipt was restored byte-for-byte from the P98 parent.'),
]
rows=[]
for id_,name,state,adjudication in items:
 p=ROOT/'artifacts/p99/failures'/name
 if not p.is_file(): raise SystemExit(f'missing_failure:{name}')
 rows.append({'id':id_,'state':state,'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':'sha256:'+hashlib.sha256(p.read_bytes()).hexdigest(),'adjudication':adjudication,'creditedAsPass':False})
receipt={
 'schemaVersion':'velmere.p99.failure-adjudication.v1','generatedAt':'2026-08-21T14:45:00.000Z',
 'status':'PASS_ALL_FIRST_FAILURES_BLOCKERS_AND_SUPERSEDED_RUNS_PRESERVED',
 'summary':{'total':len(rows),'creditedAsPass':0,'fixedProductDefects':1,'fixedTypeOrHarnessDefects':2,'environmentWithheld':3,'superseded':1,'historyRestored':1},
 'supportingRawDiagnostics':['artifacts/p99/failures/MARKETS_ROUTE_IMPORT_WITHHELD.log'],
 'rows':rows,
 'truthBoundary':'Every first product defect, failed setup, unavailable dependency, superseded harness and historical overwrite remains preserved with zero PASS credit. Later green results are credited only after root-cause adjudication.'
}
raw=json.dumps(receipt,indent=2)+'\n'
for rel in ['receipts/p99/P99_FAILURE_ADJUDICATION.json','artifacts/p99/P99_FAILURE_ADJUDICATION.json']:
 p=ROOT/rel;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(raw)
print(json.dumps(receipt['summary'],indent=2))
