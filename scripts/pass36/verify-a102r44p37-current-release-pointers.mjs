#!/usr/bin/env node
import fs from "node:fs";

const REV = "VELMERE_PASS36_A102R44P37_ACTION_REQUIRED_AUTHORITY_RELEASE_TRUTH_TYPESCRIPT_AND_EVIDENCE_REPAIR_TEST_CYCLE_0_OF_3_NO_LIVE_CREDIT";
const PARENT = "VELMERE_PASS36_A102R44P36_ACTION_REQUIRED_FULL_CURRENT_BYTE_RELEASE_PSYCHOLOGY30_DYNAMIC_REBASELINE_TEST_CYCLE_3_OF_3_NO_LIVE_CREDIT";
const MANIFEST = "_velmere/PASS36_A102R44P37_SOURCE_ONLY_MANIFEST.json";
const files = ["config/pass36/current-release-authority.json", "config/pass35/current-revision.json", "config/current-release.json"];
const rows=[]; const check=(id,passed,detail=null)=>rows.push({id,passed:Boolean(passed),detail});
const active=fs.readFileSync("VELMERE_ACTIVE_PASS.txt","utf8").trim();
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
check("active-pass", active===REV, active);
check("package-pass", pkg.velmerePass===REV, pkg.velmerePass);
for(const file of files){
 const value=JSON.parse(fs.readFileSync(file,"utf8"));
 check(`${file}:authority`, value.authorityRevisionId===REV, value.authorityRevisionId);
 check(`${file}:revision`, value.revisionId===REV && value.currentRevisionId===REV && value.sourceRevisionId===REV, {revisionId:value.revisionId,currentRevisionId:value.currentRevisionId,sourceRevisionId:value.sourceRevisionId});
 check(`${file}:parent`, value.parentRevisionId===PARENT && value.sourceParentRevisionId===PARENT, {parentRevisionId:value.parentRevisionId,sourceParentRevisionId:value.sourceParentRevisionId});
 check(`${file}:manifest`, value.sourceManifestPath===MANIFEST, value.sourceManifestPath);
 check(`${file}:no-go`, value.globalDecision==="NO_GO" && value.live===false && value.LIVE===false && value.saleEnabled===false && value.productionApproved===false && value.worldClassProven===false, null);
}
const state=JSON.parse(fs.readFileSync("config/pass36/r44p37-current-state.json","utf8"));
const boundary=JSON.parse(fs.readFileSync("config/pass36/r44p37-release-boundary.json","utf8"));
check("state", state.revisionId===REV && state.parentRevisionId===PARENT && state.testCycle==="0/3" && state.status==="SOURCE_FROZEN_ACTION_REQUIRED", state);
check("boundary", boundary.revisionId===REV && boundary.exactLinuxCredit===false && boundary.exactWindowsCredit===false && boundary.customerCredit===false && boundary.paidSaleCredit===false && boundary.liveCredit===false, boundary);
const failed=rows.filter((row)=>!row.passed);
console.log(JSON.stringify({schemaVersion:"velmere.pass36.a102r44p37.current-release-pointer-verification.v1",revisionId:REV,status:failed.length?"FAIL_R44P37_CURRENT_RELEASE_POINTERS":"PASS_R44P37_CURRENT_RELEASE_POINTERS_NO_PROMOTION",checks:rows.length,passed:rows.length-failed.length,failed:failed.length,rows},null,2));
if(failed.length)process.exit(1);
