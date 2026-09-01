import fs from "node:fs";
import path from "node:path";
import { readDescriptorBoundRegularFile } from "./descriptor-bound-regular-file.mjs";
import { parseStrictJsonCli } from "./strict-json-cli.mjs";
import { validateCurrentSourceAuthorityExact } from "./current-source-authority-lib.mjs";
import { REV, MANIFEST, canonicalJson, sha256 } from "./a102r42-source-boundary.mjs";
import { MATERIALS_FILE_NAME, ROADMAP_FILE_NAME, SOURCE_FILE_NAME } from "./package-a102r42-deterministic.mjs";

export const PHASE1_SCHEMA = "velmere.pass36.a102r42.a80r1-phase1-unsealed-candidate.v1";
export const PHASE1_BLOCKED = "BLOCKED_A80R1_FROZEN_RELEASE_CANDIDATE_PREREQUISITES";
export const PHASE1_VERIFIED = "VERIFIED_A80R1_FROZEN_RELEASE_CANDIDATE_PREREQUISITES_LOCAL_ONLY";
export const EXTERNAL_SEAL_KIND = "LOCAL_SHA256_INTEGRITY_SEAL_NOT_SIGNATURE_NOT_DUAL_CONTROL";
const DIGEST = /^[a-f0-9]{64}$/u;

export const FULL_REGRESSION_STAGE_IDS = Object.freeze([
  "current-authority", "descendant", "approved-changes", "authority-harness", "historical-chain", "a42-critical",
  "route-dispatch", "route-tamper", "lazy-routes", "production-smoke-contract", "a45-browser-fixture", "product-tiers",
  "zero-budget", "rls", "external-command", "sanitized-child", "physical-evidence", "self-assertion-denial",
  "account-operation", "checkout", "paid-browser", "package-boundary", "a80", "a80r1", "a60-total-fail-closed",
  "source-audit-generated-types", "source-audit", "eslint", "typescript",
]);
export const CLEAN_UNPACK_STEP_IDS = Object.freeze([
  "a58_release_integrity_literal_first_child", "exact_dependency_install_ignore_scripts_no_a78r1_credit", "a102r42_authority",
  "a102r42_descendant", "a102r42_approved_changes", "a102r42_authority_denominator", "a102r41_a78_denominator",
  "a102r41_sparse_edge", "a102r41_rls", "a102r41_external_command_containment", "a102r41_sanitized_child",
  "a102r41_physical_evidence_boundary", "historical_sparse_checkpoint", "a80_admission", "a102r42_package_boundary",
  "a80r1_mechanism", "a102r42_frozen_local_regression",
]);
const CLEAN_NESTED_RECEIPT_FILES = Object.freeze([
  "A102R42_CURRENT_AUTHORITY_RECEIPT.json", "A102R42_DESCENDANT_RECEIPT.json",
  "A102R42_APPROVED_CHANGES_RECEIPT.json", "A102R42_FULL_REGRESSION_RECEIPT.json",
]);

