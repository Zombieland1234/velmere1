#!/usr/bin/env node
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { REV, PARENT, MANIFEST, STATE, PROGRAM } from "./a102r4-source-boundary.mjs";
const read=(f)=>JSON.parse(fs.readFileSync(f,"utf8"));
const authority=read("config/pass36/current-release-authority.json");
const mirror=read("config/pass35/current-revision.json");
const legacy=read("config/current-release.json");
const state=read(STATE); const program=read(PROGRAM); const a58=read("config/pass36/a58-release-integrity-policy.json"); const pkg=read("package.json");
const active=fs.readFileSync("VELMERE_ACTIVE_PASS.txt","utf8").trim();
const readme=fs.readFileSync("README.md","utf8"); const cleanReadme=fs.readFileSync("CLEAN_SAFE_README.md","utf8");
const checks=[]; const add=(id,passed,detail=null)=>checks.push({id,passed:Boolean(passed),detail});
add("active",active===REV,active);
add("authority:identity",authority.authorityRevisionId===REV&&authority.parentRevisionId===PARENT&&authority.currentSource?.revisionId===REV&&authority.currentSource?.parentRevisionId===PARENT);
add("authority:pointers",authority.currentRootDescendantManifestPath===MANIFEST&&authority.currentRootDescendantManifestRevisionId===REV&&authority.worldClassCompletionProgramPath===PROGRAM&&authority.worldClassCompletionProgramRevisionId===REV);
const plane=authority.planes?.a102r4LocalClosure;
add("authority:local-plane",plane?.revisionId===REV&&plane?.parentRevisionId===PARENT&&plane?.clientAuthLocalStorageFailClosed===true&&plane?.unsignedPreviewHeaderAccepted===false&&plane?.clientAccountIdentityHeadersAccepted===false&&plane?.serverLogoutRequired===true&&plane?.historicalVerifierDriftRepaired===true&&plane?.exactBuildBrowserCredit===false&&plane?.realCredit===false,plane);
add("authority:no-promotion",authority.claims?.a90ToA102PassCredit===false&&authority.claims?.liveProven===false&&authority.claims?.saleEnabled===false&&authority.claims?.productionApproved===false&&authority.claims?.worldClassProven===false&&authority.claims?.decision==="NO_GO",authority.claims);
add("mirror",mirror.sourceRevisionId===REV&&mirror.parentSourceRevisionId===PARENT&&mirror.currentRootDescendantManifestPath===MANIFEST&&mirror.a102r4ClientAuthFailClosed===true&&mirror.a102r4UnsignedPreviewHeaderAccepted===false&&mirror.a102r4RealObservationRuns===0&&mirror.a102r4ExactReleaseCredit===false);
add("legacy",legacy.notAuthoritativeCurrentSourcePointer===true&&legacy.authoritativeCurrentSourceRevisionId===REV&&legacy.authoritativeCurrentSourceParentRevisionId===PARENT&&legacy.realRepeatedObservationRuns===0&&legacy.a90ToA102PassCredit===false);
add("state",state.revisionId===REV&&state.parentRevisionId===PARENT&&state.completedThrough===89&&state.localImplementation?.clientAuthLocalStorageFailOpenRemoved===true&&state.localImplementation?.unsignedPreviewHeaderAuthenticationRemoved===true&&state.localImplementation?.serverSessionLogoutRevocationRequired===true&&state.runtimeTruth?.freshWebpackBuildOnA102R4BytesExecuted===false&&state.runtimeTruth?.freshExactBrowserRowsExecuted===0&&state.promotion?.globalDecision==="NO_GO");
add("program",program.revisionId===REV&&program.parentRevisionId===PARENT&&program.formalRemainingEntries===31&&program.passes?.map((r)=>r.id).join(",")==="A102,A103,A104,A105,A106,A107,A108,A109,A110,A111,A112,A113,A114,A115,A116"&&program.passes?.every((r)=>r.credit===false)&&program.closureTracks?.every((r)=>r.credit===false)&&["A102R4-GAP-01","A102R4-GAP-11"].every((id)=>program.newRoadmapGaps?.some((r)=>r.id===id)));
add("package",pkg.velmereCurrentReleaseAuthorityPass===REV&&pkg.velmereWorldClassCompletionProgramPass===REV&&pkg.velmereWorldClassCompletionProgramPath===PROGRAM&&pkg.velmereCurrentRootDescendantManifestPath===MANIFEST&&pkg.velmere?.currentRevisionId===REV&&pkg.velmere?.currentRevisionParentId===PARENT&&pkg.velmere?.saleEnabled===false);
add("readmes",readme.includes(`Current source revision: \`${REV}\``)&&cleanReadme.includes(`Current source revision: \`${REV}\``));
add("a58",a58.currentCheckpointRevisionId===REV&&a58.currentCheckpointParentRevisionId===PARENT&&a58.currentDescendantManifestPath===MANIFEST&&a58.currentAuthorityVerifierPath==="scripts/pass36/verify-a102r4-action-required-authority.mjs"&&a58.archiveManifestPath==="_velmere/PASS36_A102R4_SOURCE_ONLY_MANIFEST.json"&&a58.currentAuthorityVerifierExpectedStatus==="PASS_A102R4_ACTION_REQUIRED_AUTHORITY_NO_REAL_BUILD_BROWSER_OR_STAGING_CREDIT");
function run(id,args,expected){const r=spawnSync(process.execPath,args,{encoding:"utf8",maxBuffer:64*1024*1024,timeout:900000});let p=null;try{p=JSON.parse(r.stdout)}catch{
    // Intentional fallback: optional legacy evidence parsing may be unavailable.
  };const observed=p?.status??p?.decision??null;add(id,r.status===0&&observed===expected,{exitCode:r.status,observed,stderr:(r.stderr??"").slice(-1000)});}
run("descendant",["scripts/pass36/verify-a102r4-current-root-descendant.mjs"],"PASS_A102R4_DESCENDANT_ACTION_REQUIRED_NO_PROMOTION");
run("receipt",["scripts/pass36/verify-a102r4-local-regression-receipt.mjs"],"PASS_A102R4_LOCAL_REGRESSION_RECEIPT_ACTION_REQUIRED_NO_PROMOTION");
run("auth-boundary",["--import","./scripts/pass11/register-offline-ts-loader.mjs","scripts/pass36/test-a102r4-client-auth-fail-closed.ts"],"PASS_A102R4_CLIENT_AUTH_PREVIEW_HEADER_LOCAL_STORAGE_FAIL_CLOSED");
run("cross-surface",["scripts/pass36/verify-a94r2-cross-surface-value-truth.mjs"],"PASS_LOCAL_CROSS_SURFACE_VALUE_TRUTH_NO_PAID_OR_REAL_CREDIT");
const failed=checks.filter((r)=>!r.passed);
console.log(JSON.stringify({status:failed.length?"FAIL_A102R4_AUTHORITY":"PASS_A102R4_ACTION_REQUIRED_AUTHORITY_NO_REAL_BUILD_BROWSER_OR_STAGING_CREDIT",revisionId:REV,checks:checks.length,passed:checks.length-failed.length,failed:failed.length,results:checks,globalDecision:"NO_GO",realObservationRuns:0,freshExactBuildBrowserCredit:false,stagingCredit:false,live:false,saleEnabled:false,productionApproved:false,worldClassProven:false},null,2));
process.exit(failed.length?1:0);
