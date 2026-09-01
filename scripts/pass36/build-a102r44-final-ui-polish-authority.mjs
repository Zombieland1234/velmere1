import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { parseDeterministicZipBytes } from "../pass4826/release-package-contract.mjs";
import { canonicalJson, collectCurrentSource, sha256, sourcePayload } from "./current-source-authority-lib.mjs";
import { parseStrictJsonCli } from "./strict-json-cli.mjs";

const REV = "VELMERE_PASS36_A102R44_ACTION_REQUIRED_FINAL_UI_POLISH_EXACT_BUILD_BROWSER_AND_CLEAN_HANDOFF_NO_LIVE_CREDIT";
const PARENT = "VELMERE_PASS36_A102R43_ACTION_REQUIRED_FINAL_UI_UX_PERFORMANCE_HARDENING_AND_BLOCKED_FAULT_EMULATION_NO_LIVE_CREDIT";
const GRANDPARENT = "VELMERE_PASS36_A102R42_ACTION_REQUIRED_A60_TOTAL_FAIL_CLOSED_RECEIPT_AND_LOG_CLASSIFIER_BOUNDARY_EXACT_WINDOWS_NO_LIVE_CREDIT";
const GRANDPARENT_ARCHIVE_SHA256 = "cc45a9fed3a7b4981f52f34c6d04d2259e659fb92e27dd99eb23b778cfb234ac";
const GRANDPARENT_ARCHIVE_BYTES = 131326341;
const PARENT_LEDGER = "config/pass36/a102r43-approved-current-source-changes.json";
const PARENT_MANIFEST = "config/pass36/a102r43-current-root-descendant-manifest.json";
const LEDGER = "config/pass36/a102r44-approved-current-source-changes.json";
const MANIFEST = "config/pass36/a102r44-current-root-descendant-manifest.json";
const STATE = "config/pass36/a102r44-action-required-current-state.json";
const PROGRAM = "config/pass36/a102r44-world-class-completion-program.json";
const MODE = "config/pass36/a102r44-cross-platform-source-mode-policy.json";
const PARENT_MODE = "config/pass36/a102r43-cross-platform-source-mode-policy.json";
const GENERATED_AT = "2026-08-02T04:30:00+02:00";
const EXPECTED_CHANGED_PATHS = [
  "VELMERE_A102R44_PATCH.txt",
  "VELMERE_ACTIVE_PASS.txt",
  "VELMERE_WORLD_CLASS_MAX_ROADMAP_PASS35.txt",
  "app/layout.tsx",
  "app/styles/final-ui-polish.css",
  "components/market-integrity/CrossAssetCollapseRadarPanel.tsx",
  "components/market-integrity/ShieldProCleanTerminalClient.tsx",
  "components/market-integrity/ShieldProMonochromeGlobe.module.css",
  "components/market-integrity/ShieldProMonochromeGlobe.tsx",
  "components/market-integrity/ShieldRealMarketsParityClient.tsx",
  "components/search/VelmereIntelligenceSearchClient.tsx",
  "components/ui/VelmereRouteTransition.tsx",
  "config/current-release.json",
  "config/pass35/current-revision.json",
  "config/pass36/a102r43-current-root-descendant-manifest.json",
  "config/pass36/a102r44-action-required-current-state.json",
  "config/pass36/a102r44-cross-platform-source-mode-policy.json",
  "config/pass36/a102r44-world-class-completion-program.json",
  "config/pass36/a58-release-integrity-policy.json",
  "config/pass36/a60-exact-final-byte-build-browser-acceptance.json",
  "config/pass36/a62-offline-exact-runtime-dependency-bootstrap.json",
  "config/pass36/a63-staging-program-orchestrator.json",
  "config/pass36/a78-exact-runtime-lockfile-browser-bootstrap.json",
  "config/pass36/a79-exact-final-byte-build-browser-evidence-binding.json",
  "config/pass36/a80-frozen-local-release-candidate-admission.json",
  "config/pass36/a85-shield-pro-map-full-depth-policy.json",
  "config/pass36/current-release-authority.json",
  "lib/market-integrity/shield-pro-full-catalog-client.ts",
  "package.json",
  "scripts/pass36/build-a102r44-final-ui-polish-authority.mjs",
  "scripts/pass36/current-source-authority-lib.mjs",
  "scripts/pass36/package-a102r44-deterministic.mjs",
  "scripts/pass36/test-a102r44-final-ui-polish-boundary.mjs",
  "scripts/pass36/verify-a102r44-final-ui-polish-authority.mjs"
].sort((left, right) => Buffer.from(left).compare(Buffer.from(right)));

