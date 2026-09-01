#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
const REV="VELMERE_PASS36_A102R16_ACTION_REQUIRED_COOKIE_CONSENT_GRANULAR_CHOICE_EXPIRY_STRICT_JSON_AND_LOCAL_LEGAL_PROOF_BOUNDARY_NO_REAL_CREDIT";
const PARENT="VELMERE_PASS36_A102R15_ACTION_REQUIRED_ASSET_ANALYSIS_SYSTEM_CLIPBOARD_PACKET_RECEIPT_SOURCE_CLAIM_AND_TIMESTAMP_REDACTION_FAIL_CLOSED_NO_REAL_CREDIT";
const LEDGER="config/pass36/a102r16-approved-cookie-consent-granular-expiry-changes.json";
const sha=(b)=>crypto.createHash("sha256").update(b).digest("hex");
const ledger=JSON.parse(fs.readFileSync(LEDGER,"utf8"));
const checks=[]; const add=(id,passed,detail=null)=>checks.push({id,passed:Boolean(passed),detail});
add("identity",ledger.revisionId===REV&&ledger.parentRevisionId===PARENT&&ledger.schemaVersion==="velmere.pass36.a102r16.approved-cookie-consent-granular-expiry-changes.v1");
add("denominator",Array.isArray(ledger.approvedChanges)&&ledger.approvedChanges.length===3&&ledger.newFiles?.length===1);
for(const row of ledger.approvedChanges??[]){
  const bytes=fs.readFileSync(row.path);
  add(`current:${row.path}`,bytes.length===row.currentByteLength&&sha(bytes)===row.currentSha256,row);
  add(`history:${row.path}`,Number.isInteger(row.historicalByteLength)&&/^[a-f0-9]{64}$/u.test(row.historicalSha256)&&row.parentRevisionId===PARENT&&row.parentBytesRewritten===false);
}
const test=spawnSync(process.execPath,["--import","./scripts/pass11/register-offline-ts-loader.mjs","scripts/pass36/test-a102r16-cookie-consent-granular-expiry-privacy-boundary.ts"],{encoding:"utf8",maxBuffer:16*1024*1024});
add("test",test.status===0&&test.stdout.includes("PASS_A102R16_COOKIE_CONSENT_GRANULAR_EXPIRY_PRIVACY_BOUNDARY_LOCAL_ONLY"),{status:test.status,stdout:test.stdout.slice(-700),stderr:test.stderr.slice(-300)});
const c=ledger.claims??{};
add("claims",c.analyticsDefaultOff===true&&c.marketingDefaultOff===true&&c.granularChoiceImplemented===true&&c.exactExpiryRequired===true&&c.strictJsonRequired===true&&c.legacyStorageMigrated===false&&c.localStorageLegalProof===false&&c.serverConsentLedgerProven===false&&c.realBrowserRowsExecuted===0&&c.realCredit===false&&c.liveProven===false&&c.saleEnabled===false&&c.productionApproved===false&&c.worldClassProven===false,c);
const failed=checks.filter(x=>!x.passed);
console.log(JSON.stringify({status:failed.length?"FAIL_A102R16_APPROVED_COOKIE_CONSENT_GRANULAR_EXPIRY_CHANGES":"PASS_A102R16_APPROVED_COOKIE_CONSENT_GRANULAR_EXPIRY_CHANGES_NO_PROMOTION",checks:checks.length,passed:checks.length-failed.length,failed:failed.length,results:checks},null,2));
process.exit(failed.length?1:0);
