#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { currentNpmVersion } from "./lib/velmere-runtime-contract.mjs";

const root = process.cwd();
const write = process.argv.includes("--write");
const staticOnly = process.argv.includes("--static");
const contract = JSON.parse(fs.readFileSync(path.join(root, "config/pass35/a48-staging-tenant-isolation.json"), "utf8"));
const checks = [];
const check = (id, ok, detail = null, skipped = false) => checks.push({ id, ok: Boolean(ok), detail, skipped: Boolean(skipped) });
const required = [
  "config/pass35/a48-staging-tenant-isolation.json", "config/pass35/a48-source-manifest.json", "scripts/a48-staging-tenant-isolation.mjs", "scripts/a48-package-evidence.mjs",
  "scripts/a48-runtime-diagnostics.mjs", "scripts/pass35/test-a48-staging-tenant-isolation.mjs", "scripts/pass35/test-a48-staging-fixture.mjs",
  "scripts/pass35/verify-a48-source-manifest.mjs", "VELMERE_RUN_A48_STAGING_TENANT_ISOLATION.cmd", "VELMERE_A48_PATCH.txt"
];
for (const file of required) check(`file:${file}`, fs.existsSync(path.join(root, file)), file);
check("contract:revision", contract.revisionId === "VELMERE_PASS35_A48_STAGING_TENANT_ISOLATION_ACCEPTANCE", contract.revisionId);
check("contract:checks", contract.requiredChecks?.length === 18, contract.requiredChecks?.length);
check("contract:env", contract.requiredEnvironment?.length === 7, contract.requiredEnvironment?.length);
const test = spawnSync(process.execPath, ["scripts/pass35/test-a48-staging-tenant-isolation.mjs"], { cwd: root, encoding: "utf8", maxBuffer: 96 * 1024 * 1024 });
check("regression:a48_contract", test.status === 0, { status: test.status, stdout: test.stdout?.trim(), stderr: test.stderr?.trim() });
if (staticOnly) {
  check("runtime:node_exact", true, { observed: process.versions.node, expected: contract.runtime.node }, true);
  check("runtime:npm_exact", true, { observed: currentNpmVersion(), expected: contract.runtime.npm }, true);
  check("tool:psql", true, { requiredForRealRun: true }, true);
} else {
  check("runtime:node_exact", process.versions.node === contract.runtime.node, { observed: process.versions.node, expected: contract.runtime.node });
  check("runtime:npm_exact", currentNpmVersion() === contract.runtime.npm, { observed: currentNpmVersion(), expected: contract.runtime.npm });
  const psql = spawnSync("psql", ["--version"], { encoding: "utf8", windowsHide: true });
  check("tool:psql", psql.status === 0, { status: psql.status, versionSha256: psql.stdout ? (await import("node:crypto")).createHash("sha256").update(psql.stdout).digest("hex") : null });
}
for (const name of contract.requiredEnvironment) check(`env:${name}`, staticOnly || Boolean(process.env[name]), { present: Boolean(process.env[name]) }, staticOnly);
const failures = checks.filter((row) => !row.ok);
const report = {
  schemaVersion: "velmere.pass35.a48.runtime-diagnostics.v1", revisionId: contract.revisionId, generatedAt: new Date().toISOString(),
  truthBoundary: staticOnly ? "Static A48 staging harness diagnostics; no staging evidence is credited." : "Exact A48 staging preflight. Secrets are reported only as present/missing.",
  runtime: { node: process.versions.node, npm: currentNpmVersion(), expectedNode: contract.runtime.node, expectedNpm: contract.runtime.npm },
  summary: { checks: checks.length, passed: checks.length - failures.length, failed: failures.length, skipped: checks.filter((row) => row.skipped).length }, failures, checks
};
if (write) { const target = path.join(root, "artifacts/pass35/a48/PASS35_A48_RUNTIME_DIAGNOSTICS.json"); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, `${JSON.stringify(report, null, 2)}\n`, "utf8"); }
console.log(JSON.stringify(report.summary, null, 2));
if (failures.length) process.exit(1);
