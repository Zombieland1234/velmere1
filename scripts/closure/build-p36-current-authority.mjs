#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

import { buildCurrentEvidenceAvailabilityMatrix } from "../../lib/commerce/vlm-current-evidence-availability-matrix.ts";
import {
  buildCampaign,
  validateCampaign,
} from "./build-p36-internal-final-tier-campaign.mjs";
import {
  buildRevalidation,
  validateRevalidation,
} from "./build-p36-ai-final-output-revalidation.mjs";
import {
  runP36BrowserTierRuntimeProfiles,
  verifyP36BrowserTierRuntimeProfiles,
} from "./build-p36-browser-tier-runtime-profiles.mjs";
import {
  buildP36CurrentByteBuildGates,
  validateP36CurrentByteBuildGates,
} from "./build-p36-current-byte-build-gates.mjs";
import {
  materialSnapshot,
  validateP36BoundedConvergence,
} from "./run-p36-bounded-convergence.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const ART = path.join(ROOT, "artifacts/closure/p36");
const OUTPUTS = Object.freeze({
  status: path.join(ART, "P36_STATUS.json"),
  authority: path.join(ART, "CURRENT_AUTHORITY_P36.json"),
  handoff: path.join(ART, "P36_HANDOFF_MANIFEST.json"),
  report: path.join(ART, "P36_REPORT_IN_PROGRESS.txt"),
});

const PATHS = Object.freeze({
  methodology: "docs/authority/VELMERE_METODOLOGIA_FINISHOWANIA_CANONICAL_V14_CURRENT_SOURCE_EVIDENCE_BINDING_2026-08-13.txt",
  growth: "docs/authority/VELMERE_GROWTH_INTEL_TOP_WORLD_R12_CURRENT_SOURCE_CLOSURE_2026-08-13.txt",
  sourceIdentity: "artifacts/closure/p36/source-identity.json",
  build: "artifacts/closure/p36/P36_CURRENT_BYTE_BUILD_GATES.json",
  matrix: "artifacts/closure/p36/P36_CURRENT_EVIDENCE_AVAILABILITY_MATRIX.json",
  campaign: "artifacts/closure/p36/P36_INTERNAL_FINAL_TIER_CAMPAIGN.json",
  ai: "artifacts/closure/p36/P36_AI_FINAL_OUTPUT_REVALIDATION.json",
  pdf: "artifacts/closure/p36/P36_EXACT_CUSTOMER_PDF_INTEGRATION.json",
  browserA45: "artifacts/pass35/a45/PASS35_A45_BROWSER_ACCEPTANCE.json",
  browserProfiles: "artifacts/closure/p36/P36_BROWSER_TIER_RUNTIME_PROFILES.json",
  convergence: "artifacts/closure/p36/P36_BOUNDED_CONVERGENCE.json",
});

const BUILD_RECEIPT_INPUT_KEYS = Object.freeze([
  "sourceIdentity",
  "npmCiLog",
  "npmLsReceipt",
  "trustedNativeLog",
  "typeScriptReceipt",
  "typeScriptLog",
  "eslintReceipt",
  "eslintLog",
  "webpackReceipt",
  "webpackLog",
  "webpackPostLockReceipt",
  "turbopackReceipt",
  "turbopackLog",
  "turbopackPostLockReceipt",
  "webpackPhaseLogs",
  "turbopackPhaseLogs",
]);
const BUILD_RECEIPT_RUNTIME_KEYS = Object.freeze([
  "nodeExecutable",
  "npmCli",
  "packageJson",
  "packageLock",
  "nodeVersion",
  "npmVersion",
  "typescriptVersion",
  "eslintVersion",
  "platform",
  "architecture",
]);
const BUILD_RECEIPT_SOURCE_KEYS = Object.freeze([
  "receipt",
  "fileCount",
  "payloadBytes",
  "pathSetSha256",
  "sourceAggregateSha256",
  "pass13SourceDigest",
  "deploymentSourceDigest",
]);
const BUILD_PATHS = Object.freeze({
  sourceIdentity: PATHS.sourceIdentity,
  packageJson: "package.json",
  packageLock: "package-lock.json",
  npmCiLog: "artifacts/closure/p36/build-gates/npm-ci.log",
  npmLsReceipt: "artifacts/closure/p36/build-gates/npm-ls.json",
  trustedNativeLog: "artifacts/closure/p36/build-gates/trusted-native.log",
  typeScriptReceipt: "artifacts/pass13/PASS13_PARTITIONED_TYPESCRIPT.json",
  typeScriptLog: "artifacts/closure/p36/build-gates/typecheck.log",
  eslintReceipt: "artifacts/pass13/PASS13_PARTITIONED_ESLINT.json",
  eslintLog: "artifacts/closure/p36/build-gates/lint.log",
  webpackReceipt: "artifacts/closure/p36/build-gates/webpack-receipt.json",
  webpackLog: "artifacts/closure/p36/build-gates/webpack.log",
  webpackPostLockReceipt: "artifacts/closure/p36/build-gates/webpack-post-lock.json",
  turbopackReceipt: "artifacts/closure/p36/build-gates/turbopack-receipt.json",
  turbopackLog: "artifacts/closure/p36/build-gates/turbopack.log",
  turbopackPostLockReceipt: "artifacts/closure/p36/build-gates/turbopack-post-lock.json",
});
const PDF_SOURCE_PATHS = Object.freeze({
  routeHandler: "lib/server/lazy-route-modules/account--customer-artifact.ts",
  snapshotStore: "lib/reporting/account-customer-artifact-store.ts",
  immutablePdfBlob: "lib/reporting/account-customer-artifact-pdf-blob.ts",
  exactDelivery: "lib/reporting/exact-customer-pdf-delivery.ts",
  structuralValidation: "lib/reporting/pdf-structural-validation.ts",
});

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value;
}

