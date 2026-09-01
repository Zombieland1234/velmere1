#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  resolveInstalledEslintCli,
  runInstalledEslint,
} from "../pass13/eslint-cli-runtime.mjs";

const checks = [];
const check = (condition, id, detail = null) => {
  assert.ok(condition, id);
  checks.push({ id, passed: true, detail });
};
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const write = (file, value, mode = 0o644) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, value);
  fs.chmodSync(file, mode);
};
const copy = (source, target) => {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
  fs.chmodSync(target, fs.statSync(source).mode & 0o777);
};
function treeDigest(root) {
  const rows = [];
  const walk = (directory, prefix = "") => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (relative === "artifacts" || relative.startsWith("artifacts/") || relative === "node_modules" || relative.startsWith("node_modules/")) continue;
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(absolute, relative);
      else if (entry.isFile()) {
        const bytes = fs.readFileSync(absolute);
        rows.push(`${relative}\0${bytes.length}\0${sha256(bytes)}`);
      }
    }
  };
  walk(root);
  return sha256(rows.join("\n"));
}
function installFakeEslint(root) {
  const packageRoot = path.join(root, "node_modules", "eslint");
  write(path.join(packageRoot, "package.json"), `${JSON.stringify({ name: "eslint", version: "10.8.0", type: "module", bin: { eslint: "./bin/eslint.js" } }, null, 2)}\n`);
  write(path.join(packageRoot, "bin", "eslint.js"), `#!/usr/bin/env node
import path from "node:path";
const args = process.argv.slice(2);
if (args.includes("--version")) { console.log("v10.8.0"); process.exit(0); }
const files = args.filter((arg) => /\\.(?:[cm]?[jt]sx?)$/u.test(arg) && !arg.startsWith("--"));
const mode = process.env.FAKE_ESLINT_MODE ?? "pass";
if (mode === "invalid_config") { process.stderr.write("FAKE_INVALID_CONFIG_EXACT_STDERR\\n"); process.stdout.write("[]"); process.exit(2); }
let anyError = false;
let anyWarning = false;
const rows = files.map((file, index) => {
  const absolute = path.resolve(process.cwd(), file);
  const messages = [];
  if (mode === "lint_error" && file.includes("file-000")) { anyError = true; messages.push({ ruleId: "fake/no-error", severity: 2, message: "fake lint error", line: 1, column: 1 }); }
  if (mode === "lint_warning" && file.includes("file-000")) { anyWarning = true; messages.push({ ruleId: "fake/no-warning", severity: 1, message: "fake lint warning", line: 1, column: 1 }); }
  if (mode === "path_mismatch" && index === files.length - 1) return null;
  return { filePath: absolute, messages, errorCount: messages.filter((m) => m.severity === 2).length, warningCount: messages.filter((m) => m.severity === 1).length };
}).filter(Boolean);
process.stdout.write(JSON.stringify(rows));
process.exit(anyError || anyWarning ? 1 : 0);
`, 0o755);
}
const FIXTURE_RUNNER_MODULES = Object.freeze([
  "common.mjs",
  "eslint-cli-runtime.mjs",
  "eslint-partition-plan.mjs",
  "run-partitioned-eslint.mjs",
]);
function createFixtureRoot(base) {
  const root = path.join(base, "Velmere A102R36 !&()[]$ path");
  fs.mkdirSync(path.join(root, "scripts", "pass13"), { recursive: true });
  for (const file of FIXTURE_RUNNER_MODULES) {
    copy(path.resolve("scripts/pass13", file), path.join(root, "scripts", "pass13", file));
  }
  for (let index = 0; index < 71; index += 1) {
    write(path.join(root, "src", `file-${String(index).padStart(3, "0")}.js`), `export const value${index} = ${index};\n`);
  }
  installFakeEslint(root);
  return root;
}
function runPartitioned(root, mode = "pass") {
  return spawnSync(process.execPath, [path.join(root, "scripts/pass13/run-partitioned-eslint.mjs")], {
    cwd: root,
    encoding: "utf8",
    timeout: 120_000,
    maxBuffer: 32 * 1024 * 1024,
    shell: false,
    windowsHide: true,
    env: { ...process.env, FAKE_ESLINT_MODE: mode, FORCE_COLOR: "0" },
  });
}
function expectThrow(fn, code, id) {
  let message = null;
  try { fn(); } catch (error) { message = error instanceof Error ? error.message : String(error); }
  check(message === code, id, { observed: message });
}

