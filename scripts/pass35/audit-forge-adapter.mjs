import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const DIGEST = /^(?:sha256:)?[a-f0-9]{64}$/i;
const CASE_REF = /^AUD-[A-Z0-9-]{8,64}$/u;

function stable(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
}
function sha256(value) { return `sha256:${createHash("sha256").update(value).digest("hex")}`; }
function digest(value) {
  const text = String(value ?? "").trim().toLowerCase();
  if (!DIGEST.test(text)) return null;
  return text.startsWith("sha256:") ? text : `sha256:${text}`;
}
function insideRootFile(root, candidate, code) {
  const absolute = path.resolve(root, candidate);
  const relative = path.relative(root, absolute);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) throw new Error(`${code}:${candidate}`);
  if (!existsSync(absolute) || !statSync(absolute).isFile()) throw new Error(`${code}_missing:${candidate}`);
  return absolute;
}
function insideRootDirectory(root, candidate, code) {
  const absolute = path.resolve(root, candidate);
  const relative = path.relative(root, absolute);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) throw new Error(`${code}:${candidate}`);
  if (!existsSync(absolute) || !statSync(absolute).isDirectory()) throw new Error(`${code}_missing:${candidate}`);
  return absolute;
}
function walk(directory, prefix = "") {
  const rows = [];
  for (const item of readdirSync(directory, { withFileTypes: true })) {
    if (["out", "cache", "broadcast", "node_modules", ".git"].includes(item.name)) continue;
    const relative = prefix ? `${prefix}/${item.name}` : item.name;
    const absolute = path.join(directory, item.name);
    if (item.isDirectory()) rows.push(...walk(absolute, relative));
    else if (item.isFile()) rows.push({ path: relative.replaceAll(path.sep, "/"), sha256: sha256(readFileSync(absolute)), byteLength: statSync(absolute).size });
  }
  return rows.sort((a, b) => a.path.localeCompare(b.path));
}
function normalizeTests(parsed) {
  const suites = parsed?.suites && typeof parsed.suites === "object" ? parsed.suites : {};
  const rows = [];
  for (const [suiteName, suiteValue] of Object.entries(suites)) {
    const tests = suiteValue?.tests && typeof suiteValue.tests === "object" ? suiteValue.tests : {};
    for (const [testName, testValue] of Object.entries(tests)) {
      const rawStatus = String(testValue?.status ?? "unknown").toUpperCase();
      const status = ["SUCCESS", "PASS", "PASSED"].includes(rawStatus)
        ? "passed"
        : ["SKIPPED", "SKIP", "IGNORED"].includes(rawStatus)
          ? "skipped"
          : "failed";
      rows.push({
        testId: `${suiteName}::${testName}`,
        status,
        gas: Number.isFinite(Number(testValue?.gas)) ? Number(testValue.gas) : null,
        durationMs: Number.isFinite(Number(testValue?.durationMs)) ? Number(testValue.durationMs) : null,
        reasonSha256: testValue?.reason == null ? null : sha256(String(testValue.reason)),
      });
    }
  }
  return rows.sort((a, b) => a.testId.localeCompare(b.testId));
}

