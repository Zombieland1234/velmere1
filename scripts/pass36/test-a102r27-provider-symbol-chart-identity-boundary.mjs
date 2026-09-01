#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
const ROOT=process.cwd();let checks=0;const results=[];const ok=(v,id,d=null)=>{checks++;assert.ok(v,id);results.push({id,passed:true,detail:d})};
const helper=await import(pathToFileURL(path.join(ROOT,"lib/market-integrity/asset-detail-client-helpers.ts")).href+`?r27=${Date.now()}`);
const runtime=await import(pathToFileURL(path.join(ROOT,"components/market-integrity/asset-detail/chart-runtime.ts")).href+`?r27=${Date.now()}`);
const base={symbol:"SAP",providerSymbol:"SAP.DE",name:"SAP",assetClass:"stock",venue:"XETRA",assetClassLabel:"stock",exchangeLabel:"XETRA",priceLabel:"1 EUR",marketDataState:"partial_not_live"};
const alias={...base,providerSymbol:"SAP",venue:"NYSE",exchangeLabel:"NYSE"};
const exact={...base};
const k1=helper.buildPass4408AssetDetailChartCacheKey(base,"15M");const k2=helper.buildPass4408AssetDetailChartCacheKey(alias,"15M");const k3=helper.buildPass4408AssetDetailChartCacheKey(exact,"15M");
ok(k1!==k2,"helper.provider-venue-separates-cache",{k1,k2});ok(k1===k3,"helper.exact-identity-stable");ok(k1.startsWith("v2:"),"helper.versioned-key");
const stockUrl=helper.buildPass4408AssetDetailChartFetchUrl(base,{realMarketsRange:"15m",shieldRange:"15m"});ok(stockUrl.includes("symbols=SAP.DE"),"helper.provider-symbol-stock-url",stockUrl);ok(!stockUrl.includes("symbols=SAP&"),"helper.display-symbol-not-authority");
const crypto={...base,symbol:"BTC",providerSymbol:"BTCUSDT",assetClass:"crypto",assetClassLabel:"crypto",exchangeLabel:"Shield",venue:"Binance"};
const cryptoUrl=helper.buildPass4408AssetDetailChartFetchUrl(crypto,{realMarketsRange:"15m",shieldRange:"15m"});ok(cryptoUrl.includes("symbol=BTCUSDT"),"helper.provider-symbol-crypto-url",cryptoUrl);
ok(runtime.assetDetailChartRuntimeKey(base,"15M")!==runtime.assetDetailChartRuntimeKey(alias,"15M"),"runtime.no-alias-key-collision");ok(runtime.assetDetailChartRuntimeKey(base,"15M")===runtime.assetDetailChartRuntimeKey(exact,"15M"),"runtime.exact-key-stable");
const previousFetch=globalThis.fetch;let calls=[];const candles=Array.from({length:12},(_,i)=>({timestamp:1700000000000+i*60000,open:100+i,high:102+i,low:99+i,close:101+i,volume:1000+i}));
runtime.resetAssetDetailChartRuntimeForTests();globalThis.fetch=async (url)=>{calls.push(String(url));return new Response(JSON.stringify({mode:"live_partial",freshness:"partial_not_live",source:"fixture",generatedAt:"2026-07-31T01:15:00.000Z",candles}),{status:200,headers:{"content-type":"application/json"}})};
try{
 const [a,b]=await Promise.all([runtime.fetchAssetDetailChartRuntime({data:base,timeframe:"15M"}),runtime.fetchAssetDetailChartRuntime({data:exact,timeframe:"15M"})]);ok(calls.length===1,"runtime.exact-identity-dedup",calls);ok(a.candles.length===12&&b.candles.length===12,"runtime.exact-results");
 await runtime.fetchAssetDetailChartRuntime({data:alias,timeframe:"15M"});ok(calls.length===2,"runtime.alias-separate-request",calls);ok(calls[0].includes("SAP.DE")&&calls[1].includes("SAP"),"runtime.request-symbols-exact",calls);
 const before=calls.length;await runtime.fetchAssetDetailChartRuntime({data:base,timeframe:"15M"});ok(calls.length===before,"runtime.cache-exact-only");
 runtime.invalidateAssetDetailChartRuntime(base,"15M");ok(runtime.readAssetDetailChartRuntimeCache(base,"15M")===null,"runtime.invalidate-exact");ok(runtime.readAssetDetailChartRuntimeCache(alias,"15M")!==null,"runtime.invalidate-does-not-cross-alias");
}finally{globalThis.fetch=previousFetch;runtime.resetAssetDetailChartRuntimeForTests()}
const modal=fs.readFileSync(path.join(ROOT,"components/market-integrity/AssetDetailModal.tsx"),"utf8");const helpers=fs.readFileSync(path.join(ROOT,"lib/market-integrity/asset-detail-client-helpers.ts"),"utf8");
ok(modal.includes("data.providerSymbol, data.symbol, data.venue"),"static.identity-effect-dependencies");ok((modal.match(/data\.providerSymbol/g)||[]).length>=3,"static.provider-symbol-tracked");ok(helpers.includes("data.providerSymbol?.trim() || data.symbol.trim()"),"static.provider-symbol-authority");ok(helpers.includes("pass4408IdentityPart(data.venue)"),"static.venue-keyed");ok(helpers.includes("pass4408IdentityPart(data.marketDataState)"),"static-state-keyed");
console.log(JSON.stringify({status:"PASS_A102R27_PROVIDER_SYMBOL_CHART_IDENTITY_NO_PROMOTION",checks,passed:checks,failed:0,providerSymbolRequestAuthority:true,aliasCacheCollisions:0,realBrowserRows:0,exactReleaseCredit:false,globalDecision:"NO_GO",live:false,saleEnabled:false,productionApproved:false,worldClassProven:false,results},null,2));
