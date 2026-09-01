#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const REVISION='VELMERE_PASS35_A16_CANONICAL_PARITY_PORTFOLIO_REGIME_RISK_NON_VISUAL';
const read=(path)=>JSON.parse(readFileSync(path,'utf8'));
const write=(path,value)=>{mkdirSync(path.split('/').slice(0,-1).join('/')||'.',{recursive:true});writeFileSync(path,`${JSON.stringify(value,null,2)}\n`);};
const sha=(value)=>`sha256:${createHash('sha256').update(value).digest('hex')}`;
const uniq=(items)=>[...new Set(items)];
const zero=read('config/pass35/zero-budget-functional-roadmap.json');
const status=read('config/pass35/current-status-register.json');
const product=read('config/pass35/product-tier-content-contract.json');
const current=read('config/current-release.json');

const capabilities=[
  {id:'ZB25_PUBLIC_FX_REAL_MARKETS_RUNTIME',status:'DONE',resourceModel:'Own work + keyless central-bank public data',truth:'ECB CSV and Bank of Canada Valet JSON adapters, reconciliation, freshness, cache, quota, schema quarantine and Basic/Pro/Advanced eligibility are implemented and proven over a local HTTP network fixture. Public internet LIVE remains unclaimed.'},
  {id:'ZB26_FULL_CATALOG_TARGET_SCHEDULER',status:'DONE',resourceModel:'Own work only',truth:'Every listing and normalized asset in a fresh dynamic denominator receives budgeted spot quote, klines and order-book target jobs or an explicit unsupported reason. Planning does not claim network execution.'},
  {id:'ZB27_WHALE_SUPPORTED_TOKEN_DENOMINATOR',status:'DONE',resourceModel:'Own work + public/free holder/transfer inputs',truth:'Every active crypto asset is counted. Exact chain/address binding and fresh holders/transfers/labels/market-impact evidence determine Basic/Pro/Advanced eligibility; unbound assets remain explicit UNAVAILABLE.'},
];
for(const capability of capabilities){const index=zero.capabilities.findIndex((row)=>row.id===capability.id);if(index>=0)zero.capabilities[index]=capability;else zero.capabilities.push(capability);}
zero.passId='PASS35_A13';zero.sourceRevisionId=REVISION;zero.visualChangesMade=false;
zero.truthBoundary='PASS35 A13 adds a keyless public FX Real Markets runtime, full-catalog request scheduling for Shield/Shield Pro/Market Impact and an exact supported-token Whale Watch denominator. All three capabilities are locally complete and fail-closed. Public DNS was unavailable, so current internet snapshots, real chain data, staging, customer value and authorization to sell remain unclaimed.';
write('config/pass35/zero-budget-functional-roadmap.json',zero);

