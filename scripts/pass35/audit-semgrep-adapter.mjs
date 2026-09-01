import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
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
function insideRoot(root, candidate, code) {
  const absolute = path.resolve(root, candidate);
  const relative = path.relative(root, absolute);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) throw new Error(`${code}:${candidate}`);
  if (!existsSync(absolute) || !statSync(absolute).isFile()) throw new Error(`${code}_missing:${candidate}`);
  return absolute;
}
function severityFromSemgrep(value) {
  const severity = String(value ?? "").toUpperCase();
  if (severity === "ERROR") return "high";
  if (severity === "WARNING") return "medium";
  if (severity === "INFO") return "low";
  return "informational";
}

export function executeSemgrepAdapter({ rootPath = process.cwd(), caseInput, toolSpec }) {
  const root = path.resolve(rootPath);
  const blockers = [];
  const add = (ok, code) => { if (!ok) blockers.push(code); };
  add(caseInput?.schemaVersion === "velmere.pass35.audit-a5-semgrep-case.v1", "a5_semgrep_case_schema_invalid");
  add(CASE_REF.test(String(caseInput?.caseRef ?? "")), "a5_semgrep_case_ref_invalid");
  add(["SYNTHETIC_OFFLINE", "CUSTOMER_SUPPLIED_UNVERIFIED", "CUSTOMER_SUPPLIED_VERIFIED"].includes(caseInput?.inputClass), "a5_semgrep_input_class_invalid");
  add(toolSpec?.schemaVersion === "velmere.pass35.audit-a5-tool-spec.v1", "a5_semgrep_tool_schema_invalid");
  add(toolSpec?.toolId === "semgrep", "a5_semgrep_tool_id_invalid");
  add(["NATIVE_BINARY", "NODE_SCRIPT_FIXTURE_ONLY"].includes(toolSpec?.executionMode), "a5_semgrep_execution_mode_invalid");
  add(typeof toolSpec?.expectedVersion === "string" && /^\d+\.\d+\.\d+$/u.test(toolSpec.expectedVersion), "a5_semgrep_expected_version_invalid");
  if (toolSpec?.executionMode === "NATIVE_BINARY") add(digest(toolSpec?.expectedExecutableSha256) !== null, "a5_semgrep_executable_digest_invalid");
  add(digest(caseInput?.inputBundleSha256) !== null, "a5_semgrep_input_bundle_digest_invalid");
  add(digest(caseInput?.configurationSha256) !== null, "a5_semgrep_config_digest_invalid");
  add(digest(caseInput?.rulesetSha256) !== null, "a5_semgrep_ruleset_digest_invalid");
  let targetPath = null;
  let rulesetPath = null;
  try { targetPath = insideRoot(root, caseInput?.targetPath, "a5_semgrep_target_outside_root"); } catch (error) { blockers.push(error.message); }
  try { rulesetPath = insideRoot(root, caseInput?.rulesetPath, "a5_semgrep_ruleset_outside_root"); } catch (error) { blockers.push(error.message); }
  if (targetPath && digest(caseInput?.inputBundleSha256) !== sha256(readFileSync(targetPath))) blockers.push("a5_semgrep_input_bundle_digest_mismatch");
  if (rulesetPath && digest(caseInput?.rulesetSha256) !== sha256(readFileSync(rulesetPath))) blockers.push("a5_semgrep_ruleset_digest_mismatch");

  let executableSha256 = null;
  let entrypointSha256 = null;
  let observedVersion = null;
  let versionOutputSha256 = null;
  let rawOutputSha256 = null;
  let exitCode = null;
  let normalizedFindings = [];
  let rawErrorCount = 0;
  let rawSuccess = false;
  if (!blockers.length) {
    try {
      const executable = toolSpec.executablePath === "__CURRENT_NODE__"
        ? process.execPath
        : path.isAbsolute(toolSpec.executablePath)
          ? path.resolve(toolSpec.executablePath)
          : insideRoot(root, toolSpec.executablePath, "a5_semgrep_executable_outside_root");
      if (!existsSync(executable) || !statSync(executable).isFile()) throw new Error(`a5_semgrep_executable_missing:${toolSpec.executablePath}`);
      executableSha256 = sha256(readFileSync(executable));
      if (toolSpec.executionMode === "NATIVE_BINARY" && digest(toolSpec.expectedExecutableSha256) !== executableSha256) blockers.push("a5_semgrep_executable_digest_mismatch");
      let prefix = [];
      if (toolSpec.executionMode === "NODE_SCRIPT_FIXTURE_ONLY") {
        if (toolSpec.fixtureOnly !== true) blockers.push("a5_semgrep_fixture_mode_without_fixture_flag");
        const entrypoint = insideRoot(root, toolSpec.entrypointPath, "a5_semgrep_entrypoint_outside_root");
        entrypointSha256 = sha256(readFileSync(entrypoint));
        if (digest(toolSpec.expectedEntrypointSha256) !== entrypointSha256) blockers.push("a5_semgrep_entrypoint_digest_mismatch");
        prefix = [entrypoint];
      }
      if (!blockers.length) {
        const common = {
          cwd: root,
          encoding: "utf8",
          timeout: Math.min(Math.max(Number(toolSpec.timeoutMs ?? 30000), 1000), 120000),
          maxBuffer: Math.min(Math.max(Number(toolSpec.maxStdoutBytes ?? 16 * 1024 * 1024), 1024), 64 * 1024 * 1024),
          env: { PATH: process.env.PATH ?? "", HOME: process.env.HOME ?? "", LANG: "C", LC_ALL: "C" },
        };
        const versionRun = spawnSync(executable, [...prefix, "--version"], common);
        versionOutputSha256 = sha256(`${versionRun.stdout ?? ""}\n${versionRun.stderr ?? ""}`);
        observedVersion = (String(versionRun.stdout ?? "").match(/\b\d+\.\d+\.\d+\b/u) ?? [null])[0];
        if (versionRun.status !== 0 || observedVersion !== toolSpec.expectedVersion) blockers.push("a5_semgrep_version_mismatch");
        const analysisRun = spawnSync(executable, [...prefix, "--json", "--config", rulesetPath, targetPath], common);
        exitCode = typeof analysisRun.status === "number" ? analysisRun.status : null;
        const stdout = String(analysisRun.stdout ?? "");
        const stderr = String(analysisRun.stderr ?? "");
        rawOutputSha256 = sha256(`${stdout}\n${stderr}`);
        if (analysisRun.error || analysisRun.signal || analysisRun.status !== 0) blockers.push("a5_semgrep_process_failed");
        let parsed = null;
        try { parsed = JSON.parse(stdout); } catch { blockers.push("a5_semgrep_output_not_json"); }
        const results = Array.isArray(parsed?.results) ? parsed.results : [];
        const errors = Array.isArray(parsed?.errors) ? parsed.errors : [];
        rawErrorCount = errors.length;
        if (rawErrorCount > 0) blockers.push("a5_semgrep_reported_errors");
        rawSuccess = parsed !== null && rawErrorCount === 0;
        normalizedFindings = results.map((result, index) => ({
          findingId: `SEMGREP-${String(index + 1).padStart(4, "0")}`,
          checkId: String(result?.check_id ?? "unknown"),
          severity: severityFromSemgrep(result?.extra?.severity),
          pathSha256: sha256(String(result?.path ?? "")),
          startLine: Number.isInteger(result?.start?.line) ? result.start.line : null,
          endLine: Number.isInteger(result?.end?.line) ? result.end.line : null,
          messageSha256: sha256(String(result?.extra?.message ?? "")),
          metadataSha256: sha256(stable(result?.extra?.metadata ?? {})),
        })).sort((a, b) => a.findingId.localeCompare(b.findingId));
      }
    } catch (error) { blockers.push(`a5_semgrep_execution_exception:${error instanceof Error ? error.message : String(error)}`); }
  }
  const uniqueBlockers = [...new Set(blockers)].sort();
  const realCaseExecution = uniqueBlockers.length === 0
    && caseInput.inputClass !== "SYNTHETIC_OFFLINE"
    && toolSpec.executionMode === "NATIVE_BINARY"
    && toolSpec.fixtureOnly === false;
  const core = {
    schemaVersion: "velmere.pass35.audit-a5-semgrep-receipt.v1",
    familyId: "semgrep_external_static_family",
    toolName: "Semgrep",
    toolVersion: observedVersion,
    caseRef: caseInput.caseRef,
    inputClass: caseInput.inputClass,
    binaryOrImageSha256: executableSha256,
    entrypointSha256,
    versionOutputSha256,
    configurationSha256: digest(caseInput.configurationSha256),
    inputBundleSha256: digest(caseInput.inputBundleSha256),
    rulesetSha256: digest(caseInput.rulesetSha256),
    rawOutputSha256,
    exitCode,
    status: uniqueBlockers.length ? "BLOCKED" : "VERIFIED",
    assuranceClass: toolSpec.fixtureOnly ? "LOCAL_CONTRACT" : "PROVIDER_BOUND_REAL_CASE",
    realCaseExecution,
    paidGateEligible: false,
    rawSuccess,
    rawErrorCount,
    findingCount: normalizedFindings.length,
    severityCounts: normalizedFindings.reduce((acc, finding) => ({ ...acc, [finding.severity]: (acc[finding.severity] ?? 0) + 1 }), {}),
    normalizedFindings,
    blockers: uniqueBlockers,
    limitations: toolSpec.fixtureOnly
      ? ["Fixture executable validates the Semgrep adapter and ruleset binding only.", "No official Semgrep installation, independent family credit or real contract analysis is claimed."]
      : ["One ruleset and one static family cannot establish full audit coverage or exploitability.", "Paid eligibility remains blocked until real-case benchmark, adjudication and independent evidence pass."],
    promotionAllowed: false,
    fullAuditClaimAllowed: false,
  };
  return { ...core, receiptSha256: sha256(stable(core)) };
}
