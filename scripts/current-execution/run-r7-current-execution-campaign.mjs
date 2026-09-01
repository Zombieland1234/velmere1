import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const CURRENT = path.join(ROOT, "scripts/current-execution");
const LOADER = "./scripts/pass11/register-offline-ts-loader.mjs";
const arg = (name, fallback = null) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? String(process.argv[i + 1] ?? "") : fallback;
};
const runLabel = arg("run-label", "run1");
const output = path.resolve(arg("output", `artifacts/r7/windows/R7_CURRENT_EXECUTION_CAMPAIGN_${runLabel.toUpperCase()}.json`));
const timeoutMs = Number(arg("timeout-ms", "180000"));
const MAX_TAIL = 2400;
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const npmVersion = () => {
  const cmd = process.platform === "win32" ? (process.env.ComSpec || "cmd.exe") : "npm";
  const args = process.platform === "win32" ? ["/d", "/s", "/c", "npm.cmd --version"] : ["--version"];
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: "utf8", windowsHide: true });
  return r.status === 0 ? String(r.stdout).trim() : null;
};

const files = fs.readdirSync(CURRENT)
  .filter((name) => /^(?:test|verify)-.+\.(?:mjs|mts|ts)$/u.test(name))
  .map((name) => `scripts/current-execution/${name}`)
  .sort();
if (files.length !== 52) throw new Error(`R7 denominator mismatch: expected 52, observed ${files.length}`);
if (!files.includes("scripts/current-execution/test-customer-owned-market-impact-attested-route.mts")) {
  throw new Error("R5 customer-owned Market Impact execution test missing");
}

function commandFor(file) {
  if (file.endsWith("test-runtime-env-canonical-example.mjs")) {
    return [process.execPath, file, "--receipt", `current-execution-out/r7/${runLabel}/RUNTIME_ENV_CONTRACT_RECEIPT.json`];
  }
  if (file.endsWith(".mts") || file.endsWith(".ts")) return [process.execPath, "--import", LOADER, file];
  return [process.execPath, file];
}

function classify(status, stdout, stderr, error) {
  const text = `${stdout}\n${stderr}\n${error?.message ?? ""}`;
  if (status === 0) return "PASS";
  if (/WITHHELD_EXACT_WINDOWS_SERVER_2025_REQUIRED/u.test(text)) return "WITHHELD_EXACT_WINDOWS_SERVER_2025_REQUIRED";
  if (/ERR_MODULE_NOT_FOUND|Cannot find package|does not provide an export named/u.test(text)) return "WITHHELD_DEPENDENCY_ENVIRONMENT";
  if (error?.code === "ETIMEDOUT" || status === null) return "TIMEOUT";
  return "FAIL";
}

const startedAt = new Date().toISOString();
const results = [];
for (const file of files) {
  const command = commandFor(file);
  const started = Date.now();
  const run = spawnSync(command[0], command.slice(1), {
    cwd: ROOT,
    encoding: "utf8",
    timeout: timeoutMs,
    maxBuffer: 64 * 1024 * 1024,
    windowsHide: true,
    env: { ...process.env, CI: "1", VELMERE_R7_CAMPAIGN_RUN: runLabel },
  });
  const stdout = run.stdout ?? "";
  const stderr = run.stderr ?? "";
  results.push({
    file,
    command,
    exitCode: run.status,
    signal: run.signal ?? null,
    durationMs: Date.now() - started,
    classification: classify(run.status, stdout, stderr, run.error),
    stdoutSha256: sha256(stdout),
    stderrSha256: sha256(stderr),
    stdoutTail: stdout.slice(-MAX_TAIL),
    stderrTail: stderr.slice(-MAX_TAIL),
  });
}
const summary = Object.fromEntries([...new Set(results.map((r) => r.classification))].sort().map((k) => [k, results.filter((r) => r.classification === k).length]));
const nonPass = results.filter((r) => r.classification !== "PASS");
const receipt = {
  schemaVersion: "velmere.r7.current-execution-campaign.v1",
  candidate: "R7_MERGED_CURRENT_SOURCE",
  runLabel,
  startedAt,
  generatedAt: new Date().toISOString(),
  environment: {
    platform: process.platform,
    arch: process.arch,
    node: process.version,
    npm: npmVersion(),
    githubActions: process.env.GITHUB_ACTIONS === "true",
    githubRunId: process.env.GITHUB_RUN_ID || null,
    githubSha: process.env.GITHUB_SHA || null,
    runnerOs: process.env.RUNNER_OS || null,
    imageOs: process.env.ImageOS || null,
  },
  denominator: 52,
  selectedTests: results.length,
  summary,
  nonPassCount: nonPass.length,
  results,
  preservedMaterialBranches: { r5: true, r6: true },
  customerOwnedMarketImpactTestPresent: true,
  customerFinalCredit: false,
  exactWindowsCredit: process.platform === "win32" && process.version === "v24.18.0" && npmVersion() === "11.16.0" && nonPass.length === 0,
  status: nonPass.length === 0 ? "PASS" : "NON_PASS",
  truthBoundary: "Campaign execution only. Customer FINAL additionally requires the bound staging/customer route and no open critical blocker.",
};
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({ status: receipt.status, denominator: receipt.denominator, summary, output: path.relative(ROOT, output).split(path.sep).join("/") }, null, 2));
if (nonPass.length) process.exitCode = 2;
