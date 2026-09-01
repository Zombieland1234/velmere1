#!/usr/bin/env node
import fs from "node:fs";
const REV='VELMERE_PASS36_A102R44P43_ACTION_REQUIRED_PUBLIC_BALANCED_HOLDOUT_LEGACY_COMPILER_AST_AND_CONTROL_ALERT_RATE_TEST_CYCLE_2_OF_3_NO_LIVE_CREDIT';const MANIFEST="_velmere/PASS36_A102R44P43_SOURCE_ONLY_MANIFEST.json";
const read=(p)=>fs.readFileSync(p,"utf8");const json=(p)=>JSON.parse(read(p));const rows=[];const check=(id,ok,detail=null)=>rows.push({id,passed:Boolean(ok),detail});
check("active-pass",read("VELMERE_ACTIVE_PASS.txt").trim()===REV);check("package",json("package.json").velmerePass===REV);
for(const p of ["config/current-release.json","config/pass35/current-revision.json","config/pass36/current-release-authority.json"]){const v=json(p);check(`${p}:revision`,[v.revisionId,v.currentRevisionId,v.authorityRevisionId,v.currentReleaseAuthorityRevisionId].filter(Boolean).every(x=>x===REV));check(`${p}:manifest`,v.sourceManifestPath===MANIFEST);check(`${p}:no-live`,v.LIVE!==true&&v.live!==true&&v.saleEnabled!==true&&v.productionApproved!==true&&v.worldClassProven!==true);}
const failed=rows.filter(r=>!r.passed);console.log(JSON.stringify({schemaVersion:"velmere.pass36.a102r44p43.current-pointers.v1",status:failed.length?"FAIL_R44P43_CURRENT_POINTERS":"PASS_R44P43_CURRENT_POINTERS",checks:rows.length,passed:rows.length-failed.length,failed:failed.length,rows},null,2));if(failed.length)process.exit(1);