export const RECEIPT_SPECS = Object.freeze([
  { id: "authority", fileName: "A102R42_CURRENT_AUTHORITY_RECEIPT.json", schema: "velmere.pass36.a102r42.physical-command-receipt-wrapper.v1", observedSchema: "velmere.pass36.a102r42.action-required-authority-verification.v1", statuses: ["PASS_A102R42_ACTION_REQUIRED_AUTHORITY_A60_TOTAL_FAIL_CLOSED_RECEIPT_AND_LOG_CLASSIFIER_BOUNDARY_EXACT_WINDOWS_NO_LIVE_CREDIT"] },
  { id: "descendant", fileName: "A102R42_DESCENDANT_RECEIPT.json", schema: "velmere.pass36.a102r42.physical-command-receipt-wrapper.v1", observedSchema: "velmere.pass36.a102r42.current-root-descendant-verification.v1", statuses: ["PASS_A102R42_CURRENT_ROOT_DESCENDANT_ACTION_REQUIRED_NO_PROMOTION"] },
  { id: "approved_changes", fileName: "A102R42_APPROVED_CHANGES_RECEIPT.json", schema: "velmere.pass36.a102r42.physical-command-receipt-wrapper.v1", observedSchema: "velmere.pass36.a102r42.approved-current-source-changes-verification.v1", statuses: ["PASS_A102R42_APPROVED_CURRENT_SOURCE_CHANGES_COMPLETE_NO_PROMOTION"] },
  { id: "a78_exact", fileName: "A102R42_EXACT_A78_RECEIPT.json", schema: "velmere.pass36.a102r42.a78-exact-runtime-dependency-browser-receipt.v1", statuses: ["VERIFIED_LOCAL_EXACT_RUNTIME_LOCKFILE_DEPENDENCY_BROWSER_BOOTSTRAP"] },
  { id: "a79_a60_exact", fileName: "A102R42_EXACT_A79_A60_RECEIPT.json", schema: "velmere.pass36.a102r42.a79-a60-exact-build-browser-receipt.v1", statuses: ["VERIFIED_LOCAL_EXACT_FINAL_BYTE_BUILD_RUNTIME_BROWSER_EVIDENCE_BOUND"] },
  { id: "full_regression", fileName: "A102R42_FULL_REGRESSION_RECEIPT.json", schema: "velmere.pass36.a102r42.frozen-local-regression-receipt.v1", statuses: ["PASS_A102R42_FROZEN_SOURCE_FULL_LOCAL_REGRESSION_NO_PROMOTION"] },
  { id: "clean_unpack", fileName: "PASS36_A102R42_CLEAN_UNPACK_RECEIPT.json", schema: "velmere.pass36.a102r42.clean-unpack-verification.v1", statuses: ["PASS_A102R42_ACTION_REQUIRED_CLEAN_UNPACK_A58_FIRST_NO_PROMOTION"] },
  { id: "dual_control", fileName: "A102R42_INDEPENDENT_DUAL_CONTROL_RECEIPT.json", schema: "velmere.pass36.a102r42.independent-dual-control-receipt.v1", statuses: ["PASS_A102R42_INDEPENDENT_DUAL_CONTROL"] },
]);

const invariant = (condition, code) => { if (!condition) throw new Error(code); };
const inside = (root, target) => {
  const relative = path.relative(root, target);
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
};

function projectedRealPath(targetPath) {
  let cursor = path.resolve(targetPath);
  const suffix = [];
  while (!fs.existsSync(cursor)) {
    const parent = path.dirname(cursor);
    invariant(parent !== cursor, "a80r1_path_ancestor_missing");
    suffix.unshift(path.basename(cursor));
    cursor = parent;
  }
  return path.resolve(fs.realpathSync(cursor), ...suffix);
}

export function assertExternalOutput(sourceRoot, outputPath) {
  const source = fs.realpathSync(path.resolve(sourceRoot));
  const output = path.resolve(outputPath);
  invariant(!inside(source, output) && !inside(source, projectedRealPath(output)), "a80r1_output_inside_source");
  invariant(!fs.existsSync(output), "a80r1_output_exists_no_overwrite");
  return output;
}

export function sourceAuthoritySnapshot(sourceRoot) {
  const root = fs.realpathSync(path.resolve(sourceRoot));
  const authority = validateCurrentSourceAuthorityExact(root, { expectedRevisionId: REV });
  invariant(authority.passed === true && authority.mismatches.length === 0, `a80r1_source_authority_failed:${JSON.stringify(authority.mismatches)}`);
  const manifestPath = path.join(root, MANIFEST);
  const raw = readDescriptorBoundRegularFile(manifestPath, { maxBytes: 8 * 1024 * 1024, errorPrefix: "a80r1_source_manifest" }).bytes;
  const manifest = parseStrictJsonCli(raw.toString("utf8"), { maxBytes: 8 * 1024 * 1024, maxDepth: 48, maxNodes: 200000, requireObject: true });
  invariant(manifest.revisionId === REV && DIGEST.test(String(manifest.manifestDigestSha256 ?? "")), "a80r1_source_manifest_identity");
  return {
    revisionId: REV,
    descendantManifestPath: MANIFEST,
    descendantManifestRawSha256: sha256(raw),
    descendantManifestDigestSha256: manifest.manifestDigestSha256,
    fileCount: authority.payload.fileCount,
    byteLength: authority.payload.byteLength,
    pathSetSha256: authority.payload.pathSetSha256,
    aggregateSha256: authority.payload.aggregateSha256,
  };
}

export function sameSourceSnapshot(left, right) {
  return canonicalJson(left) === canonicalJson(right);
}