function sameCanonical(left, right) {
  return JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
}

function exactKeys(value, expected) {
  return value && typeof value === "object" && !Array.isArray(value)
    && sameCanonical(Object.keys(value).sort(), [...expected].sort());
}

function buildGatePathsFromReceipt(receipt) {
  return {
    sourceIdentity: receipt?.inputs?.sourceIdentity?.path,
    node: receipt?.runtime?.nodeExecutable?.path,
    npmCli: receipt?.runtime?.npmCli?.path,
    packageJson: receipt?.runtime?.packageJson?.path,
    packageLock: receipt?.runtime?.packageLock?.path,
    npmCiLog: receipt?.inputs?.npmCiLog?.path,
    npmLsReceipt: receipt?.inputs?.npmLsReceipt?.path,
    trustedNativeLog: receipt?.inputs?.trustedNativeLog?.path,
    typeScriptReceipt: receipt?.inputs?.typeScriptReceipt?.path,
    typeScriptLog: receipt?.inputs?.typeScriptLog?.path,
    eslintReceipt: receipt?.inputs?.eslintReceipt?.path,
    eslintLog: receipt?.inputs?.eslintLog?.path,
    webpackReceipt: receipt?.inputs?.webpackReceipt?.path,
    webpackLog: receipt?.inputs?.webpackLog?.path,
    webpackPostLockReceipt: receipt?.inputs?.webpackPostLockReceipt?.path,
    turbopackReceipt: receipt?.inputs?.turbopackReceipt?.path,
    turbopackLog: receipt?.inputs?.turbopackLog?.path,
    turbopackPostLockReceipt: receipt?.inputs?.turbopackPostLockReceipt?.path,
  };
}

/**
 * Re-executes the build-gate verifier on current files and physical build
 * outputs. This is intentionally stronger than trusting the receipt's booleans
 * or self-hash. It performs no writes.
 */
export function revalidateP36CurrentByteBuildGates(
  receipt,
  { root = ROOT, npmLsProbe } = {},
) {
  const errors = [];
  const check = (condition, code) => { if (!condition) errors.push(code); };
  const shallow = validateP36CurrentByteBuildGates(receipt);
  check(shallow.ok, `shallow:${shallow.errors.join("|")}`);
  check(exactKeys(receipt?.inputs, BUILD_RECEIPT_INPUT_KEYS), "input_key_set");
  check(exactKeys(receipt?.runtime, BUILD_RECEIPT_RUNTIME_KEYS), "runtime_key_set");
  check(exactKeys(receipt?.sourceIdentity, BUILD_RECEIPT_SOURCE_KEYS), "source_key_set");

  const paths = buildGatePathsFromReceipt(receipt);
  for (const [key, expectedPath] of Object.entries(BUILD_PATHS)) {
    check(paths[key] === expectedPath, `path_${key}`);
  }
  check(paths.node === process.execPath, "path_node_exact_current_runtime");
  check(
    paths.npmCli === "/tmp/velmere-exact-toolchain/node_modules/npm/bin/npm-cli.js",
    "path_npm_exact_current_runtime",
  );
  check(receipt?.sourceIdentity?.receipt?.path === PATHS.sourceIdentity, "source_receipt_path");
  check(receipt?.runtime?.packageJson?.path === BUILD_PATHS.packageJson, "runtime_package_json_path");
  check(receipt?.runtime?.packageLock?.path === BUILD_PATHS.packageLock, "runtime_package_lock_path");
  if (errors.length > 0) return { ok: false, errors, recomputed: null };

  const nowMs = Date.parse(receipt.generatedAt ?? "");
  check(Number.isSafeInteger(nowMs) && nowMs > 0, "generated_at");
  if (errors.length > 0) return { ok: false, errors, recomputed: null };
  try {
    const recomputed = buildP36CurrentByteBuildGates({
      root,
      paths,
      nowMs,
      ...(npmLsProbe ? { npmLsProbe } : {}),
    });
    check(sameCanonical(receipt, recomputed), "deep_current_recompute_mismatch");
    return { ok: errors.length === 0, errors, recomputed };
  } catch (error) {
    errors.push(`deep_current_recompute:${error instanceof Error ? error.message : String(error)}`);
    return { ok: false, errors, recomputed: null };
  }
}

