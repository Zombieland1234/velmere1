#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { validateCurrentSourceAuthorityExact } from "./current-source-authority-lib.mjs";
import {
  PARENT_REVISION_ID as PARENT,
  REVISION_ID as REVISION,
  SOURCE_MANIFEST_PATH as MANIFEST,
  SOURCE_MANIFEST_SCHEMA as MANIFEST_SCHEMA,
  buildSourceManifest,
  canonicalJson,
  sha256,
} from "./r44p46-packaging-lib.mjs";

const PROGRAM = "config/pass36/r44p45-continuous-closure-policy.json";
const LEDGER = "VELMERE_CURRENT_STATE_AND_PASS_LEDGER_PASS36_A102R44P46_ACTION_REQUIRED_LEGACY_MULTIPLICATION_ECONOMIC_SINK_TRUTH_REBASE_NO_LIVE_CREDIT.txt";
const VERIFIER = "scripts/pass36/verify-a102r44p46-current-source-authority.mjs";
const VERIFIER_STATUS = "PASS_A102R44P46_CURRENT_SOURCE_AUTHORITY_EXACT_NO_LIVE_OR_SALE_CREDIT";
const checks = [];
const check = (id, passed, detail = null) => {
  const row = { id, passed: Boolean(passed), detail };
  checks.push(row);
};

function writeJson(root, relativePath, value) {
  const target = path.join(root, ...relativePath.split("/"));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

const noPromotion = (value) => Object.assign(value, {
  globalDecision: "NO_GO",
  LIVE: false,
  saleEnabled: false,
  productionApproved: false,
  worldClassProven: false,
});

const identity = (value) => Object.assign(value, {
  revisionId: REVISION,
  currentRevisionId: REVISION,
  sourceRevisionId: REVISION,
  authorityRevisionId: REVISION,
  currentReleaseAuthorityRevisionId: REVISION,
  currentRootDescendantManifestRevisionId: REVISION,
  parentRevisionId: PARENT,
  sourceParentRevisionId: PARENT,
  currentRevisionParentId: PARENT,
  authoritativeCurrentSourceRevisionId: REVISION,
  authoritativeCurrentSourceParentRevisionId: PARENT,
  sourceManifestPath: MANIFEST,
  currentRootDescendantManifestPath: MANIFEST,
  authoritativeCurrentRootDescendantManifestPath: MANIFEST,
  currentStateAndPassLedgerFileName: LEDGER,
  currentStateLedgerArtifact: LEDGER,
  legacyRoadmapStatus: "HISTORICAL_PARENT_EVIDENCE",
});

function writeManifest(root) {
  const manifest = buildSourceManifest(root);
  writeJson(root, MANIFEST, manifest);
  return manifest;
}

function createFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-r44p46-current-source-"));
  fs.writeFileSync(path.join(root, "VELMERE_ACTIVE_PASS.txt"), `${REVISION}\n`, "utf8");
  fs.writeFileSync(path.join(root, "app.txt"), "fixture-source\n", "utf8");
  writeJson(root, "config/pass36/current-release-authority.json", identity(noPromotion({
    worldClassCompletionProgramPath: PROGRAM,
    live: false,
    currentSource: noPromotion({
      authorityRole: "SOURCE_ONLY",
      revisionId: REVISION,
      parentRevisionId: PARENT,
      sourceManifestPath: MANIFEST,
      currentStateLedgerArtifact: LEDGER,
    }),
    claims: { liveProven: false, saleEnabled: false, productionApproved: false, worldClassProven: false },
  })));
  writeJson(root, "config/pass35/current-revision.json", identity(noPromotion({
    worldClassCompletionProgramPath: PROGRAM,
    live: false,
    liveProven: false,
  })));
  writeJson(root, "config/current-release.json", identity(noPromotion({
    worldClassCompletionProgramPath: PROGRAM,
    live: false,
    liveProven: false,
  })));
  writeJson(root, "config/pass36/a58-release-integrity-policy.json", {
    currentSourceRevisionId: REVISION,
    currentCheckpointRevisionId: REVISION,
    currentCheckpointParentRevisionId: PARENT,
    currentDescendantManifestPath: MANIFEST,
    currentAuthorityVerifierPath: VERIFIER,
    currentAuthorityVerifierExpectedStatus: VERIFIER_STATUS,
    archiveManifestPath: MANIFEST,
    archiveManifestSchemaVersion: MANIFEST_SCHEMA,
    crossPlatformSourceModePolicyPath: "config/pass36/a102r44-cross-platform-source-mode-policy.json",
    archiveManifestContract: {
      revisionId: REVISION,
      parentRevisionId: PARENT,
      path: MANIFEST,
      manifestPath: MANIFEST,
      schemaVersion: MANIFEST_SCHEMA,
      manifestExcludedFromOwnInventory: true,
      sourceFingerprintField: "sourceAggregateSha256",
      selfDigestField: "manifestSha256",
    },
  });
  writeJson(root, "config/pass36/a60-exact-final-byte-build-browser-acceptance.json", {
    currentSourceRevisionId: REVISION,
    currentSourceParentRevisionId: PARENT,
    sourceManifestPath: MANIFEST,
    currentSourceAuthorityPath: "config/pass36/current-release-authority.json",
    currentSourceProfile: "R44P46_SOURCE_ONLY_MANIFEST_V1",
    sourceManifestSchema: MANIFEST_SCHEMA,
    sourceFingerprintField: "sourceAggregateSha256",
    manifestFileSha256AnchorRequired: true,
  });
  writeJson(root, "package.json", {
    velmerePass: REVISION,
    velmereCurrentReleaseAuthorityPass: REVISION,
    velmereCurrentRootDescendantManifestPath: MANIFEST,
    velmereCurrentStateAndPassLedgerFileName: LEDGER,
    authorityRevisionId: REVISION,
    velmerePassMetadata: { currentRevisionId: REVISION, parentRevisionId: PARENT },
    velmere: identity(noPromotion({ worldClassCompletionProgramPath: PROGRAM })),
  });
  writeManifest(root);
  return root;
}

