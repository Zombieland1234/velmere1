#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DIAGNOSTICS_DIR, ROOT, readJson, REQUIREMENTS_PATH, run, sourceTreeDigest, verifyCacheCoverage, writeJson } from "./runtime-lib.mjs";

if (!process.argv.includes("--allow-heavy")) {
  console.error("PASS24 exact milestone is blocked without --allow-heavy.");
  process.exit(2);
}
const valueAfter = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? path.resolve(process.argv[index + 1]) : fallback;
};
const runtime = valueAfter("--runtime", path.join(ROOT, ".velmere", "exact-runtime", "node-v24.18.0-linux-x64"));
const cacheRoot = valueAfter("--cache", path.join(ROOT, ".velmere", "npm-cache"));
const runtimeReportPath = path.join(DIAGNOSTICS_DIR, "runtime-availability.json");
const runtimeCheck = run(process.execPath, ["scripts/pass24/verify-exact-runtime.mjs", "--runtime", runtime, "--output", runtimeReportPath, "--require"], { timeout: 60_000 });
if (runtimeCheck.status !== 0) {
  process.stdout.write(runtimeCheck.stdout ?? "");
  process.stderr.write(runtimeCheck.stderr ?? "");
  process.exit(1);
}
const requirements = readJson(REQUIREMENTS_PATH);
const cache = verifyCacheCoverage(cacheRoot, requirements);
writeJson(path.join(DIAGNOSTICS_DIR, "cache-coverage.json"), { ...cache, status: cache.ok ? "PASS_EXACT_CACHE" : "BLOCKED_INCOMPLETE_CACHE" });
if (!cache.ok) {
  console.error(`PASS24 milestone blocked: cache ${cache.passed}/${cache.required}.`);
  process.exit(1);
}
const before = sourceTreeDigest();
const runtimeBin = path.join(runtime, "bin");
const exactNode = path.join(runtimeBin, "node");
const npmCli = path.join(runtime, "lib", "node_modules", "npm", "bin", "npm-cli.js");
const home = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-pass24-home-"));
const logsDir = path.join(DIAGNOSTICS_DIR, "logs");
fs.mkdirSync(logsDir, { recursive: true });
const env = {
  ...process.env,
  HOME: home,
  PATH: `${runtimeBin}${path.delimiter}${process.env.PATH ?? ""}`,
  npm_config_cache: cacheRoot,
  NPM_CONFIG_CACHE: cacheRoot,
  npm_config_offline: "true",
  NPM_CONFIG_OFFLINE: "true",
  npm_config_registry: "https://registry.npmjs.org/",
  NPM_CONFIG_REGISTRY: "https://registry.npmjs.org/",
  NEXT_TELEMETRY_DISABLED: "1",
  FORCE_COLOR: "0"
};
const commands = [
  { name: "npm-ci-offline", program: exactNode, args: [npmCli, "ci", "--offline", "--cache", cacheRoot, "--no-fund"] },
  { name: "npm-ls", program: exactNode, args: [npmCli, "ls", "--all"] },
  { name: "typecheck", program: exactNode, args: [npmCli, "run", "typecheck"] },
  { name: "lint", program: exactNode, args: [npmCli, "run", "lint"] },
  { name: "npm-test", program: exactNode, args: [npmCli, "test"] }
];
const results = [];
let ok = true;
try {
  for (const command of commands) {
    const started = Date.now();
    const result = run(command.program, command.args, { env, timeout: command.name === "lint" ? 1_200_000 : 900_000, maxBuffer: 256 * 1024 * 1024 });
    const combined = `${result.stdout ?? ""}${result.stderr ?? ""}`;
    const logPath = path.join(logsDir, `${command.name}.log`);
    fs.writeFileSync(logPath, combined, "utf8");
    const row = {
      name: command.name,
      exitCode: result.status ?? 1,
      signal: result.signal ?? null,
      timedOut: result.error?.code === "ETIMEDOUT",
      durationMs: Date.now() - started,
      log: path.relative(ROOT, logPath).replaceAll(path.sep, "/")
    };
    row.ok = row.exitCode === 0 && !row.timedOut;
    results.push(row);
    console.log(`PASS24 ${command.name}: ${row.ok ? "PASS" : "FAIL"} ${(row.durationMs / 1000).toFixed(1)}s`);
    if (!row.ok) { ok = false; break; }
  }
} finally {
  fs.rmSync(home, { recursive: true, force: true });
}
const after = sourceTreeDigest();
const sourceImmutable = before.sha256 === after.sha256;
if (!sourceImmutable) ok = false;
const receipt = {
  schemaVersion: "velmere.pass24.exact-milestone.v1",
  ok,
  status: ok ? "PASS_EXACT_RUNTIME_TYPESCRIPT_LINT_TEST" : "FAIL_EXACT_MILESTONE",
  runtime: { path: path.relative(ROOT, runtime).replaceAll(path.sep, "/"), node: "v24.18.0", npm: "11.16.0" },
  cache: { root: path.relative(ROOT, cacheRoot).replaceAll(path.sep, "/"), passed: cache.passed, required: cache.required },
  sourceBefore: before,
  sourceAfter: after,
  sourceImmutable,
  commands: results,
  truthBoundary: "This receipt covers install, dependency tree, semantic TypeScript, ESLint and npm test only. It does not prove Webpack, Turbopack, browser, PDF, staging or LIVE."
};
writeJson(path.join(DIAGNOSTICS_DIR, "exact-milestone.json"), receipt);
if (!ok) process.exit(1);
