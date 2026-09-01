#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT=process.cwd();
const REV='VELMERE_PASS36_A102R25_ACTION_REQUIRED_LOCAL_REFERENCE_MARKET_INTELLIGENCE_SHORT_CIRCUIT_WITHHELD_BACKOFF_AND_RETRY_TRUTH_NO_REAL_CREDIT';
const PARENT='VELMERE_PASS36_A102R24_ACTION_REQUIRED_SHARED_CATALOG_REFERENCE_TRUTH_REMOTE_SEARCH_AND_REFRESH_FLICKER_RECOVERY_NO_REAL_CREDIT';
let checks=0;const results=[];
const ok=(v,id,detail=null)=>{checks++;assert.ok(v,id);results.push({id,passed:true,detail});};
const text=(p)=>fs.readFileSync(path.join(ROOT,p),'utf8');
const json=(p)=>JSON.parse(text(p));

const active=text('VELMERE_ACTIVE_PASS.txt').trim();
const pkg=json('package.json');
const auth=json('config/pass36/current-release-authority.json');
ok(active===REV,'identity.active');
ok(pkg.velmerePass===REV,'identity.package');
ok(pkg.velmere?.currentRevisionId===REV,'identity.package-nested');
ok(pkg.velmere?.currentRevisionParentId===PARENT,'identity.parent');
ok(pkg.velmereCurrentReleaseAuthorityPass===REV,'identity.top-level-authority');
ok(pkg.velmereWorldClassCompletionProgramPass===REV,'identity.top-level-program');
ok(pkg.velmereWorldClassCompletionProgramPath==='config/pass36/a102r25-world-class-completion-program.json','identity.top-level-program-path');
ok(pkg.velmereCurrentRootDescendantManifestPath==='config/pass36/a102r25-current-root-descendant-manifest.json','identity.top-level-manifest-path');
ok(auth.authorityRevisionId===REV&&auth.parentRevisionId===PARENT,'identity.authority');
ok(auth.claims?.decision==='NO_GO','truth.no-go');
ok(auth.claims?.liveProven===false,'truth.no-live');
ok(auth.claims?.saleEnabled===false,'truth.no-sale');
ok(auth.claims?.productionApproved===false,'truth.no-production');
ok(auth.claims?.worldClassProven===false,'truth.no-worldclass');

const moduleUrl=pathToFileURL(path.join(ROOT,'components/market-integrity/asset-detail/market-intelligence-client-runtime.ts')).href+`?r25=${Date.now()}`;
const runtime=await import(moduleUrl);
ok(runtime.WITHHELD_CACHE_TTL_MS===30_000,'runtime.withheld-ttl');
ok(typeof runtime.isDevelopmentLocalReferenceAsset==='function','runtime.reference-detector-export');

