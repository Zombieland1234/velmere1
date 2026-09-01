import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const CURRENT = path.join(ROOT, "scripts/current-execution");
const LOADER = "./scripts/pass11/register-offline-ts-loader.mjs";
const args = new Map(process.argv.slice(2).map((value, index, all) => value.startsWith("--") ? [value, all[index + 1]] : [value, null]));
const runLabel = args.get("--run-label") || "run";
const OUT = path.join(ROOT, `artifacts/r7/current-execution/R7_CURRENT_EXECUTION_CAMPAIGN_${runLabel}.json`);
const MAX_TAIL = 2_000;
const EXPECTED_DENOMINATOR = 52;
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const files = fs.readdirSync(CURRENT)
  .filter((name) => /^(?:test|verify)-.+\.(?:mjs|mts|ts)$/u.test(name))
  .map((name) => `scripts/current-execution/${name}`)
  .sort();
if (files.length !== EXPECTED_DENOMINATOR) throw new Error(`r7_test_denominator_mismatch:${files.length}/${EXPECTED_DENOMINATOR}`);
if (!files.includes("scripts/current-execution/test-customer-owned-market-impact-attested-route.mts")) throw new Error("r7_market_impact_attested_route_missing");
for (const required of [
  "scripts/current-execution/test-r7-browser-basic-account-artifact-policy.mts",
  "scripts/current-execution/test-r7-browser-basic-e2e-contract.mjs",
  "scripts/current-execution/test-r7-internal-final-authority-separation.mjs",
  "scripts/current-execution/test-r7-staging-foundation-contract.mjs",
]) if (!files.includes(required)) throw new Error(`r7_required_test_missing:${required}`);

function classify(status, stdout, stderr, error) {
  const text = `${stdout}\n${stderr}\n${error?.message ?? ""}`;
  if (status === 0) return "PASS";
  if (/WITHHELD_EXACT_WINDOWS_SERVER_2025_REQUIRED/u.test(text)) return "WITHHELD_EXACT_WINDOWS_SERVER_2025_REQUIRED";
  if (/ERR_MODULE_NOT_FOUND|Cannot find package|does not provide an export named/u.test(text)) return "FAIL_DEPENDENCY_MISSING";
  if (error?.code === "ETIMEDOUT" || status === null) return "TIMEOUT";
  return "FAIL";
}
function commandFor(file) {
  if (file.endsWith("test-runtime-env-canonical-example.mjs")) return [process.execPath, file, "--receipt", `current-execution-out/r7/RUNTIME_ENV_CONTRACT_RECEIPT_${runLabel}.json`];
  if (file.endsWith(".mts") || file.endsWith(".ts")) return [process.execPath, "--import", LOADER, file];
  return [process.execPath, file];
}
const startedAt = new Date().toISOString();
const results = [];
for (const file of files) {
  const command = commandFor(file);
  const run = spawnSync(command[0], command.slice(1), {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 180_000,
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, CI: "1", VELMERE_R7_RUN_LABEL: runLabel },
  });
  const stdout = run.stdout ?? "";
  const stderr = run.stderr ?? "";
  results.push({
    file, command, exitCode: run.status, signal: run.signal,
    classification: classify(run.status, stdout, stderr, run.error),
    stdoutSha256: sha256(stdout), stderrSha256: sha256(stderr),
    stdoutTail: stdout.slice(-MAX_TAIL), stderrTail: stderr.slice(-MAX_TAIL),
  });
}
const summary = Object.fromEntries([...new Set(results.map((r) => r.classification))].sort().map((c) => [c, results.filter((r) => r.classification === c).length]));
const actualFailures = results.filter((r) => ["FAIL", "FAIL_DEPENDENCY_MISSING", "TIMEOUT"].includes(r.classification));
function observedNpmVersion() {
  if (process.platform === "win32") {
    const verified = process.env.R7_VERIFIED_NPM_VERSION?.trim() ?? null;
    return verified === "11.16.0" ? verified : null;
  }
  const result = spawnSync("npm", ["--version"], { cwd: ROOT, encoding: "utf8" });
  return result.status === 0 ? result.stdout?.trim() ?? null : null;
}
const npmVersion = observedNpmVersion();
const payload = {
  schemaVersion: "velmere.r7.merged-current-execution-campaign.v1",
  runLabel, generatedAt: new Date().toISOString(), startedAt,
  candidate: "R7_MERGED_CURRENT_SOURCE",
  ancestry: { commonBase: "R4", siblingBranches: ["R5", "R6"] },
  environment: { platform: process.platform, arch: process.arch, node: process.version, npm: npmVersion, exactTarget: { os: "Windows Server 2025", node: "v24.18.0", npm: "11.16.0" } },
  selectedTests: results.length,
  requiredMaterialTests: {
    r5CustomerOwnedMarketImpact: true,
    r6AngelPostgrestDelete: files.includes("scripts/current-execution/test-angel-durable-memory-delete-fail-closed.mts"),
    r6PublicProof: files.includes("scripts/current-execution/test-public-proof-publication-boundary.ts"),
    r6VerifyDurableRegistry: files.includes("scripts/current-execution/test-v4-verify-durable-registry-boundary.ts"),
    r7Authority: true, r7BrowserBasic: true, r7Staging: true,
  },
  summary, actualFailureCount: actualFailures.length, results,
  customerFinalCredit: false, paidValueCredit: false,
  exactWindowsCredit: process.platform === "win32" && process.version === "v24.18.0" && npmVersion === "11.16.0" && actualFailures.length === 0 && summary.PASS === EXPECTED_DENOMINATOR,
  classification: actualFailures.length === 0 ? "PASS_WITH_ONLY_EXPLICIT_WINDOWS_GATE_IF_NON_WINDOWS" : "FAIL",
  truthBoundary: "A campaign run is not Customer FINAL. Windows credit requires exact Windows Server 2025, Node 24.18.0, npm 11.16.0, full npm ci, 52/52 PASS and independent repeatability.",
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({runLabel, selectedTests: payload.selectedTests, summary, actualFailureCount: actualFailures.length, exactWindowsCredit: payload.exactWindowsCredit, output: path.relative(ROOT, OUT).replaceAll(path.sep, "/")}, null, 2)}\n`);
if (actualFailures.length) process.exit(2);
