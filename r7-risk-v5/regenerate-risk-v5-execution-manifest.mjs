import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const workRoot = path.resolve(process.argv[2] ?? "r7-work");
const receiptPath = path.resolve(process.argv[3] ?? "r7-risk-v5/R7_RISK_V5_PATCH_RECEIPT.json");
const manifestPath = path.join(workRoot, "R7_EXECUTION_SLICE_MANIFEST.json");
const tsvPath = path.join(workRoot, "R7_EXECUTION_SLICE_MANIFEST.tsv");
const fullIdentityPath = path.join(workRoot, "CURRENT_CANDIDATE_TREE_IDENTITY_EXCLUDING_SELF.json");
const fullManifestPath = path.join(workRoot, "CURRENT_CANDIDATE_CONTENT_MANIFEST.tsv");

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const assert = (value, message) => { if (!value) throw new Error(message); };

const receipt = readJson(receiptPath);
const manifest = readJson(manifestPath);
const fullIdentity = readJson(fullIdentityPath);

assert(receipt.schemaVersion === "velmere.r7.risk-indicator-source-overlay.v1", "risk_receipt_schema_invalid");
assert(receipt.status === "PASS_DETERMINISTIC_EXACT_PATCH_BUILT", "risk_receipt_status_invalid");
assert(manifest.schemaVersion === "velmere.r7.execution-slice-manifest.v3", "execution_manifest_schema_invalid");
assert(manifest.candidate === receipt.candidate, "execution_manifest_candidate_invalid");
assert(manifest.testDenominator === 52, "execution_manifest_denominator_invalid");
assert(Array.isArray(manifest.files) && manifest.files.length === receipt.target.executionSliceFileCount, "execution_manifest_file_count_invalid");
assert(Array.isArray(manifest.archiveAdditionalPaths), "execution_manifest_additional_paths_invalid");

const expectedAdditional = [
  "CURRENT_CANDIDATE_CONTENT_MANIFEST.tsv",
  "CURRENT_CANDIDATE_TREE_IDENTITY_EXCLUDING_SELF.json",
  "R7_EXECUTION_SLICE_MANIFEST.json",
  "R7_EXECUTION_SLICE_MANIFEST.tsv",
];
assert(JSON.stringify(manifest.archiveAdditionalPaths) === JSON.stringify(expectedAdditional), "execution_manifest_additional_paths_changed");

const requiredRiskChangedPaths = new Set([
  "CURRENT_CANDIDATE_RECEIPT.json",
  "ENV_PRODUCTION_READY.example",
  "artifacts/r7/VELMERE_R7_FULL_SOURCE_IDENTITY.json",
  "lib/market-integrity/risk-ledger.ts",
]);
for (const requiredPath of requiredRiskChangedPaths) {
  assert(manifest.files.some((row) => row.path === requiredPath), `risk_execution_path_missing:${requiredPath}`);
}

let payloadByteLength = 0;
let tsv = "";
const rows = manifest.files.map((row) => {
  assert(typeof row.path === "string" && row.path.length > 0, "execution_row_path_invalid");
  const absolute = path.join(workRoot, ...row.path.split("/"));
  const bytes = fs.readFileSync(absolute);
  const updated = {
    path: row.path,
    byteLength: bytes.length,
    sha256: sha256(bytes),
  };
  payloadByteLength += bytes.length;
  tsv += `${updated.sha256}\t${updated.byteLength}\t${updated.path}\n`;
  return updated;
});
const aggregateIdentitySha256 = sha256(Buffer.from(tsv, "utf8"));

assert(payloadByteLength === receipt.target.executionSlicePayloadByteLength,
  `risk_execution_payload_mismatch:${payloadByteLength}`);
assert(aggregateIdentitySha256 === receipt.target.executionSliceAggregateSha256,
  `risk_execution_aggregate_mismatch:${aggregateIdentitySha256}`);
assert(sha256(fs.readFileSync(path.join(workRoot, "package.json"))) === receipt.target.packageJsonSha256,
  "risk_package_json_mismatch");
assert(sha256(fs.readFileSync(path.join(workRoot, "package-lock.json"))) === receipt.target.packageLockSha256,
  "risk_package_lock_mismatch");

const fullManifestSha256 = sha256(fs.readFileSync(fullManifestPath));
assert(fullManifestSha256 === receipt.target.fullSourceManifestSha256,
  `risk_full_manifest_mismatch:${fullManifestSha256}`);
assert(fullIdentity.fileCount === receipt.target.fileCount, "risk_full_identity_file_count_mismatch");
assert(fullIdentity.aggregateIdentitySha256 === receipt.target.fullSourceAggregateSha256,
  "risk_full_identity_aggregate_mismatch");
assert(fullIdentity.manifestWithHeaderSha256 === receipt.target.fullSourceManifestSha256,
  "risk_full_identity_manifest_mismatch");
assert(fullIdentity.packageJsonSha256 === receipt.target.packageJsonSha256,
  "risk_full_identity_package_json_mismatch");
assert(fullIdentity.packageLockSha256 === receipt.target.packageLockSha256,
  "risk_full_identity_package_lock_mismatch");

manifest.fileCount = rows.length;
manifest.payloadByteLength = payloadByteLength;
manifest.aggregateIdentitySha256 = aggregateIdentitySha256;
manifest.packageJsonSha256 = receipt.target.packageJsonSha256;
manifest.packageLockSha256 = receipt.target.packageLockSha256;
manifest.fullSource.fileCount = receipt.target.fileCount;
manifest.fullSource.payloadByteLength = receipt.target.payloadByteLength;
manifest.fullSource.pathSetSha256 = fullIdentity.pathSetSha256;
manifest.fullSource.aggregateIdentitySha256 = fullIdentity.aggregateIdentitySha256;
manifest.fullSource.manifestWithHeaderSha256 = fullIdentity.manifestWithHeaderSha256;
manifest.fullSource.packageJsonSha256 = fullIdentity.packageJsonSha256;
manifest.fullSource.packageLockSha256 = fullIdentity.packageLockSha256;
manifest.files = rows;

const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, "utf8");
const manifestSha256 = sha256(manifestBytes);
assert(manifestSha256 === receipt.target.executionSliceManifestSha256,
  `risk_execution_manifest_sha_mismatch:${manifestSha256}`);

fs.writeFileSync(tsvPath, tsv, "utf8");
fs.writeFileSync(manifestPath, manifestBytes);

console.log(JSON.stringify({
  schemaVersion: "velmere.r7.risk-v5-execution-manifest-regeneration.v1",
  status: "PASS_EXACT_RISK_V5_EXECUTION_MANIFEST_REGENERATED",
  fileCount: rows.length,
  payloadByteLength,
  aggregateIdentitySha256,
  executionSliceManifestSha256: manifestSha256,
  fullSourceAggregateSha256: fullIdentity.aggregateIdentitySha256,
  fullSourceManifestSha256: fullManifestSha256,
  customerFinalCredit: false,
}, null, 2));
