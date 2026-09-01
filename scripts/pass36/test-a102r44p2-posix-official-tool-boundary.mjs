#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  externalCommandArgsSha256,
  inspectExternalCommandPlatformContainment,
  PASS36_POSIX_PROCESS_GROUP_BROKER_ID,
  runBoundExternalCommand,
} from "../../lib/security/external-command-boundary.ts";

const REVISION = "VELMERE_PASS36_A102R44P2_ACTION_REQUIRED_AUTOMATED_INFORMATIONAL_SKU_PDF_POSIX_TOOL_BOUNDARY_AND_OFFICIAL_TOOLCHAIN_ADMISSION_NO_LIVE_CREDIT";
const checks = [];
const check = (id, condition, detail = null) => {
  const pass = Boolean(condition);
  checks.push({ id, pass, detail });
  assert.ok(pass, `${id}:${JSON.stringify(detail)}`);
};
const sha256File = (file) => `sha256:${createHash("sha256").update(readFileSync(file)).digest("hex")}`;
const captureError = (fn) => {
  try { fn(); return ""; } catch (error) { return error instanceof Error ? error.message : String(error); }
};

const containment = inspectExternalCommandPlatformContainment();
check("default_platform_boundary_remains_fail_closed", containment.executable === false, containment);
check("broker_identity_is_explicit", PASS36_POSIX_PROCESS_GROUP_BROKER_ID === "velmere.pass36.posix-process-group-broker.v1");

const noBrokerError = captureError(() => runBoundExternalCommand({
  boundary: {
    command: "not-resolved-before-containment",
    args: [],
    expectedExecutableSha256: `sha256:${"0".repeat(64)}`,
    expectedArgsSha256: externalCommandArgsSha256([]),
    executionProfile: { kind: "native", toolFamily: "solc" },
    fileArgumentBindings: [],
    environmentAllowlist: [],
  },
  input: "",
  timeoutMs: 1_000,
  maxOutputBytes: 1_024,
  errorPrefix: "a102r44p2_no_broker",
}));
check(
  "no_broker_still_fails_before_path_resolution",
  noBrokerError === `a102r44p2_no_broker_${process.platform === "win32" ? "windows_job_object_broker_required" : "posix_process_group_broker_required"}`,
  noBrokerError,
);

if (process.platform === "win32") {
  const output = {
    schemaVersion: "velmere.pass36.a102r44p2.posix-official-tool-boundary-test.v1",
    revisionId: REVISION,
    platform: process.platform,
    status: "BLOCKED_WINDOWS_JOB_OBJECT_BROKER_REQUIRED",
    total: checks.length,
    passed: checks.length,
    failed: 0,
    officialToolExecutionCredit: false,
    live: false,
    saleEnabled: false,
    checks,
  };
  console.log(JSON.stringify(output, null, 2));
  process.exit(0);
}

