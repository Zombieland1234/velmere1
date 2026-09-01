#!/usr/bin/env node
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { REV, PARENT, MANIFEST, STATE, PROGRAM } from "./a102r15-source-boundary.mjs";
const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const authority = read("config/pass36/current-release-authority.json"), mirror = read("config/pass35/current-revision.json"), legacy = read("config/current-release.json"), state = read(STATE), program = read(PROGRAM), a58 = read("config/pass36/a58-release-integrity-policy.json"), pkg = read("package.json"), active = fs.readFileSync("VELMERE_ACTIVE_PASS.txt", "utf8").trim(), readme = fs.readFileSync("README.md", "utf8"), clean = fs.readFileSync("CLEAN_SAFE_README.md", "utf8");
const checks = [];
const add = (id, passed, detail = null) => checks.push({ id, passed: Boolean(passed), detail });
add("active", active === REV);
add("authority", authority.authorityRevisionId === REV && authority.parentRevisionId === PARENT && authority.currentSource?.revisionId === REV && authority.currentSource?.parentRevisionId === PARENT);
add("pointers", authority.currentRootDescendantManifestPath === MANIFEST && authority.worldClassCompletionProgramPath === PROGRAM && authority.worldClassCompletionProgramRevisionId === REV);
const plane = authority.planes?.a102r15LocalClosure;
add("plane", plane?.revisionId === REV && plane?.boundaryChecks === 54 && plane?.rawAssetClipboardSinksRemoved === 3 && plane?.redactedSummaryOnly === true && plane?.receiptPacketIdentifiersIncluded === false && plane?.sourceLabelsTimestampsClaimsIncluded === false && plane?.realBrowserRows === 0 && plane?.realCredit === false, plane);
add("claims", authority.claims?.currentRevisionId === REV && authority.claims?.parentRevisionId === PARENT && authority.claims?.decision === "NO_GO" && authority.claims?.liveProven === false && authority.claims?.saleEnabled === false && authority.claims?.productionApproved === false && authority.claims?.worldClassProven === false);
add("mirror", mirror.sourceRevisionId === REV && mirror.parentSourceRevisionId === PARENT && mirror.worldClassCompletionProgramRevisionId === REV && mirror.a102r15AssetAnalysisClipboardBoundaryChecks === 54 && mirror.a102r15ExactReleaseCredit === false);
add("legacy", legacy.authoritativeCurrentSourceRevisionId === REV && legacy.authoritativeCurrentSourceParentRevisionId === PARENT && legacy.a102r15AssetAnalysisClipboardBoundaryChecks === 54);
add("state", state.revisionId === REV && state.parentRevisionId === PARENT && state.completedThrough === 89);
add("program", program.revisionId === REV && program.formalRemainingEntries === 31);
add("a58", a58.currentCheckpointRevisionId === REV && a58.currentCheckpointParentRevisionId === PARENT && a58.currentDescendantManifestPath === MANIFEST && a58.currentAuthorityVerifierPath === "scripts/pass36/verify-a102r15-action-required-authority.mjs" && a58.archiveManifestPath === "_velmere/PASS36_A102R15_SOURCE_ONLY_MANIFEST.json" && a58.archiveManifestSchemaVersion === "velmere.pass36.a102r15.source-only-package-manifest.v1");
add("package", pkg.velmerePass === REV && pkg.velmerePatch === "VELMERE_A102R15_PATCH.txt" && pkg.velmereCurrentReleaseAuthorityPass === REV && pkg.velmereWorldClassCompletionProgramPath === PROGRAM && pkg.velmereCurrentRootDescendantManifestPath === MANIFEST && pkg.velmere?.currentRevisionId === REV && pkg.velmere?.currentRevisionParentId === PARENT && pkg.velmere?.worldClassCompletionProgramPath === PROGRAM && pkg.velmere?.currentRootDescendantManifestPath === MANIFEST);
add("readme", readme.startsWith("# Current checkpoint — A102R15") && readme.includes(REV) && clean.startsWith("# Current checkpoint — A102R15") && clean.includes(REV));
for (const [id, script, status] of [
  ["approved", "scripts/pass36/verify-a102r15-approved-asset-analysis-system-clipboard-redaction-changes.mjs", "PASS_A102R15_APPROVED_ASSET_ANALYSIS_SYSTEM_CLIPBOARD_REDACTION_CHANGES_NO_PROMOTION"],
  ["receipt", "scripts/pass36/verify-a102r15-local-regression-receipt.mjs", "PASS_A102R15_LOCAL_REGRESSION_RECEIPT_ACTION_REQUIRED_NO_PROMOTION"],
  ["descendant", "scripts/pass36/verify-a102r15-current-root-descendant.mjs", "PASS_A102R15_DESCENDANT_ACTION_REQUIRED_NO_PROMOTION"],
]) {
  const child = spawnSync(process.execPath, [script], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  add(`child:${id}`, child.status === 0 && child.stdout.includes(status), { status: child.status, stdout: child.stdout.slice(-600), stderr: child.stderr.slice(-300) });
}
const failed = checks.filter((row) => !row.passed);
console.log(JSON.stringify({ status: failed.length ? "FAIL_A102R15_ACTION_REQUIRED_AUTHORITY" : "PASS_A102R15_ACTION_REQUIRED_AUTHORITY_NO_REAL_BUILD_BROWSER_STAGING_OR_SALE_CREDIT", revisionId: REV, checks: checks.length, passed: checks.length - failed.length, failed: failed.length, results: checks, globalDecision: "NO_GO", live: false, saleEnabled: false, productionApproved: false, worldClassProven: false }, null, 2));
process.exit(failed.length ? 1 : 0);
