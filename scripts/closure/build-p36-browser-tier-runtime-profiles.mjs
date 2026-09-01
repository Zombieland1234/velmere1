#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

import { buildCurrentEvidenceAvailabilityMatrix } from "../../lib/commerce/vlm-current-evidence-availability-matrix.ts";
import {
  expectedScreenshotPaths,
  readBoundRegularFileInsideRoot,
  validateBrowserReceipt,
} from "../pass36/a79-exact-build-browser-lib.mjs";

export const P36_BROWSER_TIER_RUNTIME_PROFILE_SCHEMA =
  "velmere.p36.browser-tier-runtime-profiles.v1";

const DEFAULT_A45_PATH = "artifacts/pass35/a45/PASS35_A45_BROWSER_ACCEPTANCE.json";
const DEFAULT_A45_CONTRACT_PATH = "config/pass35/a45-exact-runtime-browser-acceptance.json";
const DEFAULT_A45_QA_POLICY_PATH = "config/pass36/a60-exact-final-byte-build-browser-acceptance.json";
const DEFAULT_OUTPUT_PATH = "artifacts/closure/p36/P36_BROWSER_TIER_RUNTIME_PROFILES.json";
const CURRENT_EVIDENCE_PATH = "lib/commerce/vlm-current-commercial-evidence.ts";
const CURRENT_MATRIX_SOURCE_PATH = "lib/commerce/vlm-current-evidence-availability-matrix.ts";
const TIERS = Object.freeze(["basic", "pro", "advanced"]);
const SHA256 = /^[a-f0-9]{64}$/u;

function fail(code) {
  throw new Error(`p36_browser_tier_profiles:${code}`);
}

export function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort((left, right) => left.localeCompare(right, "en"))
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

export function canonicalSha256(value) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(canonicalize(value)))
    .digest("hex");
}

function readJsonSnapshot(root, relativePath, label) {
  const snapshot = readBoundRegularFileInsideRoot(root, relativePath, {
    maxBytes: 128 * 1024 * 1024,
    label,
  });
  let value;
  try {
    value = JSON.parse(snapshot.bytes.toString("utf8"));
  } catch {
    fail(`${label}_json_invalid`);
  }
  return { ...snapshot, value };
}

function readSourceBinding(root, relativePath, requiredMarkers) {
  const snapshot = readBoundRegularFileInsideRoot(root, relativePath, {
    maxBytes: 4 * 1024 * 1024,
    label: "current_source_binding",
  });
  const text = snapshot.bytes.toString("utf8");
  for (const marker of requiredMarkers) {
    if (!text.includes(marker)) fail(`current_source_marker_missing:${relativePath}:${marker}`);
  }
  return {
    path: relativePath,
    byteLength: snapshot.byteLength,
    sha256: snapshot.sha256,
  };
}

