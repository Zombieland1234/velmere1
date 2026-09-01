#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { canonicalJson } from "../pass4826/release-package-contract.mjs";
import { collectA102R41Inventory } from "./package-a102r41-deterministic.mjs";

const REV = "VELMERE_PASS36_A102R41_ACTION_REQUIRED_SECURITY_EVIDENCE_AUTHORITY_EXACT_WINDOWS_AND_FAIL_CLOSED_RELEASE_PACKAGING_NO_LIVE_CREDIT";
const PARENT = "VELMERE_PASS36_A102R40_ACTION_REQUIRED_CURRENT_SOURCE_AUTHORITY_EXACT_BUILD_PREFLIGHT_AND_STALE_RELEASE_POINTER_RECONCILIATION_NO_LIVE_CREDIT";
const ledger = JSON.parse(fs.readFileSync("config/pass36/a102r41-approved-current-source-changes.json", "utf8"));
const parentBytes = fs.readFileSync("config/pass36/a102r41-parent-source-package-manifest.json");
const parent = JSON.parse(parentBytes);
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const checks = [];
const check = (id, value, detail = null) => { checks.push({ id, passed: Boolean(value), detail }); assert.ok(value, id); };
const core = { ...ledger }; delete core.ledgerDigestSha256;
check("schema", ledger.schemaVersion === "velmere.pass36.a102r41.approved-current-source-changes.v1");
check("identity", ledger.revisionId === REV && ledger.parentRevisionId === PARENT);
check("ledger-digest", ledger.ledgerDigestSha256 === sha256(canonicalJson(core)));
check("parent-archive", ledger.parentSourceArchiveByteLength === 127383149 && ledger.parentSourceArchiveSha256 === "2ad24f729083bfd31ef22969dda7a9895f7898764f07d79cdb6da9a1bb38bc16");
check("parent-manifest", sha256(parentBytes) === ledger.parentSourcePackageManifestRawSha256 && parent.manifestSha256 === ledger.parentSourcePackageManifestDigestSha256 && parent.revisionId === PARENT);
check("parent-payload", parent.fileCount === ledger.parentSourcePayloadFileCount && parent.byteLength === ledger.parentSourcePayloadByteLength && parent.pathSetSha256 === ledger.parentSourcePayloadPathSetSha256 && parent.aggregateSha256 === ledger.parentSourcePayloadAggregateSha256);
check("self-exclusions", canonicalJson(ledger.selfExcludedPaths) === canonicalJson(["config/pass36/a102r41-approved-current-source-changes.json", "config/pass36/a102r41-current-root-descendant-manifest.json"]));
check("zero-deletions", Array.isArray(ledger.deletedFiles) && ledger.deletedFiles.length === 0);
check("row-count", ledger.approvedFiles.length === ledger.fileCount && new Set(ledger.approvedFiles.map((row) => row.path)).size === ledger.fileCount);
const parentMap = new Map(parent.entries.map((entry) => [entry.path, entry]));
const currentMap = new Map(collectA102R41Inventory(process.cwd(), "source", { allowReservedManifestInput: true }).rows.map(({ content, ...entry }) => [entry.path, entry]));
const excluded = new Set(ledger.selfExcludedPaths);
const observed = [];
for (const relativePath of [...new Set([...parentMap.keys(), ...currentMap.keys()])].sort()) {
  if (excluded.has(relativePath)) continue;
  const before = parentMap.get(relativePath); const after = currentMap.get(relativePath);
  if (!before && after) observed.push({ path: relativePath, changeType: "ADDED", parentByteLength: null, parentSha256: null, parentMode: null, currentByteLength: after.byteLength, currentSha256: after.sha256, currentMode: after.mode });
  else if (before && !after) observed.push({ path: relativePath, changeType: "DELETED", parentByteLength: before.byteLength, parentSha256: before.sha256, parentMode: before.mode, currentByteLength: null, currentSha256: null, currentMode: null });
  else if (before && after && (before.byteLength !== after.byteLength || before.sha256 !== after.sha256 || before.mode !== after.mode)) observed.push({ path: relativePath, changeType: "MODIFIED", parentByteLength: before.byteLength, parentSha256: before.sha256, parentMode: before.mode, currentByteLength: after.byteLength, currentSha256: after.sha256, currentMode: after.mode });
}
const declared = ledger.approvedFiles.map(({ family, ...row }) => row).sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
check("complete-exact-diff", canonicalJson(observed) === canonicalJson(declared), { observed: observed.length, declared: declared.length });
for (const row of ledger.approvedFiles) {
  check(`path:${row.path}`, typeof row.path === "string" && !path.isAbsolute(row.path) && !row.path.includes("\\") && !row.path.split("/").some((part) => !part || part === "." || part === ".."));
  check(`mode:${row.path}`, row.currentMode === 33188 || row.currentMode === 33261);
  check(`type:${row.path}`, row.changeType === "ADDED" ? row.parentSha256 === null && row.parentByteLength === null && row.parentMode === null : row.changeType === "MODIFIED" && /^[a-f0-9]{64}$/u.test(row.parentSha256) && (row.parentSha256 !== row.currentSha256 || row.parentMode !== row.currentMode));
  check(`family:${row.path}`, typeof row.family === "string" && row.family.length > 5);
}
check("no-promotion", ledger.globalDecision === "NO_GO" && ledger.live === false && ledger.saleEnabled === false && ledger.productionApproved === false && ledger.worldClassProven === false);
const failed = checks.filter((row) => !row.passed);
console.log(JSON.stringify({ schemaVersion: "velmere.pass36.a102r41.approved-current-source-changes-verification.v1", revisionId: REV, status: failed.length === 0 ? "PASS_A102R41_APPROVED_CURRENT_SOURCE_CHANGES_COMPLETE_NO_PROMOTION" : "FAIL", checks: checks.length, passed: checks.length - failed.length, failed: failed.length, fileCount: ledger.fileCount, addedFiles: ledger.addedFiles, modifiedFiles: ledger.modifiedFiles, deletedFiles: ledger.deletedFiles.length, globalDecision: "NO_GO", live: false, saleEnabled: false, productionApproved: false, worldClassProven: false, failures: failed }, null, 2));
if (failed.length) process.exit(1);