export function readStableStrictJson(filePath, { evidenceRoot = null, maxBytes = 8 * 1024 * 1024, maxDepth = 48, maxNodes = 200000 } = {}) {
  const absolute = path.resolve(filePath);
  if (evidenceRoot) {
    const root = fs.realpathSync(path.resolve(evidenceRoot));
    invariant(inside(root, absolute) && inside(root, projectedRealPath(absolute)), "a80r1_receipt_outside_evidence_root");
  }
  const observed = readDescriptorBoundRegularFile(absolute, { maxBytes, errorPrefix: "a80r1_receipt" });
  const real = observed.realPath;
  if (evidenceRoot) invariant(inside(fs.realpathSync(path.resolve(evidenceRoot)), real), "a80r1_receipt_reparse_escape");
  const bytes = observed.bytes;
  const value = parseStrictJsonCli(bytes.toString("utf8"), { maxBytes, maxDepth, maxNodes, requireObject: true });
  return { value, binding: observed.binding };
}

function receiptMatchesSource(receipt, source) {
  return receipt?.sourceBinding?.revisionId === source.revisionId
    && receipt?.sourceBinding?.descendantManifestRawSha256 === source.descendantManifestRawSha256
    && receipt?.sourceBinding?.descendantManifestDigestSha256 === source.descendantManifestDigestSha256
    && receipt?.sourceBinding?.aggregateSha256 === source.aggregateSha256;
}

function failClosedClaims(receipt) {
  return receipt?.globalDecision === "NO_GO" && receipt?.live === false && receipt?.saleEnabled === false
    && receipt?.productionApproved === false && receipt?.worldClassProven === false;
}

export function evaluateReceipt(spec, observed, source) {
  if (!observed?.present) return { id: spec.id, passed: false, blockers: [`receipt:${spec.id}:missing_or_unreadable`], binding: observed?.binding ?? null, detail: observed?.error ?? "missing" };
  const receipt = observed.value;
  const blockers = [];
  if (receipt?.schemaVersion !== spec.schema) blockers.push(`receipt:${spec.id}:schema`);
  if (!spec.statuses.includes(receipt?.status ?? receipt?.decision)) blockers.push(`receipt:${spec.id}:status`);
  if (receipt?.revisionId !== REV) blockers.push(`receipt:${spec.id}:revision`);
  if (!receiptMatchesSource(receipt, source)) blockers.push(`receipt:${spec.id}:source_binding`);
  if (!failClosedClaims(receipt)) blockers.push(`receipt:${spec.id}:truth_boundary`);
  if (spec.observedSchema && !(receipt?.observedSchema === spec.observedSchema && receipt?.validatorContractPassed === true && receipt?.passed === true)) blockers.push(`receipt:${spec.id}:validator_contract`);
  if (spec.id === "a78_exact" && !(receipt?.verified === true && receipt?.exactNodeVersion === "24.18.0" && receipt?.exactNpmVersion === "11.16.0" && receipt?.dependencyTreeVerified === true && receipt?.lockfileIntegrityVerified === true && receipt?.browserBundleVerified === true && receipt?.sourceImmutable === true)) blockers.push("receipt:a78_exact:physical_contract");
  if (spec.id === "a79_a60_exact" && !(receipt?.verified === true && receipt?.a60ReceiptSchemaVersion === "velmere.pass36.a60.exact-final-byte-build-browser-acceptance-receipt.v3" && receipt?.requiredStages === 14 && receipt?.browserRows === 56 && receipt?.browserScenarioChecks === 57 && receipt?.screenshots === 29 && receipt?.popupTabs === 4 && receipt?.evidencePaths === 59 && receipt?.sourceImmutable === true)) blockers.push("receipt:a79_a60_exact:physical_contract");
  const regressionRowsExact = Array.isArray(receipt?.stages)
    && receipt.stages.length === FULL_REGRESSION_STAGE_IDS.length
    && new Set(receipt.stages.map((row) => row?.id)).size === FULL_REGRESSION_STAGE_IDS.length
    && canonicalJson(receipt.stages.map((row) => row?.id)) === canonicalJson(FULL_REGRESSION_STAGE_IDS)
    && receipt.stages.every((row) => row?.passed === true);
  if (spec.id === "full_regression" && !(receipt?.passed === true
    && receipt?.requiredStages === 29
    && receipt?.executedStages === 29
    && receipt?.passedStages === 29
    && Array.isArray(receipt?.failedStages)
    && receipt?.failedStages?.length === 0
    && regressionRowsExact
    && receipt?.sourceImmutable === true)) blockers.push("receipt:full_regression:denominator_or_immutability");
  const cleanRowsExact = Array.isArray(receipt?.steps)
    && receipt.steps.length === CLEAN_UNPACK_STEP_IDS.length
    && new Set(receipt.steps.map((row) => row?.id)).size === CLEAN_UNPACK_STEP_IDS.length
    && canonicalJson(receipt.steps.map((row) => row?.id)) === canonicalJson(CLEAN_UNPACK_STEP_IDS)
    && receipt.steps.every((row) => row?.passed === true);
  const cleanProvenanceExact = Array.isArray(receipt?.nestedReceiptProvenance)
    && receipt.nestedReceiptProvenance.length === CLEAN_NESTED_RECEIPT_FILES.length
    && canonicalJson(receipt.nestedReceiptProvenance.map((row) => row?.fileName)) === canonicalJson(CLEAN_NESTED_RECEIPT_FILES)
    && receipt.nestedReceiptProvenance.every((row) => typeof row?.sourceRelativePath === "string" && Number.isSafeInteger(row?.byteLength) && row.byteLength > 0 && DIGEST.test(String(row?.sha256 ?? "")));
  if (spec.id === "clean_unpack" && !(receipt?.passed === true && receipt?.requiredSteps === 17 && receipt?.executedSteps === 17 && receipt?.passedSteps === 17 && Array.isArray(receipt?.failedSteps) && receipt.failedSteps.length === 0 && cleanRowsExact && cleanProvenanceExact && receipt?.sourceImmutable === true && receipt?.a58LiteralFirstChild === true)) blockers.push("receipt:clean_unpack:a58_or_immutability");
  if (spec.id === "dual_control") {
    const signers = Array.isArray(receipt?.independentSigners) ? receipt.independentSigners : [];
    if (!(receipt?.verified === true && signers.length >= 2 && new Set(signers.map((row) => row?.keyId)).size === signers.length && signers.every((row) => row?.independent === true))) blockers.push("receipt:dual_control:two_independent_signers");
    blockers.push("receipt:dual_control:cryptographic_trust_verification_not_implemented");
  } else if (receipt?.passed !== true && receipt?.verified !== true) blockers.push(`receipt:${spec.id}:physical_pass`);
  return { id: spec.id, passed: blockers.length === 0, blockers, binding: observed.binding, detail: null };
}

