#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import { canonicalJson } from "../pass4826/release-package-contract.mjs";

const MIGRATION_PATH = "config/pass36/a102r44p12-a60-typescript-root-denominator-migration.json";
const POLICY_PATH = "config/pass36/a60-exact-final-byte-build-browser-acceptance.json";
const HISTORICAL_PATH = "config/pass36/a102r41-a60-post-build-typescript-denominator-migration.json";
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

function rootsFor(root) {
  const loaded = ts.readConfigFile(path.join(root, "tsconfig.json"), ts.sys.readFile);
  if (loaded.error) throw new Error("r44p12_tsconfig_read_failed");
  const parsed = ts.parseJsonConfigFileContent(loaded.config, ts.sys, root);
  if (parsed.errors.length) throw new Error("r44p12_tsconfig_parse_failed");
  return parsed.fileNames.map((file) => path.relative(root, file).replaceAll("\\", "/")).sort();
}

export function verifyR44P12A60TypeScriptRootDenominatorMigration(root = process.cwd()) {
  const migration = JSON.parse(fs.readFileSync(path.join(root, MIGRATION_PATH), "utf8"));
  const policy = JSON.parse(fs.readFileSync(path.join(root, POLICY_PATH), "utf8"));
  const historical = JSON.parse(fs.readFileSync(path.join(root, HISTORICAL_PATH), "utf8"));
  const roots = rootsFor(root);
  const generated = roots.filter((file) => file.startsWith(".next-pass25-webpack/") || file.startsWith(".next-pass25-turbopack/"));
  const source = roots.filter((file) => !generated.includes(file));
  const current = migration.currentPhysicalDenominator;
  const observedProfile = generated.length === 0 ? current.preBuildProfile : generated.length === current.generatedRoots ? current.postBuildProfile : "INVALID_PARTIAL_GENERATED_ROOT_PROFILE";
  const checks = [];
  const check = (id, ok, detail = null) => checks.push({ id, ok: Boolean(ok), detail });
  check("schema", migration.schemaVersion === "velmere.pass36.a102r44p12.a60-typescript-root-denominator-migration.v1");
  check("historical-path", migration.historicalDeclaration.migrationPath === HISTORICAL_PATH);
  check("historical-values", historical.typescriptRootDenominatorMigration.preBuildSourceRootDenominator === 159 && historical.typescriptRootDenominatorMigration.postDualBuildRootDenominator === 300 && historical.typescriptRootDenominatorMigration.addedGeneratedRoots === 141);
  check("stale-declaration-recorded", migration.historicalDeclaration.preBuildRootDenominator === 159 && migration.historicalDeclaration.postDualBuildRootDenominator === 300 && migration.historicalDeclaration.generatedRootDenominator === 141 && migration.historicalDeclaration.supportedByCurrentTsconfig === false);
  check("current-denominator", current.preBuildSourceRoots === 160 && current.postDualBuildRoots === 301 && current.generatedRoots === 141);
  check("retention", current.retainedPhysicalSourceRoots === 160 && current.removedSourceRoots === 0 && current.removedGeneratedRoots === 0);
  check("stage-denominator-stable", migration.a60StageDenominator.before === 14 && migration.a60StageDenominator.after === 14 && migration.a60StageDenominator.retained === 14 && migration.a60StageDenominator.added === 0 && migration.a60StageDenominator.removed === 0);
  check("policy-root-contract", policy.typescript.preBuildExpectedRootFiles === 160 && policy.typescript.postDualBuildExpectedRootFiles === 301 && policy.typescript.postDualBuildGeneratedRootFiles === 141 && policy.typescript.denominatorMigrationPath === MIGRATION_PATH && policy.typescript.rootFilesCoveredMustEqualConfiguredRootFiles === true && policy.typescript.maximumDiagnostics === 0);
  check("observed-profile", observedProfile === current.preBuildProfile || observedProfile === current.postBuildProfile, { observedProfile, total: roots.length, generated: generated.length });
  check("observed-source-roots", source.length === 160, source.length);
  check("observed-total-roots", roots.length === (observedProfile === current.preBuildProfile ? 160 : 301), roots.length);
  check("observed-generated-roots", generated.length === (observedProfile === current.preBuildProfile ? 0 : 141), generated.length);
  check("evidence-r44p10", migration.evidenceReceipts.r44p10PreBuild.configured === 160 && migration.evidenceReceipts.r44p10PreBuild.covered === 160 && migration.evidenceReceipts.r44p10PreBuild.diagnostics === 0);
  check("evidence-r44p11-pre", migration.evidenceReceipts.r44p11PreBuild.configured === 160 && migration.evidenceReceipts.r44p11PreBuild.covered === 160 && migration.evidenceReceipts.r44p11PreBuild.diagnostics === 0);
  check("evidence-r44p11-post", migration.evidenceReceipts.r44p11PostBuild.configured === 301 && migration.evidenceReceipts.r44p11PostBuild.covered === 301 && migration.evidenceReceipts.r44p11PostBuild.diagnostics === 0);
  check("negative-prebuild-collapse", 159 !== current.preBuildSourceRoots);
  check("negative-postbuild-collapse", 300 !== current.postDualBuildRoots);
  check("negative-coverage-collapse", !(301 === 300));
  check("no-bypass", migration.testsDeleted === 0 && migration.skipsAdded === 0 && migration.timeoutsIncreased === 0 && migration.denominatorsReduced === 0);
  check("truth-boundary", migration.scoreCredit === false && migration.globalDecision === "NO_GO" && migration.live === false && migration.saleEnabled === false && migration.productionApproved === false && migration.worldClassProven === false);
  const core = { ...migration }; delete core.migrationDigestSha256;
  check("self-digest", /^[a-f0-9]{64}$/u.test(migration.migrationDigestSha256 ?? "") && migration.migrationDigestSha256 === sha256(canonicalJson(core)));
  const failed = checks.filter((row) => !row.ok);
  return { schemaVersion: "velmere.pass36.a102r44p12.a60-typescript-root-denominator-migration-verification.v1", status: failed.length ? "FAIL_R44P12_A60_TYPESCRIPT_ROOT_DENOMINATOR_MIGRATION" : "PASS_R44P12_A60_TYPESCRIPT_ROOT_DENOMINATOR_MIGRATION_NO_PROMOTION", revisionId: migration.revisionId, checks: checks.length, passed: checks.length - failed.length, failed: failed.length, observedProfile, observedRootFiles: roots.length, observedSourceRootFiles: source.length, observedGeneratedRootFiles: generated.length, preBuildRootDenominator: current.preBuildSourceRoots, postDualBuildRootDenominator: current.postDualBuildRoots, failures: failed, globalDecision: "NO_GO", live: false, saleEnabled: false };
}

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invoked === import.meta.url) {
  const result = verifyR44P12A60TypeScriptRootDenominatorMigration();
  console.log(JSON.stringify(result, null, 2));
  if (result.failed) process.exit(1);
}
