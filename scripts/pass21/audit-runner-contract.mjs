#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
const root = process.cwd();
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const policy = JSON.parse(fs.readFileSync(path.join(root, "config/pass21/gate-policy.json"), "utf8"));
const runner = fs.readFileSync(path.join(root, "VELMERE_RUN_FULL_CHECK.ps1"), "utf8");
const scripts = packageJson.scripts ?? {}; const issues=[]; const commands=[];
function refs(command){return [...command.matchAll(/npm\s+run\s+([\w:.-]+)/gu)].map((m)=>m[1]);}
for(const [levelName,level] of Object.entries(policy.levels??{})){for(const command of level.commands??[])commands.push({levelName,command});for(const [domainName,domainCommands] of Object.entries(level.domains??{}))for(const command of domainCommands)commands.push({levelName:`${levelName}:${domainName}`,command});}
for(const row of commands)for(const name of refs(row.command))if(!scripts[name])issues.push(`missing_package_script:${row.levelName}:${name}`);
const lineCount=runner.split(/\r?\n/u).length;
if(lineCount>90)issues.push(`runner_too_large:${lineCount}`);
if(/PASS4\d{3}/u.test(runner))issues.push("runner_contains_historical_pass_markers");
if(!runner.includes("scripts/pass21/run-gate.mjs"))issues.push("runner_not_bound_to_pass21_gate");
if(!runner.includes("AllowHeavy"))issues.push("runner_missing_heavy_execution_guard");
if(scripts.preinstall?.includes("gate:milestone")||scripts.preinstall?.includes("gate:release"))issues.push("heavy_gate_bound_to_preinstall");
const result={schemaVersion:"velmere.pass21.runner-contract.v1",generatedAt:"2026-07-20T12:00:00.000Z",ok:issues.length===0,runner:{path:"VELMERE_RUN_FULL_CHECK.ps1",lineCount,heavyExecutionGuard:runner.includes("AllowHeavy")},packageScriptCount:Object.keys(scripts).length,policyCommandCount:commands.length,issues};
console.log(JSON.stringify(result,null,2));if(!result.ok)process.exit(1);
