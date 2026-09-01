#!/usr/bin/env node
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { REV, PARENT, MANIFEST, STATE, PROGRAM } from "./a102r6-source-boundary.mjs";
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
const plane=authority.planes?.a102r6LocalClosure;
add("authority:local-plane",plane?.revisionId===REV&&plane?.parentRevisionId===PARENT&&plane?.persistentPrivateAccountBrowserStateAuthority===false&&plane?.crossTabPrivateAccountBrowserStateAuthority===false&&plane?.legacyPrivateAccountStorageMigrated===false&&plane?.legacyPrivateAccountStoragePurgedOnly===true&&plane?.currentTabEphemeralStateOnly===true&&plane?.clientFallbackVaultReadyAuthority===false&&plane?.durableVaultServerConfirmationRequired===true&&plane?.freshExactBuildBrowserCredit===false&&plane?.realDurableVaultCredit===false&&plane?.realCredit===false,plane);
add("authority:no-promotion",authority.claims?.a90ToA102PassCredit===false&&authority.claims?.liveProven===false&&authority.claims?.saleEnabled===false&&authority.claims?.productionApproved===false&&authority.claims?.worldClassProven===false&&authority.claims?.decision==="NO_GO",authority.claims);
add("mirror",mirror.sourceRevisionId===REV&&mirror.parentSourceRevisionId===PARENT&&mirror.currentRootDescendantManifestPath===MANIFEST&&mirror.a102r6PersistentPrivateAccountBrowserStateAuthority===false&&mirror.a102r6CrossTabPrivateAccountBrowserStateAuthority===false&&mirror.a102r6LegacyPrivateStorageMigrated===false&&mirror.a102r6LegacyPrivateStoragePurgedOnly===true&&mirror.a102r6ClientFallbackVaultReadyAuthority===false&&mirror.a102r6DurableVaultServerConfirmationRequired===true&&mirror.a102r6RealDurableVaultRuns===0&&mirror.a102r6ExactReleaseCredit===false);
add("legacy",legacy.notAuthoritativeCurrentSourcePointer===true&&legacy.authoritativeCurrentSourceRevisionId===REV&&legacy.authoritativeCurrentSourceParentRevisionId===PARENT&&legacy.realRepeatedObservationRuns===0&&legacy.a90ToA102PassCredit===false&&legacy.a102r6PersistentPrivateAccountBrowserStateAuthority===false&&legacy.a102r6ClientFallbackVaultReadyAuthority===false&&legacy.a102r6RealDurableVaultRuns===0);
add("state",state.revisionId===REV&&state.parentRevisionId===PARENT&&state.completedThrough===89&&state.localImplementation?.privateAccountPersistentBrowserStateRemoved===true&&state.localImplementation?.privateAccountCrossTabStorageAuthorityRemoved===true&&state.localImplementation?.legacyPrivateAccountLocalStoragePurgedWithoutMigration===true&&state.localImplementation?.privateAccountStateCurrentTabEphemeralOnly===true&&state.localImplementation?.clientFallbackVaultReadyPromotionRemoved===true&&state.localImplementation?.durableVaultServerConfirmationRequired===true&&state.runtimeTruth?.freshWebpackBuildOnA102R6BytesExecuted===false&&state.runtimeTruth?.freshExactBrowserRowsExecuted===0&&state.promotion?.globalDecision==="NO_GO");
add("program",program.revisionId===REV&&program.parentRevisionId===PARENT&&program.formalRemainingEntries===31&&program.passes?.map((r)=>r.id).join(",")==="A102,A103,A104,A105,A106,A107,A108,A109,A110,A111,A112,A113,A114,A115,A116"&&program.passes?.every((r)=>r.credit===false)&&program.closureTracks?.every((r)=>r.credit===false)&&["A102R6-GAP-01","A102R6-GAP-12"].every((id)=>program.newRoadmapGaps?.some((r)=>r.id===id)));
add("package",pkg.velmereCurrentReleaseAuthorityPass===REV&&pkg.velmereWorldClassCompletionProgramPass===REV&&pkg.velmereWorldClassCompletionProgramPath===PROGRAM&&pkg.velmereCurrentRootDescendantManifestPath===MANIFEST&&pkg.velmere?.currentRevisionId===REV&&pkg.velmere?.currentRevisionParentId===PARENT&&pkg.velmere?.saleEnabled===false);
add("readmes",readme.includes(`Current source revision: \`${REV}\``)&&cleanReadme.includes(`Current source revision: \`${REV}\``)&&readme.includes("persistent and cross-tab browser authority")&&cleanReadme.includes("persistent and cross-tab browser authority"));
add("a58",a58.currentCheckpointRevisionId===REV&&a58.currentCheckpointParentRevisionId===PARENT&&a58.currentDescendantManifestPath===MANIFEST&&a58.currentAuthorityVerifierPath==="scripts/pass36/verify-a102r6-action-required-authority.mjs"&&a58.archiveManifestPath==="_velmere/PASS36_A102R6_SOURCE_ONLY_MANIFEST.json"&&a58.currentAuthorityVerifierExpectedStatus==="PASS_A102R6_ACTION_REQUIRED_AUTHORITY_NO_REAL_BUILD_BROWSER_OR_STAGING_CREDIT");
function parseLastJson(stdout){const text=String(stdout??"").trim();try{return JSON.parse(text)}catch{
    // Intentional fallback: optional legacy evidence parsing may be unavailable.
  }for(let index=text.length-1;index>=0;index-=1){if(text[index]!=="{")continue;try{return JSON.parse(text.slice(index))}catch{
    // Intentional fallback: optional legacy evidence parsing may be unavailable.
  }}return null;}
