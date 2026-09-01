#!/usr/bin/env node
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

let checks=0;
const rows=[];
const ok=(value,id,detail=null)=>{checks+=1;assert.ok(value,id);rows.push({id,passed:true,detail});};
const moduleUrl=pathToFileURL(path.join(process.cwd(),'components/market-integrity/asset-detail/market-intelligence-client-runtime.ts')).href+`?r26parent=${Date.now()}`;
const runtime=await import(moduleUrl);
const previousFetch=globalThis.fetch;
const previousNodeEnv=process.env.NODE_ENV;

try {
  runtime.pass35A37ResetRuntimeForTests();
  process.env.NODE_ENV='development';
  let networkCalls=0;
  globalThis.fetch=async()=>{networkCalls+=1;throw new Error('local_reference_must_not_reach_network');};
  const localAsset={symbol:'BTC',providerSymbol:'BTC',assetClass:'crypto',marketDataState:'local_reference'};
  const local=await runtime.fetchRuntime(localAsset,'pl','pro',new AbortController().signal);
  ok(networkCalls===0,'parent.local-reference-zero-network',networkCalls);
  ok(local.mode==='reference','parent.local-reference-mode',local.mode);
  ok(local.ok===false,'parent.local-reference-not-ok');
  ok(local.publication?.mode==='withheld','parent.local-reference-withheld');
  ok(local.publication?.liveClaimed===false,'parent.local-reference-not-live');
  ok((local.publication?.blockers??[]).includes('provider_rights_not_verified'),'parent.local-reference-rights-blocker');
  ok(local.marketImpact===undefined,'parent.local-reference-no-market-impact');
  ok(local.whaleWatch?.available===false&&local.whaleWatch?.evidenceStatus==='fixture_only','parent.local-reference-no-whale-projection');
  const localSnapshot=runtime.pass35A37RuntimeSnapshot();
  ok(localSnapshot.localReferenceShortCircuits===1,'parent.local-reference-short-circuit-count',localSnapshot);
  ok(localSnapshot.networkRequestsStarted===0,'parent.local-reference-network-counter-zero',localSnapshot);

  runtime.pass35A37ResetRuntimeForTests();
  runtime.pass35A39ConfigureRuntimeForTests({withheldTtlMs:30_000});
  runtime.pass35A40ConfigureRuntimeForTests({nowMs:10_000});
  process.env.NODE_ENV='production';
  networkCalls=0;
  globalThis.fetch=async()=>{
    networkCalls+=1;
    return new Response(JSON.stringify({
      ok:false,
      mode:'withheld',
      error:'provider_rights_not_verified',
      depth:'basic',
      surface:'shield',
      assetKey:'BTC',
      publication:{mode:'withheld',evidenceState:'unavailable',liveClaimed:false,blockers:['provider_rights_not_verified']},
    }),{status:424,headers:{'content-type':'application/json','x-velmere-market-intelligence-depth':'basic'}});
  };
  const productionAsset={symbol:'BTC',providerSymbol:'BTC',assetClass:'crypto',marketDataState:'withheld'};
  const first=await runtime.fetchRuntime(productionAsset,'pl','basic',new AbortController().signal);
  const second=await runtime.fetchRuntime(productionAsset,'pl','basic',new AbortController().signal);
  ok(first.mode==='withheld'&&second.mode==='withheld','parent.withheld-response-retained');
  ok(networkCalls===1,'parent.withheld-cache-zero-repeat-network',networkCalls);
  const snapshot=runtime.pass35A37RuntimeSnapshot();
  ok(snapshot.withheldCacheEntries===1,'parent.withheld-cache-entry',snapshot);
  ok(snapshot.withheldCacheTtlMs===30_000,'parent.withheld-cache-ttl',snapshot);
  ok(snapshot.networkRequestsStarted===1,'parent.withheld-network-counter',snapshot);
} finally {
  runtime.pass35A37ResetRuntimeForTests();
  globalThis.fetch=previousFetch;
  if(previousNodeEnv===undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV=previousNodeEnv;
}

console.log(JSON.stringify({
  status:'PASS_A102R26_PARENT_A102R25_MARKET_INTELLIGENCE_REGRESSION_NO_PROMOTION',
  checksPassed:checks,
  checksFailed:0,
  networkCredit:false,
  providerRightsCredit:false,
  globalDecision:'NO_GO',
  live:false,
  saleEnabled:false,
  results:rows,
},null,2));
