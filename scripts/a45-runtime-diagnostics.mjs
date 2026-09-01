#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { currentNpmVersion, VELMERE_RUNTIME } from "./lib/velmere-runtime-contract.mjs";

const root = process.cwd();
const staticOnly = process.argv.includes("--static");
const write = process.argv.includes("--write");
const checks = [];
const check = (id, ok, detail = null, skipped = false) => checks.push({ id, ok: Boolean(ok), detail, skipped: Boolean(skipped) });
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const sha256 = (file) => crypto.createHash("sha256").update(fs.readFileSync(path.join(root, file))).digest("hex");
const revision = "VELMERE_PASS35_A45_EXACT_RUNTIME_BROWSER_ACCEPTANCE";
const contractPath = "config/pass35/a45-exact-runtime-browser-acceptance.json";
let contract = null;
try { contract = JSON.parse(read(contractPath)); check("contract:loads", true); } catch (error) { check("contract:loads", false, error instanceof Error ? error.message : String(error)); }
const required = [
  contractPath, "VELMERE_A45_PATCH.txt", "VELMERE_START_A45.cmd", "VELMERE_RUN_A45_ACCEPTANCE.cmd",
  "scripts/a45-runtime-diagnostics.mjs", "scripts/a45-exact-runtime-acceptance.mjs",
  "scripts/a45-browser-acceptance.mjs", "scripts/a45-package-evidence.mjs",
  "scripts/pass35/test-a45-exact-runtime-browser-acceptance.mjs",
  "config/pass35/a44-visual-master-engine-binding.json", "VELMERE_A44_PATCH.txt",
];
for (const file of required) check(`file:${file}`, fs.existsSync(path.join(root, file)), file);
const pkg = JSON.parse(read("package.json"));
check("identity:visual_parent", pkg.velmereVisualPass === "VELMERE_PASS35_A44_VISUAL_MASTER_ENGINE_BINDING", pkg.velmereVisualPass);
check("identity:a45_revision", pkg.velmereAcceptancePass === revision, pkg.velmereAcceptancePass);
check("identity:contract_revision", contract?.revisionId === revision, contract?.revisionId);
check("identity:parent", contract?.parentRevisionId === "VELMERE_PASS35_A44_VISUAL_MASTER_ENGINE_BINDING", contract?.parentRevisionId);
for (const [name, expected] of Object.entries({
  "diagnose:runtime:a45": "node scripts/a45-runtime-diagnostics.mjs --write",
  "test:pass35:a45": "node scripts/pass35/test-a45-exact-runtime-browser-acceptance.mjs",
  "accept:runtime:a45": "node scripts/a45-exact-runtime-acceptance.mjs",
  "accept:browser:a45": "node scripts/a45-browser-acceptance.mjs",
  "package:evidence:a45": "node scripts/a45-package-evidence.mjs"
})) check(`package:${name}`, pkg.scripts?.[name] === expected, pkg.scripts?.[name]);
check("contract:routes", Array.isArray(contract?.routes) && contract.routes.length === 9, contract?.routes?.length);
check("contract:locales", JSON.stringify(contract?.locales) === JSON.stringify(["pl", "en", "de"]), contract?.locales);
check("contract:popup_tabs", JSON.stringify(contract?.requiredPopupTabs) === JSON.stringify(["overview", "analysis", "market-impact", "whale-watch"]), contract?.requiredPopupTabs);
check("a44:contract_hash_bound", fs.existsSync(path.join(root, "config/pass35/a44-visual-master-engine-binding.json")), sha256("config/pass35/a44-visual-master-engine-binding.json"));
const test = spawnSync(process.execPath, ["scripts/pass35/test-a45-exact-runtime-browser-acceptance.mjs"], { cwd: root, encoding: "utf8" });
check("regression:a45_contract", test.status === 0, { status: test.status, stdout: test.stdout?.trim(), stderr: test.stderr?.trim() });
if (staticOnly) {
  check("runtime:node_exact", true, { observed: process.versions.node, expected: VELMERE_RUNTIME.node }, true);
  check("runtime:npm_exact", true, { observed: currentNpmVersion(), expected: VELMERE_RUNTIME.npm }, true);
} else {
  check("runtime:node_exact", process.versions.node === VELMERE_RUNTIME.node, { observed: process.versions.node, expected: VELMERE_RUNTIME.node });
  check("runtime:npm_exact", currentNpmVersion() === VELMERE_RUNTIME.npm, { observed: currentNpmVersion(), expected: VELMERE_RUNTIME.npm });
}
const failures = checks.filter((row) => !row.ok);
const report = { schemaVersion: "velmere.pass35.a45.runtime-diagnostics.v1", revisionId: revision, generatedAt: new Date().toISOString(), truthBoundary: staticOnly ? "Static acceptance-harness diagnostics; exact runtime and browser execution are not credited." : "Preflight for exact A45 acceptance on the executing machine.", runtime: { node: process.versions.node, npm: currentNpmVersion(), expectedNode: VELMERE_RUNTIME.node, expectedNpm: VELMERE_RUNTIME.npm }, summary: { checks: checks.length, passed: checks.length - failures.length, failed: failures.length, skipped: checks.filter((row) => row.skipped).length }, failures, checks };
if (write) { const target = path.join(root, "artifacts/pass35/a45/PASS35_A45_RUNTIME_DIAGNOSTICS.json"); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, `${JSON.stringify(report, null, 2)}\n`, "utf8"); }
console.log(JSON.stringify(report.summary, null, 2));
if (failures.length) process.exit(1);