const invariant = (condition, code) => { if (!condition) throw new Error(code); };
const readJson = (root, relativePath) => parseStrictJsonCli(fs.readFileSync(path.join(root, relativePath), "utf8"), {
  maxBytes: 16 * 1024 * 1024,
  maxDepth: 128,
  maxNodes: 1_000_000,
  requireObject: true,
});
const writeJson = (root, relativePath, value) => {
  fs.mkdirSync(path.dirname(path.join(root, relativePath)), { recursive: true });
  fs.writeFileSync(path.join(root, relativePath), `${JSON.stringify(value, null, 2)}\n`, "utf8");
};
const verifySelfDigest = (document, field) => {
  const core = { ...document };
  const observed = core[field];
  delete core[field];
  return observed === sha256(canonicalJson(core));
};

function parseArgs(argv) {
  invariant(argv.length === 2 && argv[0] === "--grandparent-source-zip", "a102r44_grandparent_archive_argument_required");
  return path.resolve(argv[1]);
}

function buildParentRows(root, grandparentArchivePath) {
  const bytes = fs.readFileSync(grandparentArchivePath);
  invariant(bytes.length === GRANDPARENT_ARCHIVE_BYTES, "a102r44_grandparent_archive_size");
  invariant(sha256(bytes) === GRANDPARENT_ARCHIVE_SHA256, "a102r44_grandparent_archive_sha256");
  const parsed = parseDeterministicZipBytes(bytes);
  invariant(parsed.entries.length === 5582, "a102r44_grandparent_archive_entry_denominator");
  const byPath = new Map(parsed.entries
    .filter((row) => !row.path.startsWith("_velmere/"))
    .map(({ path: entryPath, byteLength, sha256: digest, mode }) => [entryPath, { path: entryPath, byteLength, sha256: digest, mode }]));
  invariant(byPath.size === 5581, "a102r44_grandparent_source_entry_denominator");

  const parentLedger = readJson(root, PARENT_LEDGER);
  invariant(parentLedger.revisionId === PARENT && parentLedger.parentRevisionId === GRANDPARENT, "a102r44_parent_ledger_identity");
  invariant(verifySelfDigest(parentLedger, "ledgerDigestSha256"), "a102r44_parent_ledger_self_digest");
  for (const change of parentLedger.approvedChanges ?? []) {
    if (change.changeType === "DELETED") byPath.delete(change.path);
    else byPath.set(change.path, {
      path: change.path,
      byteLength: change.currentByteLength,
      sha256: change.currentSha256,
      mode: change.currentMode,
    });
  }
  const parentLedgerBytes = fs.readFileSync(path.join(root, PARENT_LEDGER));
  byPath.set(PARENT_LEDGER, { path: PARENT_LEDGER, byteLength: parentLedgerBytes.length, sha256: sha256(parentLedgerBytes), mode: 0o100644 });

  const parentManifestBytes = fs.readFileSync(path.join(root, PARENT_MANIFEST));
  const parentManifest = parseStrictJsonCli(parentManifestBytes.toString("utf8"), { maxBytes: 16 * 1024 * 1024, maxDepth: 128, maxNodes: 1_000_000, requireObject: true });
  invariant(parentManifest.revisionId === PARENT && parentManifest.parentRevisionId === GRANDPARENT, "a102r44_parent_manifest_identity");
  invariant(verifySelfDigest(parentManifest, "manifestDigestSha256"), "a102r44_parent_manifest_self_digest");
  const rows = [...byPath.values()].sort((left, right) => Buffer.from(left.path).compare(Buffer.from(right.path)));
  invariant(canonicalJson(sourcePayload(rows)) === canonicalJson(parentManifest.payload), "a102r44_parent_payload_reconstruction");
  return { rows, parentManifest, parentManifestBytes, parentLedger, parentLedgerBytes };
}

const root = process.cwd();
const parent = buildParentRows(root, parseArgs(process.argv.slice(2)));

