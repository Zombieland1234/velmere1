from __future__ import annotations
import hashlib, json, pathlib
ROOT=pathlib.Path(__file__).resolve().parents[2]
POL=ROOT/'config/p65/P65_CURRENT_FREE_LEGAL_SOURCE_POLICY.json'
REG=ROOT/'config/p40/p40-candidate-field-use-case-registry.json'
OUT=ROOT/'artifacts/closure/p65'
OUT.mkdir(parents=True,exist_ok=True)

def sha_bytes(b:bytes)->str:return hashlib.sha256(b).hexdigest()
def stable(obj):return json.dumps(obj,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()
def write(name,obj):
    b=json.dumps(obj,sort_keys=True,indent=2,ensure_ascii=False).encode()+b'\n'
    (OUT/name).write_bytes(b); return {'path':str((OUT/name).relative_to(ROOT)).replace('\\','/'),'bytes':len(b),'sha256':sha_bytes(b)}
policy=json.loads(POL.read_text(encoding='utf-8'))
reg=json.loads(REG.read_text(encoding='utf-8'))
target=set(policy['targetFamilies'])
rows=[r for r in reg['rows'] if r.get('productFamily') in target]
if len(rows)!=74: raise SystemExit(f'target candidate rows {len(rows)} != 74')
# Product-level fail-closed adjudication. This closes decision state, not rights/customer output credit.
family_decision={
'audit':('UNAVAILABLE_CURRENT_REAL_CONTRACT_EVIDENCE','Open NVD/CVE/CWE/CAPEC taxonomies cannot substitute for exact customer contract/source-bytecode/tool/independent-label evidence.'),
'real-markets':('PARTIAL_CURRENT_SOURCE_CAPABILITY_FX_ECB_REFERENCE_ONLY','Only a bounded ECB FX-reference source path is currently eligible for current customer-safe consideration; full cross-asset catalog remains blocked.'),
'market-impact':('NO_USABLE_ORDER_BOOK','No current customer-display-rights-approved order-book/depth source is available.'),
'whale-watch':('UNCLASSIFIED_CURRENT_CHAIN_EVIDENCE','No current customer-display-rights-approved chain/indexer plus verified-label evidence is available.')}
field_rows=[]
for r in rows:
    fam=r['productFamily']; decision,reason=family_decision[fam]
    field=r['customerFieldCandidate']
    # Explicitly recognize bounded source-capable slices without promoting the product row.
    eligible=[]
    if fam=='audit': eligible=['nvd','cve','cwe','capec']
    elif fam=='real-markets' and field in {'fields.quote','fields.history','fields.currency_normalization','fields.instrument_identity','fields.provenance','analysisDecision','deliveryDecision','httpStatus','blockers'}: eligible=['ecb_statistics']
    blockers=[]
    if fam=='audit': blockers=['REAL_CUSTOMER_INPUT_ABSENT','SOURCE_BYTECODE_MATCH_ABSENT','OFFICIAL_TOOL_EXECUTION_REAL_CASE_ABSENT','INDEPENDENT_LABELS_ABSENT','RIGHTS_BUNDLE_INCOMPLETE']
    elif fam=='real-markets': blockers=['FULL_CROSS_ASSET_RIGHTS_NOT_CLOSED','CORPORATE_ACTIONS_NOT_CLOSED','CRYPTO_SOURCE_RIGHTS_NOT_CLOSED','PROVIDER_QUORUM_CURRENT_NOT_CLOSED']
    elif fam=='market-impact': blockers=['NO_RIGHTS_APPROVED_CURRENT_ORDER_BOOK','NO_MULTI_VENUE_DEPTH_CURRENT_EVIDENCE']
    else: blockers=['NO_RIGHTS_APPROVED_CURRENT_CHAIN_INDEXER','NO_VERIFIED_LABEL_SOURCE','NO_CURRENT_CLUSTER_GROUND_TRUTH']
    field_rows.append({
      'registryRowId':r['registryRowId'],'productFamily':fam,'field':field,
      'adjudicationState':'ADJUDICATED_FAIL_CLOSED','customerSafeDecision':decision,
      'sourceCapabilityIds':eligible,'blockers':blockers,'fallbackState':decision,
      'currentSourceReceiptRequired':True,'rightsPassed':False,'freshnessPassed':False,
      'finalCustomerOutputCredit':False,'saleEligible':False,'reason':reason})
field_receipt={
 'schemaVersion':'velmere.p65.target-field-adjudication.v1','revision':'P65/V16','generatedAt':'2026-08-16T14:55:00.000Z',
 'candidateDenominator':176,'targetCandidateRows':74,'targetAdjudicatedRows':74,'legalSourceFieldsPassed':0,
 'families':{f:sum(1 for x in field_rows if x['productFamily']==f) for f in sorted(target)},
 'rows':field_rows,
 'truthBoundary':'74/74 is decision/adjudication coverage only. It is not 74 rights-passed fields and does not alter the 0/176 legal-source-fields-passed denominator.'}
field_ref=write('P65_TARGET_FIELD_ADJUDICATION.json',field_receipt)
# Current-source customer row and profile decision receipts.
customer=[]
for r in policy['customerDecisionRows']:
    x=dict(r); x['decisionReceiptClass']='CURRENT_SOURCE_DECISION_ONLY'; x['rightsPassed']=False; x['freshnessPassed']=False; x['currentOutputBytes']=None; x['currentOutputSha256']=None
    customer.append(x)
profiles=[]
for fam in policy['profileDecisionFamilies']:
    base=next(x for x in customer if x['family']==fam)
    for ctx in ['BASIC_CONTEXT','PRO_CONTEXT','ADVANCED_CONTEXT']:
        profiles.append({'family':fam,'context':ctx,'decision':base['decision'],'decisionReceiptClass':'CURRENT_SOURCE_DECISION_ONLY','finalCustomerOutputCredit':False,'rightsPassed':False,'saleEligible':False})
source_summary=[]
for s in policy['sources']:
    source_summary.append({'id':s['id'],'engineeringRightsState':s['engineeringRightsState'],'commercialUseAllowed':s['commercialUseAllowed'],'customerDisplayAllowed':s['customerDisplayAllowed'],'products':s['products'],'termsUrl':s['termsUrl'],'dataUrl':s.get('dataUrl')})
receipt={
 'schemaVersion':'velmere.p65.current-free-legal-decision-baseline.v1','revision':'P65/V16','generatedAt':'2026-08-16T14:55:00.000Z',
 'policy':{'path':'config/p65/P65_CURRENT_FREE_LEGAL_SOURCE_POLICY.json','bytes':POL.stat().st_size,'sha256':sha_bytes(POL.read_bytes())},
 'fieldAdjudication':field_ref,
 'denominators':{
  'productFamilies':11,'customerFacingRows':17,'customerRowsCurrentSourceDecisionReceipt':len(customer),'customerRowsFinalCustomerOutput':0,
  'internalProfiles':33,'internalProfilesCurrentSourceDecisionReceipt':len(profiles),'internalProfilesFinalCustomerOutput':0,
  'candidateLegalSourceFields':176,'targetFieldsAdjudicated':74,'legalSourceFieldsPassed':0,'explicitPaidDeltaTransitionsPassed':0,'saleEligibleRows':0},
 'customerRows':customer,'profiles':profiles,'sources':source_summary,
 'releaseState':policy['releaseState'],
 'truthBoundary':'P65 closes fail-closed current-source decisions for 6/17 customer rows and 12/33 profiles and adjudicates 74 target candidate fields. It grants no final customer output, legal-source field, value, sale, live or world-class credit.'}
base_ref=write('P65_CURRENT_FREE_LEGAL_DECISION_BASELINE.json',receipt)
# Compact Windows packet used by independent exact-runtime workflow.
compact={
 'schemaVersion':'velmere.p65.windows-current-free-legal-policy-packet.v1','revision':'P65/V16','generatedAt':'2026-08-16T14:55:00.000Z',
 'policySha256':sha_bytes(POL.read_bytes()),'fieldAdjudicationSha256':field_ref['sha256'],'baselineSha256':base_ref['sha256'],
 'denominators':receipt['denominators'],
 'sourceStates':{x['id']:x['engineeringRightsState'] for x in source_summary},
 'releaseState':policy['releaseState'],
 'truthBoundary':'Exact-runtime packet metadata. Current official web retrieval and terms hash receipts are added only by the P65 Windows workflow.'}
write('P65_WINDOWS_POLICY_PACKET.json',compact)
print(json.dumps({'status':'PASS_P65_LOCAL_DECISION_BASELINE_NO_PROMOTION','targetFields':74,'customerRows':len(customer),'profiles':len(profiles)},indent=2))
