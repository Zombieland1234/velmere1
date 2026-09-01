import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  canonicalSourceMode,
  loadSourceModePolicy,
  validateObservedSourceMode,
} from "./source-mode-policy.mjs";
import { parseStrictJsonCli } from "./strict-json-cli.mjs";
import { readDescriptorBoundRegularFile } from "./descriptor-bound-regular-file.mjs";
import {
  PARENT_REVISION_ID as R46_PARENT_REVISION,
  REVISION_ID as R46_REVISION,
  SOURCE_MANIFEST_PATH as R46_SOURCE_MANIFEST_PATH,
  SOURCE_MANIFEST_SCHEMA as R46_SOURCE_MANIFEST_SCHEMA,
  collectTree as collectR46SourceTree,
  sourceAggregate as r46SourceAggregate,
  sourcePathSet as r46SourcePathSet,
  sourceRowsForManifest as r46SourceRowsForManifest,
  validateSourceManifest as validateR46SourceManifest,
} from "./r44p46-packaging-lib.mjs";

const AUTHORITY_PATH = "config/pass36/current-release-authority.json";
const CURRENT_REVISION_PATH = "config/pass35/current-revision.json";
const COMPATIBILITY_RELEASE_PATH = "config/current-release.json";
const A58_POLICY_PATH = "config/pass36/a58-release-integrity-policy.json";
const PACKAGE_PATH = "package.json";
const ACTIVE_PASS_PATH = "VELMERE_ACTIVE_PASS.txt";
const R40_REVISION = "VELMERE_PASS36_A102R40_ACTION_REQUIRED_CURRENT_SOURCE_AUTHORITY_EXACT_BUILD_PREFLIGHT_AND_STALE_RELEASE_POINTER_RECONCILIATION_NO_LIVE_CREDIT";
const R41_REVISION = "VELMERE_PASS36_A102R41_ACTION_REQUIRED_SECURITY_EVIDENCE_AUTHORITY_EXACT_WINDOWS_AND_FAIL_CLOSED_RELEASE_PACKAGING_NO_LIVE_CREDIT";
const R41_PARENT = R40_REVISION;
const R41_DESCENDANT_PATH = "config/pass36/a102r41-current-root-descendant-manifest.json";
const R41_PROGRAM_PATH = "config/pass36/a102r41-world-class-completion-program.json";
const R41_MODE_POLICY_PATH = "config/pass36/a102r41-cross-platform-source-mode-policy.json";
const R41_SPARSE_LEDGER_PATH = "config/pass36/a102r41-historical-descendant-sparse-edge-ledger.json";
const R41_AUTHORITY_VERIFIER_PATH = "scripts/pass36/verify-a102r41-action-required-authority.mjs";
const R41_AUTHORITY_EXPECTED_STATUS = "PASS_A102R41_ACTION_REQUIRED_AUTHORITY_SECURITY_EVIDENCE_EXACT_WINDOWS_PREFLIGHT_AND_FAIL_CLOSED_RELEASE_PACKAGING_NO_LIVE_CREDIT";
const R42_REVISION = "VELMERE_PASS36_A102R42_ACTION_REQUIRED_A60_TOTAL_FAIL_CLOSED_RECEIPT_AND_LOG_CLASSIFIER_BOUNDARY_EXACT_WINDOWS_NO_LIVE_CREDIT";
const R42_PARENT = R41_REVISION;
const R42_DESCENDANT_PATH = "config/pass36/a102r42-current-root-descendant-manifest.json";
const R42_PROGRAM_PATH = "config/pass36/a102r42-world-class-completion-program.json";
const R42_MODE_POLICY_PATH = "config/pass36/a102r42-cross-platform-source-mode-policy.json";
const R42_AUTHORITY_VERIFIER_PATH = "scripts/pass36/verify-a102r42-action-required-authority.mjs";
const R42_AUTHORITY_EXPECTED_STATUS = "PASS_A102R42_ACTION_REQUIRED_AUTHORITY_A60_TOTAL_FAIL_CLOSED_RECEIPT_AND_LOG_CLASSIFIER_BOUNDARY_EXACT_WINDOWS_NO_LIVE_CREDIT";
const R43_REVISION = "VELMERE_PASS36_A102R43_ACTION_REQUIRED_FINAL_UI_UX_PERFORMANCE_HARDENING_AND_BLOCKED_FAULT_EMULATION_NO_LIVE_CREDIT";
const R43_AUTHORITY_VERIFIER_PATH = "scripts/pass36/verify-a102r43-ui-performance-authority.mjs";
const R43_AUTHORITY_EXPECTED_STATUS = "PASS_A102R43_ACTION_REQUIRED_UI_PERFORMANCE_AUTHORITY_NO_LIVE_CREDIT";
const R44_REVISION = "VELMERE_PASS36_A102R44_ACTION_REQUIRED_FINAL_UI_POLISH_EXACT_BUILD_BROWSER_AND_CLEAN_HANDOFF_NO_LIVE_CREDIT";
const R44_AUTHORITY_VERIFIER_PATH = "scripts/pass36/verify-a102r44-final-ui-polish-authority.mjs";
const R44_AUTHORITY_EXPECTED_STATUS = "PASS_A102R44_ACTION_REQUIRED_FINAL_UI_POLISH_AUTHORITY_NO_LIVE_CREDIT";
const R46_PROGRAM_PATH = "config/pass36/r44p45-continuous-closure-policy.json";
const R46_LEDGER_FILE = "VELMERE_CURRENT_STATE_AND_PASS_LEDGER_PASS36_A102R44P46_ACTION_REQUIRED_LEGACY_MULTIPLICATION_ECONOMIC_SINK_TRUTH_REBASE_NO_LIVE_CREDIT.txt";
const R46_AUTHORITY_VERIFIER_PATH = "scripts/pass36/verify-a102r44p46-current-source-authority.mjs";
const R46_AUTHORITY_EXPECTED_STATUS = "PASS_A102R44P46_CURRENT_SOURCE_AUTHORITY_EXACT_NO_LIVE_OR_SALE_CREDIT";
const AUTHORITY_PROFILES = new Map([
  [R40_REVISION, {
    verifierPath: "scripts/pass36/verify-a102r40-action-required-authority.mjs",
    verifierStatus: "PASS_A102R40_ACTION_REQUIRED_AUTHORITY_CURRENT_SOURCE_PREFLIGHT_NO_FRESH_EXACT_WINDOWS_BUILD_BROWSER_STAGING_OR_SALE_CREDIT",
  }],
  [R41_REVISION, { verifierPath: R41_AUTHORITY_VERIFIER_PATH, verifierStatus: R41_AUTHORITY_EXPECTED_STATUS }],
  [R42_REVISION, { verifierPath: R42_AUTHORITY_VERIFIER_PATH, verifierStatus: R42_AUTHORITY_EXPECTED_STATUS }],
  [R43_REVISION, { verifierPath: R43_AUTHORITY_VERIFIER_PATH, verifierStatus: R43_AUTHORITY_EXPECTED_STATUS }],
  [R44_REVISION, { verifierPath: R44_AUTHORITY_VERIFIER_PATH, verifierStatus: R44_AUTHORITY_EXPECTED_STATUS }],
  [R46_REVISION, {
    verifierPath: R46_AUTHORITY_VERIFIER_PATH,
    verifierStatus: R46_AUTHORITY_EXPECTED_STATUS,
    manifestPath: R46_SOURCE_MANIFEST_PATH,
    manifestSchema: R46_SOURCE_MANIFEST_SCHEMA,
  }],
]);
const RELEASE_BINDING_PATHS = [
  "config/pass36/a60-exact-final-byte-build-browser-acceptance.json",
  "config/pass36/a62-offline-exact-runtime-dependency-bootstrap.json",
  "config/pass36/a63-staging-program-orchestrator.json",
  "config/pass36/a78-exact-runtime-lockfile-browser-bootstrap.json",
  "config/pass36/a79-exact-final-byte-build-browser-evidence-binding.json",
  "config/pass36/a80-frozen-local-release-candidate-admission.json",
];
const IMMUTABLE_LOG = "fixtures/pass35/a42/windows-global-json-crash.log";
const TOP_LEVEL_EXCLUSIONS = new Set([
  ".git", ".velmere", ".next", ".turbo", "_velmere", "artifacts",
  "coverage", "node_modules", "dist", "out", ".cache", "cache",
]);

