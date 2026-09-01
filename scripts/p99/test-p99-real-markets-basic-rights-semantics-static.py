#!/usr/bin/env python3
from pathlib import Path
import hashlib, json, re
ROOT=Path(__file__).resolve().parents[2]
checks=[]
def check(i,c,d=None):
 row={'id':i,'status':'PASS' if c else 'FAIL'}
 if d is not None: row['detail']=d
 checks.append(row)
 if not c: raise AssertionError(f'{i}: {d}')
def canonical(v):
 if isinstance(v,list): return '['+','.join(canonical(x) for x in v)+']'
 if isinstance(v,dict): return '{'+','.join(json.dumps(k,separators=(',',':'))+':'+canonical(v[k]) for k in sorted(v))+'}'
 return json.dumps(v,separators=(',',':'))

def text(rel): return (ROOT/rel).read_text()
policy=text('lib/market-integrity/real-markets-basic-field-policy.ts')
route=text('lib/server/market-integrity-route-modules/markets.ts')
gate=text('lib/market-integrity/market-row-delivery-gate.ts')
registry=json.loads(text('config/p99/real-markets-basic-field-rights-currentness-registry.json'))
rights21=json.loads(text('config/pass21/provider-commercial-rights-registry.json'))
rights36=json.loads(text('config/pass36/a102r44p18-official-provider-rights-decision-matrix.json'))

check('registry_schema',registry['schemaVersion']=='velmere.p99.real-markets-basic-field-rights-currentness-registry.v1')
check('registry_provider_coingecko',registry['providerId']=='coingecko')
check('registry_purpose_free_public',registry['deliveryPurpose']=='FREE_PUBLIC_DISPLAY')
check('registry_field_count_23',len(registry['fields'])==23)
check('registry_field_ids_unique',len({x['fieldId'] for x in registry['fields']})==23)
unsigned={k:v for k,v in registry.items() if k!='registrySha256'}
recomputed=hashlib.sha256(canonical(unsigned).encode()).hexdigest()
check('registry_digest_independent',recomputed==registry['registrySha256'],{'recomputed':recomputed})
check('registry_digest_hardcoded_in_policy',registry['registrySha256'] in policy)
check('registry_matrix_hash_matches',registry['rightsMatrixBinding']['matrixSha256']==rights36['matrixSha256'])
check('registry_all_rights_withheld',all(x['rightsStatus']=='WITHHELD_UNVERIFIED' for x in registry['fields']))
check('registry_all_public_false',all(x['publicDisplayAllowed'] is False for x in registry['fields']))
check('registry_all_customer_false',all(x['customerDeliveryAllowed'] is False for x in registry['fields']))
check('registry_all_non_executable',all(x['executionEligible'] is False for x in registry['fields']))
check('registry_all_currentness_explicit',all(x['currentnessClass']=='provider_timestamped_reference' for x in registry['fields']))
check('registry_all_ttl_positive',all(isinstance(x['maxAgeSeconds'],int) and x['maxAgeSeconds']>0 for x in registry['fields']))
check('registry_no_current_quote',all(x['semanticClass'] not in ('current_quote','venue_quote','executable_quote') for x in registry['fields']))
price=next(x for x in registry['fields'] if x['fieldId']=='market.price')
check('price_reference',price['semanticClass']=='reference')
check('price_currency_usd',price['currency']=='USD')
check('price_not_venue',price['venueScope']=='aggregated_multi_venue_reference')
volume=next(x for x in registry['fields'] if x['fieldId']=='market.volume_24h')
check('volume_derived',volume['semanticClass']=='derived')
check('observed_at_timestamp',next(x for x in registry['fields'] if x['fieldId']=='market.observed_at')['semanticClass']=='provider_timestamp')

providers={x['id']:x for x in rights21['providers']}
for pid in ('coingecko','binance'):
 p=providers[pid]
 check(f'{pid}_rights_unverified',p['rightsState']=='UNVERIFIED')
 check(f'{pid}_display_false',p['displayUseAllowed'] is False)
 check(f'{pid}_commercial_false',p['commercialUseAllowed'] is False)
 check(f'{pid}_redistribution_false',p['redistributionAllowed'] is False)
check('rights36_zero_customer_display',rights36['globalTruthBoundary']['customerDisplayAllowedProviders']==0)
check('rights36_zero_commercial',rights36['globalTruthBoundary']['commercialUseAllowedProviders']==0)
check('rights36_diagnostic_only',rights36['globalTruthBoundary']['diagnosticOnly'] is True)
check('rights36_no_coingecko_approved',not any(x.get('providerId')=='coingecko' for x in rights36['providers']))
check('rights36_no_binance_approved',not any(x.get('providerId')=='binance' for x in rights36['providers']))

