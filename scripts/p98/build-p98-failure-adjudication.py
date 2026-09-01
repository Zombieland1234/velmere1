#!/usr/bin/env python3
import hashlib,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
items=[
 ('parent_advanced_fallback_defect','00_P98_PARENT_ADVANCED_FALLBACK_DEFECT.log','PRODUCT_DEFECT_FIXED','P97 modeled Advanced as Pro and exposed fallback/manual-review semantics. P98 removed the implicit mapping and gates all paid delivery on exact requested-tier readiness.'),
 ('runtime_false_positive_artifact_word','01_P98_RUNTIME_FALSE_POSITIVE_ARTIFACT_WORD.log','TEST_FALSE_POSITIVE_FIXED','The first negative test matched the customer-safe sentence saying no artifact may be created. The test now checks forbidden fields rather than safe warning text.'),
 ('runtime_file_path_directory_defect','02_P98_RUNTIME_HARNESS_FILE_PATH_DIRECTORY_DEFECT.log','TEST_HARNESS_DEFECT_FIXED','The first writer created a directory at the receipt filename. The harness now creates only the parent directory and writes the file atomically.'),
 ('broad_typescript_dependency_failure','03_P98_TARGETED_TYPESCRIPT_BROAD_DEPENDENCY_ENVIRONMENT_FAIL.log','ENVIRONMENT_WITHHELD_ZERO_CREDIT','The broad targeted attempt traversed into a module requiring unavailable Node type declarations. P98 does not claim whole-project TypeScript.'),
 ('first_ambient_config_defect','04_P98_TARGETED_TYPESCRIPT_FIRST_AMBIENT_CONFIG_DEFECT.log','TEST_CONFIG_DEFECT_FIXED','The first noResolve ambient set did not cover alias imports and had incorrect stubs. The final bounded config compiles four exact core modules.'),
 ('real_markets_route_import','REAL_MARKETS_ROUTE_IMPORT_WITHHELD.log','WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING','The route import is blocked by absent zod in the dependency graph. Exact source transpile passes; no route execution credit is granted.'),
 ('market_report_route_import','MARKET_REPORT_ROUTE_IMPORT_WITHHELD.log','WITHHELD_DEPENDENCY_ENVIRONMENT_MISSING','The shared report route import is blocked by absent zod. Exact source transpile passes; no route execution credit is granted.'),
 ('package_identity_order_defect','05_P98_PACKAGE_IDENTITY_FROZEN_BEFORE_PACKAGER_ADDED.log','PACKAGING_ORDER_DEFECT_FIXED','The first identity was frozen before the P98 packager script existed, so the package correctly rejected the file-count mismatch. The complete tree is re-frozen before the credited 2/2 build.'),
]
rows=[]
for id_,name,state,adjudication in items:
 p=ROOT/'artifacts/p98/failures'/name
 rows.append({'id':id_,'state':state,'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':'sha256:'+hashlib.sha256(p.read_bytes()).hexdigest(),'adjudication':adjudication,'creditedAsPass':False})
receipt={'schemaVersion':'velmere.p98.failure-adjudication.v1','generatedAt':'2026-08-21T12:30:00.000Z','status':'PASS_ALL_FAILURES_PRESERVED_AND_ADJUDICATED','summary':{'total':len(rows),'creditedAsPass':0,'fixedProductDefects':1,'fixedHarnessOrConfigDefects':4,'environmentWithheld':3},'rows':rows,'truthBoundary':'Every first failure or environment block listed here remains preserved with zero PASS credit. Later green runs are credited only after root-cause adjudication.'}
raw=json.dumps(receipt,indent=2)+'\n'
for rel in ['receipts/p98/P98_FAILURE_ADJUDICATION.json','artifacts/p98/P98_FAILURE_ADJUDICATION.json']:
 p=ROOT/rel;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(raw)
print(json.dumps(receipt))