export const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
const safeId = (value) => value.replaceAll(/[^a-z0-9._-]/giu, "_");
const readBound = (root, relativePath, maxBytes = 16 * 1024 * 1024) => readDescriptorBoundRegularFile(path.join(root, relativePath), { maxBytes, errorPrefix: `current_authority_${safeId(relativePath)}` }).bytes;
const readJson = (root, relativePath) => parseStrictJsonCli(readBound(root, relativePath).toString("utf8"), { maxBytes: 16 * 1024 * 1024, maxDepth: 128, maxNodes: 1_000_000, requireObject: true });

function excluded(relativePath, descendantManifestPath) {
  const top = relativePath.split("/", 1)[0];
  if (TOP_LEVEL_EXCLUSIONS.has(top) || top.startsWith(".next-")) return true;
  const parts = relativePath.split("/");
  const base = parts.at(-1) ?? "";
  if (parts.includes("__pycache__") || base.endsWith(".pyc")) return true;
  if (base === ".env" || base.startsWith(".env.") || base === ".eslintcache" || base.endsWith(".tsbuildinfo")) return true;
  if (/^tsconfig\.tmp.*\.json$/u.test(base)) return true;
  if (base.endsWith(".log") && relativePath !== IMMUTABLE_LOG) return true;
  if (/\.(?:db|sqlite|sqlite3)$/iu.test(base)) return true;
  return relativePath === descendantManifestPath;
}

