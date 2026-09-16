import test from 'node:test';
import assert from 'node:assert/strict';
import { loadSource } from './vm-source.mjs';

const identityPath='lib/market-integrity/customer-report-source-binding.ts';
function receipt(requested, resolved='market:bitcoin', marketId='bitcoin', symbol='BTC') {
  return {targetCanonicalIdentity:'market:bitcoin',requestedCanonicalIdentity:requested,resolvedCanonicalIdentity:resolved,resolvedIdentity:{marketId,symbol}};
}
for (const requested of ['bitcoin','market:bitcoin','BTC','symbol:btc']) {
  test(`market binding accepts matching requested and resolved identity: ${requested}`,async()=>{
    const {exports}=await loadSource(identityPath);
    assert.equal(exports.pass4993SourceReceiptMatchesCanonicalIdentity(receipt(requested),'market:bitcoin'),true);
  });
}
for(const [requested,resolved,marketId] of [['ethereum','market:bitcoin','bitcoin'],['market:ethereum','market:bitcoin','bitcoin'],['bitcoin','market:ethereum','ethereum'],['market:bitcoin','market:bitcoin','ethereum']]) {
  test(`market binding rejects contradictory identities: ${requested}/${resolved}/${marketId}`,async()=>{
    const {exports}=await loadSource(identityPath);
    assert.equal(exports.pass4993SourceReceiptMatchesCanonicalIdentity(receipt(requested,resolved,marketId),'market:bitcoin'),false);
  });
}
for (const fieldOnly of [false,true]) {
  for (const flag of ['dev-header','live-header','dev-query','live-query']) {
    test(`${fieldOnly?'field':'provider'} rights cannot be bypassed by ${flag}`,async()=>{
      let network=0;
      const {exports}=await loadSource('lib/server/market-integrity-route-modules/markets.ts',{
        'next/server':{NextResponse:Response},
        '@/lib/network/brokered-egress':{hasBrokeredEgressTestTransport:()=>false},
        '@/lib/security/api-guard':{applyApiRateLimit:async()=>({ok:true})},
        '@/lib/market-integrity/market-snapshot-cache':{
          isCanonicalMarketSnapshotCoordinates:()=>true,MARKET_SNAPSHOT_MAX_PAGE:100,MARKET_SNAPSHOT_PER_PAGE_BUCKETS:[10,100],
        },
        '@/lib/market-integrity/shield-basic-delivery-policy':{
          buildShieldBasicDeliveryPreflight:()=>({customerDeliveryAllowed:fieldOnly,providerNetworkAllowed:fieldOnly}),
          toShieldBasicCustomerSafeWithheld:()=>({mode:'withheld',rows:[],riskScore:null}),
        },
        '@/lib/market-integrity/real-markets-basic-field-policy':{buildP99RealMarketsBasicDeliveryPreflight:()=>({customerDeliveryAllowed:false,providerNetworkAllowed:false})},
        '@/lib/market-integrity/binance-market-fallback':{fetchBinanceMarketFallback:async()=>{network++;return {rows:[]};}},
        '@/lib/market-integrity/local-development-market-reference':{buildLocalDevelopmentMarketReferenceRows:()=>[]},
      },{NODE_ENV:'production'});
      const url=new URL('https://example.invalid/api/market-integrity/markets?page=1&perPage=10');
      const headers={};
      if(flag.endsWith('header')) headers[`x-velmere-${flag.split('-')[0]}`]='true';
      else url.searchParams.set(flag.split('-')[0],'true');
      const response=await exports.GET(new Request(url,{headers}));
      assert.equal(response.status,503);assert.equal(network,0);
      assert.equal((await response.json()).mode,'withheld');
    });
  }
}
test('investigator GET is exported and rejects wrong method before dependencies',async()=>{
  const {exports}=await loadSource('lib/server/market-integrity-route-modules/investigator.ts',{
    'next/server':{NextResponse:Response},
  });
  assert.equal(typeof exports.GET,'function');
  const response=await exports.GET(new Request('https://example.invalid',{method:'POST'}));
  assert.equal(response.status,405);
});
