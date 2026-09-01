#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import { REV, PARENT } from "./a102r12-source-boundary.mjs";
const sha256=(bytes)=>crypto.createHash("sha256").update(bytes).digest("hex");
const ledger=JSON.parse(fs.readFileSync("config/pass36/a102r12-approved-admin-product-draft-browser-state-changes.json","utf8"));
const checks=[]; const add=(id,passed,detail=null)=>checks.push({id,passed:Boolean(passed),detail});
add("identity",ledger.revisionId===REV&&ledger.parentRevisionId===PARENT);
add("schema",ledger.schemaVersion==="velmere.pass36.a102r12.approved-admin-product-draft-browser-state-changes.v1");
add("rows",Array.isArray(ledger.approvedChanges)&&ledger.approvedChanges.length===1,ledger.approvedChanges?.length);
for(const row of ledger.approvedChanges??[]){
 const bytes=fs.readFileSync(row.path);
 add(`current:${row.path}`,row.currentByteLength===bytes.length&&row.currentSha256===sha256(bytes));
 add(`history:${row.path}`,row.parentRevisionId===PARENT&&/^[a-f0-9]{64}$/u.test(row.historicalSha256)&&row.historicalByteLength>0&&row.parentBytesRewritten===false);
 add(`changed:${row.path}`,row.historicalSha256!==row.currentSha256&&row.historicalByteLength!==row.currentByteLength);
 add(`test:${row.path}`,row.requiredLocalTest==="PASS_A102R12_ADMIN_PRODUCT_DRAFT_BROWSER_STATE_LOCAL_ONLY");
}
const expected=["lib/security/admin-product-draft-browser-state.ts","scripts/pass36/test-a102r12-admin-product-draft-browser-state.ts"].sort();
add("new-files",ledger.newFiles?.map((row)=>row.path).sort().join(",")===expected.join(",")&&ledger.newFiles.every((row)=>fs.existsSync(row.path)));
const c=ledger.claims??{};
add("claims",c.parentHistoricalPassRewritten===false&&c.adminProductDraftLocalStorageAuthorityRemoved===true&&c.legacyAdminProductDraftRowsPurgedWithoutReadOrMigration===true&&c.adminProductDraftCurrentTabMemoryOnly===true&&c.adminProductDraftAccountScopeDigestRequired===true&&c.adminProductDraftCrossScopeRestoreForbidden===true&&c.adminProductDraftSnapshotMaxDrafts===100&&c.adminProductDraftSnapshotMaxBytes===8388608&&c.adminProductDraftDefensiveCloneRequired===true&&c.adminProductImportResponseStrictJsonRequired===true&&c.duplicateAndPrototypeKeysFailClosed===true&&c.durableServerAdminDraftStorageProven===false&&c.realAdminBrowserLogoutAccountSwitchRowsExecuted===0&&c.freshExactBuildBrowserCredit===false&&c.realCredit===false&&c.liveProven===false&&c.saleEnabled===false&&c.productionApproved===false&&c.worldClassProven===false,c);
const failed=checks.filter((row)=>!row.passed);
console.log(JSON.stringify({status:failed.length?"FAIL_A102R12_APPROVED_ADMIN_PRODUCT_DRAFT_BROWSER_STATE_CHANGES":"PASS_A102R12_APPROVED_ADMIN_PRODUCT_DRAFT_BROWSER_STATE_CHANGES_NO_PROMOTION",revisionId:REV,checks:checks.length,passed:checks.length-failed.length,failed:failed.length,results:checks},null,2));
process.exit(failed.length?1:0);
