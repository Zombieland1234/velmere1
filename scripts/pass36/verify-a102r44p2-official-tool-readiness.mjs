#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

const POLICY_PATH = "config/pass36/a102r44p2-official-tool-readiness-policy.json";
const policy = JSON.parse(readFileSync(POLICY_PATH, "utf8"));
const admissionPolicy = JSON.parse(readFileSync(policy.authority.admissionPolicyPath, "utf8"));
const planningPolicy = JSON.parse(readFileSync(policy.authority.executionPlanningPolicyPath, "utf8"));
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const expand = (value) => value.startsWith("~/") ? path.join(homedir(), value.slice(2)) : value;

function inspectCandidate(candidate, expectedSha256) {
  const absolute = path.resolve(expand(candidate));
  if (!existsSync(absolute)) return { path: absolute, status: "MISSING" };
  try {
    const metadata = lstatSync(absolute);
    if (metadata.isSymbolicLink()) return { path: absolute, status: "REJECTED_SYMLINK" };
    if (!metadata.isFile()) return { path: absolute, status: "REJECTED_NOT_REGULAR_FILE" };
    const resolved = realpathSync(absolute);
    if (resolved !== absolute) return { path: absolute, status: "REJECTED_REALPATH_MISMATCH" };
    if (process.platform !== "win32" && (metadata.mode & 0o111) === 0) return { path: absolute, status: "REJECTED_NOT_EXECUTABLE" };
    if (process.platform !== "win32" && (metadata.mode & 0o022) !== 0) return { path: absolute, status: "REJECTED_WRITABLE_BY_GROUP_OR_WORLD" };
    const bytes = readFileSync(absolute);
    const digest = sha256(bytes);
    if (expectedSha256 && digest !== expectedSha256) return { path: absolute, status: "REJECTED_DIGEST_MISMATCH", sha256: digest, bytes: bytes.length };
    return { path: absolute, status: "PRESENT_HASH_BOUND_NOT_EXECUTED", sha256: digest, bytes: bytes.length };
  } catch (error) {
    return { path: absolute, status: "REJECTED_READ_FAILURE", errorClass: error instanceof Error ? error.name : "Error" };
  }
}

const admissionById = new Map(admissionPolicy.tools.map((tool) => [tool.toolId, tool]));
const planningById = new Map(planningPolicy.tools.map((tool) => [tool.id, tool]));
const toolRows = policy.tools.map((tool) => {
  const explicit = process.env[tool.environmentVariable];
  const candidates = [];
  if (typeof explicit === "string" && explicit.trim()) candidates.push(explicit.trim());
  candidates.push(...tool.candidatePaths);
  const unique = [...new Set(candidates.map(expand))];
  const inspections = unique.map((candidate) => inspectCandidate(candidate, tool.officialSha256));
  const accepted = inspections.find((row) => row.status === "PRESENT_HASH_BOUND_NOT_EXECUTED") ?? null;
  const admission = admissionById.get(tool.id) ?? null;
  const planning = planningById.get(tool.id) ?? null;
  const policyConsistent = Boolean(
    admission
    && planning
    && admission.environmentVariable === tool.environmentVariable
    && admission.expectedVersion === tool.requiredVersion
    && planning.requiredVersion === tool.requiredVersion
  );
  return {
    id: tool.id,
    environmentVariable: tool.environmentVariable,
    requiredVersion: tool.requiredVersion,
    officialArtifact: tool.officialArtifact,
    officialSha256: tool.officialSha256,
    accepted,
    inspections,
    artifactIdentityPinned: tool.artifactIdentityPinned === true,
    policyConsistent,
    officialExecutionCount: 0,
    status: !policyConsistent
      ? "POLICY_INCONSISTENT"
      : accepted
        ? "BINARY_PRESENT_EXECUTION_NOT_PROVEN"
        : "BINARY_NOT_READY"
  };
});

const nodeObserved = process.versions.node;
const npmObserved = process.env.npm_config_user_agent?.match(/npm\/([^\s]+)/u)?.[1] ?? null;
const result = {
  schemaVersion: "velmere.pass36.a102r44p2.official-tool-readiness-receipt.v1",
  revisionId: policy.revisionId,
  platform: process.platform,
  architecture: process.arch,
  runtime: {
    requiredNode: policy.requiredRuntime.node,
    observedNode: nodeObserved,
    exactNode: nodeObserved === policy.requiredRuntime.node,
    requiredNpm: policy.requiredRuntime.npm,
    observedNpm: npmObserved,
    exactNpm: npmObserved === policy.requiredRuntime.npm
  },
  tools: toolRows,
  summary: {
    requiredTools: toolRows.length,
    policyConsistentTools: toolRows.filter((row) => row.policyConsistent).length,
    binaryReady: toolRows.filter((row) => row.accepted).length,
    officialExecutionsRequired: policy.truthBoundary.requiredOfficialExecutions,
    officialExecutionsCompleted: 0,
    exactRuntimeReady: nodeObserved === policy.requiredRuntime.node && npmObserved === policy.requiredRuntime.npm,
    officialToolCredit: false,
    saleCredit: false,
    liveCredit: false
  },
  status: toolRows.every((row) => row.policyConsistent)
    ? "ACTION_REQUIRED_OFFICIAL_BINARIES_AND_EXACT_RUNTIME_MISSING"
    : "FAIL_OFFICIAL_TOOL_POLICY_INCONSISTENT",
  truthBoundary: "This discovery receipt is subordinate to the authoritative admission policy. It checks explicit absolute candidates and pinned identity only, and never treats PATH lookup, fixtures, binary presence, metadata, or a version string as an official tool execution."
};
console.log(JSON.stringify(result, null, 2));
