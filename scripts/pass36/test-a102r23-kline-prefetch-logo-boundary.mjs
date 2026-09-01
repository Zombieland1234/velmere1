#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT=process.cwd();
const REV='VELMERE_PASS36_A102R23_ACTION_REQUIRED_KLINE_MODE_LOCAL_REFERENCE_DETAIL_ICON_REQUEST_AND_DEV_PREFETCH_STORM_RECOVERY_NO_REAL_CREDIT';
const PARENT='VELMERE_PASS36_A102R22_ACTION_REQUIRED_LOCAL_DEV_RUNTIME_DATA_REFERENCE_ICON_AND_CONTINUOUS_ROUTE_TRANSITION_RECOVERY_NO_REAL_CREDIT';
let checks=0; const rows=[];
function ok(value,id,details){checks+=1;assert.ok(value,id);rows.push({id,passed:true,...(details===undefined?{}:{details})});}
const text=(p)=>fs.readFileSync(path.join(ROOT,p),'utf8');
const json=(p)=>JSON.parse(text(p));

const active=text('VELMERE_ACTIVE_PASS.txt').trim();
const pkg=json('package.json');
const auth=json('config/pass36/current-release-authority.json');
const a58=json('config/pass36/a58-release-integrity-policy.json');
ok(active===REV,'identity.active');
ok(pkg.velmerePass===REV,'identity.package');
ok(pkg.velmere?.currentRevisionId===REV,'identity.package-nested');
ok(pkg.velmere?.currentRevisionParentId===PARENT,'identity.parent');
ok(auth.authorityRevisionId===REV,'identity.authority');
ok(auth.parentRevisionId===PARENT,'identity.authority-parent');
ok(auth.claims?.decision==='NO_GO','truth.no-go');
ok(auth.claims?.liveProven===false,'truth.live-false');
ok(auth.claims?.saleEnabled===false,'truth.sale-false');
ok(auth.claims?.productionApproved===false,'truth.production-false');
ok(auth.claims?.worldClassProven===false,'truth.worldclass-false');

process.env.NODE_ENV='development';
const refUrl=pathToFileURL(path.join(ROOT,'lib/market-integrity/local-development-market-reference.ts')).href+`?r23=${Date.now()}`;
const reference=await import(refUrl);
const identity={assetClass:'crypto',marketId:'local-reference-btc',symbol:'BTC',quote:'USD',chainId:null,address:null};
const localKline=reference.buildLocalDevelopmentKlineReference({identity,range:'1h'});
ok(localKline?.mode==='local_reference','kline.dev-mode');
ok(localKline?.freshness==='local_reference_not_live','kline.dev-freshness');
ok(localKline?.candles?.length===180,'kline.dev-bars',localKline?.candles?.length);
ok(localKline?.verification?.liveClaimAllowed===false,'kline.dev-live-withheld');
ok(localKline?.delivery?.state==='withheld','kline.dev-delivery-withheld');
ok(localKline?.delivery?.scorePublished===false,'kline.dev-score-withheld');
ok(localKline?.delivery?.blockers?.includes('provider_rights_not_verified'),'kline.dev-rights-blocker');
ok(localKline?.generatedAt==='2026-07-30T00:00:00.000Z','kline.dev-fixed-time');
ok(localKline?.candles?.every((c)=>Number.isFinite(c.timestamp)&&c.open>0&&c.high>=Math.max(c.open,c.close)&&c.low<=Math.min(c.open,c.close)&&c.volume>=0),'kline.dev-candles-valid');
ok(reference.buildLocalDevelopmentKlineReference({...{identity:{...identity,marketId:'bitcoin'},range:'1h'}})===null,'kline.dev-exact-local-id-only');
process.env.NODE_ENV='production';
ok(reference.buildLocalDevelopmentKlineReference({identity,range:'1h'})===null,'kline.production-disabled');
process.env.NODE_ENV='development';

const handlerSource=text('lib/market-integrity/kline-route-handler.ts');
ok(handlerSource.includes('buildLocalDevelopmentKlineReference'),'kline.handler-wired');
ok(handlerSource.indexOf('buildLocalDevelopmentKlineReference({ identity: requestedIdentity, range })')<handlerSource.indexOf('resolveIdentity(requestedIdentity)'),'kline.reference-before-provider-resolution');
ok(handlerSource.includes('x-velmere-market-reference'),'kline.reference-header');
ok(handlerSource.includes('cache-control": "no-store'),'kline.no-store');