export function executeForgeAdapter({ rootPath = process.cwd(), caseInput, toolSpec }) {
  const root = path.resolve(rootPath);
  const blockers = [];
  const add = (ok, code) => { if (!ok) blockers.push(code); };
  add(caseInput?.schemaVersion === "velmere.pass35.audit-a6-forge-case.v1", "a6_forge_case_schema_invalid");
  add(CASE_REF.test(String(caseInput?.caseRef ?? "")), "a6_forge_case_ref_invalid");
  add(["SYNTHETIC_OFFLINE", "CUSTOMER_SUPPLIED_UNVERIFIED", "CUSTOMER_SUPPLIED_VERIFIED"].includes(caseInput?.inputClass), "a6_forge_input_class_invalid");
  add(toolSpec?.schemaVersion === "velmere.pass35.audit-a6-tool-spec.v1", "a6_forge_tool_schema_invalid");
  add(toolSpec?.toolId === "forge", "a6_forge_tool_id_invalid");
  add(["NATIVE_BINARY", "NODE_SCRIPT_FIXTURE_ONLY"].includes(toolSpec?.executionMode), "a6_forge_execution_mode_invalid");
  add(typeof toolSpec?.expectedVersion === "string" && /^\d+\.\d+\.\d+$/u.test(toolSpec.expectedVersion), "a6_forge_expected_version_invalid");
  if (toolSpec?.executionMode === "NATIVE_BINARY") add(digest(toolSpec?.expectedExecutableSha256) !== null, "a6_forge_executable_digest_invalid");
  for (const field of ["sourceBundleSha256", "compilerConfigurationSha256", "testPlanSha256"]) add(digest(caseInput?.[field]) !== null, `a6_forge_${field}_invalid`);
  if (caseInput?.sourceToBytecodeReceiptSha256 != null) add(digest(caseInput.sourceToBytecodeReceiptSha256) !== null, "a6_forge_source_bytecode_receipt_invalid");
  if (caseInput?.chainProviderReceiptSha256 != null) add(digest(caseInput.chainProviderReceiptSha256) !== null, "a6_forge_chain_receipt_invalid");

  let projectPath = null;
  try { projectPath = insideRootDirectory(root, caseInput?.projectPath, "a6_forge_project_outside_root"); } catch (error) { blockers.push(error.message); }
  let projectFiles = [];
  if (projectPath) {
    projectFiles = walk(projectPath);
    if (!projectFiles.length) blockers.push("a6_forge_project_empty");
    if (digest(caseInput.sourceBundleSha256) !== sha256(stable(projectFiles))) blockers.push("a6_forge_source_bundle_digest_mismatch");
  }

  let executableSha256 = null;
  let entrypointSha256 = null;
  let observedVersion = null;
  let versionOutputSha256 = null;
  let rawOutputSha256 = null;
  let exitCode = null;
  let tests = [];
  if (!blockers.length) {
    try {
      const executable = toolSpec.executablePath === "__CURRENT_NODE__"
        ? process.execPath
        : path.isAbsolute(toolSpec.executablePath)
          ? path.resolve(toolSpec.executablePath)
          : insideRootFile(root, toolSpec.executablePath, "a6_forge_executable_outside_root");
      if (!existsSync(executable) || !statSync(executable).isFile()) throw new Error(`a6_forge_executable_missing:${toolSpec.executablePath}`);
      executableSha256 = sha256(readFileSync(executable));
      if (toolSpec.executionMode === "NATIVE_BINARY" && digest(toolSpec.expectedExecutableSha256) !== executableSha256) blockers.push("a6_forge_executable_digest_mismatch");
      let prefix = [];
      if (toolSpec.executionMode === "NODE_SCRIPT_FIXTURE_ONLY") {
        if (toolSpec.fixtureOnly !== true) blockers.push("a6_forge_fixture_mode_without_fixture_flag");
        const entrypoint = insideRootFile(root, toolSpec.entrypointPath, "a6_forge_entrypoint_outside_root");
        entrypointSha256 = sha256(readFileSync(entrypoint));
        if (digest(toolSpec.expectedEntrypointSha256) !== entrypointSha256) blockers.push("a6_forge_entrypoint_digest_mismatch");
        prefix = [entrypoint];
      }
      if (!blockers.length) {
        const common = {
          cwd: root,
          encoding: "utf8",
          timeout: Math.min(Math.max(Number(toolSpec.timeoutMs ?? 60000), 1000), 300000),
          maxBuffer: Math.min(Math.max(Number(toolSpec.maxStdoutBytes ?? 16 * 1024 * 1024), 1024), 64 * 1024 * 1024),
          env: { PATH: process.env.PATH ?? "", HOME: process.env.HOME ?? "", LANG: "C", LC_ALL: "C", NO_COLOR: "1" },
        };
        const versionRun = spawnSync(executable, [...prefix, "--version"], common);
        versionOutputSha256 = sha256(`${versionRun.stdout ?? ""}\n${versionRun.stderr ?? ""}`);
        observedVersion = (String(versionRun.stdout ?? "").match(/\b\d+\.\d+\.\d+\b/u) ?? [null])[0];
        if (versionRun.status !== 0 || observedVersion !== toolSpec.expectedVersion) blockers.push("a6_forge_version_mismatch");
        const testRun = spawnSync(executable, [...prefix, "test", "--root", projectPath, "--json"], common);
        exitCode = typeof testRun.status === "number" ? testRun.status : null;
        const stdout = String(testRun.stdout ?? "");
        const stderr = String(testRun.stderr ?? "");
        rawOutputSha256 = sha256(`${stdout}\n${stderr}`);
        if (testRun.error || testRun.signal || testRun.status !== 0) blockers.push("a6_forge_process_failed");
        let parsed = null;
        try { parsed = JSON.parse(stdout); } catch { blockers.push("a6_forge_output_not_json"); }
        tests = normalizeTests(parsed);
        if (!tests.length) blockers.push("a6_forge_no_tests_reported");
        if (tests.some((row) => row.status === "failed")) blockers.push("a6_forge_test_failure");
      }
    } catch (error) { blockers.push(`a6_forge_execution_exception:${error instanceof Error ? error.message : String(error)}`); }
  }

  const uniqueBlockers = [...new Set(blockers)].sort();
  const passCount = tests.filter((row) => row.status === "passed").length;
  const failCount = tests.filter((row) => row.status === "failed").length;
  const skipCount = tests.filter((row) => row.status === "skipped").length;
  const realCaseExecution = uniqueBlockers.length === 0
    && caseInput.inputClass !== "SYNTHETIC_OFFLINE"
    && toolSpec.executionMode === "NATIVE_BINARY"
    && toolSpec.fixtureOnly === false
    && digest(caseInput.sourceToBytecodeReceiptSha256) !== null
    && digest(caseInput.chainProviderReceiptSha256) !== null;
  const core = {
    schemaVersion: "velmere.pass35.audit-a6-forge-receipt.v1",
    familyId: "exact_unit_integration_tests",
    toolName: "Foundry Forge",
    toolVersion: observedVersion,
    caseRef: caseInput.caseRef,
    inputClass: caseInput.inputClass,
    projectPathSha256: sha256(String(caseInput.projectPath ?? "")),
    projectFileCount: projectFiles.length,
    sourceBundleSha256: digest(caseInput.sourceBundleSha256),
    compilerConfigurationSha256: digest(caseInput.compilerConfigurationSha256),
    testPlanSha256: digest(caseInput.testPlanSha256),
    sourceToBytecodeReceiptSha256: digest(caseInput.sourceToBytecodeReceiptSha256),
    chainProviderReceiptSha256: digest(caseInput.chainProviderReceiptSha256),
    binaryOrImageSha256: executableSha256,
    entrypointSha256,
    versionOutputSha256,
    rawOutputSha256,
    exitCode,
    status: uniqueBlockers.length ? "BLOCKED" : "VERIFIED",
    assuranceClass: toolSpec.fixtureOnly ? "LOCAL_CONTRACT" : "PROVIDER_BOUND_REAL_CASE",
    realCaseExecution,
    paidGateEligible: false,
    fullAuditClaimAllowed: false,
    promotionAllowed: false,
    testCount: tests.length,
    passCount,
    failCount,
    skipCount,
    tests,
    blockers: uniqueBlockers,
    limitations: toolSpec.fixtureOnly
      ? ["Fixture executable validates only the Forge adapter, project binding, result normalization and fail-closed behavior.", "No official Forge/EVM execution, customer contract test coverage or paid-gate credit is claimed."]
      : ["One passing test project does not establish sufficient branch/state/invariant coverage.", "Paid eligibility remains blocked until real-case coverage, benchmark, reviewer and independent evidence pass."],
  };
  return { ...core, receiptSha256: sha256(stable(core)) };
}