const patch=(id,changes)=>{const row=status.rows.find((item)=>item.id===id);if(!row)throw new Error(`a13_status_row_missing:${id}`);Object.assign(row,changes);};
patch('MKT01_SHIELD_REAL_DATA',{
  doneEvidence:uniq([...status.rows.find((x)=>x.id==='MKT01_SHIELD_REAL_DATA').doneEvidence,'A13 full-catalog scheduler creates budgeted spot quote, klines and order-book jobs for every active listing','A13 scheduler fixture covers 80 normalized assets / 319 active listings / 957 target jobs without fixed-50 denominator']),
  missing:['real public-network target execution','field observations for every declared Shield field cell or explicit unavailable state','continuous cache/freshness monitoring','browser/staging proof','tier outcome benchmark'],
  blocker:'REAL_PUBLIC_NETWORK_FIELD_EXECUTION_REQUIRED',
  nextAction:'Execute the A13 target schedule against successful fresh provider snapshots and persist every field result or explicit unavailable reason.'
});
patch('MKT02_REAL_MARKETS',{
  doneEvidence:uniq([...status.rows.find((x)=>x.id==='MKT02_REAL_MARKETS').doneEvidence,'A13 first non-crypto runtime: ECB daily FX CSV + Bank of Canada Valet FX JSON','A13 local HTTP execution reconciles 4 FX pairs; 4 Basic and 3 Pro eligible, Advanced correctly blocked by three-family quorum']),
  missing:['real public-network ECB/Bank of Canada receipts','equity/ETF/commodity/REIT/index public runtimes','corporate action/calendar correctness','full field execution','staging/customer proof'],
  blocker:'REAL_NETWORK_AND_ADDITIONAL_ASSET_CLASSES_REQUIRED',
  nextAction:'Run A13 FX on public internet, bind exact snapshots, then extend the same contract to one free public equity/ETF or commodity source.'
});
patch('MKT03_MARKET_IMPACT',{
  doneEvidence:uniq([...status.rows.find((x)=>x.id==='MKT03_MARKET_IMPACT').doneEvidence,'A13 full-catalog target scheduler plans order books for all 80 normalized fixture assets and 319 active listings under provider budgets']),
  missing:['real public-network order-book execution for the full eligible denominator','realized slippage comparison','continuous refresh and outage receipts','staging/customer outcome proof'],
  blocker:'REAL_ORDER_BOOK_EXECUTION_AND_OUTCOME_REQUIRED',
  nextAction:'Execute every scheduled order-book target, measure available/unavailable coverage and compare simulated impact with observed execution where possible.'
});
patch('MKT04_WHALE_WATCH',{
  doneEvidence:uniq([...status.rows.find((x)=>x.id==='MKT04_WHALE_WATCH').doneEvidence,'A13 supported-token denominator counts all 120 active fixture crypto assets rather than only configured tokens','A13 exact bindings: 60/120; tier eligibility Basic 60 / Pro 40 / Advanced 20; every unbound token is explicit UNAVAILABLE']),
  missing:['real active-market supported-token bindings','real current holder/transfer/label/market-impact receipts','continuous label maintenance and monitoring delivery','staging/customer outcome proof'],
  blocker:'REAL_TOKEN_BINDINGS_EVIDENCE_AND_MONITORING_REQUIRED',
  nextAction:'Populate signed chain/address bindings and fresh evidence over the entire current active crypto denominator; never drop unbound tokens from coverage math.'
});
status.sourceRevisionId=REVISION;status.evaluatedAt='2026-07-23T00:00:00.000+02:00';status.canonicalCurrentTruth=true;
const excluded=new Set(zero.zeroBudgetCoreExclusions);const core=zero.capabilities.filter((row)=>!excluded.has(row.id));
const zcounts={DONE:0,PARTIAL:0,NOT_DONE:0};for(const row of core)zcounts[row.status]=(zcounts[row.status]??0)+1;
const zweighted=Number((((zcounts.DONE+zcounts.PARTIAL*0.5)/core.length)*100).toFixed(1));
status.zeroBudgetFunctionalTrack={...(status.zeroBudgetFunctionalTrack??{}),targetPercent:100,currentWeightedPlanningPercent:zweighted,coreDenominator:core.length,done:zcounts.DONE,partial:zcounts.PARTIAL,notDone:zcounts.NOT_DONE,roadmapPath:'config/pass35/zero-budget-functional-roadmap.json',a13FunctionalRuntimeContractPath:'config/pass35/a13-functional-runtime-contract.json'};
const counts={DONE:0,PARTIAL:0,BLOCKED_EXTERNAL:0,NOT_DONE:0};for(const row of status.rows)counts[row.status]+=1;
const cweighted=Number((((counts.DONE+counts.PARTIAL*0.5)/status.rows.length)*100).toFixed(1));
const cstrict=Number(((counts.DONE/status.rows.length)*100).toFixed(1));
status.truthBoundary=`PASS35 A13 is the only canonical current status. The canonical roadmap remains ${cweighted.toFixed(1)}% weighted / ${cstrict.toFixed(1)}% strict across ${status.rows.length} workstreams. The zero-budget functional-core track is ${zweighted.toFixed(1)}% weighted across ${core.length} capabilities. A13 locally completes a keyless public FX runtime, full active-catalog target scheduling and a Whale Watch supported-token denominator. Public DNS was unavailable, so no current public-network provider, FX, chain, holder, transfer, order-book or LIVE receipt is claimed. All paid cells remain NO_GO and visual files remain frozen.`;
write('config/pass35/current-status-register.json',status);

