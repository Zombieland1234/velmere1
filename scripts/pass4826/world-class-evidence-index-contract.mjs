import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  readFileSync,
  realpathSync,
} from "node:fs";
import path from "node:path";
import {
  REQUIREMENT_IDS,
  WORLD_CLASS_EVIDENCE_INDEX_SCHEMA,
  canonicalJson,
  evaluateWorldClassRequirementEvidence,
  validateWorldClassPolicy,
} from "./world-class-gate-contract.mjs";

export const WORLD_CLASS_EVIDENCE_INDEX_VERIFICATION_SCHEMA =
  "velmere.pass4826.world-class-evidence-index-verification.v1";
export const WORLD_CLASS_POLICY_PATH = "scripts/pass4826/world-class-policy.json";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isDigest = (value) => /^[a-f0-9]{64}$/u.test(String(value ?? ""));

const freezeBlueprint = (value) => Object.freeze(value.map((entry) => Object.freeze({
  ...entry,
  optional: entry.optional === true,
  capturePaths: Object.freeze(entry.capturePaths.map((segments) => Object.freeze([...segments]))),
})));

export const EVIDENCE_FILE_BLUEPRINTS = freezeBlueprint([
  {
    id: "build_dual_gate",
    rootClass: "project",
    path: "artifacts/pass4826/PASS4826_DUAL_BUILD_GATE.json",
    kind: "json",
    expectedSchemaVersion: "velmere.pass4826.dual-build-output-gate.v2",
    capturePaths: [
      ["status"],
      ["ok"],
      ["dualBuildGatePassed"],
      ["currentSourceTreeSha256"],
      ["sourceTreeFileCount"],
      ["sourceTreeByteLength"],
    ],
  },
  {
    id: "canonical_offline_gate",
    rootClass: "project",
    path: "artifacts/pass6/PASS6_CRITICAL_OFFLINE_GATE.json",
    kind: "json",
    expectedSchemaVersion: "velmere.pass6.critical-offline-gate.v1",
    capturePaths: [
      ["status"],
      ["offlineReleaseCandidateEligible"],
      ["liveReleaseEligible"],
      ["liveClaimed"],
      ["sourceAfter", "schemaVersion"],
      ["sourceAfter", "files"],
      ["sourceAfter", "bytes"],
      ["sourceAfter", "sha256"],
      ["suiteCount"],
      ["passedSuiteCount"],
      ["failedSuiteCount"],
    ],
  },
  {
    id: "supply_offline_implementation",
    rootClass: "project",
    path: "artifacts/pass6/PASS4992_OFFLINE_IMPLEMENTATION_RECEIPT.json",
    kind: "json",
    expectedSchemaVersion: "velmere.pass4992.offline-supply-chain-implementation-receipt.v1",
    capturePaths: [
      ["status"],
      ["offlineImplementationPassed"],
      ["releaseEligible"],
      ["sourceDigest"],
      ["sourceFileCount"],
      ["sourceBytes"],
      ["checks", "offlineProvenanceExplicitlyUntrustedAndUnsigned"],
      ["checks", "trustedReleaseProvenanceIssued"],
      ["remainingReleaseBlockers"],
    ],
  },
  {
    id: "supply_release_gate",
    rootClass: "project",
    path: "artifacts/pass6/PASS4992_RELEASE_GATE.json",
    kind: "json",
    expectedSchemaVersion: "velmere.pass4992.supply-chain-release-gate.v1",
    capturePaths: [
      ["status"],
      ["releaseEligible"],
      ["sourceDigest"],
      ["sourceFileCount"],
      ["signedExternalControlCount"],
      ["requiredSignedExternalControlCount"],
      ["blockers"],
    ],
  },
  {
    id: "package_receipt",
    rootClass: "workspace",
    path: "deliverables/VELMERE_PASS6_PACKAGE_RECEIPT.json",
    kind: "json",
    expectedSchemaVersion: "velmere.pass4826.deterministic-release-package-receipt.v1",
    capturePaths: [
      ["status"],
      ["payloadFileCount"],
      ["payloadByteLength"],
      ["sourceTreeBeforeSha256"],
      ["sourceTreeAfterSha256"],
      ["sourceUnchanged"],
      ["archive", "byteLength"],
      ["archive", "sha256"],
      ["receiptSha256"],
    ],
  },
  {
    id: "package_verification",
    rootClass: "workspace",
    path: "deliverables/VELMERE_PASS6_RELEASE_VERIFICATION.json",
    kind: "json",
    expectedSchemaVersion: "velmere.pass4826.deterministic-release-verification.v1",
    capturePaths: [
      ["status"],
      ["archive", "entryCount"],
      ["archive", "byteLength"],
      ["archive", "sha256"],
      ["payload", "fileCount"],
      ["payload", "byteLength"],
      ["payload", "aggregateSha256"],
      ["sourceTreeCurrent"],
      ["completeReleaseTreeBound"],
      ["physicalExclusionsVerified"],
      ["deterministicZipStructureVerified"],
    ],
  },
  {
    id: "package_archive",
    rootClass: "workspace",
    path: "deliverables/VELMERE_PASS6_99_9_OFFLINE_CANDIDATE.zip",
    kind: "binary",
    expectedSchemaVersion: null,
    capturePaths: [],
  },
  {
    id: "browser_webpack_diagnostic",
    rootClass: "project",
    path: "artifacts/pass4825/PASS4825_LOCAL_BROWSER_SMOKE_WEBPACK_RECEIPT.json",
    kind: "json",
    expectedSchemaVersion: "velmere.pass4825.local-browser-smoke.v2",
    capturePaths: [
      ["verdict"],
      ["engine"],
      ["counts", "PASS"],
      ["counts", "FAIL"],
      ["scope", "expectedJourneys"],
      ["scope", "executedJourneys"],
      ["scope", "accessibilitySeriousOrCriticalViolations"],
      ["runtime", "chromiumVersion"],
      ["runtime", "chromiumBinarySha256"],
      ["runtime", "sourceTreeSha256"],
      ["runtime", "sourceTreeFileCount"],
    ],
  },
  {
    id: "appearance_projection_diagnostic",
    rootClass: "project",
    path: "artifacts/pass6/PASS6_APPEARANCE_FREEZE_RECEIPT.json",
    kind: "json",
    expectedSchemaVersion: "velmere.pass4825.appearance-projection-freeze.v1",
    capturePaths: [
      ["status"],
      ["claimBoundary", "pixelParityClaimed"],
      ["claimBoundary", "browserRuntimeExecuted"],
      ["comparison", "failureCount"],
      ["sourceBinding", "current", "sha256"],
      ["sourceBinding", "current", "fileCount"],
    ],
  },
  {
    id: "local_started_server_smoke",
    rootClass: "project",
    path: "artifacts/pass6/PASS6_STARTED_SERVER_SMOKE.json",
    kind: "json",
    expectedSchemaVersion: "velmere.pass6.started-server-smoke.v1",
    capturePaths: [
      ["status"],
      ["localRuntimeVerified"],
      ["browserE2EVerified"],
      ["productionLiveVerified"],
      ["routeCount"],
      ["stylesheetCount"],
      ["sourceTreeSha256"],
    ],
  },
  {
    id: "npm_audit_production",
    rootClass: "project",
    path: "artifacts/pass6/PASS6_NPM_AUDIT_FINAL.json",
    kind: "json",
    expectedSchemaVersion: null,
    capturePaths: [
      ["auditReportVersion"],
      ["metadata", "vulnerabilities", "total"],
      ["metadata", "dependencies", "prod"],
      ["metadata", "dependencies", "total"],
    ],
  },
  {
    id: "offline_untrusted_provenance",
    rootClass: "project",
    path: "artifacts/pass6/PASS4992_OFFLINE_UNTRUSTED_PROVENANCE.intoto.json",
    kind: "json",
    expectedSchemaVersion: null,
    capturePaths: [
      ["_type"],
      ["predicateType"],
      ["predicate", "buildDefinition", "externalParameters", "purpose"],
      ["predicate", "buildDefinition", "internalParameters", "trustedBuilder"],
      ["predicate", "buildDefinition", "internalParameters", "signatureIssued"],
    ],
  },
  {
    id: "normalized_suppressions_policy",
    rootClass: "project",
    path: "artifacts/pass4826/PASS4826_SUPPRESSIONS_POLICY_EVIDENCE.json",
    kind: "json",
    expectedSchemaVersion: "velmere.pass4826.world-class-evidence.v1",
    optional: true,
    capturePaths: [
      ["requirementId"],
      ["status"],
      ["passed"],
      ["sourceTreeSha256"],
      ["postRunSourceTreeSha256"],
      ["sourceUnchanged"],
      ["receiptSha256"],
    ],
  },
  {
    id: "normalized_repeated_run_determinism",
    rootClass: "project",
    path: "artifacts/pass4826/PASS4826_REPEATED_RUN_DETERMINISM_EVIDENCE.json",
    kind: "json",
    expectedSchemaVersion: "velmere.pass4826.world-class-evidence.v1",
    optional: true,
    capturePaths: [
      ["requirementId"],
      ["status"],
      ["passed"],
      ["sourceTreeSha256"],
      ["postRunSourceTreeSha256"],
      ["sourceUnchanged"],
      ["receiptSha256"],
    ],
  },
]);