const previousMode = readJson(root, PARENT_MODE);
writeJson(root, MODE, { ...previousMode, revisionId: REV, parentRevisionId: PARENT });

const realDenominators = {
  formalOpenEntries: 31,
  a77r1ToA80r1: { verified: 0, required: 4 },
  exactChrome148PlaywrightRevision1223: { verified: 0, required: 1 },
  exactWindowsNode24_18_0Npm11_16_0: { verified: 0, required: 1 },
  a102ObservationWindows: { verified: 0, required: 3, minimumSpanSeconds: 259200 },
  stagingStages: { verified: 0, required: 10 },
  realRls: { verified: 0, required: 19 },
  stripeTestLifecycle: { verified: 0, required: 1 },
  providerRights: { verified: 0, required: 21 },
  legalDpoSignedDecisions: { verified: 0, required: 20 },
  officialAuditToolRuns: { verified: 0, required: 200 },
  realCustomerPdfs: { verified: 0, required: 50 },
  shield: { verified: 0, required: 318 },
  shieldProMap: { verified: 0, required: 318 },
  realMarkets: { verified: 0, required: 583 },
  localCanonicalIconAssets: { verified: 187, required: 583, creditClass: "LOCAL_ASSET_INVENTORY_NOT_RIGHTS_OR_PROVIDER_PROOF" },
  brainAngelRiskRealEval: { verified: 0, required: 300 },
  customerCohorts: { verified: 0, required: 2 },
  independentAssurance: { verified: 0, required: 1 },
  contractCases: { verified: 0, required: 50 },
  sourceBytecodeReproduction: { verified: 0, required: 50 },
  realTierOutputs: { verified: 0, required: 150 },
  marketImpact: { verified: 0, required: 318 },
  whaleWatch: { verified: 0, required: 318 },
  alternateProviderProbes: { verified: 0, required: 10 },
  a114PostStagingRegression: { verified: 0, required: 1 },
  a115FinalSkuLegalClaimsClosure: { verified: 0, required: 1 },
  a116IndependentFinalRelease: { verified: 0, required: 1 },
};
const skuDecisions = {
  basic: { decision: "PILOT_ONLY_FREE_PRESCREEN", paid: false, priceRecommendation: null },
  pro: { decision: "NOT_FOR_SALE", paid: false, priceRecommendation: null },
  advanced: { decision: "NOT_FOR_SALE", paid: false, priceRecommendation: null },
  paidPdfTiers: { decision: "NOT_FOR_SALE", paid: false, priceRecommendation: null },
};
const state = {
  schemaVersion: "velmere.pass36.a102r44.action-required-current-state.v1",
  revisionId: REV,
  parentRevisionId: PARENT,
  generatedAt: GENERATED_AT,
  checkpointClass: "ACTION_REQUIRED_NON_PASS",
  completedThrough: 89,
  scope: "BOUNDED_FINAL_UI_POLISH_EXACT_BUILD_BROWSER_AND_CLEAN_HANDOFF",
  globalDecision: "NO_GO",
  live: false,
  saleEnabled: false,
  productionApproved: false,
  worldClassProven: false,
  closedFindings: [
    { id: "UI-R44-001", severity: "P2", status: "FIXED_LOCAL", files: ["components/market-integrity/ShieldProMonochromeGlobe.tsx", "components/market-integrity/ShieldProMonochromeGlobe.module.css"], condition: "Globe too low and insufficiently detailed.", fix: "Raised stable globe and increased bounded sampling over the existing 16000-point real-land dataset.", positiveTest: "Strict 16000-row geography boundary and physical browser retest required.", negativeTest: "Invalid or oversized geography falls back without page failure.", remainingTruth: "No independent dataset-provenance or real-provider credit." },
    { id: "UI-R44-002", severity: "P2", status: "FIXED_LOCAL", files: ["components/search/VelmereIntelligenceSearchClient.tsx", "app/styles/final-ui-polish.css"], condition: "Redundant Browser search shells.", fix: "Removed ambient outer and form shell styling; retained one search pill.", positiveTest: "Computed-style browser check required.", negativeTest: "No outer border/shadow/backdrop.", remainingTruth: "Local visual evidence only." },
    { id: "UI-R44-003", severity: "P1", status: "FIXED_LOCAL", files: ["app/styles/final-ui-polish.css"], condition: "Audit header blended into light background.", fix: "Opaque dark simplified header with light controls.", positiveTest: "Computed background and screenshot required.", negativeTest: "Transparent simplified header forbidden.", remainingTruth: "Local visual evidence only." },
    { id: "UI-R44-004", severity: "P1", status: "FIXED_LOCAL", files: ["components/ui/VelmereRouteTransition.tsx"], condition: "Next Link prevented bubble-phase veil ownership.", fix: "Eligible click interception and cleanup use capture phase.", positiveTest: "A102R31/R32 and physical route cycle required.", negativeTest: "External, modified and opted-out links remain unintercepted.", remainingTruth: "No exact A79R1 credit." },
    { id: "UI-R44-005", severity: "P1", status: "FIXED_LOCAL", files: ["components/market-integrity/ShieldProCleanTerminalClient.tsx", "components/market-integrity/ShieldRealMarketsParityClient.tsx"], condition: "Failed refresh could retain stale rows as LIVE.", fix: "Retained non-reference rows downgrade to LAST_KNOWN_GOOD/STALE.", positiveTest: "Static boundary plus provider-failure browser state.", negativeTest: "Refresh failure cannot retain LIVE.", remainingTruth: "No provider-currentness credit." },
    { id: "UI-R44-006", severity: "P2", status: "FIXED_LOCAL", files: ["lib/market-integrity/shield-pro-full-catalog-client.ts"], condition: "Non-2xx catalog reason was not explicitly bound.", fix: "Bounded non-2xx response stops and preserves sanitized blocker.", positiveTest: "503 blocker propagation test.", negativeTest: "503 cannot become empty LIVE.", remainingTruth: "Canonical HTTPS provider smoke remains external." },
    { id: "UI-R44-008", severity: "P1", status: "FIXED_LOCAL", files: ["components/market-integrity/ShieldRealMarketsParityClient.tsx"], condition: "Shield provider-unavailable state rendered numeric zero KPIs that could be mistaken for observed market values.", fix: "Unavailable, loading and empty non-reference states withhold the four KPIs as em dashes and suppress derived sparkline/progress output.", positiveTest: "Physical provider-unavailable Shield route and static boundary must show unavailable labels without numeric KPI claims.", negativeTest: "Unavailable provider state cannot render 0, 0.00% or 0% as a market observation.", remainingTruth: "No provider-currentness, real-data or LIVE credit." },
    { id: "UI-R44-009", severity: "P1", status: "FIXED_LOCAL", files: ["components/market-integrity/CrossAssetCollapseRadarPanel.tsx"], condition: "Real Markets provider-unavailable state rendered a 0% active-instruments KPI despite having no verified risk values.", fix: "The active-instruments percentage and progress accent are withheld until at least one verified risk value exists.", positiveTest: "Physical provider-unavailable Real Markets route must show an em dash and unavailable label.", negativeTest: "Zero verified risk values cannot render 0% as a market observation.", remainingTruth: "The local catalog and icons grant no provider-currentness, rights or LIVE credit." },
    { id: "UI-R44-010", severity: "P1", status: "FIXED_LOCAL", files: ["scripts/pass36/package-a102r44-deterministic.mjs"], condition: "The first deterministic R44 SOURCE manifest omitted the A58-required explicit a90ToA102PassCredit field and was correctly rejected during A58-first clean unpack.", fix: "The package manifest now carries a90ToA102PassCredit=false as an exact top-level no-promotion contract.", positiveTest: "A58 must be the literal first clean-unpack child and accept the manifest contract.", negativeTest: "A missing or true pass-credit field blocks clean unpack.", remainingTruth: "A58 acceptance grants no A77R1-A80R1, staging, LIVE, production or sale credit." },
  ],
  openFindings: [
    { id: "UI-R44-007", severity: "P1", status: "BLOCKED_DATA_RIGHTS_AND_PROVIDER", exactMissingInput: "Rights-approved exact 583-row icon identity matrix and authorized canonical HTTPS provider smoke.", owner: "DATA_RIGHTS_OWNER_AND_STAGING_OPERATOR", safeAcquisitionMethod: "Provider contracts/official brand sources plus disposable HTTPS staging; no copied trademark assets without permission.", requiredVerifier: "Independent rights reviewer and exact provider/route receipt.", passCriteria: "583/583 rows have truthful icon or explicit unavailable status with rights and identity binding.", whatRemainsForbidden: "No invented logos, no badge called a real icon, no canonical-origin guard weakening." },
  ],
  realDenominators,
  skuDecisions,
};
writeJson(root, STATE, state);

