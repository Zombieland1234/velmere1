#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";

const REV = "VELMERE_PASS36_A102R44P37_ACTION_REQUIRED_AUTHORITY_RELEASE_TRUTH_TYPESCRIPT_AND_EVIDENCE_REPAIR_TEST_CYCLE_0_OF_3_NO_LIVE_CREDIT";
const contract = JSON.parse(fs.readFileSync("config/pass35/a42-dev-runtime-cache-recovery.json", "utf8"));
const evidence = JSON.parse(fs.readFileSync("config/pass36/r44p37-a42-critical-rebaseline.json", "utf8"));
const sha = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const rows=[]; const check=(id,passed,detail=null)=>rows.push({id,passed:Boolean(passed),detail});
check("revision", evidence.revisionId === REV, evidence.revisionId);
check("denominator", evidence.criticalFileDenominator === 76 && Object.keys(contract.criticalFiles).length === 76, evidence.criticalFileDenominator);
check("no-removal", evidence.removedCriticalFiles === 0 && evidence.denominatorCollapse === false);
check("no-promotion", evidence.exactRuntimeCredit === false && evidence.saleCredit === false && evidence.liveCredit === false);
for (const [relativePath, digest] of Object.entries(contract.criticalFiles)) {
  check(`critical:${relativePath}`, fs.existsSync(relativePath) && sha(relativePath) === digest, relativePath);
}
for (const row of evidence.changedRows) {
  check(`changed:${row.path}`, contract.criticalFiles[row.path] === row.currentSha256 && row.parentSha256 !== row.currentSha256 && sha(row.path) === row.currentSha256, row);
}
check("changed-count", evidence.changedRowCount === evidence.changedRows.length, evidence.changedRowCount);
const failed=rows.filter((row)=>!row.passed);
console.log(JSON.stringify({schemaVersion:"velmere.pass36.a102r44p37.a42-critical-rebaseline-verification.v1",revisionId:REV,status:failed.length?"FAIL_R44P37_A42_CRITICAL_REBASELINE":"PASS_R44P37_A42_CRITICAL_REBASELINE_NO_RELEASE_CREDIT",checks:rows.length,passed:rows.length-failed.length,failed:failed.length,rows},null,2));
if(failed.length)process.exit(1);
