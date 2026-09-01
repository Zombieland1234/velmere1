#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
const output = "fixtures/pass35/audit-a7/PASS35_A7_RUNNER_BOUNDARY_RECEIPT.json";
if (existsSync(output)) rmSync(output);
let assertions = 0;
const check = (condition, message) => { assertions += 1; assert.ok(condition, message); };
const good = spawnSync(process.execPath, ["scripts/pass35/run-audit-a7-fork-replay-case.mjs", "--input", "fixtures/pass35/audit-a7/fork-replay/synthetic-fork-replay-case.json", "--tool", "fixtures/pass35/audit-a7/fork-replay/fake-fork-tool.json", "--output", output], { encoding: "utf8" });
check(good.status === 0 && existsSync(output), `A7 runner failed:${good.stderr}`);
const traversal = spawnSync(process.execPath, ["scripts/pass35/run-audit-a7-fork-replay-case.mjs", "--input", "fixtures/pass35/audit-a7/fork-replay/synthetic-fork-replay-case.json", "--tool", "fixtures/pass35/audit-a7/fork-replay/fake-fork-tool.json", "--output", "../a7-fork-leak.json"], { encoding: "utf8" });
check(traversal.status !== 0 && `${traversal.stdout}${traversal.stderr}`.includes("a7_fork_output_outside_root"), "A7 output traversal not blocked");
const customerOutput = spawnSync(process.execPath, ["scripts/pass35/run-audit-a7-fork-replay-case.mjs", "--input", "fixtures/pass35/audit-a7/fork-replay/synthetic-fork-replay-case.json", "--tool", "fixtures/pass35/audit-a7/fork-replay/fake-fork-tool.json", "--output", ".velmere/private-audit-cases/fixture.json"], { encoding: "utf8" });
check(customerOutput.status !== 0 && `${customerOutput.stdout}${customerOutput.stderr}`.includes("a7_fork_synthetic_receipt_must_use_fixture_root"), "synthetic receipt entered private customer root");
if (existsSync(output)) rmSync(output);
console.log(JSON.stringify({ status: "PASS_AUDIT_A7_RUNNER_BOUNDARIES", assertions, paidGateEligible: false }, null, 2));
