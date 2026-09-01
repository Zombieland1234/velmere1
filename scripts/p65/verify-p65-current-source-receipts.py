from __future__ import annotations
import hashlib,json,pathlib
ROOT=pathlib.Path(__file__).resolve().parents[2]; P=ROOT/'artifacts/closure/p65'; W=P/'windows'
def load(p): return json.loads(pathlib.Path(p).read_text(encoding='utf-8-sig'))
field=load(P/'P65_TARGET_FIELD_ADJUDICATION.json'); rev=load(P/'P65_CURRENT_SOURCE_REVIEW_MATRIX.json'); dec=load(P/'P65_CURRENT_SOURCE_DECISION_RECEIPTS.json'); obs=load(P/'P65_CURRENT_OBSERVATION_SUMMARY.json'); win=load(W/'P65_EXACT_WINDOWS_CURRENT_SOURCE_RECEIPT.json'); fetch=load(W/'P65_CURRENT_OFFICIAL_SOURCE_FETCH_RECEIPT.json')
checks=[]
def ck(n,c,detail=None): checks.append({'name':n,'passed':bool(c),'detail':detail});
ck('target_fields_74_of_74',field['targetCandidateRows']==74 and field['targetAdjudicatedRows']==74 and len(field['rows'])==74)
ck('target_family_exact_counts',field['families']=={'audit':27,'market-impact':14,'real-markets':19,'whale-watch':14})
ck('customer_decision_rows_6_of_17',dec['denominators']['customerRowsCurrentSourceDecisionReceipt']==6 and len(dec['customerRows'])==6)
ck('internal_decision_profiles_12_of_33',dec['denominators']['profilesCurrentSourceDecisionReceipt']==12 and len(dec['profiles'])==12)
for fam in ['audit','real-markets','market-impact','whale-watch']:
    rows=[x for x in dec['profiles'] if x['family']==fam]; ck(f'{fam}_exact_three_contexts',len(rows)==3 and {x['context'] for x in rows}=={'BASIC_CONTEXT','PRO_CONTEXT','ADVANCED_CONTEXT'})
ck('audit_context_maps_exact_customer_rows',[x['sourceCustomerRow'] for x in dec['profiles'] if x['family']=='audit']==['Audit Basic','Audit Pro','Audit Advanced'])
ck('final_customer_output_zero',dec['denominators']['customerRowsFinalCustomerOutput']==0 and all(not x['finalCustomerOutputCredit'] for x in dec['customerRows']))
ck('final_profile_output_zero',dec['denominators']['profilesFinalCustomerOutput']==0 and all(not x['finalCustomerOutputCredit'] for x in dec['profiles']))
ck('legal_source_fields_zero',dec['denominators']['legalSourceFieldsPassed']==0 and field['legalSourceFieldsPassed']==0)
ck('paid_delta_zero',dec['denominators']['paidDeltaTransitionsPassed']==0)
ck('sale_zero',dec['denominators']['saleEligibleRows']==0 and all(not x['saleEligible'] for x in dec['customerRows']+dec['profiles']))
ck('source_review_12',rev['sourceDecisionCount']==12 and len(rev['sources'])==12)
ck('bounded_engineering_source_rights_5',rev['boundedEngineeringRightsSources']==5)
by={x['sourceId']:x for x in rev['sources']}
ck('open_security_source_terms_bounded',all(by[x]['engineeringRightsState']=='PASS_BOUNDED_PRIMARY_SOURCE_TERMS' for x in ['nvd','cve','cwe','capec']))
ck('ecb_source_terms_bounded',by['ecb_statistics']['engineeringRightsState']=='PASS_BOUNDED_PRIMARY_SOURCE_TERMS')
ck('cisa_rights_withheld',by['cisa_kev']['engineeringRightsState']=='WITHHELD_EXPLICIT_LICENSE_BODY_NOT_CAPTURED' and not by['cisa_kev']['customerDisplayAllowed'])
ck('market_free_first_blocks',all(by[x]['engineeringRightsState'].startswith('BLOCKED_') for x in ['coingecko','twelve_data','alpha_vantage','polygon','coinbase','coinpaprika']))
ck('required_official_fetch_clean',fetch['requiredPassed'] and not fetch['requiredFailures'])
ck('current_data_endpoints_3',obs['currentOfficialDataEndpointsFetched']==3 and set(obs['currentDataEndpoints'])=={'nvd','ecbFx','cisaKev'})
ck('current_customer_consideration_endpoints_2',obs['currentOfficialDataEndpointsRightsBoundedForCustomerConsideration']==2)
ck('cisa_current_but_no_rights',obs['currentDataEndpoints']['cisaKev']['httpStatus']==200 and obs['currentDataEndpoints']['cisaKev']['rightsState']=='WITHHELD_EXPLICIT_LICENSE_BODY_NOT_CAPTURED')
ck('ecb_current_rows_present',obs['currentDataEndpoints']['ecbFx']['httpStatus']==200 and obs['currentDataEndpoints']['ecbFx']['rowCount']>0)
ck('nvd_current_record_present',obs['currentDataEndpoints']['nvd']['httpStatus']==200 and obs['currentDataEndpoints']['nvd']['record'].get('id')=='CVE-2024-3094')
ck('exact_windows_receipt_pass',win['status']=='PASS_P65_EXACT_WINDOWS_CURRENT_OFFICIAL_SOURCE_RECEIPTS_NO_PROMOTION' and win['node']=='v24.18.0' and win['npm']=='11.16.0' and win['runnerOs']=='Windows')
ck('windows_denominators_match',win['customerRowsCurrentSourceDecisionReceipt']==6 and win['internalProfilesCurrentSourceDecisionReceipt']==12 and win['targetFieldsAdjudicated']==74 and win['finalCustomerRows']==0 and win['finalProfiles']==0 and win['legalSourceFieldsPassed']==0 and win['saleEligibleRows']==0)
ck('safe_decision_set',set(x['decision'] for x in dec['customerRows'])=={'UNAVAILABLE_CURRENT_REAL_CONTRACT_EVIDENCE','UNAVAILABLE_CURRENT_REAL_CONTRACT_EVIDENCE_AND_HUMAN_REVIEW','PARTIAL_CURRENT_SOURCE_CAPABILITY_FX_ECB_REFERENCE_ONLY','NO_USABLE_ORDER_BOOK','UNCLASSIFIED_CURRENT_CHAIN_EVIDENCE'})
failed=[x for x in checks if not x['passed']]
out={'schemaVersion':'velmere.p65.current-source-verifier.v1','status':'PASS_P65_CURRENT_SOURCE_VERIFIER_NO_PROMOTION' if not failed else 'FAIL_P65_CURRENT_SOURCE_VERIFIER','checks':len(checks),'passed':len(checks)-len(failed),'failed':len(failed),'results':checks,'truthBoundary':'Verifier proves current-source decision receipt consistency only. Final product, legal-field, paid-value and sale credit remain zero.'}
(P/'P65_CURRENT_SOURCE_VERIFIER.json').write_text(json.dumps(out,indent=2,sort_keys=True)+'\n',encoding='utf-8')
print(json.dumps({'status':out['status'],'checks':out['checks'],'passed':out['passed'],'failed':out['failed']},indent=2))
if failed: raise SystemExit(2)
