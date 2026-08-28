import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const requiredSha = (name) => {
  const value = process.env[name] ?? "";
  if (!/^[a-f0-9]{64}$/u.test(value)) throw new Error(`angel_expected_sha_missing_or_invalid:${name}`);
  return value;
};

const workDir = path.resolve(process.argv[2] ?? "r7-work");
const outputPath = path.resolve(process.argv[3] ?? "R7_ANGEL_EXACT_SOURCE_IDENTITY.json");
const manifestPath = path.join(workDir, "R7_EXECUTION_SLICE_MANIFEST.json");
const manifestBytes = fs.readFileSync(manifestPath);
const manifest = JSON.parse(manifestBytes.toString("utf8"));

const expectedManifestSha256 = requiredSha("R7_EXPECTED_EXECUTION_SLICE_MANIFEST_SHA256");
const expectedSliceAggregateSha256 = requiredSha("R7_EXPECTED_EXECUTION_SLICE_AGGREGATE_SHA256");
const expectedFullSourceAggregateSha256 = requiredSha("R7_EXPECTED_FULL_SOURCE_AGGREGATE_SHA256");

if (sha256(manifestBytes) !== expectedManifestSha256) throw new Error("angel_execution_manifest_sha_mismatch");
if (manifest.aggregateIdentitySha256 !== expectedSliceAggregateSha256) throw new Error("angel_execution_slice_aggregate_mismatch");
if (manifest.fullSource?.aggregateIdentitySha256 !== expectedFullSourceAggregateSha256) throw new Error("angel_full_source_aggregate_mismatch");
if (manifest.testDenominator !== 52) throw new Error("angel_test_denominator_mismatch");

const requiredPaths = [
  "app/api/angel/route.ts",
  "lib/server/lazy-route-modules/angel.ts",
  "lib/ai/angel-route-policy.ts",
  "lib/ai/angel-structured-response.ts",
  "components/angel/AngelPanel.tsx",
  "tests/security/a102-angel-primary-route-safety-boundary.test.ts",
  "tests/security/a102-angel-standalone-output-truth.test.ts",
  "tests/security/a102-angel-ai-disclosure-and-public-topology.test.ts",
  "tests/security/v4-angel-grounding-before-provider-boundary.test.ts",
  "scripts/current-execution/test-angel-durable-memory-delete-fail-closed.mts",
  "tests/pass36/a102r44p11-angel-multicoin-safety.ts",
];

const manifestRows = new Map(manifest.files.map((row) => [row.path, row]));
const requiredSource = requiredPaths.map((relativePath) => {
  const row = manifestRows.get(relativePath);
  if (!row) throw new Error(`angel_required_source_not_hash_bound:${relativePath}`);
  const bytes = fs.readFileSync(path.join(workDir, ...relativePath.split("/")));
  if (bytes.length !== row.byteLength || sha256(bytes) !== row.sha256) {
    throw new Error(`angel_required_source_identity_mismatch:${relativePath}`);
  }
  return { path: relativePath, byteLength: bytes.length, sha256: row.sha256 };
});

const verifierBytes = fs.readFileSync(fileURLToPath(import.meta.url));
const receipt = {
  schemaVersion: "velmere.r7.angel-exact-source-identity.v2",
  status: "PASS_ANGEL_EXACT_CURRENT_SOURCE_IDENTITY",
  fullSourceAggregateSha256: manifest.fullSource.aggregateIdentitySha256,
  executionSliceAggregateSha256: manifest.aggregateIdentitySha256,
  executionSliceManifestSha256: sha256(manifestBytes),
  testDenominator: manifest.testDenominator,
  requiredSourceFiles: requiredSource.length,
  requiredSource,
  identityVerifierSha256: sha256(verifierBytes),
  customerFinalCredit: false,
  paidValueCredit: false,
};

fs.writeFileSync(outputPath, `${JSON.stringify(receipt, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
