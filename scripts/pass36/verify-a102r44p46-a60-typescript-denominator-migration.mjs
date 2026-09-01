#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import { canonicalJson } from "../pass4826/release-package-contract.mjs";

const REVISION = "VELMERE_PASS36_A102R44P46_ACTION_REQUIRED_LEGACY_MULTIPLICATION_ECONOMIC_SINK_TRUTH_REBASE_NO_LIVE_CREDIT";
const MIGRATION_PATH = "config/pass36/a102r44p46-a60-typescript-denominator-migration.json";
const SUPERSEDED_PATH = "config/pass36/a102r44p12-a60-typescript-root-denominator-migration.json";
const POLICY_PATH = "config/pass36/a60-exact-final-byte-build-browser-acceptance.json";
const RUNNER_PATH = "scripts/a60-exact-final-byte-build-browser-acceptance.mjs";
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

function rootsFor(root) {
  const loaded = ts.readConfigFile(path.join(root, "tsconfig.json"), ts.sys.readFile);
  if (loaded.error) throw new Error("r44p46_a60_tsconfig_read_failed");
  const parsed = ts.parseJsonConfigFileContent(loaded.config, ts.sys, root);
  if (parsed.errors.length) throw new Error("r44p46_a60_tsconfig_parse_failed");
  return parsed.fileNames.map((file) => path.relative(root, file).replaceAll("\\", "/")).sort();
}

function verifyExternalBindings(evidenceRoot, migration, check) {
  const bindings = migration.evidenceBindings;
  const records = [
    bindings.preBuildProbeReceipt,
    bindings.preBuildTypeScriptArtifact,
    bindings.postDualBuildContinuationReceipt,
    bindings.postDualBuildTypeScriptArtifact,
    ...bindings.logs,
  ];
  for (const record of records) {
    const absolute = path.resolve(evidenceRoot, record.path);
    const inside = absolute === evidenceRoot || absolute.startsWith(`${evidenceRoot}${path.sep}`);
    const bytes = (() => {
      try { return inside ? fs.readFileSync(absolute) : null; } catch { return null; }
    })();
    check(`external-file:${record.path}`, inside && bytes !== null && bytes.length === record.byteLength && sha256(bytes) === record.sha256, bytes === null ? null : { byteLength: bytes.length, sha256: sha256(bytes) });
  }

  try {
    const preReceipt = JSON.parse(fs.readFileSync(path.resolve(evidenceRoot, bindings.preBuildProbeReceipt.path), "utf8"));
    const preArtifact = JSON.parse(fs.readFileSync(path.resolve(evidenceRoot, bindings.preBuildTypeScriptArtifact.path), "utf8"));
    const postReceipt = JSON.parse(fs.readFileSync(path.resolve(evidenceRoot, bindings.postDualBuildContinuationReceipt.path), "utf8"));
    const postArtifact = JSON.parse(fs.readFileSync(path.resolve(evidenceRoot, bindings.postDualBuildTypeScriptArtifact.path), "utf8"));
    check("external-pre-receipt-truth", preReceipt.status === bindings.preBuildProbeReceipt.status
      && preReceipt.evidenceClass === "TESTED_LOCAL_REAL_EXECUTION"
      && preReceipt.preTypeScript?.configuredRootFiles === 161
      && preReceipt.preTypeScript?.rootFilesCovered === 161
      && preReceipt.preTypeScript?.transitiveFirstPartyFiles === 1560
      && preReceipt.preTypeScript?.toolingSyntaxFiles === 185
      && preReceipt.preTypeScript?.diagnosticCount === 0
      && preReceipt.a60Credit === false
      && preReceipt.externalEvidenceCredit === false);
    check("external-pre-artifact-truth", preArtifact.ok === true
      && preArtifact.configuredRootFiles === 161
      && preArtifact.rootFilesCovered === 161
      && preArtifact.transitiveFirstPartyFiles === 1560
      && preArtifact.toolingSyntaxFiles === 185
      && Array.isArray(preArtifact.toolingSyntaxErrors)
      && preArtifact.toolingSyntaxErrors.length === 0
      && preArtifact.partitionCount === 18
      && preArtifact.sourceImmutable === true);
    check("external-post-receipt-truth", postReceipt.status === bindings.postDualBuildContinuationReceipt.status
      && postReceipt.evidenceClass === "TESTED_LOCAL_REAL_EXECUTION"
      && postReceipt.postTypeScript?.configuredRootFiles === 303
      && postReceipt.postTypeScript?.rootFilesCovered === 303
      && postReceipt.postTypeScript?.transitiveFirstPartyFiles === 1702
      && postReceipt.postTypeScript?.toolingSyntaxFiles === 185
      && postReceipt.postTypeScript?.diagnosticCount === 0
      && postReceipt.denominatorObserved === true
      && postReceipt.lockFailuresRetained === true
      && postReceipt.a60Credit === false
      && postReceipt.buildCredit === false
      && postReceipt.externalEvidenceCredit === false);
    check("external-post-artifact-truth", postArtifact.ok === true
      && postArtifact.configuredRootFiles === 303
      && postArtifact.rootFilesCovered === 303
      && postArtifact.transitiveFirstPartyFiles === 1702
      && postArtifact.toolingSyntaxFiles === 185
      && Array.isArray(postArtifact.toolingSyntaxErrors)
      && postArtifact.toolingSyntaxErrors.length === 0
      && postArtifact.partitionCount === 18
      && postArtifact.sourceImmutable === true);
    check("external-authority-anchor", preReceipt.expectedManifestSha256 === migration.sourceAuthorityAtObservation.manifestFileSha256
      && postReceipt.expectedManifestSha256 === migration.sourceAuthorityAtObservation.manifestFileSha256
      && preReceipt.authorityStable === true
      && postReceipt.authorityStable === true);
  } catch (error) {
    check("external-json-readable", false, error instanceof Error ? error.message : String(error));
  }
}

