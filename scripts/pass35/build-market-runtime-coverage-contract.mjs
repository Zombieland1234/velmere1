#!/usr/bin/env node
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
const tier=JSON.parse(readFileSync('config/pass35/product-tier-content-contract.json','utf8'));
const sha=(v)=>`sha256:${createHash('sha256').update(v).digest('hex')}`;
const surfaceIds=['shield','shield_pro','real_markets'];
const matrices=[];
for(const surfaceId of surfaceIds){
 const surface=tier.surfaces.find((s)=>s.surfaceId===surfaceId);
 for(const tierName of ['basic','pro','advanced']){
  const names=['basic','pro','advanced'].slice(0,['basic','pro','advanced'].indexOf(tierName)+1);
  const requiredFields=[...new Set(names.flatMap((name)=>surface.tiers[name].requiredFields).filter((f)=>!/^all_(basic|pro)_fields$/u.test(f)))].sort();
  matrices.push({surfaceId,tier:tierName,requiredFields,requiredFieldCount:requiredFields.length,minimumIndependentQuorum:tierName==='basic'?1:tierName==='pro'?2:3,requiredScenarios:[...new Set(names.flatMap((name)=>surface.tiers[name].requiredScenarios))].sort(),failClosedIf:[...new Set(names.flatMap((name)=>surface.tiers[name].failClosedIf))].sort()});
 }
}
const contract={schemaVersion:'velmere.pass35.market-runtime-coverage-contract.v1',passId:'PASS35_A10',sourceRevisionId:'VELMERE_PASS35_A16_CANONICAL_PARITY_PORTFOLIO_REGIME_RISK_NON_VISUAL',visualChangesMade:false,productTierContractSha256:sha(readFileSync('config/pass35/product-tier-content-contract.json')),wholeMarketDefinition:'100% of normalized ACTIVE instruments from fresh LIVE snapshots of declared supported providers, and 100% of required field cells for the requested surface/tier.',regressionCorpusRule:'The 50-case corpus is QA only and is forbidden as a production market denominator.',providerSnapshotStates:['LIVE','DEGRADED','WITHDRAWN','FIXTURE'],instrumentStates:['ACTIVE','HALTED','DELISTED','INACTIVE'],runtimeStates:['ELIGIBLE','UNAVAILABLE','STALE','CONFLICTED'],declaredProviderFamilies:[{id:'binance',roles:['crypto_catalog','spot_klines','order_book']},{id:'mexc',roles:['crypto_catalog','spot_market']},{id:'coinbase',roles:['crypto_catalog','spot_market','order_book']},{id:'kraken',roles:['crypto_catalog','spot_market','order_book']},{id:'defillama',roles:['defi_protocol_context','tvl_context']}],surfaceTierMatrices:matrices,hardRules:['inactive_halted_delisted_rows_excluded_from_active_denominator','stale_or_non_live_provider_snapshot_excluded','provider_listing_deduplicated_by_provider_instrument_id','assets_normalized_by_canonical_asset_id','every_required_field_cell_counted','missing_stale_conflicted_never_replaced_with_placeholder','coverage_receipt_never_unlocks_billing','visual_files_are_out_of_scope']};
mkdirSync('config/pass35',{recursive:true});writeFileSync('config/pass35/market-runtime-coverage-contract.json',`${JSON.stringify(contract,null,2)}\n`);
mkdirSync('artifacts/release',{recursive:true});
const summary={schemaVersion:'velmere.pass35.market-runtime-coverage-summary.v1',passId:'PASS35_A10',visualChangesMade:false,surfaceCount:surfaceIds.length,tierMatrixCount:matrices.length,totalRequiredFieldReferences:matrices.reduce((s,m)=>s+m.requiredFieldCount,0),contractSha256:sha(JSON.stringify(contract)),wholeMarketDefinition:contract.wholeMarketDefinition};
writeFileSync('artifacts/release/PASS35_A10_MARKET_RUNTIME_COVERAGE_SUMMARY.json',`${JSON.stringify(summary,null,2)}\n`);
console.log(JSON.stringify({status:'PASS_A10_MARKET_RUNTIME_CONTRACT_BUILT',...summary},null,2));
