#!/usr/bin/env node

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { computePass4823SourceTree } from "../pass4823/typecheck-source-contract.mjs";
import { REQUIREMENT_IDS, WORLD_CLASS_EVIDENCE_INDEX_SCHEMA } from "./world-class-gate-contract.mjs";
import {
  EVIDENCE_FILE_BLUEPRINTS,
  NORMALIZED_RECEIPT_BLUEPRINTS,
  SCOPE_BLUEPRINTS,
  blueprintEvidenceExists,
  buildRequirementEntry,
  evaluateNormalizedReceiptCandidate,
  readBoundWorldClassPolicy,
  readBlueprintEvidence,
  sealTruthBoundEvidenceIndex,
} from "./world-class-evidence-index-contract.mjs";

const root = process.cwd();

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`argument_value_missing:${name}`);
  return value;
}

function resolveOutput(relativePath) {
  if (path.isAbsolute(relativePath) || relativePath.includes("\\")) throw new Error("output_path_invalid");
  const absolute = path.resolve(root, relativePath);
  const relative = path.relative(root, absolute);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("output_path_outside_project");
  return absolute;
}

function observation(evidence, segments) {
  const key = segments.join(".");
  if (!Object.prototype.hasOwnProperty.call(evidence.observations, key)) {
    throw new Error(`scope_observation_missing:${evidence.id}:${key}`);
  }
  return evidence.observations[key];
}

export function buildTruthBoundIndex({ projectRoot, workspaceRoot, projectEvidenceRoot = projectRoot, generatedAt }) {
  const parsedTime = Date.parse(generatedAt);
  if (!Number.isFinite(parsedTime) || new Date(parsedTime).toISOString() !== generatedAt) {
    throw new Error("generated_at_invalid");
  }
  const evidenceEntries = EVIDENCE_FILE_BLUEPRINTS
    .filter((blueprint) => !blueprint.optional || blueprintEvidenceExists({
      projectRoot: projectEvidenceRoot,
      workspaceRoot,
      blueprint,
    }))
    .map((blueprint) => readBlueprintEvidence({
      projectRoot: projectEvidenceRoot,
      workspaceRoot,
      blueprint,
    }));
  const evidenceFiles = Object.fromEntries(evidenceEntries.map((entry) => [entry.id, entry]));
  const current = computePass4823SourceTree(projectRoot);
  const currentOperationalSource = {
    schemaVersion: current.schemaVersion,
    fileCount: current.fileCount,
    byteLength: current.totalBytes,
    sha256: current.sha256,
  };
  const { policy, binding: policyBinding } = readBoundWorldClassPolicy({ projectRoot, workspaceRoot });
  const normalizedReceiptEvaluations = Object.fromEntries(NORMALIZED_RECEIPT_BLUEPRINTS.map((definition) => [
    definition.requirementId,
    evaluateNormalizedReceiptCandidate({
      definition,
      evidenceFile: evidenceFiles[definition.evidenceFileId] ?? null,
      projectRoot: projectEvidenceRoot,
      workspaceRoot,
      currentSourceTreeSha256: current.sha256,
      policy,
      evaluationTime: generatedAt,
    }),
  ]));
  const scopeLedger = Object.fromEntries(SCOPE_BLUEPRINTS.map((scope) => {
    const evidence = evidenceFiles[scope.primaryEvidenceFileId];
    const reportedFileCount = observation(evidence, scope.fileCountPath);
    const reportedByteLength = observation(evidence, scope.byteLengthPath);
    const reportedDigest = observation(evidence, scope.digestPath);
    if (!Number.isSafeInteger(reportedFileCount) || reportedFileCount <= 0) throw new Error(`scope_file_count_invalid:${scope.id}`);
    if (!Number.isSafeInteger(reportedByteLength) || reportedByteLength <= 0) throw new Error(`scope_byte_length_invalid:${scope.id}`);
    if (!/^[a-f0-9]{64}$/u.test(reportedDigest)) throw new Error(`scope_digest_invalid:${scope.id}`);
    return [scope.id, {
      inventoryContract: scope.inventoryContract,
      primaryEvidenceFileId: scope.primaryEvidenceFileId,
      reportedFileCount,
      reportedByteLength,
      reportedDigest,
      counterMeaning: "files_selected_by_this_scope_only",
      comparableToOtherScopeCounters: false,
    }];
  }));
  const requirements = Object.fromEntries(REQUIREMENT_IDS.map((id) => [
    id,
    buildRequirementEntry(id, normalizedReceiptEvaluations),
  ]));
  const normalizedReceiptReferenceCount = Object.values(requirements)
    .reduce((total, entry) => total + entry.receipts.length, 0);
  const blockedRequirementCount = Object.values(requirements).filter((entry) => entry.status === "BLOCKED").length;
  return sealTruthBoundEvidenceIndex({
    schemaVersion: WORLD_CLASS_EVIDENCE_INDEX_SCHEMA,
    evidenceClass: "truth_bound_candidate_evidence_index",
    generatedAt,
    worldClassGateEligible: false,
    truthBoundary: {
      candidateEvidenceIsNormalizedPassEvidence: false,
      candidateEvidenceMaySupportRemediationPlanningOnly: true,
      crossScopeCountersComparable: false,
      localIntegrityIsIndependentCertification: false,
      historicalPackageIncludesThisIndex: false,
    },
    currentOperationalSource,
    policyBinding,
    scopeLedger,
    scopeInterpretation: {
      build_operational: "Curated operational build-source contract used by PASS4826 dual-build receipts.",
      canonical_release: "Canonical code-only release-integrity snapshot used by the PASS6 critical offline gate.",
      supply_chain_source: "Supply-chain source-manifest contract excluding generated artifacts and dependency/build directories.",
      deterministic_package_payload: "Deterministic release payload inventory; the ZIP also contains one generated manifest entry.",
      rule: "Counts and digests from different inventory contracts are intentionally not compared for equality.",
    },
    evidenceFiles,
    normalizedReceiptEvaluations,
    requirements,
    summary: {
      requiredRequirementCount: REQUIREMENT_IDS.length,
      blockedRequirementCount,
      validatedRequirementCount: REQUIREMENT_IDS.length - blockedRequirementCount,
      normalizedReceiptReferenceCount,
      candidateEvidenceFileCount: evidenceEntries.length,
      mappedScopeCount: SCOPE_BLUEPRINTS.length,
    },
  });
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  const workspaceRoot = path.resolve(argument("--workspace-root", path.resolve(root, "..")));
  const outputPath = argument("--output", "artifacts/pass4826/PASS4826_WORLD_CLASS_EVIDENCE_INDEX.json");
  const generatedAt = argument("--generated-at", new Date().toISOString());
  const index = buildTruthBoundIndex({ projectRoot: root, workspaceRoot, generatedAt });
  const absoluteOutput = resolveOutput(outputPath);
  mkdirSync(path.dirname(absoluteOutput), { recursive: true });
  writeFileSync(absoluteOutput, `${JSON.stringify(index, null, 2)}\n`);

  console.log(JSON.stringify({
    status: "PASS_INDEX_GENERATED_WORLD_CLASS_BLOCKED",
    outputPath,
    indexSha256: index.indexSha256,
    currentOperationalSource: index.currentOperationalSource,
    scopes: Object.fromEntries(Object.entries(index.scopeLedger).map(([id, value]) => [id, value.reportedFileCount])),
    normalizedReceiptReferenceCount: index.summary.normalizedReceiptReferenceCount,
    blockedRequirementCount: index.summary.blockedRequirementCount,
  }, null, 2));
}