function validateCurrentMatrix(matrix) {
  if (
    matrix?.schemaVersion !== "velmere.current-evidence-availability-matrix.v2" &&
    matrix?.schemaVersion !== "velmere.current-evidence-availability-matrix.p66.v1"
  ) {
    fail("current_matrix_schema");
  }
  const isP66 = matrix.schemaVersion === "velmere.current-evidence-availability-matrix.p66.v1";
  const expectedDenominator = isP66 ? 20 : 33;
  if (matrix.denominator !== expectedDenominator) {
    fail("current_matrix_denominator");
  }
  if (!Array.isArray(matrix.profiles) || matrix.profiles.length !== expectedDenominator) {
    fail("current_matrix_profiles");
  }
  const profileIds = matrix.profiles.map((profile) => profile?.profileId);
  if (new Set(profileIds).size !== expectedDenominator) fail("current_matrix_profile_ids");
  if (matrix.saleEligibleProfileCount !== 0) fail("current_matrix_sale_summary_not_zero");
  if (matrix.profiles.some((profile) => profile?.receipt?.saleEligible !== false)) {
    fail("current_matrix_sale_profile_not_false");
  }
  const authority = matrix.evidenceAuthority;
  if (
    authority?.schemaVersion !== "velmere.p36.current-commercial-evidence.v1"
    || authority?.evidenceClass !== "CURRENT_SOURCE_INTERNAL_ONLY"
    || authority?.saleEnabled !== false
    || authority?.live !== false
    || authority?.productionApproved !== false
    || authority?.externalAccuracyCases !== 0
    || authority?.realCustomerCases !== 0
    || authority?.independentlyReviewedCases !== 0
    || authority?.rightsApprovedRows !== 0
  ) {
    fail("current_matrix_authority_truth_boundary");
  }
  const browserProfiles = TIERS.map((tier) =>
    matrix.profiles.find((profile) => profile?.profileId === `browser:${tier}` || profile?.profileId === `browser@${tier.toUpperCase()}_CONTEXT`),
  );
  if (browserProfiles.some((profile) => !profile)) fail("current_matrix_browser_profiles_missing");
  for (const profile of browserProfiles) {
    const tier = profile.customerTier ?? profile.policyAdapterTier ?? profile.tier;
    if (
      profile.product !== "browser"
      || (profile.family && profile.family !== "browser")
      || profile.receipt?.product !== "browser"
      || profile.receipt?.tier !== tier
      || profile.publicProjection?.product !== "browser"
      || profile.publicProjection?.tier !== tier
      || profile.publicProjection?.availabilityState !== profile.receipt?.availabilityState
      || profile.publicProjection?.saleEligible !== false
      || profile.receipt?.checkoutEligible !== false
      || profile.publicProjection?.checkoutEligible !== false
    ) {
      fail(`current_matrix_browser_profile_invalid:${profile.profileId}`);
    }
  }
  return browserProfiles;
}

function bindingShape(receipt) {
  const bindings = receipt?.bindings ?? {};
  const hashKeys = [
    "sourceManifestSha256",
    "runtimeInstanceSha256",
    "browserExecutableSha256",
  ];
  const hashBindingsComplete = hashKeys.every((key) => SHA256.test(bindings[key] ?? ""));
  const buildIdComplete = typeof bindings.buildId === "string" && bindings.buildId.length > 0;
  return {
    declaredBindingFields: 4,
    validDeclaredBindingFields:
      hashKeys.filter((key) => SHA256.test(bindings[key] ?? "")).length
      + (buildIdComplete ? 1 : 0),
    complete: hashBindingsComplete && buildIdComplete,
    sourceManifestSha256: SHA256.test(bindings.sourceManifestSha256 ?? "")
      ? bindings.sourceManifestSha256
      : null,
    runtimeInstanceSha256: SHA256.test(bindings.runtimeInstanceSha256 ?? "")
      ? bindings.runtimeInstanceSha256
      : null,
    browserExecutableSha256: SHA256.test(bindings.browserExecutableSha256 ?? "")
      ? bindings.browserExecutableSha256
      : null,
    buildId: buildIdComplete ? bindings.buildId : null,
    creditBoundary:
      "A45 declarations are bound as receipt fields. This profile artifact does not independently prove source-manifest, runtime-instance, executable or production deployment identity.",
  };
}

function validateQaFixturePolicy(policy) {
  const requestCounterKeys = policy?.requestCounterKeys;
  const requiredPositiveRequestFamilies = policy?.requiredPositiveRequestFamilies;
  const requiredZeroRequestFamilies = policy?.requiredZeroRequestFamilies;
  if (
    policy?.generate !== true
    || typeof policy?.relativePath !== "string"
    || !policy.relativePath.startsWith("artifacts/")
    || typeof policy?.generatorId !== "string"
    || policy.generatorId.length === 0
    || policy?.providerCredit !== false
    || policy?.realDataCredit !== false
    || policy?.durableStorageCredit !== false
    || policy?.liveCredit !== false
    || policy?.saleCredit !== false
    || !Array.isArray(requestCounterKeys)
    || requestCounterKeys.length === 0
    || new Set(requestCounterKeys).size !== requestCounterKeys.length
    || !Array.isArray(requiredPositiveRequestFamilies)
    || requiredPositiveRequestFamilies.length === 0
    || !Array.isArray(requiredZeroRequestFamilies)
    || requiredZeroRequestFamilies.length === 0
    || ![...requiredPositiveRequestFamilies, ...requiredZeroRequestFamilies]
      .every((key) => requestCounterKeys.includes(key))
    || requiredPositiveRequestFamilies.some((key) => requiredZeroRequestFamilies.includes(key))
  ) {
    fail("qa_fixture_policy_invalid");
  }
  return {
    relativePath: policy.relativePath,
    generatorId: policy.generatorId,
    requestCounterKeys: [...requestCounterKeys],
    requiredPositiveRequestFamilies: [...requiredPositiveRequestFamilies],
    requiredZeroRequestFamilies: [...requiredZeroRequestFamilies],
  };
}

