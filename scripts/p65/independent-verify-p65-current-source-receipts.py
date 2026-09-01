from __future__ import annotations
import json,pathlib,hashlib
ROOT=pathlib.Path(__file__).resolve().parents[2]; P=ROOT/'artifacts/closure/p65'; W=P/'windows'
def J(x): return json.loads((P/x).read_text(encoding='utf-8-sig'))
def WJ(x): return json.loads((W/x).read_text(encoding='utf-8-sig'))
D=J('P65_CURRENT_SOURCE_DECISION_RECEIPTS.json'); R=J('P65_CURRENT_SOURCE_REVIEW_MATRIX.json'); O=J('P65_CURRENT_OBSERVATION_SUMMARY.json'); F=WJ('P65_CURRENT_OFFICIAL_SOURCE_FETCH_RECEIPT.json'); X=WJ('P65_EXACT_WINDOWS_CURRENT_SOURCE_RECEIPT.json')
checks=[]
def a(n,c): checks.append((n,bool(c)))
a('row_ids_unique',len({x['productSku'] for x in D['customerRows']})==6)
a('profiles_unique',len({(x['family'],x['context']) for x in D['profiles']})==12)
a('profile_family_count',len({x['family'] for x in D['profiles']})==4)
a('no_rights_field_credit',sum(x['legalSourceFieldCredit'] for x in D['customerRows']+D['profiles'])==0)
a('no_value_credit',not any(x['valueCredit'] for x in D['customerRows']+D['profiles']))
a('no_sale_credit',not any(x['saleEligible'] for x in D['customerRows']+D['profiles']))
a('three_current_data_endpoints',O['currentOfficialDataEndpointsFetched']==3)
a('two_bounded_customer_consideration_endpoints',O['currentOfficialDataEndpointsRightsBoundedForCustomerConsideration']==2)
a('no_full_current_row',O['fullProductCurrentOutputRows']==0)
a('physical_required_fetches_pass',F['requiredPassed'] is True and len(F['requiredFailures'])==0)
a('exact_windows_run_id',str(X['runId'])=='31954673253')
a('exact_windows_toolchain',X['node']=='v24.18.0' and X['npm']=='11.16.0')
a('exact_windows_no_promotion',X['finalCustomerRows']==0 and X['finalProfiles']==0 and X['legalSourceFieldsPassed']==0 and X['saleEligibleRows']==0)
a('source_matrix_partition',R['boundedEngineeringRightsSources']==5 and R['blockedOrWithheldSources']==7 and R['sourceDecisionCount']==12)
a('cve_current_and_archive_receipts',any(o['fetchId']=='cve_terms_current' and o['httpStatus']==200 for o in next(x for x in R['sources'] if x['sourceId']=='cve')['officialFetchObservations']) and any(o['fetchId']=='cve_terms_archive' and o['anchorPass'] for o in next(x for x in R['sources'] if x['sourceId']=='cve')['officialFetchObservations']))
a('cwe_capec_physical_terms',all(any(o['httpStatus']==200 and o['anchorPass'] for o in next(x for x in R['sources'] if x['sourceId']==sid)['officialFetchObservations']) for sid in ['cwe','capec']))
a('market_rows_fail_closed',all(x['decision'] in {'PARTIAL_CURRENT_SOURCE_CAPABILITY_FX_ECB_REFERENCE_ONLY','NO_USABLE_ORDER_BOOK','UNCLASSIFIED_CURRENT_CHAIN_EVIDENCE'} for x in D['customerRows'] if x['family']!='audit'))
a('audit_rows_fail_closed',all(x['decision'].startswith('UNAVAILABLE_CURRENT_REAL_CONTRACT_EVIDENCE') for x in D['customerRows'] if x['family']=='audit'))
failed=[n for n,c in checks if not c]
out={'schemaVersion':'velmere.p65.independent-current-source-verifier.v1','status':'PASS_P65_INDEPENDENT_VERIFIER_NO_PROMOTION' if not failed else 'FAIL_P65_INDEPENDENT_VERIFIER','checks':len(checks),'passed':sum(c for _,c in checks),'failed':len(failed),'results':[{'name':n,'passed':c} for n,c in checks],'truthBoundary':'Independent structural verifier; no final product/legal/value/sale promotion.'}
(P/'P65_INDEPENDENT_CURRENT_SOURCE_VERIFIER.json').write_text(json.dumps(out,indent=2,sort_keys=True)+'\n',encoding='utf-8')
print(json.dumps({'status':out['status'],'checks':out['checks'],'passed':out['passed'],'failed':out['failed']},indent=2))
if failed: print(failed); raise SystemExit(2)
