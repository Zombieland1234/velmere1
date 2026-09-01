#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const REV='VELMERE_PASS36_A102R28_ACTION_REQUIRED_ASSET_DETAIL_ABORTED_INFLIGHT_REOPEN_AND_DEFERRED_IDENTITY_RESET_RACE_RECOVERY_NO_REAL_CREDIT';
const PARENT='VELMERE_PASS36_A102R27_ACTION_REQUIRED_ASSET_DETAIL_PROVIDER_SYMBOL_VENUE_CACHE_AND_REQUEST_IDENTITY_COLLISION_RECOVERY_NO_REAL_CREDIT';
const read=(p)=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const checks=[];
const ok=(v,id)=>{assert.ok(v,id);checks.push(id);};

const active=fs.readFileSync(path.join(root,'VELMERE_ACTIVE_PASS.txt'),'utf8').trim();
const pkg=read('package.json');
const auth=read('config/pass36/current-release-authority.json');
const cur=read('config/pass35/current-revision.json');
const rel=read('config/current-release.json');
const state=read('config/pass36/a102r28-action-required-current-state.json');
const program=read('config/pass36/a102r28-world-class-completion-program.json');
const a58=read('config/pass36/a58-release-integrity-policy.json');

ok(active===REV,'active');
ok(pkg.velmerePass===REV,'package');
ok(pkg.velmere?.currentRevisionId===REV,'package_nested');
ok(pkg.velmereCurrentReleaseAuthorityPass===REV,'package_authority');
ok(pkg.velmereWorldClassCompletionProgramPass===REV,'package_program');
ok(pkg.velmereWorldClassCompletionProgramPath==='config/pass36/a102r28-world-class-completion-program.json','package_program_path');
ok(pkg.velmereCurrentRootDescendantManifestPath==='config/pass36/a102r28-current-root-descendant-manifest.json','package_descendant_path');
ok(pkg.velmerePassMetadata?.currentRevisionId===REV,'package_metadata_revision');
ok(pkg.velmerePassMetadata?.parentRevisionId===PARENT,'package_metadata_parent');
ok(pkg.velmerePatch==='VELMERE_A102R28_PATCH.txt','package_patch');
ok(auth.authorityRevisionId===REV,'authority');
ok(auth.parentRevisionId===PARENT,'authority_parent');
ok(auth.currentSource?.revisionId===REV,'source');
ok(auth.claims?.currentRevisionId===REV,'claims');
ok(auth.claims?.parentRevisionId===PARENT,'claims_parent');
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
ok(auth.claims?.a102r28BoundaryChecks===14,'boundary');
ok(auth.claims?.a102r28RapidReopenStartsFreshRequest===true,'rapid_reopen');
ok(auth.claims?.a102r28AbortedResponseCacheWrites===0,'aborted_cache_writes');
ok(auth.claims?.a102r28DeferredIdentityReset===false,'deferred_reset');
ok(auth.claims?.a102r28OrphanInflightEntriesAfterSettlement===0,'orphan_inflight');
ok(auth.claims?.a102r28RealBrowserRows===0,'browser_zero');
ok(auth.claims?.a102r28ExactReleaseCredit===false,'release_false');

const out={
  status:'PASS_A102R28_ACTION_REQUIRED_AUTHORITY_NO_REAL_BUILD_BROWSER_STAGING_RIGHTS_LEGAL_OR_SALE_CREDIT',
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
