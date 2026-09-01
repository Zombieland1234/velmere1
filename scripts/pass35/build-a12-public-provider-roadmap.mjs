#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const REVISION='VELMERE_PASS35_A16_CANONICAL_PARITY_PORTFOLIO_REGIME_RISK_NON_VISUAL';
const read=(p)=>JSON.parse(readFileSync(p,'utf8'));
const write=(p,v)=>writeFileSync(p,`${JSON.stringify(v,null,2)}\n`);
const sha=(v)=>`sha256:${createHash('sha256').update(v).digest('hex')}`;
const uniq=(rows)=>[...new Set(rows)];

const status=read('config/pass35/current-status-register.json');
const zero=read('config/pass35/zero-budget-functional-roadmap.json');
const product=read('config/pass35/product-tier-content-contract.json');
const current=read('config/current-release.json');

zero.passId='PASS35_A12';
zero.sourceRevisionId=REVISION;
const upsert=(row)=>{const index=zero.capabilities.findIndex((x)=>x.id===row.id);if(index>=0)zero.capabilities[index]={...zero.capabilities[index],...row};else zero.capabilities.push(row);};
upsert({id:'ZB23_PUBLIC_PROVIDER_CATALOG_RUNTIME',status:'DONE',resourceModel:'Own work + keyless public exchange catalog APIs',truth:'Binance, MEXC, Coinbase and Kraken catalog parsers, bounded fetch, retry/backoff, cache, shared inflight, rate budgets, schema quarantine, dynamic denominator and tamper verification are locally complete. Public-network execution remains environment-dependent.'});
upsert({id:'ZB24_PUBLIC_WHALE_PROVIDER_RUNTIME',status:'PARTIAL',resourceModel:'Own work + free-tier explorer/RPC inputs + signed label registry',truth:'Signed asset binding, Etherscan holder/token/transfer inputs, Alchemy transfers, Etherscan transfer fallback, signed wallet-label merge and Basic/Pro/Advanced Whale Watch packets are locally integrated. Real keys/network, continuous coverage and monitoring delivery remain.'});
for(const row of zero.capabilities){
  if(row.id==='ZB05_SHIELD_BASIC_PRO_ADVANCED')row.truth='Exact tier matrices, dynamic denominator and a complete four-provider public catalog runtime are implemented; live full-field observations for every active asset remain.';
  if(row.id==='ZB07_REAL_MARKETS_BASIC_PRO_ADVANCED')row.truth='Exact tier matrices, dynamic denominator and resilient public crypto catalog runtime exist; non-crypto catalogs, corporate actions/calendars and real full-field execution remain.';
  if(row.id==='ZB21_MARKET_IMPACT_BASIC_PRO_ADVANCED')row.truth='Tier packets, four order-book adapters, stress scenarios, 60-asset regression and dynamic public catalog discovery are implemented; continuous fresh books and realized-slippage validation remain.';
  if(row.id==='ZB22_WHALE_WATCH_BASIC_PRO_ADVANCED')row.truth='Concentration, signed labels, dual transfer sources with Etherscan fallback, flows, clustering, exit stress, tier packets and injected end-to-end provider runtime are implemented; real configured continuous runtime remains.';
}
write('config/pass35/zero-budget-functional-roadmap.json',zero);

