#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import { REV, PARENT } from "./a102r13-source-boundary.mjs";
const sha256=(bytes)=>crypto.createHash("sha256").update(bytes).digest("hex");
const file="config/pass36/a102r13-approved-operational-log-client-error-redaction-changes.json";
const ledger=JSON.parse(fs.readFileSync(file,"utf8"));
const checks=[]; const add=(id,passed,detail=null)=>checks.push({id,passed:Boolean(passed),detail});
add("identity",ledger.revisionId===REV&&ledger.parentRevisionId===PARENT);
add("schema",ledger.schemaVersion==="velmere.pass36.a102r13.approved-operational-log-client-error-redaction-changes.v1");
add("changed-rows",Array.isArray(ledger.approvedChanges)&&ledger.approvedChanges.length===9,ledger.approvedChanges?.length);
for(const row of ledger.approvedChanges??[]){
 const bytes=fs.readFileSync(row.path);
 add(`current:${row.path}`,row.currentByteLength===bytes.length&&row.currentSha256===sha256(bytes));
 add(`history:${row.path}`,row.parentRevisionId===PARENT&&/^[a-f0-9]{64}$/u.test(row.historicalSha256)&&row.historicalByteLength>0&&row.parentBytesRewritten===false);
 add(`changed:${row.path}`,row.historicalSha256!==row.currentSha256||row.historicalByteLength!==row.currentByteLength);
 add(`test:${row.path}`,row.requiredLocalTest==="PASS_A102R13_OPERATIONAL_LOG_CLIENT_ERROR_REDACTION_LOCAL_ONLY");
}
const expected=["lib/security/browser-error-redaction.ts","lib/security/operational-log-boundary.ts","scripts/pass36/test-a102r13-operational-log-and-client-error-redaction.ts"].sort();
add("new-files",ledger.newFiles?.map((row)=>row.path).sort().join(",")===expected.join(",")&&ledger.newFiles.every((row)=>fs.existsSync(row.path)));
const c=ledger.claims??{};
add("claims",c.parentHistoricalPassRewritten===false&&c.rawBrowserErrorMessagesLogged===false&&c.rawBrowserStacksLogged===false&&c.rawComponentStacksLogged===false&&c.rawStripeSessionIdentifiersLogged===false&&c.rawWalletIdentifiersLogged===false&&c.rawCustomerEmailLogged===false&&c.rawProductContextAuditQueueIdentifiersLogged===false&&c.operationalIdentifiersLabelBoundSha256Only===true&&c.activeConsoleSinkCount===3&&c.centralizedConsoleSinksOnly===true&&c.realBrowserConsoleRowsExecuted===0&&c.productionLogPipelineVerified===false&&c.legalDpoApproved===false&&c.freshExactBuildBrowserCredit===false&&c.realCredit===false&&c.liveProven===false&&c.saleEnabled===false&&c.productionApproved===false&&c.worldClassProven===false,c);
const failed=checks.filter((row)=>!row.passed);
console.log(JSON.stringify({status:failed.length?"FAIL_A102R13_APPROVED_OPERATIONAL_LOG_CLIENT_ERROR_REDACTION_CHANGES":"PASS_A102R13_APPROVED_OPERATIONAL_LOG_CLIENT_ERROR_REDACTION_CHANGES_NO_PROMOTION",revisionId:REV,checks:checks.length,passed:checks.length-failed.length,failed:failed.length,results:checks},null,2));
process.exit(failed.length?1:0);