const program = {
  schemaVersion: "velmere.pass36.a102r44.world-class-completion-program.v1",
  revisionId: REV,
  parentRevisionId: PARENT,
  generatedAt: GENERATED_AT,
  checkpointClass: "ACTION_REQUIRED_NON_PASS",
  completedThrough: 89,
  coveredWorkRange: "BOUNDED_FINAL_UI_POLISH_EXACT_BUILD_BROWSER_AND_CLEAN_HANDOFF",
  statePath: STATE,
  approvedChangeLedgerPath: LEDGER,
  descendantManifestPath: MANIFEST,
  globalDecision: "NO_GO",
  live: false,
  saleEnabled: false,
  productionApproved: false,
  worldClassProven: false,
  localUiWork: { closedFindings: 9, blockedFindings: 1, finalUiPolishBoundaryChecks: 35, localCanonicalIconAssets: 187, requiredMarketRows: 583, exactFinalByteBuildBrowserCredit: false, cleanupStarted: false },
  externalBlockers: state.openFindings,
  remainingCheckpointEstimate: { minimum: 11, mostLikely: 23, withRevisionsAndRetests: 39 },
  nextSafeAction: "Complete exact local regression and browser receipts, package deterministic clean handoff, then acquire rights-approved icon/provider evidence without weakening fail-closed security.",
};
writeJson(root, PROGRAM, program);

