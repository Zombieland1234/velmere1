import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import { canonicalJson } from "../pass4826/release-package-contract.mjs";

const REVISION_ID = "VELMERE_PASS36_A102R41_ACTION_REQUIRED_SECURITY_EVIDENCE_AUTHORITY_EXACT_WINDOWS_AND_FAIL_CLOSED_RELEASE_PACKAGING_NO_LIVE_CREDIT";
const MIGRATION_PATH = "config/pass36/a102r41-a60-post-build-typescript-denominator-migration.json";
const STAGE_AUTHORITY_MIGRATION_PATH = "config/pass36/a102r41-a60-stage-authority-migration.json";
const POLICY_PATH = "config/pass36/a60-exact-final-byte-build-browser-acceptance.json";
const RUNNER_PATH = "scripts/a60-exact-final-byte-build-browser-acceptance.mjs";
const TSCONFIG_PATH = "tsconfig.json";
const PACKAGE_PATH = "package.json";
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const unique = (values) => Array.isArray(values) && new Set(values).size === values.length;

function parsedTypeScriptRoots(root) {
  const configPath = path.join(root, TSCONFIG_PATH);
  const loaded = ts.readConfigFile(configPath, ts.sys.readFile);
  if (loaded.error) throw new Error("a102r41_typescript_denominator_tsconfig_read_failed");
  const parsed = ts.parseJsonConfigFileContent(loaded.config, ts.sys, root);
  if (parsed.errors.length) throw new Error("a102r41_typescript_denominator_tsconfig_parse_failed");
  return parsed.fileNames.map((file) => path.relative(root, file).replaceAll("\\", "/")).sort();
}

function coverageValid({ configured, covered, profile }, migration) {
  const roots = migration.typescriptRootDenominatorMigration;
  const expected = profile === roots.preBuildProfile
    ? roots.preBuildSourceRootDenominator
    : profile === roots.postBuildProfile
      ? roots.postDualBuildRootDenominator
      : null;
  return Number.isInteger(expected) && configured === expected && covered === configured;
}

