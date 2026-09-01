#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runA32Benchmark, verifyA32Benchmark, verifyA32Policy } from "../../lib/security/pass35-a32-report-delivery-runtime.mjs";
const policy=JSON.parse(readFileSync("config/pass35/a32-report-delivery-policy.json","utf8"));
assert.equal(verifyA32Policy(policy),true,"policy invalid");
const runtime=runA32Benchmark(policy);
assert.equal(verifyA32Benchmark(runtime,policy),true,"benchmark invalid");
assert.deepEqual(runtime.denominators,{cases:192,frozen:72,mutations:2304,families:12});
assert.equal(runtime.development.accuracy,1);assert.equal(runtime.frozen.accuracy,1);assert.equal(runtime.frozen.unsafeEligible,0);assert.equal(runtime.frozen.falseBlocks,0);assert.equal(runtime.mutation.killRate,1);
console.log(JSON.stringify({status:"PASS_A32_REPORT_DELIVERY",cases:192,frozen:72,mutations:2304,accuracy:1,mutationKillRate:1,unsafeEligible:0},null,2));
