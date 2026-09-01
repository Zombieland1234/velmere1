#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
const REV="VELMERE_PASS36_A102R19_ACTION_REQUIRED_ACTIVE_CSS_ANIMATION_NAMESPACE_AND_CUSTOMER_UI_INTERNAL_CHECKPOINT_JARGON_MINIMALISM_NO_REAL_CREDIT", PARENT="VELMERE_PASS36_A102R18_ACTION_REQUIRED_PUBLIC_COMMUNITY_SYSTEM_CLIPBOARD_TEXT_LINK_CONTROL_BIDI_AND_SAME_ORIGIN_FAIL_CLOSED_NO_REAL_CREDIT", LEDGER="config/pass36/a102r19-approved-css-customer-minimalism-changes.json";
const sha=(b)=>crypto.createHash("sha256").update(b).digest("hex");
const ledger=JSON.parse(fs.readFileSync(LEDGER,"utf8"));
const checks=[]; const add=(id,passed,detail=null)=>checks.push({id,passed:Boolean(passed),detail});
add("identity",ledger.revisionId===REV&&ledger.parentRevisionId===PARENT&&ledger.schemaVersion==="velmere.pass36.a102r19.approved-css-customer-minimalism-changes.v1");
add("denominator",Array.isArray(ledger.approvedChanges)&&ledger.approvedChanges.length===5&&ledger.newFiles?.length===1);
for(const row of ledger.approvedChanges??[]){
  const exists=fs.existsSync(row.path), bytes=exists?fs.readFileSync(row.path):Buffer.alloc(0);
  add(`current:${row.path}`,exists&&bytes.length===row.currentByteLength&&sha(bytes)===row.currentSha256,row);
  add(`history:${row.path}`,row.parentRevisionId===PARENT&&row.parentBytesRewritten===false&&(row.historicalExists===false?row.historicalByteLength===0&&row.historicalSha256===null:Number.isInteger(row.historicalByteLength)&&row.historicalByteLength>0&&/^[a-f0-9]{64}$/u.test(row.historicalSha256)),row);
}
const test=spawnSync(process.execPath,["scripts/pass36/test-a102r19-css-customer-minimalism-boundary.mjs"],{encoding:"utf8",maxBuffer:16*1024*1024,env:{...process.env,TERM:"dumb"}});
add("test",test.status===0&&test.stdout.includes("PASS_A102R19_ACTIVE_CSS_CUSTOMER_MINIMALISM_BOUNDARY_LOCAL_ONLY"),{status:test.status,stdout:test.stdout.slice(-1200),stderr:test.stderr.slice(-500)});
const c=ledger.claims??{};
add("claims",c.cssCustomerMinimalismChecks===33&&c.activeGlobalStylesheets===3&&c.activeGlobalKeyframeNames===361&&c.duplicateGlobalKeyframeNames===0&&c.removedDuplicateOrDeadKeyframeBlocks===7&&c.globalsCssBytesReduced===627&&c.customerSurfacesSimplified===3&&c.internalProofMarkersRetained===true&&c.realBrowserRowsExecuted===0&&c.screenshotParityRows===0&&c.realCredit===false&&c.liveProven===false&&c.saleEnabled===false&&c.productionApproved===false&&c.worldClassProven===false,c);
const failed=checks.filter((row)=>!row.passed);
console.log(JSON.stringify({status:failed.length?"FAIL_A102R19_APPROVED_CSS_CUSTOMER_MINIMALISM_CHANGES":"PASS_A102R19_APPROVED_CSS_CUSTOMER_MINIMALISM_CHANGES_NO_PROMOTION",checks:checks.length,passed:checks.length-failed.length,failed:failed.length,results:checks},null,2));
process.exit(failed.length?1:0);
