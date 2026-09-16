import test from 'node:test';
import assert from 'node:assert/strict';
import { loadSource } from './vm-source.mjs';
import { resolveCoinGeckoRequestConfig } from '../../lib/market-integrity/coingecko-runtime-config.ts';

const fixedNow = '2026-09-16T10:00:00.000Z';
const payload = {id:'bitcoin',symbol:'btc',name:'Bitcoin',current_price:60000,last_updated:fixedNow};
function withheldRow(id='bitcoin', symbol='BTC') {
  return {id,symbol,name:id,price:60000,sparkline7d:[],observedAt:fixedNow,result:{marketId:id,symbol,score:null,confidence:undefined,dataQuality:'partial',dataSources:[],providerRiskDelivery:{state:'withheld',scorePublished:false,sourceAsOf:fixedNow,completenessBps:0},providerReceipts:[{providerId:'binance',observedAt:fixedNow}]}};
}
async function coinModule({coins=[payload], suggestions=[], failPrimary=false, fallbackRows=[], env={}}={}) {
  const calls=[]; let createdReceipts=0;
  const {exports} = await loadSource('lib/market-integrity/coingecko.ts', {
    './coingecko-runtime-config': {resolveCoinGeckoRequestConfig},
    '@/lib/network/fetch-with-deadline': {readJsonResponseBounded: r=>r.json()},
    '@/lib/network/brokered-egress': {brokeredEgressFetch:async (url,init)=>{
      calls.push({url,headers:init.headers});
      if (url.includes('/search?')) return Response.json({coins:suggestions});
      if (failPrimary) throw new Error('provider unavailable');
      return Response.json(coins);
    }},
    './risk-engine': {analyzeTokenRisk: input=>({marketId:input.marketId,symbol:input.symbol,score:66,confidence:0.9,dataQuality:'live',dataSources:['coingecko']})},
    './provider-evidence-receipt': {
      attachPass4644ProviderReceipts:(r, receipts)=>{r.providerReceipts=receipts;},
      createPass4644ProviderEvidenceReceipt:r=>{createdReceipts++;return r;},
      pass4644IdentityMatches:()=>true,
      pass4644CanonicalReceiptDigest:()=> 'test-receipt-digest',
    },
    './market-row-evidence-payload':{buildMarketRowEvidencePayload:r=>({id:r.id,price:r.price})},
    './market-row-delivery-gate':{applyMarketRowRiskDeliveryFirewall:({row})=>{
      row.result.score=null;row.result.confidence=undefined;row.result.dataQuality='partial';
      row.result.providerRiskDelivery={state:'withheld',scorePublished:false,sourceAsOf:row.observedAt ?? null,completenessBps:0};
    }},
    './binance-market-fallback':{fetchBinanceMarketFallback:async()=>({rows:fallbackRows})},
  },env);
  return {exports,calls,receiptCount:()=>createdReceipts};
}

