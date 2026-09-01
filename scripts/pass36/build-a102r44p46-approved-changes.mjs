#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PARENT, REVISION } from "./build-a102r44p46-current-pointers.mjs";
import { SOURCE_MANIFEST_PATH, collectTree } from "./r44p46-packaging-lib.mjs";

export const APPROVED_PATH = "config/pass36/r44p46-approved-source-changes.json";
export const PARENT_MANIFEST_PATH = "_velmere/PASS36_A102R44P45_SOURCE_ONLY_MANIFEST.json";
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const compare = (left, right) => Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));

function currentRows(root) {
  return collectTree(root, { kind: "source", excludePaths: new Set([SOURCE_MANIFEST_PATH, APPROVED_PATH]) })
    .map(({ path: entryPath, byteLength, sha256: digest }) => ({ path: entryPath, byteLength, sha256: digest }));
}

export function deriveApprovedChanges(rootPath = process.cwd()) {
  const root = path.resolve(rootPath);
  const parentBytes = fs.readFileSync(path.join(root, PARENT_MANIFEST_PATH));
  const parent = JSON.parse(parentBytes);
  if (parent.revisionId !== PARENT || !Array.isArray(parent.files)) throw new Error("r44p46_parent_manifest_identity");
  const before = new Map(parent.files.map((row) => [row.path, row]));
  const afterRows = currentRows(root);
  const after = new Map(afterRows.map((row) => [row.path, row]));
  const paths = [...new Set([...before.keys(), ...after.keys()])].sort(compare);
  const changes = [];
  for (const entryPath of paths) {
    const oldRow = before.get(entryPath);
    const newRow = after.get(entryPath);
    if (oldRow && newRow && oldRow.byteLength === newRow.byteLength && oldRow.sha256 === newRow.sha256) continue;
    changes.push({
      path: entryPath,
      changeType: !oldRow ? "ADDED" : !newRow ? "DELETED" : "MODIFIED",
      parentByteLength: oldRow?.byteLength ?? null,
      parentSha256: oldRow?.sha256 ?? null,
      currentByteLength: newRow?.byteLength ?? null,
      currentSha256: newRow?.sha256 ?? null,
    });
  }
  const deletedCriticalPaths = changes
    .filter((row) => row.changeType === "DELETED" && /(?:^|\/)(?:test|tests|scripts|config|fixtures)(?:\/|$)|(?:test|policy|gate|verif|manifest|evidence)/iu.test(row.path))
    .map((row) => row.path);
  return {
    schemaVersion: "velmere.pass36.a102r44p46.approved-source-changes.v1",
    revisionId: REVISION,
    parentRevisionId: PARENT,
    parentManifestPath: PARENT_MANIFEST_PATH,
    parentManifestSha256: sha256(parentBytes),
    selfExcludedPaths: [SOURCE_MANIFEST_PATH, APPROVED_PATH],
    changedPathCount: changes.length,
    addedFiles: changes.filter((row) => row.changeType === "ADDED").length,
    modifiedFiles: changes.filter((row) => row.changeType === "MODIFIED").length,
    deletedFiles: changes.filter((row) => row.changeType === "DELETED").length,
    deletedCriticalPaths,
    testsOrGatesRemoved: deletedCriticalPaths.length,
    denominatorCollapse: false,
    approvedChanges: changes,
    globalDecision: "NO_GO",
    LIVE: false,
    saleEnabled: false,
    productionApproved: false,
    worldClassProven: false,
  };
}

export function writeApprovedChanges(rootPath = process.cwd()) {
  const root = path.resolve(rootPath);
  const value = deriveApprovedChanges(root);
  if (value.deletedFiles !== 0 || value.testsOrGatesRemoved !== 0) throw new Error("r44p46_deletion_not_approved");
  fs.writeFileSync(path.join(root, APPROVED_PATH), `${JSON.stringify(value, null, 2)}\n`);
  return value;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const value = writeApprovedChanges(process.argv[2]);
  process.stdout.write(`${JSON.stringify({ status: "BUILT_R44P46_APPROVED_CHANGES", changedPathCount: value.changedPathCount, added: value.addedFiles, modified: value.modifiedFiles, deleted: value.deletedFiles }, null, 2)}\n`);
}
