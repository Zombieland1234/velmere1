import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { parseDeterministicZipBytes } from "../pass4826/release-package-contract.mjs";
import { canonicalJson, collectCurrentSource, sha256, sourcePayload } from "./current-source-authority-lib.mjs";
import { parseStrictJsonCli } from "./strict-json-cli.mjs";

const REV = "VELMERE_PASS36_A102R43_ACTION_REQUIRED_FINAL_UI_UX_PERFORMANCE_HARDENING_AND_BLOCKED_FAULT_EMULATION_NO_LIVE_CREDIT";
const PARENT = "VELMERE_PASS36_A102R42_ACTION_REQUIRED_A60_TOTAL_FAIL_CLOSED_RECEIPT_AND_LOG_CLASSIFIER_BOUNDARY_EXACT_WINDOWS_NO_LIVE_CREDIT";
const PARENT_ARCHIVE_SHA256 = "cc45a9fed3a7b4981f52f34c6d04d2259e659fb92e27dd99eb23b778cfb234ac";
const PARENT_ARCHIVE_BYTES = 131326341;
const PARENT_MANIFEST = "config/pass36/a102r42-current-root-descendant-manifest.json";
const LEDGER = "config/pass36/a102r43-approved-current-source-changes.json";
const MANIFEST = "config/pass36/a102r43-current-root-descendant-manifest.json";
const STATE = "config/pass36/a102r43-action-required-current-state.json";
const PROGRAM = "config/pass36/a102r43-world-class-completion-program.json";
const MODE = "config/pass36/a102r43-cross-platform-source-mode-policy.json";
const GENERATED_AT = "2026-08-02T02:30:00+02:00";
const EXPECTED_CHANGED_PATHS = [
  "VELMERE_A102R43_PATCH.txt",
  "VELMERE_ACTIVE_PASS.txt",
  "VELMERE_WORLD_CLASS_MAX_ROADMAP_PASS35.txt",
  "app/[locale]/shield/page.tsx",
  "components/home/HomePageClient.tsx",
  "components/market-integrity/CrossAssetCollapseRadarPanel.tsx",
  "components/market-integrity/ShieldProCleanTerminalClient.tsx",
  "components/market-integrity/ShieldProMonochromeGlobe.module.css",
  "components/market-integrity/ShieldProMonochromeGlobe.tsx",
  "components/market-integrity/ShieldRealMarketsParityClient.tsx",
  "components/ui/VelmereRouteTransition.tsx",
  "config/current-release.json",
  "config/pass35/current-revision.json",
  "config/pass36/a102r43-action-required-current-state.json",
  "config/pass36/a102r43-cross-platform-source-mode-policy.json",
  "config/pass36/a102r43-world-class-completion-program.json",
  "config/pass36/a58-release-integrity-policy.json",
  "config/pass36/a60-exact-final-byte-build-browser-acceptance.json",
  "config/pass36/a62-offline-exact-runtime-dependency-bootstrap.json",
  "config/pass36/a63-staging-program-orchestrator.json",
  "config/pass36/a78-exact-runtime-lockfile-browser-bootstrap.json",
  "config/pass36/a79-exact-final-byte-build-browser-evidence-binding.json",
  "config/pass36/a80-frozen-local-release-candidate-admission.json",
  "config/pass36/current-release-authority.json",
  "package.json",
  "scripts/pass36/build-a102r43-ui-performance-authority.mjs",
  "scripts/pass36/current-source-authority-lib.mjs",
  "scripts/pass36/verify-a102r42-a60-failure-finalization-denominator-migration.mjs",
  "scripts/pass36/verify-a102r42-action-required-authority.mjs",
  "scripts/pass36/verify-a102r43-ui-performance-authority.mjs"
].sort((left, right) => Buffer.from(left).compare(Buffer.from(right)));

const invariant = (condition, code) => { if (!condition) throw new Error(code); };
const readJson = (root, relativePath) => parseStrictJsonCli(fs.readFileSync(path.join(root, relativePath), "utf8"), {
  maxBytes: 16 * 1024 * 1024,
  maxDepth: 128,
  maxNodes: 1_000_000,
  requireObject: true,
});

function parseArgs(argv) {
  invariant(argv.length === 2 && argv[0] === "--parent-source-zip", "a102r43_parent_archive_argument_required");
  return path.resolve(argv[1]);
}

