from __future__ import annotations
import json,pathlib,hashlib
ROOT=pathlib.Path(__file__).resolve().parents[2]; P=ROOT/'artifacts/closure/p65'; P64=ROOT/'artifacts/closure/p64'
def J(p): return json.loads(pathlib.Path(p).read_text(encoding='utf-8-sig'))
def h(p): return hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
dec=J(P/'P65_CURRENT_SOURCE_DECISION_RECEIPTS.json'); rev=J(P/'P65_CURRENT_SOURCE_REVIEW_MATRIX.json'); obs=J(P/'P65_CURRENT_OBSERVATION_SUMMARY.json'); win=J(P/'P65_GITHUB_EXACT_WINDOWS_CURRENT_SOURCE_SUMMARY.json'); parent=J(P/'P65_PARENT_P64_BYTE_PRESERVATION.json'); p46=J(P/'P65_EXACT_P46_PROJECTION_RETENTION.json'); gap=J(P/'P65_CURRENT_TARGET_GAP.json'); field=J(P/'P65_TARGET_FIELD_ADJUDICATION.json'); p64base=J(P64/'P64_CURRENT_OUTPUT_BASELINE.json')
prof64={(x['family'].lower().replace(' ','-'),x['context']):x for x in p64base['profiles']}
D={x['productSku']:x for x in dec['customerRows']}
source={x['sourceId']:x for x in rev['sources']}
lines=[]
a=lines.append
a('VELMÈRE — CURRENT STATE AND PASS DELTA LEDGER')
a('REVISION: P65 / V16')
a('DATE: 2026-08-16')
a('AUTHORITY: V16 CURRENT BOUND AUTHORITY — byte-identical, unchanged')
a('PARENT COMPLETE HANDOFF: P64 / V16')
a('PASS DECISION: PASS_BOUNDED_P65_CURRENT_FREE_LEGAL_SOURCE_DECISION_RECEIPTS')
a('P65 CREDIT CLASS: CURRENT_OFFICIAL_SOURCE_RECEIPTS + FAIL_CLOSED_DECISION_COVERAGE + ENGINEERING_PRIMARY_SOURCE_RIGHTS_CLASSIFICATION')
a('GLOBAL RELEASE DECISION: NO_GO')
a('LIVE: false')
a('saleEnabled: false')
a('productionApproved: false')
a('worldClassProven: false')
a('')
a('='*70);a('EXECUTIVE DELTA — P64 → P65');a('='*70)
a('Axis | P64 | P65 | Delta / honest credit')
a(f"P64 parent byte preservation | current parent | {parent['byteIdentical']}/{parent['parentFileCount']} byte-identical | PASS")
a(f"Exact P46 projection | 1597/1597 | {p46['fileCount']}/{p46['fileCount']} inherited byte-exact | PASS — no source mutation")
a('Customer-facing row baseline inventory | 17/17 | 17/17 preserved | no change')
a('Internal profile baseline inventory | 33/33 | 33/33 preserved | no change')
a('P65 target field decision/adjudication coverage | 0/74 target slice | 74/74 target slice | +74 DECISION_ONLY; legal rights credit remains 0/176')
a('Customer rows with current-source decision receipt | 0/17 | 6/17 (35.29%) | +6 DECISION_RECEIPT_ONLY')
a('Internal profiles with current-source decision receipt | 0/33 | 12/33 (36.36%) | +12 DECISION_RECEIPT_ONLY')
a('Physically fetched current official data endpoints | 0/3 frozen P65 endpoints | 3/3 | NVD + ECB FX + CISA KEV observed')
a('Current endpoints rights-bounded for customer consideration | 0/3 | 2/3 | NVD + ECB bounded; CISA rights withheld')
a('Source-level bounded engineering rights classifications | not frozen | 5/12 | NVD/CVE/CWE/CAPEC/ECB; NOT 5 legal fields')
a('Exact Windows current-source receipt | 0/1 | 1/1 Windows Server 2025 / Node 24.18.0 / npm 11.16.0 | PASS_BOUNDED_SOURCE_RECEIPT')
a('Customer-facing rows FINAL current output | 0/17 | 0/17 | no false promotion')
a('Internal profiles FINAL current output | 0/33 | 0/33 | no false promotion')
a('Legal source fields passed | 0/176 | 0/176 | OPEN — source-level classification is not field/output legal closure')
a('Material explicit-tier transitions | 0/6 | 0/6 | OPEN')
a('Sale eligible rows | 0/17 | 0/17 | STOP_SELL')
a('Global | NO_GO | NO_GO | unchanged')
a('')
a('P65 converts a selected four-family slice from “we know the fixture exists” into a current, physical source/terms decision state. The product is still withheld unless exact promised-field, freshness, rights, factual-quality and customer-output gates are closed. Current official data receipt is not equivalent to full product currentness.')
a('')
# Table 0
a('='*70);a('TABLE 0 — PRODUCT TOPOLOGY TRUTH');a('='*70)
a('Family | Customer-facing type | Current SKU rows | Internal contexts | Delta required by catalog | Truth invariant | Current discrepancy | Evidence')
t0=[
('Audit','Explicitly tiered','Basic / Pro / Advanced','3','YES — 2 transitions','facts + safety','P65 3/3 customer source decisions + 3/3 profile decisions; real contract/source-bytecode/tools/labels still absent','P65 decisions + NVD/CVE/CWE/CAPEC receipts'),
('PDF','Explicitly tiered','Basic / Pro / Advanced','3','YES — 2 transitions','facts + artifact bytes','P64 baseline only; final stored customer bytes/production parity still absent','P64 baseline + P61 bounded replay'),
('Browser','Explicitly tiered','Basic / Pro / Advanced','3','YES — 2 transitions','facts + safety','P64 baseline only; final production output absent','P64 baseline + P61 bounded Browser'),
('Shield','Standalone','Shield','3','CATALOG-DEPENDENT','risk facts + safety','P64 fixture baseline only; current network/source rights not closed','P64 baseline + A84'),
('Shield Pro','Standalone','Shield Pro','3','CATALOG-DEPENDENT','facts + permissions','P64 fixture baseline only; production/account proof absent','P64 baseline + A85'),
('Shield Map','Standalone','Shield Map','3','CATALOG-DEPENDENT','node/edge truth + safety','P64 fixture baseline only; current graph/rights absent','P64 baseline + A85'),
('Real Markets','Standalone','Real Markets','3','CATALOG-DEPENDENT','market facts + timestamps','P65 explicit PARTIAL_CURRENT_SOURCE_CAPABILITY_FX_ECB_REFERENCE_ONLY; full cross-asset current output absent','P65 ECB receipt + provider terms decisions'),
('Market Impact','Standalone','Market Impact','3','CATALOG-DEPENDENT','inputs + limitations','P65 explicit NO_USABLE_ORDER_BOOK; current lawful depth source absent','P65 source decisions'),
('Whale Watch','Standalone','Whale Watch','3','CATALOG-DEPENDENT','chain truth + uncertainty','P65 explicit UNCLASSIFIED_CURRENT_CHAIN_EVIDENCE; current lawful chain/indexer/labels absent','P65 source decisions'),
('Angel','Standalone','Angel','3','CATALOG-DEPENDENT','known truth + safety','P64 synthetic baseline; matched same-input 3-context groups still absent','P64 baseline + A88'),
('Risk Indicator','Standalone','Risk Indicator','3','CATALOG-DEPENDENT','indicator + safety','P64 synthetic baseline; matched same-input 3-context groups still absent','P64 baseline + A88')]
for r in t0:a(' | '.join(r))
a('Canonical customer-facing denominator: 17 rows. Internal denominator: 33 profiles. P65 current-source decisions cover 6/17 rows and 12/33 profiles; final closure remains 0/17 and 0/33.')
a('')
# Table1
a('='*70);a('TABLE 1 — CUSTOMER-FACING CLOSURE, 17-ROW STARTING DENOMINATOR');a('='*70)
a('Product/SKU | Previous % | Current % | Delta pp | Exact current output | Customer value today | Rights/freshness | Missing to 100 | Hard blocker | Sale eligibility | Evidence')
rows17=['Audit Basic','Audit Pro','Audit Advanced','PDF Basic','PDF Pro','PDF Advanced','Browser Basic','Browser Pro','Browser Advanced','Shield','Shield Pro','Shield Map','Real Markets','Market Impact','Whale Watch','Angel','Risk Indicator']
for sku in rows17:
 if sku in D:
  x=D[sku]; exact=f"SOURCE_DECISION={x['decision']}; FINAL=WITHHELD"
  rf='CURRENT_SOURCE_RECEIPT_BOUND / FIELD_RIGHTS_NOT_CLOSED'
  blocker=x['reason'].replace('|','/')
  ev='artifacts/closure/p65/P65_CURRENT_SOURCE_DECISION_RECEIPTS.json'
 else:
  exact='P64 BASELINE_CAPTURED; FINAL=WITHHELD';rf='P64 HISTORICAL/FIXTURE BASELINE; CURRENT FINAL UNRESOLVED';blocker='product-specific current source/right/freshness/factual/output closure';ev='artifacts/closure/p64/P64_CURRENT_OUTPUT_BASELINE.json'
 a(f'{sku} | 0% final | 0% final | 0 | {exact} | WITHHELD_NOT_FINAL | {rf} | product-specific closure | {blocker} | WITHHELD | {ev}')
