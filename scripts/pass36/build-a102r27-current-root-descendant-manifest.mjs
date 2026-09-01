#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {REV,PARENT,MANIFEST,PARENT_MANIFEST,STATE,RECEIPT,sha256,canonicalJson,readJson,collect,payload} from './a102r27-source-boundary.mjs';

const root=process.cwd();
const state=readJson(root,STATE);
const parent=readJson(root,PARENT_MANIFEST);
const receipt=readJson(root,RECEIPT);
if(state.revisionId!==REV||state.parentRevisionId!==PARENT)throw new Error('a102r27_state_identity');
if(parent.revisionId!==PARENT||!parent.manifestDigestSha256)throw new Error('a102r27_parent_manifest_identity');
if(receipt.revisionId!==REV||receipt.status!=='PASS_A102R27_LOCAL_REGRESSION_ACTION_REQUIRED_NO_PROMOTION')throw new Error('a102r27_receipt_identity');
const inventory=collect(root);
if(inventory.rejected.length)throw new Error(`a102r27_rejected:${JSON.stringify(inventory.rejected)}`);
const claims={};
for(let i=90;i<=116;i++)claims[`a${i}PassCredit`]=false;
Object.assign(claims,{
  exactA77R1ToA80R1Credit:false,
  freshExactBuildBrowserCredit:false,
  a102r27BoundaryChecks:20,
  providerSymbolRequestAuthority:true,
  providerVenueCacheIdentity:true,
  displaySymbolFallbackOnly:true,
  aliasCacheCollisions:0,
  productionSyntheticChartCredit:false,
  planningMinimum:2,
  planningMostLikely:4,
  planningWithRevisions:11,
  formalRemainingEntries:31,
  realBrowserRows:0,
  realProviderRightsApproved:0,
  realObservationRuns:0,
  stagingCredit:false,
  exactBuildBrowserCredit:false,
  liveProven:false,
  saleEnabled:false,
  productionApproved:false,
  worldClassProven:false,
});
const output={
  schemaVersion:'velmere.pass36.a102r27.current-root-descendant-manifest.v1',
  revisionId:REV,
  parentRevisionId:PARENT,
  parentDescendantManifestDigestSha256:parent.manifestDigestSha256,
  generatedAt:'2026-07-31T00:19:00.000Z',
  checkpointClass:'ACTION_REQUIRED_NON_PASS',
  completedThrough:89,
  coveredWorkRange:'A90-A102_ASSET_DETAIL_PROVIDER_SYMBOL_VENUE_CACHE_AND_REQUEST_IDENTITY_COLLISION_RECOVERY_NO_FORMAL_PASS_CREDIT',
  payload:payload(inventory.rows),
  localRegressionReceiptSha256:sha256(fs.readFileSync(path.join(root,RECEIPT))),
  claims,
  denominators:state.denominators??state.realDenominators,
  skuDecisions:state.skuDecisions,
};
output.manifestDigestSha256=sha256(canonicalJson(output));
fs.writeFileSync(path.join(root,MANIFEST),JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({status:'BUILT_A102R27_DESCENDANT_ACTION_REQUIRED_NO_PROMOTION',payload:output.payload,manifestDigestSha256:output.manifestDigestSha256},null,2));
