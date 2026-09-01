#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const workflowsDir = path.join(root, ".github", "workflows");
const packageScripts = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).scripts ?? {};
const files = fs.readdirSync(workflowsDir).filter((name) => /\.ya?ml$/u.test(name)).sort();
const expectedActive = new Set(["pass26-exact-runtime-bridge.yml", "pass4992-supply-chain-security.yml", "quality-and-fresh-builds.yml"]);
const errors = [];
const warnings = [];
const rows = [];
const actionPattern = /^\s*uses:\s*([^\s#]+)(?:\s*#.*)?$/gmu;
const npmRunPattern = /\bnpm\s+run\s+([A-Za-z0-9:_-]+)/gu;
const pinnedAction = /^(?:[A-Za-z0-9_.-]+\/){1,3}[A-Za-z0-9_.-]+@[a-f0-9]{40}$/u;

for (const file of files) {
  const filePath = path.join(workflowsDir, file);
  const text = fs.readFileSync(filePath, "utf8");
  const npmRuns = [...text.matchAll(npmRunPattern)].map((match) => match[1]);
  const missingScripts = [...new Set(npmRuns.filter((name) => !Object.hasOwn(packageScripts, name)))].sort();
  const actions = [...text.matchAll(actionPattern)].map((match) => match[1]);
  const unpinnedActions = actions.filter((value) => !pinnedAction.test(value));
  const checkoutCount = actions.filter((value) => value.startsWith("actions/checkout@")).length;
  const persistFalseCount = (text.match(/persist-credentials:\s*false/gu) ?? []).length;
  const hasConcurrency = /^concurrency:/mu.test(text);
  const forbiddenTrigger = /\bpull_request_target\s*:/u.test(text);
  const row = { file, npmRuns: [...new Set(npmRuns)].sort(), missingScripts, actions, unpinnedActions, checkoutCount, persistFalseCount, hasConcurrency, forbiddenTrigger };
  rows.push(row);
  if (!expectedActive.has(file)) errors.push(`${file}: unexpected active workflow; historical workflows must be outside .github/workflows`);
  if (missingScripts.length) errors.push(`${file}: missing package scripts: ${missingScripts.join(", ")}`);
  if (unpinnedActions.length) errors.push(`${file}: unpinned actions: ${unpinnedActions.join(", ")}`);
  if (checkoutCount !== persistFalseCount) errors.push(`${file}: each checkout must set persist-credentials:false`);
  if (!hasConcurrency) errors.push(`${file}: missing concurrency policy`);
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
  for (const forbidden of ["npm ci", "npm run typecheck", "npm run lint", "npm test", "build:webpack", "build:turbopack"]) {
    if (light.includes(forbidden)) errors.push(`PASS26 lightweight workflow contains heavy command: ${forbidden}`);
  }
}
const retiredDir = path.join(root, "_velmere", "history", "retired-workflows");
const retired = fs.existsSync(retiredDir) ? fs.readdirSync(retiredDir).filter((name) => /\.ya?ml$/u.test(name)).sort() : [];
if (retired.length < 6) warnings.push(`expected at least 6 retired historical workflows, found ${retired.length}`);
const report = {
  schemaVersion: "velmere.pass26.ci-contract.v1",
  ok: errors.length === 0,
  activeWorkflows: files,
  expectedActiveWorkflows: [...expectedActive].sort(),
  retiredWorkflowCount: retired.length,
  retiredWorkflows: retired,
  errors,
  warnings,
  workflows: rows,
  truthBoundary: "This is a static CI contract. A GitHub Actions run and downloaded runtime/cache artifact remain required for exact milestone proof.",
};
fs.mkdirSync(path.join(root, "config", "pass26"), { recursive: true });
fs.writeFileSync(path.join(root, "config", "pass26", "ci-contract.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`PASS26 CI contract: active=${files.length} retired=${retired.length} errors=${errors.length} warnings=${warnings.length}`);
if (!report.ok) {
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