function run(id,args,expected){const r=spawnSync(process.execPath,args,{encoding:"utf8",maxBuffer:64*1024*1024,timeout:900000});const p=parseLastJson(r.stdout);const observed=p?.status??p?.decision??null;add(id,r.status===0&&observed===expected,{exitCode:r.status,observed,stderr:(r.stderr??"").slice(-1000)});}
run("descendant",["scripts/pass36/verify-a102r6-current-root-descendant.mjs"],"PASS_A102R6_DESCENDANT_ACTION_REQUIRED_NO_PROMOTION");
run("receipt",["scripts/pass36/verify-a102r6-local-regression-receipt.mjs"],"PASS_A102R6_LOCAL_REGRESSION_RECEIPT_ACTION_REQUIRED_NO_PROMOTION");
run("private-state",["--import","./scripts/pass11/register-offline-ts-loader.mjs","scripts/pass36/test-a102r6-private-account-browser-state-boundary.ts"],"PASS_A102R6_PRIVATE_ACCOUNT_EPHEMERAL_SERVER_CONFIRMED_BOUNDARY_NO_PROMOTION");
run("approved-changes",["scripts/pass36/verify-a102r6-approved-private-account-browser-state-changes.mjs"],"PASS_A102R6_APPROVED_PRIVATE_ACCOUNT_BROWSER_STATE_CHANGES_NO_PROMOTION");
run("paid-boundary",["--import","./scripts/pass11/register-offline-ts-loader.mjs","scripts/pass36/test-a102r5-paid-entitlement-browser-secret-boundary.ts"],"PASS_A102R5_SERVER_ACCOUNT_ENTITLEMENT_NO_BROWSER_BEARER_PERSISTENCE");
run("cross-surface",["scripts/pass36/verify-a94r2-cross-surface-value-truth.mjs"],"PASS_LOCAL_CROSS_SURFACE_VALUE_TRUTH_NO_PAID_OR_REAL_CREDIT");
const failed=checks.filter((r)=>!r.passed);
console.log(JSON.stringify({status:failed.length?"FAIL_A102R6_AUTHORITY":"PASS_A102R6_ACTION_REQUIRED_AUTHORITY_NO_REAL_BUILD_BROWSER_OR_STAGING_CREDIT",revisionId:REV,checks:checks.length,passed:checks.length-failed.length,failed:failed.length,results:checks,globalDecision:"NO_GO",realObservationRuns:0,realDurableAccountVaultRuns:0,freshExactBuildBrowserCredit:false,stagingCredit:false,live:false,saleEnabled:false,productionApproved:false,worldClassProven:false},null,2));
process.exit(failed.length?1:0);
