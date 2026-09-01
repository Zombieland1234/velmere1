#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  GLOBAL_JSON_PARSE_SIGNATURE,
  PASS35_A42_REVISION_ID,
  countGlobalJsonParseSignatures,
  sanitizeNextChildEnvironment,
  selectDevBundler,
  shouldRecoverFromGlobalJsonParse,
} from "../lib/a42-dev-runtime-policy.mjs";

const root = process.cwd();
const checks = [];
const failures = [];
function check(name, ok, detail = undefined) {
  const row = { name, ok: Boolean(ok), ...(detail === undefined ? {} : { detail }) };
  checks.push(row);
  if (!row.ok) failures.push(row);
}
function read(relativePath) { return fs.readFileSync(path.join(root, relativePath), "utf8"); }

const observed = [
  `SyntaxError: ${GLOBAL_JSON_PARSE_SIGNATURE} at position 888 (line 1 column 889)`,
  `page: '/pl/search'`,
  `SyntaxError: ${GLOBAL_JSON_PARSE_SIGNATURE} at position 888 (line 1 column 889)`,
  `page: '/pl/intelligence'`,
  `SyntaxError: ${GLOBAL_JSON_PARSE_SIGNATURE} at position 888 (line 1 column 889)`,
  `page: '/api/auth/session'`,
].join("\n");
const signatureCount = countGlobalJsonParseSignatures(observed);
check("observed_signature_exact", observed.includes("position 888 (line 1 column 889)"));
check("observed_signature_count", signatureCount === 3, signatureCount);
check("windows_default_is_webpack", selectDevBundler({ platform: "win32", env: {} }) === "webpack");
check("explicit_turbopack_remains_available", selectDevBundler({ platform: "win32", env: {}, explicit: "turbopack" }) === "turbopack");
check("three_turbopack_crashes_trigger_recovery", shouldRecoverFromGlobalJsonParse({ bundler: "turbopack", occurrenceTimes: [1000, 1001, 1002], now: 1003 }));
check("webpack_never_loops_to_second_fallback", !shouldRecoverFromGlobalJsonParse({ bundler: "webpack", occurrenceTimes: [1000, 1001, 1002], now: 1003 }));
check("old_crashes_expire", !shouldRecoverFromGlobalJsonParse({ bundler: "turbopack", occurrenceTimes: [1, 2, 3], now: 20_000 }));

const sanitized = sanitizeNextChildEnvironment({
  Path: "C:\\Windows\\System32",
  __NEXT_PRIVATE_STANDALONE_CONFIG: '{"a":1}{"b":2}',
  NEXT_PRIVATE_TEST_MODE: "1",
  NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
}, "webpack");
check("private_standalone_config_removed", sanitized.env.__NEXT_PRIVATE_STANDALONE_CONFIG === undefined, sanitized.removed);
check("private_next_family_removed", sanitized.env.NEXT_PRIVATE_TEST_MODE === undefined, sanitized.removed);
check("public_site_url_preserved", sanitized.env.NEXT_PUBLIC_SITE_URL === "http://localhost:3000");
check("webpack_disables_turbopack_fs_cache", sanitized.env.VELMERE_TURBOPACK_DEV_CACHE === "0");

const runner = read("scripts/velmere-dev-runner.mjs");
check("runner_revision_import", runner.includes("PASS35_A42_REVISION_ID"));
check("runner_runs_bootstrap_first", runner.includes("runBootstrap(initialSanitized.env, selectedBundler)"));
check("runner_uses_next_cli_directly", runner.includes('node_modules", "next", "dist", "bin", "next'));
check("runner_selects_webpack_flag", runner.includes('bundler === "webpack" ? ["--webpack"] : ["--turbopack"]'));
check("runner_monitors_stdout", runner.includes('activeChild.stdout.on("data"'));
check("runner_monitors_stderr", runner.includes('activeChild.stderr.on("data"'));
check("runner_recovery_message", runner.includes("repeated global JSON.parse crash detected under Turbopack"));
check("runner_clears_generated_next_only", runner.includes("clearGeneratedNextState") && !runner.includes('rmSync(path.join(root, "app"'));
check("runner_restarts_once_with_webpack", runner.includes('!recoveryUsed') && runner.includes('startNext("webpack")'));
check("runner_kills_windows_process_tree", runner.includes('spawnSync("taskkill"') && runner.includes('"/T"'));
check("runner_writes_launch_receipt", runner.includes("last-launch.json"));

const launcher = read("VELMERE_START_A42.cmd");
check("launcher_checks_revision", launcher.includes(PASS35_A42_REVISION_ID));
check("launcher_runs_diagnostics", launcher.includes("npm run diagnose:runtime:a42"));
check("launcher_runs_clean_dev", launcher.includes("npm run dev:clean:a42"));

const nextConfig = read("next.config.mjs");
check("turbopack_dev_cache_opt_in", nextConfig.includes('process.env.VELMERE_TURBOPACK_DEV_CACHE === "1"'));
check("turbopack_dev_cache_not_hardcoded_true", !/turbopackFileSystemCacheForDev:\s*true/u.test(nextConfig));

const result = {
  schemaVersion: "velmere.pass35.a42.windows-dev-runtime-recovery.test.v1",
  revisionId: PASS35_A42_REVISION_ID,
  generatedAt: new Date().toISOString(),
  truthBoundary: "This test reproduces the observed repeated JSON.parse signature and verifies the bounded Windows Webpack default plus one-time Turbopack recovery contract. It is not a browser E2E result.",
  summary: { checks: checks.length, passed: checks.length - failures.length, failed: failures.length },
  checks,
  failures,
};
const output = path.join(root, "artifacts/pass35/a42/PASS35_A42_WINDOWS_DEV_RUNTIME_RECOVERY.json");
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(result.summary, null, 2)}\n`);
if (failures.length) process.exit(1);