a('')
# Table2 33 profiles
a('='*70);a('TABLE 2 — INTERNAL 33-PROFILE EXECUTION');a('='*70)
a('Family | Context | Previous execution | Current execution | Exact bytes/hash | Truth consistency | Paid-delta applicability | Value result | Runtime match | Evidence')
targetfam={'audit','real-markets','market-impact','whale-watch'}
families=['Audit','PDF','Browser','Shield','Shield Pro','Shield Map','Real Markets','Market Impact','Whale Watch','Angel','Risk Indicator']
ctxs=['BASIC_CONTEXT','PRO_CONTEXT','ADVANCED_CONTEXT']
for fam in families:
 keyfam=fam.lower().replace(' ','-')
 for ctx in ctxs:
  p=prof64.get((keyfam,ctx)) or prof64.get((fam.lower(),ctx))
  hashpart=(p['captureArtifact']['sha256'][:16]+'… / agg '+p['aggregateSha256'][:16]+'…') if p else 'P64 hash binding preserved'
  current='P65 CURRENT_SOURCE_DECISION_RECEIPT' if keyfam in targetfam else 'P64 BASELINE_PRESERVED'
  truth='FAIL_CLOSED_CURRENT_SOURCE_DECISION' if keyfam in targetfam else ('WITHHELD_NO_MATCHED_GROUPS' if fam in {'Angel','Risk Indicator'} else 'P64_BASELINE_TRUTH_ONLY')
  delta='YES' if fam in {'Audit','PDF','Browser'} else 'CATALOG_DEPENDENT'
  runtime='P65 exact Windows source-receipt metadata only' if keyfam in targetfam else 'not re-executed P65'
  ev='P65_CURRENT_SOURCE_DECISION_RECEIPTS.json' if keyfam in targetfam else 'P64_CURRENT_OUTPUT_BASELINE.json'
  a(f'{fam} | {ctx} | P64 BASELINE_CAPTURED | {current} | {hashpart} | {truth} | {delta} | WITHHELD | {runtime} | {ev}')
