import assert from "node:assert/strict";
import crypto from "node:crypto";

import {
  P36_BOUNDED_CONVERGENCE_TEST_IDS,
  validateP36BoundedConvergence,
} from "../../scripts/closure/run-p36-bounded-convergence.mjs";
import {
  revalidateP36CurrentByteBuildGates,
  validateP36AuthorityPdfReceipt,
} from "../../scripts/closure/build-p36-current-authority.mjs";

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

function clone(value) {
  return structuredClone(value);
}

function sign(value) {
  const { integritySha256: _integritySha256, ...body } = value;
  value.integritySha256 = sha256(JSON.stringify(canonical(body)));
  return value;
}

const sourceAggregateSha256 = "1".repeat(64);
const materialInputAggregateSha256 = "2".repeat(64);
const snapshot = {
  source: {
    fileCount: 5000,
    byteLength: 100_000_000,
    pathSetSha256: "3".repeat(64),
    aggregateSha256: sourceAggregateSha256,
  },
  material: {
    fileCount: 900,
    byteLength: 50_000_000,
    aggregateSha256: materialInputAggregateSha256,
  },
  aggregateSha256: sha256(`${sourceAggregateSha256}\0${materialInputAggregateSha256}`),
};
const rounds = [1, 2, 3].map((round) => ({
  round,
  inputBefore: clone(snapshot),
  tests: P36_BOUNDED_CONVERGENCE_TEST_IDS.map((id) => ({
    id,
    command: [process.execPath, `tests/${id}.test.mjs`],
    exitCode: 0,
    signal: null,
    stdout: { sha256: "4".repeat(64), byteLength: 4, finalLine: "PASS" },
    stderr: { sha256: sha256(""), byteLength: 0, finalLine: null },
    inputBefore: clone(snapshot),
    inputAfter: clone(snapshot),
    inputImmutable: true,
    pass: true,
  })),
  inputAfter: clone(snapshot),
  sourceAndMaterialInputsImmutable: true,
  pass: true,
}));
const convergence = sign({
  schemaVersion: "velmere.p36.bounded-frozen-source-convergence.v1",
  generatedAt: "2026-08-13T18:00:00.000Z",
  state: "PASS_BOUNDED_INTERNAL_FROZEN_SOURCE",
  runtime: { node: "v24.18.0", executableSha256: "5".repeat(64) },
  testDenominatorPerRound: 11,
  boundedInternalRoundsCompleted: 3,
  boundedInternalRoundDenominator: 3,
  fullReleaseConvergenceRoundsCredited: 0,
  fullReleaseConvergenceRoundDenominator: 3,
  sourceAggregateSha256,
  materialInputAggregateSha256,
  rounds,
  creditBoundary: {
    currentFrozenSourceAndMaterialInputsInternalRegression: true,
    fullLintPerRound: false,
    dualProductionBuildPerRound: false,
    browserAcceptancePerRound: false,
    externalEvidencePerRound: false,
    realCustomerPerRound: false,
    independentReviewPerRound: false,
    goInternalCredit: false,
    goPaidCredit: false,
    liveCredit: false,
  },
  truthBoundary: "bounded internal only",
});
const convergenceOptions = { expectedSourceAggregateSha256: sourceAggregateSha256, expectedMaterialInputAggregateSha256: materialInputAggregateSha256 };
assert.equal(validateP36BoundedConvergence(convergence, convergenceOptions).ok, true);