export function resolveCurrentSourceAuthority(rootPath) {
  const root = path.resolve(rootPath);
  const authority = readJson(root, AUTHORITY_PATH);
  const current = readJson(root, CURRENT_REVISION_PATH);
  const a58 = readJson(root, A58_POLICY_PATH);
  const pkg = readJson(root, PACKAGE_PATH);
  const compat = fs.existsSync(path.join(root, COMPATIBILITY_RELEASE_PATH))
    ? readJson(root, COMPATIBILITY_RELEASE_PATH)
    : null;
  const active = readBound(root, ACTIVE_PASS_PATH, 4096).toString("utf8").trim();
  const revisionId = authority.authorityRevisionId;
  const parentRevisionId = authority.parentRevisionId;
  const descendantManifestPath = authority.currentRootDescendantManifestPath;
  const completionProgramPath = authority.worldClassCompletionProgramPath;
  const sourceModePolicyPath = a58.crossPlatformSourceModePolicyPath;
  const authorityProfile = AUTHORITY_PROFILES.get(revisionId);
  const mismatches = [];
  const add = (id, actual, expected) => {
    if (actual !== expected) mismatches.push({ id, actual, expected });
  };
  if (!authorityProfile) mismatches.push({
    id: "authority-profile-supported",
    actual: revisionId,
    expected: [...AUTHORITY_PROFILES.keys()],
  });
  if (revisionId === R46_REVISION) {
    const hasOwn = (value, key) => value !== null
      && typeof value === "object"
      && Object.prototype.hasOwnProperty.call(value, key);
    const noPromotionExpectations = Object.freeze({
      globalDecision: "NO_GO",
      LIVE: false,
      live: false,
      liveProven: false,
      saleEnabled: false,
      productionApproved: false,
      worldClassProven: false,
      promotionAllowed: false,
    });
    const exactNoPromotion = (label, value, requiredKeys = []) => {
      const required = new Set(requiredKeys);
      for (const [key, expected] of Object.entries(noPromotionExpectations)) {
        if (required.has(key) || hasOwn(value, key)) {
          add(`${label}:${key}`, value?.[key], expected);
        }
      }
    };
    add("r46-parent", parentRevisionId, R46_PARENT_REVISION);
    add("r46-descendant-path", descendantManifestPath, R46_SOURCE_MANIFEST_PATH);
    add("r46-program-path", completionProgramPath, R46_PROGRAM_PATH);
    add("active-pass", active, R46_REVISION);
    add("authority-source-revision", authority.sourceRevisionId, R46_REVISION);
    add("authority-source-parent", authority.sourceParentRevisionId, R46_PARENT_REVISION);
    add("authority-descendant-revision", authority.currentRootDescendantManifestRevisionId, R46_REVISION);
    add("authority-current-source", authority.currentSource?.revisionId, R46_REVISION);
    add("authority-current-source-parent", authority.currentSource?.parentRevisionId, R46_PARENT_REVISION);
    add("authority-current-source-role", authority.currentSource?.authorityRole, "SOURCE_ONLY");
    add("authority-current-source-manifest", authority.currentSource?.sourceManifestPath, R46_SOURCE_MANIFEST_PATH);
    add("authority-ledger", authority.currentStateLedgerArtifact, R46_LEDGER_FILE);
    add("authority-current-source-ledger", authority.currentSource?.currentStateLedgerArtifact, R46_LEDGER_FILE);
    exactNoPromotion("authority", authority, [
      "globalDecision", "LIVE", "live", "saleEnabled",
      "productionApproved", "worldClassProven",
    ]);
    exactNoPromotion("authority-current-source", authority.currentSource, [
      "globalDecision", "LIVE", "saleEnabled", "productionApproved",
      "worldClassProven",
    ]);
    exactNoPromotion("authority-claims", authority.claims, [
      "liveProven", "saleEnabled", "productionApproved", "worldClassProven",
    ]);

    add("current-source", current.sourceRevisionId, R46_REVISION);
    add("current-parent", current.sourceParentRevisionId, R46_PARENT_REVISION);
    add("current-descendant-revision", current.currentRootDescendantManifestRevisionId, R46_REVISION);
    add("current-descendant-path", current.currentRootDescendantManifestPath, R46_SOURCE_MANIFEST_PATH);
    add("current-authoritative-descendant-path", current.authoritativeCurrentRootDescendantManifestPath, R46_SOURCE_MANIFEST_PATH);
    add("current-ledger", current.currentStateLedgerArtifact, R46_LEDGER_FILE);
    exactNoPromotion("current", current, [
      "globalDecision", "LIVE", "live", "liveProven", "saleEnabled",
      "productionApproved", "worldClassProven",
    ]);

    add("compatibility-present", Boolean(compat), true);
    if (compat) {
      add("compatibility-source", compat.sourceRevisionId, R46_REVISION);
      add("compatibility-parent", compat.sourceParentRevisionId, R46_PARENT_REVISION);
      add("compatibility-authority", compat.authorityRevisionId, R46_REVISION);
      add("compatibility-descendant-revision", compat.currentRootDescendantManifestRevisionId, R46_REVISION);
      add("compatibility-descendant-path", compat.currentRootDescendantManifestPath, R46_SOURCE_MANIFEST_PATH);
      add("compatibility-ledger", compat.currentStateLedgerArtifact, R46_LEDGER_FILE);
      exactNoPromotion("compatibility", compat, [
        "globalDecision", "LIVE", "live", "liveProven", "saleEnabled",
        "productionApproved", "worldClassProven",
      ]);
    }

    add("package-primary-revision", pkg.velmerePass, R46_REVISION);
    add("package-authority-revision", pkg.authorityRevisionId, R46_REVISION);
    add("package-authority-pass", pkg.velmereCurrentReleaseAuthorityPass, R46_REVISION);
    add("package-top-descendant", pkg.velmereCurrentRootDescendantManifestPath, R46_SOURCE_MANIFEST_PATH);
    add("package-top-ledger", pkg.velmereCurrentStateAndPassLedgerFileName, R46_LEDGER_FILE);
    add("package-metadata-revision", pkg.velmerePassMetadata?.currentRevisionId, R46_REVISION);
    add("package-metadata-parent", pkg.velmerePassMetadata?.parentRevisionId, R46_PARENT_REVISION);
    add("package-current-source", pkg.velmere?.currentRevisionId, R46_REVISION);
    add("package-current-parent", pkg.velmere?.currentRevisionParentId, R46_PARENT_REVISION);
    add("package-descendant", pkg.velmere?.currentRootDescendantManifestPath, R46_SOURCE_MANIFEST_PATH);
    add("package-ledger", pkg.velmere?.currentStateLedgerArtifact, R46_LEDGER_FILE);
    exactNoPromotion("package", pkg);
    exactNoPromotion("package-velmere", pkg.velmere, [
      "globalDecision", "LIVE", "saleEnabled", "productionApproved",
      "worldClassProven",
    ]);

    add("a58-current-source", a58.currentSourceRevisionId, R46_REVISION);
    add("a58-current-checkpoint", a58.currentCheckpointRevisionId, R46_REVISION);
    add("a58-current-parent", a58.currentCheckpointParentRevisionId, R46_PARENT_REVISION);
    add("a58-descendant-path", a58.currentDescendantManifestPath, R46_SOURCE_MANIFEST_PATH);
    add("a58-authority-verifier-path", a58.currentAuthorityVerifierPath, R46_AUTHORITY_VERIFIER_PATH);
    add("a58-authority-verifier-status", a58.currentAuthorityVerifierExpectedStatus, R46_AUTHORITY_EXPECTED_STATUS);
    add("a58-archive-path", a58.archiveManifestPath, R46_SOURCE_MANIFEST_PATH);
    add("a58-archive-contract-revision", a58.archiveManifestContract?.revisionId, R46_REVISION);
    add("a58-archive-contract-path", a58.archiveManifestContract?.path, R46_SOURCE_MANIFEST_PATH);
    add("a58-archive-schema", a58.archiveManifestSchemaVersion, R46_SOURCE_MANIFEST_SCHEMA);
    add("a58-archive-contract-schema", a58.archiveManifestContract?.schemaVersion, R46_SOURCE_MANIFEST_SCHEMA);

    let a60 = null;
    try { a60 = readJson(root, "config/pass36/a60-exact-final-byte-build-browser-acceptance.json"); }
    catch (error) { mismatches.push({ id: "r46-a60-profile-readable", actual: error instanceof Error ? error.message : String(error), expected: "strict JSON" }); }
    if (a60) {
      add("r46-a60-source", a60.currentSourceRevisionId, R46_REVISION);
      add("r46-a60-parent", a60.currentSourceParentRevisionId, R46_PARENT_REVISION);
      add("r46-a60-manifest", a60.sourceManifestPath, R46_SOURCE_MANIFEST_PATH);
      add("r46-a60-authority", a60.currentSourceAuthorityPath, AUTHORITY_PATH);
      add("r46-a60-profile", a60.currentSourceProfile, "R44P46_SOURCE_ONLY_MANIFEST_V1");
      add("r46-a60-schema", a60.sourceManifestSchema, R46_SOURCE_MANIFEST_SCHEMA);
      add("r46-a60-fingerprint-field", a60.sourceFingerprintField, "sourceAggregateSha256");
      add("r46-a60-external-anchor", a60.manifestFileSha256AnchorRequired, true);
    }
  } else {
    add("active-pass", active, revisionId);
    add("authority-current-source", authority.currentSource?.revisionId, revisionId);
    add("authority-source-revision", authority.sourceRevisionId, revisionId);
    add("authority-source-parent", authority.sourceParentRevisionId, parentRevisionId);
    add("authority-parent", authority.currentSource?.parentRevisionId, parentRevisionId);
    add("package-current-source", pkg.velmere?.currentRevisionId, revisionId);
    add("package-authority-pass", pkg.velmereCurrentReleaseAuthorityPass, revisionId);
    add("package-program-pass", pkg.velmereWorldClassCompletionProgramPass, revisionId);
    add("package-program-top-path", pkg.velmereWorldClassCompletionProgramPath, completionProgramPath);
    add("package-parent", pkg.velmere?.currentRevisionParentId, parentRevisionId);
    add("package-descendant-path", pkg.velmere?.currentRootDescendantManifestPath, descendantManifestPath);
    add("package-program-path", pkg.velmere?.worldClassCompletionProgramPath, completionProgramPath);
    add("current-revision-source", current.sourceRevisionId, revisionId);
    add("current-revision-parent", current.sourceParentRevisionId, parentRevisionId);
    add("current-revision-descendant", current.currentRootDescendantManifestRevisionId, revisionId);
    add("current-revision-descendant-path", current.currentRootDescendantManifestPath, descendantManifestPath);
    add("current-revision-program", current.worldClassCompletionProgramRevisionId, revisionId);
    add("current-revision-program-path", current.worldClassCompletionProgramPath, completionProgramPath);
    add("current-revision-authoritative-descendant-path", current.authoritativeCurrentRootDescendantManifestPath, descendantManifestPath);
    add("current-revision-authoritative-program-path", current.authoritativeWorldClassCompletionProgramPath, completionProgramPath);
    add("current-revision-authoritative-current-program-path", current.authoritativeCurrentWorldClassProgramPath, completionProgramPath);
    add("a58-current-source", a58.currentSourceRevisionId, revisionId);
    add("a58-current-checkpoint", a58.currentCheckpointRevisionId, revisionId);
    add("a58-current-parent", a58.currentCheckpointParentRevisionId, parentRevisionId);
    add("a58-descendant-path", a58.currentDescendantManifestPath, descendantManifestPath);
    add("a58-program-path", a58.currentWorldClassCompletionProgramPath, completionProgramPath);
    add("a58-program-revision", a58.currentWorldClassCompletionProgramRevisionId, revisionId);
    add("a58-authority-verifier-path", a58.currentAuthorityVerifierPath, authorityProfile?.verifierPath ?? R41_AUTHORITY_VERIFIER_PATH);
    add("a58-authority-verifier-status", a58.currentAuthorityVerifierExpectedStatus, authorityProfile?.verifierStatus ?? R41_AUTHORITY_EXPECTED_STATUS);
    add("authority-program-revision", authority.worldClassCompletionProgramRevisionId, revisionId);
    add("authority-descendant-revision", authority.currentRootDescendantManifestRevisionId, revisionId);
    add("authority-roadmap-plane-revision", authority.planes?.roadmapProgram?.revisionId, revisionId);
    add("authority-roadmap-plane-path", authority.planes?.roadmapProgram?.path, completionProgramPath);
    add("a58-archive-revision", a58.archiveManifestContract?.revisionId, revisionId);
    add("a58-archive-path", a58.archiveManifestContract?.path, a58.archiveManifestPath);
    add("a58-archive-schema", a58.archiveManifestSchemaVersion, a58.archiveManifestContract?.schemaVersion);
  }
  if (revisionId === R41_REVISION || revisionId === R42_REVISION) {
    const isR42 = revisionId === R42_REVISION;
    const revisionLabel = isR42 ? "A102R42" : "A102R41";
    const expectedPatch = isR42 ? "VELMERE_A102R42_PATCH.txt" : "VELMERE_A102R41_PATCH.txt";
    const expectedModePolicyPath = isR42 ? R42_MODE_POLICY_PATH : R41_MODE_POLICY_PATH;
    const expectedDescendantPath = isR42 ? R42_DESCENDANT_PATH : R41_DESCENDANT_PATH;
    const expectedProgramPath = isR42 ? R42_PROGRAM_PATH : R41_PROGRAM_PATH;
    const expectedParent = isR42 ? R42_PARENT : R41_PARENT;
    const expectedArchivePath = isR42
      ? "_velmere/PASS36_A102R42_SOURCE_ONLY_MANIFEST.json"
      : "_velmere/PASS36_A102R41_SOURCE_ONLY_MANIFEST.json";
    const expectedArchiveSchema = isR42
      ? "velmere.pass36.a102r42.source-only-package-manifest.v1"
      : "velmere.pass36.a102r41.source-only-package-manifest.v1";
    add("package-primary-revision", pkg.velmerePass, revisionId);
    add("package-primary-patch", pkg.velmerePatch, expectedPatch);
    add("package-top-descendant-path", pkg.velmereCurrentRootDescendantManifestPath, descendantManifestPath);
    add("package-metadata-revision", pkg.velmerePassMetadata?.currentRevisionId, revisionId);
    add("package-metadata-parent", pkg.velmerePassMetadata?.parentRevisionId, parentRevisionId);
    add("current-revision-parent-alias", current.parentSourceRevisionId, parentRevisionId);
    add("current-revision-authority-revision", current.currentReleaseAuthorityRevisionId, revisionId);
    add("current-revision-sparse-ledger", current.historicalDescendantSparseEdgeLedgerPath, R41_SPARSE_LEDGER_PATH);
    add("authority-sparse-ledger", authority.historicalDescendantSparseEdgeLedgerPath, R41_SPARSE_LEDGER_PATH);
    add("compatibility-present", Boolean(compat), true);
    if (compat) {
      add("compatibility-authoritative-source", compat.authoritativeCurrentSourceRevisionId, revisionId);
      add("compatibility-authoritative-parent", compat.authoritativeCurrentSourceParentRevisionId, parentRevisionId);
      add("compatibility-authority-revision", compat.currentReleaseAuthorityRevisionId, revisionId);
      add("compatibility-program-revision", compat.worldClassCompletionProgramRevisionId, revisionId);
      add("compatibility-program-path", compat.worldClassCompletionProgramPath, completionProgramPath);
      add("compatibility-authoritative-program-path", compat.authoritativeWorldClassCompletionProgramPath, completionProgramPath);
      add("compatibility-authoritative-current-program-path", compat.authoritativeCurrentWorldClassProgramPath, completionProgramPath);
      add("compatibility-descendant-revision", compat.currentRootDescendantManifestRevisionId, revisionId);
      add("compatibility-descendant-path", compat.currentRootDescendantManifestPath, descendantManifestPath);
      add("compatibility-authoritative-descendant-path", compat.authoritativeCurrentRootDescendantManifestPath, descendantManifestPath);
      add("compatibility-sparse-ledger", compat.historicalDescendantSparseEdgeLedgerPath, R41_SPARSE_LEDGER_PATH);
      add("compatibility-pointer-classification", compat.pointerClassification, "LEGACY_PRODUCT_CONTRACT_COMPATIBILITY_POINTER");
      add("compatibility-not-authority", compat.notAuthoritativeCurrentSourcePointer, true);
      add("compatibility-production-promotion", compat.productionPromotionAllowed, false);
      add("compatibility-readiness-score", compat.readinessScoreIssued, false);
      add("compatibility-legacy-staging-authority", compat.legacyCandidateAuthoritativeForCurrentStaging, false);
      add("compatibility-decision", compat.authoritativeCurrentDecision, "NO_GO");
      add("compatibility-checkpoint-class", compat.authoritativeCurrentCheckpointClass, "ACTION_REQUIRED_NON_PASS");
      add("compatibility-release-status", compat.currentReleaseAuthorityStatus, "ACTION_REQUIRED_NON_PASS");
      add("compatibility-sale", compat.authoritativeCurrentSaleEnabled, false);
    }
    const pointers = authority.compatibilityPointers;
    const expectedPointerPlanes = [
      ["config/current-release.json", "LEGACY_PRODUCT_CONTRACT_COMPATIBILITY_POINTER"],
      ["config/pass35/current-revision.json", "PASS35_COMPATIBILITY_MIRROR_OF_CURRENT_SOURCE_AND_PLANES"],
      ["VELMERE_WORLD_CLASS_MAX_ROADMAP_PASS35.txt", "HUMAN_READABLE_CUMULATIVE_ROADMAP"],
    ];
    if (
      !Array.isArray(pointers)
      || pointers.length !== 3
      || pointers.some((pointer, index) => pointer?.path !== expectedPointerPlanes[index][0]
        || pointer?.classification !== expectedPointerPlanes[index][1]
        || pointer?.declaredRevisionId !== revisionId
        || pointer?.mayDefineCurrentSource !== false
        || !String(pointer?.reason ?? "").includes(revisionLabel))
    ) mismatches.push({ id: "authority-compatibility-narrative", actual: pointers ?? null, expected: `three ${revisionLabel} non-authoritative compatibility pointers` });
    if (!String(authority.truthBoundary ?? "").includes(revisionLabel) || /A102R39 is the current source authority/u.test(String(authority.truthBoundary ?? ""))) {
      mismatches.push({ id: "authority-truth-boundary", actual: authority.truthBoundary ?? null, expected: `${revisionLabel} current authority truth` });
    }
    add(`${revisionLabel.toLowerCase()}-mode-policy`, sourceModePolicyPath, expectedModePolicyPath);
    add(`${revisionLabel.toLowerCase()}-descendant-path`, descendantManifestPath, expectedDescendantPath);
    add(`${revisionLabel.toLowerCase()}-program-path`, completionProgramPath, expectedProgramPath);
    add(`${revisionLabel.toLowerCase()}-parent`, parentRevisionId, expectedParent);
    add(`${revisionLabel.toLowerCase()}-archive-path`, a58.archiveManifestPath, expectedArchivePath);
    add(`${revisionLabel.toLowerCase()}-archive-contract-path`, a58.archiveManifestContract?.path, expectedArchivePath);
    add(`${revisionLabel.toLowerCase()}-archive-schema`, a58.archiveManifestSchemaVersion, expectedArchiveSchema);
    add(`${revisionLabel.toLowerCase()}-archive-contract-schema`, a58.archiveManifestContract?.schemaVersion, expectedArchiveSchema);
    add("current-browser-rows", current.exactBuildBrowserRequiredRows, 56);
    add("current-browser-screenshots", current.exactBuildBrowserRequiredScreenshots, 29);
    add("current-browser-popup-tabs", current.exactBuildBrowserRequiredPopupTabs, 4);
    add("current-sale-enabled", current.saleEnabled, false);
    add("current-live-proven", current.liveProven, false);
    add("current-world-class-proven", current.worldClassProven, false);
    add("package-browser-rows", pkg.a102r40A79BrowserRowsRequired, 56);
    add("package-browser-screenshots", pkg.a102r40A79ScreenshotsRequired, 29);
    add("authority-browser-rows", authority.claims?.a102r40A79BrowserRowsRequired, 56);
    add("authority-browser-screenshots", authority.claims?.a102r40A79ScreenshotsRequired, 29);
    for (const relativePath of RELEASE_BINDING_PATHS) {
      try {
        const binding = readJson(root, relativePath);
        add(`release-binding:${relativePath}:source`, binding.currentSourceRevisionId, revisionId);
        add(`release-binding:${relativePath}:parent`, binding.currentSourceParentRevisionId, parentRevisionId);
        add(`release-binding:${relativePath}:manifest`, binding.sourceManifestPath, descendantManifestPath);
        if (relativePath.endsWith("a60-exact-final-byte-build-browser-acceptance.json")) {
          add("a60-browser-rows", binding.browser?.requiredChecks, 56);
          add("a60-browser-screenshots", binding.browser?.requiredScreenshots, 29);
          add("a60-browser-popup-tabs", binding.browser?.requiredPopupTabs?.length, 4);
        }
        if (relativePath.endsWith("a80-frozen-local-release-candidate-admission.json")) {
          add("a80-browser-rows", binding.requiredBrowserRows, 56);
          add("a80-browser-screenshots", binding.requiredScreenshots, 29);
        }
      } catch (error) {
        mismatches.push({ id: `release-binding:${relativePath}:read`, actual: error instanceof Error ? error.message : String(error), expected: "readable strict JSON" });
      }
    }
    if (isR42) {
      const allAliases = ["live", "liveProven", "saleEnabled", "productionApproved", "worldClassProven", "productionPromotionAllowed"];
      const compatibilityAliases = ["live", "liveProven", "saleEnabled", "productionApproved", "worldClassProven"];
      const currentAliases = ["live", "productionApproved", "productionPromotionAllowed"];
      const present = {
        authority: allAliases.filter((key) => Object.hasOwn(authority, key)),
        authorityCurrentSource: allAliases.filter((key) => Object.hasOwn(authority.currentSource ?? {}, key)),
        package: allAliases.filter((key) => Object.hasOwn(pkg, key)),
        packageVelmere: allAliases.filter((key) => Object.hasOwn(pkg.velmere ?? {}, key)),
        compatibility: compatibilityAliases.filter((key) => Object.hasOwn(compat ?? {}, key)),
        currentRevision: currentAliases.filter((key) => Object.hasOwn(current, key)),
      };
      if (Object.values(present).some((keys) => keys.length > 0)) mismatches.push({ id: "forbidden-promotion-alias", actual: present, expected: Object.fromEntries(Object.keys(present).map((key) => [key, []])) });
      const r26 = authority.planes?.a102r26ChartRuntimeLocalClosure;
      add("historical-plane:a102r26:revision", r26?.revisionId, "VELMERE_PASS36_A102R26_ACTION_REQUIRED_ASSET_DETAIL_CHART_SHARED_CACHE_INFLIGHT_RACE_REFERENCE_REFRESH_AND_NO_FLICKER_RECOVERY_NO_REAL_CREDIT");
      add("historical-plane:a102r26:state", r26?.statePath, "config/pass36/a102r26-action-required-current-state.json");
      add("historical-plane:a102r26:program", r26?.programPath, "config/pass36/a102r26-world-class-completion-program.json");
      const r29 = authority.planes?.a102r29LocalClosure;
      add("historical-plane:a102r29:revision", r29?.revisionId, "VELMERE_PASS36_A102R29_ACTION_REQUIRED_CANONICAL_ASSET_CLASS_LOCALE_INDEPENDENT_CHART_ROUTE_CACHE_AND_NESTED_AUTHORITY_PROGRAM_DRIFT_RECOVERY_NO_REAL_CREDIT");
      add("historical-plane:a102r29:parent", r29?.parentRevisionId, "VELMERE_PASS36_A102R28_ACTION_REQUIRED_ASSET_DETAIL_ABORTED_INFLIGHT_REOPEN_AND_DEFERRED_IDENTITY_RESET_RACE_RECOVERY_NO_REAL_CREDIT");
      add("historical-plane:a102r29:state", r29?.statePath, "config/pass36/a102r29-action-required-current-state.json");
      add("historical-plane:a102r29:receipt", r29?.testReceiptPath, "config/pass36/a102r29-local-regression-receipt.json");
      add("historical-plane:a102r29:ledger", r29?.approvedChangeLedgerPath, "config/pass36/a102r29-approved-route-cache-authority-changes.json");
    }
  }
  const descendantPathAllowed = revisionId === R46_REVISION
    ? descendantManifestPath === R46_SOURCE_MANIFEST_PATH
    : typeof descendantManifestPath === "string" && descendantManifestPath.startsWith("config/pass36/") && descendantManifestPath.endsWith(".json");
  if (!descendantPathAllowed) {
    mismatches.push({
      id: "descendant-path-shape",
      actual: descendantManifestPath,
      expected: revisionId === R46_REVISION ? R46_SOURCE_MANIFEST_PATH : "config/pass36/*.json",
    });
  }
  if (typeof sourceModePolicyPath !== "string" || !sourceModePolicyPath.startsWith("config/pass36/") || !sourceModePolicyPath.endsWith(".json")) {
    mismatches.push({ id: "mode-policy-path-shape", actual: sourceModePolicyPath, expected: "config/pass36/*.json" });
  }
  return {
    root,
    revisionId,
    parentRevisionId,
    descendantManifestPath,
    completionProgramPath,
    sourceModePolicyPath,
    authority,
    current,
    a58,
    pkg,
    compat,
    active,
    mismatches,
  };
}

