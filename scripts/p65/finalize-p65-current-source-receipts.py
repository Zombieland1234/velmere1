from __future__ import annotations
import hashlib, json, pathlib
ROOT=pathlib.Path(__file__).resolve().parents[2]
P65=ROOT/'artifacts/closure/p65'
WIN=P65/'windows'
POL=ROOT/'config/p65/P65_CURRENT_FREE_LEGAL_SOURCE_POLICY.json'

def load(p): return json.loads(pathlib.Path(p).read_text(encoding='utf-8-sig'))
def sha(p): return hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
def write(name,obj):
    p=P65/name
    b=(json.dumps(obj,sort_keys=True,indent=2,ensure_ascii=False)+'\n').encode('utf-8')
    p.write_bytes(b)
    return {'path':str(p.relative_to(ROOT)).replace('\\','/'),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}

policy=load(POL)
base=load(P65/'P65_CURRENT_FREE_LEGAL_DECISION_BASELINE.json')
field=load(P65/'P65_TARGET_FIELD_ADJUDICATION.json')
fetch=load(WIN/'P65_CURRENT_OFFICIAL_SOURCE_FETCH_RECEIPT.json')
norm=load(WIN/'P65_CURRENT_OFFICIAL_SOURCE_NORMALIZED.json')
win=load(WIN/'P65_EXACT_WINDOWS_CURRENT_SOURCE_RECEIPT.json')
fetches={x['id']:x for x in fetch['sources']}
source_fetch_ids={
 'nvd':['nvd_terms','nvd_sample'],
 'cve':['cve_terms_current','cve_terms_archive'],
 'cwe':['cwe_terms'],
 'capec':['capec_terms'],
 'ecb_statistics':['ecb_reuse','ecb_fx'],
 'cisa_kev':['cisa_kev','cisa_kev_page'],
 'coingecko':['coingecko_terms','coingecko_pricing'],
 'twelve_data':['twelve_data_terms'],
 'alpha_vantage':['alpha_vantage_policy'],
 'polygon':['polygon_stocks'],
 'coinbase':[], 'coinpaprika':[]
}
source_rows=[]
for s in policy['sources']:
    obs=[]
    for fid in source_fetch_ids.get(s['id'],[]):
        x=fetches.get(fid)
        if x:
            obs.append({
              'fetchId':fid,'httpStatus':x.get('httpStatus'),'bytes':x.get('bytes',0),'sha256':x.get('sha256'),
              'anchorPass':bool(x.get('anchorPass')),'error':x.get('error')})
    source_rows.append({
      'sourceId':s['id'],'engineeringRightsState':s['engineeringRightsState'],
      'legalApprovalStatus':'INTERNAL_ENGINEERING_PRIMARY_SOURCE_REVIEW_NOT_COUNSEL',
      'commercialUseAllowed':s['commercialUseAllowed'],'customerDisplayAllowed':s['customerDisplayAllowed'],
      'derivedUseAllowed':s['derivedUseAllowed'],'rawRedistributionAllowed':s['rawRedistributionAllowed'],
      'attributionRequired':s['attributionRequired'],'creditLimit':s['creditLimit'],'products':s['products'],
      'officialFetchObservations':obs})
review={
 'schemaVersion':'velmere.p65.current-source-review-matrix.v2','revision':'P65/V16','generatedAt':fetch['generatedAt'],
 'exactWindowsRunId':win['runId'],'sourceDecisionCount':len(source_rows),
 'boundedEngineeringRightsSources':sum(x['engineeringRightsState']=='PASS_BOUNDED_PRIMARY_SOURCE_TERMS' for x in source_rows),
 'blockedOrWithheldSources':sum(x['engineeringRightsState']!='PASS_BOUNDED_PRIMARY_SOURCE_TERMS' for x in source_rows),
 'requiredOfficialFetchCount':fetch['requiredSourceCount'],'requiredOfficialFetchPassed':fetch['requiredPassed'],
 'sources':source_rows,
 'truthBoundary':'Source-level engineering primary-source review plus physical current fetch receipts. This is not counsel approval and does not change legalSourceFieldsPassed=0/176.'}
review_ref=write('P65_CURRENT_SOURCE_REVIEW_MATRIX.json',review)