export function validateP36AuthorityPdfReceipt(receipt) {
  const errors = [];
  const check = (condition, code) => { if (!condition) errors.push(code); };
  check(receipt?.schemaVersion === "velmere.p36.exact-customer-pdf-integration.v1", "schema");
  check(receipt?.status === "PASS_P36_EXACT_CUSTOMER_PDF_STORAGE_TO_DELIVERY_INTEGRATION", "status");
  check(receipt?.assertions === 55, "assertion_denominator");
  check(Number.isFinite(Date.parse(receipt?.generatedAt ?? "")), "generated_at");
  check(receipt?.pdf?.parser === "pdfinfo", "pdf_parser");
  check(receipt?.pdf?.version === "1.4", "pdf_version");
  check(receipt?.pdf?.pages === 1, "pdf_pages");
  check(Number.isSafeInteger(receipt?.pdf?.byteLength) && receipt.pdf.byteLength > 0, "pdf_bytes");
  check(/^sha256:[a-f0-9]{64}$/u.test(receipt?.pdf?.sha256 ?? ""), "pdf_sha256");
  const structural = receipt?.pdf?.deterministicStructuralValidation;
  check(
    exactKeys(structural, ["valid", "headerValid", "eofValid", "pageCount", "activeContentDetected"]),
    "structural_key_set",
  );
  check(structural?.valid === true, "structural_valid");
  check(structural?.headerValid === true, "structural_header");
  check(structural?.eofValid === true, "structural_eof");
  check(structural?.pageCount === 1, "structural_page_count");
  check(structural?.activeContentDetected === false, "structural_active_content");
  check(exactKeys(receipt?.creditBoundary, [
    "internalInMemoryIntegration",
    "routeHandlerExecuted",
    "durableDatabaseExecuted",
    "deployedHttpExecuted",
    "realCustomerExecuted",
  ]), "credit_boundary_key_set");
  check(receipt?.creditBoundary?.internalInMemoryIntegration === true, "internal_boundary");
  check(receipt?.creditBoundary?.routeHandlerExecuted === true, "route_boundary");
  check(receipt?.creditBoundary?.durableDatabaseExecuted === false, "database_boundary");
  check(receipt?.creditBoundary?.deployedHttpExecuted === false, "deployed_boundary");
  check(receipt?.creditBoundary?.realCustomerExecuted === false, "customer_boundary");
  check(exactKeys(receipt?.sourceBindings, Object.keys(PDF_SOURCE_PATHS)), "source_binding_key_set");
  for (const [key, expectedPath] of Object.entries(PDF_SOURCE_PATHS)) {
    check(receipt?.sourceBindings?.[key]?.path === expectedPath, `source_path_${key}`);
    check(Number.isSafeInteger(receipt?.sourceBindings?.[key]?.byteLength)
      && receipt.sourceBindings[key].byteLength > 0, `source_bytes_${key}`);
    check(/^[a-f0-9]{64}$/u.test(receipt?.sourceBindings?.[key]?.sha256 ?? ""), `source_sha256_${key}`);
  }
  const requiredExercises = [
    "signed_preview_cookie_route_handler",
    "http_preview_download_byte_parity",
    "http_cross_account_denial",
    "pdf_structural_validation_shared_boundary",
    "pdf_like_prefix_and_shallow_structure_rejection",
  ];
  check(requiredExercises.every((id) => receipt?.exercised?.includes(id)), "required_exercises");
  return { ok: errors.length === 0, errors };
}

function absolute(relativePath) {
  const result = path.resolve(ROOT, relativePath);
  const prefix = `${ROOT}${path.sep}`;
  if (!result.startsWith(prefix)) throw new Error(`p36_authority_path_escape:${relativePath}`);
  return result;
}

function binding(relativePath) {
  const target = absolute(relativePath);
  const stat = fs.lstatSync(target);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`p36_authority_regular_file_required:${relativePath}`);
  const bytes = fs.readFileSync(target);
  return { path: relativePath, byteLength: bytes.byteLength, sha256: sha256(bytes) };
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(absolute(relativePath), "utf8"));
}

function requireTruth(condition, code) {
  if (!condition) throw new Error(`p36_authority_truth_failure:${code}`);
}

function canonicalSha(value) {
  return sha256(JSON.stringify(canonical(value)));
}

function verifyIntegritySha256(value, code) {
  requireTruth(typeof value?.integritySha256 === "string", `${code}_integrity_missing`);
  const { integritySha256: _integritySha256, ...body } = value;
  const expected = value.integritySha256.startsWith("sha256:")
    ? value.integritySha256.slice("sha256:".length)
    : value.integritySha256;
  requireTruth(expected === canonicalSha(body), `${code}_integrity_mismatch`);
}