export function collectCurrentSource(rootPath, options = {}) {
  const resolved = options.resolved ?? resolveCurrentSourceAuthority(rootPath);
  const root = resolved.root;
  const platform = options.platform ?? process.platform;
  const policy = loadSourceModePolicy(root, resolved.sourceModePolicyPath);
  const rows = [];
  const rejected = [];
  function walk(absoluteDirectory, relativeDirectory = "") {
    const entries = fs.readdirSync(absoluteDirectory, { withFileTypes: true })
      .sort((left, right) => Buffer.from(left.name).compare(Buffer.from(right.name)));
    for (const entry of entries) {
      const relativePath = relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name;
      const absolutePath = path.join(absoluteDirectory, entry.name);
      const metadata = fs.lstatSync(absolutePath);
      if (metadata.isSymbolicLink()) {
        rejected.push({ path: relativePath, reason: "symlink" });
        continue;
      }
      if (entry.isDirectory()) {
        if (!excluded(`${relativePath}/x`, resolved.descendantManifestPath)) walk(absolutePath, relativePath);
        continue;
      }
      if (!entry.isFile()) {
        rejected.push({ path: relativePath, reason: "special" });
        continue;
      }
      if (excluded(relativePath, resolved.descendantManifestPath)) continue;
      try {
        const observed = readDescriptorBoundRegularFile(absolutePath, { maxBytes: 512 * 1024 * 1024, errorPrefix: `current_source_${relativePath.replaceAll(/[^a-z0-9._-]/giu, "_")}` });
        validateObservedSourceMode(relativePath, { mode: observed.observedMode }, policy, platform);
        rows.push({
          path: relativePath,
          byteLength: observed.binding.byteLength,
          sha256: observed.binding.sha256,
          mode: canonicalSourceMode(relativePath, policy),
        });
      } catch (error) {
        rejected.push({ path: relativePath, reason: error instanceof Error ? error.message : String(error) });
      }
    }
  }
  walk(root);
  rows.sort((left, right) => Buffer.from(left.path).compare(Buffer.from(right.path)));
  return { rows, rejected, platform, policy, resolved };
}

