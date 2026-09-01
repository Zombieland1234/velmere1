#!/usr/bin/env node
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import {REV,PARENT,MANIFEST,STATE,PROGRAM} from "./a102r19-source-boundary.mjs";
const read=(p)=>JSON.parse(fs.readFileSync(p,"utf8"));
const authority=read("config/pass36/current-release-authority.json"),mirror=read("config/pass35/current-revision.json"),legacy=read("config/current-release.json"),state=read(STATE),program=read(PROGRAM),a58=read("config/pass36/a58-release-integrity-policy.json"),pkg=read("package.json"),active=fs.readFileSync("VELMERE_ACTIVE_PASS.txt","utf8").trim(),readme=fs.readFileSync("README.md","utf8"),clean=fs.readFileSync("CLEAN_SAFE_README.md","utf8");
const checks=[];const add=(id,passed,detail=null)=>checks.push({id,passed:Boolean(passed),detail});
add("active",active===REV);
add("authority",authority.authorityRevisionId===REV&&authority.parentRevisionId===PARENT&&authority.currentSource?.revisionId===REV&&authority.currentSource?.parentRevisionId===PARENT);
add("pointers",authority.currentRootDescendantManifestPath===MANIFEST&&authority.worldClassCompletionProgramPath===PROGRAM&&authority.worldClassCompletionProgramRevisionId===REV&&authority.planes?.roadmapProgram?.revisionId===REV&&authority.planes?.roadmapProgram?.path===PROGRAM);
const plane=authority.planes?.a102r19LocalClosure;
add("plane",plane?.revisionId===REV&&plane?.boundaryChecks===33&&plane?.activeGlobalStylesheets===3&&plane?.activeGlobalKeyframeNames===361&&plane?.duplicateGlobalKeyframeNames===0&&plane?.removedDuplicateOrDeadKeyframeBlocks===7&&plane?.globalsCssBytesReduced===627&&plane?.customerSurfacesSimplified===3&&plane?.internalProofMarkersRetained===true&&plane?.realBrowserRows===0&&plane?.screenshotParityRows===0&&plane?.realCredit===false,plane);
add("claims",authority.claims?.currentRevisionId===REV&&authority.claims?.parentRevisionId===PARENT&&authority.claims?.decision==="NO_GO"&&authority.claims?.liveProven===false&&authority.claims?.saleEnabled===false&&authority.claims?.productionApproved===false&&authority.claims?.worldClassProven===false);
add("mirror",mirror.sourceRevisionId===REV&&mirror.parentSourceRevisionId===PARENT&&mirror.currentReleaseAuthorityRevisionId===REV&&mirror.currentRootDescendantManifestRevisionId===REV&&mirror.worldClassCompletionProgramRevisionId===REV&&mirror.a102r19CssCustomerMinimalismChecks===33&&mirror.a102r19DuplicateGlobalKeyframeNames===0&&mirror.a102r19CustomerSurfacesSimplified===3&&mirror.a102r19ExactReleaseCredit===false);
add("legacy",legacy.authoritativeCurrentSourceRevisionId===REV&&legacy.authoritativeCurrentSourceParentRevisionId===PARENT&&legacy.a102r19CssCustomerMinimalismChecks===33&&legacy.a102r19DuplicateGlobalKeyframeNames===0&&legacy.a102r19CustomerSurfacesSimplified===3&&legacy.a102r19ExactReleaseCredit===false);
add("state",state.revisionId===REV&&state.parentRevisionId===PARENT&&state.completedThrough===89);
add("program",program.revisionId===REV&&program.parentRevisionId===PARENT&&program.formalRemainingEntries===31&&program.estimatedRemainingCheckpoints?.mostLikely===12);
add("a58",a58.currentCheckpointRevisionId===REV&&a58.currentCheckpointParentRevisionId===PARENT&&a58.currentDescendantManifestPath===MANIFEST&&a58.currentAuthorityVerifierPath==="scripts/pass36/verify-a102r19-action-required-authority.mjs"&&a58.currentAuthorityVerifierExpectedStatus==="PASS_A102R19_ACTION_REQUIRED_AUTHORITY_NO_REAL_BUILD_BROWSER_STAGING_LEGAL_OR_SALE_CREDIT"&&a58.archiveManifestPath==="_velmere/PASS36_A102R19_SOURCE_ONLY_MANIFEST.json"&&a58.archiveManifestSchemaVersion==="velmere.pass36.a102r19.source-only-package-manifest.v1"&&a58.currentWorldClassCompletionProgramPath===PROGRAM&&a58.currentWorldClassCompletionProgramRevisionId===REV);
add("package",pkg.velmerePass===REV&&pkg.velmerePatch==="VELMERE_A102R19_PATCH.txt"&&pkg.velmereCurrentReleaseAuthorityPass===REV&&pkg.velmereWorldClassCompletionProgramPass===REV&&pkg.velmereWorldClassCompletionProgramPath===PROGRAM&&pkg.velmereCurrentRootDescendantManifestPath===MANIFEST&&pkg.velmere?.currentRevisionId===REV&&pkg.velmere?.currentRevisionParentId===PARENT);
add("readme",readme.startsWith("# Current checkpoint — A102R19")&&readme.includes(REV)&&clean.startsWith("# Current checkpoint — A102R19")&&clean.includes(REV));
for(const [id,script,status] of [
 ["approved","scripts/pass36/verify-a102r19-approved-css-customer-minimalism-changes.mjs","PASS_A102R19_APPROVED_CSS_CUSTOMER_MINIMALISM_CHANGES_NO_PROMOTION"],
 ["receipt","scripts/pass36/verify-a102r19-local-regression-receipt.mjs","PASS_A102R19_LOCAL_REGRESSION_RECEIPT_ACTION_REQUIRED_NO_PROMOTION"],
 ["descendant","scripts/pass36/verify-a102r19-current-root-descendant.mjs","PASS_A102R19_DESCENDANT_ACTION_REQUIRED_NO_PROMOTION"]
]){
 const child=spawnSync(process.execPath,[script],{encoding:"utf8",maxBuffer:32*1024*1024,env:{...process.env,TERM:"dumb"}});
 add(`child:${id}`,child.status===0&&child.stdout.includes(status),{status:child.status,stdout:child.stdout.slice(-1000),stderr:child.stderr.slice(-500)});
}
const failed=checks.filter((x)=>!x.passed);
console.log(JSON.stringify({status:failed.length?"FAIL_A102R19_ACTION_REQUIRED_AUTHORITY":"PASS_A102R19_ACTION_REQUIRED_AUTHORITY_NO_REAL_BUILD_BROWSER_STAGING_LEGAL_OR_SALE_CREDIT",checks:checks.length,passed:checks.length-failed.length,failed:failed.length,globalDecision:"NO_GO",live:false,saleEnabled:false,productionApproved:false,worldClassProven:false,results:checks},null,2));
process.exit(failed.length?1:0);
