#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { verifyCriticalFiles } from "../../lib/build/dev-runtime-cache-recovery.mjs";
const REV="VELMERE_PASS36_A102R40_ACTION_REQUIRED_CURRENT_SOURCE_AUTHORITY_EXACT_BUILD_PREFLIGHT_AND_STALE_RELEASE_POINTER_RECONCILIATION_NO_LIVE_CREDIT";
const PARENT="VELMERE_PASS36_A102R39_ACTION_REQUIRED_CROSS_PLATFORM_SOURCE_MODE_IDENTITY_WINDOWS_UNPACK_AND_POSIX_EXECUTABLE_POLICY_NO_LIVE_CREDIT";
const contract=JSON.parse(fs.readFileSync("config/pass35/a42-dev-runtime-cache-recovery.json","utf8"));
const evidence=JSON.parse(fs.readFileSync("config/pass36/a102r40-a42-critical-rebaseline.json","utf8"));
const sha=(b)=>crypto.createHash("sha256").update(b).digest("hex");
let checks=0;const ok=(v,id)=>{checks++;assert.ok(v,id)};
ok(evidence.revisionId===REV&&evidence.parentRevisionId===PARENT,"identity");
ok(evidence.criticalFileDenominator===76&&Object.keys(contract.criticalFiles).length===76,"denominator");
ok(evidence.rebaselinedRowCount===3&&evidence.rebaselinedRows.length===3,"classification");
ok(new Set(evidence.rebaselinedRows.map((x)=>x.path)).size===3,"unique");
for(const row of evidence.rebaselinedRows){const bytes=fs.readFileSync(row.path);ok(bytes.length===row.currentByteLength,`bytes:${row.path}`);ok(sha(bytes)===row.currentSha256,`sha:${row.path}`);ok(contract.criticalFiles[row.path]===row.currentSha256,`contract:${row.path}`);ok(row.parentSha256!==row.currentSha256,`changed:${row.path}`);}
const verified=verifyCriticalFiles(process.cwd(),contract.criticalFiles);ok(verified.ok&&verified.checks.length===76&&verified.failures.length===0,"all-critical-files");
ok(evidence.globalDecision==="NO_GO"&&!evidence.live&&!evidence.saleEnabled&&!evidence.productionApproved&&!evidence.worldClassProven,"promotion");
console.log(JSON.stringify({status:"PASS_A102R40_A42_CRITICAL_REBASELINE_76_OF_76_NO_WINDOWS_BROWSER_STAGING_OR_SALE_CREDIT",checksPassed:checks,checksFailed:0,criticalFilesPassed:verified.checks.length,rebaselinedRows:evidence.rebaselinedRowCount},null,2));