const temp = mkdtempSync(path.join(tmpdir(), "velmere-a102r44p2-broker-test-"));
try {
  const nodeCopy = path.join(temp, "node");
  copyFileSync(process.execPath, nodeCopy);
  chmodSync(nodeCopy, 0o700);
  const nodeDigest = sha256File(nodeCopy);

  const environmentScript = path.join(temp, "environment.mjs");
  writeFileSync(environmentScript, `process.stdout.write(JSON.stringify({secret:process.env.STRIPE_SECRET_KEY??null,nodeOptions:process.env.NODE_OPTIONS??null,cwd:process.cwd()}));\n`, { mode: 0o600 });
  chmodSync(environmentScript, 0o600);
  const environmentDigest = sha256File(environmentScript);
  const normalArgs = [environmentScript];
  process.env.STRIPE_SECRET_KEY = "sk_live_a102r44p2_must_not_cross_boundary";
  process.env.NODE_OPTIONS = "--require=/tmp/a102r44p2-malicious-loader.cjs";
  const normalResult = runBoundExternalCommand({
    boundary: {
      command: nodeCopy,
      args: normalArgs,
      expectedExecutableSha256: nodeDigest,
      expectedArgsSha256: externalCommandArgsSha256(normalArgs),
      executionProfile: { kind: "node-script", entrypointIndex: 0 },
      fileArgumentBindings: [{ index: 0, expectedSha256: environmentDigest }],
      environmentAllowlist: [],
      containmentBroker: "POSIX_PROCESS_GROUP_V1",
    },
    input: "",
    timeoutMs: 5_000,
    maxOutputBytes: 16_384,
    errorPrefix: "a102r44p2_normal",
  });
  const normalOutput = JSON.parse(normalResult.stdout);
  check("posix_broker_executes_bound_node_fixture", normalResult.status === 0 && normalOutput.cwd.includes("velmere-external-command-"), normalOutput);
  check("ambient_secret_environment_is_not_inherited", normalOutput.secret === null && normalOutput.nodeOptions === null, normalOutput);
  check("execution_image_includes_broker_material", normalResult.executionImageFiles >= 5, normalResult.executionImageFiles);

  const overflowScript = path.join(temp, "overflow.mjs");
  writeFileSync(overflowScript, `process.stdout.write("x".repeat(4096));\n`, { mode: 0o600 });
  chmodSync(overflowScript, 0o600);
  const overflowArgs = [overflowScript];
  const overflowError = captureError(() => runBoundExternalCommand({
    boundary: {
      command: nodeCopy,
      args: overflowArgs,
      expectedExecutableSha256: nodeDigest,
      expectedArgsSha256: externalCommandArgsSha256(overflowArgs),
      executionProfile: { kind: "node-script", entrypointIndex: 0 },
      fileArgumentBindings: [{ index: 0, expectedSha256: sha256File(overflowScript) }],
      environmentAllowlist: [],
      containmentBroker: "POSIX_PROCESS_GROUP_V1",
    },
    input: "",
    timeoutMs: 5_000,
    maxOutputBytes: 1_024,
    errorPrefix: "a102r44p2_overflow",
  }));
  check("output_overflow_fails_closed_without_replaying_payload", overflowError.includes("command_failed:output_limit_exceeded") && !overflowError.includes("xxxx"), overflowError);

  const sentinel = path.join(temp, "late-sentinel.txt");
  const timeoutScript = path.join(temp, "timeout-tree.mjs");
  writeFileSync(timeoutScript, `import {spawn} from "node:child_process";\nconst code='setTimeout(()=>require("node:fs").writeFileSync(process.env.A102R44P2_SENTINEL,"late"),1800);setTimeout(()=>{},5000)';\nspawn(process.execPath,["-e",code],{stdio:"ignore"});\nsetTimeout(()=>{},10000);\n`, { mode: 0o600 });
  chmodSync(timeoutScript, 0o600);
  process.env.A102R44P2_SENTINEL = sentinel;
  const timeoutArgs = [timeoutScript];
  const timeoutError = captureError(() => runBoundExternalCommand({
    boundary: {
      command: nodeCopy,
      args: timeoutArgs,
      expectedExecutableSha256: nodeDigest,
      expectedArgsSha256: externalCommandArgsSha256(timeoutArgs),
      executionProfile: { kind: "node-script", entrypointIndex: 0 },
      fileArgumentBindings: [{ index: 0, expectedSha256: sha256File(timeoutScript) }],
      environmentAllowlist: ["A102R44P2_SENTINEL"],
      containmentBroker: "POSIX_PROCESS_GROUP_V1",
    },
    input: "",
    timeoutMs: 1_000,
    maxOutputBytes: 16_384,
    errorPrefix: "a102r44p2_timeout",
  }));
  await new Promise((resolve) => setTimeout(resolve, 2_200));
  check("timeout_kills_process_group_and_descendant", timeoutError.includes("command_failed:timeout") && !existsSync(sentinel), { timeoutError, sentinelExists: existsSync(sentinel) });

  const tamperScript = path.join(temp, "tamper.mjs");
  writeFileSync(tamperScript, `process.stdout.write("ok");\n`, { mode: 0o600 });
  chmodSync(tamperScript, 0o600);
  const tamperArgs = [tamperScript];
  const tamperScriptDigest = sha256File(tamperScript);
  const rootsBeforeTamper = new Set(
    readdirSync(tmpdir()).filter((name) => name.startsWith("velmere-external-command-")),
  );
  const tamperError = captureError(() => runBoundExternalCommand({
    boundary: {
      command: nodeCopy,
      args: tamperArgs,
      expectedExecutableSha256: nodeDigest,
      expectedArgsSha256: externalCommandArgsSha256(tamperArgs),
      executionProfile: { kind: "node-script", entrypointIndex: 0 },
      fileArgumentBindings: [{ index: 0, expectedSha256: sha256File(tamperScript) }],
      environmentAllowlist: [],
      containmentBroker: "POSIX_PROCESS_GROUP_V1",
    },
    input: "",
    timeoutMs: 5_000,
    maxOutputBytes: 16_384,
    errorPrefix: "a102r44p2_tamper",
    beforeSpawnTestHook: () => {
      const candidates = readdirSync(tmpdir())
        .filter((name) => name.startsWith("velmere-external-command-") && !rootsBeforeTamper.has(name))
        .map((name) => path.join(tmpdir(), name))
        .filter((candidate) => statSync(candidate).isDirectory())
        .map((root) => ({ root, plan: path.join(root, "image", "broker-plan.json") }))
        .filter(({ plan }) => existsSync(plan))
        .filter(({ plan }) => {
          try {
            const parsed = JSON.parse(readFileSync(plan, "utf8"));
            return Array.isArray(parsed.files)
              && parsed.files.some((row) => row && row.sha256 === tamperScriptDigest);
          } catch {
            return false;
          }
        });
      assert.equal(candidates.length, 1, `expected_exact_tamper_plan:${JSON.stringify(candidates)}`);
      const plan = candidates[0].plan;
      writeFileSync(plan, `${readFileSync(plan, "utf8")} `);
    },
  }));
  check("broker_plan_tamper_is_rejected_before_spawn", tamperError.includes("external_command_execution_image_"), tamperError);

  const invalidBrokerError = captureError(() => runBoundExternalCommand({
    boundary: {
      command: nodeCopy,
      args: normalArgs,
      expectedExecutableSha256: nodeDigest,
      expectedArgsSha256: externalCommandArgsSha256(normalArgs),
      executionProfile: { kind: "node-script", entrypointIndex: 0 },
      fileArgumentBindings: [{ index: 0, expectedSha256: environmentDigest }],
      environmentAllowlist: [],
      containmentBroker: "UNKNOWN_BROKER",
    },
    input: "",
    timeoutMs: 5_000,
    maxOutputBytes: 16_384,
    errorPrefix: "a102r44p2_invalid_broker",
  }));
  check("unknown_broker_profile_is_rejected", invalidBrokerError.includes("containment_broker_invalid"), invalidBrokerError);
} finally {
  rmSync(temp, { recursive: true, force: true });
}

const failed = checks.filter((row) => !row.pass);
const output = {
  schemaVersion: "velmere.pass36.a102r44p2.posix-official-tool-boundary-test.v1",
  revisionId: REVISION,
  platform: process.platform,
  status: failed.length ? "FAIL" : "PASS_LOCAL_POSIX_PROCESS_GROUP_BOUNDARY_NO_OFFICIAL_TOOL_CREDIT",
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  officialToolExecutionCredit: false,
  live: false,
  saleEnabled: false,
  checks,
};
console.log(JSON.stringify(output, null, 2));
if (failed.length) process.exit(1);
