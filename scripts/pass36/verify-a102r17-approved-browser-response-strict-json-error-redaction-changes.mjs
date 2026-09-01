#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
const REV="VELMERE_PASS36_A102R17_ACTION_REQUIRED_CLIENT_RESPONSE_STRICT_JSON_RAW_SERVER_ERROR_AND_ANGEL_SESSION_STORAGE_FAIL_CLOSED_NO_REAL_CREDIT";
const PARENT="VELMERE_PASS36_A102R16_ACTION_REQUIRED_COOKIE_CONSENT_GRANULAR_CHOICE_EXPIRY_STRICT_JSON_AND_LOCAL_LEGAL_PROOF_BOUNDARY_NO_REAL_CREDIT";
const LEDGER="config/pass36/a102r17-approved-browser-response-strict-json-error-redaction-changes.json";
const sha=(b)=>crypto.createHash("sha256").update(b).digest("hex");
const ledger=JSON.parse(fs.readFileSync(LEDGER,"utf8"));
const checks=[]; const add=(id,passed,detail=null)=>checks.push({id,passed:Boolean(passed),detail});
add("identity",ledger.revisionId===REV&&ledger.parentRevisionId===PARENT&&ledger.schemaVersion==="velmere.pass36.a102r17.approved-browser-response-strict-json-error-redaction-changes.v1");
add("denominator",Array.isArray(ledger.approvedChanges)&&ledger.approvedChanges.length===14&&ledger.newFiles?.length===2);
for(const row of ledger.approvedChanges??[]){
  const exists=fs.existsSync(row.path); const bytes=exists?fs.readFileSync(row.path):Buffer.alloc(0);
  add(`current:${row.path}`,exists&&bytes.length===row.currentByteLength&&sha(bytes)===row.currentSha256,row);
  add(`history:${row.path}`,row.parentRevisionId===PARENT&&row.parentBytesRewritten===false&&(
    row.historicalExists===false
      ? row.historicalByteLength===0&&row.historicalSha256===null
      : Number.isInteger(row.historicalByteLength)&&row.historicalByteLength>0&&/^[a-f0-9]{64}$/u.test(row.historicalSha256)
  ),row);
}
const test=spawnSync(process.execPath,["--import","./scripts/pass11/register-offline-ts-loader.mjs","scripts/pass36/test-a102r17-browser-response-strict-json-error-redaction.ts"],{encoding:"utf8",maxBuffer:16*1024*1024,env:{...process.env,TERM:"dumb"}});
add("test",test.status===0&&test.stdout.includes("PASS_A102R17_BROWSER_RESPONSE_STRICT_JSON_ERROR_REDACTION_LOCAL_ONLY"),{status:test.status,stdout:test.stdout.slice(-900),stderr:test.stderr.slice(-400)});
const c=ledger.claims??{};
add("claims",c.browserResponseBoundaryChecks===52&&c.strictJsonResponseBoundary===true&&c.duplicateAndPrototypeKeysRejected===true&&c.rawServerBodyRendered===false&&c.rawProviderErrorRendered===false&&c.angelSessionStoragePersistence===false&&c.angelCorrelationAuthority===false&&c.accountBoundServerMemoryRetained===true&&c.sharedJsonReaderStrict===true&&c.realBrowserRowsExecuted===0&&c.realCredit===false&&c.liveProven===false&&c.saleEnabled===false&&c.productionApproved===false&&c.worldClassProven===false,c);
const failed=checks.filter(x=>!x.passed);
console.log(JSON.stringify({status:failed.length?"FAIL_A102R17_APPROVED_BROWSER_RESPONSE_STRICT_JSON_ERROR_REDACTION_CHANGES":"PASS_A102R17_APPROVED_BROWSER_RESPONSE_STRICT_JSON_ERROR_REDACTION_CHANGES_NO_PROMOTION",checks:checks.length,passed:checks.length-failed.length,failed:failed.length,results:checks},null,2));
process.exit(failed.length?1:0);
