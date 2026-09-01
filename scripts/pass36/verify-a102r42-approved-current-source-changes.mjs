import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { canonicalJson } from "../pass4826/release-package-contract.mjs";
import { collectA102R42Inventory } from "./package-a102r42-deterministic.mjs";
import { parseStrictJsonCli } from "./strict-json-cli.mjs";
import { APPROVED_CHANGE_PATHS, expectedApprovedChange } from "./a102r42-approved-change-policy.mjs";

const REV = "VELMERE_PASS36_A102R42_ACTION_REQUIRED_A60_TOTAL_FAIL_CLOSED_RECEIPT_AND_LOG_CLASSIFIER_BOUNDARY_EXACT_WINDOWS_NO_LIVE_CREDIT";
const PARENT = "VELMERE_PASS36_A102R41_ACTION_REQUIRED_SECURITY_EVIDENCE_AUTHORITY_EXACT_WINDOWS_AND_FAIL_CLOSED_RELEASE_PACKAGING_NO_LIVE_CREDIT";
const readStrict = (relativePath) => parseStrictJsonCli(fs.readFileSync(relativePath, "utf8"), { maxBytes: 16 * 1024 * 1024, maxDepth: 128, maxNodes: 1_000_000, requireObject: true });
const ledger = readStrict("config/pass36/a102r42-approved-current-source-changes.json");
const parentBytes = fs.readFileSync("config/pass36/a102r42-parent-source-package-manifest.json");
const parent = parseStrictJsonCli(parentBytes.toString("utf8"), { maxBytes: 16 * 1024 * 1024, maxDepth: 128, maxNodes: 1_000_000, requireObject: true });
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const isFrozenHistoricalPath = (relativePath) => {
  if (/^config\/pass36\/(?:a[0-9]+(?:r[0-9]+)?)-current-root-descendant-manifest\.json$/iu.test(relativePath)) {
    return relativePath !== "config/pass36/a102r42-current-root-descendant-manifest.json";
  }
  const match = relativePath.match(/(?:^|[/_.-])a102r([0-9]+)(?:[/_.-]|$)/iu);
  if (match !== null) return Number(match[1]) >= 1 && Number(match[1]) <= 41;
  return false;
};
const checks = [];
const check = (id, value, detail = null) => { checks.push({ id, passed: Boolean(value), detail }); assert.ok(value, id); };
const core = { ...ledger }; delete core.ledgerDigestSha256;
check("schema", ledger.schemaVersion === "velmere.pass36.a102r42.approved-current-source-changes.v1");
check("identity", ledger.revisionId === REV && ledger.parentRevisionId === PARENT);
check("ledger-digest", ledger.ledgerDigestSha256 === sha256(canonicalJson(core)));
check("parent-archive", ledger.parentSourceArchiveByteLength === 129505716 && ledger.parentSourceArchiveSha256 === "569ec6ee9925b86daa5eb9238110500943839a90564a0cb558d3a2d52b22ee96");
const parentDescendantBytes = fs.readFileSync("config/pass36/a102r41-current-root-descendant-manifest.json");
check("parent-manifest", sha256(parentBytes) === ledger.parentSourcePackageManifestRawSha256 && parent.manifestSha256 === ledger.parentSourcePackageManifestDigestSha256 && parent.revisionId === PARENT && sha256(parentDescendantBytes) === "dfa91c49372c5a858071dbcf9c0ff0f0a1ef63722bd7fcb8e197deaf2e3e3859" && ledger.parentDescendantRawSha256 === sha256(parentDescendantBytes));
const parentMap = new Map(parent.entries.map((entry) => [entry.path, entry]));
const currentMap = new Map(collectA102R42Inventory(process.cwd(), "source", { allowReservedManifestInput: true }).rows.map(({ content, ...entry }) => [entry.path, entry]));
const frozenHistoricalPaths = [...parentMap.keys()].filter(isFrozenHistoricalPath).sort();
const injectedHistoricalPaths = [...currentMap.keys()].filter(isFrozenHistoricalPath).filter((relativePath) => !parentMap.has(relativePath)).sort();
const frozenHistoryExact = frozenHistoricalPaths.every((relativePath) => {
  const before = parentMap.get(relativePath); const after = currentMap.get(relativePath);
  return after && before.byteLength === after.byteLength && before.sha256 === after.sha256 && before.mode === after.mode;
});
check("parent-payload", parent.fileCount === ledger.parentSourcePayloadFileCount && parent.byteLength === ledger.parentSourcePayloadByteLength && parent.pathSetSha256 === ledger.parentSourcePayloadPathSetSha256 && parent.aggregateSha256 === ledger.parentSourcePayloadAggregateSha256 && ledger.frozenHistoricalRevisionMaximum === 41 && isFrozenHistoricalPath("config/pass36/a102r1-evidence.json") && isFrozenHistoricalPath("scripts/pass36/verify-a102r40-history.mjs") && isFrozenHistoricalPath("VELMERE_A102R41_PATCH.txt") && isFrozenHistoricalPath("config/pass36/a80-current-root-descendant-manifest.json") && isFrozenHistoricalPath("config/pass36/a102-current-root-descendant-manifest.json") && isFrozenHistoricalPath("config/pass36/a102r43-current-root-descendant-manifest.json") && !isFrozenHistoricalPath("config/pass36/a102r42-current-root-descendant-manifest.json") && !isFrozenHistoricalPath("config/pass36/a102r42-current.json") && ledger.frozenHistoricalPathCount === frozenHistoricalPaths.length && canonicalJson(ledger.frozenHistoricalPaths) === canonicalJson(frozenHistoricalPaths) && ledger.frozenHistoricalPathSetSha256 === sha256(frozenHistoricalPaths.join("\n")) && ledger.frozenHistoricalAggregateSha256 === sha256(frozenHistoricalPaths.map((relativePath) => { const row = parentMap.get(relativePath); return `${relativePath}\0${row.byteLength}\0${row.sha256}\0${row.mode}`; }).join("\n")) && frozenHistoryExact && injectedHistoricalPaths.length === 0 && canonicalJson(ledger.injectedHistoricalPaths) === canonicalJson([]));
check("self-exclusions", canonicalJson(ledger.selfExcludedPaths) === canonicalJson(["config/pass36/a102r42-approved-current-source-changes.json", "config/pass36/a102r42-current-root-descendant-manifest.json"]));
check("zero-deletions", Array.isArray(ledger.deletedFiles) && ledger.deletedFiles.length === 0);
check("row-count", ledger.approvedFiles.length === ledger.fileCount && new Set(ledger.approvedFiles.map((row) => row.path)).size === ledger.fileCount && ledger.addedFiles === ledger.approvedFiles.filter((row) => row.changeType === "ADDED").length && ledger.modifiedFiles === ledger.approvedFiles.filter((row) => row.changeType === "MODIFIED").length && ledger.addedFiles + ledger.modifiedFiles === ledger.fileCount);
const excluded = new Set(ledger.selfExcludedPaths);
const observed = [];
for (const relativePath of [...new Set([...parentMap.keys(), ...currentMap.keys()])].sort()) {
  if (excluded.has(relativePath)) continue;
  const before = parentMap.get(relativePath); const after = currentMap.get(relativePath);
  if (!before && after) { const policy = expectedApprovedChange(relativePath); observed.push({ path: relativePath, changeType: "ADDED", parentByteLength: null, parentSha256: null, parentMode: null, currentByteLength: after.byteLength, currentSha256: after.sha256, currentMode: after.mode, family: policy?.family ?? null, reason: policy?.reason ?? null }); }
  else if (before && !after) observed.push({ path: relativePath, changeType: "DELETED", parentByteLength: before.byteLength, parentSha256: before.sha256, parentMode: before.mode, currentByteLength: null, currentSha256: null, currentMode: null });
  else if (before && after && (before.byteLength !== after.byteLength || before.sha256 !== after.sha256 || before.mode !== after.mode)) { const policy = expectedApprovedChange(relativePath); observed.push({ path: relativePath, changeType: "MODIFIED", parentByteLength: before.byteLength, parentSha256: before.sha256, parentMode: before.mode, currentByteLength: after.byteLength, currentSha256: after.sha256, currentMode: after.mode, family: policy?.family ?? null, reason: policy?.reason ?? null }); }
}
const declared = [...ledger.approvedFiles].sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
check("complete-exact-diff", canonicalJson(observed) === canonicalJson(declared) && canonicalJson(declared.map((row) => row.path)) === canonicalJson(APPROVED_CHANGE_PATHS) && ledger.approvedPolicyPathSetSha256 === sha256(APPROVED_CHANGE_PATHS.join("\n")), { observed: observed.length, declared: declared.length });
for (const row of ledger.approvedFiles) {
  check(`path:${row.path}`, typeof row.path === "string" && !path.isAbsolute(row.path) && !row.path.includes("\\") && !row.path.split("/").some((part) => !part || part === "." || part === ".."));
  check(`mode:${row.path}`, row.currentMode === 33188 || row.currentMode === 33261);
  check(`type:${row.path}`, row.changeType === "ADDED" ? row.parentSha256 === null && row.parentByteLength === null && row.parentMode === null : row.changeType === "MODIFIED" && /^[a-f0-9]{64}$/u.test(row.parentSha256) && (row.parentSha256 !== row.currentSha256 || row.parentMode !== row.currentMode));
  const policy = expectedApprovedChange(row.path);
  check(`family:${row.path}`, policy !== null && row.changeType === policy.changeType && row.family === policy.family && row.reason === policy.reason);
}
check("no-promotion", ledger.globalDecision === "NO_GO" && ledger.live === false && ledger.saleEnabled === false && ledger.productionApproved === false && ledger.worldClassProven === false);
const failed = checks.filter((row) => !row.passed);
assert.equal(checks.length, 11 + 4 * ledger.fileCount, "a102r42_approved_verifier_denominator");
console.log(JSON.stringify({ schemaVersion: "velmere.pass36.a102r42.approved-current-source-changes-verification.v1", revisionId: REV, status: failed.length === 0 ? "PASS_A102R42_APPROVED_CURRENT_SOURCE_CHANGES_COMPLETE_NO_PROMOTION" : "FAIL", checks: checks.length, passed: checks.length - failed.length, failed: failed.length, fileCount: ledger.fileCount, addedFiles: ledger.addedFiles, modifiedFiles: ledger.modifiedFiles, deletedFiles: ledger.deletedFiles.length, globalDecision: "NO_GO", live: false, saleEnabled: false, productionApproved: false, worldClassProven: false, failures: failed }, null, 2));
if (failed.length) process.exit(1);