export function sourcePayload(rows) {
  return {
    fileCount: rows.length,
    byteLength: rows.reduce((sum, row) => sum + row.byteLength, 0),
    pathSetSha256: sha256(rows.map((row) => row.path).join("\n")),
    aggregateSha256: sha256(rows.map((row) => `${row.path}\0${row.byteLength}\0${row.sha256}\0${row.mode}`).join("\n")),
  };
}

function validateR46CurrentSource(resolved, mismatches) {
  const absoluteManifest = path.join(resolved.root, R46_SOURCE_MANIFEST_PATH);
  let manifestBytes;
  try {
    manifestBytes = readDescriptorBoundRegularFile(absoluteManifest, {
      maxBytes: 16 * 1024 * 1024,
      errorPrefix: "current_authority_r44p46_source_manifest",
    }).bytes;
  } catch (_error) {
    mismatches.push({ id: "descendant-manifest-missing", actual: null, expected: R46_SOURCE_MANIFEST_PATH });
    return {
      revisionId: resolved.revisionId,
      parentRevisionId: resolved.parentRevisionId,
      manifestPath: R46_SOURCE_MANIFEST_PATH,
      manifestSchema: R46_SOURCE_MANIFEST_SCHEMA,
      manifestSha256: null,
      manifestDigestSha256: null,
      sourceFingerprint: null,
      payload: null,
      declaredPayload: null,
      files: 0,
      rejected: [],
      mismatches,
      passed: false,
    };
  }

  let manifest = null;
  try {
    manifest = parseStrictJsonCli(manifestBytes.toString("utf8"), {
      maxBytes: 16 * 1024 * 1024,
      maxDepth: 128,
      maxNodes: 1_500_000,
      requireObject: true,
    });
    validateR46SourceManifest(manifest);
  } catch (error) {
    mismatches.push({
      id: "r46-source-manifest-contract",
      actual: error instanceof Error ? error.message : String(error),
      expected: R46_SOURCE_MANIFEST_SCHEMA,
    });
  }

  let rows = [];
  try {
    rows = r46SourceRowsForManifest(collectR46SourceTree(resolved.root, {
      kind: "source",
      excludePaths: new Set([R46_SOURCE_MANIFEST_PATH]),
    }));
  } catch (error) {
    mismatches.push({
      id: "r46-source-inventory",
      actual: error instanceof Error ? error.message : String(error),
      expected: "safe regular-file inventory",
    });
  }

  const payload = {
    fileCount: rows.length,
    byteLength: rows.reduce((sum, row) => sum + row.byteLength, 0),
    pathSetSha256: rows.length ? r46SourcePathSet(rows) : null,
    aggregateSha256: rows.length ? r46SourceAggregate(rows) : null,
  };
  const declaredPayload = manifest ? {
    fileCount: manifest.fileCount,
    byteLength: manifest.payloadBytes,
    pathSetSha256: manifest.pathSetSha256,
    aggregateSha256: manifest.sourceAggregateSha256,
  } : null;
  if (!manifest || canonicalJson(rows) !== canonicalJson(manifest.files)) {
    mismatches.push({
      id: "source-payload-files",
      actual: { fileCount: rows.length, pathSetSha256: payload.pathSetSha256, aggregateSha256: payload.aggregateSha256 },
      expected: declaredPayload,
    });
  }
  if (canonicalJson(payload) !== canonicalJson(declaredPayload)) {
    mismatches.push({ id: "source-payload", actual: payload, expected: declaredPayload });
  }
  return {
    revisionId: resolved.revisionId,
    parentRevisionId: resolved.parentRevisionId,
    manifestPath: R46_SOURCE_MANIFEST_PATH,
    manifestSchema: R46_SOURCE_MANIFEST_SCHEMA,
    manifestSha256: sha256(manifestBytes),
    manifestDigestSha256: manifest?.manifestSha256 ?? null,
    sourceFingerprint: manifest?.sourceAggregateSha256 ?? null,
    payload,
    declaredPayload,
    files: payload.fileCount,
    rejected: [],
    mismatches,
    passed: mismatches.length === 0,
  };
}