function mutateJson(root, relativePath, mutate) {
  const target = path.join(root, ...relativePath.split("/"));
  const before = fs.readFileSync(target);
  const value = JSON.parse(before.toString("utf8"));
  mutate(value);
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return () => fs.writeFileSync(target, before);
}

function validate(root) {
  return validateCurrentSourceAuthorityExact(root, { expectedRevisionId: REVISION });
}

const root = createFixture();
try {
  const valid = validate(root);
  check("valid-r46-profile", valid.passed, valid.mismatches);
  check("exact-manifest-schema-path", valid.manifestSchema === MANIFEST_SCHEMA && valid.manifestPath === MANIFEST);
  check("exact-fingerprint", valid.sourceFingerprint === valid.payload.aggregateSha256 && /^[a-f0-9]{64}$/u.test(valid.sourceFingerprint));
  check("exact-manifest-file-anchor", /^[a-f0-9]{64}$/u.test(valid.manifestSha256));

  const manifestTarget = path.join(root, ...MANIFEST.split("/"));
  const manifestBefore = fs.readFileSync(manifestTarget);
  for (const [id, mutate] of [
    ["manifest-schema-tamper", (value) => { value.schemaVersion = "stale.schema"; }],
    ["manifest-revision-tamper", (value) => { value.revisionId = PARENT; }],
    ["manifest-self-digest-tamper", (value) => { value.manifestSha256 = "0".repeat(64); }],
    ["manifest-fingerprint-tamper", (value) => {
      value.sourceAggregateSha256 = "1".repeat(64);
      const core = { ...value };
      delete core.manifestSha256;
      value.manifestSha256 = sha256(canonicalJson(core));
    }],
  ]) {
    const value = JSON.parse(manifestBefore.toString("utf8"));
    mutate(value);
    fs.writeFileSync(manifestTarget, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    const result = validate(root);
    check(id, !result.passed && result.mismatches.length > 0, result.mismatches);
    fs.writeFileSync(manifestTarget, manifestBefore);
  }

  const appTarget = path.join(root, "app.txt");
  const appBefore = fs.readFileSync(appTarget);
  fs.writeFileSync(appTarget, "tampered-source\n", "utf8");
  check("source-byte-tamper", !validate(root).passed);
  fs.writeFileSync(appTarget, appBefore);
  fs.writeFileSync(path.join(root, "unexpected.txt"), "unexpected\n", "utf8");
  check("source-extra-file", !validate(root).passed);
  fs.rmSync(path.join(root, "unexpected.txt"));

  for (const [id, relativePath, mutate, expectedMismatch] of [
    ["package-top-authority-tamper", "package.json", (value) => { value.authorityRevisionId = PARENT; }, "package-authority-revision"],
    ["a58-verifier-tamper", "config/pass36/a58-release-integrity-policy.json", (value) => { value.currentAuthorityVerifierPath = "scripts/stale.mjs"; }, "a58-authority-verifier-path"],
    ["a60-manifest-profile-tamper", "config/pass36/a60-exact-final-byte-build-browser-acceptance.json", (value) => { value.sourceManifestSchema = "stale.schema"; }, "r46-a60-schema"],
    ["authority-ledger-tamper", "config/pass36/current-release-authority.json", (value) => { value.currentStateLedgerArtifact = "stale-ledger.txt"; }, "authority-ledger"],
    ["authority-live-alias-promotion", "config/pass36/current-release-authority.json", (value) => { value.live = true; }, "authority:live"],
    ["current-live-proven-alias-promotion", "config/pass35/current-revision.json", (value) => { value.liveProven = true; }, "current:liveProven"],
    ["current-required-live-alias-missing", "config/pass35/current-revision.json", (value) => { delete value.live; }, "current:live"],
    ["current-source-optional-promotion-added", "config/pass36/current-release-authority.json", (value) => { value.currentSource.promotionAllowed = true; }, "authority-current-source:promotionAllowed"],
    ["compatibility-promotion-alias-added", "config/current-release.json", (value) => { value.promotionAllowed = true; }, "compatibility:promotionAllowed"],
    ["package-root-promotion-alias-added", "package.json", (value) => { value.promotionAllowed = true; }, "package:promotionAllowed"],
    ["package-velmere-live-alias-added", "package.json", (value) => { value.velmere.live = true; }, "package-velmere:live"],
  ]) {
    const restore = mutateJson(root, relativePath, mutate);
    writeManifest(root);
    const result = validate(root);
    check(id, !result.passed && result.mismatches.some((row) => row.id === expectedMismatch), result.mismatches);
    restore();
    writeManifest(root);
  }

  const linkPath = path.join(root, "unsafe-link.txt");
  fs.symlinkSync("app.txt", linkPath);
  const symlinkResult = validate(root);
  check("source-symlink-rejected", !symlinkResult.passed && symlinkResult.mismatches.some((row) => row.id === "r46-source-inventory"), symlinkResult.mismatches);
  fs.unlinkSync(linkPath);
  check("fixture-restored", validate(root).passed, validate(root).mismatches);
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

const failed = checks.filter((row) => !row.passed);
process.stdout.write(`${JSON.stringify({
  schemaVersion: "velmere.pass36.a102r44p46.current-source-authority-preflight-test.v1",
  revisionId: REVISION,
  status: failed.length ? "FAIL_A102R44P46_CURRENT_SOURCE_AUTHORITY_PREFLIGHT" : "PASS_A102R44P46_CURRENT_SOURCE_AUTHORITY_PREFLIGHT_AND_TAMPER_NO_LIVE_OR_SALE_CREDIT",
  checks: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  exactBuildExecuted: false,
  browserExecuted: false,
  globalDecision: "NO_GO",
  LIVE: false,
  saleEnabled: false,
  productionApproved: false,
  worldClassProven: false,
  rows: checks,
}, null, 2)}\n`);
if (failed.length) process.exitCode = 1;
