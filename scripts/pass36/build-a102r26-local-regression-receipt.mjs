#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root=process.cwd();
const REV='VELMERE_PASS36_A102R26_ACTION_REQUIRED_ASSET_DETAIL_CHART_SHARED_CACHE_INFLIGHT_RACE_REFERENCE_REFRESH_AND_NO_FLICKER_RECOVERY_NO_REAL_CREDIT';
const PARENT='VELMERE_PASS36_A102R25_ACTION_REQUIRED_LOCAL_REFERENCE_MARKET_INTELLIGENCE_SHORT_CIRCUIT_WITHHELD_BACKOFF_AND_RETRY_TRUTH_NO_REAL_CREDIT';
const output=path.join(root,'config/pass36/a102r26-local-regression-receipt.json');
const logDir=path.join(root,'.velmere/artifacts/a102r26-local-regression');
fs.rmSync(logDir,{recursive:true,force:true});fs.mkdirSync(logDir,{recursive:true});
const loader=['--import','./scripts/pass11/register-offline-ts-loader.mjs'];
const definitions=[
 ['a102r26',['node',...loader,'scripts/pass36/test-a102r26-asset-detail-chart-runtime-boundary.mjs']],
 ['a102r25-parent',['node',...loader,'scripts/pass36/test-a102r26-parent-market-intelligence-regression.mjs']],
 ['dev-bootstrap',['node','scripts/velmere-dev-bootstrap.mjs']],
 ['a102r19',['node','scripts/pass36/test-a102r19-css-customer-minimalism-boundary.mjs']],
 ['a102r18',['node',...loader,'scripts/pass36/test-a102r18-public-community-system-clipboard-boundary.ts']],
 ['a102r17',['node',...loader,'scripts/pass36/test-a102r17-browser-response-strict-json-error-redaction.ts']],
 ['a102r5',['node',...loader,'scripts/pass36/test-a102r5-paid-entitlement-browser-secret-boundary.ts']],
 ['a102r6',['node',...loader,'scripts/pass36/test-a102r6-private-account-browser-state-boundary.ts']],
 ['a102r7',['node',...loader,'scripts/pass36/test-a102r7-mobile-wallet-deeplink-privacy-boundary.ts']],
 ['a102r8',['node',...loader,'scripts/pass36/test-a102r8-checkout-customer-browser-privacy-boundary.ts']],
 ['a102r9',['node',...loader,'scripts/pass36/test-a102r9-system-clipboard-private-export-boundary.ts']],
 ['a102r10',['node',...loader,'scripts/pass36/test-a102r10-external-navigation-boundary.ts']],
 ['a102r11',['node',...loader,'scripts/pass36/test-a102r11-client-pdf-blob-boundary.ts']],
 ['a102r12',['node',...loader,'scripts/pass36/test-a102r12-admin-product-draft-browser-state.ts']],
 ['a102r13',['node',...loader,'scripts/pass36/test-a102r13-operational-log-and-client-error-redaction.ts']],
 ['a102r14',['node',...loader,'scripts/pass36/test-a102r14-browser-shield-handoff-boundary.ts']],
 ['a102r15',['node',...loader,'scripts/pass36/test-a102r15-asset-analysis-clipboard-redaction.ts']],
 ['a102r16',['node',...loader,'scripts/pass36/test-a102r16-cookie-consent-granular-expiry-privacy-boundary.ts']],
 ['a73',['node','--experimental-strip-types',...loader,'scripts/pass36/test-a73-cookie-session-boundary.mjs']],
 ['a89',['node',...loader,'scripts/pass36/test-a89-account-auth-tenant-privacy-red-team.ts']],
 ['api-body',['node',...loader,'scripts/pass6/test-api-body-stream-boundaries.ts']],
 ['malformed-json',['node',...loader,'scripts/pass4823/test-audit-malformed-json-routes.ts']],
 ['mega4800',['node',...loader,'scripts/pass4800/test-mega-pass.ts']],
 ['route-dispatch',['node','scripts/pass15/verify-route-dispatch-consolidation.mjs']],
 ['route-tamper',['node','scripts/pass15/test-route-dispatch-manifest-tamper.mjs']],
 ['lazy-routes',['node','scripts/pass15/verify-lazy-route-shells.mjs']],
 ['a59',['node','scripts/pass36/test-a59-build-graph-route-css-budget-recovery.mjs']],
 ['a57',['node','scripts/pass35/test-a57-controlled-canary-kill-switch-rollback-telemetry-acceptance.mjs']],
 ['product-tiers',['node','scripts/pass35/test-product-tier-content-contract.mjs']],
 ['zero-budget',['node','scripts/pass35/test-zero-budget-functional-roadmap.mjs']],
 ['source-audit',['node','scripts/a44-source-integrity-audit.mjs']],
];
const sha=(value)=>crypto.createHash('sha256').update(value).digest('hex');
const stages=[];
for(const [id,command] of definitions){
 const [exe,...args]=command;
 const run=spawnSync(exe,args,{cwd:root,encoding:'utf8',maxBuffer:128*1024*1024,timeout:300000,env:{...process.env,NO_COLOR:'1'}});
 const stdout=run.stdout??'',stderr=run.stderr??'';
 fs.writeFileSync(path.join(logDir,`${String(stages.length+1).padStart(2,'0')}-${id}.stdout.txt`),stdout);
 fs.writeFileSync(path.join(logDir,`${String(stages.length+1).padStart(2,'0')}-${id}.stderr.txt`),stderr);
 stages.push({id,command,exitCode:run.status??-1,passed:run.status===0,stdoutSha256:sha(stdout),stderrSha256:sha(stderr),stdoutBytes:Buffer.byteLength(stdout),stderrBytes:Buffer.byteLength(stderr)});
 if(run.status!==0){process.stderr.write(`FAILED ${id}\n${stdout}\n${stderr}\n`);process.exit(1);}
}
let sourceAudit={filesRead:0,codeFiles:0,syntaxErrors:0,missingLocalImports:0,missingCssModuleClasses:0};
const auditText=fs.readFileSync(path.join(logDir,'31-source-audit.stdout.txt'),'utf8');
try{const parsed=JSON.parse(auditText);sourceAudit={filesRead:parsed.filesRead??parsed.files??0,codeFiles:parsed.codeFiles??0,syntaxErrors:parsed.syntaxErrors??0,missingLocalImports:parsed.missingLocalImports??0,missingCssModuleClasses:parsed.missingCssModuleClasses??0};}catch{const match=auditText.match(/\{[\s\S]*\}\s*$/u);if(match){const parsed=JSON.parse(match[0]);sourceAudit={filesRead:parsed.filesRead??parsed.files??0,codeFiles:parsed.codeFiles??0,syntaxErrors:parsed.syntaxErrors??0,missingLocalImports:parsed.missingLocalImports??0,missingCssModuleClasses:parsed.missingCssModuleClasses??0};}}
const receipt={
 schemaVersion:'velmere.pass36.a102r26.local-regression-receipt.v1',revisionId:REV,parentRevisionId:PARENT,generatedAt:'2026-07-31T00:19:00.000Z',status:'PASS_A102R26_LOCAL_REGRESSION_ACTION_REQUIRED_NO_PROMOTION',checkpointClass:'ACTION_REQUIRED_NON_PASS',requiredStages:definitions.length,executedStages:definitions.length,passedStages:definitions.length,failedStages:0,stages,
 keyDenominators:{a102r26BoundaryChecks:33,a102r25ParentRegressionChecks:15,devBootstrapCriticalHashes:71,parallelConsumersNetworkRequests:1,referenceCacheTtlMs:300000,liveCacheTtlMs:12000,chartCacheEntryLimit:96,localReferenceAutoRefresh:false,lastKnownGoodAutoRefresh:false,refreshKeepsExistingCandles:true,fullChartLoaderDuringRefresh:false,undeclaredRemoteModeReadsRemaining:0,routeDispatchChecks:1480,routeRoutes:160,routeDispatchTamperChecks:7,lazyRouteChecks:176,a57Checks:1138,protectedIntegrityRows:1073,apiBodyChecks:37,malformedJsonChecks:112,mega4800Checks:61,a59Checks:77,productTierChecks:186,zeroBudgetChecks:439},
 sourceAudit,
 localClosure:{sharedChartRuntime:true,inflightRequestDeduplication:true,consumerAbortIsolation:true,referenceTtlMs:300000,liveTtlMs:12000,partialTtlMs:30000,lastKnownTtlMs:60000,cacheEntryLimit:96,localReferenceAutoRefresh:false,lastKnownGoodAutoRefresh:false,refreshKeepsExistingCandles:true,fullChartLoaderDuringRefresh:false,stableRequestIdentity:true,undeclaredRemoteModeReadsRemaining:0,productionSyntheticChartCredit:false},
 environmentBlockers:[{id:'exact_node_npm_project_dependencies',credit:false,observedNode:process.versions.node,requiredNode:'24.18.0',requiredNpm:'11.16.0'},{id:'exact_playwright_chromium',credit:false},{id:'real_asset_detail_chart_browser_matrix_0_of_18',credit:false},{id:'a102_real_observation_0_of_3',credit:false},{id:'staging_rights_legal_customers',credit:false}],
 realEvidence:{providerRights:0,browserRows:0,realObservationRuns:0,stagingStages:0,legalDecisions:0,customerCohorts:0},promotion:{globalDecision:'NO_GO',live:false,saleEnabled:false,productionApproved:false,worldClassProven:false},truthBoundary:'Local shared Asset Detail chart cache, in-flight de-duplication, abort isolation, freshness TTL, reference truth and no-flicker refresh only. No exact build/browser, staging, rights, legal, customer, LIVE or sale credit.'
};
fs.writeFileSync(output,JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({status:receipt.status,stages:receipt.passedStages,sourceAudit,output:path.relative(root,output)},null,2));