const parentByPath = new Map(parent.rows.map((row) => [row.path, row]));
const firstInventory = collectCurrentSource(root, { platform: process.platform });
invariant(firstInventory.rejected.length === 0, `a102r44_source_rejected:${JSON.stringify(firstInventory.rejected)}`);
const currentRowsForDiff = firstInventory.rows.filter((row) => row.path !== LEDGER);
const currentByPath = new Map(currentRowsForDiff.map((row) => [row.path, row]));
const allPaths = [...new Set([...parentByPath.keys(), ...currentByPath.keys()])].sort((left, right) => Buffer.from(left).compare(Buffer.from(right)));
const approvedChanges = [];
for (const entryPath of allPaths) {
  const before = parentByPath.get(entryPath) ?? null;
  const current = currentByPath.get(entryPath) ?? null;
  if (before && current && canonicalJson(before) === canonicalJson(current)) continue;
  const changeType = before === null ? "ADDED" : current === null ? "DELETED" : "MODIFIED";
  approvedChanges.push({
    path: entryPath,
    changeType,
    parentByteLength: before?.byteLength ?? null,
    parentSha256: before?.sha256 ?? null,
    parentMode: before?.mode ?? null,
    currentByteLength: current?.byteLength ?? null,
    currentSha256: current?.sha256 ?? null,
    currentMode: current?.mode ?? null,
    reason: entryPath.startsWith("components/") || entryPath.startsWith("app/") || entryPath.startsWith("lib/")
      ? "Bounded user-visible UI, navigation, performance or data-truth repair."
      : entryPath.startsWith("scripts/")
        ? "R44 regression, authority verification or deterministic packaging required for legal freeze."
        : "R44 authority pointer, roadmap, truth-state or release binding reconciliation.",
  });
}
const changedPaths = approvedChanges.map((row) => row.path);
invariant(canonicalJson(changedPaths) === canonicalJson(EXPECTED_CHANGED_PATHS), `a102r44_unapproved_change_set:${JSON.stringify({ expected: EXPECTED_CHANGED_PATHS, actual: changedPaths })}`);
invariant(approvedChanges.every((row) => row.changeType !== "DELETED"), "a102r44_deleted_source_forbidden");