const convergenceMutations = [
  ["schema", (value) => { value.schemaVersion = "forged"; }],
  ["integrity", (value) => { value.integritySha256 = "0".repeat(64); }, false],
  ["test denominator", (value) => { value.testDenominatorPerRound = 10; }],
  ["round count", (value) => { value.rounds.pop(); }],
  ["round identity", (value) => { value.rounds[1].round = 1; }],
  ["test ID order", (value) => { [value.rounds[0].tests[0], value.rounds[0].tests[1]] = [value.rounds[0].tests[1], value.rounds[0].tests[0]]; }],
  ["test exit", (value) => { value.rounds[0].tests[0].exitCode = 1; }],
  ["test signal", (value) => { value.rounds[0].tests[0].signal = "SIGTERM"; }],
  ["test pass", (value) => { value.rounds[0].tests[0].pass = false; }],
  ["test immutability", (value) => { value.rounds[0].tests[0].inputImmutable = false; }],
  ["test source before", (value) => { value.rounds[0].tests[0].inputBefore.source.aggregateSha256 = "6".repeat(64); }],
  ["test material after", (value) => { value.rounds[0].tests[0].inputAfter.material.aggregateSha256 = "7".repeat(64); }],
  ["round after", (value) => { value.rounds[2].inputAfter.source.fileCount += 1; }],
  ["bounded count", (value) => { value.boundedInternalRoundsCompleted = 2; }],
  ["full release promotion", (value) => { value.fullReleaseConvergenceRoundsCredited = 3; }],
  ["GO_INTERNAL promotion", (value) => { value.creditBoundary.goInternalCredit = true; }],
  ["browser promotion", (value) => { value.creditBoundary.browserAcceptancePerRound = true; }],
  ["extra credit key", (value) => { value.creditBoundary.forged = false; }],
];
for (const [label, mutate, resign = true] of convergenceMutations) {
  const mutated = clone(convergence);
  mutate(mutated);
  if (resign) sign(mutated);
  assert.equal(validateP36BoundedConvergence(mutated, convergenceOptions).ok, false, label);
}

const pdfSourcePaths = {
  routeHandler: "lib/server/lazy-route-modules/account--customer-artifact.ts",
  snapshotStore: "lib/reporting/account-customer-artifact-store.ts",
  immutablePdfBlob: "lib/reporting/account-customer-artifact-pdf-blob.ts",
  exactDelivery: "lib/reporting/exact-customer-pdf-delivery.ts",
  structuralValidation: "lib/reporting/pdf-structural-validation.ts",
};
const pdf = {
  schemaVersion: "velmere.p36.exact-customer-pdf-integration.v1",
  generatedAt: "2026-08-13T15:00:00.000Z",
  status: "PASS_P36_EXACT_CUSTOMER_PDF_STORAGE_TO_DELIVERY_INTEGRATION",
  assertions: 55,
  pdf: {
    parser: "pdfinfo",
    version: "1.4",
    pages: 1,
    byteLength: 1784,
    sha256: `sha256:${"8".repeat(64)}`,
    deterministicStructuralValidation: {
      valid: true,
      headerValid: true,
      eofValid: true,
      pageCount: 1,
      activeContentDetected: false,
    },
  },
  exercised: [
    "signed_preview_cookie_route_handler",
    "http_preview_download_byte_parity",
    "http_cross_account_denial",
    "pdf_structural_validation_shared_boundary",
    "pdf_like_prefix_and_shallow_structure_rejection",
  ],
  creditBoundary: {
    internalInMemoryIntegration: true,
    routeHandlerExecuted: true,
    durableDatabaseExecuted: false,
    deployedHttpExecuted: false,
    realCustomerExecuted: false,
  },
  sourceBindings: Object.fromEntries(Object.entries(pdfSourcePaths).map(([key, filePath]) => [key, {
    path: filePath,
    byteLength: 100,
    sha256: "9".repeat(64),
  }])),
};
assert.equal(validateP36AuthorityPdfReceipt(pdf).ok, true);
const pdfMutations = [
  ["assertions", (value) => { value.assertions = 54; }],
  ["structural valid", (value) => { value.pdf.deterministicStructuralValidation.valid = false; }],
  ["active content", (value) => { value.pdf.deterministicStructuralValidation.activeContentDetected = true; }],
  ["structural extra", (value) => { value.pdf.deterministicStructuralValidation.forged = true; }],
  ["internal boundary", (value) => { value.creditBoundary.internalInMemoryIntegration = false; }],
  ["route boundary", (value) => { value.creditBoundary.routeHandlerExecuted = false; }],
  ["database promotion", (value) => { value.creditBoundary.durableDatabaseExecuted = true; }],
  ["deployed promotion", (value) => { value.creditBoundary.deployedHttpExecuted = true; }],
  ["customer promotion", (value) => { value.creditBoundary.realCustomerExecuted = true; }],
  ["source path", (value) => { value.sourceBindings.routeHandler.path = "forged.ts"; }],
  ["source extra", (value) => { value.sourceBindings.forged = value.sourceBindings.routeHandler; }],
  ["required exercise", (value) => { value.exercised.pop(); }],
];
for (const [label, mutate] of pdfMutations) {
  const mutated = clone(pdf);
  mutate(mutated);
  assert.equal(validateP36AuthorityPdfReceipt(mutated).ok, false, label);
}