const root = process.cwd();
const parentArchivePath = parseArgs(process.argv.slice(2));
const parentArchiveBytes = fs.readFileSync(parentArchivePath);
invariant(parentArchiveBytes.length === PARENT_ARCHIVE_BYTES, "a102r43_parent_archive_size");
invariant(sha256(parentArchiveBytes) === PARENT_ARCHIVE_SHA256, "a102r43_parent_archive_sha256");
const parsedParent = parseDeterministicZipBytes(parentArchiveBytes);
invariant(parsedParent.entries.length === 5582, "a102r43_parent_archive_entry_denominator");

const parentRows = parsedParent.entries
  .filter((row) => !row.path.startsWith("_velmere/"))
  .map(({ path: entryPath, byteLength, sha256: digest, mode }) => ({ path: entryPath, byteLength, sha256: digest, mode }));
invariant(parentRows.length === 5581, "a102r43_parent_source_entry_denominator");
const parentByPath = new Map(parentRows.map((row) => [row.path, row]));

const firstInventory = collectCurrentSource(root, { platform: process.platform });
invariant(firstInventory.rejected.length === 0, `a102r43_source_rejected:${JSON.stringify(firstInventory.rejected)}`);
const currentRowsForDiff = firstInventory.rows.filter((row) => row.path !== LEDGER);
const currentByPath = new Map(currentRowsForDiff.map((row) => [row.path, row]));
const allPaths = [...new Set([...parentByPath.keys(), ...currentByPath.keys()])]
  .sort((left, right) => Buffer.from(left).compare(Buffer.from(right)));
const approvedChanges = [];
for (const entryPath of allPaths) {
  const parent = parentByPath.get(entryPath) ?? null;
  const current = currentByPath.get(entryPath) ?? null;
  if (parent && current && canonicalJson(parent) === canonicalJson(current)) continue;
  const changeType = parent === null ? "ADDED" : current === null ? "DELETED" : "MODIFIED";
  approvedChanges.push({
    path: entryPath,
    changeType,
    parentByteLength: parent?.byteLength ?? null,
    parentSha256: parent?.sha256 ?? null,
    parentMode: parent?.mode ?? null,
    currentByteLength: current?.byteLength ?? null,
    currentSha256: current?.sha256 ?? null,
    currentMode: current?.mode ?? null,
    reason: entryPath.startsWith("components/") || entryPath.startsWith("app/")
      ? "Bounded user-visible UI/UX/performance repair."
      : entryPath.startsWith("scripts/")
        ? "Authority verifier or lint-gate repair required to freeze the legal descendant."
        : "R43 authority, truth, roadmap or release-pointer reconciliation."
  });
}
const changedPaths = approvedChanges.map((row) => row.path);
invariant(canonicalJson(changedPaths) === canonicalJson(EXPECTED_CHANGED_PATHS), `a102r43_unapproved_change_set:${JSON.stringify({ expected: EXPECTED_CHANGED_PATHS, actual: changedPaths })}`);
invariant(approvedChanges.every((row) => row.changeType !== "DELETED"), "a102r43_deleted_source_forbidden");

const parentManifestBytes = fs.readFileSync(path.join(root, PARENT_MANIFEST));
const parentManifest = parseStrictJsonCli(parentManifestBytes.toString("utf8"), { maxBytes: 16 * 1024 * 1024, maxDepth: 128, maxNodes: 1_000_000, requireObject: true });
invariant(parentManifest.revisionId === PARENT && parentManifest.manifestDigestSha256 === "2d3d648f90e0f48e9e99538499f1b58e602a2e8230f10e6a9d4f575522078662", "a102r43_parent_descendant_identity");

