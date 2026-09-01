#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  evaluateA19ExactRuntime,
  verifyA19ExactRuntimeEvaluation,
  verifyA19RuntimePolicy,
} from "../../lib/runtime/pass35-a19-exact-runtime-bootstrap.mjs";

const policy = JSON.parse(readFileSync("config/pass35/a19-exact-runtime-bootstrap-policy.json", "utf8"));
assert.equal(verifyA19RuntimePolicy(policy), true);
const digest = "a".repeat(64);
const integrity = `sha512-${Buffer.alloc(64, 7).toString("base64")}`;
const cleanInput = {
  nodeArchivePresent: true,
  nodeArchiveSha256: policy.node.archiveSha256,
  nodeVersion: "v24.18.0",
  npmArchivePresent: true,
  npmArchiveVersion: "11.16.0",
  npmRegistryIntegrity: integrity,
  npmRegistrySignatureVerified: true,
  npmVersion: "11.16.0",
  sourceHashBefore: digest,
  sourceHashAfter: digest,
  finalSourceManifestSha256: "b".repeat(64),
  commands: policy.requiredExecution.map((id) => ({ id, exitCode: 0, outputSha256: "c".repeat(64) })),
};
const clean = evaluateA19ExactRuntime(policy, cleanInput);
assert.equal(clean.exactRuntimeProven, true);
assert.equal(verifyA19ExactRuntimeEvaluation(policy, clean), true);

const mutations = [
  ["node archive missing", { nodeArchivePresent: false }],
  ["node hash mismatch", { nodeArchiveSha256: "d".repeat(64) }],
  ["node version mismatch", { nodeVersion: "v22.16.0" }],
  ["npm archive missing", { npmArchivePresent: false }],
  ["npm package version mismatch", { npmArchiveVersion: "11.15.0" }],
  ["npm integrity missing", { npmRegistryIntegrity: null }],
  ["npm signature missing", { npmRegistrySignatureVerified: false }],
  ["npm runtime mismatch", { npmVersion: "10.9.2" }],
  ["source mutated", { sourceHashAfter: "e".repeat(64) }],
  ["source manifest missing", { finalSourceManifestSha256: null }],
];
for (const [name, patch] of mutations) {
  const result = evaluateA19ExactRuntime(policy, { ...cleanInput, ...patch });
  assert.equal(result.exactRuntimeProven, false, name);
  assert.equal(result.promotionAllowed, false, name);
  assert.equal(verifyA19ExactRuntimeEvaluation(policy, result), true, name);
}
for (const id of policy.requiredExecution) {
  const missing = evaluateA19ExactRuntime(policy, { ...cleanInput, commands: cleanInput.commands.filter((row) => row.id !== id) });
  assert.equal(missing.exactRuntimeProven, false, `missing:${id}`);
  const failed = evaluateA19ExactRuntime(policy, { ...cleanInput, commands: cleanInput.commands.map((row) => row.id === id ? { ...row, exitCode: 1 } : row) });
  assert.equal(failed.exactRuntimeProven, false, `failed:${id}`);
}
const mutatedPolicy = structuredClone(policy);
mutatedPolicy.node.archiveSha256 = "0".repeat(64);
assert.equal(verifyA19RuntimePolicy(mutatedPolicy), false);
console.log(`PASS35 A19 exact runtime bootstrap: ${2 + mutations.length + policy.requiredExecution.length * 2 + 1}/${2 + mutations.length + policy.requiredExecution.length * 2 + 1} PASS; exact execution remains unclaimed`);
