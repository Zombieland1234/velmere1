#!/usr/bin/env node
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  buildOfficialToolVersionReceipt,
  classifyOfficialExecutable,
  evaluateOfficialAuditTool,
  evaluateOfficialAuditToolchain,
  officialToolVersionArgsSha256,
} from "../../lib/security/official-audit-toolchain-admission.mjs";

const sha256 = (value) => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const checks = [];
const check = (id, passed, detail = null) => checks.push({ id, passed: Boolean(passed), detail });
const policy = JSON.parse(fs.readFileSync("config/pass36/a102r44p2-official-audit-toolchain-admission.json", "utf8"));
const clean = evaluateOfficialAuditToolchain(policy, {});
check("current:no-ambient-tool-credit", clean.admittedTools === 0 && clean.officialToolExecutions === 0, clean);
check("current:four-tool-denominator", clean.requiredTools === 4, clean.requiredTools);
check("current:fail-closed-status", clean.status === "PASS_FAIL_CLOSED_TOOLCHAIN_NOT_ADMITTED", clean.status);
check("policy:fixtures-never-credit", policy.tools.every((tool) => tool.fixtureMayGrantCredit === false), policy.tools);
check("policy:version-pinned", policy.tools.every((tool) => /^\d+\.\d+\.\d+$/u.test(tool.expectedVersion)), policy.tools);

const librarySource = fs.readFileSync("lib/security/official-audit-toolchain-admission.mjs", "utf8");
check("architecture:admission-library-does-not-spawn", !librarySource.includes("node:child_process") && !librarySource.includes("spawnSync(") && !librarySource.includes("spawn("));

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-tool-admission-"));
try {
  const fake = path.join(tmp, process.platform === "win32" ? "fake.cmd" : "fake-tool");
  fs.writeFileSync(fake, process.platform === "win32" ? "@echo 0.8.24\r\n" : "#!/bin/sh\necho 0.8.24\n", "utf8");
  if (process.platform !== "win32") fs.chmodSync(fake, 0o755);
  const base = {
    ...policy.tools[0],
    revisionId: policy.revisionId,
    expectedExecutableSha256: "0".repeat(64),
    allowedExecutableKinds: ["elf", "pe", "mach_o"],
  };
  const fakeResult = evaluateOfficialAuditTool(base, { [base.environmentVariable]: fake });
  check("tamper:script-fixture-not-native", !fakeResult.admitted && fakeResult.blockers.some((row) => row.startsWith("executable_kind_not_allowed")), fakeResult);
  check("tamper:wrong-hash-blocked", !fakeResult.admitted && fakeResult.blockers.includes("executable_sha256_mismatch"), fakeResult);
  const unpinned = evaluateOfficialAuditTool({ ...base, expectedExecutableSha256: null }, { [base.environmentVariable]: fake });
  check("tamper:unpinned-hash-blocked", !unpinned.admitted && unpinned.blockers.includes("exact_executable_sha256_not_pinned"), unpinned);
  const missing = evaluateOfficialAuditTool(base, {});
  check("tamper:missing-path-blocked", !missing.admitted && missing.blockers.includes("tool_path_not_configured"), missing);

  const nodeBytes = fs.readFileSync(process.execPath);
  const nodeDigest = createHash("sha256").update(nodeBytes).digest("hex");
  const nodeKind = classifyOfficialExecutable(nodeBytes);
  const exactTool = {
    toolId: "local-node-boundary-fixture",
    environmentVariable: "VELMERE_TEST_EXACT_TOOL_PATH",
    expectedVersion: process.version.replace(/^v/u, ""),
    versionArgs: ["--version"],
    expectedExecutableSha256: nodeDigest,
    allowedExecutableKinds: [nodeKind],
    fixtureMayGrantCredit: false,
    revisionId: policy.revisionId,
  };
  const noReceipt = evaluateOfficialAuditTool(exactTool, { VELMERE_TEST_EXACT_TOOL_PATH: process.execPath });
  check("boundary:exact-file-without-version-receipt-blocked", !noReceipt.admitted && noReceipt.blockers.includes("version_execution_receipt_missing"), noReceipt);
  const receipt = buildOfficialToolVersionReceipt({
    revisionId: policy.revisionId,
    toolId: exactTool.toolId,
    executableSha256: `sha256:${nodeDigest}`,
    argsSha256: officialToolVersionArgsSha256(exactTool.versionArgs),
    exitCode: 0,
    signal: null,
    observedVersion: exactTool.expectedVersion,
    stdoutSha256: sha256(Buffer.from(process.version, "utf8")),
    stderrSha256: sha256(Buffer.alloc(0)),
    processTreeContained: true,
  });
  const admitted = evaluateOfficialAuditTool(
    exactTool,
    { VELMERE_TEST_EXACT_TOOL_PATH: process.execPath },
    { versionReceipts: { [exactTool.toolId]: receipt } },
  );
  check("boundary:hash-bound-version-receipt-admits-identity-only", admitted.admitted && admitted.officialExecutionCredit === 0, admitted);
  const tamperedReceipt = { ...receipt, observedVersion: "0.0.0" };
  const tamperedVersion = evaluateOfficialAuditTool(
    exactTool,
    { VELMERE_TEST_EXACT_TOOL_PATH: process.execPath },
    { versionReceipts: { [exactTool.toolId]: tamperedReceipt } },
  );
  check("tamper:version-receipt-digest-and-version-rejected", !tamperedVersion.admitted && tamperedVersion.blockers.includes("version_mismatch") && tamperedVersion.blockers.includes("version_execution_receipt_digest_mismatch"), tamperedVersion);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

const failed = checks.filter((row) => !row.passed);
const result = {
  schemaVersion: "velmere.pass36.a102r44p2.official-toolchain-admission-test.v2",
  status: failed.length ? "FAIL" : "PASS",
  checks: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  officialToolExecutions: 0,
  checksDetail: checks,
};
console.log(JSON.stringify(result, null, 2));
if (failed.length) process.exit(1);
