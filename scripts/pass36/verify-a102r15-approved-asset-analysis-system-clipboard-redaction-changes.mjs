#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
const REV = "VELMERE_PASS36_A102R15_ACTION_REQUIRED_ASSET_ANALYSIS_SYSTEM_CLIPBOARD_PACKET_RECEIPT_SOURCE_CLAIM_AND_TIMESTAMP_REDACTION_FAIL_CLOSED_NO_REAL_CREDIT";
const PARENT = "VELMERE_PASS36_A102R14_ACTION_REQUIRED_SOURCE_PACKAGE_UPLOAD_RECOVERY_AND_BROWSER_SHIELD_HANDOFF_SESSION_STORAGE_QUERY_TIER_PRIVACY_FAIL_CLOSED_NO_REAL_CREDIT";
const file = "config/pass36/a102r15-approved-asset-analysis-system-clipboard-redaction-changes.json";
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const data = JSON.parse(fs.readFileSync(file, "utf8"));
const checks = [];
const add = (id, passed, detail = null) => checks.push({ id, passed: Boolean(passed), detail });
add("identity", data.revisionId === REV && data.parentRevisionId === PARENT);
add("schema", data.schemaVersion === "velmere.pass36.a102r15.approved-asset-analysis-system-clipboard-redaction-changes.v1");
add("changed-count", Array.isArray(data.approvedChanges) && data.approvedChanges.length === 3, data.approvedChanges?.length);
for (const row of data.approvedChanges ?? []) {
  const bytes = fs.readFileSync(row.path);
  add(`current:${row.path}`, row.currentByteLength === bytes.length && row.currentSha256 === sha256(bytes));
  add(`history:${row.path}`, row.parentRevisionId === PARENT && /^[a-f0-9]{64}$/u.test(row.historicalSha256) && row.historicalByteLength > 0 && row.parentBytesRewritten === false);
  add(`changed:${row.path}`, row.historicalSha256 !== row.currentSha256 || row.historicalByteLength !== row.currentByteLength);
  add(`test:${row.path}`, row.requiredLocalTest === "PASS_A102R15_ASSET_ANALYSIS_CLIPBOARD_REDACTION_BOUNDARY_LOCAL_ONLY");
}
add("new-test", data.newFiles?.length === 1 && data.newFiles[0]?.path === "scripts/pass36/test-a102r15-asset-analysis-clipboard-redaction.ts" && fs.existsSync(data.newFiles[0].path));
const claims = data.claims ?? {};
add("claims", claims.parentHistoricalPassRewritten === false && claims.fullAssetPacketsCopiedToClipboard === false && claims.receiptOrPacketIdentifiersIncluded === false && claims.sourceLabelsOrTimestampsIncluded === false && claims.sourceClaimsOrHashesIncluded === false && claims.fullManifestBrowserEventDispatched === false && claims.redactedSummaryOnly === true && claims.secureContextRequired === true && claims.realBrowserRowsExecuted === 0 && claims.freshExactBuildBrowserCredit === false && claims.realCredit === false && claims.liveProven === false && claims.saleEnabled === false && claims.productionApproved === false && claims.worldClassProven === false, claims);
const failed = checks.filter((row) => !row.passed);
console.log(JSON.stringify({ status: failed.length ? "FAIL_A102R15_APPROVED_CHANGES" : "PASS_A102R15_APPROVED_ASSET_ANALYSIS_SYSTEM_CLIPBOARD_REDACTION_CHANGES_NO_PROMOTION", revisionId: REV, checks: checks.length, passed: checks.length - failed.length, failed: failed.length, results: checks }, null, 2));
process.exit(failed.length ? 1 : 0);
