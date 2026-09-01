#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const REV = "VELMERE_PASS36_A102R44P38_ACTION_REQUIRED_COMPILER_AST_IR_LOCAL_GENERALIZATION24_METAMORPHIC7_AND_AUDIT_ACCURACY_TEST_CYCLE_1_OF_3_NO_LIVE_CREDIT";
const PARENT = "VELMERE_PASS36_A102R44P37_ACTION_REQUIRED_AUTHORITY_RELEASE_TRUTH_TYPESCRIPT_AND_EVIDENCE_REPAIR_TEST_CYCLE_0_OF_3_NO_LIVE_CREDIT";
const root = path.resolve(process.argv[2] ?? process.cwd());
const manifestRelative = "_velmere/PASS36_A102R44P38_SOURCE_ONLY_MANIFEST.json";
const manifestPath = path.join(root, ...manifestRelative.split("/"));
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
    if (stat.isSymbolicLink()) throw new Error(`symlink_forbidden:${relativePath}`);
    if (entry.isDirectory()) rows.push(...walk(absolutePath, relativePath));
    else if (entry.isFile() && relativePath !== manifestRelative) {
      const bytes = fs.readFileSync(absolutePath);
      rows.push({ path: relativePath, byteLength: bytes.length, sha256: sha256(bytes) });
    }
  }
  return rows;
}

const files = walk(root).sort((a, b) => compareUtf8(a.path, b.path));
const aggregate = crypto.createHash("sha256");
for (const row of files) aggregate.update(`${row.path}\0${row.byteLength}\0${row.sha256}\n`);
const sourceAggregateSha256 = aggregate.digest("hex");
const pathSetSha256 = sha256(Buffer.from(`${files.map((row) => row.path).join("\n")}\n`, "utf8"));
const manifest = {
  schemaVersion: "velmere.pass36.a102r44p38.source-manifest.v1",
  revisionId: REV,
  parentRevisionId: PARENT,
  pathOrderAlgorithm: "UTF8_BYTEWISE_ASCENDING_V1",
  fileCount: files.length,
  payloadBytes: files.reduce((sum, row) => sum + row.byteLength, 0),
  sourceAggregateSha256,
  pathSetSha256,
  files,
  excludedGenerated: ["node_modules", ".next*", ".turbo", ".cache", "coverage", "test-results", "playwright-report"],
};
fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: "BUILT_R44P38_SOURCE_MANIFEST", manifestPath: manifestRelative, fileCount: manifest.fileCount, payloadBytes: manifest.payloadBytes, sourceAggregateSha256, pathSetSha256 }, null, 2));