const client=text('components/market-integrity/ShieldProCleanTerminalClient.tsx');
for(const mode of ['live_verified','live_partial','last_known_good','local_reference']) ok(client.includes(mode),`client.mode-${mode}`);
ok(client.includes('normalizedMode'),'client.mode-normalization');
ok(client.includes('chartMode === "reference"'),'client.reference-render');
ok(client.includes('DANE ILUSTRACYJNE · NIE LIVE'),'client.pl-reference-label');
ok(client.includes('ILLUSTRATIVE DATA · NOT LIVE'),'client.en-reference-label');
ok(client.includes('ILLUSTRATIVE DATEN · NICHT LIVE'),'client.de-reference-label');
ok(!client.includes('payload.mode === "live" || payload.mode === "stale"'),'client.legacy-mode-bug-removed');

const transition=text('components/ui/VelmereRouteTransition.tsx');
ok(transition.includes('process.env.NODE_ENV !== "production"'),'transition.dev-eager-prewarm-disabled');
ok(transition.includes('saveData'),'transition.save-data-respected');
ok(transition.includes('slow-2g')&&transition.includes('"2g"'),'transition.slow-network-respected');
ok(transition.includes('ROUTE_PREFETCH_INTENT_DELAY_MS'),'transition.intent-debounce');
ok(!transition.includes('coreRoutes.forEach(prefetchInternalRoute)'),'transition.five-route-storm-removed');
ok(transition.includes('document.addEventListener("click", onDocumentClick);'),'transition.click-bubble-phase');
ok(!transition.includes('document.addEventListener("click", onDocumentClick, true);'),'transition.capture-hijack-removed');
ok(transition.includes('ROUTE_TRANSITION_SAFETY_MS = 30_000'),'transition.safety-retained');
ok(transition.includes('pendingAboveFoldImage'),'transition.image-settle-retained');
ok(transition.includes('data-velmere-route-path'),'transition.path-marker-retained');

const logoSource=text('lib/market-integrity/asset-logo-resolver.ts');
ok(logoSource.includes('resolvedImageCandidates.filter'),'logo.dev-filter');
ok(logoSource.includes('!candidate.startsWith("/api/")'),'logo.dev-api-chain-disabled');
const logoUrl=pathToFileURL(path.join(ROOT,'lib/market-integrity/asset-logo-resolver.ts')).href+`?r23=${Date.now()}`;
const logo=await import(logoUrl);
process.env.NODE_ENV='development';
const devLogo=logo.resolveVelmereAssetLogo({symbol:'ZZZZ',name:'Unknown Example',domain:'example.com',assetClass:'stock'});
ok(devLogo.imageCandidates.every((v)=>v.startsWith('/')&&!v.startsWith('/api/')),'logo.dev-local-only',devLogo.imageCandidates);
process.env.NODE_ENV='production';
const prodLogo=logo.resolveVelmereAssetLogo({symbol:'ZZZZ',name:'Unknown Example',domain:'example.com',assetClass:'stock'});
ok(prodLogo.imageCandidates.some((v)=>v.startsWith('/api/')),'logo.production-remote-chain-retained',prodLogo.imageCandidates);
process.env.NODE_ENV='development';

ok(a58.currentCheckpointRevisionId===REV,'a58.current');
ok(a58.currentCheckpointParentRevisionId===PARENT,'a58.parent');
ok(a58.currentDescendantManifestPath==='config/pass36/a102r23-current-root-descendant-manifest.json','a58.descendant');
ok(a58.archiveManifestPath==='_velmere/PASS36_A102R23_SOURCE_ONLY_MANIFEST.json','a58.archive');

const output={schemaVersion:'velmere.pass36.a102r23.kline-prefetch-logo-test-receipt.v1',revisionId:REV,parentRevisionId:PARENT,generatedAt:'2026-07-31T00:17:00.000Z',status:'PASS_A102R23_KLINE_MODE_REFERENCE_DETAIL_ICON_AND_PREFETCH_BOUNDARY_NO_REAL_CREDIT',checksPassed:checks,checksFailed:0,localKlineReferenceBars:localKline?.candles?.length??0,productionKlineReferenceBars:0,realProviderRightsApproved:0,realBrowserRows:0,exactBuildBrowserCredit:false,liveProven:false,saleEnabled:false,productionApproved:false,worldClassProven:false,rows};
fs.writeFileSync(path.join(ROOT,'config/pass36/a102r23-test-receipt.json'),JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify(output,null,2));
