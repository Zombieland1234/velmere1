#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { A80_REVISION, assertOutputOutsideSource, evaluateReleaseCandidate, readJson } from "./pass36/a80-release-candidate-freeze-lib.mjs";
import { validateCurrentSourceAuthorityExact } from "./pass36/current-source-authority-lib.mjs";

const root = process.cwd();
const args = process.argv.slice(2);
const arg = (name) => { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : null; };
const output = arg("--output");
if (!output) throw new Error("a80_output_required");
const outputPath = assertOutputOutsideSource(root, output);
const policy = readJson(root, "config/pass36/a80-frozen-local-release-candidate-admission.json");
const current = readJson(root, "config/pass35/current-revision.json");
const authority = readJson(root, "config/pass36/current-release-authority.json");
const a78State = readJson(root, "config/pass36/a78-current-state.json");
const a79State = readJson(root, "config/pass36/a79-current-state.json");
const a60Receipt = readJson(root, "artifacts/pass36/a60/PASS36_A60_EXACT_FINAL_BYTE_BUILD_BROWSER_ACCEPTANCE.json");
const a58Verification = {
  blockingFailures: Number(arg("--a58-blocking-failures") ?? 0),
  archiveIntegrityVerified: arg("--a58-archive-verified") === "1",
  cleanUnpackVerified: arg("--a58-clean-unpack-verified") === "1"
};
const currentRootGate = {
  exactRuntime: arg("--current-root-exact") === "1",
  passed: Number(arg("--current-root-passed") ?? 0),
  required: policy.requiredCurrentRootSuites,
  blocked: Number(arg("--current-root-blocked") ?? policy.requiredCurrentRootSuites),
  semanticFailures: Number(arg("--current-root-semantic-failures") ?? 0),
  sourceImmutable: arg("--current-root-source-immutable") === "1"
};
const before = validateCurrentSourceAuthorityExact(root);
const result = evaluateReleaseCandidate({ root, policy, current, authority, a78State, a79State, a60Receipt, a58Verification, currentRootGate });
const after = validateCurrentSourceAuthorityExact(root);
if (!before.passed || !after.passed || before.manifestSha256 !== after.manifestSha256 || before.payload?.aggregateSha256 !== after.payload?.aggregateSha256) throw new Error("a80_current_source_authority_mutated");
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, { flag: "wx" });
console.log(JSON.stringify({ revisionId: A80_REVISION, decision: result.decision, verified: result.verified, blockers: result.blockers, output: outputPath }, null, 2));
if (!result.verified) process.exitCode = 2;