const fakeBinding = (filePath) => ({
  path: filePath,
  pathKind: "ROOT_RELATIVE",
  realPath: filePath,
  byteLength: 1,
  sha256: "a".repeat(64),
  modifiedAt: "2026-08-13T18:00:00.000Z",
});
const buildInputPaths = {
  sourceIdentity: "artifacts/closure/p36/source-identity.json",
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
};
const build = {
  schemaVersion: "velmere.p36.current-byte-build-gates.v1",
  generatedAt: "2026-08-13T18:00:00.000Z",
  sourceIdentity: {
    receipt: fakeBinding(buildInputPaths.sourceIdentity),
    fileCount: 1,
    payloadBytes: 1,
    pathSetSha256: "b".repeat(64),
    sourceAggregateSha256: "c".repeat(64),
    pass13SourceDigest: { sha256: "d".repeat(64), fileCount: 1, totalBytes: 1 },
    deploymentSourceDigest: { sha256: "e".repeat(64), fileCount: 1, totalBytes: 1 },
  },
  runtime: {
    nodeExecutable: fakeBinding(process.execPath),
    npmCli: fakeBinding("/tmp/velmere-exact-toolchain/node_modules/npm/bin/npm-cli.js"),
    packageJson: fakeBinding("package.json"),
    packageLock: fakeBinding("package-lock.json"),
    nodeVersion: "v24.18.0",
    npmVersion: "11.16.0",
    typescriptVersion: "5.9.3",
    eslintVersion: "10.8.0",
    platform: process.platform,
    architecture: process.arch,
  },
  inputs: {
    ...Object.fromEntries(Object.entries(buildInputPaths).map(([key, filePath]) => [key, fakeBinding(filePath)])),
    webpackPhaseLogs: {},
    turbopackPhaseLogs: {},
  },
  denominators: {
    dependencyTree: { problems: 0 },
    typeScript: { diagnostics: 0 },
    eslint: { errors: 0, warnings: 0, processFailures: 0 },
    webpack: { buildId: "webpack-id" },
    turbopack: { buildId: "turbopack-id" },
  },
  buildOutputs: {
    webpack: { buildId: "webpack-id" },
    turbopack: { buildId: "turbopack-id" },
  },
  gates: {
    exactNodeNpm: true,
    cleanDependencyClosure: true,
    fullTypecheck: true,
    fullLint: true,
    webpackProductionBuild: true,
    turbopackProductionBuild: true,
    exactWindows: false,
  },
  summary: { pass: true, passedRequiredGates: 6, requiredGateDenominator: 6 },
  creditBoundary: {
    currentLinuxExactRuntimeInternal: true,
    exactWindows: false,
    staging: false,
    externalEvidence: false,
    providerRights: false,
    realCustomers: false,
    independentReview: false,
    paidRelease: false,
    live: false,
    worldClass: false,
  },
};
sign(build);
const deepBuild = revalidateP36CurrentByteBuildGates(build, { root: process.cwd() });
assert.equal(deepBuild.ok, false);
assert.equal(deepBuild.errors.some((error) => error.startsWith("deep_current_recompute:")), true);
const forgedBuildPath = clone(build);
forgedBuildPath.inputs.npmCiLog.path = "forged/npm-ci.log";
sign(forgedBuildPath);
const forgedBuildValidation = revalidateP36CurrentByteBuildGates(forgedBuildPath, { root: process.cwd() });
assert.equal(forgedBuildValidation.ok, false);
assert.equal(forgedBuildValidation.errors.includes("path_npmCiLog"), true);

console.log(`P36 authority deep validation: PASS; convergence mutations ${convergenceMutations.length}/${convergenceMutations.length}; PDF mutations ${pdfMutations.length}/${pdfMutations.length}; build deep/path fail-closed 2/2`);