export const SCOPE_BLUEPRINTS = Object.freeze([
  Object.freeze({
    id: "build_operational",
    inventoryContract: "velmere.pass4825.build-source-tree.sha256.v2",
    primaryEvidenceFileId: "build_dual_gate",
    fileCountPath: Object.freeze(["sourceTreeFileCount"]),
    byteLengthPath: Object.freeze(["sourceTreeByteLength"]),
    digestPath: Object.freeze(["currentSourceTreeSha256"]),
  }),
  Object.freeze({
    id: "canonical_release",
    inventoryContract: "velmere.release-integrity.source-snapshot.v1",
    primaryEvidenceFileId: "canonical_offline_gate",
    fileCountPath: Object.freeze(["sourceAfter", "files"]),
    byteLengthPath: Object.freeze(["sourceAfter", "bytes"]),
    digestPath: Object.freeze(["sourceAfter", "sha256"]),
  }),
  Object.freeze({
    id: "supply_chain_source",
    inventoryContract: "velmere.pass4992.source-manifest.v1",
    primaryEvidenceFileId: "supply_offline_implementation",
    fileCountPath: Object.freeze(["sourceFileCount"]),
    byteLengthPath: Object.freeze(["sourceBytes"]),
    digestPath: Object.freeze(["sourceDigest"]),
  }),
  Object.freeze({
    id: "deterministic_package_payload",
    inventoryContract: "velmere.pass4826.deterministic-release-manifest.v1:payload",
    primaryEvidenceFileId: "package_verification",
    fileCountPath: Object.freeze(["payload", "fileCount"]),
    byteLengthPath: Object.freeze(["payload", "byteLength"]),
    digestPath: Object.freeze(["payload", "aggregateSha256"]),
  }),
]);

