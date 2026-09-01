import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const manifestRel = "_velmere/PASS36_A102R44P11_SOURCE_MANIFEST.json";
const manifest = JSON.parse(fs.readFileSync(path.join(root, manifestRel), "utf8"));
const state = JSON.parse(fs.readFileSync(path.join(root, "config/pass36/a102r44p11-action-required-current-state.json"), "utf8"));
const sha256File = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const forbiddenNames = new Set(["node_modules", ".next", ".turbo", ".cache", "coverage", "test-results", "playwright-report", "__pycache__", ".pytest_cache"]);

function walk(dir) {
  const rows = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(root, full).split(path.sep).join("/");
    const stat = fs.lstatSync(full);
    if (stat.isSymbolicLink()) { rows.push({ forbidden: rel, reason: "symlink" }); continue; }
    if (entry.isDirectory()) {
      if (forbiddenNames.has(entry.name) || entry.name.startsWith(".next-")) { rows.push({ forbidden: rel, reason: "generated-directory" }); continue; }
      rows.push(...walk(full));
    } else if (entry.isFile()) {
      if (/(^|\/)\.env(?:\.|$)/i.test(rel)) rows.push({ forbidden: rel, reason: "environment-file" });
      else if (rel !== manifestRel) rows.push({ path: rel, byteLength: stat.size, sha256: sha256File(full), mode: stat.mode & 0o777 });
    } else rows.push({ forbidden: rel, reason: "non-regular" });
  }
  return rows;
}

const inventory = walk(root);
const forbidden = inventory.filter((row) => row.forbidden);
const actual = inventory.filter((row) => row.path).sort((a, b) => a.path.localeCompare(b.path));
const expected = [...manifest.entries].sort((a, b) => a.path.localeCompare(b.path));
const actualMap = new Map(actual.map((row) => [row.path, row]));
const expectedMap = new Map(expected.map((row) => [row.path, row]));
const missing = expected.filter((row) => !actualMap.has(row.path)).map((row) => row.path);
const extra = actual.filter((row) => !expectedMap.has(row.path)).map((row) => row.path);
const changed = actual.filter((row) => {
  const expectedRow = expectedMap.get(row.path);
  return expectedRow && (expectedRow.byteLength !== row.byteLength || expectedRow.sha256 !== row.sha256 || expectedRow.mode !== row.mode);
}).map((row) => row.path);
const pathSetSha256 = crypto.createHash("sha256").update(actual.map((row) => row.path).join("\n") + "\n").digest("hex");
const aggregateSha256 = crypto.createHash("sha256").update(actual.map((row) => `${row.path}\0${row.byteLength}\0${row.sha256}\0${row.mode}\n`).join("")).digest("hex");
const checks = [
  ["revision", manifest.revisionId === state.revisionId],
  ["parent", manifest.parentRevisionId === state.parentRevisionId],
  ["parent-archive", manifest.parentSourceArchive?.byteLength === 55729848 && manifest.parentSourceArchive?.sha256 === "224084e6ef16af28a25b09f163f71943d905f1bc2084ed66664d16e222979430"],
  ["file-count", manifest.fileCount === expected.length && actual.length === expected.length],
  ["byte-length", manifest.byteLength === actual.reduce((sum, row) => sum + row.byteLength, 0)],
  ["path-set", manifest.pathSetSha256 === pathSetSha256],
  ["aggregate", manifest.aggregateSha256 === aggregateSha256],
  ["missing-zero", missing.length === 0],
  ["extra-zero", extra.length === 0],
  ["changed-zero", changed.length === 0],
  ["forbidden-zero", forbidden.length === 0],
  ["global-no-go", state.decision === "NO_GO"],
  ["flags-false", Object.values(state.globalTruth).every((value) => value === false)],
  ["active-pass-current", fs.readFileSync(path.join(root, "VELMERE_ACTIVE_PASS.txt"), "utf8").includes(`REVISION_ID=${state.revisionId}`)],
];
const failed = checks.filter(([, ok]) => !ok);
const result = {
  schemaVersion: "velmere.pass36.a102r44p11.source-authority-verification.v1",
  status: failed.length ? "FAIL_R44P11_SOURCE_AUTHORITY" : "PASS_R44P11_SOURCE_AUTHORITY_NO_PROMOTION",
  revisionId: manifest.revisionId,
  parentRevisionId: manifest.parentRevisionId,
  checks: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  sourceFiles: actual.length,
  sourceBytes: actual.reduce((sum, row) => sum + row.byteLength, 0),
  missing,
  extra,
  changed,
  forbidden,
  pathSetSha256,
  aggregateSha256,
  checksDetail: checks.map(([id, ok]) => ({ id, ok: Boolean(ok) })),
  globalDecision: "NO_GO",
  live: false,
  saleEnabled: false,
  productionApproved: false,
  worldClassProven: false,
};
console.log(JSON.stringify(result, null, 2));
if (failed.length) process.exit(1);
