import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const revisionId = "VELMERE_PASS36_A102R44P12_ACTION_REQUIRED_REAL_PUBLIC_PROVIDER_DIAGNOSTIC_15_ASSET_TWO_PROVIDER_IDENTITY_FRESHNESS_CONFLICT_AND_RIGHTS_BOUNDARY_NO_LIVE_CREDIT";
const parentRevisionId = "VELMERE_PASS36_A102R44P11_ACTION_REQUIRED_COMPILER_AST_FOUNDRY_FUZZ_INVARIANT_ANGEL_SAFETY_UI_RUNTIME_AND_FINAL_BYTE_CLOSURE_NO_LIVE_CREDIT";
const manifestRel = "_velmere/PASS36_A102R44P12_SOURCE_MANIFEST.json";
const forbiddenNames = new Set(["node_modules", ".next", ".turbo", ".cache", "coverage", "test-results", "playwright-report", "__pycache__", ".pytest_cache"]);
const sha256Bytes = (value) => crypto.createHash("sha256").update(value).digest("hex");
const sha256File = (file) => sha256Bytes(fs.readFileSync(file));

function walk(dir) {
  const rows = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(root, full).split(path.sep).join("/");
    const stat = fs.lstatSync(full);
    if (stat.isSymbolicLink()) throw new Error(`symlink forbidden: ${rel}`);
    if (entry.isDirectory()) {
      if (forbiddenNames.has(entry.name) || entry.name.startsWith(".next-")) throw new Error(`generated directory forbidden: ${rel}`);
      rows.push(...walk(full));
    } else if (entry.isFile()) {
      if (rel === manifestRel) continue;
      if (/(^|\/)\.env(?:\.|$)/i.test(rel)) throw new Error(`environment file forbidden: ${rel}`);
      rows.push({ path: rel, byteLength: stat.size, sha256: sha256File(full), mode: stat.mode & 0o777 });
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
  schemaVersion: "velmere.pass36.a102r44p12.source-manifest.v1",
  revisionId,
  parentRevisionId,
  manifestPath: manifestRel,
  manifestSelfExcluded: true,
  parentSourceArchive: {
    filename: "VELMERE_PASS36_A102R44P11_ACTION_REQUIRED_COMPILER_AST_FOUNDRY_FUZZ_INVARIANT_ANGEL_SAFETY_UI_RUNTIME_AND_FINAL_BYTE_CLOSURE_NO_LIVE_CREDIT_SOURCE_ONLY.zip",
    byteLength: 56103275,
    sha256: "8078edb40b7bfa1d4eda450e1be4bb57107563abf9b586c0655a56bc59bbd120",
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
const manifestPath = path.join(root, manifestRel);
fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
fs.writeFileSync(manifestPath, JSON.stringify(document, null, 2) + "\n", { encoding: "utf8", mode: 0o644 });
console.log(JSON.stringify({ status: "PASS_R44P12_SOURCE_MANIFEST_BUILT", revisionId, fileCount: document.fileCount, byteLength: document.byteLength, pathSetSha256, aggregateSha256, manifestPath: manifestRel }, null, 2));
