#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  clearPublicProviderCatalogRuntimeForTests,
  fetchPublicProviderCatalogRuntime,
  parseBinanceCatalog,
  parseCoinbaseCatalog,
  parseKrakenCatalog,
  parseMexcCatalog,
  verifyPublicProviderCatalogRuntime,
} from '../../lib/market-integrity/pass35-public-provider-catalog-runtime.mjs';

let checks=0; const check=(value,message)=>{checks+=1;assert.ok(value,message);};
const now=new Date('2026-07-22T22:30:00.000Z');
const assets=Array.from({length:320},(_,i)=>`A${String(i+1).padStart(4,'0')}`);
const binancePayload={symbols:assets.map((base,i)=>({symbol:`${base}USDT`,baseAsset:base,quoteAsset:'USDT',status:i%37===0?'BREAK':'TRADING',isSpotTradingAllowed:true,permissions:['SPOT']}))};
const mexcPayload={symbols:assets.slice(40).map((base,i)=>({symbol:`${base}USDT`,baseAsset:base,quoteAsset:'USDT',status:i%41===0?'2':'1',isSpotTradingAllowed:true,quoteOrderQtyMarketAllowed:true}))};
const coinbasePayload=assets.slice(80).map((base,i)=>({id:`${base}-USD`,base_currency:base,quote_currency:'USD',status:'online',trading_disabled:i%43===0,cancel_only:false}));
const krakenPayload={error:[],result:Object.fromEntries(assets.slice(120).map((base,i)=>[`X${base}ZUSD`,{altname:`${base}USD`,wsname:`${base}/USD`,base:`X${base}`,quote:'ZUSD',status:i%47===0?'maintenance':'online'}]))};
check(parseBinanceCatalog(binancePayload).length===320,'binance parser count');
check(parseMexcCatalog(mexcPayload).length===280,'mexc parser count');
check(parseCoinbaseCatalog(coinbasePayload).length===240,'coinbase parser count');
check(parseKrakenCatalog(krakenPayload).length===200,'kraken parser count');
assert.throws(()=>parseBinanceCatalog({}),/symbols_missing/u);checks+=1;
assert.throws(()=>parseMexcCatalog({}),/symbols_missing/u);checks+=1;
assert.throws(()=>parseCoinbaseCatalog({}),/products_missing/u);checks+=1;
assert.throws(()=>parseKrakenCatalog({error:['bad']}),/catalog_error/u);checks+=1;

let calls=0; let binanceAttempt=0;
const fixtureFetch=async(input)=>{
  calls+=1; const url=new URL(String(input));
  if(url.hostname==='api.binance.com'){
    binanceAttempt+=1;
    if(binanceAttempt===1)return new Response(JSON.stringify({error:'temporary'}),{status:503,headers:{'content-type':'application/json'}});
    return new Response(JSON.stringify(binancePayload),{status:200,headers:{'content-type':'application/json'}});
  }
  if(url.hostname==='api.mexc.com')return new Response(JSON.stringify(mexcPayload),{status:200,headers:{'content-type':'application/json'}});
  if(url.hostname==='api.exchange.coinbase.com')return new Response(JSON.stringify(coinbasePayload),{status:200,headers:{'content-type':'application/json'}});
  if(url.hostname==='api.kraken.com')return new Response(JSON.stringify(krakenPayload),{status:200,headers:{'content-type':'application/json'}});
  return new Response('{}',{status:404});
};
clearPublicProviderCatalogRuntimeForTests();
const runtime=await fetchPublicProviderCatalogRuntime({fetchImpl:fixtureFetch,now,bypassCache:true,policy:{retryBaseDelayMs:0,retryMaxDelayMs:0,quotaLimit:20}});
check(verifyPublicProviderCatalogRuntime(runtime),'runtime verify');
check(runtime.executionMode==='INJECTED_FIXTURE'&&!runtime.liveClaimed&&!runtime.realPublicCatalogExecution,'fixture truth');
check(runtime.providerCount===4&&runtime.successfulProviderCount===4,'provider count');
check(runtime.receipts.find((r)=>r.providerId==='binance').attemptCount===2,'retry count');
check(runtime.activeAssetCount>=300&&runtime.activeListingCount>900,'whole catalog denominator');
check(runtime.denominator.assets.some((row)=>row.providerIds.length===4),'multi-provider normalized asset');
check(runtime.denominator.excludedListingCount>0,'halted excluded');
check(runtime.receipts.every((r)=>r.state==='OK'&&r.snapshotDigest),'receipts');
check(runtime.sellEnabled===false&&!runtime.paidDeliveryEligible,'billing lock');

