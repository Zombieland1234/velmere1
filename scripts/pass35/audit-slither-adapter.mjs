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

function severityFromImpact(impact) {
  const value = String(impact ?? "").toLowerCase();
  if (value === "high") return "high";
  if (value === "medium") return "medium";
  if (value === "low") return "low";
  if (value === "informational" || value === "optimization") return "informational";
  return "informational";
}

export function executeSlitherAdapter({ rootPath = process.cwd(), caseInput, toolSpec }) {
  const root = path.resolve(rootPath);
  const blockers = [];
  const add = (ok, code) => { if (!ok) blockers.push(code); };
  add(caseInput?.schemaVersion === "velmere.pass35.audit-a4-slither-case.v1", "a4_slither_case_schema_invalid");
  add(CASE_REF.test(String(caseInput?.caseRef ?? "")), "a4_slither_case_ref_invalid");
  add(["SYNTHETIC_OFFLINE", "CUSTOMER_SUPPLIED_UNVERIFIED", "CUSTOMER_SUPPLIED_VERIFIED"].includes(caseInput?.inputClass), "a4_slither_input_class_invalid");
  add(toolSpec?.schemaVersion === "velmere.pass35.audit-a4-tool-spec.v1", "a4_slither_tool_schema_invalid");
  add(toolSpec?.toolId === "slither", "a4_slither_tool_id_invalid");
  add(["NATIVE_BINARY", "NODE_SCRIPT_FIXTURE_ONLY"].includes(toolSpec?.executionMode), "a4_slither_execution_mode_invalid");
  add(typeof toolSpec?.expectedVersion === "string" && toolSpec.expectedVersion.length > 0, "a4_slither_expected_version_invalid");
  if (toolSpec?.executionMode === "NATIVE_BINARY") add(digest(toolSpec?.expectedExecutableSha256) !== null, "a4_slither_executable_digest_invalid");
  add(digest(caseInput?.inputBundleSha256) !== null, "a4_slither_input_bundle_digest_invalid");
  add(digest(caseInput?.configurationSha256) !== null, "a4_slither_config_digest_invalid");
  let targetPath = null;
  try { targetPath = insideRoot(root, caseInput?.targetPath, "a4_slither_target_outside_root"); } catch (error) { blockers.push(error.message); }

  let executableSha256 = null;
  let entrypointSha256 = null;
  let observedVersion = null;
  let versionOutputSha256 = null;
  let rawOutputSha256 = null;
  let exitCode = null;
  let normalizedFindings = [];
  let rawSuccess = false;
  if (!blockers.length) {
    try {
      const executable = toolSpec.executablePath === "__CURRENT_NODE__"
        ? process.execPath
        : path.isAbsolute(toolSpec.executablePath)
          ? path.resolve(toolSpec.executablePath)
          : insideRoot(root, toolSpec.executablePath, "a4_slither_executable_outside_root");
      if (!existsSync(executable) || !statSync(executable).isFile()) throw new Error(`a4_slither_executable_missing:${toolSpec.executablePath}`);
      executableSha256 = sha256(readFileSync(executable));
      if (toolSpec.executionMode === "NATIVE_BINARY" && digest(toolSpec.expectedExecutableSha256) !== executableSha256) blockers.push("a4_slither_executable_digest_mismatch");
      let prefix = [];
      if (toolSpec.executionMode === "NODE_SCRIPT_FIXTURE_ONLY") {
        if (toolSpec.fixtureOnly !== true) blockers.push("a4_slither_fixture_mode_without_fixture_flag");
        const entrypoint = insideRoot(root, toolSpec.entrypointPath, "a4_slither_entrypoint_outside_root");
        entrypointSha256 = sha256(readFileSync(entrypoint));
        if (digest(toolSpec.expectedEntrypointSha256) !== entrypointSha256) blockers.push("a4_slither_entrypoint_digest_mismatch");
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
        if (versionRun.status !== 0 || observedVersion !== toolSpec.expectedVersion) blockers.push("a4_slither_version_mismatch");
        const analysisRun = spawnSync(executable, [...prefix, targetPath, "--json", "-"], common);
        exitCode = typeof analysisRun.status === "number" ? analysisRun.status : null;
        const stdout = String(analysisRun.stdout ?? "");
        const stderr = String(analysisRun.stderr ?? "");
        rawOutputSha256 = sha256(`${stdout}\n${stderr}`);
        if (analysisRun.error || analysisRun.signal || analysisRun.status !== 0) blockers.push("a4_slither_process_failed");
        let parsed = null;
        try { parsed = JSON.parse(stdout); } catch { blockers.push("a4_slither_output_not_json"); }
        rawSuccess = parsed?.success === true;
        if (!rawSuccess) blockers.push("a4_slither_reported_failure");
        const detectors = Array.isArray(parsed?.results?.detectors) ? parsed.results.detectors : [];
        normalizedFindings = detectors.map((detector, index) => ({
          findingId: `SLITHER-${String(index + 1).padStart(4, "0")}`,
          check: String(detector?.check ?? "unknown"),
          severity: severityFromImpact(detector?.impact),
          confidence: String(detector?.confidence ?? "unknown").toLowerCase(),
          descriptionSha256: sha256(String(detector?.description ?? "")),
          elementCount: Array.isArray(detector?.elements) ? detector.elements.length : 0,
        })).sort((a, b) => a.findingId.localeCompare(b.findingId));
      }
    } catch (error) { blockers.push(`a4_slither_execution_exception:${error instanceof Error ? error.message : String(error)}`); }
  }
  const uniqueBlockers = [...new Set(blockers)].sort();
  const realCaseExecution = uniqueBlockers.length === 0 && caseInput.inputClass !== "SYNTHETIC_OFFLINE" && toolSpec.executionMode === "NATIVE_BINARY" && toolSpec.fixtureOnly === false;
  const core = {
    schemaVersion: "velmere.pass35.audit-a4-slither-receipt.v1",
    familyId: "slither_external_static_family",
    toolName: "Slither",
    toolVersion: observedVersion,
    caseRef: caseInput.caseRef,
    inputClass: caseInput.inputClass,
    binaryOrImageSha256: executableSha256,
    entrypointSha256,
    versionOutputSha256,
    configurationSha256: digest(caseInput.configurationSha256),
    inputBundleSha256: digest(caseInput.inputBundleSha256),
    rawOutputSha256,
    exitCode,
    status: uniqueBlockers.length ? "BLOCKED" : "VERIFIED",
    assuranceClass: toolSpec.fixtureOnly ? "LOCAL_CONTRACT" : "PROVIDER_BOUND_REAL_CASE",
    realCaseExecution,
    paidGateEligible: false,
    rawSuccess,
    findingCount: normalizedFindings.length,
    severityCounts: normalizedFindings.reduce((acc, finding) => ({ ...acc, [finding.severity]: (acc[finding.severity] ?? 0) + 1 }), {}),
    normalizedFindings,
    blockers: uniqueBlockers,
    limitations: toolSpec.fixtureOnly
      ? ["Fixture executable validates the adapter contract only.", "No official Slither installation or real contract analysis is claimed."]
      : ["One static analyzer family cannot establish full audit coverage or exploitability.", "Paid-gate eligibility remains blocked until benchmark, adjudication, rights and independent evidence pass."],
    promotionAllowed: false,
    fullAuditClaimAllowed: false,
  };
  return { ...core, receiptSha256: sha256(stable(core)) };
}
