import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  canonicalJson,
  collectCurrentSource,
  sha256,
  sourcePayload,
  validateCurrentSourceAuthorityExact,
} from "./current-source-authority-lib.mjs";
import { validateSourceManifestExact } from "./a79-exact-build-browser-lib.mjs";
import { createPortableRejectedSymlink } from "./portable-symlink-negative-fixture.mjs";
import { loadSourceModePolicy, validateObservedSourceMode } from "./source-mode-policy.mjs";

const REV = "VELMERE_PASS36_A102R42_ACTION_REQUIRED_A60_TOTAL_FAIL_CLOSED_RECEIPT_AND_LOG_CLASSIFIER_BOUNDARY_EXACT_WINDOWS_NO_LIVE_CREDIT";
const PARENT = "VELMERE_PASS36_A102R41_ACTION_REQUIRED_SECURITY_EVIDENCE_AUTHORITY_EXACT_WINDOWS_AND_FAIL_CLOSED_RELEASE_PACKAGING_NO_LIVE_CREDIT";
const R41 = PARENT;
const R40 = "VELMERE_PASS36_A102R40_ACTION_REQUIRED_CURRENT_SOURCE_AUTHORITY_EXACT_BUILD_PREFLIGHT_AND_STALE_RELEASE_POINTER_RECONCILIATION_NO_LIVE_CREDIT";
const R39 = "VELMERE_PASS36_A102R39_ACTION_REQUIRED_CROSS_PLATFORM_SOURCE_MODE_IDENTITY_WINDOWS_UNPACK_AND_POSIX_EXECUTABLE_POLICY_NO_LIVE_CREDIT";
const R33 = "VELMERE_PASS36_A102R33_ACTION_REQUIRED_DIALOG_FOCUS_RETURN_RAPID_REOPEN_NESTED_MODAL_AND_PENDING_OBSERVER_RACE_RECOVERY_NO_REAL_CREDIT";
const DESCENDANT = "config/pass36/a102r42-current-root-descendant-manifest.json";
const PROGRAM = "config/pass36/a102r42-world-class-completion-program.json";
const MODE = "config/pass36/a102r42-cross-platform-source-mode-policy.json";
const LEDGER = "config/pass36/a102r41-historical-descendant-sparse-edge-ledger.json";
const AUTHORITY_STATUS = "PASS_A102R42_ACTION_REQUIRED_AUTHORITY_A60_TOTAL_FAIL_CLOSED_RECEIPT_AND_LOG_CLASSIFIER_BOUNDARY_EXACT_WINDOWS_NO_LIVE_CREDIT";
const RELEASE_BINDINGS = [
  "config/pass36/a60-exact-final-byte-build-browser-acceptance.json",
  "config/pass36/a62-offline-exact-runtime-dependency-bootstrap.json",
  "config/pass36/a63-staging-program-orchestrator.json",
  "config/pass36/a78-exact-runtime-lockfile-browser-bootstrap.json",
  "config/pass36/a79-exact-final-byte-build-browser-evidence-binding.json",
  "config/pass36/a80-frozen-local-release-candidate-admission.json",
];
const root = process.cwd();
const checks = [];
const check = (id, value, detail = null) => { checks.push({ id, passed: Boolean(value), detail }); assert.ok(value, id); };
const writeJson = (base, relative, value) => {
  const file = path.join(base, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

function createFixture() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-a102r42-current-source-"));
  fs.mkdirSync(path.join(base, "scripts"), { recursive: true });
  fs.writeFileSync(path.join(base, "scripts/run.mjs"), "#!/usr/bin/env node\nconsole.log('fixture');\n");
  fs.chmodSync(path.join(base, "scripts/run.mjs"), 0o755);
  fs.writeFileSync(path.join(base, "app.txt"), "fixture-source\n");
  writeJson(base, MODE, {
    schemaVersion: "velmere.pass36.cross-platform-source-mode-policy.v1",
    revisionId: REV,
    parentRevisionId: PARENT,
    regularFileMode: 33188,
    executableFileMode: 33261,
    modeAuthority: "EXACT_PATH_ALLOWLIST",
    windowsFilesystemModeIsAuthority: false,
    posixFilesystemModeIsAuthority: true,
    processExecPathRequired: true,
    shellFalseRequired: true,
    executablePaths: ["scripts/run.mjs"],
    truthBoundary: "fixture",
  });
  writeJson(base, PROGRAM, { revisionId: REV, parentRevisionId: PARENT, formalOpenEntries: 31 });
  writeJson(base, LEDGER, { fixtureOnly: true });
  writeJson(base, "config/pass36/current-release-authority.json", {
    authorityRevisionId: REV,
    parentRevisionId: PARENT,
    sourceRevisionId: REV,
    sourceParentRevisionId: PARENT,
    currentSource: { revisionId: REV, parentRevisionId: PARENT },
    worldClassCompletionProgramRevisionId: REV,
    worldClassCompletionProgramPath: PROGRAM,
    currentRootDescendantManifestRevisionId: REV,
    currentRootDescendantManifestPath: DESCENDANT,
    historicalDescendantSparseEdgeLedgerPath: LEDGER,
    planes: {
      roadmapProgram: { revisionId: REV, path: PROGRAM, credit: false },
      a102r26ChartRuntimeLocalClosure: {
        revisionId: "VELMERE_PASS36_A102R26_ACTION_REQUIRED_ASSET_DETAIL_CHART_SHARED_CACHE_INFLIGHT_RACE_REFERENCE_REFRESH_AND_NO_FLICKER_RECOVERY_NO_REAL_CREDIT",
        statePath: "config/pass36/a102r26-action-required-current-state.json",
        programPath: "config/pass36/a102r26-world-class-completion-program.json",
      },
      a102r29LocalClosure: {
        revisionId: "VELMERE_PASS36_A102R29_ACTION_REQUIRED_CANONICAL_ASSET_CLASS_LOCALE_INDEPENDENT_CHART_ROUTE_CACHE_AND_NESTED_AUTHORITY_PROGRAM_DRIFT_RECOVERY_NO_REAL_CREDIT",
        parentRevisionId: "VELMERE_PASS36_A102R28_ACTION_REQUIRED_ASSET_DETAIL_ABORTED_INFLIGHT_REOPEN_AND_DEFERRED_IDENTITY_RESET_RACE_RECOVERY_NO_REAL_CREDIT",
        statePath: "config/pass36/a102r29-action-required-current-state.json",
        testReceiptPath: "config/pass36/a102r29-local-regression-receipt.json",
        approvedChangeLedgerPath: "config/pass36/a102r29-approved-route-cache-authority-changes.json",
      },
    },
    compatibilityPointers: [
      { path: "config/current-release.json", classification: "LEGACY_PRODUCT_CONTRACT_COMPATIBILITY_POINTER", declaredRevisionId: REV, mayDefineCurrentSource: false, reason: "A102R42 fixture non-authoritative" },
      { path: "config/pass35/current-revision.json", classification: "PASS35_COMPATIBILITY_MIRROR_OF_CURRENT_SOURCE_AND_PLANES", declaredRevisionId: REV, mayDefineCurrentSource: false, reason: "A102R42 fixture non-authoritative" },
      { path: "VELMERE_WORLD_CLASS_MAX_ROADMAP_PASS35.txt", classification: "HUMAN_READABLE_CUMULATIVE_ROADMAP", declaredRevisionId: REV, mayDefineCurrentSource: false, reason: "A102R42 fixture non-authoritative" },
    ],
    claims: { a102r40A79BrowserRowsRequired: 56, a102r40A79ScreenshotsRequired: 29 },
    truthBoundary: "A102R42 fixture current authority",
  });
  writeJson(base, "config/pass35/current-revision.json", {
    sourceRevisionId: REV,
    sourceParentRevisionId: PARENT,
    parentSourceRevisionId: PARENT,
    currentReleaseAuthorityRevisionId: REV,
    currentRootDescendantManifestRevisionId: REV,
    currentRootDescendantManifestPath: DESCENDANT,
    worldClassCompletionProgramRevisionId: REV,
    worldClassCompletionProgramPath: PROGRAM,
    authoritativeCurrentRootDescendantManifestPath: DESCENDANT,
    authoritativeWorldClassCompletionProgramPath: PROGRAM,
    authoritativeCurrentWorldClassProgramPath: PROGRAM,
    historicalDescendantSparseEdgeLedgerPath: LEDGER,
    exactBuildBrowserRequiredRows: 56,
    exactBuildBrowserRequiredScreenshots: 29,
    exactBuildBrowserRequiredPopupTabs: 4,
    saleEnabled: false,
    liveProven: false,
    worldClassProven: false,
  });
  writeJson(base, "config/current-release.json", {
    sourceRevisionId: "VELMERE_PASS35_A32_HISTORICAL_PRODUCT_PLANE",
    authoritativeCurrentSourceRevisionId: REV,
    authoritativeCurrentSourceParentRevisionId: PARENT,
    currentReleaseAuthorityRevisionId: REV,
    worldClassCompletionProgramRevisionId: REV,
    worldClassCompletionProgramPath: PROGRAM,
    authoritativeWorldClassCompletionProgramPath: PROGRAM,
    authoritativeCurrentWorldClassProgramPath: PROGRAM,
    currentRootDescendantManifestRevisionId: REV,
    currentRootDescendantManifestPath: DESCENDANT,
    authoritativeCurrentRootDescendantManifestPath: DESCENDANT,
    historicalDescendantSparseEdgeLedgerPath: LEDGER,
    pointerClassification: "LEGACY_PRODUCT_CONTRACT_COMPATIBILITY_POINTER",
    notAuthoritativeCurrentSourcePointer: true,
    productionPromotionAllowed: false,
    readinessScoreIssued: false,
    legacyCandidateAuthoritativeForCurrentStaging: false,
    authoritativeCurrentDecision: "NO_GO",
    authoritativeCurrentCheckpointClass: "ACTION_REQUIRED_NON_PASS",
    currentReleaseAuthorityStatus: "ACTION_REQUIRED_NON_PASS",
    authoritativeCurrentSaleEnabled: false,
  });
  writeJson(base, "config/pass36/a58-release-integrity-policy.json", {
    currentSourceRevisionId: REV,
    currentCheckpointRevisionId: REV,
    currentCheckpointParentRevisionId: PARENT,
    currentDescendantManifestPath: DESCENDANT,
    currentWorldClassCompletionProgramPath: PROGRAM,
    currentWorldClassCompletionProgramRevisionId: REV,
    currentAuthorityVerifierPath: "scripts/pass36/verify-a102r42-action-required-authority.mjs",
    currentAuthorityVerifierExpectedStatus: AUTHORITY_STATUS,
    crossPlatformSourceModePolicyPath: MODE,
    crossPlatformExecutablePathCount: 1,
    archiveManifestPath: "_velmere/PASS36_A102R42_SOURCE_ONLY_MANIFEST.json",
    archiveManifestSchemaVersion: "velmere.pass36.a102r42.source-only-package-manifest.v1",
    archiveManifestContract: {
      revisionId: REV,
      path: "_velmere/PASS36_A102R42_SOURCE_ONLY_MANIFEST.json",
      schemaVersion: "velmere.pass36.a102r42.source-only-package-manifest.v1",
    },
  });
  writeJson(base, "package.json", {
    velmerePass: REV,
    velmerePatch: "VELMERE_A102R42_PATCH.txt",
    velmereCurrentReleaseAuthorityPass: REV,
    velmereWorldClassCompletionProgramPass: REV,
    velmereWorldClassCompletionProgramPath: PROGRAM,
    velmereCurrentRootDescendantManifestPath: DESCENDANT,
    velmerePassMetadata: { currentRevisionId: REV, parentRevisionId: PARENT },
    a102r40A79BrowserRowsRequired: 56,
    a102r40A79ScreenshotsRequired: 29,
    velmere: {
      currentRevisionId: REV,
      currentRevisionParentId: PARENT,
      currentRootDescendantManifestPath: DESCENDANT,
      worldClassCompletionProgramPath: PROGRAM,
    },
  });
  for (const relativePath of RELEASE_BINDINGS) {
    const binding = { sourceManifestPath: DESCENDANT, currentSourceRevisionId: REV, currentSourceParentRevisionId: PARENT };
    if (relativePath.endsWith("a60-exact-final-byte-build-browser-acceptance.json")) binding.browser = { requiredChecks: 56, requiredScreenshots: 29, requiredPopupTabs: ["overview", "analysis", "market-impact", "whale-watch"] };
    if (relativePath.endsWith("a80-frozen-local-release-candidate-admission.json")) Object.assign(binding, { requiredBrowserRows: 56, requiredScreenshots: 29 });
    writeJson(base, relativePath, binding);
  }
  fs.writeFileSync(path.join(base, "VELMERE_ACTIVE_PASS.txt"), `${REV}\n`);
  const inventory = collectCurrentSource(base);
  const manifest = {
    schemaVersion: "velmere.pass36.a102r42.current-root-descendant-manifest.v1",
    revisionId: REV,
    parentRevisionId: PARENT,
    payload: sourcePayload(inventory.rows),
  };
  manifest.manifestDigestSha256 = sha256(canonicalJson(manifest));
  writeJson(base, DESCENDANT, manifest);
  return base;
}

function mutateJson(base, relative, fn) {
  const file = path.join(base, relative);
  const before = fs.readFileSync(file);
  const data = JSON.parse(before.toString("utf8"));
  fn(data);
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
  return () => fs.writeFileSync(file, before);
}

function rebuildFixtureManifest(base) {
  const manifestFile = path.join(base, DESCENDANT);
  const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
  manifest.payload = sourcePayload(collectCurrentSource(base).rows);
  delete manifest.manifestDigestSha256;
  manifest.manifestDigestSha256 = sha256(canonicalJson(manifest));
  fs.writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

const fixture = createFixture();
try {
  const valid = validateCurrentSourceAuthorityExact(fixture);
  check("fixture-valid", valid.passed && valid.mismatches.length === 0, valid);
  check("fixture-full-payload", valid.payload.fileCount >= 16 && valid.payload.aggregateSha256 === valid.declaredPayload.aggregateSha256, valid.payload);
  check("fixture-manifest-anchor", /^[a-f0-9]{64}$/u.test(valid.manifestSha256), valid.manifestSha256);

  const jsonCases = [
    ["active-drift", "VELMERE_ACTIVE_PASS.txt", null],
    ["authority-current-drift", "config/pass36/current-release-authority.json", (d) => { d.currentSource.revisionId = "STALE"; }],
    ["authority-roadmap-plane-drift", "config/pass36/current-release-authority.json", (d) => { d.planes.roadmapProgram.path = "config/pass36/stale.json"; }],
    ["package-current-drift", "package.json", (d) => { d.velmere.currentRevisionId = "STALE"; }],
    ["package-top-program-drift", "package.json", (d) => { d.velmereWorldClassCompletionProgramPath = "config/pass36/stale.json"; }],
    ["current-revision-drift", "config/pass35/current-revision.json", (d) => { d.sourceRevisionId = "STALE"; }],
    ["current-descendant-path-drift", "config/pass35/current-revision.json", (d) => { d.currentRootDescendantManifestPath = "config/pass36/stale.json"; }],
    ["a58-source-drift", "config/pass36/a58-release-integrity-policy.json", (d) => { d.currentSourceRevisionId = "STALE"; }],
    ["a58-schema-drift", "config/pass36/a58-release-integrity-policy.json", (d) => { d.archiveManifestSchemaVersion = "velmere.pass36.a102r40.source-only-package-manifest.v1"; }],
    ["a58-authority-status-drift", "config/pass36/a58-release-integrity-policy.json", (d) => { d.currentAuthorityVerifierExpectedStatus = "PASS_STALE"; }],
    ["a58-executable-count-drift", "config/pass36/a58-release-integrity-policy.json", (d) => { d.crossPlatformExecutablePathCount = 999; }],
    ["mode-policy-path-drift", "config/pass36/a58-release-integrity-policy.json", (d) => { d.crossPlatformSourceModePolicyPath = "config/pass36/missing.json"; }],
  ];
  for (const [id, relative, mutate] of jsonCases) {
    if (relative === "VELMERE_ACTIVE_PASS.txt") {
      const file = path.join(fixture, relative); const before = fs.readFileSync(file); fs.writeFileSync(file, "STALE\n");
      const result = validateCurrentSourceAuthorityExact(fixture); check(id, !result.passed && result.mismatches.length > 0, result.mismatches); fs.writeFileSync(file, before);
    } else {
      const restore = mutateJson(fixture, relative, mutate);
      let result;
      try { result = validateCurrentSourceAuthorityExact(fixture); } catch (error) { result = { passed: false, mismatches: [String(error)] }; }
      check(id, !result.passed && result.mismatches.length > 0, result.mismatches); restore();
    }
  }

  const manifestFile = path.join(fixture, DESCENDANT);
  const manifestBefore = fs.readFileSync(manifestFile);
  for (const [id, fn] of [
    ["manifest-revision-drift", (d) => { d.revisionId = "STALE"; }],
    ["manifest-parent-drift", (d) => { d.parentRevisionId = "STALE"; }],
    ["manifest-self-digest-drift", (d) => { d.manifestDigestSha256 = "0".repeat(64); }],
    ["manifest-payload-drift", (d) => { d.payload.aggregateSha256 = "1".repeat(64); }],
  ]) {
    const data = JSON.parse(manifestBefore.toString("utf8")); fn(data); fs.writeFileSync(manifestFile, `${JSON.stringify(data, null, 2)}\n`);
    const result = validateCurrentSourceAuthorityExact(fixture); check(id, !result.passed, result.mismatches); fs.writeFileSync(manifestFile, manifestBefore);
  }

  const appFile = path.join(fixture, "app.txt"); const appBefore = fs.readFileSync(appFile);
  fs.writeFileSync(appFile, "tampered\n"); check("source-byte-tamper", !validateCurrentSourceAuthorityExact(fixture).passed); fs.writeFileSync(appFile, appBefore);
  fs.writeFileSync(path.join(fixture, "extra.txt"), "extra\n"); check("source-extra-file", !validateCurrentSourceAuthorityExact(fixture).passed); fs.rmSync(path.join(fixture, "extra.txt"));
  fs.rmSync(appFile); check("source-missing-file", !validateCurrentSourceAuthorityExact(fixture).passed); fs.writeFileSync(appFile, appBefore);
  const sourceLink = createPortableRejectedSymlink(path.join(fixture, "link.txt"), "app.txt");
  try { check("source-symlink", !validateCurrentSourceAuthorityExact(fixture).passed, sourceLink.kind); } finally { sourceLink.cleanup(); }

  const modePolicy = loadSourceModePolicy(fixture, MODE);
  const modeRejected = (relativePath, mode, platform) => {
    try { validateObservedSourceMode(relativePath, { mode }, modePolicy, platform); return false; } catch { return true; }
  };
  check("posix-executable-loss", modeRejected("scripts/run.mjs", 0o100644, "linux"));
  check("windows-executable-loss-accepted", !modeRejected("scripts/run.mjs", 0o100644, "win32"));
  check("posix-unexpected-executable", modeRejected("app.txt", 0o100755, "linux"));
  check("windows-unexpected-executable-nonauthority", !modeRejected("app.txt", 0o100755, "win32"));

  fs.rmSync(manifestFile); check("manifest-missing", !validateCurrentSourceAuthorityExact(fixture).passed); fs.writeFileSync(manifestFile, manifestBefore);
  check("fixture-restored", validateCurrentSourceAuthorityExact(fixture).passed);

  const legacy = validateSourceManifestExact(root, "config/pass35/a57-source-manifest.json");
  check("legacy-a57-current-preflight-rejected", legacy.mismatches.length > 0 || legacy.declaredFiles !== legacy.expectedFiles, { mismatches: legacy.mismatches.length, declared: legacy.declaredFiles, expected: legacy.expectedFiles });
  const releaseFiles = [
    "scripts/a60-exact-final-byte-build-browser-acceptance.mjs",
    "scripts/a62-offline-exact-runtime-dependency-bootstrap.mjs",
    "scripts/a63-staging-program-orchestrator.mjs",
    "scripts/pass36/a78-exact-runtime-bootstrap-lib.mjs",
    "scripts/pass36/test-a79-exact-final-byte-build-browser-evidence-binding.mjs",
    "scripts/pass36/a80-release-candidate-freeze-lib.mjs",
  ];
  for (const relative of releaseFiles) {
    const source = fs.readFileSync(path.join(root, relative), "utf8");
    check(`release-binding:${relative}`, source.includes("current-source-authority") || source.includes("currentSourceAuthorityPath"), relative);
  }
  const a63Source = fs.readFileSync(path.join(root, "scripts/a63-staging-program-orchestrator.mjs"), "utf8");
  check("a63-exact-npm-cli-no-system-shim", a63Source.includes("process.execPath") && a63Source.includes("VELMERE_A79_NPM_CLI_PATH") && !a63Source.includes("npm.cmd"));

  const attackCases = [
    ["compat-revision-plane-replay-rejected", [["config/current-release.json", (d) => {
      d.authoritativeCurrentSourceRevisionId = R40; d.authoritativeCurrentSourceParentRevisionId = R39;
      d.currentReleaseAuthorityRevisionId = R40; d.worldClassCompletionProgramRevisionId = R40; d.currentRootDescendantManifestRevisionId = R40;
    }]]],
    ["compat-path-plane-replay-rejected", [["config/current-release.json", (d) => {
      d.worldClassCompletionProgramPath = "config/pass36/a102r40-world-class-completion-program.json";
      d.authoritativeWorldClassCompletionProgramPath = "config/pass36/a102r39-world-class-completion-program.json";
      d.authoritativeCurrentWorldClassProgramPath = "config/pass36/a102r39-world-class-completion-program.json";
      d.currentRootDescendantManifestPath = "config/pass36/a102r39-current-root-descendant-manifest.json";
      d.authoritativeCurrentRootDescendantManifestPath = "config/pass36/a102r39-current-root-descendant-manifest.json";
    }]]],
    ["current-parent-source-alias-replay-rejected", [["config/pass35/current-revision.json", (d) => { d.parentSourceRevisionId = R33; }]]],
    ["package-primary-plane-replay-rejected", [["package.json", (d) => {
      d.velmerePass = R40; d.velmerePatch = "VELMERE_A102R40_PATCH.txt"; d.velmereCurrentReleaseAuthorityPass = R40;
      d.velmereWorldClassCompletionProgramPass = R40; d.velmereWorldClassCompletionProgramPath = "config/pass36/a102r40-world-class-completion-program.json";
    }]]],
    ["package-metadata-plane-replay-rejected", [["package.json", (d) => { d.velmerePassMetadata.currentRevisionId = R40; d.velmerePassMetadata.parentRevisionId = R39; }]]],
    ["package-top-descendant-alias-replay-rejected", [["package.json", (d) => { d.velmereCurrentRootDescendantManifestPath = "config/pass36/a102r33-current-root-descendant-manifest.json"; }]]],
    ["authority-compatibility-narrative-replay-rejected", [["config/pass36/current-release-authority.json", (d) => {
      for (const pointer of d.compatibilityPointers) { pointer.declaredRevisionId = R40; pointer.reason = "machine authority is R36"; }
      d.truthBoundary = "A102R39 is the current source authority.";
    }]]],
    ["a58-current-authority-contract-replay-rejected", [["config/pass36/a58-release-integrity-policy.json", (d) => {
      d.currentSourceRevisionId = R40; d.currentCheckpointRevisionId = R40; d.currentCheckpointParentRevisionId = R39;
      d.currentDescendantManifestPath = "config/pass36/a102r40-current-root-descendant-manifest.json";
      d.currentWorldClassCompletionProgramPath = "config/pass36/a102r40-world-class-completion-program.json"; d.currentWorldClassCompletionProgramRevisionId = R40;
      d.currentAuthorityVerifierPath = "scripts/pass36/verify-a102r40-action-required-authority.mjs";
      d.currentAuthorityVerifierExpectedStatus = "PASS_A102R40_ACTION_REQUIRED_AUTHORITY_CURRENT_SOURCE_PREFLIGHT_NO_FRESH_EXACT_WINDOWS_BUILD_BROWSER_STAGING_OR_SALE_CREDIT";
      d.crossPlatformSourceModePolicyPath = "config/pass36/a102r40-cross-platform-source-mode-policy.json";
    }]]],
    ["release-surfaces-coherent-stale-binding-rejected", RELEASE_BINDINGS.map((relative) => [relative, (d) => {
      d.sourceManifestPath = "config/pass36/a102r40-current-root-descendant-manifest.json"; d.currentSourceRevisionId = R40; d.currentSourceParentRevisionId = R39;
    }])],
    ["unknown-authority-profile-rejected", [["config/pass36/current-release-authority.json", (d) => { d.authorityRevisionId = "VELMERE_PASS36_A102R999_UNSUPPORTED_COHERENT_PROFILE"; }]], "authority-profile-supported"],
    ["authority-source-parent-alias-rejected", [["config/pass36/current-release-authority.json", (d) => { d.sourceParentRevisionId = R40; }]], "authority-source-parent"],
    ["a58-coherent-archive-contract-substitution-rejected", [["config/pass36/a58-release-integrity-policy.json", (d) => {
      d.archiveManifestPath = "_velmere/COHERENT_SUBSTITUTED_MANIFEST.json";
      d.archiveManifestSchemaVersion = "velmere.pass36.substituted.source-only-package-manifest.v1";
      d.archiveManifestContract.path = d.archiveManifestPath;
      d.archiveManifestContract.schemaVersion = d.archiveManifestSchemaVersion;
    }]], "a102r42-archive-path"],
    ["compatibility-promotion-escalation-rejected", [["config/current-release.json", (d) => {
      d.productionPromotionAllowed = true; d.readinessScoreIssued = true; d.legacyCandidateAuthoritativeForCurrentStaging = true;
      d.authoritativeCurrentDecision = "GO"; d.authoritativeCurrentSaleEnabled = true;
    }]], "compatibility-production-promotion"],
    ["compatibility-pointer-plane-reclassification-rejected", [["config/pass36/current-release-authority.json", (d) => {
      d.compatibilityPointers[0].path = "config/pass36/current-release-authority.json";
      d.compatibilityPointers[0].classification = "MACHINE_AUTHORITY";
    }]], "authority-compatibility-narrative"],
    ["mode-policy-revision-parent-drift-rejected", [[MODE, (d) => { d.revisionId = R41; d.parentRevisionId = R40; }]], "mode-policy-revision"],
    ["browser-denominator-collapse-rejected", [
      ["config/pass35/current-revision.json", (d) => { d.exactBuildBrowserRequiredRows = 55; d.exactBuildBrowserRequiredScreenshots = 28; }],
      ["package.json", (d) => { d.a102r40A79BrowserRowsRequired = 55; d.a102r40A79ScreenshotsRequired = 28; }],
      ["config/pass36/current-release-authority.json", (d) => { d.claims.a102r40A79BrowserRowsRequired = 55; d.claims.a102r40A79ScreenshotsRequired = 28; }],
      ["config/pass36/a60-exact-final-byte-build-browser-acceptance.json", (d) => { d.browser.requiredChecks = 55; d.browser.requiredScreenshots = 28; }],
      ["config/pass36/a80-frozen-local-release-candidate-admission.json", (d) => { d.requiredBrowserRows = 55; d.requiredScreenshots = 28; }],
    ], "current-browser-rows"],
    ["popup-tab-denominator-collapse-rejected", [
      ["config/pass35/current-revision.json", (d) => { d.exactBuildBrowserRequiredPopupTabs = 3; }],
      ["config/pass36/a60-exact-final-byte-build-browser-acceptance.json", (d) => { d.browser.requiredPopupTabs.pop(); }],
    ], "current-browser-popup-tabs"],
    ["known-authority-profile-root-downgrade-rejected", [
      ["config/pass36/current-release-authority.json", (d) => { d.authorityRevisionId = PARENT; }],
    ], "current-root-profile", { expectedRevisionId: REV }],
    ["historical-plane-metadata-drift-rejected", [
      ["config/pass36/current-release-authority.json", (d) => { d.planes.a102r29LocalClosure.revisionId = "VELMERE_PASS36_A102R30_ACTION_REQUIRED_CHART_PROVIDER_CADENCE_CANONICAL_SESSION_AND_EVIDENCE_STATE_TRUTH_RECOVERY_NO_REAL_CREDIT"; }],
    ], "historical-plane:a102r29:revision"],
    ["historical-r26-plane-metadata-drift-rejected", [
      ["config/pass36/current-release-authority.json", (d) => { delete d.planes.a102r26ChartRuntimeLocalClosure.revisionId; }],
    ], "historical-plane:a102r26:revision"],
    ["forbidden-promotion-alias-rejected", [
      ["config/pass36/current-release-authority.json", (d) => { d.live = true; d.saleEnabled = true; d.currentSource.live = true; }],
      ["package.json", (d) => { d.live = true; d.velmere.live = true; }],
      ["config/current-release.json", (d) => { d.live = true; d.saleEnabled = true; }],
      ["config/pass35/current-revision.json", (d) => { d.live = true; d.productionApproved = true; }],
    ], "forbidden-promotion-alias"],
  ];
  for (const [id, mutations, expectedMismatch = null, validationOptions = {}] of attackCases) {
    const restores = mutations.map(([relative, mutate]) => mutateJson(fixture, relative, mutate));
    let result;
    try { rebuildFixtureManifest(fixture); result = validateCurrentSourceAuthorityExact(fixture, validationOptions); } catch (error) { result = { passed: false, mismatches: [{ id: "exception", detail: String(error) }] }; }
    check(id, result.passed === false && result.mismatches.length > 0 && (expectedMismatch === null || result.mismatches.some((row) => row?.id === expectedMismatch)), result.mismatches);
    for (const restore of restores.reverse()) restore();
    rebuildFixtureManifest(fixture);
  }

  const duplicateAuthorityPath = path.join(fixture, "config/pass36/current-release-authority.json");
  const duplicateAuthorityBefore = fs.readFileSync(duplicateAuthorityPath);
  const duplicateAuthorityObject = JSON.parse(duplicateAuthorityBefore.toString("utf8"));
  const duplicateAuthorityText = duplicateAuthorityBefore.toString("utf8").replace("{", `{\n  "authorityRevisionId": ${JSON.stringify(duplicateAuthorityObject.authorityRevisionId)},`);
  fs.writeFileSync(duplicateAuthorityPath, duplicateAuthorityText, "utf8");
  let duplicateAuthorityRejected = false;
  try { validateCurrentSourceAuthorityExact(fixture); } catch (error) { duplicateAuthorityRejected = String(error).includes("strict_json_duplicate_key"); }
  check("authority-duplicate-json-key-rejected", duplicateAuthorityRejected);
  fs.writeFileSync(duplicateAuthorityPath, duplicateAuthorityBefore);
  rebuildFixtureManifest(fixture);

  const duplicateModePath = path.join(fixture, MODE);
  const duplicateModeBefore = fs.readFileSync(duplicateModePath);
  const duplicateModeObject = JSON.parse(duplicateModeBefore.toString("utf8"));
  const duplicateModeText = duplicateModeBefore.toString("utf8").replace("{", `{\n  "revisionId": ${JSON.stringify(duplicateModeObject.revisionId)},`);
  fs.writeFileSync(duplicateModePath, duplicateModeText, "utf8");
  let duplicateModeRejected = false;
  try { validateCurrentSourceAuthorityExact(fixture); } catch (error) { duplicateModeRejected = String(error).includes("strict_json_duplicate_key"); }
  check("mode-policy-duplicate-json-key-rejected", duplicateModeRejected);
  fs.writeFileSync(duplicateModePath, duplicateModeBefore);
  rebuildFixtureManifest(fixture);

  check("fixture-final-restored", validateCurrentSourceAuthorityExact(fixture).passed);
} finally {
  fs.rmSync(fixture, { recursive: true, force: true });
}

// The migration retains all 46 R41 denominator IDs and adds fourteen exact authority attacks.
assert.equal(checks.length, 61, `unexpected_internal_count:${checks.length}`);
// fixture-final-restored is a non-denominator cleanup assertion.
const denominatorChecks = checks.filter((row) => row.id !== "fixture-final-restored");
assert.equal(denominatorChecks.length, 60);
const failed = denominatorChecks.filter((row) => !row.passed);
const report = {
  schemaVersion: "velmere.pass36.a102r42.current-source-authority-preflight-test.v1",
  revisionId: REV,
  parentRevisionId: PARENT,
  status: failed.length === 0 ? "PASS_A102R42_CURRENT_SOURCE_AUTHORITY_PREFLIGHT_LOCAL_ONLY_NO_EXACT_FINAL_BYTE_BUILD_BROWSER_CREDIT" : "FAIL",
  checks: denominatorChecks.length,
  passed: denominatorChecks.length - failed.length,
  failed: failed.length,
  retainedChecks: 46,
  addedChecks: 14,
  removedChecks: 0,
  releaseSourceBindingSurfaces: RELEASE_BINDINGS.length,
  legacyA57CurrentPreflightEligible: false,
  exactCurrentAuthorityPayloadRequired: true,
  physicalPlatform: process.platform,
  posixModePolicyLogicTested: true,
  posixFilesystemPhysicallyTested: process.platform !== "win32",
  globalDecision: "NO_GO",
  live: false,
  saleEnabled: false,
  productionApproved: false,
  worldClassProven: false,
  failures: failed,
};
console.log(JSON.stringify(report, null, 2));
if (failed.length) process.exit(1);