const beforeCacheCalls=calls;
const cacheFirst=await fetchPublicProviderCatalogRuntime({fetchImpl:fixtureFetch,now:new Date(now.getTime()+1),policy:{quotaLimit:20}});
const cacheSecond=await fetchPublicProviderCatalogRuntime({fetchImpl:fixtureFetch,now:new Date(now.getTime()+2),policy:{quotaLimit:20}});
check(cacheFirst.cacheState==='miss'||cacheFirst.cacheState==='hit','cache first state');
check(cacheSecond.cacheState==='hit','cache hit');
check(calls-beforeCacheCalls<=4,'cache reduced calls');
check(verifyPublicProviderCatalogRuntime(cacheSecond),'cache integrity');

clearPublicProviderCatalogRuntimeForTests();
let releaseFetch;
const gate=new Promise((resolve)=>{releaseFetch=resolve;});
let inflightCalls=0;
const slowFetch=async(input)=>{inflightCalls+=1;await gate;return fixtureFetch(input);};
const p1=fetchPublicProviderCatalogRuntime({fetchImpl:slowFetch,now,policy:{retryBaseDelayMs:0,retryMaxDelayMs:0,quotaLimit:20}});
const p2=fetchPublicProviderCatalogRuntime({fetchImpl:slowFetch,now,policy:{retryBaseDelayMs:0,retryMaxDelayMs:0,quotaLimit:20}});
releaseFetch();
const [r1,r2]=await Promise.all([p1,p2]);
check(r1.cacheState==='miss','inflight first');
check(r2.cacheState==='shared_inflight','shared inflight');
check(inflightCalls<=5,'inflight dedupe');

clearPublicProviderCatalogRuntimeForTests();
const badFetch=async(input)=>{
  const url=new URL(String(input));
  if(url.hostname==='api.mexc.com')return new Response(JSON.stringify({unexpected:true}),{status:200});
  return fixtureFetch(input);
};
const degraded=await fetchPublicProviderCatalogRuntime({fetchImpl:badFetch,now,bypassCache:true,policy:{retryBaseDelayMs:0,retryMaxDelayMs:0,quotaLimit:20}});
check(verifyPublicProviderCatalogRuntime(degraded),'degraded verify');
check(degraded.successfulProviderCount===3&&degraded.blockers.some((x)=>x.startsWith('mexc:')),'schema failure contained');
check(degraded.denominator.providerDenominator===4,'failed provider retained denominator identity');
check(!degraded.liveClaimed,'degraded no live');

const tampered=structuredClone(runtime);tampered.activeAssetCount=1;check(!verifyPublicProviderCatalogRuntime(tampered),'tamper rejected');
const tamperedSnapshot=structuredClone(runtime);tamperedSnapshot.snapshots[0].instruments[0].symbol='FAKE';check(!verifyPublicProviderCatalogRuntime(tamperedSnapshot),'snapshot tamper rejected');

clearPublicProviderCatalogRuntimeForTests();
const limited1=await fetchPublicProviderCatalogRuntime({fetchImpl:fixtureFetch,now,bypassCache:true,providers:['binance'],policy:{quotaLimit:1,quotaWindowMs:60_000,retryBaseDelayMs:0,retryMaxDelayMs:0}});
const limited2=await fetchPublicProviderCatalogRuntime({fetchImpl:fixtureFetch,now:new Date(now.getTime()+1),bypassCache:true,providers:['binance'],policy:{quotaLimit:1,quotaWindowMs:60_000,retryBaseDelayMs:0,retryMaxDelayMs:0}});
check(limited1.receipts[0].state==='OK','first budget');
check(limited2.receipts[0].state==='RATE_LIMITED','rate limit fail closed');
check(limited2.activeAssetCount===0&&!limited2.liveClaimed,'rate limited no catalog claim');

console.log(JSON.stringify({status:'PASS_A12_PUBLIC_PROVIDER_CATALOG_RUNTIME',checks,providerCount:runtime.providerCount,activeAssets:runtime.activeAssetCount,activeListings:runtime.activeListingCount,excludedListings:runtime.denominator.excludedListingCount,retryProven:true,cacheProven:true,sharedInflightProven:true,rateLimitProven:true,schemaQuarantineProven:true,visualChangesMade:false,paidDeliveryEligible:false,liveClaimed:false},null,2));