check('policy_imports_current_registry','config/p99/real-markets-basic-field-rights-currentness-registry.json' in policy)
check('policy_imports_official_matrix','a102r44p18-official-provider-rights-decision-matrix.json' in policy)
check('policy_uses_provider_projection','buildProviderRightsProjection' in policy)
check('policy_hardcoded_registry_digest','P99_REAL_MARKETS_BASIC_REGISTRY_SHA256' in policy)
check('policy_exact_field_ids','EXPECTED_FIELD_IDS' in policy)
check('policy_reconstructs_decision','const expected = buildP99RealMarketsBasicDeliveryPreflight()' in policy)
check('policy_full_canonical_compare','canonicalJson(expected) === canonicalJson(decision)' in policy)
check('policy_network_requires_rights','providerNetworkAllowed: ready' in policy)
check('policy_customer_requires_rights','customerDeliveryAllowed: ready' in policy)
check('policy_no_live_claim','liveClaimed: false' in policy)
check('policy_no_execution_claim','executableQuoteClaimed: false' in policy)
check('policy_customer_projection_closed','velmere.p99.real-markets-basic-withheld.v1' in policy)
check('policy_projection_rows_empty','rows: [] as const' in policy)
check('policy_projection_unknown_currentness','currentness: "UNKNOWN_BLOCKED"' in policy)
check('policy_projection_no_provider_id','providerId:' not in policy.split('export function toP99CustomerSafeRealMarketsBasicWithheld',1)[1])

pre=route.index('const rightsPreflight = buildP99RealMarketsBasicDeliveryPreflight()')
fetch=route.index('fetchCoinGeckoMarketsCoalesced({ page, perPage })')
cache=route.index('readMarketSnapshotWithDurable({')
fallback=route.index('fetchBinanceMarketFallback({ page, perPage })')
check('route_preflight_before_primary',pre<fetch)
check('route_preflight_before_cache',pre<cache)
check('route_preflight_before_fallback',pre<fallback)
check('route_returns_withheld_503','toP99CustomerSafeRealMarketsBasicWithheld(rightsPreflight), 503' in route)
check('route_no_local_reference_import','local-development-market-reference' not in route)
check('route_no_local_reference_rows','buildLocalDevelopmentMarketReferenceRows' not in route)
check('route_no_local_fixture_customer_profile','A102R22_LOCAL_MARKET_REFERENCE_ID' not in route)
check('route_reference_semantics','marketReferenceSemantics()' in route)
check('route_reference_price_class','priceSemanticClass: "reference"' in route)
check('route_not_executable','executionEligible: false' in route and 'executableQuoteClaimed: false' in route)
check('route_no_live_claim','liveClaimed: false' in route)
check('route_freshness_reference','provider_timestamped_reference' in route)
check('route_delivery_mode_never_live','return "live" as const' not in route)
check('route_customer_source_not_live_phrase','signed fresh identity/field-bound delivery' not in route)
check('route_no_freshness_live_literal','freshness: mode === "live" ? "live"' not in route)

check('gate_schema_bumped','velmere.p99.market-row-delivery-gate.v2' in gate)
check('sweep_schema_bumped','velmere.p99.market-sweep-delivery-gate.v2' in gate)
check('gate_imports_field_contract','getP99RealMarketsFieldContract' in gate)
for field in ('semanticClass','unit','currency','venueScope','executionEligible','currentnessClass','maxAgeSeconds','liveClaimed','executableQuoteClaimed'):
 check(f'gate_receipt_{field}',field in gate)
check('gate_contract_applied_missing','semanticClass: contract.semanticClass' in gate)
check('gate_contract_applied_normal',gate.count('semanticClass: contract.semanticClass')>=2)
check('gate_public_projection_semantics','semanticClass: field.semanticClass' in gate)
check('gate_public_projection_no_live','liveClaimed: field.liveClaimed' in gate)
check('gate_public_projection_no_execution','executableQuoteClaimed: field.executableQuoteClaimed' in gate)

# A mutated registry with a recomputed digest still cannot match the source-hardcoded expected digest.
mut=json.loads(json.dumps(registry)); mut['fields'][5]['semanticClass']='current_quote'; mut.pop('registrySha256')
mut_digest=hashlib.sha256(canonical(mut).encode()).hexdigest()
check('recomputed_mutation_differs_hardcoded',mut_digest!=registry['registrySha256'],mut_digest)

receipt={
 'schemaVersion':'velmere.p99.real-markets-basic-rights-semantics-static.v1',
 'generatedAt':'2026-08-21T14:20:00.000Z','status':'PASS',
 'checks':{'total':len(checks),'passed':sum(x['status']=='PASS' for x in checks),'failed':sum(x['status']!='PASS' for x in checks),'rows':checks},
 'sourceFiles':['config/p99/real-markets-basic-field-rights-currentness-registry.json','lib/market-integrity/real-markets-basic-field-policy.ts','lib/market-integrity/market-row-delivery-gate.ts','lib/server/market-integrity-route-modules/markets.ts'],
 'truthBoundary':'Static/source proof that current unapproved provider rights block customer delivery before network and that every Basic field has an explicit non-executable semantic/currentness contract. No provider, route, Browser, rights approval, build, exact Windows or FINAL credit.'
}
out=ROOT/'receipts/p99/P99_REAL_MARKETS_BASIC_RIGHTS_SEMANTICS_STATIC.json'; out.parent.mkdir(parents=True,exist_ok=True); out.write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps({'status':'PASS','checks':len(checks)},indent=2))
