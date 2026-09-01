import crypto from "node:crypto";
import fs from "node:fs";
import { canonicalJson } from "../pass4826/release-package-contract.mjs";
import { collectA102R42Inventory } from "./package-a102r42-deterministic.mjs";
import { parseStrictJsonCli } from "./strict-json-cli.mjs";
import { APPROVED_CHANGE_PATHS, expectedApprovedChange } from "./a102r42-approved-change-policy.mjs";

const REV = "VELMERE_PASS36_A102R42_ACTION_REQUIRED_A60_TOTAL_FAIL_CLOSED_RECEIPT_AND_LOG_CLASSIFIER_BOUNDARY_EXACT_WINDOWS_NO_LIVE_CREDIT";
const PARENT = "VELMERE_PASS36_A102R41_ACTION_REQUIRED_SECURITY_EVIDENCE_AUTHORITY_EXACT_WINDOWS_AND_FAIL_CLOSED_RELEASE_PACKAGING_NO_LIVE_CREDIT";
const OUTPUT = "config/pass36/a102r42-approved-current-source-changes.json";
const PARENT_MANIFEST_PATH = "config/pass36/a102r42-parent-source-package-manifest.json";
const SELF_EXCLUDED = new Set([OUTPUT, "config/pass36/a102r42-current-root-descendant-manifest.json"]);
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const isFrozenHistoricalPath = (relativePath) => {
  if (/^config\/pass36\/(?:a[0-9]+(?:r[0-9]+)?)-current-root-descendant-manifest\.json$/iu.test(relativePath)) {
    return relativePath !== "config/pass36/a102r42-current-root-descendant-manifest.json";
  }
  const match = relativePath.match(/(?:^|[/_.-])a102r([0-9]+)(?:[/_.-]|$)/iu);
  if (match !== null) return Number(match[1]) >= 1 && Number(match[1]) <= 41;
  return false;
};

