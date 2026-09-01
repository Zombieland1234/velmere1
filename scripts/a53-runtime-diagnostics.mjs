#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { currentNpmVersion } from "./lib/velmere-runtime-contract.mjs";
const root = process.cwd();
const write = process.argv.includes("--write");
const staticOnly = process.argv.includes("--static");
const contract = JSON.parse(fs.readFileSync(path.join(root, "config/pass35/a53-measured-slo-alert-ack-vendor-exit-acceptance.json"), "utf8"));
const checks = [];
const check = (id, ok, detail = null, skipped = false) => checks.push({ id, ok: Boolean(ok), detail, skipped: Boolean(skipped) });
const required = [
  "config/pass35/a53-measured-slo-alert-ack-vendor-exit-acceptance.json", "config/pass35/a53-source-manifest.json",
  "scripts/a53-measured-slo-alert-ack-vendor-exit-acceptance.mjs", "scripts/a53-package-evidence.mjs",
  "scripts/a53-runtime-diagnostics.mjs", "scripts/pass35/test-a53-measured-slo-alert-ack-vendor-exit-acceptance.mjs",
  "scripts/pass35/test-a53-measured-slo-alert-ack-vendor-exit-fixture.mjs", "scripts/pass35/verify-a53-source-manifest.mjs",
  "VELMERE_RUN_A53_MEASURED_SLO_ALERT_ACK_VENDOR_EXIT_ACCEPTANCE.cmd", "VELMERE_A53_PATCH.txt"
];
for (const file of required) check(`file:${file}`, fs.existsSync(path.join(root, file)), file);
check("contract:revision", contract.revisionId === "VELMERE_PASS35_A53_MEASURED_SLO_ALERT_ACK_VENDOR_EXIT_ACCEPTANCE", contract.revisionId);
check("contract:checks", contract.requiredChecks?.length === 33, contract.requiredChecks?.length);
check("contract:env", contract.requiredEnvironment?.length === 13, contract.requiredEnvironment?.length);
const regression = spawnSync(process.execPath, ["scripts/pass35/test-a53-measured-slo-alert-ack-vendor-exit-acceptance.mjs"], { cwd: root, encoding: "utf8", maxBuffer: 128 * 1024 * 1024 });
check("regression:a53_contract", regression.status === 0, { status: regression.status, stdout: regression.stdout?.trim(), stderr: regression.stderr?.trim() });
if (staticOnly) {
  check("runtime:node_exact", true, { observed: process.versions.node, expected: contract.runtime.node }, true);
  check("runtime:npm_exact", true, { observed: currentNpmVersion(), expected: contract.runtime.npm }, true);
} else {
  check("runtime:node_exact", process.versions.node === contract.runtime.node, { observed: process.versions.node, expected: contract.runtime.node });
  check("runtime:npm_exact", currentNpmVersion() === contract.runtime.npm, { observed: currentNpmVersion(), expected: contract.runtime.npm });
}
for (const name of contract.requiredEnvironment) check(`env:${name}`, staticOnly || Boolean(process.env[name]), { present: Boolean(process.env[name]) }, staticOnly);
const failures = checks.filter((row) => !row.ok);
const report = { schemaVersion: "velmere.pass35.a53.runtime-diagnostics.v1", revisionId: contract.revisionId, generatedAt: new Date().toISOString(), truthBoundary: staticOnly ? "Static A53 diagnostics; no measured SLO, alert/ACK telemetry or vendor-exit staging credit." : "Exact A53 preflight. Secret values are never printed.", runtime: { node: process.versions.node, npm: currentNpmVersion(), expectedNode: contract.runtime.node, expectedNpm: contract.runtime.npm }, summary: { checks: checks.length, passed: checks.length - failures.length, failed: failures.length, skipped: checks.filter((row) => row.skipped).length }, failures, checks };
if (write) { const target = path.join(root, "artifacts/pass35/a53/PASS35_A53_RUNTIME_DIAGNOSTICS.json"); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, `${JSON.stringify(report, null, 2)}\n`); }
console.log(JSON.stringify(report.summary, null, 2));
if (failures.length) process.exit(1);
