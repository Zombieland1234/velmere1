import test from 'node:test';
import assert from 'node:assert/strict';
import { loadSource } from './vm-source.mjs';

for(const [env,flag] of [['production','header'],['production','query'],['development','none']]) {
  test(`search cannot initiate provider calls without rights: ${env}/${flag}`,async()=>{
    let network=0;
    const {exports}=await loadSource('lib/server/market-integrity-route-modules/search.ts',{
      '@/lib/security/api-abuse-shield':{applyApiAbuseShield:async()=>({ok:true,query:'btc'}),abuseShieldResponseMeta:()=>({})},
      '@/lib/security/api-guard':{securityJson:(body,init)=>Response.json(body,init)},
      '@/lib/market-integrity/shield-basic-delivery-policy':{
        buildShieldBasicDeliveryPreflight:()=>({customerDeliveryAllowed:false,providerNetworkAllowed:false}),
        toShieldBasicCustomerSafeWithheld:()=>({mode:'withheld',suggestions:[]}),
      },
      '@/lib/market-integrity/coingecko':{fetchCoinGeckoSuggestions:async()=>{network++;return [{id:'bitcoin'}];}},
    },{NODE_ENV:env});
    const url='https://example.invalid/api/market-integrity/search?query=btc'+(flag==='query'?'&dev=true':'');
    const response=await exports.GET(new Request(url,{headers:flag==='header'?{'x-velmere-dev':'true'}:{}}));
    assert.equal(response.status,503);assert.equal(network,0);
  });
}
async function intelligence(depth,header,rightsAllowed) {
  let network=0;
  const {exports}=await loadSource('lib/server/market-integrity-route-modules/market-intelligence.ts',{
    '@/lib/security/api-guard':{
      rejectOversizedUrl:()=>null,rejectLargeContentLength:()=>null,assertSameOriginRequest:()=>null,
      applyApiRateLimit:async()=>({ok:true}),securityJson:(body,init)=>Response.json(body,init),
    },
    '@/lib/security/payment-webhook-guard':{readBoundedJsonBody:async()=>({ok:true,value:{assetKey:'BTC',depth,locale:'en',surface:'shield',evidenceMode:'server_owned'},raw:'{}'})},
    '@/lib/market-integrity/vlm-route-analysis':{requireVlmTierAccess:async()=>({})},
    '@/lib/market-integrity/market-impact-delivery-policy':{
      buildMarketImpactDeliveryPreflight:()=>({testOnly:true}),
      projectMarketImpactDelivery:()=>({allowed:rightsAllowed,status:503,payload:{mode:'withheld'}}),
    },
    '@/lib/market-integrity/server-owned-market-intelligence-providers':{fetchServerOwnedMarketImpactEvidence:async()=>{network++;throw new Error('provider call forbidden');}},
    '@/lib/security/api-error-envelope':{publicApiError:()=>Response.json({error:'caught'},{status:422})},
  },{NODE_ENV:'production'});
  const response=await exports.POST(new Request('https://example.invalid/api/market-integrity/market-intelligence',{
    method:'POST',headers:header?{[header]:'true'}:{},body:'{}',
  }));
  return {response,network};
}
for(const depth of ['basic','pro','advanced']) {
  for(const header of ['', 'x-velmere-dev', 'x-velmere-live', 'x-velmere-pro']) {
    test(`paid tier is not a data licence: ${depth}/${header||'no-header'}`,async()=>{
      const {response,network}=await intelligence(depth,header,false);
      assert.equal(response.status,503);assert.equal(network,0);
    });
  }
  test(`even permitted provider access cannot bypass missing publication proof: ${depth}`,async()=>{
    const {response,network}=await intelligence(depth,'x-velmere-pro',true);
    assert.equal(response.status,424);assert.equal(network,0);
    assert.equal((await response.json()).error,'market_intelligence_publication_not_ready');
  });
}