export const NORMALIZED_RECEIPT_BLUEPRINTS = Object.freeze([
  Object.freeze({
    requirementId: "suppressions_policy",
    evidenceFileId: "normalized_suppressions_policy",
    path: "artifacts/pass4826/PASS4826_SUPPRESSIONS_POLICY_EVIDENCE.json",
  }),
  Object.freeze({
    requirementId: "repeated_run_determinism",
    evidenceFileId: "normalized_repeated_run_determinism",
    path: "artifacts/pass4826/PASS4826_REPEATED_RUN_DETERMINISM_EVIDENCE.json",
  }),
]);

export const REQUIREMENT_CANDIDATE_MAP = Object.freeze({
  full_product_coverage: Object.freeze(["canonical_offline_gate"]),
  browser_webpack: Object.freeze(["browser_webpack_diagnostic"]),
  browser_turbopack: Object.freeze(["build_dual_gate"]),
  pixel_webpack: Object.freeze(["appearance_projection_diagnostic"]),
  pixel_turbopack: Object.freeze(["appearance_projection_diagnostic"]),
  accessibility: Object.freeze(["browser_webpack_diagnostic"]),
  source_tree_binding: Object.freeze([
    "build_dual_gate",
    "canonical_offline_gate",
    "supply_offline_implementation",
    "package_receipt",
    "package_verification",
    "package_archive",
  ]),
  duplication_policy: Object.freeze(["canonical_offline_gate"]),
  suppressions_policy: Object.freeze(["canonical_offline_gate"]),
  exact_runtime: Object.freeze(["build_dual_gate", "browser_webpack_diagnostic", "local_started_server_smoke"]),
  repeated_run_determinism: Object.freeze(["package_receipt", "package_verification", "package_archive"]),
  os_network_isolation: Object.freeze(["canonical_offline_gate"]),
  clean_room_quorum: Object.freeze(["package_verification"]),
  license: Object.freeze(["supply_offline_implementation", "supply_release_gate"]),
  malware: Object.freeze(["supply_release_gate"]),
  provenance: Object.freeze(["supply_release_gate", "offline_untrusted_provenance"]),
  database_live: Object.freeze(["canonical_offline_gate"]),
  external_certification: Object.freeze([]),
});

