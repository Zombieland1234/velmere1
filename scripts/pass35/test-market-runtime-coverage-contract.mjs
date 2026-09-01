#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {buildProviderCatalogSnapshot,verifyProviderCatalogSnapshot,buildDynamicMarketDenominator,verifyDynamicMarketDenominator,buildSurfaceTierCoverage,verifySurfaceTierCoverage,pass35MarketRuntimeCoverageInternals} from '../../lib/market-integrity/pass35-market-runtime-coverage.mjs';
const contract=JSON.parse(readFileSync('config/pass35/market-runtime-coverage-contract.json','utf8'));
const tiers=JSON.parse(readFileSync('config/pass35/product-tier-content-contract.json','utf8'));
const d=(s)=>`sha256:${createHash('sha256').update(s).digest('hex')}`;
let checks=0; const check=(v,m)=>{assert.ok(v,m);checks++;};
check(contract.schemaVersion==='velmere.pass35.market-runtime-coverage-contract.v1','schema');
check(contract.passId==='PASS35_A10','pass');check(contract.visualChangesMade===false,'visual');
check(contract.surfaceTierMatrices.length===9,'matrix count');check(contract.totalRequiredFieldReferences===undefined,'no self-written misleading total');
check(/50-case corpus is QA only/u.test(contract.regressionCorpusRule),'50 truth');
check(/100% of normalized ACTIVE instruments/u.test(contract.wholeMarketDefinition),'whole market truth');
for(const m of contract.surfaceTierMatrices){check(['shield','shield_pro','real_markets'].includes(m.surfaceId),`surface:${m.surfaceId}`);check(['basic','pro','advanced'].includes(m.tier),`tier:${m.tier}`);check(m.requiredFieldCount===m.requiredFields.length&&m.requiredFieldCount>=10,`fields:${m.surfaceId}:${m.tier}`);check(m.minimumIndependentQuorum===({basic:1,pro:2,advanced:3}[m.tier]),`quorum:${m.surfaceId}:${m.tier}`);}
const observedAt='2026-07-22T20:00:00.000Z';
const evaluatedAt=observedAt;
const snap=(providerId,state,instruments,minutes=0)=>buildProviderCatalogSnapshot({providerId,providerFamily:providerId,providerState:state,observedAt:new Date(Date.parse(observedAt)-minutes*60000).toISOString(),rawPayloadDigest:d(`${providerId}:raw`),termsMode:'PUBLIC_FREE_UNVERIFIED',instruments});
const row=(id,asset,symbol,status='ACTIVE',quote='USDT')=>({providerInstrumentId:id,canonicalAssetId:`crypto:${asset}`,assetClass:'crypto',symbol,baseSymbol:asset,quoteSymbol:quote,venue:id.split(':')[0],marketType:'spot',status,sourceRef:`public:${id}`});
const binance=snap('binance','LIVE',[row('binance:BTCUSDT','BTC','BTC'),row('binance:ETHUSDT','ETH','ETH'),row('binance:DOGEUSDT','DOGE','DOGE','HALTED')]);
const mexc=snap('mexc','LIVE',[row('mexc:BTCUSDT','BTC','BTC'),row('mexc:SOLUSDT','SOL','SOL')]);
const coinbase=snap('coinbase','LIVE',[row('coinbase:BTC-USD','BTC','BTC','ACTIVE','USD'),row('coinbase:ETH-USD','ETH','ETH','ACTIVE','USD')]);
const kraken=snap('kraken','DEGRADED',[row('kraken:XBTUSD','BTC','XBT','ACTIVE','USD')]);
for(const s of [binance,mexc,coinbase,kraken]) check(verifyProviderCatalogSnapshot(s),`snapshot:${s.providerId}`);
const denominator=buildDynamicMarketDenominator({snapshots:[binance,mexc,coinbase,kraken],evaluatedAt,maxSnapshotAgeSeconds:900});
check(verifyDynamicMarketDenominator(denominator),'denominator verify');
check(denominator.providerDenominator===4,'provider denominator');
check(denominator.activeListingDenominator===6,'listing denominator');
check(denominator.activeAssetDenominator===3,'asset denominator');
check(denominator.excludedListingCount===2,'excluded count');
check(denominator.assets.find((a)=>a.canonicalAssetId==='crypto:BTC').providerIds.length===3,'btc provider count');
check(!denominator.assets.some((a)=>a.canonicalAssetId==='crypto:DOGE'),'halted excluded');
check(denominator.excluded.some((a)=>a.providerId==='kraken'),'degraded excluded');
check(denominator.truthBoundary.includes('not a fixed 50-case corpus'),'truth boundary');
const denominator2=buildDynamicMarketDenominator({snapshots:[binance,mexc,coinbase,kraken],evaluatedAt,maxSnapshotAgeSeconds:900});
check(denominator2.denominatorDigest===denominator.denominatorDigest,'deterministic denominator');
const extra=snap('extra','LIVE',[row('extra:AVAXUSD','AVAX','AVAX','ACTIVE','USD')]);
const expanded=buildDynamicMarketDenominator({snapshots:[binance,mexc,coinbase,extra],evaluatedAt,maxSnapshotAgeSeconds:900});
check(expanded.activeAssetDenominator===4,'dynamic expansion');check(expanded.denominatorDigest!==denominator.denominatorDigest,'dynamic digest');
const stale=snap('stale','LIVE',[row('stale:ADAUSD','ADA','ADA','ACTIVE','USD')],20);
const staleDen=buildDynamicMarketDenominator({snapshots:[stale],evaluatedAt,maxSnapshotAgeSeconds:900});
check(staleDen.activeAssetDenominator===0&&staleDen.excludedListingCount===1,'stale exclusion');
assert.throws(()=>buildDynamicMarketDenominator({snapshots:[binance,binance],evaluatedAt}),/duplicate_provider_snapshot/u);checks++;
assert.throws(()=>buildProviderCatalogSnapshot({providerId:'bad',providerState:'LIVE',observedAt,rawPayloadDigest:d('x'),instruments:[row('x','BTC','BTC'),row('x','ETH','ETH')]}),/provider_instrument_id_invalid/u);checks++;
const tampered=structuredClone(binance);tampered.instruments[0].symbol='FAKE';check(!verifyProviderCatalogSnapshot(tampered),'tamper snapshot');
const fields=(surface,tier)=>pass35MarketRuntimeCoverageInternals.visibleRequirements(tiers,surface,tier);
for(const surface of ['shield','shield_pro','real_markets']){
 const b=fields(surface,'basic'),p=fields(surface,'pro'),a=fields(surface,'advanced');
 check(new Set(b).size===b.length,`basic unique:${surface}`);check(p.every((x)=>a.includes(x)),`advanced inherits:${surface}`);check(b.every((x)=>p.includes(x)),`pro inherits:${surface}`);check(a.length>p.length&&p.length>b.length,`tier depth:${surface}`);
}
function observationsFor(surface,tier,assetRoots){
 const req=fields(surface,tier); const out=[];
 for(const asset of denominator.assets){
  const roots=assetRoots[asset.canonicalAssetId]??[];
  for(const fieldId of req) for(const root of roots) out.push({canonicalAssetId:asset.canonicalAssetId,fieldId,state:'AVAILABLE',observedAt,providerFamily:root,upstreamRoot:root,maxAgeSeconds:300,contentDigest:d(`${asset.canonicalAssetId}:${fieldId}:${root}`)});
 }
 return out;
}
const roots1=Object.fromEntries(denominator.assets.map((a)=>[a.canonicalAssetId,['p1']]));
const roots2=Object.fromEntries(denominator.assets.map((a)=>[a.canonicalAssetId,['p1','p2']]));
const roots3=Object.fromEntries(denominator.assets.map((a)=>[a.canonicalAssetId,['p1','p2','p3']]));
for(const surface of ['shield','shield_pro','real_markets']){
 const basic=buildSurfaceTierCoverage({contract:tiers,denominator,surfaceId:surface,tier:'basic',observations:observationsFor(surface,'basic',roots1),evaluatedAt});
 check(verifySurfaceTierCoverage(basic),`basic verify:${surface}`);check(basic.analysisEligibleForAllAssets,`basic eligible:${surface}`);check(basic.completenessBps===10000,`basic complete:${surface}`);check(!basic.paidDeliveryEligible&&!basic.sellEnabled,`basic no billing:${surface}`);
 const pro=buildSurfaceTierCoverage({contract:tiers,denominator,surfaceId:surface,tier:'pro',observations:observationsFor(surface,'pro',roots2),evaluatedAt});
 check(verifySurfaceTierCoverage(pro),`pro verify:${surface}`);check(pro.analysisEligibleForAllAssets&&pro.eligibleAssetCount===3,`pro eligible:${surface}`);check(pro.minimumIndependentQuorum===2,`pro quorum:${surface}`);check(!pro.paidDeliveryEligible,`pro billing locked:${surface}`);
 const advanced=buildSurfaceTierCoverage({contract:tiers,denominator,surfaceId:surface,tier:'advanced',observations:observationsFor(surface,'advanced',roots3),evaluatedAt});
 check(verifySurfaceTierCoverage(advanced),`adv verify:${surface}`);check(advanced.analysisEligibleForAllAssets,`adv eligible:${surface}`);check(advanced.minimumIndependentQuorum===3,`adv quorum:${surface}`);check(!advanced.paidDeliveryEligible,`adv billing locked:${surface}`);
 const insufficient=buildSurfaceTierCoverage({contract:tiers,denominator,surfaceId:surface,tier:'pro',observations:observationsFor(surface,'pro',roots1),evaluatedAt});
 check(!insufficient.analysisEligibleForAllAssets&&insufficient.completenessBps===0,`quorum blocks:${surface}`);
 const missing=observationsFor(surface,'basic',roots1).filter((o)=>o.fieldId!==fields(surface,'basic')[0]);
 const missingReceipt=buildSurfaceTierCoverage({contract:tiers,denominator,surfaceId:surface,tier:'basic',observations:missing,evaluatedAt});
 check(!missingReceipt.analysisEligibleForAllAssets&&missingReceipt.rows.every((r)=>r.state==='UNAVAILABLE'),`missing blocks:${surface}`);
 const conflict=observationsFor(surface,'basic',roots1);conflict.push({canonicalAssetId:'crypto:BTC',fieldId:fields(surface,'basic')[0],state:'CONFLICTED',observedAt,providerFamily:'p2',upstreamRoot:'p2',maxAgeSeconds:300,contentDigest:d('conflict')});
 const conflictReceipt=buildSurfaceTierCoverage({contract:tiers,denominator,surfaceId:surface,tier:'basic',observations:conflict,evaluatedAt});
 check(conflictReceipt.rows.find((r)=>r.canonicalAssetId==='crypto:BTC').state==='CONFLICTED',`conflict state:${surface}`);
 const staleObs=observationsFor(surface,'basic',roots1);staleObs[0]={...staleObs[0],state:'STALE',observedAt:'2026-07-22T19:00:00.000Z'};
 const staleReceipt=buildSurfaceTierCoverage({contract:tiers,denominator,surfaceId:surface,tier:'basic',observations:staleObs,evaluatedAt});
 check(!staleReceipt.analysisEligibleForAllAssets,`stale blocks:${surface}`);
}
const receipt=buildSurfaceTierCoverage({contract:tiers,denominator,surfaceId:'shield',tier:'basic',observations:observationsFor('shield','basic',roots1),evaluatedAt});
const receiptTamper=structuredClone(receipt);receiptTamper.completenessBps=1;check(!verifySurfaceTierCoverage(receiptTamper),'coverage tamper');
console.log(JSON.stringify({status:'PASS_A10_DYNAMIC_MARKET_RUNTIME_COVERAGE',checks,providers:denominator.providerDenominator,activeListings:denominator.activeListingDenominator,activeAssets:denominator.activeAssetDenominator,tierMatrices:contract.surfaceTierMatrices.length,visualChangesMade:false,paidDeliveryEligible:false},null,2));