const temporaryBase = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-a102r36-eslint-"));
try {
  const root = createFixtureRoot(temporaryBase);
  const identity = resolveInstalledEslintCli(root);
  check(identity.packageName === "eslint" && identity.packageVersion === "10.8.0", "genuine-package-identity");
  check(identity.cliRelativePath === "node_modules/eslint/bin/eslint.js", "genuine-eslint-bin-path");
  check(identity.nodeExecutable === process.execPath, "exact-process-exec-path-resolved");
  check(/^[a-f0-9]{64}$/u.test(identity.cliSha256), "eslint-cli-sha256-bound");

  const direct = runInstalledEslint({ root, args: ["--version"], env: { ...process.env, FORCE_COLOR: "0" } });
  check(direct.result.status === 0 && direct.result.stdout.trim() === "v10.8.0", "direct-eslint-version-smoke");
  check(direct.invocation.executable === process.execPath, "direct-invocation-exact-node");
  check(direct.invocation.shell === false, "direct-invocation-shell-false");
  check(direct.invocation.arguments[0] === identity.cliPath, "direct-invocation-real-cli-first-argument");
  check(direct.invocation.cwd === path.resolve(root), "path-with-spaces-and-shell-metacharacters");

  const before = treeDigest(root);
  const positive = runPartitioned(root, "pass");
  const positiveReceipt = readJson(path.join(root, "artifacts/pass13/PASS13_PARTITIONED_ESLINT.json"));
  const after = treeDigest(root);
  check(positive.status === 0, "partitioned-positive-exit-zero", { stderr: positive.stderr });
  check(positiveReceipt.ok === true, "partitioned-positive-ok");
  check(positiveReceipt.fileCount === 75 && positiveReceipt.partitionCount === 3, "exact-file-and-partition-denominator", { fileCount: positiveReceipt.fileCount, partitionCount: positiveReceipt.partitionCount });
  check(positiveReceipt.completedPartitions === 3 && positiveReceipt.passedPartitions === 3, "partitioned-3-of-3");
  check(positiveReceipt.filesCovered === 75 && positiveReceipt.filesCovered === positiveReceipt.fileCount && positiveReceipt.parts.every((part) => part.resultPathSetMatch === true && part.resultFileCount === part.fileCount), "exact-file-denominator-covered");
  check(positiveReceipt.lintErrors === 0 && positiveReceipt.lintWarnings === 0 && positiveReceipt.processFailureCount === 0, "zero-lint-and-process-failures");
  check(positiveReceipt.sourceImmutable === true && before === after, "source-before-after-identical");
  check(positiveReceipt.nodeExecutable === process.execPath && positiveReceipt.invocationPolicy?.shell === false, "receipt-exact-node-shell-false");

  const invalid = runPartitioned(root, "invalid_config");
  const invalidReceipt = readJson(path.join(root, "artifacts/pass13/PASS13_PARTITIONED_ESLINT.json"));
  check(invalid.status === 1, "invalid-config-negative-exit-one");
  check(invalidReceipt.completedPartitions === 1 && invalidReceipt.processFailureCount === 1, "invalid-config-single-process-failure");
  check(invalidReceipt.lintErrors === 0 && invalidReceipt.lintWarnings === 0, "invalid-config-not-lint-errors");
  check(invalidReceipt.firstProcessFailure.code === "eslint_process_failed", "invalid-config-process-classification");
  check(invalidReceipt.firstProcessFailure.exitCode === 2, "invalid-config-exit-code-preserved");
  check(invalidReceipt.firstProcessFailure.stderrTail.includes("FAKE_INVALID_CONFIG_EXACT_STDERR"), "invalid-config-stderr-preserved");

  const lintError = runPartitioned(root, "lint_error");
  const lintErrorReceipt = readJson(path.join(root, "artifacts/pass13/PASS13_PARTITIONED_ESLINT.json"));
  check(lintError.status === 1, "lint-error-negative-exit-one");
  check(lintErrorReceipt.completedPartitions === 3 && lintErrorReceipt.processFailureCount === 0, "lint-error-full-denominator-no-process-failure");
  check(lintErrorReceipt.lintErrors === 1 && lintErrorReceipt.lintWarnings === 0, "one-real-lint-error-counted-once");
  check(lintErrorReceipt.messages.length === 1 && lintErrorReceipt.messages[0].file.includes("file-000.js"), "real-lint-message-bound-to-file");

  const mismatch = runPartitioned(root, "path_mismatch");
  const mismatchReceipt = readJson(path.join(root, "artifacts/pass13/PASS13_PARTITIONED_ESLINT.json"));
  check(mismatch.status === 1, "path-set-mismatch-negative-exit-one");
  check(mismatchReceipt.completedPartitions === 1 && mismatchReceipt.processFailureCount === 1, "path-set-mismatch-stops-shared-failure");
  check(mismatchReceipt.firstProcessFailure.code === "eslint_result_path_set_mismatch", "path-set-mismatch-classification");

  const missingRoot = path.join(temporaryBase, "missing-eslint");
  fs.mkdirSync(missingRoot);
  expectThrow(() => resolveInstalledEslintCli(missingRoot), "eslint_package_missing", "missing-eslint-negative");

  const wrongNameRoot = path.join(temporaryBase, "wrong-name");
  installFakeEslint(wrongNameRoot);
  const wrongPackagePath = path.join(wrongNameRoot, "node_modules/eslint/package.json");
  const wrongPackage = readJson(wrongPackagePath);
  wrongPackage.name = "not-eslint";
  write(wrongPackagePath, `${JSON.stringify(wrongPackage)}\n`);
  expectThrow(() => resolveInstalledEslintCli(wrongNameRoot), "eslint_package_name_mismatch", "wrong-package-name-negative");

  const wrongBinRoot = path.join(temporaryBase, "wrong-bin");
  installFakeEslint(wrongBinRoot);
  const wrongBinPath = path.join(wrongBinRoot, "node_modules/eslint/package.json");
  const wrongBinPackage = readJson(wrongBinPath);
  wrongBinPackage.bin.eslint = "./dist/other.js";
  write(wrongBinPath, `${JSON.stringify(wrongBinPackage)}\n`);
  expectThrow(() => resolveInstalledEslintCli(wrongBinRoot), "eslint_package_bin_unexpected:dist/other.js", "wrong-bin-mapping-negative");

  if (process.platform !== "win32") {
    const symlinkRoot = path.join(temporaryBase, "symlink-cli");
    installFakeEslint(symlinkRoot);
    const cli = path.join(symlinkRoot, "node_modules/eslint/bin/eslint.js");
    const real = `${cli}.real`;
    fs.renameSync(cli, real);
    fs.symlinkSync(path.basename(real), cli);
    expectThrow(() => resolveInstalledEslintCli(symlinkRoot), "eslint_cli_symlink_forbidden", "symlink-cli-negative");
  } else {
    checks.push({ id: "symlink-cli-negative", passed: true, detail: "SKIPPED_WINDOWS_PRIVILEGE_DEPENDENT" });
  }

  const partitionedSource = fs.readFileSync("scripts/pass13/run-partitioned-eslint.mjs", "utf8");
  const localRunnerImports = [...partitionedSource.matchAll(/from\s+["']\.\/([^"']+)["']/gu)].map((match) => match[1]).sort();
  check(localRunnerImports.every((file) => FIXTURE_RUNNER_MODULES.includes(file)), "fixture-copies-complete-local-import-closure", { localRunnerImports, fixtureModules: FIXTURE_RUNNER_MODULES });
  const suppressionSource = fs.readFileSync("scripts/pass4826/run-suppression-policy.mjs", "utf8");
  check(!partitionedSource.includes("node_modules/.bin/eslint"), "partitioned-runner-no-eslint-shim");
  check(!suppressionSource.includes("node_modules/.bin/eslint"), "suppression-runner-no-eslint-shim");
  check(partitionedSource.includes("runInstalledEslint"), "partitioned-runner-shared-runtime-boundary");
  check(suppressionSource.includes("runInstalledEslint"), "suppression-runner-shared-runtime-boundary");

  const result = {
    schemaVersion: "velmere.pass36.a102r36.eslint-runner-portability-test.v1",
    revisionId: "VELMERE_PASS36_A102R36_ACTION_REQUIRED_WINDOWS_ESLINT_RUNNER_PROCESS_EXEC_PATH_PORTABILITY_AND_EXACT_LINT_CLOSURE_NO_REAL_CREDIT",
    status: "PASS_A102R36_ESLINT_RUNNER_PORTABILITY_LOCAL_NO_EXACT_WINDOWS_OR_FULL_LINT_CREDIT",
    runtime: { node: process.version, executable: process.execPath, platform: process.platform, arch: process.arch },
    checks: checks.length,
    failed: 0,
    rows: checks,
    truthBoundary: {
      exactWindowsExecution: false,
      exactNode24180Execution: process.version === "v24.18.0",
      realProjectEslintExecution: false,
      fullProjectLint95Of95: false,
      buildBrowserCredit: false,
      live: false,
      saleEnabled: false,
    },
  };
  console.log(JSON.stringify(result, null, 2));
} finally {
  fs.rmSync(temporaryBase, { recursive: true, force: true });
}
