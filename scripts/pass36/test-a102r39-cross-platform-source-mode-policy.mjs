#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  EXECUTABLE_FILE_MODE,
  REGULAR_FILE_MODE,
  canonicalSourceMode,
  loadSourceModePolicy,
  validateObservedSourceMode,
  validateSourceRelativePath,
} from "./source-mode-policy.mjs";
import { collectA102R39Inventory, inventoryFields } from "./package-a102r39-deterministic.mjs";

const root = process.cwd();
const policyPath = "config/pass36/a102r39-cross-platform-source-mode-policy.json";
const policy = loadSourceModePolicy(root, policyPath);
let checks = 0;
const ok = (value, id) => { checks += 1; assert.ok(value, id); };
const throws = (fn, pattern, id) => { checks += 1; assert.throws(fn, pattern, id); };

ok(policy.executablePaths.size === 23, "executable-denominator");
ok(canonicalSourceMode("README.md", policy) === REGULAR_FILE_MODE, "regular-mode");
ok(canonicalSourceMode("scripts/pass36/a102r38-source-boundary.mjs", policy) === EXECUTABLE_FILE_MODE, "parent-executable-mode");
ok(canonicalSourceMode("scripts/pass36/a102r39-source-boundary.mjs", policy) === EXECUTABLE_FILE_MODE, "current-executable-mode");
ok(validateObservedSourceMode("scripts/pass36/a102r38-source-boundary.mjs", { mode: 0o100644 }, policy, "win32").ok, "windows-mode-loss-accepted-by-canonical-policy");
ok(validateObservedSourceMode("README.md", { mode: 0o100777 }, policy, "win32").ok, "windows-mode-non-authority");
ok(validateObservedSourceMode("scripts/pass36/a102r38-source-boundary.mjs", { mode: 0o100755 }, policy, "linux").ok, "posix-executable-parity");
ok(validateObservedSourceMode("README.md", { mode: 0o100644 }, policy, "linux").ok, "posix-regular-parity");
throws(() => validateObservedSourceMode("scripts/pass36/a102r38-source-boundary.mjs", { mode: 0o100644 }, policy, "linux"), /source_mode_posix_mismatch/u, "posix-executable-loss-rejected");
throws(() => validateObservedSourceMode("README.md", { mode: 0o100755 }, policy, "linux"), /source_mode_posix_mismatch/u, "unexpected-posix-executable-rejected");
throws(() => validateObservedSourceMode("README.md", { mode: 0o100644 }, policy, "plan9"), /source_mode_platform_unsupported/u, "unknown-platform-rejected");
throws(() => validateSourceRelativePath("../escape"), /source_mode_path_traversal/u, "traversal-rejected");
throws(() => validateSourceRelativePath("C:/escape"), /source_mode_path_absolute/u, "drive-path-rejected");
throws(() => validateSourceRelativePath("a\\b"), /source_mode_path_separator/u, "backslash-rejected");

const currentPosixInventory = inventoryFields(collectA102R39Inventory(root, "source", { platform: process.platform }).rows);
const currentWindowsInventory = inventoryFields(collectA102R39Inventory(root, "source", { platform: "win32" }).rows);
ok(JSON.stringify(currentPosixInventory) === JSON.stringify(currentWindowsInventory), "current-source-cross-platform-inventory-parity");
ok(policyPath === "config/pass36/a102r39-cross-platform-source-mode-policy.json", "current-mode-policy-path");

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-a102r39-mode-policy-"));
try {
  fs.mkdirSync(path.join(temp, "config/pass36"), { recursive: true });
  fs.mkdirSync(path.join(temp, "scripts/pass36"), { recursive: true });
  fs.writeFileSync(path.join(temp, "scripts/pass36/ok.mjs"), "export {};\n", { mode: 0o755 });
  const base = {
    schemaVersion: "velmere.pass36.cross-platform-source-mode-policy.v1",
    revisionId: "x",
    parentRevisionId: "y",
    regularFileMode: REGULAR_FILE_MODE,
    executableFileMode: EXECUTABLE_FILE_MODE,
    modeAuthority: "EXACT_PATH_ALLOWLIST",
    windowsFilesystemModeIsAuthority: false,
    posixFilesystemModeIsAuthority: true,
    processExecPathRequired: true,
    shellFalseRequired: true,
    executablePaths: ["scripts/pass36/ok.mjs"],
    truthBoundary: "test",
  };
  fs.writeFileSync(path.join(temp, policyPath), `${JSON.stringify(base, null, 2)}\n`);
  ok(loadSourceModePolicy(temp, policyPath).executablePaths.size === 1, "fixture-policy-valid");
  fs.writeFileSync(path.join(temp, "README.md"), "fixture\n", { mode: 0o644 });
  fs.chmodSync(path.join(temp, "scripts/pass36/ok.mjs"), 0o644);
  const fixtureModePolicy = loadSourceModePolicy(temp, policyPath);
  const fixtureWindows = collectA102R39Inventory(temp, "source", { platform: "win32", sourceModePolicy: fixtureModePolicy });
  ok(fixtureWindows.rows.find((row) => row.path === "scripts/pass36/ok.mjs")?.mode === EXECUTABLE_FILE_MODE, "fixture-windows-canonical-executable-mode");
  throws(() => collectA102R39Inventory(temp, "source", { platform: "linux", sourceModePolicy: fixtureModePolicy }), /source_mode_posix_mismatch/u, "fixture-posix-mode-loss-rejected");
  fs.writeFileSync(path.join(temp, policyPath), `${JSON.stringify({ ...base, executablePaths: ["scripts/pass36/ok.mjs", "scripts/pass36/ok.mjs"] }, null, 2)}\n`);
  throws(() => loadSourceModePolicy(temp, policyPath), /source_mode_policy_path_duplicate/u, "duplicate-policy-path-rejected");
  fs.writeFileSync(path.join(temp, policyPath), `${JSON.stringify({ ...base, executablePaths: ["../escape"] }, null, 2)}\n`);
  throws(() => loadSourceModePolicy(temp, policyPath), /source_mode_path_traversal/u, "policy-traversal-rejected");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

console.log(JSON.stringify({
  schemaVersion: "velmere.pass36.a102r39.cross-platform-source-mode-test.v1",
  revisionId: policy.revisionId,
  status: "PASS_A102R39_CROSS_PLATFORM_SOURCE_MODE_POLICY_LOCAL_ONLY_NO_WINDOWS_BUILD_BROWSER_STAGING_OR_SALE_CREDIT",
  checks,
  failed: 0,
  executablePaths: policy.executablePaths.size,
  windowsFilesystemModeAuthority: false,
  posixExactPermissionParity: true,
  globalDecision: "NO_GO",
  live: false,
  saleEnabled: false,
  productionApproved: false,
  worldClassProven: false,
}, null, 2));
