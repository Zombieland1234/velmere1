#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const policy = JSON.parse(fs.readFileSync(path.join(root, "config/pass16/gate-policy.json"), "utf8"));
const runnerPath = path.join(root, "VELMERE_RUN_FULL_CHECK.ps1");
const runner = fs.readFileSync(runnerPath, "utf8");
const scripts = packageJson.scripts ?? {};
const issues = [];

function npmScriptReferences(command) {
  const matches = [...command.matchAll(/npm\s+run\s+([\w:.-]+)/gu)];
  return matches.map((match) => match[1]);
}

const commands = [];
for (const [levelName, level] of Object.entries(policy.levels ?? {})) {
  for (const command of level.commands ?? []) commands.push({ levelName, command });
  for (const [domainName, domainCommands] of Object.entries(level.domains ?? {})) {
    for (const command of domainCommands) commands.push({ levelName: `${levelName}:${domainName}`, command });
  }
}
for (const row of commands) {
  for (const scriptName of npmScriptReferences(row.command)) {
    if (!scripts[scriptName]) issues.push(`missing_package_script:${row.levelName}:${scriptName}`);
  }
}

const lineCount = runner.split(/\r?\n/u).length;
if (lineCount > 80) issues.push(`runner_too_large:${lineCount}`);
if (/PASS4\d{3}/u.test(runner)) issues.push("runner_contains_historical_pass_markers");
if (!runner.includes("scripts/pass16/run-gate.mjs")) issues.push("runner_not_bound_to_pass16_gate");
if (!runner.includes("AllowHeavy")) issues.push("runner_missing_heavy_execution_guard");
if (scripts.preinstall?.includes("gate:milestone") || scripts.preinstall?.includes("gate:release")) {
  issues.push("heavy_gate_bound_to_preinstall");
}

const result = {
  schemaVersion: "velmere.pass16.runner-contract.v1",
  generatedAt: new Date().toISOString(),
  ok: issues.length === 0,
  runner: {
    path: "VELMERE_RUN_FULL_CHECK.ps1",
    lineCount,
    historicalPassMarkers: [...runner.matchAll(/PASS4\d{3}/gu)].length,
    heavyExecutionGuard: runner.includes("AllowHeavy")
  },
  packageScriptCount: Object.keys(scripts).length,
  policyCommandCount: commands.length,
  issues
};
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(1);