function withoutDigest(value, digestField) {
  const core = { ...value };
  delete core[digestField];
  return core;
}

export function sealTruthBoundEvidenceIndex(core) {
  return { ...core, indexSha256: sha256(canonicalJson(core)) };
}

export function sealEvidenceIndexVerification(core) {
  return { ...core, receiptSha256: sha256(canonicalJson(core)) };
}

function resolveSafeFile({ projectRoot, workspaceRoot, rootClass, relativePath, errors, codePrefix }) {
  const selectedRoot = rootClass === "project" ? projectRoot : rootClass === "workspace" ? workspaceRoot : null;
  if (!selectedRoot) {
    errors.push(`${codePrefix}:root_class_invalid`);
    return null;
  }
  if (typeof relativePath !== "string" || !relativePath || relativePath.includes("\\") || path.isAbsolute(relativePath)) {
    errors.push(`${codePrefix}:path_invalid`);
    return null;
  }
  const normalized = path.posix.normalize(relativePath);
  if (normalized !== relativePath || normalized === "." || normalized === ".." || normalized.startsWith("../")) {
    errors.push(`${codePrefix}:path_traversal`);
    return null;
  }
  const absoluteRoot = path.resolve(selectedRoot);
  const absolute = path.resolve(absoluteRoot, ...relativePath.split("/"));
  const relative = path.relative(absoluteRoot, absolute);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    errors.push(`${codePrefix}:path_outside_root`);
    return null;
  }
  if (!existsSync(absolute)) {
    errors.push(`${codePrefix}:file_missing`);
    return null;
  }
  const metadata = lstatSync(absolute);
  if (!metadata.isFile() || metadata.isSymbolicLink()) {
    errors.push(`${codePrefix}:not_regular_file`);
    return null;
  }
  const realRoot = realpathSync(absoluteRoot);
  const realFile = realpathSync(absolute);
  const realRelative = path.relative(realRoot, realFile);
  if (!realRelative || realRelative.startsWith("..") || path.isAbsolute(realRelative)) {
    errors.push(`${codePrefix}:realpath_outside_root`);
    return null;
  }
  return absolute;
}

function valueAtPath(value, segments) {
  let current = value;
  for (const segment of segments) {
    if (current === null || current === undefined || !Object.prototype.hasOwnProperty.call(Object(current), segment)) {
      return { found: false, value: null };
    }
    current = current[segment];
  }
  return { found: true, value: current };
}

function observationKey(segments) {
  return segments.join(".");
}

export function blueprintEvidenceExists({ projectRoot, workspaceRoot, blueprint }) {
  const selectedRoot = blueprint.rootClass === "project"
    ? projectRoot
    : blueprint.rootClass === "workspace"
      ? workspaceRoot
      : null;
  if (!selectedRoot) return false;
  return existsSync(path.resolve(selectedRoot, ...blueprint.path.split("/")));
}

