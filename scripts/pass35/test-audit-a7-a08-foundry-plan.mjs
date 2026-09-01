#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
const sha256 = (value) => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const stable = (value) => value === null || typeof value !== "object" ? JSON.stringify(value) : Array.isArray(value) ? `[${value.map(stable).join(",")}]` : `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
const plan = JSON.parse(readFileSync("config/pass35/a08-foundry-invariant-plan.json", "utf8"));
const current = JSON.parse(readFileSync("config/current-release.json", "utf8"));
let assertions = 0;
const check = (condition, message) => { assertions += 1; assert.ok(condition, message); };
check(plan.schemaVersion === "velmere.pass35.a08-foundry-invariant-plan.v1", "plan schema invalid");
check(plan.sourceRevisionId === current.sourceRevisionId, "revision invalid");
check(plan.status === "PREPARED_TARGET_NOT_EXECUTED", "target status invalid");
check(plan.officialForgeExecuted === false && plan.compiledTargetExecuted === false && plan.implementationModelEquivalenceProven === false, "plan falsely claims execution/equivalence");
check(plan.paidGateEligible === false && plan.fullAuditClaimAllowed === false, "plan unlocked paid/full claim");
check(Array.isArray(plan.invariantMappings) && plan.invariantMappings.length === 4, "invariant mapping count invalid");
check(new Set(plan.invariantMappings.map((row) => row.modelInvariantId)).size === 4, "duplicate model invariant IDs");
check(new Set(plan.invariantMappings.map((row) => row.foundryFunction)).size === 4, "duplicate Foundry functions");
const files = plan.projectInventory;
check(Array.isArray(files) && files.length === 3, "project inventory invalid");
for (const row of files) {
  check(existsSync(row.path) && statSync(row.path).isFile(), `missing invariant project file:${row.path}`);
  check(row.sha256 === sha256(readFileSync(row.path)) && row.byteLength === statSync(row.path).size, `project file digest invalid:${row.path}`);
}
check(plan.projectInventorySha256 === sha256(stable(files)), "project inventory root invalid");
check(plan.modelSourceSha256 === sha256(readFileSync(plan.modelSourcePath)), "model source binding invalid");
const testSource = readFileSync(plan.invariantTestPath, "utf8");
for (const row of plan.invariantMappings) check(testSource.includes(`function ${row.foundryFunction}(`), `Foundry invariant function missing:${row.foundryFunction}`);
check(testSource.includes("A7 does not claim official Forge execution"), "truth marker missing from prepared target");
console.log(JSON.stringify({ status: "PASS_AUDIT_A7_A08_FOUNDRY_PLAN", assertions, invariantMappings: plan.invariantMappings.length, officialForgeExecuted: false, paidGateEligible: false, projectInventorySha256: plan.projectInventorySha256 }, null, 2));
