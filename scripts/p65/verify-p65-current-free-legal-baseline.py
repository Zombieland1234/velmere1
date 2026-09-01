from __future__ import annotations
import json,pathlib,re
ROOT=pathlib.Path(__file__).resolve().parents[2]
A=json.loads((ROOT/'artifacts/closure/p65/P65_TARGET_FIELD_ADJUDICATION.json').read_text())
B=json.loads((ROOT/'artifacts/closure/p65/P65_CURRENT_FREE_LEGAL_DECISION_BASELINE.json').read_text())
P=json.loads((ROOT/'config/p65/P65_CURRENT_FREE_LEGAL_SOURCE_POLICY.json').read_text())
checks=[]
def ck(name,cond): checks.append({'name':name,'passed':bool(cond)}); assert cond,name
ck('target_fields_74',A['targetCandidateRows']==74 and A['targetAdjudicatedRows']==74 and len(A['rows'])==74)
ck('target_family_counts',A['families']=={'audit':27,'market-impact':14,'real-markets':19,'whale-watch':14})
ck('no_legal_credit',A['legalSourceFieldsPassed']==0 and B['denominators']['legalSourceFieldsPassed']==0)
ck('customer_decisions_6',B['denominators']['customerRowsCurrentSourceDecisionReceipt']==6 and len(B['customerRows'])==6)
ck('profiles_12',B['denominators']['internalProfilesCurrentSourceDecisionReceipt']==12 and len(B['profiles'])==12)
ck('all_four_families_three_contexts',all(len([x for x in B['profiles'] if x['family']==f])==3 for f in ['audit','real-markets','market-impact','whale-watch']))
ck('no_final_promotion',B['denominators']['customerRowsFinalCustomerOutput']==0 and B['denominators']['internalProfilesFinalCustomerOutput']==0)
ck('no_sale',B['denominators']['saleEligibleRows']==0 and all(not x['saleEligible'] for x in B['customerRows']+B['profiles']))
ck('release_false',all(v is False for v in B['releaseState'].values()))
source={x['id']:x for x in P['sources']}
ck('open_security_sources_bounded',all(source[x]['engineeringRightsState']=='PASS_BOUNDED_PRIMARY_SOURCE_TERMS' for x in ['nvd','cve','cwe','capec']))
ck('ecb_bounded',source['ecb_statistics']['engineeringRightsState']=='PASS_BOUNDED_PRIMARY_SOURCE_TERMS' and source['ecb_statistics']['commercialUseAllowed'] is True)
ck('cisa_rights_withheld',source['cisa_kev']['engineeringRightsState']=='WITHHELD_EXPLICIT_LICENSE_BODY_NOT_CAPTURED' and not source['cisa_kev']['customerDisplayAllowed'])
ck('free_first_market_blocks',all(source[x]['commercialUseAllowed'] is False for x in ['twelve_data','alpha_vantage','polygon','coinbase','coinpaprika','coingecko']))
ck('explicit_safe_fallbacks',set(x['decision'] for x in B['customerRows'])=={'UNAVAILABLE_CURRENT_REAL_CONTRACT_EVIDENCE','UNAVAILABLE_CURRENT_REAL_CONTRACT_EVIDENCE_AND_HUMAN_REVIEW','PARTIAL_CURRENT_SOURCE_CAPABILITY_FX_ECB_REFERENCE_ONLY','NO_USABLE_ORDER_BOOK','UNCLASSIFIED_CURRENT_CHAIN_EVIDENCE'})
out={'schemaVersion':'velmere.p65.local-verifier.v1','status':'PASS_P65_LOCAL_VERIFIER_NO_PROMOTION','checks':len(checks),'passed':sum(x['passed'] for x in checks),'failed':sum(not x['passed'] for x in checks),'results':checks}
(ROOT/'artifacts/closure/p65/P65_LOCAL_VERIFIER.json').write_text(json.dumps(out,indent=2,sort_keys=True)+'\n')
print(json.dumps(out,indent=2))