# Physical current-source customer decisions. The six customer rows are the exact P65 target SKU rows.
source_bindings={
 'audit':{
  'nvdTerms':fetches['nvd_terms']['sha256'],'nvdSample':fetches['nvd_sample']['sha256'],'nvdNormalized':norm['nvd'],
  'cveTermsCurrent':fetches['cve_terms_current']['sha256'],'cveTermsCurrentAnchorPass':fetches['cve_terms_current']['anchorPass'],
  'cveTermsArchive':fetches['cve_terms_archive']['sha256'],'cweTerms':fetches['cwe_terms']['sha256'],'capecTerms':fetches['capec_terms']['sha256'],
  'cisaKevCurrent':fetches['cisa_kev']['sha256'],'cisaKevRights':'WITHHELD_EXPLICIT_LICENSE_BODY_NOT_CAPTURED'},
 'real-markets':{
  'ecbReuseTerms':fetches['ecb_reuse']['sha256'],'ecbFxCurrent':fetches['ecb_fx']['sha256'],'ecbFxNormalized':norm['ecbFx'],
  'coingeckoTerms':fetches['coingecko_terms']['sha256'],'coingeckoPricing':fetches['coingecko_pricing']['sha256'],
  'twelveDataTerms':fetches['twelve_data_terms']['sha256'],'alphaVantagePolicy':fetches['alpha_vantage_policy']['sha256'],'polygonStocks':fetches['polygon_stocks']['sha256']},
 'market-impact':{
  'coingeckoTerms':fetches['coingecko_terms']['sha256'],'coingeckoPricing':fetches['coingecko_pricing']['sha256'],
  'twelveDataTerms':fetches['twelve_data_terms']['sha256'],'polygonStocks':fetches['polygon_stocks']['sha256']},
 'whale-watch':{
  'coingeckoTerms':fetches['coingecko_terms']['sha256'],'coingeckoPricing':fetches['coingecko_pricing']['sha256']}
}
reason_by_sku={x['productSku']:x for x in base['customerRows']}
customer=[]
for r in policy['customerDecisionRows']:
    sku=r['productSku']; fam=r['family']; baseline=reason_by_sku[sku]
    customer.append({
      'productSku':sku,'family':fam,'decision':r['decision'],'reason':r['reason'],
      'receiptClass':'CURRENT_SOURCE_DECISION_WITH_PHYSICAL_OFFICIAL_RECEIPT',
      'currentSourceBindings':source_bindings[fam],
      'currentDataObservationCredit': fam in {'audit','real-markets'},
      'currentDataObservationScope':'NVD_SAMPLE_PLUS_CISA_HEALTH_NO_CISA_RIGHTS' if fam=='audit' else ('ECB_FX_REFERENCE_ONLY' if fam=='real-markets' else 'NONE'),
      'legalSourceFieldCredit':0,'finalCustomerOutputCredit':False,'valueCredit':False,'saleEligible':False})
# Exactly one Basic/Pro/Advanced profile per family. Audit contexts map to their matching SKU; standalones share one row decision.
contexts=['BASIC_CONTEXT','PRO_CONTEXT','ADVANCED_CONTEXT']
profiles=[]
for fam in policy['profileDecisionFamilies']:
    fam_rows=[x for x in customer if x['family']==fam]
    for idx,ctx in enumerate(contexts):
        source_row=fam_rows[idx] if fam=='audit' else fam_rows[0]
        profiles.append({
          'family':fam,'context':ctx,'decision':source_row['decision'],'reason':source_row['reason'],
          'receiptClass':'CURRENT_SOURCE_DECISION_WITH_PHYSICAL_OFFICIAL_RECEIPT',
          'sourceCustomerRow':source_row['productSku'],'currentSourceBindings':source_bindings[fam],
          'legalSourceFieldCredit':0,'finalCustomerOutputCredit':False,'valueCredit':False,'saleEligible':False})
if len(profiles)!=12: raise SystemExit(f'profile count {len(profiles)} != 12')
decisions={
 'schemaVersion':'velmere.p65.current-source-decision-receipts.v2','revision':'P65/V16','generatedAt':fetch['generatedAt'],
 'exactWindowsRun':{'runId':win['runId'],'gitHead':win['gitHead'],'runnerOs':win['runnerOs'],'runnerArch':win['runnerArch'],'imageOs':win['imageOs'],'node':win['node'],'npm':win['npm'],'status':win['status']},
 'denominators':{
  'customerFacingRows':17,'customerRowsCurrentSourceDecisionReceipt':len(customer),'customerRowsFinalCustomerOutput':0,
  'internalProfiles':33,'profilesCurrentSourceDecisionReceipt':len(profiles),'profilesFinalCustomerOutput':0,
  'targetFieldsAdjudicated':field['targetAdjudicatedRows'],'legalSourceFieldsPassed':0,'paidDeltaTransitionsPassed':0,'saleEligibleRows':0},
 'customerRows':customer,'profiles':profiles,
 'truthBoundary':'Current-source decision receipts for 6/17 customer rows and 12/33 internal profiles. They prove fail-closed source/fallback decisions, not final customer output, rights-field closure, value or sale.'}