const ledger = {
  schemaVersion: "velmere.pass36.a102r44.approved-current-source-changes.v1",
  revisionId: REV,
  parentRevisionId: PARENT,
  generatedAt: GENERATED_AT,
  parentDescendantManifestPath: PARENT_MANIFEST,
  parentDescendantManifestRawSha256: sha256(parent.parentManifestBytes),
  parentDescendantManifestDigestSha256: parent.parentManifest.manifestDigestSha256,
  parentReconstruction: { grandparentRevisionId: GRANDPARENT, grandparentSourceArchiveByteLength: GRANDPARENT_ARCHIVE_BYTES, grandparentSourceArchiveSha256: GRANDPARENT_ARCHIVE_SHA256, parentApprovedLedgerPath: PARENT_LEDGER, parentApprovedLedgerRawSha256: sha256(parent.parentLedgerBytes), parentPayload: parent.parentManifest.payload },
  selfExcludedPaths: [LEDGER, MANIFEST],
  changedPathCount: approvedChanges.length,
  addedFiles: approvedChanges.filter((row) => row.changeType === "ADDED").length,
  modifiedFiles: approvedChanges.filter((row) => row.changeType === "MODIFIED").length,
  deletedFiles: approvedChanges.filter((row) => row.changeType === "DELETED").length,
  approvedPathSetSha256: sha256(changedPaths.join("\n")),
  approvedChanges,
  changeApprovalClass: "PRIMARY_AGENT_BOUNDED_FINAL_UI_POLISH_EXACT_LOCAL_HANDOFF_NO_EXTERNAL_DUAL_CONTROL_CREDIT",
  globalDecision: "NO_GO",
  live: false,
  saleEnabled: false,
  productionApproved: false,
  worldClassProven: false,
};
ledger.ledgerDigestSha256 = sha256(canonicalJson(ledger));
writeJson(root, LEDGER, ledger);

const finalInventory = collectCurrentSource(root, { platform: process.platform });
invariant(finalInventory.rejected.length === 0, `a102r44_final_source_rejected:${JSON.stringify(finalInventory.rejected)}`);
const manifest = {
  schemaVersion: "velmere.pass36.a102r44.current-root-descendant-manifest.v1",
  revisionId: REV,
  parentRevisionId: PARENT,
  parentDescendantManifestDigestSha256: parent.parentManifest.manifestDigestSha256,
  generatedAt: GENERATED_AT,
  checkpointClass: "ACTION_REQUIRED_NON_PASS",
  completedThrough: 89,
  coveredWorkRange: "BOUNDED_FINAL_UI_POLISH_EXACT_BUILD_BROWSER_AND_CLEAN_HANDOFF",
  physicalPlatform: process.platform,
  payload: sourcePayload(finalInventory.rows),
  staticBindings: { stateSha256: sha256(fs.readFileSync(path.join(root, STATE))), completionProgramSha256: sha256(fs.readFileSync(path.join(root, PROGRAM))), sourceModePolicySha256: sha256(fs.readFileSync(path.join(root, MODE))), approvedChangeLedgerSha256: sha256(fs.readFileSync(path.join(root, LEDGER))), parentDescendantManifestSha256: sha256(parent.parentManifestBytes) },
  claims: {
    a90PassCredit: false,
    a91PassCredit: false,
    a92PassCredit: false,
    a93PassCredit: false,
    a94PassCredit: false,
    a95PassCredit: false,
    a96PassCredit: false,
    a97PassCredit: false,
    a98PassCredit: false,
    a99PassCredit: false,
    a100PassCredit: false,
    a101PassCredit: false,
    a102PassCredit: false,
    approvedChangePaths: approvedChanges.length,
    authorityVerifierChecksRequired: approvedChanges.length + 24,
    finalUiPolishBoundaryChecks: 35,
    localCanonicalIconAssets: 187,
    requiredMarketRows: 583,
    exactFinalByteBuildBrowserCredit: false,
    exactA77R1ToA80R1Credit: false,
    stagingCredit: false,
    liveProven: false,
    saleEnabled: false,
    productionApproved: false,
    worldClassProven: false,
  },
  denominators: realDenominators,
  skuDecisions,
};
manifest.manifestDigestSha256 = sha256(canonicalJson(manifest));
writeJson(root, MANIFEST, manifest);

console.log(JSON.stringify({ status: "BUILT_A102R44_ACTION_REQUIRED_FINAL_UI_POLISH_AUTHORITY_NO_LIVE_CREDIT", revisionId: REV, parentRevisionId: PARENT, approvedChanges: approvedChanges.length, payload: manifest.payload, manifestDigestSha256: manifest.manifestDigestSha256, globalDecision: "NO_GO", live: false, saleEnabled: false, productionApproved: false, worldClassProven: false }, null, 2));
