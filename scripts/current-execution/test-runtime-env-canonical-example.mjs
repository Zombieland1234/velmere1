import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { scanTextForHighPrecisionSecrets } from "../pass4992/supply-chain-release.mjs";

function argument(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? String(process.argv[index + 1] ?? "").trim() : "";
}

const receiptArgument = argument("receipt");
if (!receiptArgument) throw new Error("usage: --receipt <external-output-path>");

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDirectory, "../..");
const policy = JSON.parse(readFileSync(path.join(root, "config/runtime-env-policy.json"), "utf8"));

assert.equal(policy.schemaVersion, "velmere.runtime-env-policy.v1");
assert.equal(policy.envExamplePath, "ENV_PRODUCTION_READY.example");

const canonicalExamplePath = path.join(root, policy.envExamplePath);
const canonicalExampleBytes = readFileSync(canonicalExamplePath);
const canonicalExample = canonicalExampleBytes.toString("utf8");
const canonicalExampleSha256 = createHash("sha256").update(canonicalExampleBytes).digest("hex");
const currentManifestPath = path.join(root, "CURRENT_CANDIDATE_CONTENT_MANIFEST.tsv");
const currentManifest = readFileSync(currentManifestPath, "utf8");
const expectedManifestLine = `ENV_PRODUCTION_READY.example\t${canonicalExampleBytes.byteLength}\t${canonicalExampleSha256}`;
const manifestLine = currentManifest.split(/\r?\n/u).find((line) => line.startsWith("ENV_PRODUCTION_READY.example\t"));

assert.equal(manifestLine, expectedManifestLine, "canonical environment example must match the current candidate manifest");
assert.doesNotMatch(currentManifest, /^\.env\.example\t/mu);
assert.deepEqual(scanTextForHighPrecisionSecrets(canonicalExample, policy.envExamplePath), []);

const assignments = [...canonicalExample.matchAll(/^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=.*$/gmu)]
  .map((match) => match[1]);
assert.equal(new Set(assignments).size, assignments.length, "canonical environment keys must be unique");

const receiptPath = path.resolve(receiptArgument);
const verifierPath = path.join(root, "scripts/runtime-config/verify-runtime-env-contract.mjs");
const execution = spawnSync(process.execPath, [verifierPath, "--output", receiptPath], {
  cwd: root,
  encoding: "utf8",
  timeout: 30_000,
});
assert.equal(
  execution.status,
  0,
  `runtime env verifier failed\nstdout:\n${execution.stdout}\nstderr:\n${execution.stderr}`,
);

const receipt = JSON.parse(readFileSync(receiptPath, "utf8"));
assert.equal(receipt.status, "PASS");
assert.equal(receipt.envExamplePath, policy.envExamplePath);
assert.deepEqual(receipt.missingRuntimeKeys, []);
assert.deepEqual(receipt.duplicateAssignments, []);
assert.deepEqual(receipt.publicCredentialLeaks, []);

console.log(JSON.stringify({
  schemaVersion: "velmere.current-execution.runtime-env-canonical-example-test.v1",
  status: "PASS",
  canonicalExamplePath: policy.envExamplePath,
  currentManifestPath: "CURRENT_CANDIDATE_CONTENT_MANIFEST.tsv",
  canonicalExampleByteLength: canonicalExampleBytes.byteLength,
  canonicalExampleSha256,
  documentedKeyCount: receipt.documentedKeyCount,
  runtimeKeyCount: receipt.runtimeKeyCount,
  receiptPath,
  truthBoundary: "Static current-source environment-key documentation bound to the current candidate manifest only; no credential, deployment, or production-readiness credit.",
}, null, 2));