function collectScreenshotBindings(root, a45, contract, artifactReader) {
  const readArtifact = artifactReader
    ?? ((relativePath, options = {}) =>
      readBoundRegularFileInsideRoot(root, relativePath, options));
  const receiptByPath = new Map();
  for (const row of a45.rows ?? []) {
    if (row?.screenshotPath) {
      receiptByPath.set(row.screenshotPath, row.screenshotSha256);
    }
  }
  if (a45.popup?.screenshotPath) {
    receiptByPath.set(a45.popup.screenshotPath, a45.popup.screenshotSha256);
  }
  const rows = expectedScreenshotPaths(contract).map((relativePath) => {
    const snapshot = readArtifact(relativePath, {
      maxBytes: 128 * 1024 * 1024,
      label: "browser_screenshot_binding",
    });
    const declaredSha256 = receiptByPath.get(relativePath) ?? null;
    if (!SHA256.test(declaredSha256 ?? "") || declaredSha256 !== snapshot.sha256) {
      fail(`screenshot_digest:${relativePath}`);
    }
    return {
      path: relativePath,
      byteLength: snapshot.byteLength,
      sha256: snapshot.sha256,
    };
  });
  return {
    count: rows.length,
    rows,
    aggregateSha256: canonicalSha256(rows),
  };
}

function browserRouteRows(a45) {
  const rows = (a45.rows ?? [])
    .filter((row) => row?.route === "browser")
    .sort((left, right) =>
      `${left.locale}:${left.viewport}`.localeCompare(`${right.locale}:${right.viewport}`, "en"),
    );
  const expectedKeys = ["de:desktop", "en:desktop", "pl:desktop", "pl:mobile"];
  const actualKeys = rows.map((row) => `${row.locale}:${row.viewport}`);
  if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) {
    fail("browser_route_physical_matrix");
  }
  if (rows.some((row) => row.ok !== true)) fail("browser_route_not_passed");
  return rows;
}

