import { createHash } from "node:crypto";
import { chmodSync, copyFileSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  externalCommandArgsSha256,
  runBoundExternalCommand,
} from "../../lib/security/external-command-boundary.ts";
import { createPortableRejectedSymlink } from "./portable-symlink-negative-fixture.mjs";

const checks = [];
function check(id, pass, detail = null) {
  checks.push({ id, pass: Boolean(pass), detail });
  if (!pass) console.error(`[A65] FAIL ${id}`, detail ?? "");
}
function sha256File(file) {
  return `sha256:${createHash("sha256").update(readFileSync(file)).digest("hex")}`;
}
function expectError(id, fn, code) {
  try { fn(); check(id, false, "did_not_throw"); }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    check(id, message.includes(code), message);
  }
}

const externalRootsBefore = new Set(readdirSync(tmpdir()).filter((name) => name.startsWith("velmere-external-command-")));
const dir = mkdtempSync(path.join(tmpdir(), "velmere-a65-test-"));
try {
const fixture = path.join(dir, "fixture.mjs");
writeFileSync(fixture, `
let input = "";
for await (const chunk of process.stdin) input += chunk;
const mode = process.argv[2] || "ok";
if (mode === "sleep") await new Promise((resolve) => setTimeout(resolve, 1800));
if (mode === "large") { process.stdout.write("x".repeat(200000)); process.exit(0); }
if (mode === "fail") { process.stderr.write("sk_live_SUPER_SECRET_VALUE"); process.exit(7); }
process.stdout.write(JSON.stringify({
  ok: true,
  input: JSON.parse(input),
  safe: process.env.SAFE_A65_VALUE || null,
  leakedStripe: Boolean(process.env.STRIPE_SECRET_KEY),
  leakedNodeOptions: Boolean(process.env.NODE_OPTIONS),
  cwdContainsProject: process.cwd().includes("a65_probe"),
}));
`, { mode: 0o600 });
chmodSync(fixture, 0o600);

const executable = path.join(dir, process.platform === "win32" ? "node.exe" : "node");
copyFileSync(process.execPath, executable);
chmodSync(executable, 0o700);
const executableDigest = sha256File(executable);
const fixtureDigest = sha256File(fixture);
const baseArgs = [fixture, "ok"];
const boundary = {
  command: executable,
  args: baseArgs,
  expectedExecutableSha256: executableDigest,
  expectedArgsSha256: externalCommandArgsSha256(baseArgs),
  executionProfile: { kind: "node-script", entrypointIndex: 0 },
  fileArgumentBindings: [{ index: 0, expectedSha256: fixtureDigest }],
  environmentAllowlist: ["SAFE_A65_VALUE"],
};
process.env.SAFE_A65_VALUE = "allowed";
process.env.STRIPE_SECRET_KEY = "sk_live_should_not_leak";
process.env.NODE_OPTIONS = "--require=/tmp/evil.js";

const valid = runBoundExternalCommand({
  boundary,
  input: `${JSON.stringify({ hello: "world" })}\n`,
  timeoutMs: 3000,
  maxOutputBytes: 128 * 1024,
  errorPrefix: "a65_fixture",
});
const validJson = JSON.parse(valid.stdout);
check("valid_bound_command_executes", valid.status === 0 && validJson.ok === true);
check("valid_input_roundtrip", validJson.input?.hello === "world");
check("allowlisted_environment_present", validJson.safe === "allowed");
check("secret_environment_not_inherited", validJson.leakedStripe === false);
check("dangerous_node_options_not_inherited", validJson.leakedNodeOptions === false);
check("isolated_working_directory", validJson.cwdContainsProject === false);
check("executable_digest_recorded", valid.executableSha256 === executableDigest);
check("args_digest_recorded", valid.argsSha256 === boundary.expectedArgsSha256);
check("bound_file_digest_recorded", valid.boundFileSha256["0"] === fixtureDigest);
check("execution_boundary_v4_recorded", valid.executionBoundaryId === "velmere.pass36.external-command-boundary.v4");
check("private_execution_image_digest_recorded", /^sha256:[a-f0-9]{64}$/.test(valid.executionImageSha256) && valid.executionImageFiles === 2);

const mutableBoundary = structuredClone(boundary);
let hookArguments = -1;
const frozenEnvironmentResult = runBoundExternalCommand({
  ...validRun(),
  boundary: mutableBoundary,
  beforeSpawnTestHook: (...values) => {
    hookArguments = values.length;
    mutableBoundary.command = path.join(dir, "missing-mutated-command.exe");
    mutableBoundary.args[0] = path.join(dir, "missing-mutated-entrypoint.mjs");
    mutableBoundary.executionProfile = { kind: "native" };
    process.env.SAFE_A65_VALUE = "mutated-after-plan-freeze";
  },
});
process.env.SAFE_A65_VALUE = "allowed";
check("test_hook_receives_no_private_image_handle", hookArguments === 0);
check("boundary_mutation_cannot_change_frozen_plan", JSON.parse(frozenEnvironmentResult.stdout).ok === true);
check("environment_mutation_cannot_change_frozen_plan", JSON.parse(frozenEnvironmentResult.stdout).safe === "allowed");

const executableOriginal = readFileSync(executable);
try {
  expectError("executable_swap_before_spawn_rejected", () => runBoundExternalCommand({
    ...validRun(),
    boundary,
    beforeSpawnTestHook: () => writeFileSync(executable, "malicious executable replacement"),
  }), "source_changed_before_spawn");
} finally {
  writeFileSync(executable, executableOriginal);
  chmodSync(executable, 0o700);
}
const entrypointOriginal = readFileSync(fixture);
const maliciousSentinel = path.join(dir, "MALICIOUS_SENTINEL");
try {
  expectError("entrypoint_swap_before_spawn_rejected", () => runBoundExternalCommand({
    ...validRun(),
    boundary,
    beforeSpawnTestHook: () => writeFileSync(fixture, `require("node:fs").writeFileSync(${JSON.stringify(maliciousSentinel)},"executed");`),
  }), "source_changed_before_spawn");
} finally {
  writeFileSync(fixture, entrypointOriginal);
  chmodSync(fixture, 0o600);
}
check("swapped_unverified_bytes_never_execute", !readdirSync(dir).includes("MALICIOUS_SENTINEL"));

expectError("relative_command_rejected", () => runBoundExternalCommand({ ...validRun(), boundary: { ...boundary, command: "node" } }), "path_not_absolute");
expectError("missing_executable_rejected", () => runBoundExternalCommand({ ...validRun(), boundary: { ...boundary, command: path.join(dir, "missing-node") } }), "executable_unavailable");
expectError("wrong_executable_digest_rejected", () => runBoundExternalCommand({ ...validRun(), boundary: { ...boundary, expectedExecutableSha256: "sha256:" + "0".repeat(64) } }), "executable_digest_mismatch");
expectError("invalid_executable_digest_rejected", () => runBoundExternalCommand({ ...validRun(), boundary: { ...boundary, expectedExecutableSha256: "bad" } }), "executable_digest_invalid");
expectError("args_digest_mismatch_rejected", () => runBoundExternalCommand({ ...validRun(), boundary: { ...boundary, args: [fixture, "large"] } }), "args_digest_mismatch");
expectError("invalid_args_digest_rejected", () => runBoundExternalCommand({ ...validRun(), boundary: { ...boundary, expectedArgsSha256: "bad" } }), "args_digest_invalid");
expectError("interpreter_entrypoint_must_be_bound", () => runBoundExternalCommand({ ...validRun(), boundary: { ...boundary, fileArgumentBindings: [] } }), "interpreter_entrypoint_unbound");
expectError("duplicate_file_binding_rejected", () => runBoundExternalCommand({ ...validRun(), boundary: { ...boundary, fileArgumentBindings: [{ index: 0, expectedSha256: fixtureDigest }, { index: 0, expectedSha256: fixtureDigest }] } }), "file_binding_index_invalid");
expectError("out_of_range_file_binding_rejected", () => runBoundExternalCommand({ ...validRun(), boundary: { ...boundary, fileArgumentBindings: [{ index: 9, expectedSha256: fixtureDigest }] } }), "file_binding_index_invalid");
expectError("wrong_bound_file_digest_rejected", () => runBoundExternalCommand({ ...validRun(), boundary: { ...boundary, fileArgumentBindings: [{ index: 0, expectedSha256: "sha256:" + "1".repeat(64) }] } }), "bound_file_digest_mismatch");

const renamedInterpreter = path.join(dir, process.platform === "win32" ? "approved-tool.exe" : "approved-tool");
copyFileSync(process.execPath, renamedInterpreter);
chmodSync(renamedInterpreter, 0o700);
const renamedInterpreterDigest = sha256File(renamedInterpreter);
const inlineArgs = ["-e", "process.stdout.write('RENAMED_INTERPRETER_BYPASS')"];
expectError("renamed_interpreter_inline_execution_rejected", () => runBoundExternalCommand({
  ...validRun(),
  boundary: {
    command: renamedInterpreter,
    args: inlineArgs,
    expectedExecutableSha256: renamedInterpreterDigest,
    expectedArgsSha256: externalCommandArgsSha256(inlineArgs),
    executionProfile: { kind: "native", toolFamily: "solc" },
    fileArgumentBindings: [],
    environmentAllowlist: [],
  },
}), "native_argument_policy_invalid");
const nativeVersionArgs = ["--version"];
expectError("native_tool_family_required", () => runBoundExternalCommand({
  ...validRun(),
  boundary: {
    command: renamedInterpreter,
    args: nativeVersionArgs,
    expectedExecutableSha256: renamedInterpreterDigest,
    expectedArgsSha256: externalCommandArgsSha256(nativeVersionArgs),
    executionProfile: { kind: "native" },
    fileArgumentBindings: [],
    environmentAllowlist: [],
  },
}), "native_profile_invalid");

const symlink = path.join(dir, "fixture-link.mjs");
const rejectedLink = createPortableRejectedSymlink(symlink, fixture);
try {
  const symlinkArgs = [symlink, "ok"];
  expectError("symlink_entrypoint_rejected", () => runBoundExternalCommand({ ...validRun(), boundary: { ...boundary, args: symlinkArgs, expectedArgsSha256: externalCommandArgsSha256(symlinkArgs), fileArgumentBindings: [{ index: 0, expectedSha256: fixtureDigest }] } }), "bound_file_symlink_forbidden");
} finally {
  rejectedLink.cleanup();
}

if (process.platform !== "win32") {
  chmodSync(fixture, 0o622);
  expectError("writable_entrypoint_rejected", () => runBoundExternalCommand({ ...validRun(), boundary }), "bound_file_writable_by_group_or_world");
  chmodSync(fixture, 0o600);
} else check("writable_entrypoint_rejected", true, "windows_mode_not_applicable");

expectError("sensitive_environment_rejected", () => runBoundExternalCommand({ ...validRun(), boundary: { ...boundary, environmentAllowlist: ["STRIPE_SECRET_KEY"] } }), "sensitive_environment_forbidden");
expectError("dangerous_environment_rejected", () => runBoundExternalCommand({ ...validRun(), boundary: { ...boundary, environmentAllowlist: ["NODE_OPTIONS"] } }), "dangerous_environment_forbidden");
expectError("invalid_environment_name_rejected", () => runBoundExternalCommand({ ...validRun(), boundary: { ...boundary, environmentAllowlist: ["BAD-NAME"] } }), "environment_name_invalid");
expectError("newline_argument_rejected", () => {
  const args = [fixture, "bad\narg"];
  runBoundExternalCommand({ ...validRun(), boundary: { ...boundary, args, expectedArgsSha256: externalCommandArgsSha256(args) } });
}, "command_arg_invalid");
expectError("too_many_arguments_rejected", () => {
  const args = Array.from({ length: 65 }, (_, i) => String(i));
  runBoundExternalCommand({ ...validRun(), boundary: { ...boundary, args, expectedArgsSha256: externalCommandArgsSha256(args), fileArgumentBindings: [] } });
}, "command_args_invalid");
expectError("timeout_rejected_fail_closed", () => {
  const args = [fixture, "sleep"];
  runBoundExternalCommand({ ...validRun(), timeoutMs: 1000, boundary: { ...boundary, args, expectedArgsSha256: externalCommandArgsSha256(args) } });
}, "command_failed:ETIMEDOUT");
expectError("oversized_output_rejected", () => {
  const args = [fixture, "large"];
  runBoundExternalCommand({ ...validRun(), maxOutputBytes: 4096, boundary: { ...boundary, args, expectedArgsSha256: externalCommandArgsSha256(args) } });
}, "command_failed:ENOBUFS");
try {
  const args = [fixture, "fail"];
  runBoundExternalCommand({ ...validRun(), boundary: { ...boundary, args, expectedArgsSha256: externalCommandArgsSha256(args) } });
  check("stderr_secret_not_exposed", false, "did_not_throw");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  check("stderr_secret_not_exposed", message.includes("command_exit:7:sha256:") && !message.includes("sk_live_SUPER_SECRET_VALUE"), message);
}
expectError("timeout_floor_enforced", () => runBoundExternalCommand({ ...validRun(), timeoutMs: 999, boundary }), "timeout_invalid");
expectError("timeout_ceiling_enforced", () => runBoundExternalCommand({ ...validRun(), timeoutMs: 120001, boundary }), "timeout_invalid");
expectError("output_floor_enforced", () => runBoundExternalCommand({ ...validRun(), maxOutputBytes: 1000, boundary }), "output_limit_invalid");
expectError("output_ceiling_enforced", () => runBoundExternalCommand({ ...validRun(), maxOutputBytes: 5 * 1024 * 1024, boundary }), "output_limit_invalid");
expectError("input_limit_enforced", () => runBoundExternalCommand({ ...validRun(), input: "x".repeat(2 * 1024 * 1024 + 1), boundary }), "input_invalid");

function validRun() {
  return { input: "{}\n", timeoutMs: 3000, maxOutputBytes: 128 * 1024, errorPrefix: "a65_fixture" };
}

const leakedExecutionRoots = readdirSync(tmpdir()).filter((name) => name.startsWith("velmere-external-command-") && !externalRootsBefore.has(name));
check("execution_roots_cleaned_after_success_error_timeout", leakedExecutionRoots.length === 0, leakedExecutionRoots);
const failed = checks.filter((entry) => !entry.pass);
const receipt = {
  schemaVersion: "velmere.pass36.a65.external-command-boundary-test.v2",
  revisionId: "VELMERE_PASS36_A65R0_EXTERNAL_COMMAND_EXECUTION_TRUST_BOUNDARY_HARDENING",
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  checks,
};
console.log(JSON.stringify(receipt, null, 2));
if (failed.length) process.exitCode = 1;
} finally {
  rmSync(dir, { recursive: true, force: true });
}
