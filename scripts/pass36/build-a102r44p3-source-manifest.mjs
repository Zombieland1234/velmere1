#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const REVISION = "VELMERE_PASS36_A102R44P3_ACTION_REQUIRED_CURRENT_BYTE_SHIELD_PRO_REAL_MARKETS_AND_MULTILINGUAL_AI_MATRIX_CLOSURE_NO_LIVE_CREDIT";
const PARENT = "VELMERE_PASS36_A102R44P2_ACTION_REQUIRED_AUTOMATED_INFORMATIONAL_SKU_PDF_POSIX_TOOL_BOUNDARY_AND_OFFICIAL_TOOLCHAIN_ADMISSION_NO_LIVE_CREDIT";
const MANIFEST_REL = "_velmere/PASS36_A102R44P3_SOURCE_MANIFEST.json";
const PARENT_MANIFEST_REL = "_velmere/PASS36_A102R44P2_PATCH_SOURCE_MANIFEST.json";
const EXCLUDED_TOP = new Set(["artifacts", ".velmere", "node_modules", ".cache", ".turbo", "coverage", "test-results", "playwright-report", "__pycache__"]);
const root = process.cwd();
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const sortRows = (rows) => rows.sort((a, b) => Buffer.compare(Buffer.from(a.path), Buffer.from(b.path)));

function collect(directory, prefix = "") {
  const rows = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => Buffer.compare(Buffer.from(a.name), Buffer.from(b.name)))) {
    if (!prefix && (EXCLUDED_TOP.has(entry.name) || entry.name.startsWith(".next"))) continue;
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (relative === MANIFEST_REL) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`symlink_forbidden:${relative}`);
    if (entry.isDirectory()) rows.push(...collect(absolute, relative));
    else if (entry.isFile()) {
      const bytes = fs.readFileSync(absolute);
      rows.push({ path: relative.split(path.sep).join("/"), byteLength: bytes.length, sha256: sha256(bytes), mode: fs.statSync(absolute).mode });
    }
  }
  return rows;
}

const rows = sortRows(collect(root));
const pathSetSha256 = sha256(Buffer.from(`${rows.map((row) => row.path).join("\n")}\n`, "utf8"));
const aggregate = crypto.createHash("sha256");
for (const row of rows) aggregate.update(`${row.path}\0${row.byteLength}\0${row.sha256}\0${row.mode}\n`);
const aggregateSha256 = aggregate.digest("hex");
const parentManifestPath = path.join(root, PARENT_MANIFEST_REL);
const parentBytes = fs.readFileSync(parentManifestPath);
const parentManifest = JSON.parse(parentBytes.toString("utf8"));
if (parentManifest.revisionId !== PARENT) throw new Error("parent_revision_mismatch");
const parentMap = new Map(parentManifest.entries.map((row) => [row.path, row]));
parentMap.set(PARENT_MANIFEST_REL, { path: PARENT_MANIFEST_REL, byteLength: parentBytes.length, sha256: sha256(parentBytes), mode: fs.statSync(parentManifestPath).mode });
const currentMap = new Map(rows.map((row) => [row.path, row]));
const changes = [];
for (const itemPath of [...new Set([...parentMap.keys(), ...currentMap.keys()])].sort((a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b)))) {
  const before = parentMap.get(itemPath);
  const after = currentMap.get(itemPath);
  if (!before && after) changes.push({ path: itemPath, changeType: "ADDED", parent: null, current: after });
  else if (before && !after) changes.push({ path: itemPath, changeType: "DELETED", parent: before, current: null });
  else if (before && after && (before.byteLength !== after.byteLength || before.sha256 !== after.sha256 || before.mode !== after.mode)) changes.push({ path: itemPath, changeType: "MODIFIED", parent: before, current: after });
}
const manifest = {
  schemaVersion: "velmere.pass36.a102r44p3.source-manifest.v1",
  revisionId: REVISION,
  parentRevisionId: PARENT,
  generatedAt: "2026-08-02T08:30:00.000Z",
  parentSourceManifestPath: PARENT_MANIFEST_REL,
  parentSourceManifestSha256: sha256(parentBytes),
  parentSourceAggregateSha256: parentManifest.aggregateSha256,
  manifestExcludedPath: MANIFEST_REL,
  exclusions: [...EXCLUDED_TOP, ".next*"],
  fileCount: rows.length,
  byteLength: rows.reduce((sum, row) => sum + row.byteLength, 0),
  pathSetSha256,
  aggregateSha256,
  changeCounts: {
    added: changes.filter((row) => row.changeType === "ADDED").length,
    modified: changes.filter((row) => row.changeType === "MODIFIED").length,
    deleted: changes.filter((row) => row.changeType === "DELETED").length,
    total: changes.length,
  },
  changes,
  globalDecision: "NO_GO",
  live: false,
  saleEnabled: false,
  productionApproved: false,
  worldClassProven: false,
  entries: rows,
  truthBoundary: "This manifest binds the complete clean R44P3 SOURCE tree while excluding only generated/runtime material and the manifest itself. It grants source-integrity and local-fixture credit only, not exact Windows, real-provider, paid, LIVE or sale credit.",
};
fs.mkdirSync(path.dirname(path.join(root, MANIFEST_REL)), { recursive: true });
fs.writeFileSync(path.join(root, MANIFEST_REL), `${JSON.stringify(manifest, null, 2)}\n`, { flag: "w" });
console.log(JSON.stringify({
  status: "PASS_A102R44P3_SOURCE_MANIFEST_BUILT",
  revisionId: REVISION,
  manifestPath: MANIFEST_REL,
  manifestSha256: sha256(fs.readFileSync(path.join(root, MANIFEST_REL))),
  fileCount: manifest.fileCount,
  byteLength: manifest.byteLength,
  pathSetSha256: manifest.pathSetSha256,
  aggregateSha256: manifest.aggregateSha256,
  changeCounts: manifest.changeCounts,
  globalDecision: "NO_GO",
  live: false,
  saleEnabled: false,
}, null, 2));