test('search preserves withheld score rather than restoring a fabricated score', async()=>{
  const m=await coinModule(); const row=await m.exports.searchCoinGeckoMarket('btc');
  assert.equal(row.result.score,null);assert.equal(row.result.providerRiskDelivery.scorePublished,false);
  assert.equal(row.result.dataQuality,'partial');assert.equal(row.result.providerRiskDelivery.completenessBps,0);
});
test('search does not mint a second provider receipt or reset source time',async()=>{
  const m=await coinModule();const row=await m.exports.searchCoinGeckoMarket('btc');
  assert.equal(m.receiptCount(),1);assert.equal(row.result.providerRiskDelivery.sourceAsOf,fixedNow);
});
test('fallback retains Binance provenance without adding a CoinGecko receipt',async()=>{
  const m=await coinModule({failPrimary:true,fallbackRows:[withheldRow()]});
  const row=await m.exports.searchCoinGeckoMarket('btc');
  assert.equal(m.receiptCount(),0);assert.equal(row.result.providerReceipts[0].providerId,'binance');
  assert.equal(row.result.score,null);
});
test('same ticker with a different market ID cannot substitute for requested identity',async()=>{
  const m=await coinModule({failPrimary:true,fallbackRows:[withheldRow('lookalike-bitcoin','BTC')]});
  assert.equal(await m.exports.searchCoinGeckoMarket('btc'),null);
});
test('primary provider returning the wrong ID fails closed',async()=>{
  const m=await coinModule({coins:[{...payload,id:'wrong-bitcoin'}]});
  assert.equal(await m.exports.searchCoinGeckoMarket('btc'),null);
});
test('duplicate primary identities fail closed instead of selecting first row',async()=>{
  const m=await coinModule({coins:[payload,payload]});assert.equal(await m.exports.searchCoinGeckoMarket('btc'),null);
});
test('fuzzy search suggestions are not an identity match',async()=>{
  const m=await coinModule({suggestions:[{id:'bitcoin',symbol:'BTC',name:'Bitcoin'}]});
  assert.equal(await m.exports.searchCoinGeckoMarket('bit'),null);
});
test('duplicate exact tickers are ambiguous rather than first-hit matches',async()=>{
  const m=await coinModule({suggestions:[{id:'one',symbol:'ABC',name:'One'},{id:'two',symbol:'ABC',name:'Two'}]});
  assert.equal(await m.exports.searchCoinGeckoMarket('abc'),null);
});
for (const [query,id] of [['wbtc','wrapped-bitcoin'],['weth','weth'],['wbnb','wbnb']]) {
  test(`${query} must not resolve to its native underlying asset`,async()=>{
    const m=await coinModule({coins:[{...payload,id,symbol:query}]});await m.exports.searchCoinGeckoMarket(query);
    assert.equal(new URL(m.calls[0].url).searchParams.get('ids'),id);
  });
}
test('paid key uses Pro host and never transmits Demo and Pro keys together',async()=>{
  const m=await coinModule({env:{COINGECKO_PRO_API_KEY:'qa-pro',COINGECKO_DEMO_API_KEY:'qa-demo'}});
  await m.exports.searchCoinGeckoMarket('btc');
  assert.equal(new URL(m.calls[0].url).hostname,'pro-api.coingecko.com');
  assert.equal(m.calls[0].headers['x-cg-pro-api-key'],'qa-pro');
  assert.equal(m.calls[0].headers['x-cg-demo-api-key'],undefined);
  assert.equal(m.calls[0].url.includes('qa-pro'),false);
});
test('demo key uses public host and only Demo header',async()=>{
  const m=await coinModule({env:{COINGECKO_DEMO_API_KEY:'qa-demo'}});await m.exports.searchCoinGeckoMarket('btc');
  assert.equal(new URL(m.calls[0].url).hostname,'api.coingecko.com');assert.equal(m.calls[0].headers['x-cg-demo-api-key'],'qa-demo');
  assert.equal(m.calls[0].headers['x-cg-pro-api-key'],undefined);
});
for(const query of ['BTC','ETH','SOL','USDT']) {
  test(`missing ${query} provider result cannot turn hardcoded prices into live evidence`,async()=>{
    const {exports}=await loadSource('lib/server/market-integrity-route-modules/investigator.ts',{
      '@/lib/market-integrity/coingecko':{searchCoinGeckoMarket:async()=>null},
      '@/lib/market-integrity/dexscreener':{analyzeDexScreenerToken:async()=>null},
      '@/lib/market-integrity/shield-map-query-boundary':{verifyShieldMapResolvedIdentity:()=>({ok:true})},
      '@/lib/market-integrity/risk-engine':{analyzeTokenRisk:()=>({score:42})},
      '@/lib/market-integrity/provider-evidence-receipt':{createPass4644ProviderEvidenceReceipt:x=>x,attachPass4644ProviderReceipts:()=>{},pass4644CanonicalReceiptDigest:()=> 'fake'},
    });
    const result=await exports.resolveShieldMapResult({query:{namespace:'symbol_or_market',query,locale:'en'}});
    assert.equal(result.ok,false);assert.equal(result.code,'shield_map_identity_missing');
  });
}
test('address provider exception returns a controlled failure',async()=>{
  const {exports}=await loadSource('lib/server/market-integrity-route-modules/investigator.ts',{
    '@/lib/market-integrity/coingecko':{searchCoinGeckoMarket:async()=>null},
    '@/lib/market-integrity/dexscreener':{analyzeDexScreenerToken:async()=>{throw new Error('sensitive-upstream-detail');}},
  });
  const result=await exports.resolveShieldMapResult({query:{namespace:'address',query:'0x01',locale:'en'}});
  assert.equal(result.ok,false);assert.equal(result.code,'shield_map_provider_unavailable');
});

function projectionInputs(state='withheld',score=44) {
  return {row:{id:'bitcoin',symbol:'BTC',name:'Bitcoin',price:123,sparkline7d:[1,2],result:{score,confidence:0.88,aiSummary:'unverified prose',dataSources:['fabricated'],dataQuality:'live'}},
    delivery:{schemaVersion:'fixture',canonicalIdentity:'market:bitcoin',tier:'basic',state,completenessBps:0,fields:{'market.price':{state:'stale',valueAvailable:true}},risk:{state:'stale',score:null,confidencePercent:null},verifiedProviderIds:[],blockers:['stale'],receiptDigest:'fixture'}};
}
for(const state of ['withheld','reference']) {
  test(`${state} delivery cannot expose unverified fields or fallback score`,async()=>{
    const {exports}=await loadSource('lib/market-integrity/market-row-delivery-gate.ts');
    const {row,delivery}=projectionInputs(state);const out=exports.projectMarketRowForDelivery(row,delivery,fixedNow);
    assert.equal(out.price,undefined);assert.equal(out.result.score,null);assert.equal(out.result.confidence,null);
    assert.equal(out.result.aiSummary,undefined);assert.equal(out.result.dataSources.length,0);
  });
}
test('verified individual field may appear without publishing unverified risk',async()=>{
  const {exports}=await loadSource('lib/market-integrity/market-row-delivery-gate.ts');
  const {row,delivery}=projectionInputs();delivery.fields['market.price'].state='verified';
  const out=exports.projectMarketRowForDelivery(row,delivery,fixedNow);assert.equal(out.price,123);assert.equal(out.result.score,null);
});
test('verified delivery preserves verified score but never invents confidence',async()=>{
  const {exports}=await loadSource('lib/market-integrity/market-row-delivery-gate.ts');
  const {row,delivery}=projectionInputs('verified');delivery.risk={state:'verified',score:10,confidencePercent:null};delivery.verifiedProviderIds=['actual-provider'];
  const out=exports.projectMarketRowForDelivery(row,delivery,fixedNow);
  assert.equal(out.result.score,10);assert.equal(out.result.confidence,null);assert.equal(out.result.dataSources[0],'actual-provider');
});
for(const score of [NaN,Infinity,-1,101]) {
  test(`non-finite or out-of-range verified score ${String(score)} is withheld`,async()=>{
    const {exports}=await loadSource('lib/market-integrity/market-row-delivery-gate.ts');const {row,delivery}=projectionInputs('verified');
    delivery.risk={state:'verified',score,confidencePercent:99};
    assert.equal(exports.projectMarketRowForDelivery(row,delivery,fixedNow).result.score,null);
  });
}