export function readReceiptSet(evidenceRoot) {
  const root = fs.realpathSync(path.resolve(evidenceRoot));
  const observed = new Map();
  for (const spec of RECEIPT_SPECS) {
    const filePath = path.join(root, spec.fileName);
    try {
      const result = readStableStrictJson(filePath, { evidenceRoot: root });
      observed.set(spec.id, { present: true, ...result });
    } catch (error) {
      observed.set(spec.id, { present: false, binding: null, error: error instanceof Error ? error.message : String(error) });
    }
  }
  return observed;
}

export function buildPhase1UnsealedCandidate({ source, observedReceipts }) {
  const checks = RECEIPT_SPECS.map((spec) => evaluateReceipt(spec, observedReceipts.get(spec.id), source));
  const blockers = [...new Set([
    ...checks.flatMap((row) => row.blockers),
    "a80r1_end_to_end_physical_receipt_validators_and_independent_signature_verification_required",
  ])].sort();
  const verified = false;
  const core = {
    schemaVersion: PHASE1_SCHEMA,
    revisionId: REV,
    phase: "A80R1_PHASE1_UNSEALED",
    status: verified ? PHASE1_VERIFIED : PHASE1_BLOCKED,
    verified,
    source,
    receiptBindings: checks.map((row) => ({ id: row.id, passed: row.passed, binding: row.binding })),
    checkRows: checks,
    requiredReceipts: RECEIPT_SPECS.length,
    passedReceipts: checks.filter((row) => row.passed).length,
    blockers,
    a77r1ToA80r1Credit: verified,
    stagingApproved: false,
    globalDecision: "NO_GO",
    live: false,
    saleEnabled: false,
    productionApproved: false,
    worldClassProven: false,
  };
  return { ...core, phase1DigestSha256: sha256(canonicalJson(core)) };
}

export function verifyPhase1UnsealedCandidate(candidate) {
  const core = { ...candidate };
  delete core.phase1DigestSha256;
  const digest = sha256(canonicalJson(core));
  const truth = candidate?.globalDecision === "NO_GO" && candidate?.live === false && candidate?.saleEnabled === false
    && candidate?.productionApproved === false && candidate?.worldClassProven === false;
  const status = candidate?.verified === true ? candidate.status === PHASE1_VERIFIED && candidate.blockers.length === 0 : candidate.status === PHASE1_BLOCKED && candidate.blockers.length > 0;
  return { passed: candidate?.schemaVersion === PHASE1_SCHEMA && candidate?.revisionId === REV && candidate?.phase1DigestSha256 === digest && truth && status, expectedDigestSha256: digest };
}

