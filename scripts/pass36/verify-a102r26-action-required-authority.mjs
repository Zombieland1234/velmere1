#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const REV='VELMERE_PASS36_A102R26_ACTION_REQUIRED_ASSET_DETAIL_CHART_SHARED_CACHE_INFLIGHT_RACE_REFERENCE_REFRESH_AND_NO_FLICKER_RECOVERY_NO_REAL_CREDIT';
const PARENT='VELMERE_PASS36_A102R25_ACTION_REQUIRED_LOCAL_REFERENCE_MARKET_INTELLIGENCE_SHORT_CIRCUIT_WITHHELD_BACKOFF_AND_RETRY_TRUTH_NO_REAL_CREDIT';
const read=(p)=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const checks=[];
const ok=(v,id)=>{assert.ok(v,id);checks.push(id);};

const active=fs.readFileSync(path.join(root,'VELMERE_ACTIVE_PASS.txt'),'utf8').trim();
const pkg=read('package.json');
const auth=read('config/pass36/current-release-authority.json');
const cur=read('config/pass35/current-revision.json');
const rel=read('config/current-release.json');
const state=read('config/pass36/a102r26-action-required-current-state.json');
const program=read('config/pass36/a102r26-world-class-completion-program.json');
const a58=read('config/pass36/a58-release-integrity-policy.json');

ok(active===REV,'active');
ok(pkg.velmerePass===REV,'package');
ok(pkg.velmere?.currentRevisionId===REV,'package_nested');
ok(pkg.velmereCurrentReleaseAuthorityPass===REV,'package_authority');
ok(pkg.velmereWorldClassCompletionProgramPass===REV,'package_program');
ok(auth.authorityRevisionId===REV,'authority');
ok(auth.parentRevisionId===PARENT,'authority_parent');
ok(auth.currentSource?.revisionId===REV,'source');
ok(auth.claims?.currentRevisionId===REV,'claims');
ok(cur.sourceRevisionId===REV,'current_revision');
ok(rel.authoritativeCurrentSourceRevisionId===REV,'current_release');
ok(state.revisionId===REV&&state.parentRevisionId===PARENT,'state');
ok(program.revisionId===REV&&program.parentRevisionId===PARENT,'program');
ok(a58.currentCheckpointRevisionId===REV&&a58.currentCheckpointParentRevisionId===PARENT,'a58');
ok(auth.claims?.decision==='NO_GO','no_go');
ok(auth.claims?.liveProven===false,'no_live');
ok(auth.claims?.saleEnabled===false,'no_sale');
ok(auth.claims?.productionApproved===false,'no_production');
ok(auth.claims?.worldClassProven===false,'no_world_class');
ok(auth.claims?.a102r26BoundaryChecks===33,'boundary');
ok(auth.claims?.a102r26ParallelConsumersNetworkRequests===1,'parallel_request_dedup');
ok(auth.claims?.a102r26ReferenceCacheTtlMs===300000,'reference_ttl');
ok(auth.claims?.a102r26LiveCacheTtlMs===12000,'live_ttl');
ok(auth.claims?.a102r26ChartCacheEntryLimit===96,'cache_limit');
ok(auth.claims?.a102r26LocalReferenceAutoRefresh===false,'reference_no_refresh');
ok(auth.claims?.a102r26LastKnownGoodAutoRefresh===false,'last_known_no_refresh');
ok(auth.claims?.a102r26RefreshKeepsExistingCandles===true,'refresh_keeps_chart');
ok(auth.claims?.a102r26FullChartLoaderDuringRefresh===false,'no_full_refresh_loader');
ok(auth.claims?.a102r26UndeclaredRemoteModeReadsRemaining===0,'remote_mode_drift_closed');
ok(auth.claims?.a102r26ProductionSyntheticChartCredit===false,'no_synthetic_credit');
ok(auth.claims?.a102r26RealBrowserRows===0,'browser_zero');
ok(auth.claims?.a102r26ExactReleaseCredit===false,'release_false');

const out={
  status:'PASS_A102R26_ACTION_REQUIRED_AUTHORITY_NO_REAL_BUILD_BROWSER_STAGING_RIGHTS_LEGAL_OR_SALE_CREDIT',
  checksPassed:checks.length,
  checksFailed:0,
  revisionId:REV,
  parentRevisionId:PARENT,
  decision:'NO_GO',
  globalDecision:'NO_GO',
  live:false,
  liveProven:false,
  saleEnabled:false,
  productionApproved:false,
  worldClassProven:false,
  failed:0,
};
console.log(JSON.stringify(out,null,2));