export function readBlueprintEvidence({ projectRoot, workspaceRoot, blueprint }) {
  const errors = [];
  const absolute = resolveSafeFile({
    projectRoot,
    workspaceRoot,
    rootClass: blueprint.rootClass,
    relativePath: blueprint.path,
    errors,
    codePrefix: `evidence:${blueprint.id}`,
  });
  if (!absolute) throw new Error(errors.join(","));
  const bytes = readFileSync(absolute);
  let parsed = null;
  if (blueprint.kind === "json") {
    try {
      parsed = JSON.parse(bytes.toString("utf8"));
    } catch {
      throw new Error(`evidence:${blueprint.id}:json_invalid`);
    }
    if (blueprint.expectedSchemaVersion !== null && parsed?.schemaVersion !== blueprint.expectedSchemaVersion) {
      throw new Error(`evidence:${blueprint.id}:schema_mismatch`);
    }
  }
  const observations = {};
  for (const segments of blueprint.capturePaths) {
    const observed = valueAtPath(parsed, segments);
    if (!observed.found) throw new Error(`evidence:${blueprint.id}:observation_missing:${observationKey(segments)}`);
    observations[observationKey(segments)] = observed.value;
  }
  return {
    id: blueprint.id,
    rootClass: blueprint.rootClass,
    path: blueprint.path,
    kind: blueprint.kind,
    expectedSchemaVersion: blueprint.expectedSchemaVersion,
    optional: blueprint.optional === true,
    capturePaths: blueprint.capturePaths.map((segments) => [...segments]),
    byteLength: bytes.length,
    fileSha256: sha256(bytes),
    observations,
  };
}

export function readBoundWorldClassPolicy({ projectRoot, workspaceRoot }) {
  const errors = [];
  const absolute = resolveSafeFile({
    projectRoot,
    workspaceRoot,
    rootClass: "project",
    relativePath: WORLD_CLASS_POLICY_PATH,
    errors,
    codePrefix: "world_class_policy",
  });
  if (!absolute) throw new Error(errors.join(","));
  const bytes = readFileSync(absolute);
  let policy;
  try {
    policy = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new Error("world_class_policy_json_invalid");
  }
  const policyErrors = validateWorldClassPolicy(policy);
  if (policyErrors.length > 0) throw new Error(`world_class_policy_invalid:${policyErrors.join(",")}`);
  return {
    policy,
    binding: {
      path: WORLD_CLASS_POLICY_PATH,
      fileSha256: sha256(bytes),
      schemaVersion: policy.schemaVersion,
    },
  };
}

export function evaluateNormalizedReceiptCandidate({
  definition,
  evidenceFile,
  projectRoot,
  workspaceRoot,
  currentSourceTreeSha256,
  policy,
  evaluationTime,
}) {
  const base = {
    requirementId: definition.requirementId,
    evidenceFileId: definition.evidenceFileId,
    path: definition.path,
    present: isObject(evidenceFile),
    passed: false,
    fileSha256: evidenceFile?.fileSha256 ?? null,
    errors: [],
  };
  const policyErrors = validateWorldClassPolicy(policy);
  if (policyErrors.length > 0) {
    return { ...base, errors: policyErrors.map((error) => `policy:${error}`) };
  }
  if (!isObject(evidenceFile)) return { ...base, errors: ["receipt_missing"] };
  if (evidenceFile.rootClass !== "project" || evidenceFile.path !== definition.path) {
    return { ...base, errors: ["receipt_location_mismatch"] };
  }
  const readErrors = [];
  const absolute = resolveSafeFile({
    projectRoot,
    workspaceRoot,
    rootClass: evidenceFile.rootClass,
    relativePath: evidenceFile.path,
    errors: readErrors,
    codePrefix: `normalized_receipt:${definition.requirementId}`,
  });
  if (!absolute) return { ...base, errors: readErrors };
  const bytes = readFileSync(absolute);
  let value = null;
  let readError = null;
  try {
    value = JSON.parse(bytes.toString("utf8"));
  } catch {
    readError = "json_invalid";
  }
  const fileSha256 = sha256(bytes);
  const reference = { path: definition.path, fileSha256 };
  const result = evaluateWorldClassRequirementEvidence({
    id: definition.requirementId,
    entry: { receipts: [reference] },
    records: [{
      path: definition.path,
      expectedFileSha256: fileSha256,
      actualFileSha256: fileSha256,
      value,
      error: readError,
    }],
    currentSourceTreeSha256,
    policy,
    evaluationTime,
  });
  return {
    ...base,
    present: true,
    passed: result.passed,
    fileSha256,
    errors: result.errors,
  };
}

