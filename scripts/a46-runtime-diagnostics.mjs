#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { currentNpmVersion, VELMERE_RUNTIME } from "./lib/velmere-runtime-contract.mjs";

const root = process.cwd();
const write = process.argv.includes("--write");
const staticOnly = process.argv.includes("--static");
const checks = [];
const check = (id, ok, detail = null, skipped = false) => checks.push({ id, ok: Boolean(ok), detail, skipped: Boolean(skipped) });
const required = [
  "config/pass35/a46-customer-data-plane-acceptance.json",
  "scripts/a46-data-plane-acceptance.mjs",
  "scripts/a46-exact-data-acceptance.mjs",
  "scripts/a46-package-evidence.mjs",
  "scripts/pass35/test-a46-customer-data-plane-acceptance.mjs",
  "scripts/pass35/test-a46-data-plane-fixture.mjs",
  "VELMERE_RUN_A46_DATA_ACCEPTANCE.cmd",
  "VELMERE_A46_PATCH.txt",
];
for (const file of required) check(`file:${file}`, fs.existsSync(path.join(root, file)), file);
let contract = null;
try { contract = JSON.parse(fs.readFileSync(path.join(root, "config/pass35/a46-customer-data-plane-acceptance.json"), "utf8")); check("contract:loads", true); }
catch (error) { check("contract:loads", false, error instanceof Error ? error.message : String(error)); }
check("contract:revision", contract?.revisionId === "VELMERE_PASS35_A46_CUSTOMER_UI_DATA_PLANE_ACCEPTANCE", contract?.revisionId);
check("contract:checks", Array.isArray(contract?.checks) && contract.checks.length === 9, contract?.checks?.length);
check("contract:integrity_visual", contract?.integrity?.summary?.visualFiles === 338, contract?.integrity?.summary);
check("contract:integrity_engine", contract?.integrity?.summary?.protectedEngineMatched === 510, contract?.integrity?.summary);
check("contract:integrity_assets", contract?.integrity?.summary?.publicAssetsMatched === 225, contract?.integrity?.summary);
const test = spawnSync(process.execPath, ["scripts/pass35/test-a46-customer-data-plane-acceptance.mjs"], { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
check("regression:a46_contract", test.status === 0, { status: test.status, stdout: test.stdout?.trim(), stderr: test.stderr?.trim() });
if (staticOnly) {
  check("runtime:node_exact", true, { observed: process.versions.node, expected: VELMERE_RUNTIME.node }, true);
  check("runtime:npm_exact", true, { observed: currentNpmVersion(), expected: VELMERE_RUNTIME.npm }, true);
} else {
  check("runtime:node_exact", process.versions.node === VELMERE_RUNTIME.node, { observed: process.versions.node, expected: VELMERE_RUNTIME.node });
  check("runtime:npm_exact", currentNpmVersion() === VELMERE_RUNTIME.npm, { observed: currentNpmVersion(), expected: VELMERE_RUNTIME.npm });
}
const failures = checks.filter((row) => !row.ok);
const report = { schemaVersion: "velmere.pass35.a46.runtime-diagnostics.v1", revisionId: "VELMERE_PASS35_A46_CUSTOMER_UI_DATA_PLANE_ACCEPTANCE", generatedAt: new Date().toISOString(), truthBoundary: staticOnly ? "Static A46 customer/data-plane diagnostics; live providers and exact runtime are not credited." : "Exact A46 preflight on the executing machine.", runtime: { node: process.versions.node, npm: currentNpmVersion(), expectedNode: VELMERE_RUNTIME.node, expectedNpm: VELMERE_RUNTIME.npm }, summary: { checks: checks.length, passed: checks.length - failures.length, failed: failures.length, skipped: checks.filter((row) => row.skipped).length }, failures, checks };
if (write) { const target = path.join(root, "artifacts/pass35/a46/PASS35_A46_RUNTIME_DIAGNOSTICS.json"); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, `${JSON.stringify(report, null, 2)}\n`, "utf8"); }
console.log(JSON.stringify(report.summary, null, 2));
if (failures.length) process.exit(1);
