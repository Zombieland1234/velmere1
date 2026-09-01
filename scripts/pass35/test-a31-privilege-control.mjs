#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runA31Benchmark, verifyA31Benchmark, verifyA31Policy } from "../../lib/security/pass35-a31-privilege-control-runtime.mjs";
const read = (p) => JSON.parse(readFileSync(p, "utf8"));
const policy = read("config/pass35/a31-privilege-control-policy.json");
assert.equal(verifyA31Policy(policy), true, "policy invalid");
const runtime = runA31Benchmark(policy);
assert.equal(verifyA31Benchmark(runtime, policy), true, "benchmark invalid");
assert.deepEqual(runtime.denominators, { cases: 192, frozen: 72, mutations: 2304, families: 12 });
assert.equal(runtime.development.accuracy, 1);
assert.equal(runtime.frozen.accuracy, 1);
assert.equal(runtime.frozen.unsafeEligible, 0);
assert.equal(runtime.frozen.falseBlocks, 0);
assert.equal(runtime.mutation.killRate, 1);
console.log(JSON.stringify({ status: "PASS_A31_PRIVILEGE_CONTROL", cases: runtime.denominators.cases, frozen: runtime.denominators.frozen, mutations: runtime.denominators.mutations, accuracy: runtime.frozen.accuracy, mutationKillRate: runtime.mutation.killRate, unsafeEligible: runtime.frozen.unsafeEligible }, null, 2));