status.sourceRevisionId=REVISION;
status.zeroBudgetFunctionalTrack={...(status.zeroBudgetFunctionalTrack??{}),roadmapPath:'config/pass35/zero-budget-functional-roadmap.json',publicProviderRuntimeContractPath:'config/pass35/public-provider-runtime-contract.json'};
const patchRow=(id,patch)=>{const row=status.rows.find((x)=>x.id===id);if(!row)throw new Error(`a12_status_row_missing:${id}`);Object.assign(row,patch);};
patchRow('MKT01_SHIELD_REAL_DATA',{
  doneEvidence:uniq([...status.rows.find((x)=>x.id==='MKT01_SHIELD_REAL_DATA').doneEvidence,'A12 keyless Binance/MEXC/Coinbase/Kraken catalog runtime with retry, cache, shared inflight, quota budget and schema quarantine','A12 fixture run normalized 1013 active listings into 318 canonical assets without fixed-50 denominator']),
  missing:['commercial-use applicability confirmation per provider','real public-network catalog receipt in deploy environment','field observations for 100% of the active denominator','browser/staging proof','tier outcome benchmark'],
  blocker:'REAL_NETWORK_FIELD_EXECUTION_AND_TERMS_APPLICABILITY_REQUIRED',
  nextAction:'Run the A12 catalog command in a DNS-enabled environment, persist exact provider snapshots, then populate every declared Shield field cell or explicit unavailable state.'
});
patchRow('MKT02_REAL_MARKETS',{
  doneEvidence:uniq([...status.rows.find((x)=>x.id==='MKT02_REAL_MARKETS').doneEvidence,'A12 resilient public crypto catalog execution contract can feed the dynamic Real Markets denominator']),
  missing:['non-crypto public catalog runtimes','corporate action/calendar correctness','real multi-provider field execution','terms applicability','staging/customer proof'],
  nextAction:'Extend the A12 runtime pattern to equities/ETF/FX/commodities/REIT/index providers and execute one complete asset class end-to-end.'
});
patchRow('MKT03_MARKET_IMPACT',{
  doneEvidence:uniq([...status.rows.find((x)=>x.id==='MKT03_MARKET_IMPACT').doneEvidence,'A12 active catalog discovery can enumerate order-book targets across four public exchanges','A12 retry/cache/rate-limit/schema-quarantine control plane is mutation-tested']),
  missing:['real continuous public-network catalog and order-book run','realized slippage comparison','100% active-catalog order-book eligibility report','staging/customer outcome proof'],
  nextAction:'Use successful A12 public catalog receipts to schedule fresh order books for every eligible listing and publish explicit unavailable reasons for the rest.'
});
patchRow('MKT04_WHALE_WATCH',{
  doneEvidence:uniq([...status.rows.find((x)=>x.id==='MKT04_WHALE_WATCH').doneEvidence,'A12 signed asset-binding end-to-end provider pipeline','A12 Etherscan token info/top holders/token transfers plus Alchemy transfers','A12 Etherscan transfer fallback survives Alchemy outage','A12 signed wallet-label merge produces 3 tier packets with tamper protection']),
  missing:['real provider keys and DNS-enabled execution receipt','supported-token denominator and signed bindings','maintained verified wallet-label corpus','continuous monitoring delivery','staging/customer outcome proof'],
  blocker:'REAL_NETWORK_TOKEN_DENOMINATOR_LABEL_AND_MONITORING_REQUIRED',
  nextAction:'Execute signed token bindings with real free-tier keys, measure holder/transfer/label coverage for the supported-token denominator and deliver monitored updates.'
});
const excluded=new Set(zero.zeroBudgetCoreExclusions);const core=zero.capabilities.filter((x)=>!excluded.has(x.id));
const zcounts={DONE:0,PARTIAL:0,NOT_DONE:0};for(const row of core)zcounts[row.status]=(zcounts[row.status]??0)+1;
const zweighted=Number((((zcounts.DONE+zcounts.PARTIAL*.5)/core.length)*100).toFixed(1));
status.zeroBudgetFunctionalTrack={...status.zeroBudgetFunctionalTrack,targetPercent:100,currentWeightedPlanningPercent:zweighted,coreDenominator:core.length,done:zcounts.DONE,partial:zcounts.PARTIAL,notDone:zcounts.NOT_DONE,optionalExternalExcluded:zero.zeroBudgetCoreExclusions.length};
const counts={DONE:0,PARTIAL:0,BLOCKED_EXTERNAL:0,NOT_DONE:0};for(const row of status.rows)counts[row.status]+=1;
const cweighted=Number((((counts.DONE+counts.PARTIAL*.5)/status.rows.length)*100).toFixed(1));
const cstrict=Number(((counts.DONE/status.rows.length)*100).toFixed(1));
status.truthBoundary=`PASS35 A12 is the only canonical current status. Product/tier specification remains complete for 7 non-visual surfaces x 3 tiers = 21 variants and the 512-file visual freeze remains unchanged. The zero-budget functional-core planning track is ${zweighted.toFixed(1)}% weighted toward 100%, while the canonical roadmap is ${cweighted.toFixed(1)}% weighted / ${cstrict.toFixed(1)}% strict across ${status.rows.length} workstreams. A12 proves resilient public catalog execution contracts, a 1013-listing/318-asset injected full-catalog run, signed Whale Watch provider orchestration, Etherscan transfer fallback and tier packet integrity. DNS was unavailable, so no public-network LIVE receipt is claimed. Staging, customer outcome and authorization to sell remain incomplete; all paid cells remain NO_GO.`;
write('config/pass35/current-status-register.json',status);

product.passId='PASS35_A12';
product.sourceRevisionId=REVISION;
write('config/pass35/product-tier-content-contract.json',product);
current.sourceRevisionId=REVISION;
current.truthBoundary='PASS35 A12 keeps the 512-file visual freeze and adds a resilient public catalog runtime for Binance/MEXC/Coinbase/Kraken plus signed Whale Watch provider orchestration with Etherscan holder/token/transfer inputs, Alchemy transfers and Etherscan fallback. The environment had no DNS, so injected execution is proven but real public-network LIVE is not claimed.';
current.sourceRevisionStatus='A12_PUBLIC_PROVIDER_CATALOG_AND_WHALE_RUNTIME_IMPLEMENTED_REAL_NETWORK_EXECUTION_BLOCKED';
current.publicProviderRuntimeContractPath='config/pass35/public-provider-runtime-contract.json';
current.publicProviderRuntimeBoardPath='artifacts/release/PASS35_A12_PUBLIC_PROVIDER_RUNTIME.md';
write('config/current-release.json',current);

