#!/usr/bin/env node
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

const REV = "VELMERE_PASS36_A102R40_ACTION_REQUIRED_CURRENT_SOURCE_AUTHORITY_EXACT_BUILD_PREFLIGHT_AND_STALE_RELEASE_POINTER_RECONCILIATION_NO_LIVE_CREDIT";
const PARENT = "VELMERE_PASS36_A102R39_ACTION_REQUIRED_CROSS_PLATFORM_SOURCE_MODE_IDENTITY_WINDOWS_UNPACK_AND_POSIX_EXECUTABLE_POLICY_NO_LIVE_CREDIT";
const AUTHORITY_STATUS = "PASS_A102R40_ACTION_REQUIRED_AUTHORITY_CURRENT_SOURCE_PREFLIGHT_NO_FRESH_EXACT_WINDOWS_BUILD_BROWSER_STAGING_OR_SALE_CREDIT";
const root = process.cwd();
const checks = [];
const check = (id, value, detail = null) => { checks.push({ id, passed: Boolean(value), detail }); assert.ok(value, id); };
const writeJson = (base, relative, value) => { const file = path.join(base, relative); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`); };
function createFixture() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-a102r40-current-source-"));
  const descendantPath = "config/pass36/a102r40-current-root-descendant-manifest.json";
  const programPath = "config/pass36/a102r40-world-class-completion-program.json";
  const modePath = "config/pass36/a102r40-cross-platform-source-mode-policy.json";
  fs.mkdirSync(path.join(base, "scripts"), { recursive: true });
  fs.writeFileSync(path.join(base, "scripts/run.mjs"), "#!/usr/bin/env node\nconsole.log('fixture');\n");
  fs.chmodSync(path.join(base, "scripts/run.mjs"), 0o755);
  fs.writeFileSync(path.join(base, "app.txt"), "fixture-source\n");
  writeJson(base, modePath, {
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
  writeJson(base, programPath, { revisionId: REV, parentRevisionId: PARENT, formalOpenEntries: 31 });
  writeJson(base, "config/pass36/current-release-authority.json", {
    authorityRevisionId: REV,
    parentRevisionId: PARENT,
    sourceRevisionId: REV,
    currentSource: { revisionId: REV, parentRevisionId: PARENT },
    worldClassCompletionProgramRevisionId: REV,
    worldClassCompletionProgramPath: programPath,
    currentRootDescendantManifestRevisionId: REV,
    currentRootDescendantManifestPath: descendantPath,
    planes: { roadmapProgram: { revisionId: REV, path: programPath, credit: false } },
  });
  writeJson(base, "config/pass35/current-revision.json", {
    sourceRevisionId: REV,
    sourceParentRevisionId: PARENT,
    currentRootDescendantManifestRevisionId: REV,
    currentRootDescendantManifestPath: descendantPath,
    worldClassCompletionProgramRevisionId: REV,
    worldClassCompletionProgramPath: programPath,
    authoritativeCurrentRootDescendantManifestPath: descendantPath,
    authoritativeWorldClassCompletionProgramPath: programPath,
    authoritativeCurrentWorldClassProgramPath: programPath,
  });
  writeJson(base, "config/pass36/a58-release-integrity-policy.json", {
    currentSourceRevisionId: REV,
    currentCheckpointRevisionId: REV,
    currentCheckpointParentRevisionId: PARENT,
    currentDescendantManifestPath: descendantPath,
    currentWorldClassCompletionProgramPath: programPath,
    currentWorldClassCompletionProgramRevisionId: REV,
    currentAuthorityVerifierPath: "scripts/pass36/verify-a102r40-action-required-authority.mjs",
    currentAuthorityVerifierExpectedStatus: AUTHORITY_STATUS,
    crossPlatformSourceModePolicyPath: modePath,
    crossPlatformExecutablePathCount: 1,
    archiveManifestPath: "_velmere/PASS36_A102R40_SOURCE_ONLY_MANIFEST.json",
    archiveManifestSchemaVersion: "velmere.pass36.a102r40.source-only-package-manifest.v1",
    archiveManifestContract: {
      revisionId: REV,
      path: "_velmere/PASS36_A102R40_SOURCE_ONLY_MANIFEST.json",
      schemaVersion: "velmere.pass36.a102r40.source-only-package-manifest.v1",
    },
  });
  writeJson(base, "package.json", {
    velmereCurrentReleaseAuthorityPass: REV,
    velmereWorldClassCompletionProgramPass: REV,
    velmereWorldClassCompletionProgramPath: programPath,
    velmere: {
      currentRevisionId: REV,
      currentRevisionParentId: PARENT,
      currentRootDescendantManifestPath: descendantPath,
      worldClassCompletionProgramPath: programPath,
    },
  });
  fs.writeFileSync(path.join(base, "VELMERE_ACTIVE_PASS.txt"), `${REV}\n`);
  const inventory = collectCurrentSource(base);
  const payload = sourcePayload(inventory.rows);
  const manifest = {
    schemaVersion: "velmere.pass36.a102r40.current-root-descendant-manifest.v1",
    revisionId: REV,
    parentRevisionId: PARENT,
    payload,
  };
  manifest.manifestDigestSha256 = sha256(canonicalJson(manifest));
  writeJson(base, descendantPath, manifest);
  return { base, descendantPath, programPath, modePath };
}

function mutateJson(base, relative, fn) {
  const file = path.join(base, relative);
  const before = fs.readFileSync(file);
  const data = JSON.parse(before.toString("utf8"));
  fn(data);
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
  return () => fs.writeFileSync(file, before);
}

const fixture = createFixture();
try {
  const valid = validateCurrentSourceAuthorityExact(fixture.base);
  check("fixture-valid", valid.passed && valid.mismatches.length === 0, valid);
  check("fixture-full-payload", valid.payload.fileCount >= 8 && valid.payload.aggregateSha256 === valid.declaredPayload.aggregateSha256, valid.payload);
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
    ["a58-schema-drift", "config/pass36/a58-release-integrity-policy.json", (d) => { d.archiveManifestSchemaVersion = "velmere.pass36.a102r39.source-only-package-manifest.v1"; }],
    ["a58-authority-status-drift", "config/pass36/a58-release-integrity-policy.json", (d) => { d.currentAuthorityVerifierExpectedStatus = "PASS_STALE"; }],
    ["a58-executable-count-drift", "config/pass36/a58-release-integrity-policy.json", (d) => { d.crossPlatformExecutablePathCount = 23; }],
    ["mode-policy-path-drift", "config/pass36/a58-release-integrity-policy.json", (d) => { d.crossPlatformSourceModePolicyPath = "config/pass36/missing.json"; }],
  ];
  for (const [id, relative, mutate] of jsonCases) {
    if (relative === "VELMERE_ACTIVE_PASS.txt") {
      const file = path.join(fixture.base, relative); const before = fs.readFileSync(file); fs.writeFileSync(file, "STALE\n");
      const result = validateCurrentSourceAuthorityExact(fixture.base); check(id, !result.passed && result.mismatches.length > 0, result.mismatches); fs.writeFileSync(file, before);
    } else {
      const restore = mutateJson(fixture.base, relative, mutate);
      let result;
      try { result = validateCurrentSourceAuthorityExact(fixture.base); } catch (error) { result = { passed: false, mismatches: [String(error)] }; }
      check(id, !result.passed && result.mismatches.length > 0, result.mismatches); restore();
    }
  }

  const manifestFile = path.join(fixture.base, fixture.descendantPath);
  const manifestBefore = fs.readFileSync(manifestFile);
  for (const [id, fn] of [
    ["manifest-revision-drift", (d) => { d.revisionId = "STALE"; }],
    ["manifest-parent-drift", (d) => { d.parentRevisionId = "STALE"; }],
    ["manifest-self-digest-drift", (d) => { d.manifestDigestSha256 = "0".repeat(64); }],
    ["manifest-payload-drift", (d) => { d.payload.aggregateSha256 = "1".repeat(64); d.manifestDigestSha256 = sha256(canonicalJson({ ...d, manifestDigestSha256: undefined })); }],
  ]) {
    const d = JSON.parse(manifestBefore.toString("utf8")); fn(d); fs.writeFileSync(manifestFile, `${JSON.stringify(d, null, 2)}\n`);
    const result = validateCurrentSourceAuthorityExact(fixture.base); check(id, !result.passed, result.mismatches); fs.writeFileSync(manifestFile, manifestBefore);
  }

  const appFile = path.join(fixture.base, "app.txt"); const appBefore = fs.readFileSync(appFile);
  fs.writeFileSync(appFile, "tampered\n"); check("source-byte-tamper", !validateCurrentSourceAuthorityExact(fixture.base).passed); fs.writeFileSync(appFile, appBefore);
  fs.writeFileSync(path.join(fixture.base, "extra.txt"), "extra\n"); check("source-extra-file", !validateCurrentSourceAuthorityExact(fixture.base).passed); fs.rmSync(path.join(fixture.base, "extra.txt"));
  fs.rmSync(appFile); check("source-missing-file", !validateCurrentSourceAuthorityExact(fixture.base).passed); fs.writeFileSync(appFile, appBefore);
  const sourceLinkPath = path.join(fixture.base, "link.txt");
  const sourceLink = createPortableRejectedSymlink(sourceLinkPath, "app.txt");
  try {
    check("source-symlink", !validateCurrentSourceAuthorityExact(fixture.base).passed, sourceLink.kind);
  } finally {
    sourceLink.cleanup();
  }

  const modePolicy = loadSourceModePolicy(fixture.base, fixture.modePath);
  const modeRejected = (relativePath, mode, platform) => {
    try {
      validateObservedSourceMode(relativePath, { mode }, modePolicy, platform);
      return false;
    } catch {
      return true;
    }
  };
  check("posix-executable-loss", modeRejected("scripts/run.mjs", 0o100644, "linux"));
  check("windows-executable-loss-accepted", !modeRejected("scripts/run.mjs", 0o100644, "win32"));
  check("posix-unexpected-executable", modeRejected("app.txt", 0o100755, "linux"));
  check("windows-unexpected-executable-nonauthority", !modeRejected("app.txt", 0o100755, "win32"));

  fs.rmSync(manifestFile); check("manifest-missing", !validateCurrentSourceAuthorityExact(fixture.base).passed); fs.writeFileSync(manifestFile, manifestBefore);
  check("fixture-restored", validateCurrentSourceAuthorityExact(fixture.base).passed);

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
  check("a63-exact-npm-cli-no-system-shim", a63Source.includes("process.execPath") && a63Source.includes("VELMERE_A79_NPM_CLI_PATH") && !a63Source.includes("npm.cmd"), null);

  const result = {
    schemaVersion: "velmere.pass36.a102r40.current-source-authority-preflight-test.v1",
    revisionId: REV,
    parentRevisionId: PARENT,
    generatedAt: "2026-08-01T06:00:00+02:00",
    status: "PASS_A102R40_CURRENT_SOURCE_AUTHORITY_PREFLIGHT_LOCAL_ONLY_NO_EXACT_BUILD_BROWSER_CREDIT",
    checks: checks.length,
    passed: checks.length,
    failed: 0,
    releaseSourceBindingSurfaces: releaseFiles.length,
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
  };
  fs.writeFileSync("config/pass36/a102r40-test-receipt.json", `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
} finally {
  fs.rmSync(fixture.base, { recursive: true, force: true });
}
