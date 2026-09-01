#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runA27Benchmark, verifyA27Benchmark, verifyA27Policy } from "../../lib/security/pass35-a27-fork-replay-evidence-runtime.mjs";
const policy = JSON.parse(readFileSync("config/pass35/a27-fork-replay-evidence-policy.json", "utf8"));
assert.equal(verifyA27Policy(policy), true);
const report = runA27Benchmark(policy);
assert.equal(verifyA27Benchmark(report, policy), true);
assert.equal(report.denominators.cases, 192);
assert.equal(report.denominators.frozen, 72);
assert.equal(report.denominators.mutations, 2304);
assert.equal(report.frozen.accuracy, 1);
assert.equal(report.frozen.unsafeEligible, 0);
assert.equal(report.frozen.falseBlocks, 0);
assert.equal(report.mutation.killRate, 1);
assert.equal(report.officialNativeForkRunnerExecuted, false);
assert.equal(report.publicNetworkProviderUsed, false);
assert.equal(report.paidGateEligible, false);
console.log(JSON.stringify({ status: "PASS_A27_FORK_REPLAY_EVIDENCE", cases: report.denominators.cases, frozen: report.denominators.frozen, mutations: report.denominators.mutations, accuracy: report.frozen.accuracy, mutationKillRate: report.mutation.killRate, sellEnabled: 0 }, null, 2));
