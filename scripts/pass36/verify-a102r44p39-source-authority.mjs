#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
const REV = "VELMERE_PASS36_A102R44P39_ACTION_REQUIRED_AUDIT_PACKET_PARITY_BYTECODE_PROXY_BINDING_AND_EXTERNAL_ACCURACY_REGISTRY_TEST_CYCLE_2_OF_3_NO_LIVE_CREDIT";
const root = path.resolve(process.argv[2] ?? process.cwd());
const manifestRelative = "_velmere/PASS36_A102R44P39_SOURCE_ONLY_MANIFEST.json";
const manifestPath = path.join(root, ...manifestRelative.split("/"));
const fail = (message, extra = {}) => { console.log(JSON.stringify({ status: "FAIL_R44P39_SOURCE_AUTHORITY", message, ...extra }, null, 2)); process.exit(1); };
const excludedParts = new Set(["node_modules", ".git", ".next", ".turbo", ".cache", "coverage", "test-results", "playwright-report", "__pycache__", ".pytest_cache", "tmp", "temp"]);
const excluded = (relativePath) => relativePath.split("/").some((part) => excludedParts.has(part) || part.startsWith(".next-"));
const compareUtf8 = (left, right) => Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
const sha256 = (buffer) => crypto.createHash("sha256").update(buffer).digest("hex");
function walk(directory, base = "") {
  const rows = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const relativePath = base ? `${base}/${entry.name}` : entry.name;
    if (excluded(relativePath)) continue;
    const absolutePath = path.join(directory, entry.name);
    const stat = fs.lstatSync(absolutePath);
    if (stat.isSymbolicLink()) fail("SYMLINK_FORBIDDEN", { path: relativePath });
    if (entry.isDirectory()) rows.push(...walk(absolutePath, relativePath));
    else if (entry.isFile() && relativePath !== manifestRelative) {
      const bytes = fs.readFileSync(absolutePath);
      rows.push({ path: relativePath, byteLength: bytes.length, sha256: sha256(bytes) });
    }
  }
  return rows;
}
if (!fs.existsSync(manifestPath)) fail("MANIFEST_MISSING");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
if (manifest.revisionId !== REV) fail("REVISION_MISMATCH", { actual: manifest.revisionId, expected: REV });
if (manifest.pathOrderAlgorithm !== "UTF8_BYTEWISE_ASCENDING_V1") fail("PATH_ORDER_ALGORITHM_MISMATCH");
const actual = walk(root).sort((a, b) => compareUtf8(a.path, b.path));
const expected = [...manifest.files].sort((a, b) => compareUtf8(a.path, b.path));
if (actual.length !== expected.length) fail("FILE_COUNT_MISMATCH", { actual: actual.length, expected: expected.length });
for (let index = 0; index < actual.length; index += 1) {
  if (actual[index].path !== expected[index].path || actual[index].byteLength !== expected[index].byteLength || actual[index].sha256 !== expected[index].sha256) fail("FILE_BINDING_MISMATCH", { index, actual: actual[index], expected: expected[index] });
}
const aggregate = crypto.createHash("sha256");
for (const row of actual) aggregate.update(`${row.path}\0${row.byteLength}\0${row.sha256}\n`);
const sourceAggregateSha256 = aggregate.digest("hex");
const pathSetSha256 = sha256(Buffer.from(`${actual.map((row) => row.path).join("\n")}\n`, "utf8"));
const payloadBytes = actual.reduce((sum, row) => sum + row.byteLength, 0);
if (sourceAggregateSha256 !== manifest.sourceAggregateSha256) fail("AGGREGATE_MISMATCH", { actual: sourceAggregateSha256, expected: manifest.sourceAggregateSha256 });
if (pathSetSha256 !== manifest.pathSetSha256) fail("PATH_SET_MISMATCH", { actual: pathSetSha256, expected: manifest.pathSetSha256 });
if (manifest.fileCount !== actual.length || manifest.payloadBytes !== payloadBytes) fail("MANIFEST_TOTAL_MISMATCH");
console.log(JSON.stringify({ status: "PASS_R44P39_SOURCE_AUTHORITY", revisionId: REV, fileCount: actual.length, payloadBytes, sourceAggregateSha256, pathSetSha256, sourceImmutable: true }, null, 2));