export function validateCurrentSourceAuthorityExact(rootPath, options = {}) {
  const resolved = resolveCurrentSourceAuthority(rootPath);
  const mismatches = [...resolved.mismatches];
  const expectedRevisionId = typeof options.expectedRevisionId === "string"
    ? options.expectedRevisionId
    : path.resolve(rootPath) === path.resolve(process.cwd())
      ? R46_REVISION
      : null;
  if (expectedRevisionId !== null && resolved.revisionId !== expectedRevisionId) {
    mismatches.push({ id: "current-root-profile", actual: resolved.revisionId, expected: expectedRevisionId });
  }
  if (resolved.revisionId === R46_REVISION) return validateR46CurrentSource(resolved, mismatches);
  const absoluteManifest = path.join(resolved.root, resolved.descendantManifestPath);
  let manifestBytes;
  try {
    manifestBytes = readDescriptorBoundRegularFile(absoluteManifest, { maxBytes: 16 * 1024 * 1024, errorPrefix: "current_authority_descendant_manifest" }).bytes;
  } catch (_error) {
    mismatches.push({ id: "descendant-manifest-missing", actual: null, expected: resolved.descendantManifestPath });
    return { ...resolved, manifestSha256: null, payload: null, declaredPayload: null, rejected: [], mismatches, passed: false };
  }
  let manifest = null;
  try { manifest = parseStrictJsonCli(manifestBytes.toString("utf8"), { maxBytes: 16 * 1024 * 1024, maxDepth: 128, maxNodes: 1_000_000, requireObject: true }); }
  catch (error) { mismatches.push({ id: "descendant-manifest-json", actual: error instanceof Error ? error.message : String(error), expected: "valid-json" }); }
  if (manifest) {
    if (manifest.revisionId !== resolved.revisionId) mismatches.push({ id: "descendant-revision", actual: manifest.revisionId, expected: resolved.revisionId });
    if (manifest.parentRevisionId !== resolved.parentRevisionId) mismatches.push({ id: "descendant-parent", actual: manifest.parentRevisionId, expected: resolved.parentRevisionId });
    const digest = manifest.manifestDigestSha256;
    const core = { ...manifest };
    delete core.manifestDigestSha256;
    if (!/^[a-f0-9]{64}$/u.test(String(digest ?? "")) || digest !== sha256(canonicalJson(core))) {
      mismatches.push({ id: "descendant-self-digest", actual: digest ?? null, expected: sha256(canonicalJson(core)) });
    }
  }
  const inventory = collectCurrentSource(resolved.root, { resolved, platform: options.platform ?? process.platform });
  if (inventory.rejected.length) mismatches.push({ id: "source-inventory-rejected", actual: inventory.rejected, expected: [] });
  if (resolved.a58.crossPlatformExecutablePathCount !== inventory.policy.executablePaths.size) {
    mismatches.push({ id: "a58-executable-path-count", actual: resolved.a58.crossPlatformExecutablePathCount, expected: inventory.policy.executablePaths.size });
  }
  if (inventory.policy.revisionId !== resolved.revisionId) {
    mismatches.push({ id: "mode-policy-revision", actual: inventory.policy.revisionId, expected: resolved.revisionId });
  }
  if (inventory.policy.parentRevisionId !== resolved.parentRevisionId) {
    mismatches.push({ id: "mode-policy-parent", actual: inventory.policy.parentRevisionId, expected: resolved.parentRevisionId });
  }
  const payload = sourcePayload(inventory.rows);
  const declaredPayload = manifest?.payload ?? null;
  if (canonicalJson(payload) !== canonicalJson(declaredPayload)) {
    mismatches.push({ id: "source-payload", actual: payload, expected: declaredPayload });
  }
  return {
    revisionId: resolved.revisionId,
    parentRevisionId: resolved.parentRevisionId,
    manifestPath: resolved.descendantManifestPath,
    manifestSha256: sha256(manifestBytes),
    manifestDigestSha256: manifest?.manifestDigestSha256 ?? null,
    payload,
    declaredPayload,
    files: payload.fileCount,
    rejected: inventory.rejected,
    mismatches,
    passed: mismatches.length === 0,
  };
}
