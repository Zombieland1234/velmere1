#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { loadA42Contract } from "../../lib/build/dev-runtime-cache-recovery.mjs";
import { GLOBAL_JSON_PARSE_SIGNATURE, PASS35_A42_REVISION_ID } from "../lib/a42-dev-runtime-policy.mjs";

const root = process.cwd();
const contract = loadA42Contract(root);
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-a42-runner-"));
const checks = [];
const failures = [];
function check(name, ok, detail = undefined) {
  const row = { name, ok: Boolean(ok), ...(detail === undefined ? {} : { detail }) };
  checks.push(row);
  if (!row.ok) failures.push(row);
}
function copyFile(relativePath) {
  const source = path.join(root, relativePath);
  const target = path.join(temp, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

try {
  const runtimeFiles = new Set([
    ...(contract.requiredSourcePaths ?? []),
    ...Object.keys(contract.criticalFiles ?? {}),
    "tsconfig.json",
    "scripts/lib/velmere-runtime-contract.mjs",
  ]);
  for (const relativePath of runtimeFiles) copyFile(relativePath);
  for (const directory of ["public", "data"]) fs.mkdirSync(path.join(temp, directory), { recursive: true });

  const fakeNext = path.join(temp, "node_modules/next/dist/bin/next");
  fs.mkdirSync(path.dirname(fakeNext), { recursive: true });
  fs.writeFileSync(fakeNext, `#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
const args = process.argv.slice(2);
if (args.includes("--turbopack")) {
  const manifest = path.join(process.cwd(), ".next/server/app-paths-manifest.json");
  fs.mkdirSync(path.dirname(manifest), { recursive: true });
  fs.writeFileSync(manifest, '{"first":1}{"second":2}', "utf8");
  for (const page of ["/pl/search", "/pl/intelligence", "/api/auth/session"]) {
    process.stderr.write("SyntaxError: ${GLOBAL_JSON_PARSE_SIGNATURE} at position 888 (line 1 column 889) page: " + page + "\\n");
  }
  process.on("SIGTERM", () => process.exit(0));
  process.on("SIGINT", () => process.exit(0));
  setInterval(() => {}, 1000);
} else if (args.includes("--webpack")) {
  process.stdout.write("[fake-next] WEBPACK_RECOVERY_READY\\n");
  process.exit(0);
} else {
  process.stderr.write("[fake-next] missing bundler flag\\n");
  process.exit(2);
}
`, "utf8");

  const run = spawnSync(process.execPath, ["scripts/velmere-dev-runner.mjs", "--turbopack"], {
    cwd: temp,
    env: { ...process.env, VELMERE_TURBOPACK_DEV_CACHE: "0" },
    encoding: "utf8",
    timeout: 30_000,
  });
  const combined = `${run.stdout ?? ""}\n${run.stderr ?? ""}`;
  check("runner_exit_zero", run.status === 0, { status: run.status, signal: run.signal, stderr: run.stderr?.slice(-2000) });
  check("turbopack_started", combined.includes("launching Next.js with turbopack"), combined.slice(-3000));
  check("observed_position_888", combined.includes("position 888 (line 1 column 889)"));
  check("recovery_detected", combined.includes("repeated global JSON.parse crash detected under Turbopack"));
  check("generated_cache_removed", combined.includes("removed generated .next state before Webpack recovery"));
  check("webpack_retry_started", combined.includes("retrying the same source with Webpack") && combined.includes("launching Next.js with webpack"));
  check("webpack_fake_ready", combined.includes("WEBPACK_RECOVERY_READY"));
  check("malformed_manifest_removed", !fs.existsSync(path.join(temp, ".next/server/app-paths-manifest.json")));

  const reportPath = path.join(temp, ".velmere/dev-runtime/last-launch.json");
  check("launch_report_written", fs.existsSync(reportPath), reportPath);
  let report = null;
  if (fs.existsSync(reportPath)) report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  check("launch_report_revision", report?.revisionId === PASS35_A42_REVISION_ID, report?.revisionId);
  check("launch_report_recovery_used", report?.recoveryUsed === true, report);
  check("launch_report_two_attempts", Array.isArray(report?.attempts) && report.attempts.length === 2, report?.attempts);
  check("launch_report_attempt_order", report?.attempts?.[0]?.bundler === "turbopack" && report?.attempts?.[1]?.bundler === "webpack", report?.attempts);

  const result = {
    schemaVersion: "velmere.pass35.a42.runner-recovery-integration.test.v1",
    revisionId: PASS35_A42_REVISION_ID,
    generatedAt: new Date().toISOString(),
    truthBoundary: "This isolated integration test executes the A42 launcher against a fake Next process that emits the observed position-888 JSON.parse crash three times. It proves one-time process recovery and generated-cache deletion, not real Next compilation or browser rendering.",
    summary: { checks: checks.length, passed: checks.length - failures.length, failed: failures.length },
    checks,
    failures,
    launcherOutputTail: combined.slice(-6000),
  };
  const output = path.join(root, "artifacts/pass35/a42/PASS35_A42_RUNNER_RECOVERY_INTEGRATION.json");
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(result.summary, null, 2)}\n`);
  if (failures.length) process.exitCode = 1;
} finally {
  fs.rmSync(temp, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
