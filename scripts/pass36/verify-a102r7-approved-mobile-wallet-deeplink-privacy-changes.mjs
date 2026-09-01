#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import { REV, PARENT } from "./a102r7-source-boundary.mjs";
const sha256=(b)=>crypto.createHash("sha256").update(b).digest("hex");
const ledger=JSON.parse(fs.readFileSync("config/pass36/a102r7-approved-mobile-wallet-deeplink-privacy-changes.json","utf8"));
const checks=[]; const add=(id,passed,detail=null)=>checks.push({id,passed:Boolean(passed),detail});
add("identity",ledger.revisionId===REV&&ledger.parentRevisionId===PARENT);
add("schema",ledger.schemaVersion==="velmere.pass36.a102r7.approved-mobile-wallet-deeplink-privacy-changes.v1");
add("rows",Array.isArray(ledger.approvedChanges)&&ledger.approvedChanges.length===1);
for(const row of ledger.approvedChanges??[]){
 const bytes=fs.readFileSync(row.path);
 add(`current:${row.path}`,row.currentByteLength===bytes.length&&row.currentSha256===sha256(bytes));
 add(`history:${row.path}`,row.parentRevisionId===PARENT&&/^[a-f0-9]{64}$/u.test(row.historicalSha256)&&row.historicalByteLength>0&&row.parentBytesRewritten===false);
 add(`test:${row.path}`,row.requiredLocalTest==="PASS_A102R7_MOBILE_WALLET_DEEPLINK_QUERY_HASH_PRIVATE_PATH_FAIL_CLOSED_NO_PROMOTION");
}
add("new-files",ledger.newFiles?.map((r)=>r.path).join(",")==="scripts/pass36/test-a102r7-mobile-wallet-deeplink-privacy-boundary.ts"&&ledger.newFiles.every((r)=>fs.existsSync(r.path)));
add("claims",ledger.claims?.parentHistoricalPassRewritten===false&&ledger.claims?.currentQueryForwardedToWalletProvider===false&&ledger.claims?.currentFragmentForwardedToWalletProvider===false&&ledger.claims?.privateDynamicPathForwardedToWalletProvider===false&&ledger.claims?.validatedOriginAndAllowlistedPublicPathOnly===true&&ledger.claims?.freshExactBuildBrowserCredit===false&&ledger.claims?.realMobileWalletBrowserCredit===false&&ledger.claims?.realCredit===false&&ledger.claims?.liveProven===false&&ledger.claims?.saleEnabled===false);
const failed=checks.filter((r)=>!r.passed);
console.log(JSON.stringify({status:failed.length?"FAIL_A102R7_APPROVED_MOBILE_WALLET_DEEPLINK_PRIVACY_CHANGES":"PASS_A102R7_APPROVED_MOBILE_WALLET_DEEPLINK_PRIVACY_CHANGES_NO_PROMOTION",revisionId:REV,checks:checks.length,passed:checks.length-failed.length,failed:failed.length,results:checks},null,2));
process.exit(failed.length?1:0);
