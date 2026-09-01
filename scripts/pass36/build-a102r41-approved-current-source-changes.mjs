#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import { canonicalJson } from "../pass4826/release-package-contract.mjs";
import { collectA102R41Inventory } from "./package-a102r41-deterministic.mjs";

const REV = "VELMERE_PASS36_A102R41_ACTION_REQUIRED_SECURITY_EVIDENCE_AUTHORITY_EXACT_WINDOWS_AND_FAIL_CLOSED_RELEASE_PACKAGING_NO_LIVE_CREDIT";
const PARENT = "VELMERE_PASS36_A102R40_ACTION_REQUIRED_CURRENT_SOURCE_AUTHORITY_EXACT_BUILD_PREFLIGHT_AND_STALE_RELEASE_POINTER_RECONCILIATION_NO_LIVE_CREDIT";
const OUTPUT = "config/pass36/a102r41-approved-current-source-changes.json";
const PARENT_MANIFEST_PATH = "config/pass36/a102r41-parent-source-package-manifest.json";
const SELF_EXCLUDED = new Set([OUTPUT, "config/pass36/a102r41-current-root-descendant-manifest.json"]);
const root = process.cwd();
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

function family(relativePath) {
  if (relativePath === "package.json" || relativePath === "VELMERE_ACTIVE_PASS.txt" || relativePath === "config/current-release.json" || relativePath === "config/pass35/current-revision.json" || relativePath === "config/pass36/current-release-authority.json" || relativePath === "config/pass36/a58-release-integrity-policy.json") return "CURRENT_AUTHORITY";
  if (relativePath.includes("roadmap") || relativePath.endsWith("README.md") || relativePath === "VELMERE_A102R41_PATCH.txt") return "ROADMAP_AND_DOCUMENTATION";
  if (relativePath.startsWith("app/api/checkout/") || relativePath.startsWith("app/api/market-integrity/account-operations/") || relativePath.startsWith("components/account/") || relativePath.startsWith("lib/commerce/") || relativePath.startsWith("lib/security/") || relativePath.startsWith("lib/worldclass/")) return "SECURITY_PRIVACY_EVIDENCE_BOUNDARY";
  if (relativePath.startsWith("supabase/migrations/")) return "DATABASE_RLS_REMEDIATION";
  if (relativePath.startsWith("scripts/pass36/") || relativePath.startsWith("config/pass36/")) return "RELEASE_TEST_AND_STATIC_POLICY";
  return "APPROVED_SUPPORTING_CHANGE";
}

const parentBytes = fs.readFileSync(PARENT_MANIFEST_PATH);
const parent = JSON.parse(parentBytes);
if (sha256(parentBytes) !== "54462e5a872fbaf87c4c89a3b0fe891c42edf9786a819d9f08c083a5f12b04b6") throw new Error("a102r41_parent_manifest_raw_hash");
if (parent.manifestSha256 !== "cb7dbd7334dec461a77b347f562fe4cf7c8abb0dc59c30ec53172aba8b289dd6" || parent.revisionId !== PARENT) throw new Error("a102r41_parent_manifest_identity");
const parentMap = new Map(parent.entries.map((entry) => [entry.path, entry]));
const currentRows = collectA102R41Inventory(root, "source").rows;
const currentMap = new Map(currentRows.map(({ content, ...entry }) => [entry.path, entry]));
const approvedFiles = [];
const deletedFiles = [];
for (const relativePath of [...new Set([...parentMap.keys(), ...currentMap.keys()])].sort()) {
  if (SELF_EXCLUDED.has(relativePath)) continue;
  const before = parentMap.get(relativePath);
  const after = currentMap.get(relativePath);
  if (!before && after) approvedFiles.push({ path: relativePath, changeType: "ADDED", parentByteLength: null, parentSha256: null, parentMode: null, currentByteLength: after.byteLength, currentSha256: after.sha256, currentMode: after.mode, family: family(relativePath) });
  else if (before && !after) deletedFiles.push({ path: relativePath, parentByteLength: before.byteLength, parentSha256: before.sha256, parentMode: before.mode });
  else if (before && after && (before.byteLength !== after.byteLength || before.sha256 !== after.sha256 || before.mode !== after.mode)) approvedFiles.push({ path: relativePath, changeType: "MODIFIED", parentByteLength: before.byteLength, parentSha256: before.sha256, parentMode: before.mode, currentByteLength: after.byteLength, currentSha256: after.sha256, currentMode: after.mode, family: family(relativePath) });
}
if (deletedFiles.length) throw new Error(`a102r41_deleted_files_forbidden:${JSON.stringify(deletedFiles)}`);
const core = {
  schemaVersion: "velmere.pass36.a102r41.approved-current-source-changes.v1",
  revisionId: REV,
  parentRevisionId: PARENT,
  generatedAt: "2026-08-01T09:43:26+02:00",
  parentSourceArchiveObservedFileName: `${PARENT}_SOURCE_ONLY(1).zip`,
  parentSourceArchiveCanonicalFileName: `${PARENT}_SOURCE_ONLY.zip`,
  parentSourceArchiveByteLength: 127383149,
  parentSourceArchiveSha256: "2ad24f729083bfd31ef22969dda7a9895f7898764f07d79cdb6da9a1bb38bc16",
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
  changeApprovalClass: "PRIMARY_AGENT_LOCAL_SECURITY_AND_RELEASE_AUTHORITY_REVISION_NO_EXTERNAL_DUAL_CONTROL_CREDIT",
  globalDecision: "NO_GO",
  live: false,
  saleEnabled: false,
  productionApproved: false,
  worldClassProven: false,
};
const output = { ...core, ledgerDigestSha256: sha256(canonicalJson(core)) };
fs.writeFileSync(OUTPUT, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ status: "BUILT_A102R41_APPROVED_CURRENT_SOURCE_CHANGES_NO_PROMOTION", fileCount: output.fileCount, addedFiles: output.addedFiles, modifiedFiles: output.modifiedFiles, deletedFiles: 0, ledgerDigestSha256: output.ledgerDigestSha256 }, null, 2));