decision_ref=write('P65_CURRENT_SOURCE_DECISION_RECEIPTS.json',decisions)
obs={
 'schemaVersion':'velmere.p65.current-observation-summary.v2','generatedAt':fetch['generatedAt'],
 'currentOfficialDataEndpointsFetched':3,'currentOfficialDataEndpointsRightsBoundedForCustomerConsideration':2,'fullProductCurrentOutputRows':0,
 'currentDataEndpoints':{
  'nvd':{'httpStatus':fetches['nvd_sample']['httpStatus'],'sha256':fetches['nvd_sample']['sha256'],'record':norm['nvd'],'rightsState':'PASS_BOUNDED_PRIMARY_SOURCE_TERMS','scope':'AUDIT_VULNERABILITY_REFERENCE_ONLY'},
  'ecbFx':{'httpStatus':fetches['ecb_fx']['httpStatus'],'sha256':fetches['ecb_fx']['sha256'],'rowCount':norm['ecbFx']['rowCount'],'rows':norm['ecbFx']['rows'],'rightsState':'PASS_BOUNDED_PRIMARY_SOURCE_TERMS','scope':'FX_REFERENCE_STATISTICS_ONLY_NOT_EXECUTABLE_QUOTE'},
  'cisaKev':{'httpStatus':fetches['cisa_kev']['httpStatus'],'sha256':fetches['cisa_kev']['sha256'],'catalogVersion':norm['cisaKev'].get('catalogVersion'),'dateReleased':norm['cisaKev'].get('dateReleased'),'count':norm['cisaKev'].get('count'),'rightsState':'WITHHELD_EXPLICIT_LICENSE_BODY_NOT_CAPTURED','scope':'CURRENT_DATA_HEALTH_ONLY_NO_CUSTOMER_RIGHTS_CREDIT'}},
 'truthBoundary':'NVD and ECB have bounded engineering source capability/rights receipts for limited uses; CISA KEV is current-data health only because license-body review is unresolved. No full product row is current-output closed.'}
obs_ref=write('P65_CURRENT_OBSERVATION_SUMMARY.json',obs)
bundle={
 'schemaVersion':'velmere.p65.receipt-bundle.v2','revision':'P65/V16','status':'PASS_P65_CURRENT_SOURCE_DECISION_RECEIPTS_NO_PROMOTION',
 'receipts':[review_ref,decision_ref,obs_ref,
  {'path':'artifacts/closure/p65/P65_TARGET_FIELD_ADJUDICATION.json','bytes':(P65/'P65_TARGET_FIELD_ADJUDICATION.json').stat().st_size,'sha256':sha(P65/'P65_TARGET_FIELD_ADJUDICATION.json')},
  {'path':'artifacts/closure/p65/windows/P65_CURRENT_OFFICIAL_SOURCE_FETCH_RECEIPT.json','bytes':(WIN/'P65_CURRENT_OFFICIAL_SOURCE_FETCH_RECEIPT.json').stat().st_size,'sha256':sha(WIN/'P65_CURRENT_OFFICIAL_SOURCE_FETCH_RECEIPT.json')},
  {'path':'artifacts/closure/p65/windows/P65_CURRENT_OFFICIAL_SOURCE_NORMALIZED.json','bytes':(WIN/'P65_CURRENT_OFFICIAL_SOURCE_NORMALIZED.json').stat().st_size,'sha256':sha(WIN/'P65_CURRENT_OFFICIAL_SOURCE_NORMALIZED.json')},
  {'path':'artifacts/closure/p65/windows/P65_EXACT_WINDOWS_CURRENT_SOURCE_RECEIPT.json','bytes':(WIN/'P65_EXACT_WINDOWS_CURRENT_SOURCE_RECEIPT.json').stat().st_size,'sha256':sha(WIN/'P65_EXACT_WINDOWS_CURRENT_SOURCE_RECEIPT.json')}],
 'denominators':decisions['denominators']}
write('P65_RECEIPT_BUNDLE.json',bundle)
print(json.dumps({'status':bundle['status'],'reviewSources':len(source_rows),'boundedEngineeringRightsSources':review['boundedEngineeringRightsSources'],'customerRows':len(customer),'profiles':len(profiles),'targetFields':field['targetAdjudicatedRows'],'currentDataEndpoints':obs['currentOfficialDataEndpointsFetched']},indent=2))
