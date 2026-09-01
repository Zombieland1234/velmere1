import { createHash } from "node:crypto";
import { chmodSync, copyFileSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  executePinnedSolcReproduction,
} from "../../lib/security/audit-a02-solc-reproduction.ts";
import {
  externalCommandArgsSha256,
  runBoundExternalCommand,
} from "../../lib/security/external-command-boundary.ts";
import { createPortableRejectedSymlink } from "./portable-symlink-negative-fixture.mjs";

const REVISION = "VELMERE_PASS36_A66R0_AUDIT_TOOL_EXECUTION_TRUST_BOUNDARY_HARDENING";
const checks = [];
const check = (id, condition) => {
  const pass = Boolean(condition);
  checks.push({ id, pass });
};
const sha256File = (file) => `sha256:${createHash("sha256").update(readFileSync(file)).digest("hex")}`;
const expectError = (id, fn, code) => {
  try {
    fn();
    check(id, false);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    check(id, message.includes(code));
  }
};

process.env.STRIPE_SECRET_KEY = "sk_live_a66_secret_must_not_leak";
process.env.NODE_OPTIONS = "--require=/tmp/a66-malicious-loader.js";
process.env.PATH = process.env.PATH || "/usr/bin";

const caseInput = JSON.parse(readFileSync("fixtures/pass35/audit-a4/synthetic-solc-case.json", "utf8"));
const fixtureTool = JSON.parse(readFileSync("fixtures/pass35/audit-a4/fake-solc-tool.json", "utf8"));
// The POSIX process-group broker performs descriptor-bound image creation and
// post-exit descendant verification. Under concurrent CI load, the historical
// 10s fixture budget produced non-deterministic timeout negatives. This current
// test keeps production limits unchanged and widens only the synthetic fixture
// budget after the timeout class was reproduced and captured.
const currentFixtureTool = { ...fixtureTool, timeoutMs: 60_000 };
const validReceipt = executePinnedSolcReproduction(caseInput, currentFixtureTool);
if (validReceipt.compilation.status !== "EXECUTED") {
  process.stderr.write(`${JSON.stringify({
    diagnostic: "primary_hash_bound_fixture_entrypoint_failed",
    compilationStatus: validReceipt.compilation.status,
    blockers: validReceipt.blockers,
    comparisonStatus: validReceipt.comparison.status,
  })}\n`);
}
check("solc_fixture_executes_through_shared_boundary", validReceipt.compilation.status === "EXECUTED");
check("solc_boundary_id_recorded", validReceipt.tool.executionBoundaryId === "velmere.pass36.external-command-boundary.v4");
check("solc_version_args_digest_recorded", /^sha256:[a-f0-9]{64}$/.test(validReceipt.tool.versionArgsSha256 ?? ""));
check("solc_compile_args_digest_recorded", /^sha256:[a-f0-9]{64}$/.test(validReceipt.tool.compileArgsSha256 ?? ""));
check("solc_isolated_working_directory_recorded", validReceipt.tool.isolatedWorkingDirectory === true);
check("solc_environment_noninheritance_recorded", validReceipt.tool.inheritedEnvironment === false);
check("solc_fixture_remains_not_paid", validReceipt.paidGateEligible === false && validReceipt.promotionAllowed === false);
const repeatedReceipt = executePinnedSolcReproduction(caseInput, currentFixtureTool);
if (repeatedReceipt.compilation.status !== "EXECUTED") {
  process.stderr.write(`${JSON.stringify({
    diagnostic: "repeat_hash_bound_fixture_entrypoint_failed",
    compilationStatus: repeatedReceipt.compilation.status,
    blockers: repeatedReceipt.blockers,
    comparisonStatus: repeatedReceipt.comparison.status,
  })}\n`);
}
check("solc_receipt_is_deterministic", validReceipt.receiptSha256 === repeatedReceipt.receiptSha256);

