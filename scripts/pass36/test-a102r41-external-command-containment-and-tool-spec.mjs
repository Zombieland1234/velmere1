#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  executePinnedSolcReproduction,
} from "../../lib/security/audit-a02-solc-reproduction.ts";
import {
  inspectExternalCommandPlatformContainment,
  runBoundExternalCommand,
} from "../../lib/security/external-command-boundary.ts";

const checks = [];
const check = (id, condition, detail = null) => {
  const pass = Boolean(condition);
  checks.push({ id, pass, detail });
  assert.ok(pass, `${id}:${JSON.stringify(detail)}`);
};

const containment = inspectExternalCommandPlatformContainment();
check("platform_execution_fails_closed_without_pinned_tree_broker", containment.executable === false, containment);
check(
  "platform_blocker_is_explicit",
  process.platform === "win32"
    ? containment.status === "BLOCKED_WINDOWS_JOB_OBJECT_BROKER_REQUIRED"
    : containment.status === "BLOCKED_POSIX_PROCESS_GROUP_BROKER_REQUIRED",
  containment.status,
);

let runError = "";
try {
  runBoundExternalCommand({
    boundary: {
      command: "not-resolved-before-containment",
      args: [],
      expectedExecutableSha256: `sha256:${"0".repeat(64)}`,
      expectedArgsSha256: `sha256:${"0".repeat(64)}`,
      executionProfile: { kind: "native", toolFamily: "solc" },
      fileArgumentBindings: [],
      environmentAllowlist: [],
    },
    input: "",
    timeoutMs: 1_000,
    maxOutputBytes: 1_024,
    errorPrefix: "a102r41_containment_probe",
  });
} catch (error) {
  runError = error instanceof Error ? error.message : String(error);
}
check(
  "uncontained_command_never_reaches_path_resolution",
  runError === `a102r41_containment_probe_${process.platform === "win32" ? "windows_job_object_broker_required" : "posix_process_group_broker_required"}`,
  runError,
);

const caseInput = JSON.parse(readFileSync("fixtures/pass35/audit-a4/synthetic-solc-case.json", "utf8"));
const fixtureTool = JSON.parse(readFileSync("fixtures/pass35/audit-a4/fake-solc-tool.json", "utf8"));
const invalidModeTool = {
  ...fixtureTool,
  executionMode: "INVALID_MODE",
  executablePath: "renamed-untrusted-interpreter",
  entrypointPath: null,
  expectedExecutableSha256: `sha256:${"0".repeat(64)}`,
  expectedEntrypointSha256: null,
  fixtureOnly: false,
};
const invalidModeReceipt = executePinnedSolcReproduction(caseInput, invalidModeTool);
check("unknown_execution_mode_is_stable_blocker", invalidModeReceipt.blockers.includes("a4_tool_execution_mode_invalid"), invalidModeReceipt.blockers);
check("unknown_execution_mode_executes_zero_commands", invalidModeReceipt.compilation.status === "BLOCKED" && invalidModeReceipt.tool.executableSha256 === null && invalidModeReceipt.tool.versionArgsSha256 === null && invalidModeReceipt.tool.compileArgsSha256 === null, invalidModeReceipt.tool);
check("invalid_execution_mode_not_echoed_as_authority", invalidModeReceipt.tool.executionMode === null, invalidModeReceipt.tool.executionMode);
check("invalid_tool_never_paid", invalidModeReceipt.paidGateEligible === false && invalidModeReceipt.promotionAllowed === false && invalidModeReceipt.fullAuditClaimAllowed === false);

const unknownKeyReceipt = executePinnedSolcReproduction(caseInput, { ...fixtureTool, unexpectedAuthority: true });
check("tool_spec_unknown_key_rejected", unknownKeyReceipt.blockers.includes("a4_tool_spec_unknown_key"), unknownKeyReceipt.blockers);

const nativeRelativeReceipt = executePinnedSolcReproduction(caseInput, {
  ...fixtureTool,
  executionMode: "NATIVE_BINARY",
  executablePath: "relative-solc",
  entrypointPath: null,
  expectedExecutableSha256: `sha256:${"1".repeat(64)}`,
  expectedEntrypointSha256: null,
  fixtureOnly: false,
});
check("native_tool_requires_absolute_path", nativeRelativeReceipt.blockers.includes("a4_native_tool_absolute_path_required"), nativeRelativeReceipt.blockers);

const boundarySource = readFileSync("lib/security/external-command-boundary.ts", "utf8");
check("renamed_interpreter_inline_flags_denied_by_family_policy", boundarySource.includes('toolFamily: "solc"') && boundarySource.includes("external_command_native_argument_policy_invalid"));
check("boundary_version_records_containment_revision", boundarySource.includes('velmere.pass36.external-command-boundary.v4'));

const failed = checks.filter((row) => !row.pass);
const receipt = {
  schemaVersion: "velmere.pass36.a102r41.external-command-containment-and-tool-spec-test.v1",
  revisionId: "VELMERE_PASS36_A102R41_ACTION_REQUIRED_SECURITY_EVIDENCE_AUTHORITY_EXACT_WINDOWS_AND_FAIL_CLOSED_RELEASE_PACKAGING_NO_LIVE_CREDIT",
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  platformContainment: containment,
  externalCommandExecutionCredit: false,
  live: false,
  saleEnabled: false,
  checks,
};
console.log(JSON.stringify(receipt, null, 2));
if (failed.length) process.exit(1);