export function verifyR44P46A60TypeScriptDenominatorMigration(root = process.cwd(), options = {}) {
  const migration = JSON.parse(fs.readFileSync(path.join(root, MIGRATION_PATH), "utf8"));
  const superseded = JSON.parse(fs.readFileSync(path.join(root, SUPERSEDED_PATH), "utf8"));
  const policy = JSON.parse(fs.readFileSync(path.join(root, POLICY_PATH), "utf8"));
  const runner = fs.readFileSync(path.join(root, RUNNER_PATH), "utf8");
  const roots = rootsFor(root);
  const generated = roots.filter((file) => file.startsWith(".next-pass25-webpack/") || file.startsWith(".next-pass25-turbopack/"));
  const source = roots.filter((file) => !generated.includes(file));
  const current = migration.currentObservedContract;
  const observedProfile = generated.length === 0
    ? current.preBuild.profile
    : generated.length === current.postDualBuild.exactGeneratedRoots
      ? current.postDualBuild.profile
      : "INVALID_PARTIAL_GENERATED_ROOT_PROFILE";
  const checks = [];
  const check = (id, ok, detail = null) => checks.push({ id, ok: Boolean(ok), detail });

  check("schema", migration.schemaVersion === "velmere.pass36.a102r44p46.a60-typescript-denominator-migration.v1" && migration.revisionId === REVISION && migration.evidenceClass === "TESTED_LOCAL_REAL_EXECUTION");
  check("superseded-path", migration.supersedesMigrationPath === SUPERSEDED_PATH);
  check("historical-values", superseded.currentPhysicalDenominator.preBuildSourceRoots === 160
    && superseded.currentPhysicalDenominator.postDualBuildRoots === 301
    && superseded.currentPhysicalDenominator.generatedRoots === 141
    && migration.historicalDeclaration.preBuildSourceRoots === 160
    && migration.historicalDeclaration.postDualBuildRoots === 301
    && migration.historicalDeclaration.generatedRoots === 141
    && migration.historicalDeclaration.supportedByCurrentR44P46Probe === false);
  check("current-pre-root-denominator", current.preBuild.exactSourceRoots === 161 && current.preBuild.exactConfiguredRoots === 161 && current.preBuild.exactCoveredRoots === 161);
  check("current-post-root-denominator", current.postDualBuild.exactRetainedSourceRoots === 161
    && current.postDualBuild.exactGeneratedRoots === 142
    && current.postDualBuild.exactWebpackGeneratedRoots === 139
    && current.postDualBuild.exactTurbopackGeneratedRoots === 3
    && current.postDualBuild.exactWebpackGeneratedRoots + current.postDualBuild.exactTurbopackGeneratedRoots === current.postDualBuild.exactGeneratedRoots
    && current.postDualBuild.exactConfiguredRoots === 303
    && current.postDualBuild.exactCoveredRoots === 303);
  check("current-transitive-floors", current.preBuild.observedTransitiveFirstPartyFiles === 1560 && current.preBuild.minimumTransitiveFirstPartyFiles === 1560 && current.postDualBuild.observedTransitiveFirstPartyFiles === 1702 && current.postDualBuild.minimumTransitiveFirstPartyFiles === 1702);
  check("current-tooling-floor", current.preBuild.observedToolingSyntaxFiles === 185 && current.preBuild.minimumToolingSyntaxFiles === 185 && current.postDualBuild.observedToolingSyntaxFiles === 185 && current.postDualBuild.minimumToolingSyntaxFiles === 185);
  check("diagnostics-zero", current.preBuild.maximumDiagnostics === 0 && current.postDualBuild.maximumDiagnostics === 0);
  check("delta-monotonic", migration.deltaFromHistoricalDeclaration.preBuildSourceRoots === 1
    && migration.deltaFromHistoricalDeclaration.postDualBuildRoots === 2
    && migration.deltaFromHistoricalDeclaration.generatedRoots === 1
    && migration.deltaFromHistoricalDeclaration.preBuildMinimumTransitiveFirstPartyFiles === 25
    && migration.deltaFromHistoricalDeclaration.postDualBuildMinimumTransitiveFirstPartyFiles === 26
    && migration.deltaFromHistoricalDeclaration.minimumToolingSyntaxFiles === 10
    && migration.deltaFromHistoricalDeclaration.rootsRemoved === 0);
  check("policy-contract", policy.typescript.denominatorMigrationPath === MIGRATION_PATH
    && policy.typescript.preBuildExpectedRootFiles === 161
    && policy.typescript.preBuildMinimumTransitiveFirstPartyFiles === 1560
    && policy.typescript.postDualBuildExpectedRootFiles === 303
    && policy.typescript.postDualBuildGeneratedRootFiles === 142
    && policy.typescript.postDualBuildMinimumTransitiveFirstPartyFiles === 1702
    && policy.typescript.minimumToolingSyntaxFiles === 185
    && policy.typescript.rootFilesCoveredMustEqualConfiguredRootFiles === true
    && policy.typescript.maximumDiagnostics === 0);
  check("runner-policy-driven", runner.includes("policy.typescript.preBuildExpectedRootFiles")
    && runner.includes("policy.typescript.preBuildMinimumTransitiveFirstPartyFiles")
    && runner.includes("policy.typescript.postDualBuildExpectedRootFiles")
    && runner.includes("policy.typescript.postDualBuildMinimumTransitiveFirstPartyFiles")
    && runner.includes("policy.typescript.minimumToolingSyntaxFiles"));
  check("observed-profile", observedProfile === current.preBuild.profile || observedProfile === current.postDualBuild.profile, { observedProfile, total: roots.length, source: source.length, generated: generated.length });
  check("observed-source-roots", source.length === 161, source.length);
  check("observed-total-roots", roots.length === (observedProfile === current.preBuild.profile ? 161 : 303), roots.length);
  check("observed-generated-roots", generated.length === (observedProfile === current.preBuild.profile ? 0 : 142), generated.length);
  check("compact-receipt-bindings", migration.evidenceBindings.preBuildProbeReceipt.byteLength === 13706
    && migration.evidenceBindings.preBuildProbeReceipt.sha256 === "c067866f2a82b197d562de5cbaa3c2010d293ed789e075ed0108703888a8b406"
    && migration.evidenceBindings.postDualBuildContinuationReceipt.byteLength === 562833
    && migration.evidenceBindings.postDualBuildContinuationReceipt.sha256 === "9d6f3db905c09a8c867f0ec342f8591b16c73785ddd1037512658c2bdd7b5047"
    && migration.evidenceBindings.preBuildProbeReceipt.negativeFailureRetained === true
    && migration.evidenceBindings.postDualBuildContinuationReceipt.negativeFailureRetained === true);
  check("compact-artifact-bindings", migration.evidenceBindings.preBuildTypeScriptArtifact.sha256 === "07a4c79016318bbe01f642d055b8d809a02e3ad60f32a8dc665b00cf806c0167"
    && migration.evidenceBindings.postDualBuildTypeScriptArtifact.sha256 === "57ae7e72a6737b0407e9640548de4d92f3b0ecae909c902ba3bc076e12795338");
  check("compact-log-bindings", migration.evidenceBindings.logs.length === 8
    && new Set(migration.evidenceBindings.logs.map((entry) => entry.path)).size === 8
    && migration.evidenceBindings.logs.every((entry) => Number.isInteger(entry.byteLength) && entry.byteLength >= 0 && /^[a-f0-9]{64}$/u.test(entry.sha256) && [0, 1].includes(entry.expectedExitCode)));
  check("source-observation-anchor", migration.sourceAuthorityAtObservation.manifestFileSha256 === "732563689257c0e0db8c2c296977368afd21a0e19e54939f172e2af71289df5d"
    && migration.sourceAuthorityAtObservation.sourceFingerprint === "a15bb49f0002fabebaf2feec86bec6436c3f9635a153119fa76c0c19ae4bfdd8"
    && migration.sourceAuthorityAtObservation.fileCount === 6455
    && migration.sourceAuthorityAtObservation.payloadBytes === 191827117
    && migration.sourceAuthorityAtObservation.authorityStableAcrossBothProbes === true);
  check("negative-evidence-retained", migration.negativeEvidence.preBuildProbeStatusRetained === "FAIL_R44P46_A60_TYPESCRIPT_DENOMINATOR_PROBE"
    && migration.negativeEvidence.webpackChainedPostVerifierFailureRetained === true
    && migration.negativeEvidence.turbopackBuildLockFailureRetained === true
    && migration.negativeEvidence.failedBuildMayNotReceiveBuildCredit === true);
  check("stage-denominator-stable", migration.a60StageDenominator.before === 14 && migration.a60StageDenominator.after === 14 && migration.a60StageDenominator.retained === 14 && migration.a60StageDenominator.added === 0 && migration.a60StageDenominator.removed === 0);
  check("no-bypass", migration.testsDeleted === 0 && migration.skipsAdded === 0 && migration.timeoutsIncreased === 0 && migration.denominatorsReduced === 0);
  check("closure-unchanged", migration.internalClosure.numerator === 1 && migration.internalClosure.denominator === 26 && migration.internalClosure.percent === 3.8 && migration.internalClosure.onlyClosedGate === "G11" && migration.internalClosureCreditAdded === 0);
  check("truth-boundary", migration.a60ExecutedCredit === false && migration.buildCredit === false && migration.browserCredit === false && migration.releaseCredit === false && migration.externalEvidenceCredit === false && migration.globalDecision === "NO_GO" && migration.LIVE === false && migration.saleEnabled === false && migration.productionApproved === false && migration.worldClassProven === false);
  const core = { ...migration }; delete core.migrationDigestSha256;
  check("self-digest", /^[a-f0-9]{64}$/u.test(migration.migrationDigestSha256 ?? "") && migration.migrationDigestSha256 === sha256(canonicalJson(core)));

  const evidenceRootOption = options.evidenceRoot ?? process.env[migration.externalEvidenceRootEnvironmentVariable];
  const evidenceRoot = evidenceRootOption ? path.resolve(evidenceRootOption) : null;
  if (evidenceRoot) verifyExternalBindings(evidenceRoot, migration, check);
  const failed = checks.filter((row) => !row.ok);
  return {
    schemaVersion: "velmere.pass36.a102r44p46.a60-typescript-denominator-migration-verification.v1",
    status: failed.length ? "FAIL_R44P46_A60_TYPESCRIPT_DENOMINATOR_MIGRATION" : "PASS_R44P46_A60_TYPESCRIPT_DENOMINATOR_MIGRATION_NO_BUILD_OR_RELEASE_CREDIT",
    revisionId: migration.revisionId,
    checks: checks.length,
    passed: checks.length - failed.length,
    failed: failed.length,
    observedProfile,
    observedRootFiles: roots.length,
    observedSourceRootFiles: source.length,
    observedGeneratedRootFiles: generated.length,
    preBuildRootDenominator: current.preBuild.exactConfiguredRoots,
    preBuildMinimumTransitiveFirstPartyFiles: current.preBuild.minimumTransitiveFirstPartyFiles,
    postDualBuildRootDenominator: current.postDualBuild.exactConfiguredRoots,
    postDualBuildGeneratedRootDenominator: current.postDualBuild.exactGeneratedRoots,
    postDualBuildMinimumTransitiveFirstPartyFiles: current.postDualBuild.minimumTransitiveFirstPartyFiles,
    minimumToolingSyntaxFiles: current.preBuild.minimumToolingSyntaxFiles,
    externalEvidenceValidated: evidenceRoot !== null,
    failures: failed,
    internalClosure: migration.internalClosure,
    globalDecision: "NO_GO",
    LIVE: false,
    saleEnabled: false,
    productionApproved: false,
    worldClassProven: false
  };
}

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invoked === import.meta.url) {
  const result = verifyR44P46A60TypeScriptDenominatorMigration();
  console.log(JSON.stringify(result, null, 2));
  if (result.failed) process.exit(1);
}