const parentBytes = fs.readFileSync(PARENT_MANIFEST_PATH);
const parent = parseStrictJsonCli(parentBytes.toString("utf8"), { maxBytes: 16 * 1024 * 1024, maxDepth: 128, maxNodes: 1_000_000, requireObject: true });
if (sha256(parentBytes) !== "8925e849d7c625e82fe9d4e85040da5a818f995c99d80e50e6c627a963f334b3") throw new Error("a102r42_parent_manifest_raw_hash");
if (parent.manifestSha256 !== "9e3baa4830255919873e56d9c19be76d8f87c84d605629d63f8ee215bdf9930b" || parent.revisionId !== PARENT) throw new Error("a102r42_parent_manifest_identity");
const parentMap = new Map(parent.entries.map((entry) => [entry.path, entry]));
const currentRows = collectA102R42Inventory(process.cwd(), "source", { allowReservedManifestInput: true }).rows;
const currentMap = new Map(currentRows.map(({ content, ...entry }) => [entry.path, entry]));
const parentDescendantBytes = fs.readFileSync("config/pass36/a102r41-current-root-descendant-manifest.json");
if (sha256(parentDescendantBytes) !== "dfa91c49372c5a858071dbcf9c0ff0f0a1ef63722bd7fcb8e197deaf2e3e3859") throw new Error("a102r42_parent_descendant_raw_hash");
const frozenHistoricalPaths = [...parentMap.keys()].filter(isFrozenHistoricalPath).sort();
const injectedHistoricalPaths = [...currentMap.keys()].filter(isFrozenHistoricalPath).filter((relativePath) => !parentMap.has(relativePath)).sort();
if (injectedHistoricalPaths.length) throw new Error(`a102r42_injected_historical_paths_forbidden:${JSON.stringify(injectedHistoricalPaths)}`);
for (const relativePath of frozenHistoricalPaths) {
  const before = parentMap.get(relativePath);
  const after = currentMap.get(relativePath);
  if (!after || before.byteLength !== after.byteLength || before.sha256 !== after.sha256 || before.mode !== after.mode) {
    throw new Error(`a102r42_frozen_r41_history_mutation:${relativePath}`);
  }
}
const approvedFiles = [];
const deletedFiles = [];
for (const relativePath of [...new Set([...parentMap.keys(), ...currentMap.keys()])].sort()) {
  if (SELF_EXCLUDED.has(relativePath)) continue;
  const before = parentMap.get(relativePath);
  const after = currentMap.get(relativePath);
  if (!before && after) {
    const policy = expectedApprovedChange(relativePath);
    if (!policy || policy.changeType !== "ADDED") throw new Error(`a102r42_unapproved_current_change:${relativePath}:ADDED`);
    approvedFiles.push({ path: relativePath, changeType: "ADDED", parentByteLength: null, parentSha256: null, parentMode: null, currentByteLength: after.byteLength, currentSha256: after.sha256, currentMode: after.mode, family: policy.family, reason: policy.reason });
  }
  else if (before && !after) deletedFiles.push({ path: relativePath, parentByteLength: before.byteLength, parentSha256: before.sha256, parentMode: before.mode });
  else if (before && after && (before.byteLength !== after.byteLength || before.sha256 !== after.sha256 || before.mode !== after.mode)) {
    const policy = expectedApprovedChange(relativePath);
    if (!policy || policy.changeType !== "MODIFIED") throw new Error(`a102r42_unapproved_current_change:${relativePath}:MODIFIED`);
    approvedFiles.push({ path: relativePath, changeType: "MODIFIED", parentByteLength: before.byteLength, parentSha256: before.sha256, parentMode: before.mode, currentByteLength: after.byteLength, currentSha256: after.sha256, currentMode: after.mode, family: policy.family, reason: policy.reason });
  }
}
if (deletedFiles.length) throw new Error(`a102r42_deleted_files_forbidden:${JSON.stringify(deletedFiles)}`);
if (approvedFiles.length !== APPROVED_CHANGE_PATHS.length || approvedFiles.some((row, index) => row.path !== APPROVED_CHANGE_PATHS[index])) throw new Error("a102r42_approved_change_policy_incomplete_or_extra");
const core = {
  schemaVersion: "velmere.pass36.a102r42.approved-current-source-changes.v1",
  revisionId: REV,
  parentRevisionId: PARENT,
  generatedAt: "2026-08-01T23:05:00+02:00",
  parentSourceArchiveFileName: `${PARENT}_SOURCE_ONLY.zip`,
  parentSourceArchiveByteLength: 129505716,
  parentSourceArchiveSha256: "569ec6ee9925b86daa5eb9238110500943839a90564a0cb558d3a2d52b22ee96",
  parentSourcePackageManifestPath: PARENT_MANIFEST_PATH,
  parentSourcePackageManifestRawSha256: sha256(parentBytes),
  parentSourcePackageManifestDigestSha256: parent.manifestSha256,
  parentSourcePayloadFileCount: parent.fileCount,
  parentSourcePayloadByteLength: parent.byteLength,
  parentSourcePayloadPathSetSha256: parent.pathSetSha256,
  parentSourcePayloadAggregateSha256: parent.aggregateSha256,
  selfExcludedPaths: [...SELF_EXCLUDED].sort(),
  fileCount: approvedFiles.length,
  addedFiles: approvedFiles.filter((row) => row.changeType === "ADDED").length,
  modifiedFiles: approvedFiles.filter((row) => row.changeType === "MODIFIED").length,
  deletedFiles,
  approvedFiles,
  approvedPolicyPathSetSha256: sha256(APPROVED_CHANGE_PATHS.join("\n")),
  frozenHistoricalPathCount: frozenHistoricalPaths.length,
  frozenHistoricalRevisionMaximum: 41,
  frozenHistoricalPaths,
  injectedHistoricalPaths,
  frozenHistoricalPathSetSha256: sha256(frozenHistoricalPaths.join("\n")),
  frozenHistoricalAggregateSha256: sha256(frozenHistoricalPaths.map((relativePath) => {
    const row = parentMap.get(relativePath);
    return `${relativePath}\0${row.byteLength}\0${row.sha256}\0${row.mode}`;
  }).join("\n")),
  parentDescendantRawSha256: sha256(parentDescendantBytes),
  changeApprovalClass: "PRIMARY_AGENT_LOCAL_A60_FAIL_CLOSED_DESCENDANT_NO_EXTERNAL_DUAL_CONTROL_CREDIT",
  globalDecision: "NO_GO",
  live: false,
  saleEnabled: false,
  productionApproved: false,
  worldClassProven: false
};
const output = { ...core, ledgerDigestSha256: sha256(canonicalJson(core)) };
fs.writeFileSync(OUTPUT, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ status: "BUILT_A102R42_APPROVED_CURRENT_SOURCE_CHANGES_NO_PROMOTION", fileCount: output.fileCount, addedFiles: output.addedFiles, modifiedFiles: output.modifiedFiles, deletedFiles: 0, ledgerDigestSha256: output.ledgerDigestSha256 }, null, 2));
