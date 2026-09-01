#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const REV = "VELMERE_PASS36_A102R39_ACTION_REQUIRED_CROSS_PLATFORM_SOURCE_MODE_IDENTITY_WINDOWS_UNPACK_AND_POSIX_EXECUTABLE_POLICY_NO_LIVE_CREDIT";
const PARENT = "VELMERE_PASS36_A102R38_ACTION_REQUIRED_PRODUCTION_SMOKE_UNIQUE_ASSERTION_RESULT_DENOMINATOR_AND_SOURCE_AUTHORITY_RECONCILIATION_NO_LIVE_CREDIT";
const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
let checks = 0;
const ok = (value, id) => { checks += 1; assert.ok(value, id); };
const active = fs.readFileSync("VELMERE_ACTIVE_PASS.txt", "utf8").trim();
const pkg = read("package.json");
const authority = read("config/pass36/current-release-authority.json");
const current = read("config/pass35/current-revision.json");
const compatibility = read("config/current-release.json");
const roadmap = fs.readFileSync("VELMERE_WORLD_CLASS_MAX_ROADMAP_PASS35.txt", "utf8");
const parentPackageManifest = read("config/pass36/a102r39-parent-source-package-manifest.json");
const state = read("config/pass36/a102r39-action-required-current-state.json");
const program = read("config/pass36/a102r39-world-class-completion-program.json");
const test = read("config/pass36/a102r39-test-receipt.json");
const modePolicy = read("config/pass36/a102r39-cross-platform-source-mode-policy.json");
const a58 = read("config/pass36/a58-release-integrity-policy.json");

ok(active === REV, "active");
ok(pkg.velmerePass === REV && pkg.velmerePatch === "VELMERE_A102R39_PATCH.txt", "package");
ok(pkg.velmere.currentRevisionId === REV && pkg.velmere.currentRevisionParentId === PARENT, "package-identity");
ok(pkg.velmere.worldClassCompletionProgramPath === "config/pass36/a102r39-world-class-completion-program.json" && pkg.velmere.currentRootDescendantManifestPath === "config/pass36/a102r39-current-root-descendant-manifest.json", "package-paths");
ok(authority.authorityRevisionId === REV && authority.sourceRevisionId === REV && authority.sourceParentRevisionId === PARENT, "authority");
ok(authority.currentSource.revisionId === REV && authority.currentSource.parentRevisionId === PARENT, "authority-current");
ok(authority.worldClassCompletionProgramRevisionId === REV && authority.currentRootDescendantManifestRevisionId === REV, "authority-program");
ok(authority.claims.currentRevisionId === REV && authority.claims.parentRevisionId === PARENT && authority.claims.a102r39ModePolicyChecks === 21, "claims");
ok(authority.claims.a102r39A58CrossPlatformChecks === 45 && authority.claims.a102r39ExecutablePaths === 23, "claims-target");
ok(authority.claims.a102r39WindowsFilesystemModeAuthority === false && authority.claims.a102r39PosixExactPermissionParity === true && authority.claims.a102r39CrossPlatformPayloadParity === true, "claims-mode");
ok(current.sourceRevisionId === REV && current.sourceParentRevisionId === PARENT && current.worldClassCompletionProgramRevisionId === REV && current.currentRootDescendantManifestRevisionId === REV, "current-revision");
ok(compatibility.sourceRevisionId === "VELMERE_PASS35_A32_REPORT_DELIVERY_EVIDENCE_NON_VISUAL" && compatibility.authoritativeCurrentSourceRevisionId === REV && compatibility.authoritativeCurrentSourceParentRevisionId === PARENT, "compatibility");
ok(roadmap.startsWith(`VELMERE WORLD-CLASS MAX ROADMAP — CURRENT SOURCE AUTHORITY HEADER\nPASS36 A102R39`) && roadmap.includes("PRESERVED PRIOR CANONICAL ROADMAP CONTENT — A102R38 AND EARLIER"), "roadmap-precedence");
ok(parentPackageManifest.revisionId === PARENT && parentPackageManifest.manifestPath === "_velmere/PASS36_A102R38_SOURCE_ONLY_MANIFEST.json" && parentPackageManifest.fileCount === 5435, "parent-package-manifest");
ok(state.revisionId === REV && state.parentRevisionId === PARENT && state.localImplementation.modePolicyChecks === 21, "state");
ok(state.localImplementation.executablePathDenominator === 23 && state.localImplementation.windowsFilesystemModeAuthority === false && state.localImplementation.posixExactPermissionParity === true, "state-mode");
ok(program.revisionId === REV && program.parentRevisionId === PARENT && program.formalOpenEntries === 31, "program");
ok(program.a102r39.crossPlatformSourceModeChecks === 21 && program.a102r39.a58ReleaseIntegrityCrossPlatformChecks === 45 && program.a102r39.passCredit === false, "program-target");
ok(test.revisionId === REV && test.checks === 21 && test.failed === 0 && test.crossPlatformInventoryParity === true, "test");
ok(modePolicy.revisionId === REV && modePolicy.parentRevisionId === PARENT && modePolicy.executablePaths.length === 23, "mode-policy");
ok(modePolicy.windowsFilesystemModeIsAuthority === false && modePolicy.posixFilesystemModeIsAuthority === true && modePolicy.processExecPathRequired === true && modePolicy.shellFalseRequired === true, "mode-policy-truth");
ok(a58.currentSourceRevisionId === REV && a58.currentWorldClassCompletionProgramRevisionId === REV, "a58-current");
ok(a58.currentDescendantManifestPath === "config/pass36/a102r39-current-root-descendant-manifest.json" && a58.currentAuthorityVerifierPath === "scripts/pass36/verify-a102r39-action-required-authority.mjs", "a58-paths");
ok(a58.archiveManifestPath === "_velmere/PASS36_A102R39_SOURCE_ONLY_MANIFEST.json" && a58.archiveManifestContract.schemaVersion === "velmere.pass36.a102r39.source-only-package-manifest.v1", "a58-archive");
ok(a58.crossPlatformSourceModePolicyPath === "config/pass36/a102r39-cross-platform-source-mode-policy.json" && a58.crossPlatformExecutablePathCount === 23, "a58-mode-policy");
const a58Source = fs.readFileSync("scripts/pass36/verify-a58-release-integrity.mjs", "utf8");
ok(a58Source.includes("loadSourceModePolicy") && a58Source.includes("canonicalSourceMode") && a58Source.includes("validateObservedSourceMode"), "a58-wiring");
const boundarySource = fs.readFileSync("scripts/pass36/a102r39-source-boundary.mjs", "utf8");
ok(boundarySource.includes("platform: \"win32\"") === false && boundarySource.includes("options.platform ?? process.platform"), "boundary-platform-contract");
ok(authority.claims.decision === "NO_GO" && !authority.claims.liveProven && !authority.claims.saleEnabled && !authority.claims.productionApproved && !authority.claims.worldClassProven, "promotion");
console.log(JSON.stringify({
  status: "PASS_A102R39_ACTION_REQUIRED_AUTHORITY_CROSS_PLATFORM_MODE_IDENTITY_NO_FRESH_EXACT_WINDOWS_BUILD_BROWSER_STAGING_OR_SALE_CREDIT",
  checksPassed: checks,
  checksFailed: 0,
  revisionId: REV,
  parentRevisionId: PARENT,
  globalDecision: "NO_GO",
  live: false,
  saleEnabled: false,
  productionApproved: false,
  worldClassProven: false,
}, null, 2));
