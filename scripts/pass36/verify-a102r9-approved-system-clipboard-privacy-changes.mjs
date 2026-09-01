#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import { REV, PARENT } from "./a102r9-source-boundary.mjs";
const sha256=(bytes)=>crypto.createHash("sha256").update(bytes).digest("hex");
const ledger=JSON.parse(fs.readFileSync("config/pass36/a102r9-approved-system-clipboard-privacy-changes.json","utf8"));
const checks=[]; const add=(id,passed,detail=null)=>checks.push({id,passed:Boolean(passed),detail});
add("identity",ledger.revisionId===REV&&ledger.parentRevisionId===PARENT);
add("schema",ledger.schemaVersion==="velmere.pass36.a102r9.approved-system-clipboard-privacy-changes.v1");
add("rows",Array.isArray(ledger.approvedChanges)&&ledger.approvedChanges.length===2);
for(const row of ledger.approvedChanges??[]){
 const bytes=fs.readFileSync(row.path);
 add(`current:${row.path}`,row.currentByteLength===bytes.length&&row.currentSha256===sha256(bytes));
 add(`history:${row.path}`,row.parentRevisionId===PARENT&&/^[a-f0-9]{64}$/u.test(row.historicalSha256)&&row.historicalByteLength>0&&row.parentBytesRewritten===false);
 add(`test:${row.path}`,row.requiredLocalTest==="PASS_A102R9_SYSTEM_CLIPBOARD_PRIVATE_ACCOUNT_AND_ADMIN_EXPORT_REDACTION_NO_PROMOTION");
}
const expected=["lib/security/browser-system-clipboard.ts","scripts/pass36/test-a102r9-system-clipboard-private-export-boundary.ts"].sort();
add("new-files",ledger.newFiles?.map((row)=>row.path).sort().join(",")===expected.join(",")&&ledger.newFiles.every((row)=>fs.existsSync(row.path)));
add("claims",ledger.claims?.parentHistoricalPassRewritten===false&&ledger.claims?.privateAccountIdentifiersCopiedToSystemClipboard===false&&ledger.claims?.downloadSessionOrAccessAuthorityCopiedToSystemClipboard===false&&ledger.claims?.adminOrderCaseReceiptIdentifiersCopiedToSystemClipboard===false&&ledger.claims?.rawClipboardFallbackImplemented===false&&ledger.claims?.secureContextRequired===true&&ledger.claims?.clipboardPayloadByteBounded===true&&ledger.claims?.browserClipboardPersistenceControlledByVelmere===false&&ledger.claims?.realBrowserClipboardMatrixExecuted===false&&ledger.claims?.freshExactBuildBrowserCredit===false&&ledger.claims?.realCredit===false&&ledger.claims?.liveProven===false&&ledger.claims?.saleEnabled===false);
const failed=checks.filter((row)=>!row.passed);
console.log(JSON.stringify({status:failed.length?"FAIL_A102R9_APPROVED_SYSTEM_CLIPBOARD_PRIVACY_CHANGES":"PASS_A102R9_APPROVED_SYSTEM_CLIPBOARD_PRIVACY_CHANGES_NO_PROMOTION",revisionId:REV,checks:checks.length,passed:checks.length-failed.length,failed:failed.length,results:checks},null,2));
process.exit(failed.length?1:0);