const temp = mkdtempSync(path.join(tmpdir(), "velmere-a66-test-"));
try {
  const nodeCopy = path.join(temp, process.platform === "win32" ? "node.exe" : "node");
  copyFileSync(process.execPath, nodeCopy);
  chmodSync(nodeCopy, 0o700);
  const nodeDigest = sha256File(nodeCopy);

  const stdinScript = path.join(temp, "stdin-length.mjs");
  writeFileSync(stdinScript, `let body=""; for await (const chunk of process.stdin) body += chunk; process.stdout.write(String(Buffer.byteLength(body)));\n`, { mode: 0o600 });
  chmodSync(stdinScript, 0o600);
  const stdinDigest = sha256File(stdinScript);
  const args = [stdinScript];
  const boundary = {
    command: nodeCopy,
    args,
    expectedExecutableSha256: nodeDigest,
    expectedArgsSha256: externalCommandArgsSha256(args),
    executionProfile: { kind: "node-script", entrypointIndex: 0 },
    fileArgumentBindings: [{ index: 0, expectedSha256: stdinDigest }],
    environmentAllowlist: [],
    containmentBroker: process.platform === "win32" ? undefined : "POSIX_PROCESS_GROUP_V1",
  };
  const largeInput = "x".repeat(3 * 1024 * 1024);
  const accepted = runBoundExternalCommand({
    boundary,
    input: largeInput,
    maxInputBytes: 4 * 1024 * 1024,
    timeoutMs: 10_000,
    maxOutputBytes: 16_384,
    errorPrefix: "a66_input",
  });
  check("explicit_solc_sized_input_budget_supported", accepted.stdout.trim() === String(Buffer.byteLength(largeInput)));
  expectError("default_two_mib_input_budget_preserved", () => runBoundExternalCommand({ boundary, input: largeInput, timeoutMs: 10_000, maxOutputBytes: 16_384, errorPrefix: "a66_input" }), "input_invalid");
  expectError("input_budget_upper_bound_enforced", () => runBoundExternalCommand({ boundary, input: "{}", maxInputBytes: 8 * 1024 * 1024 + 1, timeoutMs: 10_000, maxOutputBytes: 16_384, errorPrefix: "a66_input" }), "input_limit_invalid");
  expectError("input_budget_lower_bound_enforced", () => runBoundExternalCommand({ boundary, input: "{}", maxInputBytes: 1000, timeoutMs: 10_000, maxOutputBytes: 16_384, errorPrefix: "a66_input" }), "input_limit_invalid");

  const tamperedTool = structuredClone(currentFixtureTool);
  tamperedTool.expectedEntrypointSha256 = `sha256:${"f".repeat(64)}`;
  const tamperedReceipt = executePinnedSolcReproduction(caseInput, tamperedTool);
  check("tampered_compiler_entrypoint_rejected", tamperedReceipt.compilation.status === "FAILED" && tamperedReceipt.blockers.some((row) => row.includes("entrypoint_digest_mismatch")));

  const tempSolc = path.join(temp, "fake-solc.mjs");
  copyFileSync("fixtures/pass35/audit-a4/fake-solc.mjs", tempSolc);
  chmodSync(tempSolc, 0o600);
  const tempTool = structuredClone(currentFixtureTool);
  tempTool.entrypointPath = tempSolc;
  tempTool.expectedEntrypointSha256 = sha256File(tempSolc);
  const absoluteReceipt = executePinnedSolcReproduction(caseInput, tempTool);
  if (absoluteReceipt.compilation.status !== "EXECUTED") {
    process.stderr.write(`${JSON.stringify({
      diagnostic: "absolute_hash_bound_fixture_entrypoint_failed",
      compilationStatus: absoluteReceipt.compilation.status,
      blockers: absoluteReceipt.blockers,
      comparisonStatus: absoluteReceipt.comparison.status,
    })}\n`);
  }
  check("absolute_hash_bound_fixture_entrypoint_supported", absoluteReceipt.compilation.status === "EXECUTED");

  const symlink = path.join(temp, "fake-solc-link.mjs");
  const rejectedLink = createPortableRejectedSymlink(symlink, tempSolc);
  try {
    const symlinkTool = structuredClone(tempTool);
    symlinkTool.entrypointPath = symlink;
    const symlinkReceipt = executePinnedSolcReproduction(caseInput, symlinkTool);
    check("symlink_compiler_entrypoint_rejected", symlinkReceipt.compilation.status === "FAILED" && symlinkReceipt.blockers.some((row) => row.includes("symlink_forbidden")));
  } finally {
    rejectedLink.cleanup();
  }

  if (process.platform !== "win32") {
    chmodSync(tempSolc, 0o622);
    const writableReceipt = executePinnedSolcReproduction(caseInput, tempTool);
    check("writable_compiler_entrypoint_rejected", writableReceipt.compilation.status === "FAILED" && writableReceipt.blockers.some((row) => row.includes("writable_by_group_or_world")));
    chmodSync(tempSolc, 0o600);
  } else check("writable_compiler_entrypoint_rejected", true);

  const failScript = path.join(temp, "fail-solc.mjs");
  writeFileSync(failScript, `process.stderr.write("sk_live_A66_MUST_NOT_APPEAR"); process.exit(7);\n`, { mode: 0o600 });
  chmodSync(failScript, 0o600);
  const failTool = structuredClone(currentFixtureTool);
  failTool.entrypointPath = failScript;
  failTool.expectedEntrypointSha256 = sha256File(failScript);
  const failReceipt = executePinnedSolcReproduction(caseInput, failTool);
  const blockerText = failReceipt.blockers.join("\n");
  check("compiler_stderr_secret_not_exposed", !blockerText.includes("sk_live_A66_MUST_NOT_APPEAR"));
  check("compiler_nonzero_exit_fails_closed", failReceipt.compilation.status === "FAILED");
} finally {
  rmSync(temp, { recursive: true, force: true });
}