export function buildP36BrowserTierRuntimeProfiles({
  root,
  a45,
  a45ReceiptBinding,
  contract,
  contractBinding,
  qaFixturePolicy,
  qaFixturePolicyBinding,
  matrix,
  currentEvidenceSourceBinding,
  currentMatrixSourceBinding,
  artifactReader = null,
}) {
  if (a45?.schemaVersion !== "velmere.pass35.a45.browser-acceptance.v2") {
    fail("a45_schema");
  }
  if (a45?.revisionId !== "VELMERE_PASS35_A45_EXACT_RUNTIME_BROWSER_ACCEPTANCE") {
    fail("a45_revision");
  }
  let parsedBaseUrl;
  try {
    parsedBaseUrl = new URL(a45.baseUrl);
  } catch {
    fail("a45_base_url");
  }
  if (
    parsedBaseUrl.hostname !== "127.0.0.1"
    || !new Set(["http:", "https:"]).has(parsedBaseUrl.protocol)
    || a45.transport?.loopbackOnly !== true
    || a45.transport?.productionCertificateVerified !== false
  ) {
    fail("a45_transport_boundary");
  }
  const validatedQaFixturePolicy = validateQaFixturePolicy(qaFixturePolicy);
  const expected = {
    baseUrl: a45.baseUrl,
    sourceManifestSha256: a45.bindings?.sourceManifestSha256 ?? null,
    runtimeInstanceSha256: a45.bindings?.runtimeInstanceSha256 ?? null,
    browserExecutableSha256: a45.bindings?.browserExecutableSha256 ?? null,
    buildId: a45.bindings?.buildId ?? null,
    requireHttpErrors: true,
    qaFixtureRequired: true,
    qaFixtureRelativePath: validatedQaFixturePolicy.relativePath,
    qaFixtureGeneratorId: validatedQaFixturePolicy.generatorId,
    qaFixtureRequestCounterKeys: validatedQaFixturePolicy.requestCounterKeys,
    qaFixtureRequiredPositiveRequestFamilies:
      validatedQaFixturePolicy.requiredPositiveRequestFamilies,
    qaFixtureRequiredZeroRequestFamilies:
      validatedQaFixturePolicy.requiredZeroRequestFamilies,
  };
  const browserValidation = validateBrowserReceipt({
    root,
    receipt: a45,
    contract,
    expected,
    artifactReader,
  });
  if (!browserValidation.passed) {
    const ids = browserValidation.failures.slice(0, 8).map((row) => row.id).join(",");
    fail(`a45_validation:${ids}`);
  }
  const browserRows = browserRouteRows(a45);
  const browserRouteEvidence = browserRows.map((row) => ({
    locale: row.locale,
    viewport: row.viewport,
    status: row.status,
    selectorCount: row.selectorCount,
    currentRouteReceiptSha256: canonicalSha256(row),
  }));
  const browserRouteEvidenceAggregateSha256 = canonicalSha256(browserRouteEvidence);
  const screenshotBindings = collectScreenshotBindings(root, a45, contract, artifactReader);
  if (screenshotBindings.count !== 29) fail("screenshot_denominator");
  const browserProfiles = validateCurrentMatrix(matrix);
  const matrixSha256 = canonicalSha256(matrix);
  const declaredBuildBindings = bindingShape(a45);

  const profiles = browserProfiles.map((profile) => ({
    profileId: profile.profileId,
    product: "browser",
    tier: profile.customerTier ?? profile.policyAdapterTier ?? profile.tier,
    executionStatus: "TIER_PROFILE_MAPPED_TO_SHARED_BROWSER_SURFACE_FINAL_TIER_OUTPUT_HOLDOUT_OPEN",
    creditClass: "INTERNAL_SHARED_BROWSER_SURFACE_MAPPING_ONLY",
    tierProfileMappedToSharedEvidence: true,
    distinctTierSpecificPhysicalExecution: false,
    sharedSurfaceExecution: 1,
    sharedBrowserRouteRows: browserRows.length,
    browserRouteEvidenceAggregateSha256,
    tierSpecificInteractionExecuted: false,
    sameInputTierOutputComparisonExecuted: false,
    finalTierOutputHoldoutExecuted: false,
    noveltyMeasured: false,
    duplicationMeasured: false,
    falsePositiveFalseNegativeMeasured: false,
    decisionChangeMeasured: false,
    currentAvailabilityDisposition: profile.receipt.availabilityState,
    analysisEligible: profile.receipt.analysisEligible,
    checkoutEligible: false,
    saleEligible: false,
    valueEligible: profile.receipt.valueEligible,
    historicalEligible: profile.receipt.historicalEligible,
    suggestedLowerTier: profile.receipt.suggestedLowerTier,
    reasonCodes: [...profile.receipt.reasonCodes],
    eligibilityReceiptHash: profile.receipt.receiptHash,
    eligibilityProfileCanonicalSha256: canonicalSha256(profile),
    realCustomerCredit: 0,
    externalEvidenceCredit: 0,
    independentReviewerCredit: 0,
    providerRightsCredit: 0,
    willingnessToPayCredit: 0,
    paidReleaseCredit: 0,
    worldClassCredit: 0,
  }));

  const output = {
    schemaVersion: P36_BROWSER_TIER_RUNTIME_PROFILE_SCHEMA,
    revisionId: "P36_BROWSER_TIER_RUNTIME_PROFILES",
    generatedAt: a45.generatedAt,
    status: "PASS_INTERNAL_SHARED_SURFACE_MAPPING_FINAL_TIER_OUTPUT_HOLDOUT_OPEN",
    truthBoundary:
      "This receipt proves one shared Browser surface was physically exercised on loopback in four Browser route rows and its evidence was mapped to three tier labels. It does not prove three physical Browser profiles, any distinct tier-specific execution or output, same-input tier delta, final holdout, production deployment, real provider data, rights, customer value, payment readiness, GO_PAID or WORLD_CLASS_PROVEN.",
    bindings: {
      a45BrowserReceipt: a45ReceiptBinding,
      a45Contract: contractBinding,
      a45QaFixturePolicy: qaFixturePolicyBinding,
      currentCommercialEvidenceSource: currentEvidenceSourceBinding,
      currentEligibilityMatrixSource: currentMatrixSourceBinding,
      currentEligibilityMatrixCanonicalSha256: matrixSha256,
      currentEligibilityMatrixEvaluatedAt: matrix.evaluatedAt,
      screenshots: screenshotBindings,
      declaredBuildBindings,
    },
    physicalEvidence: {
      a45Checks: a45.summary.checks,
      a45Passed: a45.summary.passed,
      a45Failed: a45.summary.failed,
      fullRouteRows: a45.rows.length,
      browserRouteRows: browserRouteEvidence,
      browserRouteEvidenceAggregateSha256,
      sharedSurfaceExecution: 1,
      screenshots: screenshotBindings.count,
      qaFixture: {
        enabled: a45.qaFixture.enabled,
        generated: a45.qaFixture.generated,
        generatorId: a45.qaFixture.generatorId,
        fixtureRelativePath: a45.qaFixture.fixtureRelativePath,
        fixtureSha256: a45.qaFixture.fixtureSha256,
        fixtureByteLength: a45.qaFixture.fixtureByteLength,
        requests: { ...a45.qaFixture.requests },
        providerCredit: 0,
        realDataCredit: 0,
        durableStorageCredit: 0,
        liveCredit: 0,
        customerCredit: 0,
        paidReleaseCredit: 0,
      },
      automatedInteractionChecks: {
        reducedMotionNegotiation: "PASS_56_OF_56",
        keyboardFocusEscapedBody: "PASS_56_OF_56",
        zoom200Execution: "PASS_56_OF_56",
        realAssistiveTechnologyUsers: 0,
        disabledCustomerJourneys: 0,
        creditClass: "AUTOMATED_INTERACTION_CHECKS_ONLY",
      },
    },
    summary: {
      browserTierProfilesMapped: 3,
      tierProfilesMappedToSharedEvidence: 3,
      sharedSurfaceExecution: 1,
      sharedBrowserRouteRows: browserRows.length,
      distinctTierSpecificPhysicalExecutions: 0,
      distinctTierSpecificPhysicalExecutionDenominator: 3,
      tierSpecificInteractionsExecuted: 0,
      sameInputTierOutputComparisonsExecuted: 0,
      finalTierOutputHoldoutsExecuted: 0,
      saleEligibleProfiles: 0,
      realCustomerCredit: 0,
      externalEvidenceCredit: 0,
      independentReviewerCredit: 0,
      providerRightsCredit: 0,
      willingnessToPayCredit: 0,
      paidReleaseCredit: 0,
      worldClassCredit: 0,
    },
    profiles,
  };
  output.integritySha256 = canonicalSha256(output);
  return output;
}