export function verifyA60PostBuildTypeScriptDenominatorMigration(root = process.cwd()) {
  const migration = JSON.parse(fs.readFileSync(path.join(root, MIGRATION_PATH), "utf8"));
  const priorMigration = JSON.parse(fs.readFileSync(path.join(root, STAGE_AUTHORITY_MIGRATION_PATH), "utf8"));
  const policy = JSON.parse(fs.readFileSync(path.join(root, POLICY_PATH), "utf8"));
  const runner = fs.readFileSync(path.join(root, RUNNER_PATH), "utf8");
  const tsconfig = JSON.parse(fs.readFileSync(path.join(root, TSCONFIG_PATH), "utf8"));
  const pkg = JSON.parse(fs.readFileSync(path.join(root, PACKAGE_PATH), "utf8"));
  const roots = parsedTypeScriptRoots(root);
  const generatedRoots = roots.filter((file) => file.startsWith(".next-pass25-webpack/") || file.startsWith(".next-pass25-turbopack/"));
  const sourceRoots = roots.filter((file) => !generatedRoots.includes(file));
  const rootPolicy = migration.typescriptRootDenominatorMigration ?? {};
  const observedProfile = generatedRoots.length === 0
    ? rootPolicy.preBuildProfile
    : generatedRoots.length === rootPolicy.addedGeneratedRoots
      ? rootPolicy.postBuildProfile
      : "INVALID_PARTIAL_GENERATED_ROOT_PROFILE";
  const checks = [];
  const check = (id, passed, detail = null) => checks.push({ id, passed: Boolean(passed), detail });

  check("schema", migration.schemaVersion === "velmere.pass36.a102r41.a60-post-build-typescript-denominator-migration.v1");
  check("revision", migration.revisionId === REVISION_ID);
  check("stage-denominator-increase", migration.oldStageDenominator === 13 && migration.newStageDenominator === 14);
  check("old-stage-set", migration.oldRequiredStages?.length === 13 && unique(migration.oldRequiredStages));
  check("new-stage-set", migration.newRequiredStages?.length === 14 && unique(migration.newRequiredStages));
  check("retained-stage-set", migration.retainedStageIds?.length === 13 && unique(migration.retainedStageIds));
  check("retained-old", migration.retainedStageIds?.every((id) => migration.oldRequiredStages?.includes(id)));
  check("retained-new", migration.retainedStageIds?.every((id) => migration.newRequiredStages?.includes(id)));
  check("added-stage-exact", canonicalJson(migration.addedStageIds) === canonicalJson(["post-build-typecheck"]));
  check("removed-stage-zero", Array.isArray(migration.removedStageIds) && migration.removedStageIds.length === 0);
  check("prior-migration-bound", canonicalJson(migration.oldRequiredStages) === canonicalJson(priorMigration.newRequiredStages));
  check("policy-stage-set-exact", canonicalJson(policy.requiredStages) === canonicalJson(migration.newRequiredStages));
  check("stage-order", policy.requiredStages.indexOf("build-turbopack") < policy.requiredStages.indexOf("post-build-typecheck") && policy.requiredStages.indexOf("post-build-typecheck") < policy.requiredStages.indexOf("production-server-ready"));
  check("root-denominator-increase", rootPolicy.preBuildSourceRootDenominator === 159 && rootPolicy.postDualBuildRootDenominator === 300);
  check("root-retained", rootPolicy.retainedSourceRoots === 159);
  check("root-added", rootPolicy.addedGeneratedRoots === 141);
  check("root-removed-zero", rootPolicy.removedSourceRoots === 0);
  check("coverage-policy", rootPolicy.coveragePolicy === "EXACT_DISCOVERED_TSCONFIG_ROOTS_AT_EXECUTION");
  check("policy-root-contract", policy.typescript?.preBuildExpectedRootFiles === 159 && policy.typescript?.postDualBuildExpectedRootFiles === 300 && policy.typescript?.postDualBuildGeneratedRootFiles === 141 && policy.typescript?.preBuildMinimumTransitiveFirstPartyFiles === 1535 && policy.typescript?.postDualBuildMinimumTransitiveFirstPartyFiles === 1676 && policy.typescript?.minimumToolingSyntaxFiles === 175 && policy.typescript?.rootFilesCoveredMustEqualConfiguredRootFiles === true && policy.typescript?.maximumDiagnostics === 0 && policy.typescript?.denominatorMigrationPath === MIGRATION_PATH);
  check("tsconfig-webpack-types", tsconfig.include?.includes(".next-pass25-webpack/types/**/*.ts") && tsconfig.include?.includes(".next-pass25-webpack/dev/types/**/*.ts"));
  check("tsconfig-turbopack-types", tsconfig.include?.includes(".next-pass25-turbopack/types/**/*.ts") && tsconfig.include?.includes(".next-pass25-turbopack/dev/types/**/*.ts"));
  check("typecheck-runner-exact", pkg.scripts?.typecheck === "node scripts/pass13/run-partitioned-typescript.mjs" && migration.typecheckRunnerPath === "scripts/pass13/run-partitioned-typescript.mjs");
  const turboIndex = runner.indexOf('runNpmStage("build-turbopack"');
  const postTypeIndex = runner.indexOf('runNpmStage("post-build-typecheck"');
  const buildIdIndex = runner.indexOf("buildId = readBuildId()");
  check("runner-post-build-stage", turboIndex >= 0 && postTypeIndex > turboIndex && buildIdIndex > postTypeIndex);
  check("runner-pre-build-denominator", runner.includes('validateTypeScriptArtifact(policy.typescript.preBuildExpectedRootFiles'));
  check("runner-post-build-denominator", runner.includes('validateTypeScriptArtifact(policy.typescript.postDualBuildExpectedRootFiles'));
  check("runner-exact-root-coverage", runner.includes("value.rootFilesCovered !== expectedRootFiles") && runner.includes("value.configuredRootFiles !== expectedRootFiles") && runner.includes("parseStrictJsonCli(artifactSnapshot.bytes.toString") && runner.includes("maxBytes: 16 * 1024 * 1024") && !/parseStrictJsonCli[\s\S]{0,1024}maxBytes:\s*128\s*\*\s*1024\s*\*\s*1024/u.test(runner) && runner.includes("VELMERE_RUNTIME_DIST_DIR: policy.runtimeBuildOutput.distDir") && !runner.includes('path.join(root, ".next/BUILD_ID")'));
  check("observed-root-profile", observedProfile === rootPolicy.preBuildProfile || observedProfile === rootPolicy.postBuildProfile, { observedProfile, configuredRootFiles: roots.length, generatedRootFiles: generatedRoots.length });
  check("observed-source-root-denominator", sourceRoots.length === rootPolicy.preBuildSourceRootDenominator, sourceRoots.length);
  check("observed-total-denominator", roots.length === (observedProfile === rootPolicy.preBuildProfile ? 159 : 300), roots.length);
  check("negative-prebuild-collapse", coverageValid({ configured: 158, covered: 158, profile: rootPolicy.preBuildProfile }, migration) === false);
  check("negative-postbuild-collapse", coverageValid({ configured: 299, covered: 299, profile: rootPolicy.postBuildProfile }, migration) === false);
  check("negative-coverage-collapse", coverageValid({ configured: 300, covered: 299, profile: rootPolicy.postBuildProfile }, migration) === false);
  check("no-test-bypass", migration.testsDeleted === 0 && migration.skipsAdded === 0 && migration.timeoutsIncreased === 0);
  check("truth-boundary", migration.scoreCredit === false && migration.globalDecision === "NO_GO" && migration.live === false && migration.saleEnabled === false && migration.productionApproved === false && migration.worldClassProven === false);
  const core = { ...migration };
  delete core.migrationDigestSha256;
  check("self-digest", /^[a-f0-9]{64}$/u.test(migration.migrationDigestSha256) && migration.migrationDigestSha256 === sha256(canonicalJson(core)));

  const failures = checks.filter((row) => !row.passed);
  return {
    schemaVersion: "velmere.pass36.a102r41.a60-post-build-typescript-denominator-migration-verification.v1",
    revisionId: REVISION_ID,
    status: failures.length === 0 ? "PASS_A102R41_A60_POST_BUILD_TYPESCRIPT_DENOMINATOR_MIGRATION_NO_PROMOTION" : "FAIL_A102R41_A60_POST_BUILD_TYPESCRIPT_DENOMINATOR_MIGRATION",
    checks: checks.length,
    passed: checks.length - failures.length,
    failed: failures.length,
    oldStageDenominator: migration.oldStageDenominator,
    newStageDenominator: migration.newStageDenominator,
    retainedStages: migration.retainedStageIds?.length ?? 0,
    addedStages: migration.addedStageIds?.length ?? 0,
    removedStages: migration.removedStageIds?.length ?? 0,
    preBuildRootDenominator: rootPolicy.preBuildSourceRootDenominator,
    postDualBuildRootDenominator: rootPolicy.postDualBuildRootDenominator,
    observedProfile,
    observedRootFiles: roots.length,
    observedGeneratedRootFiles: generatedRoots.length,
    failures,
    globalDecision: "NO_GO",
    live: false,
    saleEnabled: false,
    productionApproved: false,
    worldClassProven: false
  };
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  const result = verifyA60PostBuildTypeScriptDenominatorMigration();
  console.log(JSON.stringify(result, null, 2));
  if (result.failed) process.exit(1);
}
