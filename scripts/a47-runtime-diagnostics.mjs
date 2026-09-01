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
  "config/pass35/a47-acceptance-evidence-intake.json", "scripts/lib/a47-safe-zip.mjs", "scripts/a47-evidence-intake.mjs",
  "scripts/a47-package-evidence.mjs", "scripts/a47-runtime-diagnostics.mjs", "scripts/pass35/test-a47-acceptance-evidence-intake.mjs",
  "scripts/pass35/test-a47-evidence-intake-fixture.mjs", "scripts/pass35/verify-a47-source-manifest.mjs", "VELMERE_IMPORT_A47_ACCEPTANCE_EVIDENCE.cmd", "VELMERE_A47_PATCH.txt",
];
for (const file of required) check(`file:${file}`, fs.existsSync(path.join(root, file)), file);
let contract = null;
try { contract = JSON.parse(fs.readFileSync(path.join(root, "config/pass35/a47-acceptance-evidence-intake.json"), "utf8")); check("contract:loads", true); }
catch (error) { check("contract:loads", false, error instanceof Error ? error.message : String(error)); }
check("contract:revision", contract?.revisionId === "VELMERE_PASS35_A47_ACCEPTANCE_EVIDENCE_INTAKE_TRIAGE", contract?.revisionId);
check("contract:a45_stages", Array.isArray(contract?.requiredA45Stages) && contract.requiredA45Stages.length >= 12, contract?.requiredA45Stages?.length);
check("contract:a46_checks", Array.isArray(contract?.requiredA46Checks) && contract.requiredA46Checks.length === 9, contract?.requiredA46Checks?.length);
check("contract:integrity", contract?.integrity?.visualFiles === 338 && contract?.integrity?.publicAssets === 225 && contract?.integrity?.protectedEngineFiles === 510, contract?.integrity);
const test = spawnSync(process.execPath, ["scripts/pass35/test-a47-acceptance-evidence-intake.mjs"], { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
check("regression:a47_contract", test.status === 0, { status: test.status, stdout: test.stdout?.trim(), stderr: test.stderr?.trim() });
if (staticOnly) {
  check("runtime:node_exact", true, { observed: process.versions.node, expected: VELMERE_RUNTIME.node }, true);
  check("runtime:npm_exact", true, { observed: currentNpmVersion(), expected: VELMERE_RUNTIME.npm }, true);
} else {
  check("runtime:node_exact", process.versions.node === VELMERE_RUNTIME.node, { observed: process.versions.node, expected: VELMERE_RUNTIME.node });
  check("runtime:npm_exact", currentNpmVersion() === VELMERE_RUNTIME.npm, { observed: currentNpmVersion(), expected: VELMERE_RUNTIME.npm });
}
const failures = checks.filter((row) => !row.ok);
const report = { schemaVersion: "velmere.pass35.a47.runtime-diagnostics.v1", revisionId: "VELMERE_PASS35_A47_ACCEPTANCE_EVIDENCE_INTAKE_TRIAGE", generatedAt: new Date().toISOString(), truthBoundary: staticOnly ? "Static A47 importer diagnostics; no imported customer evidence is credited." : "Exact A47 evidence-intake preflight.", runtime: { node: process.versions.node, npm: currentNpmVersion(), expectedNode: VELMERE_RUNTIME.node, expectedNpm: VELMERE_RUNTIME.npm }, summary: { checks: checks.length, passed: checks.length - failures.length, failed: failures.length, skipped: checks.filter((row) => row.skipped).length }, failures, checks };
if (write) { const target = path.join(root, "artifacts/pass35/a47/PASS35_A47_RUNTIME_DIAGNOSTICS.json"); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, `${JSON.stringify(report, null, 2)}\n`, "utf8"); }
console.log(JSON.stringify(report.summary, null, 2));
if (failures.length) process.exit(1);
