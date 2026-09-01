import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const revisionId = "VELMERE_PASS36_A102R44P10_ACTION_REQUIRED_METAMORPHIC_GENERALIZATION_CUSTOMER_CONFIDENCE_AND_ANALYSIS_QUEUE_TRUTH_CLEAN_SOURCE_CLOSURE_NO_LIVE_CREDIT";
const parentRevisionId = "VELMERE_PASS36_A102R44P9_ACTION_REQUIRED_INDEPENDENT_FINAL_AUDIT_SEMANTIC_GENERALIZATION_SKU_TRUTH_AND_REAL_LOCAL_E2E_NO_LIVE_CREDIT";
const manifestPath = "_velmere/PASS36_A102R44P10_SOURCE_MANIFEST.json";
const forbiddenNames = new Set(["node_modules", ".next", ".turbo", ".cache", "coverage", "test-results", "playwright-report", "__pycache__", ".pytest_cache"]);
const sha256Bytes = (value) => crypto.createHash("sha256").update(value).digest("hex");
const sha256File = (p) => sha256Bytes(fs.readFileSync(p));

function walk(dir) {
  const rows = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(root, full).split(path.sep).join("/");
    const lst = fs.lstatSync(full);
    if (lst.isSymbolicLink()) throw new Error(`symlink forbidden: ${rel}`);
    if (entry.isDirectory()) {
      if (forbiddenNames.has(entry.name) || entry.name.startsWith(".next-")) throw new Error(`generated directory forbidden: ${rel}`);
      rows.push(...walk(full));
    } else if (entry.isFile()) {
      if (rel === manifestPath) continue;
      if (/(^|\/)\.env(?:\.|$)/i.test(rel)) throw new Error(`environment file forbidden: ${rel}`);
      rows.push({
        path: rel,
        byteLength: lst.size,
        sha256: sha256File(full),
        mode: lst.mode & 0o777,
      });
    } else {
      throw new Error(`non-regular entry forbidden: ${rel}`);
    }
  }
  return rows;
}

const entries = walk(root).sort((a, b) => a.path.localeCompare(b.path));
const pathSetSha256 = sha256Bytes(entries.map((row) => row.path).join("\n") + "\n");
const aggregateSha256 = sha256Bytes(entries.map((row) => `${row.path}\0${row.byteLength}\0${row.sha256}\0${row.mode}\n`).join(""));
const document = {
  schemaVersion: "velmere.pass36.a102r44p10.source-manifest.v1",
  revisionId,
  parentRevisionId,
  manifestPath,
  manifestSelfExcluded: true,
  parentSourceArchive: {
    filename: "VELMERE_PASS36_A102R44P9_ACTION_REQUIRED_INDEPENDENT_FINAL_AUDIT_SEMANTIC_GENERALIZATION_SKU_TRUTH_AND_REAL_LOCAL_E2E_NO_LIVE_CREDIT_SOURCE_ONLY.zip",
    byteLength: 55745071,
    sha256: "4394404c46dd88a2dae45d23a281d9675be1d64fd05c074a4f5534f7e048166c",
  },
  fileCount: entries.length,
  byteLength: entries.reduce((sum, row) => sum + row.byteLength, 0),
  pathSetSha256,
  aggregateSha256,
  forbiddenPathsDetected: [],
  globalDecision: "NO_GO",
  live: false,
  saleEnabled: false,
  productionApproved: false,
  worldClassProven: false,
  entries,
};
fs.mkdirSync(path.dirname(path.join(root, manifestPath)), { recursive: true });
fs.writeFileSync(path.join(root, manifestPath), JSON.stringify(document, null, 2) + "\n", { encoding: "utf8", mode: 0o644 });
console.log(JSON.stringify({ status: "PASS_R44P10_SOURCE_MANIFEST_BUILT", revisionId, fileCount: document.fileCount, byteLength: document.byteLength, pathSetSha256, aggregateSha256, manifestPath }, null, 2));