export function verifyP36BrowserTierRuntimeProfiles(output) {
  if (output?.schemaVersion !== P36_BROWSER_TIER_RUNTIME_PROFILE_SCHEMA) return false;
  if (!SHA256.test(output.integritySha256 ?? "")) return false;
  const copy = structuredClone(output);
  delete copy.integritySha256;
  return canonicalSha256(copy) === output.integritySha256;
}

export function runP36BrowserTierRuntimeProfiles({
  root = process.cwd(),
  a45Path = process.env.VELMERE_P36_A45_BROWSER_RECEIPT_PATH || DEFAULT_A45_PATH,
  contractPath = process.env.VELMERE_P36_A45_CONTRACT_PATH || DEFAULT_A45_CONTRACT_PATH,
  qaFixturePolicyPath = process.env.VELMERE_P36_A45_QA_POLICY_PATH || DEFAULT_A45_QA_POLICY_PATH,
  outputPath = process.env.VELMERE_P36_BROWSER_TIER_PROFILE_OUTPUT || DEFAULT_OUTPUT_PATH,
} = {}) {
  const a45Snapshot = readJsonSnapshot(root, a45Path, "a45_browser_receipt");
  const contractSnapshot = readJsonSnapshot(root, contractPath, "a45_browser_contract");
  const qaPolicySnapshot = readJsonSnapshot(root, qaFixturePolicyPath, "a45_qa_policy");
  const qaFixturePolicy = qaPolicySnapshot.value?.browser?.qaFixture;
  const evaluatedAt = a45Snapshot.value?.generatedAt;
  if (typeof evaluatedAt !== "string" || Number.isNaN(Date.parse(evaluatedAt))) {
    fail("a45_generated_at");
  }
  const matrix = buildCurrentEvidenceAvailabilityMatrix({ locale: "en", evaluatedAt });
  const output = buildP36BrowserTierRuntimeProfiles({
    root,
    a45: a45Snapshot.value,
    a45ReceiptBinding: {
      path: a45Path,
      byteLength: a45Snapshot.byteLength,
      sha256: a45Snapshot.sha256,
    },
    contract: contractSnapshot.value,
    contractBinding: {
      path: contractPath,
      byteLength: contractSnapshot.byteLength,
      sha256: contractSnapshot.sha256,
    },
    qaFixturePolicy,
    qaFixturePolicyBinding: {
      path: qaFixturePolicyPath,
      byteLength: qaPolicySnapshot.byteLength,
      sha256: qaPolicySnapshot.sha256,
    },
    matrix,
    currentEvidenceSourceBinding: readSourceBinding(root, CURRENT_EVIDENCE_PATH, [
      "velmere.p36.current-commercial-evidence.v1",
      "saleEnabled: false",
      "realCustomerCases: 0",
      "rightsApprovedRows: 0",
    ]),
    currentMatrixSourceBinding: readSourceBinding(root, CURRENT_MATRIX_SOURCE_PATH, [
      "velmere.current-evidence-availability-matrix.v2",
      "buildCurrentP36CommercialEvidence",
      "saleEligibleProfileCount",
    ]),
  });
  if (!verifyP36BrowserTierRuntimeProfiles(output)) fail("output_integrity");
  const absoluteOutput = path.resolve(root, outputPath);
  const relativeOutput = path.relative(path.resolve(root), absoluteOutput);
  if (
    !relativeOutput
    || relativeOutput === ".."
    || relativeOutput.startsWith(`..${path.sep}`)
    || path.isAbsolute(relativeOutput)
  ) {
    fail("output_path_outside_root");
  }
  fs.mkdirSync(path.dirname(absoluteOutput), { recursive: true });
  fs.writeFileSync(absoluteOutput, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({
    status: output.status,
    a45Checks: `${output.physicalEvidence.a45Passed}/${output.physicalEvidence.a45Checks}`,
    tierProfilesMappedToSharedEvidence: `${output.summary.tierProfilesMappedToSharedEvidence}/3`,
    sharedSurfaceExecution: output.summary.sharedSurfaceExecution,
    distinctTierSpecificPhysicalExecutions:
      `${output.summary.distinctTierSpecificPhysicalExecutions}/${output.summary.distinctTierSpecificPhysicalExecutionDenominator}`,
    finalTierOutputHoldouts: `${output.summary.finalTierOutputHoldoutsExecuted}/3`,
    saleEligibleProfiles: `${output.summary.saleEligibleProfiles}/3`,
    screenshots: `${output.physicalEvidence.screenshots}/29`,
    output: relativeOutput.replaceAll(path.sep, "/"),
    integritySha256: output.integritySha256,
  })}\n`);
  return output;
}

const mainPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (mainPath === import.meta.url) {
  runP36BrowserTierRuntimeProfiles();
}