export function buildExternalIntegritySeal({ phase1, sourceArchivePath, materialsArchivePath, finalVerificationPath, roadmapPath }) {
  const phase1Verification = verifyPhase1UnsealedCandidate(phase1);
  invariant(phase1Verification.passed, "a80r1_phase1_invalid");
  const sourceArchive = fileBinding(sourceArchivePath);
  const materialsArchive = fileBinding(materialsArchivePath);
  const roadmap = fileBinding(roadmapPath);
  invariant(sourceArchive.fileName === SOURCE_FILE_NAME && materialsArchive.fileName === MATERIALS_FILE_NAME && roadmap.fileName === ROADMAP_FILE_NAME, "a80r1_seal_canonical_artifact_names");
  const finalObserved = readStableStrictJson(finalVerificationPath);
  const finalVerification = finalObserved.binding;
  const finalReceipt = finalObserved.value;
  invariant(finalReceipt?.schemaVersion === "velmere.pass36.a102r42.final-packages-verification.v1" && finalReceipt?.revisionId === REV && finalReceipt?.status === "PASS_A102R42_FINAL_ACTION_REQUIRED_PACKAGES_NO_PROMOTION" && finalReceipt?.packageIntegrityPassed === true && finalReceipt?.canonicalArtifactSetPassed === true && finalReceipt?.failed === 0, "a80r1_seal_final_verification_status");
  invariant(finalReceipt?.source?.fileName === sourceArchive.fileName && finalReceipt?.source?.byteLength === sourceArchive.byteLength && finalReceipt?.source?.sha256 === sourceArchive.sha256, "a80r1_seal_final_source_binding");
  invariant(finalReceipt?.materials?.fileName === materialsArchive.fileName && finalReceipt?.materials?.byteLength === materialsArchive.byteLength && finalReceipt?.materials?.sha256 === materialsArchive.sha256 && finalReceipt?.materialsSourceBindingPassed === true, "a80r1_seal_final_materials_binding");
  invariant(finalReceipt?.roadmap?.fileName === roadmap.fileName && finalReceipt?.roadmap?.byteLength === roadmap.byteLength && finalReceipt?.roadmap?.sha256 === roadmap.sha256 && finalReceipt?.roadmap?.sourceByteIdentical === true && finalReceipt?.roadmapSourceBindingPassed === true && finalReceipt?.roadmapLineagePassed === true, "a80r1_seal_final_roadmap_binding");
  invariant(finalReceipt?.globalDecision === "NO_GO" && finalReceipt?.live === false && finalReceipt?.saleEnabled === false && finalReceipt?.productionApproved === false && finalReceipt?.worldClassProven === false, "a80r1_seal_final_truth_boundary");
  const core = {
    schemaVersion: "velmere.pass36.a102r42.a80r1-external-integrity-seal.v1",
    revisionId: REV,
    sealKind: EXTERNAL_SEAL_KIND,
    status: phase1.verified ? "SEALED_LOCAL_A80R1_CANDIDATE_NO_PROMOTION" : "SEALED_ACTION_REQUIRED_PACKAGE_NO_A80R1_PROMOTION",
    verified: phase1.verified,
    phase1: { digestSha256: phase1.phase1DigestSha256 },
    sourceArchive, materialsArchive, finalVerification, roadmap,
    independentSignatureCount: 0,
    dualControlProven: false,
    globalDecision: "NO_GO", live: false, saleEnabled: false,
    productionApproved: false, worldClassProven: false,
  };
  return { ...core, sealDigestSha256: sha256(canonicalJson(core)) };
}

export function parseControllerArguments(argv) {
  const values = new Map();
  const allowed = new Set(["--source-root", "--evidence-root", "--output"]);
  for (let index = 0; index < argv.length; index += 1) {
    const name = argv[index];
    invariant(allowed.has(name), `a80r1_argument_unknown:${name}`);
    invariant(!values.has(name), `a80r1_argument_duplicate:${name}`);
    const value = argv[++index];
    invariant(typeof value === "string" && value.length > 0 && !value.startsWith("--"), `a80r1_argument_value:${name}`);
    values.set(name, value);
  }
  for (const name of allowed) invariant(values.has(name), `a80r1_argument_required:${name}`);
  return { sourceRoot: path.resolve(values.get("--source-root")), evidenceRoot: path.resolve(values.get("--evidence-root")), output: path.resolve(values.get("--output")) };
}

export function fileBinding(filePath) {
  return readDescriptorBoundRegularFile(filePath, { errorPrefix: "a80r1_binding" }).binding;
}
