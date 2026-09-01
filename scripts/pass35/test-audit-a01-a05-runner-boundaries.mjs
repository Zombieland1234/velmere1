#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";

const node = process.execPath;
const script = "scripts/pass35/run-audit-a01-a05-case.ts";
const fixture = "fixtures/pass35/audit-a01-a05/synthetic-risky-upgradeable.json";
const safeOutput = "fixtures/pass35/audit-a01-a05/PASS35_A3_RUNNER_BOUNDARY_TEMP.json";
const run = (args) => spawnSync(node, ["--experimental-strip-types", script, ...args], { cwd: process.cwd(), encoding: "utf8" });

rmSync(safeOutput, { force: true });
const safe = run(["--input", fixture, "--output", safeOutput]);
assert.equal(safe.status, 0, safe.stderr);
assert.equal(existsSync(safeOutput), true);
rmSync(safeOutput, { force: true });

const activeArtifact = run(["--input", fixture, "--output", "artifacts/pass35/FORBIDDEN_SYNTHETIC_RECEIPT.json"]);
assert.notEqual(activeArtifact.status, 0);
assert.match(`${activeArtifact.stderr}${activeArtifact.stdout}`, /synthetic_output_must_stay_in_fixture_tree/u);
assert.equal(existsSync("artifacts/pass35/FORBIDDEN_SYNTHETIC_RECEIPT.json"), false);

const traversal = run(["--input", fixture, "--output", "../FORBIDDEN.json"]);
assert.notEqual(traversal.status, 0);
assert.match(`${traversal.stderr}${traversal.stdout}`, /path_outside_root/u);

const customerFixture = JSON.parse(await (await import("node:fs/promises")).readFile(fixture, "utf8"));
customerFixture.inputClass = "CUSTOMER_SUPPLIED_UNVERIFIED";
const customerInput = "fixtures/pass35/audit-a01-a05/PASS35_A3_CUSTOMER_CLASS_TEMP.json";
await (await import("node:fs/promises")).writeFile(customerInput, `${JSON.stringify(customerFixture, null, 2)}\n`);
const publicCustomerOutput = run(["--input", customerInput, "--output", "fixtures/pass35/audit-a01-a05/FORBIDDEN_CUSTOMER_RECEIPT.json"]);
assert.notEqual(publicCustomerOutput.status, 0);
assert.match(`${publicCustomerOutput.stderr}${publicCustomerOutput.stdout}`, /customer_output_must_stay_in_private_case_store/u);
rmSync(customerInput, { force: true });
rmSync("fixtures/pass35/audit-a01-a05/FORBIDDEN_CUSTOMER_RECEIPT.json", { force: true });

console.log(JSON.stringify({ status: "PASS", assertions: 10, syntheticFixtureIsolation: true, customerPrivateStoreRequired: true, traversalRejected: true }, null, 2));
