#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";

const commands = [
  "scripts/pass36/verify-a102r44p34-source-authority.mjs",
  "scripts/pass36/verify-a102r44p34-approved-current-source-changes.mjs",
  "scripts/pass36/verify-a102r44p34-static-policy.mjs",
  "scripts/pass36/verify-a102r44p34-current-release-pointers.mjs",
  "scripts/pass36/test-a102r44p34-product-topology-contract.mjs",
  "scripts/pass36/test-a102r44p34-dynamic-product-scorecard.mjs",
  "scripts/pass36/test-a102r44p34-psychology-customer-matrix.mjs",
  "scripts/pass36/verify-a102r44p34-targeted-typescript.mjs",
  "scripts/pass36/verify-a102r44p34-source-authority.mjs",
];
const manifestPath = "_velmere/PASS36_A102R44P34_SOURCE_ONLY_MANIFEST.json";
const before = crypto.createHash("sha256").update(fs.readFileSync(manifestPath)).digest("hex");
const stages = [];
for (const script of commands) {
  const run = spawnSync(process.execPath, [script], {
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    env: process.env,
  });
  stages.push({
    script,
    exitCode: run.status,
    passed: run.status === 0,
    stdout: run.stdout,
    stderr: run.stderr,
  });
  if (run.status !== 0) break;
}
const after = crypto.createHash("sha256").update(fs.readFileSync(manifestPath)).digest("hex");
const failed = stages.filter((stage) => !stage.passed);
const firstChildLiteral = stages[0]?.script === "scripts/pass36/verify-a102r44p34-source-authority.mjs";
const sourceImmutable = before === after;
const passed = failed.length === 0 && stages.length === commands.length && firstChildLiteral && sourceImmutable;
console.log(JSON.stringify({
  schemaVersion: "velmere.pass36.a102r44p34.clean-unpack-verification.v1",
  status: passed ? "PASS_R44P34_CLEAN_UNPACK" : "FAIL_R44P34_CLEAN_UNPACK",
  requiredStages: commands.length,
  executedStages: stages.length,
  passedStages: stages.filter((stage) => stage.passed).length,
  failedStages: failed.length,
  firstChildLiteral,
  sourceImmutable,
  manifestSha256Before: before,
  manifestSha256After: after,
  stages,
}, null, 2));
if (!passed) process.exit(1);