function verifyPayloadIntegrity(value, code) {
  requireTruth(value?.integrity?.algorithm === "sha256", `${code}_integrity_algorithm`);
  const { integrity: _integrity, ...body } = value;
  requireTruth(value.integrity.payloadSha256 === canonicalSha(body), `${code}_payload_integrity_mismatch`);
}

function recomputeSourceIdentity() {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-p36-authority-source-"));
  const output = path.join(temporaryRoot, "source-identity.json");
  try {
    const result = spawnSync("python3", ["scripts/closure/build-p36-source-identity.py", "--output", output], {
      cwd: ROOT,
      encoding: "utf8",
      maxBuffer: 8 * 1024 * 1024,
    });
    requireTruth(result.status === 0 && result.signal === null, "source_identity_recompute_failed");
    return JSON.parse(fs.readFileSync(output, "utf8"));
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

function verifyExactBinding(bindingValue, code) {
  requireTruth(bindingValue && typeof bindingValue.path === "string", `${code}_binding_missing`);
  const current = binding(bindingValue.path);
  requireTruth(bindingValue.byteLength === current.byteLength, `${code}_byte_length`);
  requireTruth(bindingValue.sha256 === current.sha256, `${code}_sha256`);
}

function recomputeBrowserProfiles() {
  const outputPath = `artifacts/closure/p36/.p36-authority-browser-recompute-${process.pid}.json`;
  const absoluteOutput = absolute(outputPath);
  try {
    return runP36BrowserTierRuntimeProfiles({ root: ROOT, outputPath });
  } finally {
    fs.rmSync(absoluteOutput, { force: true });
  }
}

function validateInputs(inputs) {
  requireTruth(inputs.source.schemaVersion === "velmere.p36.source-identity.v1", "source_schema");
  const recomputedSource = recomputeSourceIdentity();
  for (const field of ["fileCount", "payloadBytes", "pathSetSha256", "sourceAggregateSha256"]) {
    requireTruth(inputs.source[field] === recomputedSource[field], `source_current_match_${field}`);
  }
  requireTruth(inputs.build.schemaVersion === "velmere.p36.current-byte-build-gates.v1", "build_schema");
  const buildValidation = revalidateP36CurrentByteBuildGates(inputs.build, { root: ROOT });
  requireTruth(buildValidation.ok, `build_deep_current_validation:${buildValidation.errors.join("|")}`);
  requireTruth(inputs.build.sourceIdentity?.sourceAggregateSha256 === inputs.source.sourceAggregateSha256, "build_source_identity_binding");
  requireTruth(inputs.build.gates?.cleanDependencyClosure === true, "clean_dependency_gate");
  requireTruth(inputs.build.gates?.fullTypecheck === true, "typecheck_gate");
  requireTruth(inputs.build.gates?.fullLint === true, "lint_gate");
  requireTruth(inputs.build.gates?.webpackProductionBuild === true, "webpack_gate");
  requireTruth(inputs.build.gates?.turbopackProductionBuild === true, "turbopack_gate");
  requireTruth(inputs.matrix.schemaVersion === "velmere.current-evidence-availability-matrix.v2", "matrix_schema");
  verifyIntegritySha256(inputs.matrix, "matrix");
  requireTruth(inputs.matrix.denominator === 33 && inputs.matrix.profiles?.length === 33, "matrix_denominator");
  requireTruth(inputs.matrix.analysisEligibleProfileCount === 0, "matrix_analysis_false_promotion");
  requireTruth(inputs.matrix.saleEligibleProfileCount === 0, "matrix_sale_promotion");
  const recomputedMatrix = buildCurrentEvidenceAvailabilityMatrix({
    locale: inputs.matrix.locale,
    evaluatedAt: inputs.matrix.evaluatedAt,
  });
  for (const field of [
    "schemaVersion",
    "evaluatedAt",
    "locale",
    "denominator",
    "products",
    "tiersPerProduct",
    "evidenceAuthority",
    "profiles",
    "productSummaries",
    "saleEligibleProfileCount",
    "analysisEligibleProfileCount",
  ]) {
    requireTruth(
      JSON.stringify(canonical(inputs.matrix[field])) === JSON.stringify(canonical(recomputedMatrix[field])),
      `matrix_current_recompute_${field}`,
    );
  }
  requireTruth(inputs.campaign.schemaVersion === "velmere.p36.internal-final-tier-campaign.v1", "campaign_schema");
  verifyPayloadIntegrity(inputs.campaign, "campaign");
  const campaignValidation = validateCampaign(inputs.campaign, { expectedCampaign: buildCampaign() });
  requireTruth(campaignValidation.valid, `campaign_current_validation:${campaignValidation.errors.join("|")}`);
  requireTruth(inputs.campaign.completion?.profilesExplicitlyMapped === 33, "campaign_profile_denominator");
  requireTruth(inputs.campaign.completion?.sameInputProfilesCompleted === 0, "campaign_same_input_false_promotion");
  requireTruth(inputs.campaign.completion?.partialInputIdentityProfiles === 24, "campaign_partial_identity_denominator");
  requireTruth(inputs.campaign.truthBoundary?.saleEligibleProfiles === 0, "campaign_sale_promotion");
  requireTruth(inputs.ai.schemaVersion === "velmere.p36.ai-final-output-revalidation.v1", "ai_schema");
  verifyPayloadIntegrity(inputs.ai, "ai");
  const aiValidation = validateRevalidation(inputs.ai, { campaign: inputs.campaign });
  requireTruth(aiValidation.ok, `ai_current_validation:${aiValidation.errors.join("|")}`);
  requireTruth(
    JSON.stringify(canonical(inputs.ai)) === JSON.stringify(canonical(buildRevalidation())),
    "ai_current_recompute_mismatch",
  );
  requireTruth(inputs.ai.executionTruth?.rowsRebound === 5147 && inputs.ai.executionTruth?.rowDenominator === 5147, "ai_denominator");
  requireTruth(inputs.ai.executionTruth?.revalidationLiveModelCalls === 0, "ai_live_call_promotion");
  requireTruth(inputs.ai.completion?.sameInputProfilesBound === 0, "ai_same_input_false_promotion");
  verifyIntegritySha256(inputs.pdf, "pdf");
  const pdfValidation = validateP36AuthorityPdfReceipt(inputs.pdf);
  requireTruth(pdfValidation.ok, `pdf_deep_validation:${pdfValidation.errors.join("|")}`);
  for (const [id, sourceBinding] of Object.entries(inputs.pdf.sourceBindings ?? {})) {
    verifyExactBinding(sourceBinding, `pdf_source_${id}`);
  }
  requireTruth(inputs.browser.summary?.checks === 57 && inputs.browser.summary?.passed === 57 && inputs.browser.summary?.failed === 0, "browser_denominator");
  requireTruth(inputs.browserProfiles.schemaVersion === "velmere.p36.browser-tier-runtime-profiles.v1", "browser_profiles_schema");
  requireTruth(verifyP36BrowserTierRuntimeProfiles(inputs.browserProfiles), "browser_profiles_integrity");
  requireTruth(
    JSON.stringify(canonical(inputs.browserProfiles))
      === JSON.stringify(canonical(recomputeBrowserProfiles())),
    "browser_profiles_current_recompute_mismatch",
  );
  verifyExactBinding(inputs.browserProfiles.bindings?.a45BrowserReceipt, "browser_a45");
  verifyExactBinding(inputs.browserProfiles.bindings?.a45Contract, "browser_contract");
  verifyExactBinding(inputs.browserProfiles.bindings?.a45QaFixturePolicy, "browser_qa_policy");
  verifyExactBinding(inputs.browserProfiles.bindings?.currentCommercialEvidenceSource, "browser_current_evidence_source");
  verifyExactBinding(inputs.browserProfiles.bindings?.currentEligibilityMatrixSource, "browser_current_matrix_source");
  for (const screenshotBinding of inputs.browserProfiles.bindings?.screenshots?.rows ?? []) {
    verifyExactBinding(screenshotBinding, `browser_screenshot_${screenshotBinding.path}`);
  }
  requireTruth(inputs.browserProfiles.summary?.tierProfilesMappedToSharedEvidence === 3, "browser_profiles_mapped");
  requireTruth(inputs.browserProfiles.summary?.sharedSurfaceExecution === 1, "browser_shared_surface_denominator");
  requireTruth(inputs.browserProfiles.summary?.sharedBrowserRouteRows === 4, "browser_shared_route_rows");
  requireTruth(inputs.browserProfiles.summary?.distinctTierSpecificPhysicalExecutions === 0, "browser_distinct_tier_execution_promotion");
  requireTruth(inputs.browserProfiles.summary?.distinctTierSpecificPhysicalExecutionDenominator === 3, "browser_distinct_tier_execution_denominator");
  requireTruth(inputs.browserProfiles.summary?.finalTierOutputHoldoutsExecuted === 0, "browser_holdout_promotion");
  const currentMaterial = materialSnapshot();
  const convergenceValidation = validateP36BoundedConvergence(inputs.convergence, {
    expectedSourceAggregateSha256: inputs.source.sourceAggregateSha256,
    expectedMaterialInputAggregateSha256: currentMaterial.aggregateSha256,
  });
  requireTruth(
    convergenceValidation.ok,
    `convergence_deep_current_validation:${convergenceValidation.errors.join("|")}`,
  );

  const zeroChecks = [
    inputs.campaign.truthBoundary?.realCustomers,
    inputs.campaign.truthBoundary?.independentReviewers,
    inputs.campaign.truthBoundary?.providerRightsApprovedAssets,
    inputs.ai.executionTruth?.realCustomers,
    inputs.ai.executionTruth?.independentReviewers,
    inputs.ai.executionTruth?.providerRightsApprovals,
    inputs.browserProfiles.summary?.realCustomerCredit,
    inputs.browserProfiles.summary?.externalEvidenceCredit,
    inputs.browserProfiles.summary?.paidReleaseCredit,
    inputs.browserProfiles.physicalEvidence?.qaFixture?.providerCredit,
    inputs.browserProfiles.physicalEvidence?.qaFixture?.realDataCredit,
    inputs.browserProfiles.physicalEvidence?.qaFixture?.customerCredit,
    inputs.browserProfiles.physicalEvidence?.qaFixture?.paidReleaseCredit,
  ];
  requireTruth(zeroChecks.every((value) => value === 0), "external_or_paid_false_promotion");
}

function addIntegrity(value) {
  return { ...value, integritySha256: sha256(JSON.stringify(canonical(value))) };
}

export function main() {
  const inputs = {
    source: readJson(PATHS.sourceIdentity),
    build: readJson(PATHS.build),
    matrix: readJson(PATHS.matrix),
    campaign: readJson(PATHS.campaign),
    ai: readJson(PATHS.ai),
    pdf: readJson(PATHS.pdf),
    browser: readJson(PATHS.browserA45),
    browserProfiles: readJson(PATHS.browserProfiles),
    convergence: readJson(PATHS.convergence),
  };
  validateInputs(inputs);
  const evidenceBindings = Object.fromEntries(
    Object.entries(PATHS).map(([id, relativePath]) => [id, binding(relativePath)]),
  );

  const fullReleaseOpen = Object.freeze([
    "EXACT_WINDOWS_CURRENT_FINAL_BYTES_NOT_EXECUTED",
    "COMPLETE_V14_SAME_INPUT_IDENTITIES_0_OF_33",
    "FINAL_CUSTOMER_VALUE_HOLDOUTS_0_OF_33",
    "BROWSER_FINAL_TIER_OUTPUT_HOLDOUTS_0_OF_3",
    "ANGEL_RISK_IDENTICAL_CROSS_TIER_INPUT_0_OF_6",
    "FULL_RELEASE_CONVERGENCE_0_OF_3",
    "CURRENT_SOURCE_CREDENTIAL_JSON_HYGIENE_AND_ACCESSIBILITY_RECEIPTS_NOT_SEPARATELY_CLOSED",
  ]);
  const externalOpen = Object.freeze([
    "PROVIDER_COMMERCIAL_RIGHTS",
    "REAL_CURRENT_PROVIDER_DATA",
    "PROFESSIONAL_LEGAL_CLAIMS_DECISION",
    "PRODUCTION_STAGING_MERCHANT_BACKUP_RESTORE",
    "REAL_CUSTOMER_WTP_REFUND_RETENTION_REUSE",
    "INDEPENDENT_REVIEW_AND_ADJUDICATION",
    "REAL_UNSEEN_ACCURACY_AND_CALIBRATION",
    "PRODUCTION_AVAILABILITY_SLA",
    "SUPPORT_AND_INCIDENT_OPERATIONS",
  ]);
  const status = addIntegrity({
    schemaVersion: "velmere.p36.status.v1",
    revision: "P36_CURRENT_SOURCE_EVIDENCE_BINDING",
    generatedAt: "2026-08-13T19:00:00.000Z",
    state: "CURRENT_SOURCE_ONLY_IN_PROGRESS",
    releaseState: "NO_GO",
    goInternal: false,
    goPaid: false,
    live: false,
    saleEnabled: false,
    productionApproved: false,
    worldClassProven: false,
    sourceIdentity: {
      fileCount: inputs.source.fileCount,
      payloadBytes: inputs.source.payloadBytes,
      pathSetSha256: inputs.source.pathSetSha256,
      sourceAggregateSha256: inputs.source.sourceAggregateSha256,
    },
    currentByteTechnical: {
      exactNodeNpm: inputs.build.gates.exactNodeNpm,
      cleanDependencyClosure: inputs.build.gates.cleanDependencyClosure,
      fullTypecheck: inputs.build.gates.fullTypecheck,
      fullLint: inputs.build.gates.fullLint,
      webpackProductionBuild: inputs.build.gates.webpackProductionBuild,
      turbopackProductionBuild: inputs.build.gates.turbopackProductionBuild,
      browserAcceptance: true,
      browserChecks: 57,
      browserPassed: 57,
      exactWindows: false,
    },
    eligibility: {
      profiles: inputs.matrix.denominator,
      analysisEligible: inputs.matrix.analysisEligibleProfileCount,
      saleEligible: inputs.matrix.saleEligibleProfileCount,
      publicSaleFailClosed: inputs.matrix.saleEligibleProfileCount === 0,
    },
    finalOutputCampaign: {
      productsExplicitlyMapped: inputs.campaign.completion.productsExplicitlyMapped,
      profilesExplicitlyMapped: inputs.campaign.completion.profilesExplicitlyMapped,
      sameInputProductsCompleted: inputs.campaign.completion.sameInputProductsCompleted,
      sameInputProductDenominator: inputs.campaign.completion.sameInputProductsDenominator,
      sameInputProfilesCompleted: inputs.campaign.completion.sameInputProfilesCompleted,
      sameInputProfileDenominator: inputs.campaign.completion.sameInputProfilesDenominator,
      partialInputIdentityProducts: inputs.campaign.completion.partialInputIdentityProducts,
      partialInputIdentityProfiles: inputs.campaign.completion.partialInputIdentityProfiles,
      outputsPresentButNotSameInputProfiles: inputs.campaign.completion.outputsPresentButNotSameInputProfiles,
      currentOutputMissingProfiles: inputs.campaign.completion.currentOutputMissingProfiles,
      finalCustomerValueHoldoutsClosed: 0,
    },
    browser: {
      tierProfilesMappedToSharedEvidence: inputs.browserProfiles.summary.tierProfilesMappedToSharedEvidence,
      tierProfileDenominator: 3,
      sharedSurfaceExecution: inputs.browserProfiles.summary.sharedSurfaceExecution,
      sharedBrowserRouteRows: inputs.browserProfiles.summary.sharedBrowserRouteRows,
      distinctTierSpecificPhysicalExecutions: inputs.browserProfiles.summary.distinctTierSpecificPhysicalExecutions,
      distinctTierSpecificPhysicalExecutionDenominator:
        inputs.browserProfiles.summary.distinctTierSpecificPhysicalExecutionDenominator,
      finalTierOutputHoldouts: 0,
      finalTierOutputHoldoutDenominator: 3,
      routeMatrix: "57/57",
      screenshotsBound: inputs.browserProfiles.physicalEvidence.screenshots,
      qaFixtureCurrentProviderCredit: 0,
    },
    pdf: {
      documents: inputs.ai.physicalPdfEvidence.documentCount,
      pages: inputs.ai.physicalPdfEvidence.pageCount,
      failedDocuments: 0,
      routeHandlerExactPreviewDownload: true,
      durableDatabase: false,
      deployedHttp: false,
      realCustomer: false,
    },
    internalAi: {
      rowsRebound: inputs.ai.executionTruth.rowsRebound,
      rowDenominator: inputs.ai.executionTruth.rowDenominator,
      profilesBound: inputs.ai.executionTruth.profilesBound,
      newModelReviewsExecuted: inputs.ai.executionTruth.newModelReviewsExecuted,
      revalidationLiveModelCalls: inputs.ai.executionTruth.revalidationLiveModelCalls,
      allExternalCredits: 0,
    },
    convergence: {
      boundedInternalRounds: inputs.convergence.boundedInternalRoundsCompleted,
      boundedInternalRoundDenominator: inputs.convergence.boundedInternalRoundDenominator,
      fullReleaseRounds: inputs.convergence.fullReleaseConvergenceRoundsCredited,
      fullReleaseRoundDenominator: inputs.convergence.fullReleaseConvergenceRoundDenominator,
    },
    realExternal: { tracksCompleted: 0, trackDenominator: 9, completionPercent: 0 },
    openRequiredForGoInternal: fullReleaseOpen,
    externalOpenRequiredForPaid: externalOpen,
    deferredNoFeatureCredit: [
      "EVIDENCE_TIME_MACHINE",
      "WHAT_CHANGED",
      "INCIDENT_WINDOW",
      "BEFORE_AFTER",
      "RESTORATION_ETA_MODEL",
      "AVAILABILITY_SLA",
      "FULL_EVIDENCE_VAULT_UI",
      "TEAM_VAULT",
      "AUTOMATIC_DYNAMIC_PRICING",
      "PUBLIC_SHARE_LINKS",
      "PRODUCTION_RETENTION_7_90_365",
    ],
    truthBoundary: "P36 closes named current-source internal Linux technical gates and binds internal outputs. It remains NO_GO because current Windows, final customer-value holdouts and three full release convergence rounds are open. Real customers, independent review, provider rights, legal/merchant/production operations, sale, GO_PAID, LIVE and world-class credit remain zero.",
  });

  const authority = addIntegrity({
    schemaVersion: "velmere.p36.current-authority.v1",
    state: status.state,
    revision: status.revision,
    parent: {
      root: "R44P46",
      checkpoint: "P35_EVIDENCE_AVAILABILITY_ARTIFACT_PARITY",
      parentSourceAggregateSha256: "ddd765b2279d7c5f310a26cc4cba349bee38629d2f44ad5b1d323dc6df91a202",
    },
    currentCheckpoint: "P36_CURRENT_SOURCE_EVIDENCE_BINDING",
    authorityFiles: {
      methodology: evidenceBindings.methodology,
      growthIntel: evidenceBindings.growth,
    },
    source: evidenceBindings.sourceIdentity,
    status: {
      path: path.relative(ROOT, OUTPUTS.status).replaceAll(path.sep, "/"),
      sha256: sha256(`${JSON.stringify(status, null, 2)}\n`),
    },
    evidenceBindings,
    releaseDecision: {
      state: "NO_GO",
      goInternal: false,
      goPaid: false,
      saleEnabled: false,
      live: false,
      worldClassProven: false,
      openRequiredForGoInternal: fullReleaseOpen,
      externalOpenRequiredForPaid: externalOpen,
    },
    truthBoundary: status.truthBoundary,
  });

  const archiveName = "VELMERE_R44P46_METHOD_V14_P36_CURRENT_SOURCE_EVIDENCE_BINDING_SOURCE_ONLY_IN_PROGRESS.zip";
  const handoff = addIntegrity({
    schemaVersion: "velmere.p36.handoff-manifest.v1",
    state: status.state,
    requiredUserArtifacts: [
      evidenceBindings.methodology,
      evidenceBindings.growth,
      { path: archiveName, sha256: null, status: "GENERATED_AFTER_CURRENT_AUTHORITY_AND_FINAL_PACKAGE_RECEIPT" },
    ],
    currentAuthority: {
      path: path.relative(ROOT, OUTPUTS.authority).replaceAll(path.sep, "/"),
      sha256: sha256(`${JSON.stringify(authority, null, 2)}\n`),
    },
    rule: "Return exactly methodology V14, Growth Intel R12 and the newest P36 current SOURCE_ONLY; SOURCE_ONLY is the final link.",
    releaseDecision: authority.releaseDecision,
    truthBoundary: status.truthBoundary,
  });

  const report = [
    "VELMÈRE P36 — CURRENT SOURCE EVIDENCE BINDING",
    "STATE: CURRENT_SOURCE_ONLY_IN_PROGRESS / NO_GO",
    "",
    `Source: ${status.sourceIdentity.fileCount} files; ${status.sourceIdentity.sourceAggregateSha256}`,
    `Eligibility: ${status.eligibility.analysisEligible}/${status.eligibility.profiles} analysis; ${status.eligibility.saleEligible}/${status.eligibility.profiles} sale`,
    `Same-input output: ${status.finalOutputCampaign.sameInputProfilesCompleted}/${status.finalOutputCampaign.sameInputProfileDenominator}`,
    `AI deterministic rebind: ${status.internalAi.rowsRebound}/${status.internalAi.rowDenominator}; new model reviews ${status.internalAi.newModelReviewsExecuted}`,
    `Browser: ${status.browser.routeMatrix}; one shared surface / ${status.browser.sharedBrowserRouteRows} Browser rows; tier mappings ${status.browser.tierProfilesMappedToSharedEvidence}/${status.browser.tierProfileDenominator}; distinct tier-specific physical executions ${status.browser.distinctTierSpecificPhysicalExecutions}/${status.browser.distinctTierSpecificPhysicalExecutionDenominator}; final tier holdouts 0/3`,
    `PDF: ${status.pdf.documents} documents / ${status.pdf.pages} pages; route exact preview/download=${status.pdf.routeHandlerExactPreviewDownload}`,
    `Convergence: bounded ${status.convergence.boundedInternalRounds}/${status.convergence.boundedInternalRoundDenominator}; full release ${status.convergence.fullReleaseRounds}/${status.convergence.fullReleaseRoundDenominator}`,
    "",
    "GO_INTERNAL: false",
    "GO_PAID: false",
    "LIVE: false",
    "WORLD_CLASS_PROVEN: false",
    "",
    `Open internal: ${fullReleaseOpen.join(", ")}`,
    `Open external paid: ${externalOpen.join(", ")}`,
    "",
    status.truthBoundary,
    "",
  ].join("\n");

  fs.mkdirSync(ART, { recursive: true });
  fs.writeFileSync(OUTPUTS.status, `${JSON.stringify(status, null, 2)}\n`, "utf8");
  fs.writeFileSync(OUTPUTS.authority, `${JSON.stringify(authority, null, 2)}\n`, "utf8");
  fs.writeFileSync(OUTPUTS.handoff, `${JSON.stringify(handoff, null, 2)}\n`, "utf8");
  fs.writeFileSync(OUTPUTS.report, report, "utf8");
  process.stdout.write(`${JSON.stringify({
    status: "PASS_P36_CURRENT_AUTHORITY_BUILT_NO_GO",
    sourceAggregateSha256: status.sourceIdentity.sourceAggregateSha256,
    analysisEligibility: `${status.eligibility.analysisEligible}/${status.eligibility.profiles}`,
    saleEligibility: `${status.eligibility.saleEligible}/${status.eligibility.profiles}`,
    sameInputProfiles: `${status.finalOutputCampaign.sameInputProfilesCompleted}/${status.finalOutputCampaign.sameInputProfileDenominator}`,
    internalAiRebind: `${status.internalAi.rowsRebound}/${status.internalAi.rowDenominator}`,
    boundedConvergence: `${status.convergence.boundedInternalRounds}/${status.convergence.boundedInternalRoundDenominator}`,
    fullReleaseConvergence: `${status.convergence.fullReleaseRounds}/${status.convergence.fullReleaseRoundDenominator}`,
    releaseState: status.releaseState,
  })}\n`);
}

const invokedAsScript = process.argv[1]
  ? import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
  : false;
if (invokedAsScript) main();
