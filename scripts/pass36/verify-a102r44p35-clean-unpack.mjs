#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";

const commands = [
  "scripts/pass36/verify-a102r44p35-source-authority.mjs",
  "scripts/pass36/verify-a102r44p35-approved-current-source-changes.mjs",
  "scripts/pass36/verify-a102r44p35-static-policy.mjs",
  "scripts/pass36/verify-a102r44p35-current-release-pointers.mjs",
  "scripts/pass36/test-a102r44p35-product-topology-contract.mjs",
  "scripts/pass36/test-a102r44p35-active-standalone-contract.mjs",
  "scripts/pass36/test-a102r44p35-active-route-contract.mjs",
  "scripts/pass36/test-a102r44p35-standalone-decision-support.mjs",
  "scripts/pass36/test-a102r44p35-standalone-product-truth.mjs",
  "scripts/pass36/test-a102r44p35-standalone-customer-truth-runtime.mjs",
  "scripts/pass36/test-a102r44p35-standalone-psychology-matrix.mjs",
  "scripts/pass36/test-a102r44p35-dynamic-product-scorecard.mjs",
  "scripts/pass36/verify-a102r44p35-targeted-typescript.mjs",
  "scripts/pass36/verify-a102r44p35-source-authority.mjs",
];

const manifestPath = "_velmere/PASS36_A102R44P35_SOURCE_ONLY_MANIFEST.json";
const manifestBefore = fs.readFileSync(manifestPath);
const manifestSha256Before = crypto.createHash("sha256").update(manifestBefore).digest("hex");
const tsRoot = process.env.VELMERE_EXACT_TYPESCRIPT_ROOT ?? process.env.VELMERE_TYPESCRIPT_ROOT;
const env = {
  ...process.env,
  ...(tsRoot ? {
    VELMERE_EXACT_TYPESCRIPT_ROOT: tsRoot,
    VELMERE_TYPESCRIPT_ROOT: tsRoot,
  } : {}),
};
const stages = [];
for (const script of commands) {
  const run = spawnSync(process.execPath, [script], {
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    env,
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
const manifestAfter = fs.readFileSync(manifestPath);
const manifestSha256After = crypto.createHash("sha256").update(manifestAfter).digest("hex");
const failed = stages.filter((stage) => !stage.passed);
const firstChildLiteral = stages[0]?.script === "scripts/pass36/verify-a102r44p35-source-authority.mjs";
const sourceImmutable = manifestSha256Before === manifestSha256After && manifestBefore.equals(manifestAfter);
const passed = failed.length === 0 && stages.length === commands.length && firstChildLiteral && sourceImmutable;
console.log(JSON.stringify({
  schemaVersion: "velmere.pass36.a102r44p35.clean-unpack-verification.v2",
  status: passed ? "PASS_R44P35_CLEAN_UNPACK" : "FAIL_R44P35_CLEAN_UNPACK",
  testCycle: "2/3",
  fullRegressionCredit: false,
  requiredStages: commands.length,
  executedStages: stages.length,
  passedStages: stages.filter((stage) => stage.passed).length,
  failedStages: failed.length,
  firstChildLiteral,
  sourceImmutable,
  manifestSha256Before,
  manifestSha256After,
  stages,
}, null, 2));
if (!passed) process.exit(1);
