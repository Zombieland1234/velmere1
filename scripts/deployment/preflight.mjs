#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { writeJson } from "./common.mjs";
import { validateDeploymentBuildCommands } from "./build-command-contract.mjs";

const root = process.cwd();
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const packagePath = path.join(root, "package.json");
const vercelPath = path.join(root, "vercel.json");
const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
const vercel = JSON.parse(fs.readFileSync(vercelPath, "utf8"));
const scripts = packageJson.scripts ?? {};
const blockers = [];
const buildCommandValidation = validateDeploymentBuildCommands(scripts);
for (const row of buildCommandValidation.failures) blockers.push(`package_script_mismatch:${row.name}`);
if (vercel.buildCommand !== "npm run build:deployment") blockers.push("vercel_build_command_mismatch");
if (vercel.installCommand !== "npm ci --engine-strict=true --strict-allow-scripts=true --no-audit --no-fund --progress=false") blockers.push("vercel_install_not_fail_closed");
const activeNames = ["preinstall", "verify:runtime-contract", "deployment:preflight", "build", "build:deployment", "build:webpack", "build:turbopack", "start"];
for (const name of activeNames) {
  const command = scripts[name];
  if (typeof command !== "string" || command.trim() === "") blockers.push(`active_script_missing:${name}`);
  else if (/scripts\/pass/u.test(command)) blockers.push(`active_script_references_historical_pass:${name}`);
}
for (const relative of [
  "scripts/deployment/common.mjs", "scripts/deployment/build-command-contract.mjs", "scripts/deployment/preflight.mjs", "scripts/deployment/run-build-watchdog.mjs", "scripts/deployment/run-segmented-build.mjs",
  "scripts/verify-runtime-contract.mjs", "scripts/lib/velmere-runtime-contract.mjs", "next.config.mjs", "package-lock.json",
]) if (!fs.existsSync(path.join(root, relative))) blockers.push(`deployment_target_missing:${relative}`);
const receipt = {
  schemaVersion: "velmere.deployment-preflight.v1",
  generatedAt: new Date().toISOString(),
  status: blockers.length === 0 ? "OFFLINE-PROVEN" : "FAIL",
  exitCode: blockers.length === 0 ? 0 : 1,
  packageJsonSha256: sha256(fs.readFileSync(packagePath)),
  vercelJsonSha256: sha256(fs.readFileSync(vercelPath)),
  activeScripts: Object.fromEntries(activeNames.map((name) => [name, scripts[name] ?? null])),
  buildCommandValidation,
  blockers,
  truthBoundary: "Static and executable deployment-chain contract only. A production build is a separate exact-runtime gate.",
};
writeJson(path.join(root, ".velmere", "deployment", "PREFLIGHT.json"), receipt);
console.log(JSON.stringify(receipt, null, 2));
if (blockers.length > 0) process.exit(1);