const previousEnv=process.env.NODE_ENV;
const originalFetch=globalThis.fetch;
try {
  runtime.pass35A37ResetRuntimeForTests();
  process.env.NODE_ENV='development';
  let fetchCalls=0;
  globalThis.fetch=async()=>{fetchCalls++;throw new Error('reference_fetch_must_not_start');};
  const asset={symbol:'BTC',providerSymbol:'BTC',assetClass:'crypto',marketDataState:'local_reference'};
  const first=await runtime.fetchRuntime(asset,'pl','basic',new AbortController().signal);
  const second=await runtime.fetchRuntime(asset,'pl','pro',new AbortController().signal);
  ok(fetchCalls===0,'reference.zero-network-calls',fetchCalls);
  ok(first.mode==='reference'&&second.mode==='reference','reference.mode');
  ok(first.error==='development_reference_market_intelligence_withheld','reference.error-code');
  ok(first.publication?.liveClaimed===false,'reference.no-live-claim');
  ok(first.publication?.evidenceState==='fixture_only','reference.fixture-only');
  ok(first.publication?.blockers?.includes('provider_rights_not_verified'),'reference.rights-blocker');
  ok(!first.marketImpact,'reference.no-market-impact-payload');
  ok(!second.marketImpact,'reference.no-pro-market-impact-payload');
  ok(second.whaleWatch?.available===false&&second.whaleWatch?.locked===true,'reference.whale-locked');
  const snap=runtime.pass35A37RuntimeSnapshot();
  ok(snap.localReferenceShortCircuits===2,'reference.short-circuit-count',snap);
  ok(snap.networkRequestsStarted===0,'reference.network-counter-zero',snap);

  const aborted=new AbortController();aborted.abort();
  await assert.rejects(runtime.fetchRuntime(asset,'en','basic',aborted.signal),(e)=>e instanceof DOMException&&e.name==='AbortError');
  ok(true,'reference.abort-before-short-circuit');

  runtime.pass35A37ResetRuntimeForTests();
  runtime.pass35A40ConfigureRuntimeForTests({nowMs:1_000});
  process.env.NODE_ENV='production';
  fetchCalls=0;
  globalThis.fetch=async()=>{
    fetchCalls++;
    return new Response(JSON.stringify({
      ok:false,mode:'withheld',error:'market_intelligence_publication_not_ready',depth:'basic',surface:'shield',assetKey:'BTC',
      publication:{mode:'withheld',evidenceState:'withheld',liveClaimed:false,blockers:['provider_rights_not_verified']}
    }),{status:424,headers:{'content-type':'application/json','x-velmere-market-intelligence-depth':'basic'}});
  };
  const liveAsset={symbol:'BTC',providerSymbol:'BTC',assetClass:'crypto',marketDataState:'partial_not_live'};
  const withheld1=await runtime.fetchRuntime(liveAsset,'en','basic',new AbortController().signal);
  const withheld2=await runtime.fetchRuntime(liveAsset,'en','basic',new AbortController().signal);
  ok(withheld1.mode==='withheld'&&withheld2.mode==='withheld','withheld.response');
  ok(fetchCalls===1,'withheld.cache-hit-before-ttl',fetchCalls);
  ok(runtime.pass35A37RuntimeSnapshot().withheldCacheEntries===1,'withheld.cache-entry');
  runtime.pass35A40ConfigureRuntimeForTests({nowMs:31_001});
  await runtime.fetchRuntime(liveAsset,'en','basic',new AbortController().signal);
  ok(fetchCalls===2,'withheld.cache-expires-after-ttl',fetchCalls);
  ok(runtime.pass35A37RuntimeSnapshot().networkRequestsStarted===2,'withheld.network-counter',runtime.pass35A37RuntimeSnapshot());
} finally {
  runtime.pass35A37ResetRuntimeForTests();
  globalThis.fetch=originalFetch;
  if(previousEnv===undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV=previousEnv;
}

const contract=text('components/market-integrity/asset-detail/contract.ts');
const modal=text('components/market-integrity/AssetDetailModal.tsx');
const shield=text('components/market-integrity/ShieldRealMarketsParityClient.tsx');
const pro=text('components/market-integrity/ShieldProCleanTerminalClient.tsx');
const tabs=text('components/market-integrity/AssetIntelligenceTabs.tsx');
const client=text('components/market-integrity/asset-detail/market-intelligence-client-runtime.ts');
ok(contract.includes('| "local_reference"'),'static.contract-reference-state');
ok(modal.includes('remote.mode === "local_reference" || remote.freshness === "local_reference_not_live"'),'static.chart-reference-state');
ok(shield.includes('marketDataState: row.result?.dataQuality === "demo" ? "local_reference"'),'static.shield-reference-state');
ok(pro.includes('marketDataState: row.result?.dataQuality === "demo" ? "local_reference"'),'static.shield-pro-reference-state');
ok(client.includes('if (isDevelopmentLocalReferenceAsset(asset))'),'static.short-circuit-before-fetch');
ok(client.indexOf('if (isDevelopmentLocalReferenceAsset(asset))')<client.indexOf('networkRequestsStarted += 1'),'static.short-circuit-order');
ok(client.includes('export const WITHHELD_CACHE_TTL_MS = 30_000'),'static.withheld-backoff');
ok(tabs.includes('status: "idle" | "loading" | "ready" | "reference"'),'static.reference-runtime-state');
ok(tabs.includes('state.status === "reference" ? c.reference'),'static.reference-localized-copy');
ok(tabs.includes('locked && runtime.status !== "reference"'),'static.no-misleading-pro-lock-copy');
ok(!tabs.includes('state.status === "reference") ? <button'),'static.no-reference-retry-pattern');

const state=json('config/pass36/a102r25-action-required-current-state.json');
ok(state.newLocalClosure?.localReferenceMarketIntelligenceNetworkCalls===0,'state.zero-reference-network');
ok(state.newLocalClosure?.withheldCacheTtlMs===30000,'state.withheld-ttl');
ok(state.newLocalClosure?.productionSyntheticMarketIntelligencePackets===0,'state.zero-production-synthetic');
ok(state.planningEstimate?.formalRemainingEntries===31,'state.formal-denominator');

console.log(JSON.stringify({
 status:'PASS_A102R25_LOCAL_REFERENCE_MARKET_INTELLIGENCE_BOUNDARY_NO_PROMOTION',
 revisionId:REV,parentRevisionId:PARENT,checks,passed:checks,failed:0,
 localReferenceNetworkCalls:0,withheldCacheTtlMs:30000,referenceRetryRendered:false,
 productionSyntheticMarketIntelligencePackets:0,realBrowserRows:0,providerRightsApproved:0,
 globalDecision:'NO_GO',live:false,saleEnabled:false,productionApproved:false,worldClassProven:false,results
},null,2));
