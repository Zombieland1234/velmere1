#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import { REV, PARENT } from "./a102r11-source-boundary.mjs";
const sha256=(bytes)=>crypto.createHash("sha256").update(bytes).digest("hex");
const ledger=JSON.parse(fs.readFileSync("config/pass36/a102r11-approved-client-pdf-blob-changes.json","utf8"));
const checks=[]; const add=(id,passed,detail=null)=>checks.push({id,passed:Boolean(passed),detail});
add("identity",ledger.revisionId===REV&&ledger.parentRevisionId===PARENT);
add("schema",ledger.schemaVersion==="velmere.pass36.a102r11.approved-client-pdf-blob-changes.v1");
add("rows",Array.isArray(ledger.approvedChanges)&&ledger.approvedChanges.length===2,ledger.approvedChanges?.length);
for(const row of ledger.approvedChanges??[]){
 const bytes=fs.readFileSync(row.path);
 add(`current:${row.path}`,row.currentByteLength===bytes.length&&row.currentSha256===sha256(bytes));
 add(`history:${row.path}`,row.parentRevisionId===PARENT&&/^[a-f0-9]{64}$/u.test(row.historicalSha256)&&row.historicalByteLength>0&&row.parentBytesRewritten===false);
 add(`changed:${row.path}`,row.historicalSha256!==row.currentSha256&&row.historicalByteLength!==0);
 add(`test:${row.path}`,row.requiredLocalTest==="PASS_A102R11_CLIENT_PDF_BYTE_BINDING_OBJECT_URL_LIFECYCLE_FAIL_CLOSED_NO_PROMOTION");
}
const expected=["lib/security/client-pdf-blob-boundary.ts","scripts/pass36/test-a102r11-client-pdf-blob-boundary.ts"].sort();
add("new-files",ledger.newFiles?.map((row)=>row.path).sort().join(",")===expected.join(",")&&ledger.newFiles.every((row)=>fs.existsSync(row.path)));
const c=ledger.claims??{};
add("claims",c.parentHistoricalPassRewritten===false&&c.lensPdfMimeAndMinimumSizeOnlyAccepted===false&&c.lensPdfExactSha256Required===true&&c.lensPdfCanonicalReportDigestAndIdRequired===true&&c.lensPdfRendererTierPageCountRequired===true&&c.lensPdfActiveContentNoneRequired===true&&c.lensPdfRedactionCleanRequired===true&&c.lensPdfPreviewDownloadExactBlobRequired===true&&c.rawObjectUrlSinksOutsideBoundary===0&&c.paidAuditZeroDelayObjectUrlRevocationRemoved===true&&c.safeClientPdfFilenameRequired===true&&c.realBrowserPdfRowsExecuted===false&&c.freshExactBuildBrowserCredit===false&&c.realCredit===false&&c.liveProven===false&&c.saleEnabled===false&&c.productionApproved===false&&c.worldClassProven===false,c);
const failed=checks.filter((row)=>!row.passed);
console.log(JSON.stringify({status:failed.length?"FAIL_A102R11_APPROVED_CLIENT_PDF_BLOB_CHANGES":"PASS_A102R11_APPROVED_CLIENT_PDF_BLOB_CHANGES_NO_PROMOTION",revisionId:REV,checks:checks.length,passed:checks.length-failed.length,failed:failed.length,results:checks},null,2));
process.exit(failed.length?1:0);
