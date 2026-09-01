#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";

let assertions = 0;
const check = (condition, message) => { assertions += 1; assert.ok(condition, message); };
const node = process.execPath;
const forgeOut = "fixtures/pass35/audit-a6/PASS35_A6_FORGE_RUNNER_TEST_RECEIPT.json";
const fuzzOut = "fixtures/pass35/audit-a6/PASS35_A6_A08_RUNNER_TEST_RECEIPT.json";
for (const file of [forgeOut, fuzzOut]) if (existsSync(file)) rmSync(file);
const forge = spawnSync(node, ["scripts/pass35/run-audit-a6-forge-case.mjs", "--input", "fixtures/pass35/audit-a6/synthetic-forge-case.json", "--tool", "fixtures/pass35/audit-a6/fake-forge-tool.json", "--output", forgeOut], { encoding: "utf8" });
check(forge.status === 0 && existsSync(forgeOut), `Forge runner failed: ${forge.stderr}`);
const fuzz = spawnSync(node, ["--experimental-strip-types", "scripts/pass35/run-audit-a6-a08-case.ts", "--input", "fixtures/pass35/audit-a6/synthetic-a08-model-fuzz-case.json", "--output", fuzzOut], { encoding: "utf8" });
check(fuzz.status === 0 && existsSync(fuzzOut), `A08 runner failed: ${fuzz.stderr}`);
const forgeTraversal = spawnSync(node, ["scripts/pass35/run-audit-a6-forge-case.mjs", "--input", "fixtures/pass35/audit-a6/synthetic-forge-case.json", "--tool", "fixtures/pass35/audit-a6/fake-forge-tool.json", "--output", "../forge-leak.json"], { encoding: "utf8" });
check(forgeTraversal.status !== 0 && `${forgeTraversal.stderr}${forgeTraversal.stdout}`.includes("a6_forge_output_outside_root"), "Forge output traversal not blocked");
const fuzzTraversal = spawnSync(node, ["--experimental-strip-types", "scripts/pass35/run-audit-a6-a08-case.ts", "--input", "fixtures/pass35/audit-a6/synthetic-a08-model-fuzz-case.json", "--output", "../fuzz-leak.json"], { encoding: "utf8" });
check(fuzzTraversal.status !== 0 && `${fuzzTraversal.stderr}${fuzzTraversal.stdout}`.includes("a6_a08_output_outside_root"), "A08 output traversal not blocked");
for (const file of [forgeOut, fuzzOut]) if (existsSync(file)) rmSync(file);
console.log(JSON.stringify({ status: "PASS_AUDIT_A6_RUNNER_BOUNDARIES", assertions, paidGateEligible: false }, null, 2));