const auditSource = readFileSync("lib/security/audit-a02-solc-reproduction.ts", "utf8");
const boundarySource = readFileSync("lib/security/external-command-boundary.ts", "utf8");
check("audit_adapter_uses_shared_boundary", auditSource.includes("runBoundExternalCommand") && auditSource.includes("PASS36_EXTERNAL_COMMAND_BOUNDARY_ID"));
check("audit_adapter_has_no_direct_child_process_import", !auditSource.includes('from "node:child_process"') && !auditSource.includes("spawnSync("));
check("audit_adapter_uses_empty_environment_allowlist", auditSource.includes("environmentAllowlist: []"));
check("audit_adapter_uses_isolated_boundary_cwd", auditSource.includes("runBoundExternalCommand") && boundarySource.includes("cwd: executionRoot.work") && boundarySource.includes("removeExecutionRoot"));
check("audit_adapter_binds_interpreter_entrypoint", auditSource.includes("fileArgumentBindings.push({ index: 0"));
check("audit_adapter_declares_execution_profile", auditSource.includes('kind: "node-script"') && auditSource.includes('kind: "native"'));
check("audit_adapter_bounds_large_standard_json", auditSource.includes("maxInputBytes: 8 * 1024 * 1024"));
check("shared_boundary_supports_explicit_input_limit", boundarySource.includes("maxInputBytes?: number") && boundarySource.includes("input_limit_invalid"));
check("only_shared_boundary_imports_child_process_in_lib", (() => {
  const output = [];
  const walk = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else if (entry.isFile() && /\.(?:ts|tsx)$/u.test(entry.name) && readFileSync(absolute, "utf8").includes("node:child_process")) {
        output.push(path.relative(process.cwd(), absolute).replaceAll("\\", "/"));
      }
    }
  };
  walk("lib");
  output.sort();
  return output.length === 1 && output[0] === "lib/security/external-command-boundary.ts";
})());

const failed = checks.filter((entry) => !entry.pass);
const receipt = {
  schemaVersion: "velmere.pass36.a66.audit-tool-execution-boundary-test.v1",
  revisionId: REVISION,
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  checks,
};
console.log(JSON.stringify(receipt, null, 2));
if (failed.length) process.exit(1);