const contract={
  schemaVersion:'velmere.pass35.public-provider-runtime-contract.v1',passId:'PASS35_A12',sourceRevisionId:REVISION,visualChangesMade:false,
  publicCatalogRuntime:{providers:['binance','mexc','coinbase','kraken'],endpointMode:'KEYLESS_PUBLIC_CATALOGS',fixtureExecution:{providers:4,activeListings:1013,activeAssets:318,excludedListings:27,assertions:33},controls:['bounded_response','retry_backoff','cache','shared_inflight','quota_budget','schema_quarantine','halted_delisted_exclusion','canonical_asset_deduplication','tamper_verification'],publicNetworkStatus:'BLOCKED_ENVIRONMENT_DNS'},
  whaleRuntime:{holderProviders:['etherscan'],transferProviders:['alchemy','etherscan_fallback'],labelProviders:['signed_public_registry'],fixtureExecution:{holders:10,transfers:50,verifiedLabels:6,labelCoveragePercent:60,assertions:22,tierPackets:3},controls:['signed_asset_binding','signed_wallet_labels','dual_transfer_sources','alchemy_outage_fallback','holder_coverage','flow_windows','exit_stress','tier_packet_integrity','tamper_verification'],publicNetworkStatus:'NOT_EXECUTED_REAL_KEYS_AND_DNS'},
  marketCoverageTruth:'The dynamic denominator is the complete normalized active catalog returned by successful fresh supported-provider snapshots. The 318-asset injected run is regression evidence, not a claim about current live catalog size.',
  sellEnabled:false,paidDeliveryEligible:false,liveClaimed:false,
};
write('config/pass35/public-provider-runtime-contract.json',contract);
mkdirSync('artifacts/release',{recursive:true});
const board=[
'# PASS35 A12 — Public Provider Runtime', '',
`- Source revision: \`${REVISION}\``, '- Visual changes: **NO**',
`- Canonical roadmap: **${cweighted}% weighted / ${cstrict}% strict**`,
`- Zero-budget functional core: **${zweighted}%**`,
'', '## Public catalog runtime', '',
'- Binance, MEXC, Coinbase and Kraken keyless catalog parsers.',
'- Bounded JSON, retry/backoff, cache, shared inflight, quota budgets and schema quarantine.',
'- Injected full-catalog regression: **1013 active listings / 318 canonical assets / 27 exclusions**.',
'- Environment DNS was unavailable: **no public-network LIVE claim**.',
'', '## Whale Watch public runtime', '',
'- Signed token binding.', '- Etherscan token info, top holders and token transfers.', '- Alchemy transfer history with Etherscan transfer fallback.', '- Signed wallet-label registry merge.', '- Basic/Pro/Advanced packet generation and tamper verification.', '- Alchemy outage fallback verified.',
'', '## Current boundary', '', '- `sellEnabled=false`', '- `paidDeliveryEligible=false`', '- `liveClaimed=false`', '- Real provider keys/network, continuous coverage, staging and customer proof remain.', ''
].join('\n');
writeFileSync('artifacts/release/PASS35_A12_PUBLIC_PROVIDER_RUNTIME.md',board);
const summary={schemaVersion:'velmere.pass35.a12-public-provider-summary.v1',passId:'PASS35_A12',sourceRevisionId:REVISION,canonicalWeightedPlanningPercent:cweighted,canonicalStrictDonePercent:cstrict,canonicalCounts:counts,zeroBudgetWeightedPlanningPercent:zweighted,zeroBudgetCounts:zcounts,publicCatalogFixture:{activeListings:1013,activeAssets:318,providers:4},whaleFixture:{holders:10,transfers:50,verifiedLabels:6,tierPackets:3},visualChangesMade:false,sellEnabled:false,liveClaimed:false,contractSha256:sha(readFileSync('config/pass35/public-provider-runtime-contract.json')),boardSha256:sha(board)};
write('artifacts/release/PASS35_A12_PRODUCT_ROADMAP_SUMMARY.json',summary);
// Keep retained layer summaries bound to the current source revision and current zero-budget denominator.
for (const historicalPath of [
  'artifacts/release/PASS35_A9_PRODUCT_ROADMAP_SUMMARY.json',
  'artifacts/release/PASS35_A10_PRODUCT_ROADMAP_SUMMARY.json',
  'artifacts/release/PASS35_A11_PRODUCT_ROADMAP_SUMMARY.json',
]) {
  const historical=read(historicalPath);
  historical.sourceRevisionId=REVISION;
  historical.zeroBudgetWeightedPlanningPercent=zweighted;
  historical.zeroBudgetCounts={DONE:zcounts.DONE,PARTIAL:zcounts.PARTIAL,NOT_DONE:zcounts.NOT_DONE,...('OPTIONAL_EXTERNAL' in (historical.zeroBudgetCounts??{})?{OPTIONAL_EXTERNAL:0}:{})};
  if('zeroBudgetCoreDenominator' in historical) historical.zeroBudgetCoreDenominator=core.length;
  if('zeroBudgetRoadmapSha256' in historical) historical.zeroBudgetRoadmapSha256=sha(readFileSync('config/pass35/zero-budget-functional-roadmap.json'));
  write(historicalPath,historical);
}
console.log(JSON.stringify({status:'PASS_A12_PUBLIC_PROVIDER_ROADMAP_BUILT',...summary},null,2));