product.passId='PASS35_A13';product.sourceRevisionId=REVISION;write('config/pass35/product-tier-content-contract.json',product);
for(const path of ['config/pass35/audit-a01-a05-policy.json','config/pass35/market-runtime-coverage-contract.json','config/pass35/public-provider-runtime-contract.json','config/pass35/market-impact-whale-tier-contract.json','config/pass35/audit-a8-execution-policy.json','config/pass35/a08-foundry-invariant-plan.json','config/pass35/audit-program.json']){const value=read(path);value.sourceRevisionId=REVISION;write(path,value);}
current.sourceRevisionId=REVISION;current.sourceRevisionStatus='A13_FX_TARGET_SCHEDULER_WHALE_DENOMINATOR_IMPLEMENTED_PUBLIC_NETWORK_BLOCKED';
current.a13FunctionalRuntimeContractPath='config/pass35/a13-functional-runtime-contract.json';
current.a13FunctionalRuntimeBoardPath='artifacts/release/PASS35_A13_FUNCTIONAL_RUNTIME.md';
current.a13ProductRoadmapSummaryPath='artifacts/release/PASS35_A13_PRODUCT_ROADMAP_SUMMARY.json';
current.productionPromotionAllowed=false;write('config/current-release.json',current);

const contract={
  schemaVersion:'velmere.pass35.a13-functional-runtime-contract.v1',passId:'PASS35_A13',sourceRevisionId:REVISION,visualChangesMade:false,
  publicFxRuntime:{providers:['ecb','bank_of_canada'],transportProof:'LOCAL_HTTP_NETWORK_FIXTURE',fixtureExecution:{providers:2,pairs:4,basicEligible:4,proEligible:3,advancedEligible:0,assertions:25},controls:['bounded_response','cache','shared_inflight','quota_budget','schema_quarantine','freshness','independent_family_reconciliation','tier_quorum'],publicNetworkStatus:'BLOCKED_ENVIRONMENT_DNS'},
  fullCatalogScheduler:{fixtureExecution:{activeAssets:80,activeListings:319,jobs:957,assertions:15},roles:['spot_quote','klines','order_book'],surfaces:['shield','shield_pro','market_impact'],controls:['all_active_listings_counted','provider_budget','maximum_concurrency','freshness_target','unsupported_reason','tamper_verification'],networkExecutionStatus:'PLAN_ONLY_NOT_EXECUTED'},
  whaleTokenDenominator:{fixtureExecution:{activeAssets:120,boundTokens:60,basicEligible:60,proEligible:40,advancedEligible:20,bindingCoverageBps:5000,assertions:13},controls:['all_active_crypto_assets_counted','exact_chain_address_binding','fresh_holder_evidence','fresh_transfer_evidence','verified_label_evidence','market_impact_binding','explicit_unavailable','tamper_verification'],realDenominatorStatus:'NOT_EXECUTED_REAL_MARKET'},
  zeroBudgetWeightedPlanningPercent:zweighted,canonicalWeightedPlanningPercent:cweighted,canonicalStrictDonePercent:cstrict,
  sellEnabled:false,paidDeliveryEligible:false,liveClaimed:false,
  truthBoundary:'A13 proves local functional runtimes and full-denominator math. It does not prove current public internet, provider rights, complete field observations, chain state, customer outcome, paid readiness or LIVE.'
};
write('config/pass35/a13-functional-runtime-contract.json',contract);
const board=[
  '# PASS35 A13 — Functional Market Runtime (Non-Visual)','',`- Source revision: \`${REVISION}\``,`- Canonical roadmap: **${cweighted}% weighted / ${cstrict}% strict**`,`- Zero-budget functional core: **${zweighted}%**`,'- Visual changes: **NO**','',
  '## Public FX Real Markets','', '- ECB daily reference-rate CSV parser.', '- Bank of Canada Valet JSON parser and CAD-cross derivation.', '- Local HTTP network-stack execution, cache, shared inflight, quota and schema quarantine.', '- Fixture: 4 FX pairs; Basic 4, Pro 3, Advanced 0 because three independent families are not available.', '- Public DNS was unavailable: no public-network LIVE claim.','',
  '## Full-catalog scheduler','', '- Every active listing receives spot quote, klines and order-book jobs under provider budgets.', '- Fixture: 80 assets / 319 listings / 957 jobs.', '- Supports Shield, Shield Pro and Market Impact.', '- Plan-only receipt; no network execution claim.','',
  '## Whale Watch supported-token denominator','', '- Every active crypto asset remains in the denominator.', '- Exact chain/address binding required.', '- Fixture: 120 assets; 60 bound; Basic 60 / Pro 40 / Advanced 20.', '- Unbound or stale/missing evidence remains explicit UNAVAILABLE.','',
  '## Current boundary','', '- `sellEnabled=false`', '- `paidDeliveryEligible=false`', '- `liveClaimed=false`', '- Real public snapshots, chain evidence, staging and customer outcomes remain.',''
].join('\n');
mkdirSync('artifacts/release',{recursive:true});writeFileSync('artifacts/release/PASS35_A13_FUNCTIONAL_RUNTIME.md',board);
const summary={schemaVersion:'velmere.pass35.a13-functional-runtime-summary.v1',passId:'PASS35_A13',sourceRevisionId:REVISION,canonicalWeightedPlanningPercent:cweighted,canonicalStrictDonePercent:cstrict,canonicalCounts:counts,zeroBudgetWeightedPlanningPercent:zweighted,zeroBudgetCounts:zcounts,zeroBudgetCoreDenominator:core.length,fxFixture:contract.publicFxRuntime.fixtureExecution,schedulerFixture:contract.fullCatalogScheduler.fixtureExecution,whaleDenominatorFixture:contract.whaleTokenDenominator.fixtureExecution,visualChangesMade:false,sellEnabled:false,liveClaimed:false,contractSha256:sha(readFileSync('config/pass35/a13-functional-runtime-contract.json')),boardSha256:sha(board)};
write('artifacts/release/PASS35_A13_PRODUCT_ROADMAP_SUMMARY.json',summary);
for(const path of ['artifacts/release/PASS35_A9_PRODUCT_ROADMAP_SUMMARY.json','artifacts/release/PASS35_A10_PRODUCT_ROADMAP_SUMMARY.json','artifacts/release/PASS35_A11_PRODUCT_ROADMAP_SUMMARY.json','artifacts/release/PASS35_A12_PRODUCT_ROADMAP_SUMMARY.json']){
  const value=read(path);value.sourceRevisionId=REVISION;value.zeroBudgetWeightedPlanningPercent=zweighted;value.zeroBudgetCounts={DONE:zcounts.DONE,PARTIAL:zcounts.PARTIAL,NOT_DONE:zcounts.NOT_DONE,...('OPTIONAL_EXTERNAL' in (value.zeroBudgetCounts??{})?{OPTIONAL_EXTERNAL:0}:{})};if('zeroBudgetCoreDenominator' in value)value.zeroBudgetCoreDenominator=core.length;write(path,value);
}
console.log(JSON.stringify({status:'PASS_A13_FUNCTIONAL_RUNTIME_ROADMAP_BUILT',...summary},null,2));