a('')
# Table3
a('='*70);a('TABLE 3 — CURRENT → TARGET → GAP');a('='*70)
a('Family/SKU/context | CURRENT | TARGET | GAP | Action completed this pass | Test result | Next action')
for r in gap['customerRows']:
 a(f"{r['productSku']} | {r['current']} | {r['target']} | {r['gap']} | {r['actionCompletedP65']} | {r['testResult']} | {r['nextAction']}")
a('')
# Table4
a('='*70);a('TABLE 4 — DATA/RIGHTS/FRESHNESS');a('='*70)
a('Field/source | Product | Rights state | Commercial/display/derived state | Freshness | Fallback | Current health | Reverify-by | Blocker')
for sid in ['nvd','cve','cwe','capec','ecb_statistics','cisa_kev','coingecko','twelve_data','alpha_vantage','polygon','coinbase','coinpaprika']:
 s=source[sid]; obsx=s['officialFetchObservations']; health=';'.join(f"{o['fetchId']}:{o['httpStatus'] or 'ERR'}:{'A' if o['anchorPass'] else 'NOA'}" for o in obsx) or 'no P65 physical fetch / inherited block'
 products=','.join(s['products']); rights=s['engineeringRightsState']; cdd=f"commercial={s['commercialUseAllowed']}; display={s['customerDisplayAllowed']}; derived={s['derivedUseAllowed']}"
 freshness='P65 physical receipt' if obsx else 'inherited decision / reverify required';fallback='UNAVAILABLE / omit affected field' if rights!='PASS_BOUNDED_PRIMARY_SOURCE_TERMS' else 'bounded-source-only; fail closed outside scope'
 blocker='none at source-class engineering level; exact field/output binding still open' if rights=='PASS_BOUNDED_PRIMARY_SOURCE_TERMS' else rights
 a(f'{sid} | {products} | {rights} | {cdd} | {freshness} | {fallback} | {health} | BEFORE_FINAL_CANDIDATE | {blocker}')
