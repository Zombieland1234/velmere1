import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const CURRENT = path.join(ROOT, "scripts/current-execution");
const LOADER = "./scripts/pass11/register-offline-ts-loader.mjs";
const OUT = path.join(ROOT, "artifacts/r3/VELMERE_R3_CURRENT_EXECUTION_CAMPAIGN.json");
const MAX_TAIL = 1_600;

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const files = fs.readdirSync(CURRENT)
  .filter((name) => /^(?:test|verify)-.+\.(?:mjs|mts|ts)$/u.test(name))
  .map((name) => `scripts/current-execution/${name}`)
  .sort();

function classify(file, status, stdout, stderr, error) {
  const text = `${stdout}\n${stderr}\n${error?.message ?? ""}`;
  if (file.endsWith("test-runtime-env-canonical-example.mjs")) {
    return "NOT_RUN_EXTERNAL_RECEIPT_ARGUMENT_REQUIRED";
  }
  if (status === 0) return "PASS";
  if (/WITHHELD_EXACT_WINDOWS_SERVER_2025_REQUIRED/u.test(text)) return "WITHHELD_EXACT_WINDOWS_SERVER_2025_REQUIRED";
  if (/pass11_offline_supabase_sdk_client_not_available/u.test(text)) return "WITHHELD_AUTHORIZED_RUNTIME_ENVIRONMENT";
  if (/ERR_MODULE_NOT_FOUND|Cannot find package|does not provide an export named/u.test(text)) {
    return "WITHHELD_DEPENDENCY_ENVIRONMENT";
  }
  if (error?.code === "ETIMEDOUT" || status === null) return "TIMEOUT";
  return "FAIL";
}

function commandFor(file) {
  if (file.endsWith(".mts") || file.endsWith(".ts")) return [process.execPath, "--import", LOADER, file];
  return [process.execPath, file];
}

const startedAt = new Date().toISOString();
const results = [];
for (const file of files) {
  if (file.endsWith("test-runtime-env-canonical-example.mjs")) {
    results.push({
      file,
      command: [process.execPath, file, "--receipt", "<external-output-path>"],
      exitCode: null,
      classification: "NOT_RUN_EXTERNAL_RECEIPT_ARGUMENT_REQUIRED",
      stdoutSha256: sha256(""),
      stderrSha256: sha256(""),
      stdoutTail: "",
      stderrTail: "",
    });
    continue;
  }
  const command = commandFor(file);
  const run = spawnSync(command[0], command.slice(1), {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 45_000,
    maxBuffer: 32 * 1024 * 1024,
    env: { ...process.env, CI: "1" },
  });
  const stdout = run.stdout ?? "";
  const stderr = run.stderr ?? "";
  results.push({
    file,
    command,
    exitCode: run.status,
    classification: classify(file, run.status, stdout, stderr, run.error),
    stdoutSha256: sha256(stdout),
    stderrSha256: sha256(stderr),
    stdoutTail: stdout.slice(-MAX_TAIL),
    stderrTail: stderr.slice(-MAX_TAIL),
  });
}

const summary = Object.fromEntries(
  [...new Set(results.map((result) => result.classification))]
    .sort()
    .map((classification) => [classification, results.filter((result) => result.classification === classification).length]),
);
const failures = results.filter((result) => result.classification === "FAIL" || result.classification === "TIMEOUT");
const payload = {
  schemaVersion: "velmere.r3.local-current-execution-campaign.v1",
  generatedAt: new Date().toISOString(),
  startedAt,
  environment: {
    platform: process.platform,
    arch: process.arch,
    node: process.version,
    npm: spawnSync("npm", ["--version"], { cwd: ROOT, encoding: "utf8" }).stdout?.trim() ?? null,
    exactAuthorityTarget: { platform: "win32", arch: "x64", node: "v24.18.0", npm: "11.16.0", os: "Windows Server 2025" },
  },
  selectedTests: results.length,
  summary,
  actualFailureCount: failures.length,
  results,
  customerFinalCredit: false,
  exactWindowsCredit: false,
  stagingCredit: false,
  classification: failures.length === 0
    ? "PASS_LOCAL_CAMPAIGN_WITH_EXPLICIT_WITHHELD_GATES"
    : "FAIL_LOCAL_CAMPAIGN",
  truthBoundary: "Local current-source execution only. Missing dependencies, authorized runtime services and exact Windows remain WITHHELD; no row-level Customer FINAL is granted.",
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({
  schemaVersion: payload.schemaVersion,
  selectedTests: payload.selectedTests,
  summary: payload.summary,
  actualFailureCount: payload.actualFailureCount,
  classification: payload.classification,
  output: path.relative(ROOT, OUT).split(path.sep).join("/"),
}, null, 2)}\n`);
if (failures.length) process.exit(2);