export function buildRequirementEntry(id, normalizedEvaluations) {
  const evaluation = normalizedEvaluations?.[id] ?? null;
  if (evaluation?.passed === true) {
    return {
      status: "EVIDENCE_VALIDATED",
      receipts: [{ path: evaluation.path, fileSha256: evaluation.fileSha256 }],
      candidateEvidenceFileIds: [...REQUIREMENT_CANDIDATE_MAP[id]],
      blockerCodes: [],
    };
  }
  return {
    status: "BLOCKED",
    receipts: [],
    candidateEvidenceFileIds: [...REQUIREMENT_CANDIDATE_MAP[id]],
    blockerCodes: evaluation
      ? evaluation.errors.map((error) => `normalized_receipt_invalid:${error}`)
      : [
          "normalized_world_class_pass_receipt_missing",
          "candidate_evidence_must_not_be_promoted_without_contract_validation",
        ],
  };
}

function compareCanonical(errors, actual, expected, code) {
  if (canonicalJson(actual) !== canonicalJson(expected)) errors.push(code);
}

function countNormalizedReceiptReferences(index) {
  return REQUIREMENT_IDS.reduce(
    (total, id) => total + (Array.isArray(index?.requirements?.[id]?.receipts) ? index.requirements[id].receipts.length : 0),
    0,
  );
}

