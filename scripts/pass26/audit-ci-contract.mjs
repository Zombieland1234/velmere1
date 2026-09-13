#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const workflowsDir = path.join(root, ".github", "workflows");
const packageScripts = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).scripts ?? {};
const files = fs.readdirSync(workflowsDir).filter((name) => /\.ya?ml$/u.test(name)).sort();
const expectedActive = new Set([
  "pass26-exact-runtime-bridge.yml",
  "pass4992-supply-chain-security.yml",
  "quality-and-fresh-builds.yml",
  "r11b-integration-v8-browser-gate.yml",
  "r11b-internal-readonly-gate.yml",
]);
const exactHeadEvidenceConcurrencyAdvisory = new Set([
  "r11b-integration-v8-browser-gate.yml",
  "r11b-internal-readonly-gate.yml",
]);
const expectedRetired = new Set([
  "p41-exact-windows-node24-current-root-closure.yml",
  "p42-exact-windows-node24-lifecycle-quarantine.yml",
  "p42-exact-windows-semantic-dual-build.yml",
  "p47-windows-build-relevant-projection.yml",
  "p65-current-free-legal-source-receipts.yml",
  "r10-candidate-truth-gate.yml",
  "r10-full-parallel-pass.yml",
  "r10-integration-gate.yml",
  "r10-lint-scope-audit.yml",
  "r10-pdf-dashboard-verify.yml",
  "r10-runtime-browser-smoke.yml",
  "r10-typecheck-remediation-verify.yml",
  "r11-redteam-remediation-gate.yml",
  "r6-exact-windows-current-byte-closure.yml",
]);
const errors = [];
const warnings = [];
const rows = [];
const actionPattern = /^\s*uses:\s*([^\s#]+)(?:\s*#.*)?$/gmu;
const npmRunPattern = /\bnpm\s+run\s+([A-Za-z0-9:_-]+)/gu;
const npmCiPattern = /\bnpm\s+ci\b[^\r\n]*/gu;
const pinnedAction = /^(?:[A-Za-z0-9_.-]+\/){1,3}[A-Za-z0-9_.-]+@[a-f0-9]{40}$/u;
const exactSafeLightweightInstall = "npm ci --ignore-scripts --no-audit --no-fund";

for (const file of files) {
  const filePath = path.join(workflowsDir, file);
  const text = fs.readFileSync(filePath, "utf8");
  const npmRuns = [...text.matchAll(npmRunPattern)].map((match) => match[1]);
  const npmCiCommands = [...text.matchAll(npmCiPattern)].map((match) => match[0].trim());
  const missingScripts = [...new Set(npmRuns.filter((name) => !Object.hasOwn(packageScripts, name)))].sort();
  const actions = [...text.matchAll(actionPattern)].map((match) => match[1]);
  const unpinnedActions = actions.filter((value) => !pinnedAction.test(value));
  const checkoutCount = actions.filter((value) => value.startsWith("actions/checkout@")).length;
  const persistFalseCount = (text.match(/persist-credentials:\s*false/gu) ?? []).length;
  const hasConcurrency = /^concurrency:/mu.test(text);
  const forbiddenTrigger = /\bpull_request_target\s*:/u.test(text);
  const row = {
    file,
    npmRuns: [...new Set(npmRuns)].sort(),
    npmCiCommands,
    missingScripts,
    actions,
    unpinnedActions,
    checkoutCount,
    persistFalseCount,
    hasConcurrency,
    forbiddenTrigger,
  };
  rows.push(row);
  if (!expectedActive.has(file)) errors.push(`${file}: unexpected active workflow; historical workflows must be outside .github/workflows`);
  if (missingScripts.length) errors.push(`${file}: missing package scripts: ${missingScripts.join(", ")}`);
  if (unpinnedActions.length) errors.push(`${file}: unpinned actions: ${unpinnedActions.join(", ")}`);
  if (checkoutCount !== persistFalseCount) errors.push(`${file}: each checkout must set persist-credentials:false`);
  if (!hasConcurrency) {
    if (exactHeadEvidenceConcurrencyAdvisory.has(file)) warnings.push(`${file}: no concurrency policy; accepted only because evidence artifacts and credit are exact-SHA-bound`);
    else errors.push(`${file}: missing concurrency policy`);
  }
  if (forbiddenTrigger) errors.push(`${file}: pull_request_target is forbidden`);
}
for (const expected of expectedActive) if (!files.includes(expected)) errors.push(`missing active workflow: ${expected}`);

const heavyPath = path.join(workflowsDir, "pass26-exact-runtime-bridge.yml");
if (fs.existsSync(heavyPath)) {
  const heavy = fs.readFileSync(heavyPath, "utf8");
  if (!/^\s*workflow_dispatch\s*:/mu.test(heavy)) errors.push("PASS26 heavy bridge must expose workflow_dispatch");
  if (/^\s*(?:pull_request|push|schedule)\s*:/mu.test(heavy)) errors.push("PASS26 heavy bridge must not run automatically");
  for (const token of ["run_dual_build", "bundle:runtime-cache", "run-exact-milestone.mjs", "build:webpack", "build:turbopack"]) {
    if (!heavy.includes(token)) errors.push(`PASS26 heavy bridge missing required token: ${token}`);
  }
}

const lightweightPath = path.join(workflowsDir, "quality-and-fresh-builds.yml");
if (fs.existsSync(lightweightPath)) {
  const light = fs.readFileSync(lightweightPath, "utf8");
  const ciCommands = [...light.matchAll(npmCiPattern)].map((match) => match[0].trim());
  if (ciCommands.length !== 1 || ciCommands[0] !== exactSafeLightweightInstall) {
    errors.push(`PASS26 lightweight workflow must contain exactly one safe lockfile install: ${exactSafeLightweightInstall}; observed=${JSON.stringify(ciCommands)}`);
  }
  for (const forbidden of ["npm run typecheck", "npm run lint", "npm test", "build:webpack", "build:turbopack"]) {
    if (light.includes(forbidden)) errors.push(`PASS26 lightweight workflow contains heavy command: ${forbidden}`);
  }
}

const retiredDir = path.join(root, "_velmere", "history", "retired-workflows");
const retired = fs.existsSync(retiredDir) ? fs.readdirSync(retiredDir).filter((name) => /\.ya?ml$/u.test(name)).sort() : [];
for (const expected of expectedRetired) if (!retired.includes(expected)) errors.push(`missing retired historical workflow: ${expected}`);
for (const active of files) if (expectedRetired.has(active)) errors.push(`${active}: historical workflow is still active`);
for (const retiredFile of retired) if (expectedActive.has(retiredFile)) errors.push(`${retiredFile}: current core workflow must not be retired`);
if (retired.length > expectedRetired.size) warnings.push(`retired workflow directory contains ${retired.length - expectedRetired.size} additional historical YAML file(s)`);

const report = {
  schemaVersion: "velmere.pass26.ci-contract.v2",
  ok: errors.length === 0,
  activeWorkflows: files,
  expectedActiveWorkflows: [...expectedActive].sort(),
  exactHeadEvidenceConcurrencyAdvisory: [...exactHeadEvidenceConcurrencyAdvisory].sort(),
  retiredWorkflowCount: retired.length,
  expectedRetiredWorkflowCount: expectedRetired.size,
  retiredWorkflows: retired,
  safeLightweightInstall: exactSafeLightweightInstall,
  errors,
  warnings,
  workflows: rows,
  truthBoundary: "This is a static CI-governance contract. Only five current core workflows may remain active; the enumerated historical workflows must live outside .github/workflows. PASS26 lightweight may perform exactly one script-disabled, no-audit, no-fund lockfile install for AST/static verification, while heavy typecheck/test/dual-build execution remains outside that workflow. Missing concurrency is advisory only for the two read-only R11B evidence gates because every evidence artifact and credit decision is bound to the exact Git SHA; it grants no cross-SHA evidence transfer. A GitHub Actions run and downloaded runtime/cache artifact remain required for exact milestone proof.",
};
fs.mkdirSync(path.join(root, "config", "pass26"), { recursive: true });
fs.writeFileSync(path.join(root, "config", "pass26", "ci-contract.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`PASS26 CI contract: active=${files.length} retired=${retired.length} errors=${errors.length} warnings=${warnings.length}`);
if (!report.ok) {
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