const ledger = {
  schemaVersion: "velmere.pass36.a102r43.approved-current-source-changes.v1",
  revisionId: REV,
  parentRevisionId: PARENT,
  generatedAt: GENERATED_AT,
  parentSourceArchiveFileName: path.basename(parentArchivePath),
  parentSourceArchiveByteLength: PARENT_ARCHIVE_BYTES,
  parentSourceArchiveSha256: PARENT_ARCHIVE_SHA256,
  parentPhysicalEntryCount: parsedParent.entries.length,
  parentComparedSourceEntryCount: parentRows.length,
  parentDescendantManifestRawSha256: sha256(parentManifestBytes),
  parentDescendantManifestDigestSha256: parentManifest.manifestDigestSha256,
  selfExcludedPaths: [LEDGER, MANIFEST],
  changedPathCount: approvedChanges.length,
  addedFiles: approvedChanges.filter((row) => row.changeType === "ADDED").length,
  modifiedFiles: approvedChanges.filter((row) => row.changeType === "MODIFIED").length,
  deletedFiles: approvedChanges.filter((row) => row.changeType === "DELETED").length,
  approvedPathSetSha256: sha256(changedPaths.join("\n")),
  approvedChanges,
  changeApprovalClass: "PRIMARY_AGENT_BOUNDED_LOCAL_UI_HARDENING_NO_EXTERNAL_DUAL_CONTROL_CREDIT",
  globalDecision: "NO_GO",
  live: false,
  saleEnabled: false,
  productionApproved: false,
  worldClassProven: false
};
ledger.ledgerDigestSha256 = sha256(canonicalJson(ledger));
fs.writeFileSync(path.join(root, LEDGER), `${JSON.stringify(ledger, null, 2)}\n`, "utf8");

const state = readJson(root, STATE);
const program = readJson(root, PROGRAM);
const mode = readJson(root, MODE);
invariant(state.revisionId === REV && state.parentRevisionId === PARENT && state.globalDecision === "NO_GO", "a102r43_state_identity");
invariant(program.revisionId === REV && program.parentRevisionId === PARENT && program.globalDecision === "NO_GO", "a102r43_program_identity");
invariant(mode.revisionId === REV && mode.parentRevisionId === PARENT && mode.executablePaths?.length === 58, "a102r43_mode_identity");

const finalInventory = collectCurrentSource(root, { platform: process.platform });
invariant(finalInventory.rejected.length === 0, `a102r43_final_source_rejected:${JSON.stringify(finalInventory.rejected)}`);
const manifest = {
  schemaVersion: "velmere.pass36.a102r43.current-root-descendant-manifest.v1",
  revisionId: REV,
  parentRevisionId: PARENT,
  parentDescendantManifestDigestSha256: parentManifest.manifestDigestSha256,
  generatedAt: GENERATED_AT,
  checkpointClass: "ACTION_REQUIRED_NON_PASS",
  completedThrough: 89,
  coveredWorkRange: "BOUNDED_FINAL_UI_UX_PERFORMANCE_HARDENING_BEFORE_CLEANUP",
  physicalPlatform: process.platform,
  payload: sourcePayload(finalInventory.rows),
  staticBindings: {
    stateSha256: sha256(fs.readFileSync(path.join(root, STATE))),
    completionProgramSha256: sha256(fs.readFileSync(path.join(root, PROGRAM))),
    sourceModePolicySha256: sha256(fs.readFileSync(path.join(root, MODE))),
    approvedChangeLedgerSha256: sha256(fs.readFileSync(path.join(root, LEDGER))),
    parentDescendantManifestSha256: sha256(parentManifestBytes)
  },
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
    authorityVerifierChecksRequired: 51,
    physicalNavigationTransitionsObserved: 20,
    physicalMobileLocaleProductRoutesObserved: 9,
    finalByteBrowserCredit: false,
    faultEmulationCredit: false,
    exactA77R1ToA80R1Credit: false,
    stagingCredit: false,
    liveProven: false,
    saleEnabled: false,
    productionApproved: false,
    worldClassProven: false
  },
  denominators: state.realDenominators,
  skuDecisions: state.skuDecisions
};
manifest.manifestDigestSha256 = sha256(canonicalJson(manifest));
fs.writeFileSync(path.join(root, MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  status: "BUILT_A102R43_ACTION_REQUIRED_UI_PERFORMANCE_AUTHORITY_NO_LIVE_CREDIT",
  revisionId: REV,
  parentRevisionId: PARENT,
  approvedChanges: approvedChanges.length,
  payload: manifest.payload,
  manifestDigestSha256: manifest.manifestDigestSha256,
  globalDecision: "NO_GO",
  live: false,
  saleEnabled: false,
  productionApproved: false,
  worldClassProven: false
}, null, 2));