export function verifyTruthBoundEvidenceIndex({
  index,
  projectRoot,
  workspaceRoot,
  projectEvidenceRoot = projectRoot,
  currentOperationalSource,
}) {
  const errors = [];
  if (!isObject(index)) {
    return {
      ok: false,
      errors: ["index_invalid"],
      evidenceFileResults: [],
      normalizedReceiptReferenceCount: 0,
      blockedRequirementCount: 0,
    };
  }
  if (index.schemaVersion !== WORLD_CLASS_EVIDENCE_INDEX_SCHEMA) errors.push("index_schema_mismatch");
  if (!isDigest(index.indexSha256)) errors.push("index_digest_invalid");
  else if (index.indexSha256 !== sha256(canonicalJson(withoutDigest(index, "indexSha256")))) errors.push("index_digest_mismatch");
  if (index.evidenceClass !== "truth_bound_candidate_evidence_index") errors.push("index_evidence_class_mismatch");
  if (index.worldClassGateEligible !== false) errors.push("index_world_class_eligibility_must_be_false");
  if (index.truthBoundary?.candidateEvidenceIsNormalizedPassEvidence !== false) errors.push("index_candidate_truth_boundary_invalid");
  if (index.truthBoundary?.crossScopeCountersComparable !== false) errors.push("index_scope_comparability_boundary_invalid");
  if (!Number.isFinite(Date.parse(index.generatedAt))) errors.push("index_generated_at_invalid");

  if (!isObject(currentOperationalSource) || !isDigest(currentOperationalSource.sha256)) {
    errors.push("current_operational_source_invalid");
  } else {
    compareCanonical(errors, index.currentOperationalSource, currentOperationalSource, "current_operational_source_mismatch");
  }

  let policy = null;
  try {
    const bound = readBoundWorldClassPolicy({ projectRoot, workspaceRoot });
    policy = bound.policy;
    compareCanonical(errors, index.policyBinding, bound.binding, "policy_binding_mismatch");
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "world_class_policy_read_failed");
  }

  const expectedIds = EVIDENCE_FILE_BLUEPRINTS
    .filter((blueprint) => !blueprint.optional || blueprintEvidenceExists({
      projectRoot: projectEvidenceRoot,
      workspaceRoot,
      blueprint,
    }))
    .map(({ id }) => id);
  const actualIds = Object.keys(isObject(index.evidenceFiles) ? index.evidenceFiles : {}).sort();
  compareCanonical(errors, actualIds, [...expectedIds].sort(), "evidence_file_id_set_mismatch");
  const evidenceFileResults = [];
  for (const blueprint of EVIDENCE_FILE_BLUEPRINTS) {
    const recorded = index.evidenceFiles?.[blueprint.id];
    const filePresent = blueprintEvidenceExists({
      projectRoot: projectEvidenceRoot,
      workspaceRoot,
      blueprint,
    });
    const result = { id: blueprint.id, present: filePresent, ok: false, errors: [] };
    if (!isObject(recorded)) {
      if (blueprint.optional && !filePresent) {
        result.ok = true;
        evidenceFileResults.push(result);
        continue;
      }
      result.errors.push("record_missing");
      errors.push(`evidence:${blueprint.id}:record_missing`);
      evidenceFileResults.push(result);
      continue;
    }
    const expectedDescriptor = {
      id: blueprint.id,
      rootClass: blueprint.rootClass,
      path: blueprint.path,
      kind: blueprint.kind,
      expectedSchemaVersion: blueprint.expectedSchemaVersion,
      optional: blueprint.optional === true,
      capturePaths: blueprint.capturePaths.map((segments) => [...segments]),
    };
    const actualDescriptor = Object.fromEntries(Object.keys(expectedDescriptor).map((key) => [key, recorded[key]]));
    if (canonicalJson(actualDescriptor) !== canonicalJson(expectedDescriptor)) result.errors.push("descriptor_mismatch");
    const pathErrors = [];
    const absolute = resolveSafeFile({
      projectRoot: projectEvidenceRoot,
      workspaceRoot,
      rootClass: recorded.rootClass,
      relativePath: recorded.path,
      errors: pathErrors,
      codePrefix: `evidence:${blueprint.id}`,
    });
    result.errors.push(...pathErrors.map((entry) => entry.split(`evidence:${blueprint.id}:`).at(-1)));
    if (absolute) {
      const bytes = readFileSync(absolute);
      if (recorded.byteLength !== bytes.length) result.errors.push("byte_length_mismatch");
      if (recorded.fileSha256 !== sha256(bytes)) result.errors.push("file_digest_mismatch");
      if (recorded.kind === "json") {
        let parsed = null;
        try {
          parsed = JSON.parse(bytes.toString("utf8"));
        } catch {
          result.errors.push("json_invalid");
        }
        if (parsed) {
          if (blueprint.expectedSchemaVersion !== null && parsed.schemaVersion !== blueprint.expectedSchemaVersion) {
            result.errors.push("schema_mismatch");
          }
          const observations = {};
          for (const segments of blueprint.capturePaths) {
            const observed = valueAtPath(parsed, segments);
            if (!observed.found) result.errors.push(`observation_missing:${observationKey(segments)}`);
            else observations[observationKey(segments)] = observed.value;
          }
          if (canonicalJson(observations) !== canonicalJson(recorded.observations)) result.errors.push("observations_mismatch");
        }
      }
    }
    result.errors = [...new Set(result.errors)];
    result.ok = result.errors.length === 0;
    errors.push(...result.errors.map((entry) => `evidence:${blueprint.id}:${entry}`));
    evidenceFileResults.push(result);
  }

  const expectedScopeIds = SCOPE_BLUEPRINTS.map(({ id }) => id);
  const actualScopeIds = Object.keys(isObject(index.scopeLedger) ? index.scopeLedger : {}).sort();
  compareCanonical(errors, actualScopeIds, [...expectedScopeIds].sort(), "scope_id_set_mismatch");
  for (const scope of SCOPE_BLUEPRINTS) {
    const recorded = index.scopeLedger?.[scope.id];
    const evidence = index.evidenceFiles?.[scope.primaryEvidenceFileId];
    if (!isObject(recorded) || !isObject(evidence)) {
      errors.push(`scope:${scope.id}:record_or_evidence_missing`);
      continue;
    }
    const fileCount = evidence.observations?.[observationKey(scope.fileCountPath)];
    const byteLength = evidence.observations?.[observationKey(scope.byteLengthPath)];
    const digest = evidence.observations?.[observationKey(scope.digestPath)];
    if (!Number.isSafeInteger(fileCount) || fileCount <= 0) errors.push(`scope:${scope.id}:file_count_invalid`);
    if (!Number.isSafeInteger(byteLength) || byteLength <= 0) errors.push(`scope:${scope.id}:byte_length_invalid`);
    if (recorded.reportedFileCount !== fileCount) errors.push(`scope:${scope.id}:recorded_file_count_mismatch`);
    if (recorded.reportedByteLength !== byteLength) errors.push(`scope:${scope.id}:recorded_byte_length_mismatch`);
    if (recorded.reportedDigest !== digest || !isDigest(recorded.reportedDigest)) errors.push(`scope:${scope.id}:recorded_digest_mismatch`);
    if (recorded.inventoryContract !== scope.inventoryContract) errors.push(`scope:${scope.id}:inventory_contract_mismatch`);
    if (recorded.primaryEvidenceFileId !== scope.primaryEvidenceFileId) errors.push(`scope:${scope.id}:evidence_id_mismatch`);
    if (recorded.comparableToOtherScopeCounters !== false) errors.push(`scope:${scope.id}:comparability_boundary_invalid`);
  }

  const normalizedReceiptEvaluations = {};
  if (policy) {
    for (const definition of NORMALIZED_RECEIPT_BLUEPRINTS) {
      normalizedReceiptEvaluations[definition.requirementId] = evaluateNormalizedReceiptCandidate({
        definition,
        evidenceFile: index.evidenceFiles?.[definition.evidenceFileId] ?? null,
        projectRoot: projectEvidenceRoot,
        workspaceRoot,
        currentSourceTreeSha256: currentOperationalSource?.sha256,
        policy,
        evaluationTime: index.generatedAt,
      });
    }
    compareCanonical(
      errors,
      index.normalizedReceiptEvaluations,
      normalizedReceiptEvaluations,
      "normalized_receipt_evaluations_mismatch",
    );
  }

  const requirementKeys = Object.keys(isObject(index.requirements) ? index.requirements : {});
  compareCanonical(errors, [...requirementKeys].sort(), [...REQUIREMENT_IDS].sort(), "requirement_id_set_mismatch");
  for (const id of REQUIREMENT_IDS) {
    const entry = index.requirements?.[id];
    if (!isObject(entry)) {
      errors.push(`requirement:${id}:entry_missing`);
      continue;
    }
    const expected = buildRequirementEntry(id, normalizedReceiptEvaluations);
    compareCanonical(errors, entry, expected, `requirement:${id}:entry_mismatch`);
  }

  const normalizedReceiptReferenceCount = countNormalizedReceiptReferences(index);
  const blockedRequirementCount = REQUIREMENT_IDS.filter((id) => index.requirements?.[id]?.status === "BLOCKED").length;
  if (index.summary?.normalizedReceiptReferenceCount !== normalizedReceiptReferenceCount) errors.push("summary_normalized_receipt_count_mismatch");
  if (index.summary?.blockedRequirementCount !== blockedRequirementCount) errors.push("summary_blocked_requirement_count_mismatch");
  if (index.summary?.requiredRequirementCount !== REQUIREMENT_IDS.length) errors.push("summary_required_requirement_count_mismatch");
  if (index.summary?.validatedRequirementCount !== REQUIREMENT_IDS.length - blockedRequirementCount) {
    errors.push("summary_validated_requirement_count_mismatch");
  }
  if (normalizedReceiptReferenceCount > NORMALIZED_RECEIPT_BLUEPRINTS.length) {
    errors.push("normalized_receipt_reference_count_above_allowlist");
  }

  return {
    ok: errors.length === 0,
    errors: [...new Set(errors)],
    evidenceFileResults,
    normalizedReceiptReferenceCount,
    blockedRequirementCount,
  };
}

export function validateEvidenceIndexVerificationReceipt(receipt) {
  if (!isObject(receipt)) throw new Error("evidence_index_verification_receipt_invalid");
  if (receipt.schemaVersion !== WORLD_CLASS_EVIDENCE_INDEX_VERIFICATION_SCHEMA) {
    throw new Error("evidence_index_verification_schema_mismatch");
  }
  if (!isDigest(receipt.receiptSha256)) throw new Error("evidence_index_verification_digest_invalid");
  if (receipt.receiptSha256 !== sha256(canonicalJson(withoutDigest(receipt, "receiptSha256")))) {
    throw new Error("evidence_index_verification_digest_mismatch");
  }
  const expectedStatus = receipt.indexIntegrityPassed === true && receipt.worldClassGateEligible === false
    ? "PASS_INDEX_INTEGRITY_WORLD_CLASS_BLOCKED"
    : "FAIL";
  if (receipt.status !== expectedStatus) throw new Error("evidence_index_verification_status_mismatch");
  return receipt;
}