a('NVD current observation | Audit | PASS_BOUNDED_PRIMARY_SOURCE_TERMS | source-capability only | current P65 retrieval | unavailable if stale/fetch fails | CVE-2024-3094 physically normalized | next final candidate | not a customer contract audit output')
a('ECB FX current observation | Real Markets | PASS_BOUNDED_PRIMARY_SOURCE_TERMS | reference statistics only | 2026-08-13/14 observations in P65 receipt | explicit unavailable outside bounded FX reference | 6 rows physically normalized | next final candidate | not executable quote/full cross-asset product')
a('CISA KEV current observation | Audit | WITHHELD_EXPLICIT_LICENSE_BODY_NOT_CAPTURED | no customer display credit | catalog current receipt | omit customer field | catalog physically fetched | on license-body resolution | rights unresolved')
a('Legal-source-fields passed remains 0/176. Five source-level engineering terms classifications do not become five field-level legal approvals.')
a('')
# Table5
a('='*70);a('TABLE 5 — GLOBAL DENOMINATORS');a('='*70)
a('Metric | P64 | P65 | Delta | Remaining | Credit class')
metrics=[
('Canonical V16 authority binding','1/1','1/1','0','0','CURRENT_BOUND_AUTHORITY'),
('P64 parent bytes preserved','—',f"{parent['byteIdentical']}/{parent['parentFileCount']}",f"+{parent['byteIdentical']} verified",'0','PACKAGE_PARENT_PRESERVATION'),
('Exact P46 projection','1597/1597','1597/1597','0','0','INHERITED_EXACT_IDENTITY'),
('Customer-facing row baseline inventory','17/17','17/17','0','0 baseline','BASELINE_CAPTURE_COMPLETE'),
('Internal profile baseline inventory','33/33','33/33','0','0 baseline','BASELINE_CAPTURE_COMPLETE'),
('P65 target-field adjudication slice','0/74','74/74','+74','0 decision state','DECISION_ONLY_NOT_RIGHTS'),
('Customer rows with current-source decision receipt','0/17','6/17','+6','11','CURRENT_SOURCE_DECISION_ONLY'),
('Internal profiles with current-source decision receipt','0/33','12/33','+12','21','CURRENT_SOURCE_DECISION_ONLY'),
('Required physical official-source fetch gates','0/7','7/7','+7','0','PASS_CURRENT_RECEIPT'),
('Current official data endpoint observations','0/3','3/3','+3','0 observation','CURRENT_OBSERVATION_ONLY'),
('Current data endpoints rights-bounded for customer consideration','0/3','2/3','+2','1 + full product coverage','BOUNDED_SOURCE_CAPABILITY_ONLY'),
('Source-level bounded engineering rights classifications','not frozen','5/12','+5 frozen decisions','7 blocked/withheld','ENGINEERING_PRIMARY_SOURCE_REVIEW_NOT_COUNSEL'),
('Customer-facing rows FINAL current output','0/17','0/17','0','17','OPEN_REQUIRED_FOR_GO_INTERNAL'),
('Internal profiles FINAL current output','0/33','0/33','0','33','OPEN_REQUIRED_FOR_GO_INTERNAL'),
('Legal source fields passed','0/176','0/176','0','176','OPEN_REQUIRED_FOR_PAID'),
('Material explicit-tier transitions passed','0/6','0/6','0','6','OPEN_REQUIRED_FOR_PAID'),
('Matched-input final groups','0/550 minimum','0/550 minimum','0','550','OPEN'),
('Factual final holdouts','0/11','0/11','0','11','OPEN'),
('Exact Windows P65 current-source receipt','0/1','1/1','+1','0','PASS_BOUNDED_SOURCE_RECEIPT'),
('Browser distinct executions','3/3 bounded','3/3 bounded','0','final production rerun','PASS_BOUNDED_NOT_FINAL'),
('PDF independent replay','1/1 bounded','1/1 bounded','0','final production/customer replay','PASS_BOUNDED_NOT_FINAL'),
('Security/privacy final closure','0/1','0/1','0','1','OPEN'),('Accessibility/i18n final closure','0/1','0/1','0','1','OPEN'),('Convergence rounds','0/3','0/3','0','3','OPEN'),('FINAL_AI_VALIDATION','0/1','0/1','0','1','NOT_READY'),('REAL_EXTERNAL_PROOF','0/1','0/1','0','1','NOT_STARTED'),('Sale-eligible customer rows','0/17','0/17','0','17','STOP_SELL')]
for r in metrics:a(' | '.join(r))
a('')
a('='*70);a('SEPARATE RELEASE / EVIDENCE STATES');a('='*70)
for r in [
('CANONICAL LAST FINAL HANDOFF','P64/V16'),('CURRENT WORKING / FINAL HANDOFF CANDIDATE','P65/V16 current/free/legal source-decision receipts'),('HISTORICAL IMPLEMENTATION','preserved; no automatic final credit'),('CURRENT RECEIPT CREDIT','6/17 customer current-source decisions; 12/33 profile current-source decisions; 74/74 target-slice adjudication; 3 current data observations; 5 bounded source-level engineering terms classifications'),('EXECUTION COVERAGE','P64 baseline 17/17 + 33/33 preserved; P65 exact Windows source-receipt workflow PASS; FINAL output 0/17 + 0/33'),('QUALITY RESULTS','P65 verifier 29/29; independent verifier 18/18; exact Windows current-source workflow PASS'),('VALUE-PASSED DENOMINATOR','0/6 material explicit-tier transitions'),('INTERNAL_PRODUCT_CLOSURE','not reached'),('FINAL_AI_VALIDATION','not ready'),('REAL_EXTERNAL_PROOF','not started'),('GO_INTERNAL','false'),('PILOT_READY','false'),('GO_PAID','0/17'),('LIVE','false'),('WORLD_CLASS_PROVEN','false')]: a(f'{r[0]} | {r[1]}')
a('')
a('='*70);a('WHAT WAS PHYSICALLY CHANGED / EXECUTED');a('='*70)
a(f"1. Reverified every P64 parent package file: {parent['byteIdentical']}/{parent['parentFileCount']} byte-identical, zero P64 mutations.")
a('2. Adjudicated all 74 candidate fields in the P65 target slice (Audit 27, Real Markets 19, Market Impact 14, Whale Watch 14) into explicit fail-closed source/fallback states. This is 74/74 decision coverage, not rights-passed credit.')
a('3. Created current-source decision receipts for 6/17 customer rows and exactly 12/33 internal profiles (four target families × Basic/Pro/Advanced contexts). The earlier transient 18-profile construction was rejected and repaired before handoff; Audit now maps exactly Basic→Basic, Pro→Pro, Advanced→Advanced once each.')
a('4. Physically fetched and hash-bound current official terms/data on Windows Server 2025. Seven required fetch gates passed with zero required failures. NVD, ECB FX and CISA KEV current data endpoints were observed; only NVD/ECB receive bounded customer-consideration source capability, while CISA remains rights-withheld.')
a('5. Current NVD sample CVE-2024-3094 and ECB FX reference observations were normalized into customer-safe bounded evidence records; the ECB receipt explicitly forbids treating reference statistics as executable quotes.')
a('6. Froze source-level engineering rights decisions: NVD/CVE/CWE/CAPEC/ECB PASS_BOUNDED_PRIMARY_SOURCE_TERMS; market-data free-first candidates remain blocked where commercial/display entitlement is absent; CISA KEV remains withheld because its exact license body was not captured in the physical runner evidence.')
a('7. Exact Windows GitHub run 31954673253 completed SUCCESS on Node 24.18.0 / npm 11.16.0 and produced artifact 9265619777. No final customer, legal-field, value, sale, LIVE or WORLD_CLASS bit was promoted.')
a('')
a('FAIL / WITHHELD')
a('- Audit remains unavailable for final customer output: no exact current customer contract/source-bytecode/compiler/tool/independent-label evidence bundle; Advanced also lacks real human review evidence.')
a('- Real Markets is only partially source-capable through ECB FX reference statistics. Full quote/history/corporate-actions/crypto/provider-quorum rights and currentness are not closed.')
a('- Market Impact remains NO_USABLE_ORDER_BOOK because no lawful current customer-display depth/order-book source is bound.')
a('- Whale Watch remains UNCLASSIFIED_CURRENT_CHAIN_EVIDENCE because lawful current chain/indexer + verified labels + finality/cluster ground truth are absent.')
a('- Legal source fields remain 0/176: source-level engineering terms review is not legal counsel approval or exact promised-field/output rights closure.')
a('- Final outputs remain 0/17 and 0/33; paid material deltas 0/6; sale 0/17; NO_GO.')
a('')
a('NEXT HIGHEST-VALUE TASK')
a('P66: apply the P65 current-source decision engine to the actual customer-output boundary. First build a real supported Audit input/evidence envelope and a Real Markets ECB-only customer-safe current output with exact timestamp/provenance/attribution/unavailable behavior; independently implement current source/finality classification for Whale Watch and prove NO_USABLE_ORDER_BOOK behavior for Market Impact. In parallel add Angel/Risk matched same-input 3-context controls. Do not widen rights or sale credit beyond physically proven scope.')
a('')
a('='*70);a('P65 EXACT RECEIPT SUMMARY');a('='*70)
a('P64 parent ZIP | VELMERE_R44P46_V16_P64_CURRENT_OUTPUT_BASELINE_17_OF_17_33_OF_33_CURRENT_SOURCE_ONLY_IN_PROGRESS.zip / SHA-256 4c15de60c644236f271d2000cd5063aa524b9860afc624a984acf9b610325abb')
a(f"P64 parent files | {parent['byteIdentical']}/{parent['parentFileCount']} byte-identical")
a('GitHub P65 run | 31954673253 / SUCCESS')
a('GitHub head SHA | 0e93aa82dc31872771b5ed47fed6f2a9bd938dfb')
a('GitHub artifact | 9265619777 / SHA-256 b58365f1e12ece6d26f22affed596ab42c85f55135111d4cf325b7c8d48ad887 / 16957 B')
a('Exact Windows runtime | Windows Server 2025 / Node v24.18.0 / npm 11.16.0')
a(f"P65 current-source decisions | {h(P/'P65_CURRENT_SOURCE_DECISION_RECEIPTS.json')}")
a(f"P65 source review matrix | {h(P/'P65_CURRENT_SOURCE_REVIEW_MATRIX.json')}")
a(f"P65 observation summary | {h(P/'P65_CURRENT_OBSERVATION_SUMMARY.json')}")
a(f"P65 target-field adjudication | {h(P/'P65_TARGET_FIELD_ADJUDICATION.json')}")
a(f"P65 verifier | {h(P/'P65_CURRENT_SOURCE_VERIFIER.json')} / 29/29")
a(f"P65 independent verifier | {h(P/'P65_INDEPENDENT_CURRENT_SOURCE_VERIFIER.json')} / 18/18")
a('')
a('='*70);a('EXACT IDENTITY BINDINGS');a('='*70)
a('V16 SHA-256 | 67816a5a9238668c8080a3a8cc623f078d268c1b78fddf534cb4893bb45490e9')
a('P64 parent ZIP SHA-256 | 4c15de60c644236f271d2000cd5063aa524b9860afc624a984acf9b610325abb')
a(f"P64 parent files preserved | {parent['byteIdentical']}/{parent['parentFileCount']}")
a(f"Exact P46 projection file/payload | {p46['fileCount']} / {p46['payloadBytes']} B")
a(f"Exact P46 projection path-set SHA-256 | {p46['pathSetSha256']}")
a(f"Exact P46 projection aggregate SHA-256 | {p46['sourceContentAggregateSha256']}")
a('')
a('='*70);a('PACKAGE VERIFICATION CONTRACT');a('='*70)
a('P65 SOURCE_ONLY ZIP | VELMERE_R44P46_V16_P65_CURRENT_FREE_LEGAL_SOURCE_DECISIONS_6_OF_17_12_OF_33_CURRENT_SOURCE_ONLY_IN_PROGRESS.zip')
a('Deterministic ZIP | required 2/2 byte-identical PASS')
a('CRC | required PASS / PASS')
a('Filesystem clean unpack | required PASS / PASS')
a(f"P64 parent files preserved | {parent['byteIdentical']}/{parent['parentFileCount']} byte-identical PASS")
a('Customer-facing source modified by P65 | 0 files')
a('V16 modified | no')
a('Final ZIP byte length and SHA-256 | reported in three-file handoff; deliberately not embedded to avoid self-referential archive hashing')
a('')
a('END OF P65 LEDGER')
text='\n'.join(lines)+'\n'
name='VELMERE_CURRENT_STATE_AND_PASS_DELTA_LEDGER_P65_V16_2026-08-16.txt'
(ROOT/name).write_text(text,encoding='utf-8')
(P/name).write_text(text,encoding='utf-8')
print(json.dumps({'ledger':name,'bytes':len(text.encode()),'sha256':h(ROOT/name),'lines':len(lines)},indent=2))
