import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { parseStrictJsonCli } from "./strict-json-cli.mjs";

const root = process.cwd();
const REV = "VELMERE_PASS36_A102R42_ACTION_REQUIRED_A60_TOTAL_FAIL_CLOSED_RECEIPT_AND_LOG_CLASSIFIER_BOUNDARY_EXACT_WINDOWS_NO_LIVE_CREDIT";
const PARENT = "VELMERE_PASS36_A102R41_ACTION_REQUIRED_SECURITY_EVIDENCE_AUTHORITY_EXACT_WINDOWS_AND_FAIL_CLOSED_RELEASE_PACKAGING_NO_LIVE_CREDIT";
const RECORDED_AT = "2026-08-01T23:05:00+02:00";
const STATE = "config/pass36/a102r42-action-required-current-state.json";
const PROGRAM = "config/pass36/a102r42-world-class-completion-program.json";
const MANIFEST = "config/pass36/a102r42-current-root-descendant-manifest.json";
const MODE_POLICY = "config/pass36/a102r42-cross-platform-source-mode-policy.json";
const MODE_MIGRATION = "config/pass36/a102r42-source-mode-denominator-migration.json";
const AUTHORITY_MIGRATION = "config/pass36/a102r42-current-source-authority-denominator-migration.json";
const REGRESSION_MIGRATION = "config/pass36/a102r42-frozen-regression-denominator-migration.json";
const A80_RECEIPT_MIGRATION = "config/pass36/a102r42-a80r1-receipt-denominator-migration.json";
const PACKAGE_BOUNDARY_MIGRATION = "config/pass36/a102r42-package-boundary-denominator-migration.json";
const DESCENDANT_VERIFIER_MIGRATION = "config/pass36/a102r42-descendant-verifier-denominator-migration.json";
const FAILURE_FINALIZATION_MIGRATION = "config/pass36/a102r42-a60-failure-finalization-denominator-migration.json";
const A42_CONTRACT = "config/pass35/a42-dev-runtime-cache-recovery.json";
const A42_EVIDENCE = "config/pass36/a102r42-a42-critical-rebaseline.json";
const PARENT_PACKAGE = "config/pass36/a102r42-parent-source-package-manifest.json";
const SPARSE_LEDGER = "config/pass36/a102r41-historical-descendant-sparse-edge-ledger.json";
const PATCH_PATH = "VELMERE_A102R42_PATCH.txt";
const ROADMAP_PATH = "VELMERE_WORLD_CLASS_MAX_ROADMAP_PASS35.txt";
const ROADMAP_SUFFIX_SHA256 = "70365bcd82276db15d5893344edb7264b8735228339df6864d31c1e3f36095b1";
const ROADMAP_SUFFIX_BYTES = 1867987;
const ROADMAP_MARKER = "================================================================================\nPRESERVED PRIOR CANONICAL ROADMAP CONTENT FOLLOWS\n================================================================================\n\n";
const LEGACY_R42_ROADMAP_MARKER = "\n===== EXACT R41 ROADMAP SUFFIX — 1867987 BYTES — SHA256 70365bcd82276db15d5893344edb7264b8735228339df6864d31c1e3f36095b1 =====\n";
const VERIFIER = "scripts/pass36/verify-a102r42-action-required-authority.mjs";
const VERIFIER_STATUS = "PASS_A102R42_ACTION_REQUIRED_AUTHORITY_A60_TOTAL_FAIL_CLOSED_RECEIPT_AND_LOG_CLASSIFIER_BOUNDARY_EXACT_WINDOWS_NO_LIVE_CREDIT";
const ARCHIVE_MANIFEST = "_velmere/PASS36_A102R42_SOURCE_ONLY_MANIFEST.json";
const ARCHIVE_SCHEMA = "velmere.pass36.a102r42.source-only-package-manifest.v1";

const read = (relativePath) => parseStrictJsonCli(fs.readFileSync(path.join(root, relativePath), "utf8"), { maxBytes: 16 * 1024 * 1024, maxDepth: 128, maxNodes: 1_000_000, requireObject: true });
const write = (relativePath, value) => fs.writeFileSync(path.join(root, relativePath), `${JSON.stringify(value, null, 2)}\n`, "utf8");
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const lexical = (left, right) => left < right ? -1 : left > right ? 1 : 0;
const canonicalJson = (value) => Array.isArray(value)
  ? `[${value.map(canonicalJson).join(",")}]`
  : value && typeof value === "object"
    ? `{${Object.keys(value).sort(lexical).map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`
    : JSON.stringify(value);
const digestDocument = (core, field) => ({ ...core, [field]: sha256(canonicalJson(core)) });
const invariant = (condition, code) => { if (!condition) throw new Error(code); };

const parentPackageBytes = fs.readFileSync(path.join(root, PARENT_PACKAGE));
const parentPackage = parseStrictJsonCli(parentPackageBytes.toString("utf8"), { maxBytes: 16 * 1024 * 1024, maxDepth: 128, maxNodes: 1_000_000, requireObject: true });
invariant(sha256(parentPackageBytes) === "8925e849d7c625e82fe9d4e85040da5a818f995c99d80e50e6c627a963f334b3", "a102r42_parent_package_raw_hash");
invariant(parentPackage.manifestSha256 === "9e3baa4830255919873e56d9c19be76d8f87c84d605629d63f8ee215bdf9930b" && parentPackage.revisionId === PARENT, "a102r42_parent_package_identity");
const parentEntryByPath = new Map(parentPackage.entries.map((entry) => [entry.path, entry]));
const assertExactParentInput = (relativePath) => {
  const expected = parentEntryByPath.get(relativePath);
  invariant(expected, `a102r42_parent_input_not_in_package:${relativePath}`);
  const absolute = path.join(root, relativePath);
  const metadata = fs.lstatSync(absolute);
  invariant(metadata.isFile() && !metadata.isSymbolicLink(), `a102r42_parent_input_not_regular:${relativePath}`);
  const bytes = fs.readFileSync(absolute);
  invariant(bytes.length === expected.byteLength && sha256(bytes) === expected.sha256, `a102r42_parent_input_byte_drift:${relativePath}`);
};
for (const relativePath of [
  "VELMERE_ACTIVE_PASS.txt",
  "VELMERE_WORLD_CLASS_MAX_ROADMAP_PASS35.txt",
  "package.json",
  "config/current-release.json",
  "config/pass35/current-revision.json",
  "config/pass35/a42-dev-runtime-cache-recovery.json",
  "config/pass36/current-release-authority.json",
  "config/pass36/a58-release-integrity-policy.json",
  "config/pass36/a60-exact-final-byte-build-browser-acceptance.json",
  "config/pass36/a62-offline-exact-runtime-dependency-bootstrap.json",
  "config/pass36/a63-staging-program-orchestrator.json",
  "config/pass36/a78-exact-runtime-lockfile-browser-bootstrap.json",
  "config/pass36/a79-exact-final-byte-build-browser-evidence-binding.json",
  "config/pass36/a80-frozen-local-release-candidate-admission.json",
  "config/pass36/a102r41-action-required-current-state.json",
  "config/pass36/a102r41-world-class-completion-program.json",
  "config/pass36/a102r41-cross-platform-source-mode-policy.json",
  "config/pass36/a102r41-current-source-authority-denominator-migration.json",
  "config/pass36/a102r41-a42-critical-rebaseline.json",
]) assertExactParentInput(relativePath);

const parentState = read("config/pass36/a102r41-action-required-current-state.json");
const findings = structuredClone(parentState.findings);
findings.push(
  {
    id: "A102R42-P0-40",
    severity: "P0_RELEASE_EVIDENCE_FINALIZATION",
    status: "LOCALLY_FIXED_FROZEN_FINAL_BYTE_RETEST_REQUIRED",
    affectedFiles: ["scripts/pass36/a79-exact-build-browser-lib.mjs", "scripts/a60-exact-final-byte-build-browser-acceptance.mjs", "scripts/a60-package-evidence.mjs", "scripts/pass36/test-a60-exact-final-byte-build-browser-acceptance.mjs"],
    failureCondition: "A partial seven-of-fourteen A60 stage sequence dereferenced a missing row inside finally, masked stage_failed:a60-contract, emitted a raw stack containing a local path and failed to write the required bounded rejection receipt.",
    remediation: "Make stage validation total over missing, sparse, null, primitive and invalid policy rows; preserve the first stage failure; convert unexpected finalizer errors to a bounded internal row; always attempt sanitized ACTION_REQUIRED receipt finalization; require receipt schema v3.",
    positiveTest: "The retained 16 semantic cases plus 18 new malformed-row, policy, runtime-binding and classifier cases pass 34/34 and the formal migration verifier passes 21/21.",
    negativeTest: "Every partial or malformed stage collection returns exactly fifteen structured validation rows, nonzero failure, no throw, no raw stack and no absolute local path.",
    remainingTruthBoundary: "Unit and local failure-finalization hardening is not exact final-byte A60 credit; the exact clean-package run remains required.",
    requiredRetest: "Frozen regression 29/29, deterministic SOURCE 2/2, A58-first clean unpack, then exact A60 14/14 on the final R42 bytes.",
  },
  {
    id: "A102R42-P1-41",
    severity: "P1_LOG_SAFETY_CLASSIFIER",
    status: "LOCALLY_FIXED_FULL_A60_RETEST_REQUIRED",
    affectedFiles: ["scripts/pass36/a79-exact-build-browser-lib.mjs", "scripts/pass36/test-a60-exact-final-byte-build-browser-acceptance.mjs"],
    failureCondition: "The unanchored provider-ID expression treated the internal key fragment RISK_ as a secret prefix and rejected otherwise sanitized A60 contract output.",
    remediation: "Require a non-alphanumeric or start boundary before provider identifiers while retaining rejection of actual standalone sk_, pk_, whsec_, session, customer, payment and account identifiers.",
    positiveTest: "The exact RISK_MULTILINGUAL authority token is accepted without weakening all other log-safety rules.",
    negativeTest: "A standalone credential=sk_test_example123456 remains rejected.",
    remainingTruthBoundary: "Classifier correction grants no provider, secret-handling, build, browser, LIVE or sale credit.",
    requiredRetest: "Run the actual A60 contract stage and all 14 exact stages on final clean-unpacked R42 bytes.",
  },
  {
    id: "A102R42-P1-42",
    severity: "P1_CURRENT_SOURCE_AUTHORITY",
    status: "LOCALLY_FIXED_CURRENT_AUTHORITY_RETEST_REQUIRED",
    affectedFiles: ["scripts/pass36/current-source-authority-lib.mjs", AUTHORITY_MIGRATION],
    failureCondition: "A coherently rewritten but unsupported revision could fall back to the R41 verifier path and status instead of being rejected as an unknown authority profile.",
    remediation: "Require the resolved revision to exist in the exact authority-profile map before any source authority can pass.",
    positiveTest: "The exact R42 profile, verifier path and expected status resolve without mismatch.",
    negativeTest: "An internally coherent unknown revision/profile replay is rejected.",
    remainingTruthBoundary: "Local current-source coherence is not independent dual control or promotion credit.",
    requiredRetest: "Current-source authority harness 47/47, descendant chain and A58-first clean unpack.",
  },
  {
    id: "A102R42-P0-43",
    severity: "P0_HISTORICAL_EVIDENCE_IMMUTABILITY",
    status: "LOCALLY_FIXED_DESCENDANT_AND_PACKAGE_RETEST_REQUIRED",
    affectedFiles: ["scripts/pass36/build-a102r42-approved-current-source-changes.mjs", "scripts/pass36/verify-a102r42-approved-current-source-changes.mjs", "scripts/pass36/build-a102r42-current-root-descendant-manifest.mjs"],
    failureCondition: "The first R42 approved-change draft could classify modified R41-namespaced evidence or verifier bytes as an approved current change, allowing frozen history to be rewritten while retaining a canonical self-digest.",
    remediation: "Bind every A102R1-R41 namespaced path and every prior/competing descendant-manifest path to the exact R41 package entry, reject injected historical/future descendant namespaces, and require both raw and canonical R41 descendant anchors.",
    positiveTest: "All frozen historical paths, including A78-A102 descendant planes and A102R1-R41 artifacts, match exact parent bytes plus the R41 raw/canonical descendant anchors.",
    negativeTest: "A one-byte historical rewrite or injected A102R43 descendant-manifest path is rejected before an approved ledger or descendant can be built.",
    remainingTruthBoundary: "Local immutable-history enforcement is not an external timestamp, signature or independent dual-control seal.",
    requiredRetest: "Approved-change verifier, descendant verifier, deterministic package 2/2 and clean-unpack history replay.",
  },
  {
    id: "A102R42-P1-44",
    severity: "P1_CURRENT_AUTHORITY_COHERENT_SUBSTITUTION",
    status: "LOCALLY_FIXED_PREFLIGHT_RETEST_REQUIRED",
    affectedFiles: ["scripts/pass36/current-source-authority-lib.mjs", AUTHORITY_MIGRATION],
    failureCondition: "The exact authority library did not bind authority.sourceParentRevisionId and accepted a coherently substituted A58 archive path/schema pair.",
    remediation: "Bind the duplicate parent alias and exact per-revision archive manifest path and schema instead of checking only internal equality.",
    positiveTest: "R42 parent and archive contract match the registered exact profile.",
    negativeTest: "Parent-alias drift and coherent archive path/schema substitution are rejected.",
    remainingTruthBoundary: "Exact local pointer coherence remains non-promotional.",
    requiredRetest: "Expanded current-source preflight, A58 and clean-unpack.",
  },
  {
    id: "A102R42-P1-45",
    severity: "P1_RELEASE_POINTER_AND_DENOMINATOR_AUTHORITY",
    status: "LOCALLY_FIXED_PREFLIGHT_RETEST_REQUIRED",
    affectedFiles: ["scripts/pass36/current-source-authority-lib.mjs", "config/current-release.json", MODE_POLICY],
    failureCondition: "Compatibility promotion flags, compatibility-pointer paths/classes, mode-policy identity and browser row/screenshot/tab denominators were not all exact-bound and could drift coherently.",
    remediation: "Require exact non-authoritative compatibility semantics, exact pointer planes, R42 mode revision/parent and 56 browser rows, 29 screenshots and four popup tabs across every active binding.",
    positiveTest: "All product, mode and browser denominator planes agree on the frozen R42 contract.",
    negativeTest: "Promotion escalation, pointer reclassification, mode identity drift and denominator collapse are rejected.",
    remainingTruthBoundary: "Local denominator agreement is not physical browser evidence.",
    requiredRetest: "Expanded authority preflight, package boundary and exact browser execution.",
  },
  {
    id: "A102R42-P2-46",
    severity: "P2_APPROVED_CHANGE_LEDGER_ACCOUNTING",
    status: "LOCALLY_FIXED_LEDGER_RETEST_REQUIRED",
    affectedFiles: ["scripts/pass36/a102r42-approved-change-policy.mjs", "scripts/pass36/build-a102r42-approved-current-source-changes.mjs", "scripts/pass36/verify-a102r42-approved-current-source-changes.mjs"],
    failureCondition: "The first R42 verifier draft did not independently verify added/modified counters or exact family classification for every approved row.",
    remediation: "Recompute counters and family classification from exact parent/current bytes, require the closed path plus changeType allowlist, bind its policy path-set digest and reject unknown or misclassified rows.",
    positiveTest: "Every ledger row, counter, family, path, changeType, policy path-set digest and self-digest matches independent reconstruction.",
    negativeTest: "Counter drift, family drift, deletion and unlisted source change are rejected.",
    remainingTruthBoundary: "Primary-agent approval is not independent dual control.",
    requiredRetest: "Approved ledger verifier before every descendant freeze and package.",
  },
  {
    id: "A102R42-P1-47",
    severity: "P1_DESCENDANT_STATIC_BINDING_IDENTITY",
    status: "LOCALLY_FIXED_DESCENDANT_RETEST_REQUIRED",
    affectedFiles: ["scripts/pass36/build-a102r42-current-root-descendant-manifest.mjs", "scripts/pass36/verify-a102r42-current-root-descendant.mjs"],
    failureCondition: "The first descendant builder hashed several R42 static documents without first validating each schema, revision, parent and self-digest.",
    remediation: "Validate every bound static document semantically before hashing and bind the authority-denominator migration plus raw R41 parent manifest bytes.",
    positiveTest: "All static bindings have exact identity and the descendant verifier passes its expanded fixed denominator.",
    negativeTest: "A well-formed but wrong-revision, wrong-parent or bad-self-digest static document is rejected.",
    remainingTruthBoundary: "A local descendant digest is not an independent external seal.",
    requiredRetest: "Build and verify the final descendant, then package 2/2 and clean-unpack.",
  },
  {
    id: "A102R42-P1-48",
    severity: "P1_A80R1_RECEIPT_DENOMINATOR_AUTHORITY",
    status: "LOCALLY_FIXED_A80R1_RETEST_REQUIRED",
    affectedFiles: ["scripts/pass36/a80r1-two-phase-release-controller-lib.mjs", "scripts/pass36/test-a102r42-a80r1-two-phase-release-controller.mjs", A80_RECEIPT_MIGRATION],
    failureCondition: "A full-regression receipt with the right status/source/truth fields but no 29-stage denominator could count as a passed A80R1 prerequisite.",
    remediation: "Require exact schemas, ordered 29-row regression and 17-row clean-unpack provenance, zero failed rows and source immutability; retain all 36 historical assertions and formally expand A80R1 from 36 to 48 with twelve added IDs and zero removals.",
    positiveTest: "An exact R42 29/29 immutable full-regression receipt is admitted locally while phase one remains globally blocked on dual control.",
    negativeTest: "Missing, 28-stage, failed-stage or mutable-source full-regression receipts receive a stable denominator_or_immutability blocker.",
    remainingTruthBoundary: "A syntactically valid local receipt remains non-promotional and does not supply independent signatures.",
    requiredRetest: "A80R1 mechanism 48/48, frozen regression, package 2/2 and clean-unpack.",
  },
  {
    id: "A102R42-P1-49",
    severity: "P1_A42_DENOMINATOR_PRESERVATION",
    status: "LOCALLY_FIXED_A42_RETEST_REQUIRED",
    affectedFiles: ["scripts/pass36/verify-a102r42-a42-critical-rebaseline.mjs", A42_EVIDENCE],
    failureCondition: "The first R42 A42 verifier replaced the retained R41 negative-removed-row assertion with a parent anchor while declaring 38 retained, 15 added and zero removed.",
    remediation: "Restore the exact negative-removed-row assertion and record the honest 38-to-54 migration: 38 retained, 16 added, zero removed.",
    positiveTest: "All five frozen rows, three R42 rows, the parent evidence and the 76-file contract pass 54/54.",
    negativeTest: "Removing either a current or historical row invalidates the evidence digest and denominator contract.",
    remainingTruthBoundary: "Local critical-file integrity is not build, browser, staging or promotion credit.",
    requiredRetest: "A42 54/54 inside the frozen 29-stage regression and clean unpack.",
  },
  {
    id: "A102R42-P1-50",
    severity: "P1_NESTED_REGRESSION_RECEIPT_COHERENCE",
    status: "LOCALLY_FIXED_PACKAGE_RETEST_REQUIRED",
    affectedFiles: ["scripts/pass36/verify-a102r42-clean-unpack.mjs", "scripts/pass36/test-a102r42-package-portability-and-parser.mjs", PACKAGE_BOUNDARY_MIGRATION],
    failureCondition: "Clean-unpack accepted scalar 29/29 counters without requiring 29 unique passed stage rows or an empty failedStages list.",
    remediation: "Bind the exact ordered 29-stage ID set, derive counters from passed rows, require zero failed rows and migrate package-boundary tests 36-to-38 with both new negatives isolated.",
    positiveTest: "An exact 29-row immutable regression receipt is accepted and package boundary passes 38/38.",
    negativeTest: "Contradictory failedStages and collapsed stage-row arrays are independently rejected.",
    remainingTruthBoundary: "Nested local receipt coherence supplies no exact A60, LIVE or sale credit.",
    requiredRetest: "Package boundary 38/38, SOURCE 2/2 and A58-first clean unpack 17/17.",
  },
  {
    id: "A102R42-P0-51",
    severity: "P0_KNOWN_PROFILE_AUTHORITY_ROLLBACK",
    status: "LOCALLY_FIXED_CURRENT_ROOT_RETEST_REQUIRED",
    affectedFiles: ["scripts/pass36/current-source-authority-lib.mjs", AUTHORITY_MIGRATION],
    failureCondition: "A fully coherent rollback to a registered R40/R41 authority profile could select that historical profile dynamically instead of requiring the compiled current R42 root profile.",
    remediation: "Bind current-root validation to exact R42 by default while retaining explicit off-root historical fixture validation.",
    positiveTest: "The physical current root resolves exact R42; historical fixture roots remain explicitly testable.",
    negativeTest: "A known registered parent revision at the current-root boundary yields current-root-profile mismatch.",
    remainingTruthBoundary: "Local rollback resistance is not independent dual control.",
    requiredRetest: "Authority preflight 60/60, A58 and clean unpack.",
  },
  {
    id: "A102R42-P1-52",
    severity: "P1_DUPLICATE_JSON_AUTHORITY_CONFUSION",
    status: "LOCALLY_FIXED_STRICT_PARSE_RETEST_REQUIRED",
    affectedFiles: ["scripts/pass36/current-source-authority-lib.mjs", "scripts/pass36/test-a102r42-current-source-authority-preflight.mjs"],
    failureCondition: "Authority-critical JSON reads could use last-wins JSON.parse semantics and accept duplicate keys before self-digest comparison.",
    remediation: "Use bounded strict duplicate/forbidden-key parsing for current authority, manifests and R42 builders/verifiers.",
    positiveTest: "Canonical strict JSON authority documents parse and validate normally.",
    negativeTest: "A duplicate authorityRevisionId key is rejected before authority resolution.",
    remainingTruthBoundary: "Parser hardening remains local evidence only.",
    requiredRetest: "Authority preflight, descendant semantic verifiers and package parser.",
  },
  {
    id: "A102R42-P1-53",
    severity: "P1_HISTORICAL_PLANE_METADATA_DRIFT",
    status: "LOCALLY_FIXED_AUTHORITY_RETEST_REQUIRED",
    affectedFiles: ["config/pass36/current-release-authority.json", "scripts/pass36/current-source-authority-lib.mjs"],
    failureCondition: "The a102r29LocalClosure plane contained R30 identity/paths and the a102r26 plane omitted its revision and source paths.",
    remediation: "Reconcile both historical planes to their physical frozen revision/state/program/receipt/ledger identities and exact-validate the fields in R42.",
    positiveTest: "R26 and R29 plane metadata points to its own frozen artifacts.",
    negativeTest: "Replaying R30 identity into the R29 plane is rejected.",
    remainingTruthBoundary: "Metadata reconciliation does not rewrite historical artifact bytes or grant historical PASS credit.",
    requiredRetest: "Authority, approved history, descendant chain and final package.",
  },
  {
    id: "A102R42-P1-54",
    severity: "P1_PROMOTION_ALIAS_AUTHORITY_CONFUSION",
    status: "LOCALLY_FIXED_PREFLIGHT_RETEST_REQUIRED",
    affectedFiles: ["scripts/pass36/current-source-authority-lib.mjs", AUTHORITY_MIGRATION],
    failureCondition: "Unknown top-level promotion aliases such as authority.live=true could coexist with false canonical claims and be consumed by a confused downstream reader.",
    remediation: "Reject forbidden promotion aliases on current authority and package roots while retaining exact canonical NO_GO fields on their designated planes.",
    positiveTest: "Canonical authority contains no forbidden top-level promotion aliases.",
    negativeTest: "Coherent live/sale alias injection is rejected as forbidden-promotion-alias.",
    remainingTruthBoundary: "Alias rejection does not create promotion authority.",
    requiredRetest: "Authority preflight 60/60 and all current-root consumers.",
  },
);
invariant(findings.length === 54, "a102r42_finding_denominator");
const state = structuredClone(parentState);
state.schemaVersion = "velmere.pass36.a102r42.action-required-current-state.v1";
state.revisionId = REV;
state.parentRevisionId = PARENT;
state.generatedAt = RECORDED_AT;
state.generatedAtSemantics = "Authority metadata recording time only; not a source freeze, execution receipt, elapsed-time observation or promotion timestamp.";
state.inputParentCheckpoint = {
  revisionId: PARENT,
  sourceArchiveFileName: `${PARENT}_SOURCE_ONLY.zip`,
  sourceArchiveByteLength: 129505716,
  sourceArchiveSha256: "569ec6ee9925b86daa5eb9238110500943839a90564a0cb558d3a2d52b22ee96",
  embeddedPackageManifestRawSha256: sha256(parentPackageBytes),
  embeddedPackageManifestDigestSha256: parentPackage.manifestSha256,
  descendantManifestDigestSha256: "92672a889d2a98723486e3ad3071e93d84bc3fb45b55ceb8111eaea388fbf8a6",
  parentRoadmapByteLength: ROADMAP_SUFFIX_BYTES,
  parentRoadmapSha256: ROADMAP_SUFFIX_SHA256,
  extractedToNewEmptyRoot: true,
  materialCodeImported: false,
};
state.findings = findings;
state.findingCount = findings.length;
state.localImplementation = {
  ...state.localImplementation,
  a102r42A60FailureFinalizationSemanticCases: 34,
  a102r42A60FailureFinalizationMigrationChecks: 21,
  a102r42ReceiptSchemaVersion: "velmere.pass36.a60.exact-final-byte-build-browser-acceptance-receipt.v3",
  a102r42ActionAuthorityChecksRequired: 47,
  a102r42CurrentSourcePreflightScenariosRequired: 60,
  a102r42A42VerifierChecksRequired: 54,
  a102r42A80R1MechanismChecksRequired: 48,
  a102r42PackageBoundaryChecksRequired: 38,
  a102r42DescendantVerifierChecksRequired: 28,
  a102r42FrozenRegressionStagesRequired: 29,
  currentSourceAuthorityChecks: 60,
  a80r1MechanismChecks: 48,
  packagePortabilityAndParserChecks: 38,
  a60StageAuthorityMigrationChecks: 21,
  a60StageSequenceAndLogBindingSubcases: 34,
  a42CriticalRebaselineChecks: 54,
  a42CriticalChangedRows: 8,
  descendantVerifierChecks: 28,
  exactFinalByteA60Executed: false,
};
state.creditBoundary = {
  ...state.creditBoundary,
  a102r42LocalA60RemediationOnly: true,
  exactFinalByteBuildBrowserCredit: false,
  a77r1ToA80r1Credit: false,
};
state.nextExecutionOrder = [
  "Freeze and verify the exact R42 descendant 28/28, approved-change ledger, A42 76-file/54-check contract and 47-row action-authority harness with 60 current-source preflight scenarios.",
  "Run the retained 28 frozen stages plus the new A60 total-fail-closed stage as exact 29/29.",
  "Build SOURCE deterministically 2/2, clean-unpack, execute A58 literally first and rerun nested 29/29.",
  "Run exact Windows A60 fourteen-stage build/runtime/browser acceptance on the same final bytes and package sanitized evidence only after PASS.",
  "Continue every lawful local lane while keeping staging, rights, legal/DPO, assurance, real data and customer gates externally blocked.",
];
state.openEntryMigration = {
  ...state.openEntryMigration,
  parentOpenEntries: 31,
  newFormalProgramEntriesAdded: 0,
  entriesClosed: 0,
  currentOpenEntries: 31,
  reason: "The fifteen R42 findings refine existing A77R1-A80R1 release gates and do not create duplicate scored program entries.",
  findingToExistingGate: {
    ...state.openEntryMigration.findingToExistingGate,
    "A102R42-P0-40": "A79R1_A80R1",
    "A102R42-P1-41": "A79R1",
    "A102R42-P1-42": "A77R1_A80R1",
    "A102R42-P0-43": "A77R1_A80R1",
    "A102R42-P1-44": "A77R1_A80R1",
    "A102R42-P1-45": "A77R1_A79R1_A80R1",
    "A102R42-P2-46": "A77R1_A80R1",
    "A102R42-P1-47": "A77R1_A80R1",
    "A102R42-P1-48": "A80R1",
    "A102R42-P1-49": "A42_A79R1_A80R1",
    "A102R42-P1-50": "A80R1",
    "A102R42-P0-51": "A77R1_A80R1",
    "A102R42-P1-52": "A77R1_A80R1",
    "A102R42-P1-53": "A77R1",
    "A102R42-P1-54": "A77R1_A80R1",
  },
};
state.realDenominators.formalOpenEntries = 31;
state.truthBoundary = "A102R42 is the current legal descendant of frozen R41 and records local A60 total-fail-closed, log-classifier, unknown-profile authority and frozen-history immutability repairs. It grants no exact final-byte A60, A77R1-A80R1, staging, provider-rights, legal/DPO, independent assurance, real-data, customer, LIVE, production or sale credit.";
state.planningEstimate = { minimum: 13, mostLikely: 25, withRevisionsAndRetests: 46 };
state.globalDecision = "NO_GO";
state.live = false;
state.saleEnabled = false;
state.productionApproved = false;
state.worldClassProven = false;
write(STATE, state);

const program = structuredClone(read("config/pass36/a102r41-world-class-completion-program.json"));
program.schemaVersion = "velmere.pass36.a102r42.world-class-completion-program.v1";
program.revisionId = REV;
program.parentRevisionId = PARENT;
program.generatedAt = RECORDED_AT;
program.generatedAtSemantics = state.generatedAtSemantics;
program.formalOpenEntries = 31;
program.openEntryMigration = structuredClone(state.openEntryMigration);
program.a102r42 = {
  checkpointClass: "ACTION_REQUIRED_NON_PASS",
  completedThrough: 89,
  retainedParentFindings: 39,
  newFindings: 15,
  findingCount: 54,
  actionAuthorityChecksRequired: 47,
  currentSourcePreflightScenariosRequired: 60,
  historicalDescendantInnerChainChecksExpected: 422,
  sourceModeExecutablePathsRequired: 58,
  a80r1MechanismChecksRequired: 48,
  descendantVerifierChecksRequired: 28,
  a60FailureFinalizationMigrationChecksRequired: 21,
  a60StageSequenceAndLogBindingSubcasesBefore: 16,
  a60StageSequenceAndLogBindingSubcasesRequired: 34,
  a60SemanticCaseIdentitySha256: "1713af0162fadb1d2a6bf7ad5d52beed61f85bee5ee6a3442cf7c6a648a4c7bd",
  a60RequiredStages: 14,
  a60ReceiptSchemaVersion: "velmere.pass36.a60.exact-final-byte-build-browser-acceptance-receipt.v3",
  failedParentA60AttemptRetained: true,
  failedParentA60PrimaryFailure: "stage_failed:a60-contract",
  failedParentA60ExecutedStages: 7,
  failedParentA60RequiredStages: 14,
  failedParentA60RawRejectedStdoutBytes: 46608,
  failedParentA60RawRejectedStdoutSha256: "1a0a1494eecfb2c9920436f471828c1aa26c8a9e23a77ab0c9ee251d566c2907",
  failedParentA60CapturedStderrBytes: 969,
  failedParentA60CapturedStderrSha256: "e87ac93b33f82d2577d5e55b9850fc45845b22221b49b2a526824ca1d8f80023",
  failedParentA60TopReceiptPresent: false,
  frozenLocalRegressionStagesBefore: 28,
  frozenLocalRegressionStagesRequired: 29,
  packageBoundaryChecksRequired: 38,
  a42VerifierChecksRequired: 54,
  cleanUnpackStepsRequired: 17,
  browserRowsRequired: 56,
  browserScenarioChecksRequired: 57,
  screenshotsRequired: 29,
  popupTabsRequired: 4,
  browserEvidenceVerifierChecksRequired: 584,
  a60EvidencePackagePathsRequired: 59,
  exactWindowsInputPreflightLocalOnly: true,
  exactFinalByteBuildBrowserCredit: false,
  passCredit: false,
};
program.nextExecutionOrder = structuredClone(state.nextExecutionOrder);
program.truthBoundary = state.truthBoundary;
program.planningEstimate = { minimumCheckpoints: 13, mostLikelyCheckpoints: 25, withRevisionsRetestsLegalProviderCustomer: 46 };
program.skuDecisions = structuredClone(state.skuDecisions);
program.globalDecision = "NO_GO";
program.live = false;
program.saleEnabled = false;
program.productionApproved = false;
program.worldClassProven = false;
write(PROGRAM, program);

const mode = structuredClone(read("config/pass36/a102r41-cross-platform-source-mode-policy.json"));
mode.revisionId = REV;
mode.parentRevisionId = PARENT;
mode.truthBoundary = "R42 adds no shebang entrypoint: the exact 58-path R41 executable-mode denominator is retained without additions or removals. Windows execute bits remain non-authoritative and POSIX modes remain exact 0644/0755.";
invariant(mode.executablePaths.length === 58 && new Set(mode.executablePaths).size === 58, "a102r42_mode_denominator");
write(MODE_POLICY, mode);
const modeMigrationCore = {
  schemaVersion: "velmere.pass36.a102r42.source-mode-denominator-migration.v1",
  revisionId: REV,
  parentRevisionId: PARENT,
  migrationPath: MODE_MIGRATION,
  frozenPolicyPath: "config/pass36/a102r41-cross-platform-source-mode-policy.json",
  currentPolicyPath: MODE_POLICY,
  oldDenominator: 58,
  newDenominator: 58,
  retainedPaths: [...mode.executablePaths],
  addedPaths: [],
  removedPaths: [],
  reason: "All 58 frozen R41 executable paths are retained; every R42 entrypoint is intentionally a non-shebang module and no mode test is removed.",
  verifierPath: VERIFIER,
  negativeTestPath: "scripts/pass36/test-a102r42-current-source-authority-preflight.mjs",
  scoreImprovementClaimed: false,
  globalDecision: "NO_GO", live: false, saleEnabled: false, productionApproved: false, worldClassProven: false,
};
write(MODE_MIGRATION, digestDocument(modeMigrationCore, "migrationDigestSha256"));

const retainedA60SemanticCaseIds = [
  "valid", "missing", "duplicate", "reordered", "extra", "nonzero-exit", "signal", "command-substitution",
  "output-contract", "invalid-timing", "duration-mismatch", "log-path-substitution", "log-length-substitution",
  "log-sha-substitution", "observed-log-path-alias", "missing-log",
];
const addedA60SemanticCaseIds = [
  "missing-runtime-bound-stage", "undefined-row", "null-row", "sparse-row", "scalar-row", "missing-id",
  "nonarray-stages", "missing-policy", "null-policy", "empty-required-stages", "invalid-required-stage",
  "duplicate-required-stage", "runtime-base-url-substitution", "runtime-build-id-substitution",
  "runtime-instance-substitution", "runtime-probe-substitution", "log-safety-risk-token-boundary",
  "log-safety-provider-secret-rejected",
];
const a60SemanticCaseIds = [...retainedA60SemanticCaseIds, ...addedA60SemanticCaseIds];
invariant(retainedA60SemanticCaseIds.length === 16 && addedA60SemanticCaseIds.length === 18 && new Set(a60SemanticCaseIds).size === 34, "a102r42_a60_semantic_denominator");
const failureFinalizationMigrationCore = {
  schemaVersion: "velmere.pass36.a102r42.a60-failure-finalization-denominator-migration.v1",
  revisionId: REV,
  parentRevisionId: PARENT,
  recordedAt: RECORDED_AT,
  recordedAtSemantics: "Authority metadata recording time only; not a source freeze, build receipt, elapsed-time observation or promotion timestamp.",
  reason: "Physical R41 A60 exposed two independent fail-closed defects: a partial stage prefix could throw while finalizing the receipt, and an unbounded provider-token prefix matched the word RISK inside a revision identifier. Preserve every prior semantic case and add explicit totality, runtime-binding and token-boundary cases without changing the fourteen-stage execution denominator.",
  parentTestPath: "scripts/pass36/test-a60-exact-final-byte-build-browser-acceptance.mjs",
  parentTestByteLength: 16386,
  parentTestSha256: "1aa07834ece78bb1cabf9e45687d9b4c71f5fe47ab74dfdbfc7a90def7d939c8",
  parentRetainedSemanticCaseIds: retainedA60SemanticCaseIds,
  stageDenominatorBefore: 14,
  stageDenominatorAfter: 14,
  topLevelHarnessChecksBefore: 36,
  topLevelHarnessChecksAfter: 36,
  oldSemanticDenominator: 16,
  newSemanticDenominator: 34,
  retainedSemanticCaseIds: retainedA60SemanticCaseIds,
  addedSemanticCaseIds: addedA60SemanticCaseIds,
  removedSemanticCaseIds: [],
  semanticCaseIdentitySha256: sha256(a60SemanticCaseIds.join("\n")),
  receiptSchemaBefore: "velmere.pass36.a60.exact-final-byte-build-browser-acceptance-receipt.v2",
  receiptSchemaAfter: "velmere.pass36.a60.exact-final-byte-build-browser-acceptance-receipt.v3",
  validatorTotalForJsonSerializableMalformedRows: true,
  boundedUnexpectedValidatorFailure: true,
  originalStageFailurePreserved: true,
  rawErrorStackPersisted: false,
  windowsUserPathPersisted: false,
  testsDeleted: 0,
  denominatorCollapseNegativeTest: true,
  scoreImprovementClaimed: false,
  globalDecision: "NO_GO", live: false, saleEnabled: false, productionApproved: false, worldClassProven: false,
};
write(FAILURE_FINALIZATION_MIGRATION, digestDocument(failureFinalizationMigrationCore, "migrationDigestSha256"));

const parentAuthorityMigration = read("config/pass36/a102r41-current-source-authority-denominator-migration.json");
const retainedAuthorityIds = [...parentAuthorityMigration.retainedIds, ...parentAuthorityMigration.addedIds];
invariant(retainedAuthorityIds.length === 46 && new Set(retainedAuthorityIds).size === 46, "a102r42_authority_retained_denominator");
const authorityMigrationCore = {
  schemaVersion: "velmere.pass36.a102r42.current-source-authority-denominator-migration.v1",
  revisionId: REV,
  parentRevisionId: PARENT,
  classification: "FORMAL_UNKNOWN_AUTHORITY_PROFILE_FAIL_CLOSED_EXPANSION_NO_SCORE_CREDIT",
  parentMigrationPath: "config/pass36/a102r41-current-source-authority-denominator-migration.json",
  parentMigrationRawSha256: "1e5b5541b318b2e0a804ef37ac754b9cb4ad5f3ae38f5c763adc891d2c4f39ec",
  parentMigrationDigestSha256: parentAuthorityMigration.migrationDigestSha256,
  reason: "All 46 R41 authority scenarios are retained and fourteen unique coherent-substitution, known-profile rollback, duplicate-key, historical-plane, promotion, mode and denominator attacks are added; no assertion is removed or weakened.",
  oldDenominator: 46,
  newDenominator: 60,
  retainedCount: 46,
  addedCount: 14,
  removedCount: 0,
  retainedIds: retainedAuthorityIds,
  addedIds: [
    "unknown-authority-profile-rejected",
    "authority-source-parent-alias-rejected",
    "a58-coherent-archive-contract-substitution-rejected",
    "compatibility-promotion-escalation-rejected",
    "compatibility-pointer-plane-reclassification-rejected",
    "mode-policy-revision-parent-drift-rejected",
    "browser-denominator-collapse-rejected",
    "popup-tab-denominator-collapse-rejected",
    "known-authority-profile-root-downgrade-rejected",
    "historical-plane-metadata-drift-rejected",
    "historical-r26-plane-metadata-drift-rejected",
    "forbidden-promotion-alias-rejected",
    "authority-duplicate-json-key-rejected",
    "mode-policy-duplicate-json-key-rejected",
  ],
  negativeMigrationTests: ["denominator-collapse-rejected", "retained-id-removal-rejected", "duplicate-added-id-rejected", "unknown-or-wildcard-id-rejected", "parent-anchor-tamper-rejected"],
  scoreImprovementClaimed: false,
  globalDecision: "NO_GO", live: false, saleEnabled: false, productionApproved: false, worldClassProven: false,
};
write(AUTHORITY_MIGRATION, digestDocument(authorityMigrationCore, "migrationDigestSha256"));

const retainedRegressionIds = [
  "current-authority", "descendant", "approved-changes", "authority-harness", "historical-chain", "a42-critical", "route-dispatch", "route-tamper", "lazy-routes", "production-smoke-contract", "a45-browser-fixture", "product-tiers", "zero-budget", "rls", "external-command", "sanitized-child", "physical-evidence", "self-assertion-denial", "account-operation", "checkout", "paid-browser", "package-boundary", "a80", "a80r1", "source-audit-generated-types", "source-audit", "eslint", "typescript",
];
const currentRegressionIds = [...retainedRegressionIds.slice(0, 24), "a60-total-fail-closed", ...retainedRegressionIds.slice(24)];
invariant(sha256(retainedRegressionIds.join("\n")) === "7f94a5561305072e3b82129dbcea5e4df4f749c3637ae5dbfb2115d0be5941a8", "a102r42_frozen_parent_ids");
invariant(sha256(currentRegressionIds.join("\n")) === "d46cc3f46fea15b1787c74e0eab6ef94d781cc54be7d03e22d6030884b0af1ed", "a102r42_frozen_current_ids");
const regressionMigrationCore = {
  schemaVersion: "velmere.pass36.a102r42.frozen-regression-denominator-migration.v1",
  revisionId: REV,
  parentRevisionId: PARENT,
  oldDenominator: 28,
  newDenominator: 29,
  retainedCount: 28,
  addedCount: 1,
  removedCount: 0,
  retainedStageIds: retainedRegressionIds,
  addedStageIds: ["a60-total-fail-closed"],
  currentStageIds: currentRegressionIds,
  parentStageIdentitySha256: sha256(retainedRegressionIds.join("\n")),
  currentStageIdentitySha256: sha256(currentRegressionIds.join("\n")),
  verifierPath: "scripts/pass36/verify-a102r42-frozen-regression-denominator-migration.mjs",
  scoreImprovementClaimed: false,
  globalDecision: "NO_GO", live: false, saleEnabled: false, productionApproved: false, worldClassProven: false,
};
write(REGRESSION_MIGRATION, digestDocument(regressionMigrationCore, "migrationDigestSha256"));

const retainedA80AssertionIds = [
  "mode-migration:baseline-35-to-58", "mode-migration:denominator-collapse-rejected", "mode-migration:frozen-removal-rejected",
  "mode-migration:duplicate-addition-rejected", "mode-migration:wildcard-addition-rejected", "mode-migration:self-digest-tamper-rejected",
  "mode-migration:omitted-current-shebang-and-test-denominator-collapse-rejected", "baseline:self-declared-dual-control-rejected",
  "baseline:mechanism-remains-blocked", "baseline:verified-still-no-promotion", "baseline:phase1-self-digest", "baseline:same-source-snapshot",
  "reject:missing-a78", "reject:stale-status", "reject:other-source", "reject:promotion-claim", "reject:physical-pass-absent",
  "reject:clean-a58-not-first", "reject:one-dual-control-signer", "reject:duplicate-dual-control-signer", "reject:duplicate-json-key",
  "reject:depth-budget", "reject:byte-budget", "reject:receipt-symlink", "output:external-new-accepted", "reject:output-inside-source",
  "reject:output-overwrite", "reject:unknown-cli", "reject:duplicate-cli", "reject:old-success-boolean-cli",
  "reject:phase1-digest-tamper", "reject:false-verified-candidate", "blocked:still-no-promotion", "seal:explicit-local-integrity-only",
  "seal:blocked-no-a80r1-promotion", "reject:seal-from-tampered-phase1",
];
invariant(retainedA80AssertionIds.length === 36 && new Set(retainedA80AssertionIds).size === 36, "a102r42_a80_parent_assertions");
const a80ReceiptMigrationCore = {
  schemaVersion: "velmere.pass36.a102r42.a80r1-receipt-denominator-migration.v1",
  revisionId: REV,
  parentRevisionId: PARENT,
  parentTestPath: "scripts/pass36/test-a102r41-a80r1-two-phase-release-controller.mjs",
  parentTestByteLength: 17240,
  parentTestSha256: "00e69a5a9b8c49d8f346aae7d0375d2f7515c190f371d91eaf8130e58afa0d8f",
  reason: "Retain all 36 exact R41 mechanism assertions and add twelve isolated receipt-schema, full-regression row, clean-unpack provenance and denominator negatives without removing or replacing a parent assertion.",
  oldDenominator: 36,
  newDenominator: 48,
  retainedAssertionCount: 36,
  retainedAssertionIds: retainedA80AssertionIds,
  addedAssertionIds: [
    "mode-migration:baseline-58-to-58-and-a80-36-to-48",
    "reject:full-regression-denominator-or-immutability",
    "reject:full-regression-executed-denominator",
    "reject:full-regression-passed-denominator",
    "reject:full-regression-failed-stage-contradiction",
    "reject:full-regression-source-mutability",
    "reject:receipt-schema-substitution",
    "reject:wrapper-observed-schema-substitution",
    "reject:full-regression-stage-row-collapse",
    "reject:full-regression-stage-order-substitution",
    "reject:clean-unpack-step-row-collapse",
    "reject:clean-unpack-provenance-collapse",
  ],
  removedAssertionIds: [],
  fullRegressionStageDenominator: 29,
  verifierPath: "scripts/pass36/verify-a102r42-a80r1-receipt-denominator-migration.mjs",
  verifierChecks: 12,
  scoreImprovementClaimed: false,
  globalDecision: "NO_GO", live: false, saleEnabled: false, productionApproved: false, worldClassProven: false,
};
write(A80_RECEIPT_MIGRATION, digestDocument(a80ReceiptMigrationCore, "migrationDigestSha256"));

const retainedPackageBoundaryIds = [
  "accept:portable-path-set", "accept:source-path", "reject:ntfs-ads", "reject:wildcard-segment", "reject:dos-con", "reject:dos-nul-extension", "reject:trailing-dot", "reject:trailing-space", "reject:file-directory-prefix", "reject:casefold-collision", "reject:environment-source", "reject:artifacts-source", "reject:database-source", "reject:runtime-log-source", "reject:duplicate-manifest-key", "reject:forbidden-manifest-key", "reject:invalid-utf8-manifest", "accept:execution-packaged-exact", "reject:execution-packaged-tamper", "reject:execution-packaged-missing", "reject:execution-forbidden-env", "accept:execution-allowed-node-modules-metadata", "reject:execution-symlink-reparse", "accept:a58-exact-failed-set", "reject:a58-failed-set-mismatch", "accept:nested-full-regression-contract", "reject:nested-bad-schema", "reject:nested-bad-status", "accept:dependency-postcondition", "reject:dependency-lock-change", "reject:dependency-npm-cli-change", "reject:dependency-node-modules-boundary", "accept:negative-output-path-redaction", "accept:failure-receipt-no-clobber", "reject:failure-receipt-overwrite", "accept:package-boundary-denominator-migration",
];
invariant(retainedPackageBoundaryIds.length === 36 && new Set(retainedPackageBoundaryIds).size === 36, "a102r42_package_boundary_parent_ids");
const packageBoundaryMigrationCore = {
  schemaVersion: "velmere.pass36.a102r42.package-boundary-denominator-migration.v1",
  revisionId: REV,
  parentRevisionId: PARENT,
  parentTestPath: "scripts/pass36/test-a102r41-package-portability-and-parser.mjs",
  parentTestByteLength: 11691,
  parentTestSha256: "bab26c82047341950dc4b33986ddc9ad3be784242b550897e3cf51b00f8b344a",
  reason: "Retain all 36 R41 portability/parser assertions and add isolated negatives for contradictory failed-stage rows and collapsed physical stage rows in the nested 29-stage regression receipt.",
  oldDenominator: 36,
  newDenominator: 38,
  retainedCount: 36,
  addedCount: 2,
  removedCount: 0,
  retainedIds: retainedPackageBoundaryIds,
  addedIds: ["reject:nested-failed-stage-contradiction", "reject:nested-stage-row-collapse"],
  removedIds: [],
  verifierPath: "scripts/pass36/verify-a102r42-package-boundary-denominator-migration.mjs",
  verifierChecks: 16,
  scoreImprovementClaimed: false,
  globalDecision: "NO_GO", live: false, saleEnabled: false, productionApproved: false, worldClassProven: false,
};
write(PACKAGE_BOUNDARY_MIGRATION, digestDocument(packageBoundaryMigrationCore, "migrationDigestSha256"));

const retainedDescendantVerifierIds = [
  "identity", "parent", "source-rejected", "payload", "binding:stateSha256", "binding:completionProgramSha256",
  "binding:sourceModePolicySha256", "binding:sourceModeMigrationSha256", "binding:approvedChangeLedgerSha256",
  "binding:historicalSparseEdgeLedgerSha256", "binding:currentSourceAuthorityMigrationSha256", "binding:a78LockfileMigrationSha256",
  "self-digest", "authority-denominator", "browser-denominator", "security-containment", "real-denominators-zero", "sku",
  "promotion", "historical-chain",
];
const addedDescendantVerifierIds = [
  "parent-raw", "binding:failureFinalizationMigrationSha256", "binding:frozenRegressionMigrationSha256",
  "binding:a80r1ReceiptMigrationSha256", "binding:packageBoundaryMigrationSha256", "binding:a42CriticalRebaselineSha256",
  "binding:descendantVerifierMigrationSha256", "static-semantic-documents",
];
const currentDescendantVerifierIds = ["identity", "parent", "parent-raw", "source-rejected", "payload", "binding:stateSha256", "binding:completionProgramSha256", "binding:sourceModePolicySha256", "binding:sourceModeMigrationSha256", "binding:approvedChangeLedgerSha256", "binding:historicalSparseEdgeLedgerSha256", "binding:currentSourceAuthorityMigrationSha256", "binding:failureFinalizationMigrationSha256", "binding:frozenRegressionMigrationSha256", "binding:a80r1ReceiptMigrationSha256", "binding:packageBoundaryMigrationSha256", "binding:a42CriticalRebaselineSha256", "binding:a78LockfileMigrationSha256", "binding:descendantVerifierMigrationSha256", "self-digest", "authority-denominator", "browser-denominator", "security-containment", "real-denominators-zero", "sku", "promotion", "static-semantic-documents", "historical-chain"];
invariant(retainedDescendantVerifierIds.length === 20 && addedDescendantVerifierIds.length === 8 && currentDescendantVerifierIds.length === 28 && new Set(currentDescendantVerifierIds).size === 28, "a102r42_descendant_verifier_denominator");
const descendantVerifierMigrationCore = {
  schemaVersion: "velmere.pass36.a102r42.descendant-verifier-denominator-migration.v1",
  revisionId: REV,
  parentRevisionId: PARENT,
  parentVerifierPath: "scripts/pass36/verify-a102r41-current-root-descendant.mjs",
  parentVerifierByteLength: 4348,
  parentVerifierSha256: "034f5152f64791d4af4133973c65ebd585fd0b00adfe85bfdf13673214867c0f",
  reason: "Retain every exact R41 descendant-verifier assertion, restore the retained A78 migration binding, and add eight exact parent-raw, R42 static-binding and semantic-verifier assertions with zero removals.",
  oldDenominator: 20,
  newDenominator: 28,
  retainedCount: 20,
  addedCount: 8,
  removedCount: 0,
  retainedIds: retainedDescendantVerifierIds,
  addedIds: addedDescendantVerifierIds,
  removedIds: [],
  currentIds: currentDescendantVerifierIds,
  verifierPath: "scripts/pass36/verify-a102r42-descendant-verifier-denominator-migration.mjs",
  verifierChecks: 16,
  scoreImprovementClaimed: false,
  globalDecision: "NO_GO", live: false, saleEnabled: false, productionApproved: false, worldClassProven: false,
};
write(DESCENDANT_VERIFIER_MIGRATION, digestDocument(descendantVerifierMigrationCore, "migrationDigestSha256"));

const authority = structuredClone(read("config/pass36/current-release-authority.json"));
authority.authorityRevisionId = REV;
authority.parentRevisionId = PARENT;
authority.currentSource.revisionId = REV;
authority.currentSource.parentRevisionId = PARENT;
authority.planes.roadmapProgram = { revisionId: REV, path: PROGRAM, credit: false };
authority.planes.a102r42LocalClosure = {
  revisionId: REV, parentRevisionId: PARENT, statePath: STATE,
  checkpointClass: "ACTION_REQUIRED_NON_PASS", completedThrough: 89,
  a60FailureFinalizationLocallyHardened: true, logClassifierBoundaryLocallyHardened: true,
  unknownAuthorityProfileFailClosed: true, exactFinalByteBuildBrowserCredit: false,
  live: false, saleEnabled: false,
};
authority.planes.a102r26ChartRuntimeLocalClosure = {
  ...authority.planes.a102r26ChartRuntimeLocalClosure,
  revisionId: "VELMERE_PASS36_A102R26_ACTION_REQUIRED_ASSET_DETAIL_CHART_SHARED_CACHE_INFLIGHT_RACE_REFERENCE_REFRESH_AND_NO_FLICKER_RECOVERY_NO_REAL_CREDIT",
  statePath: "config/pass36/a102r26-action-required-current-state.json",
  programPath: "config/pass36/a102r26-world-class-completion-program.json",
};
authority.planes.a102r29LocalClosure = {
  revisionId: "VELMERE_PASS36_A102R29_ACTION_REQUIRED_CANONICAL_ASSET_CLASS_LOCALE_INDEPENDENT_CHART_ROUTE_CACHE_AND_NESTED_AUTHORITY_PROGRAM_DRIFT_RECOVERY_NO_REAL_CREDIT",
  parentRevisionId: "VELMERE_PASS36_A102R28_ACTION_REQUIRED_ASSET_DETAIL_ABORTED_INFLIGHT_REOPEN_AND_DEFERRED_IDENTITY_RESET_RACE_RECOVERY_NO_REAL_CREDIT",
  statePath: "config/pass36/a102r29-action-required-current-state.json",
  testReceiptPath: "config/pass36/a102r29-local-regression-receipt.json",
  approvedChangeLedgerPath: "config/pass36/a102r29-approved-route-cache-authority-changes.json",
  boundaryChecks: 23,
  localeVariantsVerified: 3,
  localizedLabelsInfluenceRouting: false,
  localizedLabelsInfluenceCacheIdentity: false,
  nestedCurrentSourceParentCoherent: true,
  roadmapProgramPointerCoherent: true,
  realBrowserRows: 0,
  passCredit: false,
};
for (const pointer of authority.compatibilityPointers ?? []) {
  pointer.declaredRevisionId = REV;
  pointer.reason = "Compatibility mirror only; machine authority is exact A102R42 ACTION_REQUIRED current source. This pointer may not define source, LIVE, production or sale truth.";
}
Object.assign(authority.claims, {
  currentRevisionId: REV, parentRevisionId: PARENT, decision: "NO_GO", checkpointClass: "ACTION_REQUIRED_NON_PASS",
  a102r42ActionAuthorityChecks: 47, a102r42CurrentSourcePreflightScenarios: 60, a102r42FindingCount: 54,
  a102r42A80R1MechanismChecks: 48, a102r42PackageBoundaryChecks: 38, a102r42A42VerifierChecks: 54, a102r42DescendantVerifierChecks: 28,
  a102r42A60SemanticCases: 34, a102r42FrozenRegressionStages: 29,
  a102r42A60EvidencePackagePathsRequired: 59, a102r42A60EvidencePackagePathsVerified: 0,
  a102r42ExactFinalByteBuildBrowserCredit: false,
  liveProven: false, saleEnabled: false, productionApproved: false, worldClassProven: false,
});
authority.truthBoundary = state.truthBoundary;
authority.worldClassCompletionProgramRevisionId = REV;
authority.worldClassCompletionProgramPath = PROGRAM;
authority.currentRootDescendantManifestPath = MANIFEST;
authority.currentRootDescendantManifestRevisionId = REV;
authority.sourceRevisionId = REV;
authority.sourceParentRevisionId = PARENT;
authority.historicalDescendantSparseEdgeLedgerPath = SPARSE_LEDGER;
write("config/pass36/current-release-authority.json", authority);

const current = structuredClone(read("config/pass35/current-revision.json"));
Object.assign(current, {
  sourceRevisionId: REV, currentReleaseAuthorityRevisionId: REV,
  worldClassCompletionProgramRevisionId: REV, worldClassCompletionProgramPath: PROGRAM,
  currentRootDescendantManifestRevisionId: REV, currentRootDescendantManifestPath: MANIFEST,
  parentSourceRevisionId: PARENT, sourceParentRevisionId: PARENT,
  authoritativeCurrentRootDescendantManifestPath: MANIFEST,
  authoritativeWorldClassCompletionProgramPath: PROGRAM,
  authoritativeCurrentWorldClassProgramPath: PROGRAM,
  historicalDescendantSparseEdgeLedgerPath: SPARSE_LEDGER,
  exactFinalByteBuildExecuted: false, browserScreenshotParityExecuted: false,
  externalCommandExecutionCredit: false, paidCheckoutStopSellActive: true,
  saleEnabled: false, liveProven: false, worldClassProven: false,
});
write("config/pass35/current-revision.json", current);

const compat = structuredClone(read("config/current-release.json"));
Object.assign(compat, {
  authoritativeCurrentSourceRevisionId: REV, authoritativeCurrentSourceParentRevisionId: PARENT,
  authoritativeCurrentRootDescendantManifestPath: MANIFEST,
  authoritativeWorldClassCompletionProgramPath: PROGRAM,
  authoritativeCurrentWorldClassProgramPath: PROGRAM,
  currentReleaseAuthorityRevisionId: REV,
  worldClassCompletionProgramRevisionId: REV, worldClassCompletionProgramPath: PROGRAM,
  currentRootDescendantManifestRevisionId: REV, currentRootDescendantManifestPath: MANIFEST,
  historicalDescendantSparseEdgeLedgerPath: SPARSE_LEDGER,
  currentReleaseAuthorityStatus: "ACTION_REQUIRED_NON_PASS",
  authoritativeCurrentCheckpointClass: "ACTION_REQUIRED_NON_PASS",
  authoritativeCurrentDecision: "NO_GO", authoritativeCurrentSaleEnabled: false,
});
write("config/current-release.json", compat);

const pkg = structuredClone(read("package.json"));
pkg.velmerePass = REV;
pkg.velmerePatch = PATCH_PATH;
pkg.velmereCurrentReleaseAuthorityPass = REV;
pkg.velmereWorldClassCompletionProgramPass = REV;
pkg.velmereWorldClassCompletionProgramPath = PROGRAM;
pkg.velmereCurrentRootDescendantManifestPath = MANIFEST;
pkg.velmerePassMetadata.currentRevisionId = REV;
pkg.velmerePassMetadata.parentRevisionId = PARENT;
pkg.velmere.currentRevisionId = REV;
pkg.velmere.currentRevisionParentId = PARENT;
pkg.velmere.worldClassCompletionProgramPath = PROGRAM;
pkg.velmere.currentRootDescendantManifestPath = MANIFEST;
delete pkg.velmere.liveProven;
delete pkg.velmere.saleEnabled;
pkg.velmere.a102r42ActionAuthorityChecks = 47;
  pkg.velmere.a102r42CurrentSourcePreflightScenarios = 60;
  pkg.velmere.a102r42A80R1MechanismChecks = 48;
  pkg.velmere.a102r42PackageBoundaryChecks = 38;
  pkg.velmere.a102r42A42VerifierChecks = 54;
  pkg.velmere.a102r42DescendantVerifierChecks = 28;
  pkg.velmere.a102r42FindingCount = 54;
pkg.velmere.a102r42SourceModeExecutablePathDenominator = 58;
pkg.velmere.a102r42A60SemanticCases = 34;
pkg.velmere.a102r42FrozenRegressionStages = 29;
pkg.velmere.a102r42ExactFinalByteBuildBrowserCredit = false;
Object.assign(pkg.scripts, {
  "build:a102r42:authority": "node scripts/pass36/build-a102r42-authority-files.mjs",
  "test:a102r42:authority": "node scripts/pass36/test-a102r42-current-source-authority-preflight.mjs",
  "build:a102r42:approved": "node scripts/pass36/build-a102r42-approved-current-source-changes.mjs",
  "verify:a102r42:approved": "node scripts/pass36/verify-a102r42-approved-current-source-changes.mjs",
  "verify:a102r42:a42": "node scripts/pass36/verify-a102r42-a42-critical-rebaseline.mjs",
  "verify:a102r42:frozen-migration": "node scripts/pass36/verify-a102r42-frozen-regression-denominator-migration.mjs",
  "verify:a102r42:a80r1-migration": "node scripts/pass36/verify-a102r42-a80r1-receipt-denominator-migration.mjs",
  "build:a102r42:descendant": "node scripts/pass36/build-a102r42-current-root-descendant-manifest.mjs",
  "verify:a102r42:descendant": "node scripts/pass36/verify-a102r42-current-root-descendant.mjs",
  "verify:a102r42:authority": "node scripts/pass36/verify-a102r42-action-required-authority.mjs",
  "test:a102r42:package-boundary": "node scripts/pass36/test-a102r42-package-portability-and-parser.mjs",
  "test:a102r42:a80r1": "node scripts/pass36/test-a102r42-a80r1-two-phase-release-controller.mjs",
  "package:a102r42": "node scripts/pass36/package-a102r42-deterministic.mjs",
  "verify:a102r42:clean-unpack": "node scripts/pass36/verify-a102r42-clean-unpack.mjs",
  "verify:a102r42:final-packages": "node scripts/pass36/verify-a102r42-final-packages.mjs",
});
write("package.json", pkg);

const a58 = structuredClone(read("config/pass36/a58-release-integrity-policy.json"));
Object.assign(a58, {
  currentCheckpointRevisionId: REV, currentCheckpointParentRevisionId: PARENT,
  currentDescendantManifestPath: MANIFEST, currentAuthorityVerifierPath: VERIFIER,
  currentAuthorityVerifierExpectedStatus: VERIFIER_STATUS,
  archiveManifestPath: ARCHIVE_MANIFEST, archiveManifestSchemaVersion: ARCHIVE_SCHEMA,
  currentWorldClassCompletionProgramPath: PROGRAM, currentWorldClassCompletionProgramRevisionId: REV,
  currentSourceRevisionId: REV, crossPlatformSourceModePolicyPath: MODE_POLICY,
  crossPlatformExecutablePathCount: 58, truthBoundary: state.truthBoundary,
});
a58.archiveManifestContract.schemaVersion = ARCHIVE_SCHEMA;
a58.archiveManifestContract.revisionId = REV;
a58.archiveManifestContract.path = ARCHIVE_MANIFEST;
write("config/pass36/a58-release-integrity-policy.json", a58);

for (const relativePath of [
  "config/pass36/a60-exact-final-byte-build-browser-acceptance.json",
  "config/pass36/a62-offline-exact-runtime-dependency-bootstrap.json",
  "config/pass36/a63-staging-program-orchestrator.json",
  "config/pass36/a78-exact-runtime-lockfile-browser-bootstrap.json",
  "config/pass36/a79-exact-final-byte-build-browser-evidence-binding.json",
  "config/pass36/a80-frozen-local-release-candidate-admission.json",
]) {
  const policy = structuredClone(read(relativePath));
  policy.sourceManifestPath = MANIFEST;
  policy.currentSourceRevisionId = REV;
  policy.currentSourceParentRevisionId = PARENT;
  write(relativePath, policy);
}
fs.writeFileSync(path.join(root, "VELMERE_ACTIVE_PASS.txt"), `${REV}\n`, "utf8");

const patchText = [
  "VELMERE A102R42 PATCH — ACTION_REQUIRED / NO LIVE CREDIT",
  "",
  `Revision: ${REV}`,
  `Parent: ${PARENT}`,
  "",
  "Local changes:",
  "- total fail-closed validation and bounded v3 receipt finalization for partial A60 stage sequences;",
  "- boundary-correct provider identifier classifier retaining actual-secret rejection;",
  "- explicit fail-closed rejection of unsupported current-source authority profiles;",
  "- formal semantic 16→34, current-source preflight 46→60, descendant verifier 20→28, A80R1 36→48 and frozen regression 28→29 migrations with zero removals;",
  "- no staging, provider-rights, legal/DPO, independent assurance, customer, LIVE, production or sale credit.",
  "",
  "GLOBAL DECISION: NO_GO",
  "LIVE=false",
  "saleEnabled=false",
  "productionApproved=false",
  "worldClassProven=false",
  "",
].join("\n");
fs.writeFileSync(path.join(root, PATCH_PATH), patchText, "utf8");

const existingRoadmap = fs.readFileSync(path.join(root, ROADMAP_PATH));
const markerBytes = Buffer.from(ROADMAP_MARKER, "utf8");
const legacyMarkerBytes = Buffer.from(LEGACY_R42_ROADMAP_MARKER, "utf8");
const exactRoadmapSuffix = (bytes) => bytes.length === ROADMAP_SUFFIX_BYTES && sha256(bytes) === ROADMAP_SUFFIX_SHA256;
const suffixCandidates = [];
if (exactRoadmapSuffix(existingRoadmap)) suffixCandidates.push(existingRoadmap);
for (const marker of [markerBytes, legacyMarkerBytes]) {
  let offset = 0;
  while (offset < existingRoadmap.length) {
    const markerIndex = existingRoadmap.indexOf(marker, offset);
    if (markerIndex < 0) break;
    const candidate = existingRoadmap.subarray(markerIndex + marker.length);
    if (exactRoadmapSuffix(candidate)) suffixCandidates.push(candidate);
    offset = markerIndex + marker.length;
  }
}
invariant(suffixCandidates.length === 1, "a102r42_parent_roadmap_suffix_candidate_identity");
const parentRoadmap = suffixCandidates[0];
invariant(parentRoadmap.length === ROADMAP_SUFFIX_BYTES && sha256(parentRoadmap) === ROADMAP_SUFFIX_SHA256, "a102r42_parent_roadmap_suffix_identity");
const roadmapPrefix = Buffer.from([
  "====================================================================================================",
  "PASS36 A102R42 — A60 TOTAL FAIL-CLOSED RECEIPT + LOG CLASSIFIER + CURRENT AUTHORITY PROFILE",
  "====================================================================================================",
  `Revision ID: ${REV}`,
  `Parent: ${PARENT}`,
  "Klasa: ACTION_REQUIRED_NON_PASS",
  `Parent SOURCE SHA-256: 569ec6ee9925b86daa5eb9238110500943839a90564a0cb558d3a2d52b22ee96`,
  `Parent roadmap suffix bytes/SHA-256: ${ROADMAP_SUFFIX_BYTES} / ${ROADMAP_SUFFIX_SHA256}`,
  "",
  "GLOBAL DECISION: NO_GO",
  "LIVE=false",
  "saleEnabled=false",
  "productionApproved=false",
  "worldClassProven=false",
  "Basic=PILOT_ONLY_FREE_PRESCREEN",
  "Pro=NOT_FOR_SALE; price=null",
  "Advanced=NOT_FOR_SALE; price=null",
  "Paid PDFs=NOT_FOR_SALE; price=null",
  "",
  "R42 findings added to the living roadmap:",
  "- A102R42-P0-40: partial A60 stage validation crashed in finally, masked the first failure and lost the bounded top receipt; locally fixed, exact final-byte retest required.",
  "- A102R42-P1-41: unanchored provider-ID matching falsely classified RISK_ authority text as a secret; locally fixed with real secret negatives retained.",
  "- A102R42-P1-42: unsupported coherent authority profiles could inherit an R41 fallback; now explicitly rejected.",
  "- A102R42-P0-43: the initial approved-ledger boundary could admit rewritten R41-namespaced history; all such paths now require exact parent bytes plus raw/canonical descendant anchors.",
  "- A102R42-P1-44: duplicate parent and coherent A58 archive path/schema substitutions were not exact-bound; both are now profile-bound.",
  "- A102R42-P1-45: compatibility promotion, pointer classes, mode identity and browser denominators could drift; exact non-promotional values are now required.",
  "- A102R42-P2-46: approved-ledger counters and families lacked independent reconstruction; both are now fail-closed.",
  "- A102R42-P1-47: descendant static documents were hashed before full semantic identity validation; every bound document is now checked first.",
  "- A102R42-P1-48: A80R1 could count a denominator-less full-regression receipt; it now requires exact 29/29, zero failed stages and immutable source.",
  "- A102R42-P1-49: A42 replaced a retained negative assertion while claiming zero removal; it is restored and the verifier migration is honestly 38→54.",
  "- A102R42-P1-50: clean unpack trusted scalar regression counters without exact stage rows; the nested contract now binds 29 unique passed rows and package tests migrate 36→38.",
  "- A102R42-P0-51: a coherent rollback to a registered historical authority profile could evade unknown-profile rejection; current-root validation is now compiled to exact R42.",
  "- A102R42-P1-52: duplicate-key authority JSON could use last-wins parsing; authority-critical R42 reads now use bounded strict parsing.",
  "- A102R42-P1-53: historical R26/R29 plane metadata drifted or omitted identity; the current authority metadata is reconciled to frozen physical artifacts without rewriting them.",
  "- A102R42-P1-54: conflicting top-level promotion aliases could coexist with canonical NO_GO claims; forbidden live/sale aliases are now rejected.",
  "",
  "Formal migrations: A60 semantic 16→34 (retained 16, added 18, removed 0); current-source preflight 46→60 (retained 46, added 14, removed 0); descendant verifier 20→28 (retained 20, added 8, removed 0); action authority 47 fixed checks; frozen local regression 28→29 (retained 28, added 1, removed 0); A80R1 mechanism 36→48 (retained 36, added 12, removed 0); package boundary 36→38 (retained 36, added 2, removed 0); source-mode 58→58 (retained 58, removed 0); A42 verifier 38→54 while evidence rows are 5→8 and critical files remain 76.",
  "R41 negative A60 attempt remains historical evidence: primary stage_failed:a60-contract; 7/14 stages; rejected raw stdout 46608 bytes; no top receipt; no build/browser/release credit.",
  "Required current-byte closure: action authority 47/47 plus current-source preflight 60/60; descendant 28/28; A42 54/54 and 76/76 files; A80R1 48/48; package boundary 38/38; regression 29/29; SOURCE 2/2; A58-first clean-unpack 17/17 with nested 29/29; exact A60 14/14; browser 57 scenarios/56 rows/29 screenshots/4 popup tabs; verifier 584; evidence paths 59; MATERIALS 2/2.",
  "External denominators remain zero: staging/RLS 0/19, provider rights 0/21, legal/DPO 0/20, official audit tools 0/200, contract cases 0/50, source-bytecode 0/50, customer PDFs 0/50, Shield 0/318, Shield Pro/Map 0/318, Real Markets 0/583, Market Impact 0/318, Whale Watch 0/318, Brain/Angel/Risk 0/300, customer cohorts 0/2, A102 observations 0/3 over 72h.",
  "Estimated remaining canonical checkpoints: minimum 13; most likely 25; with revisions/retests/legal/provider/customer coordination 46.",
  "",
].join("\n"), "utf8");
fs.writeFileSync(path.join(root, ROADMAP_PATH), Buffer.concat([roadmapPrefix, markerBytes, parentRoadmap]));

const a42Contract = structuredClone(read(A42_CONTRACT));
const changedCriticalPaths = Object.keys(a42Contract.criticalFiles).filter((relativePath) => {
  const parent = parentEntryByPath.get(relativePath);
  if (!parent) throw new Error(`a102r42_a42_parent_entry_missing:${relativePath}`);
  return sha256(fs.readFileSync(path.join(root, relativePath))) !== parent.sha256;
}).sort(lexical);
const expectedChangedCriticalPaths = ["VELMERE_ACTIVE_PASS.txt", "config/pass36/current-release-authority.json", "package.json"];
invariant(canonicalJson(changedCriticalPaths) === canonicalJson(expectedChangedCriticalPaths), `a102r42_a42_changed_path_set:${canonicalJson(changedCriticalPaths)}`);
const currentRows = changedCriticalPaths.map((relativePath) => {
  const parent = parentEntryByPath.get(relativePath);
  const bytes = fs.readFileSync(path.join(root, relativePath));
  const currentSha256 = sha256(bytes);
  a42Contract.criticalFiles[relativePath] = currentSha256;
  return {
    revisionId: REV,
    path: relativePath,
    classification: "A102R42_AUTHORITY_A60_FAIL_CLOSED_APPROVED_REBASELINE",
    parentByteLength: parent.byteLength,
    parentSha256: parent.sha256,
    currentByteLength: bytes.length,
    currentSha256,
  };
});
write(A42_CONTRACT, a42Contract);
const parentA42Bytes = fs.readFileSync(path.join(root, "config/pass36/a102r41-a42-critical-rebaseline.json"));
const parentA42 = parseStrictJsonCli(parentA42Bytes.toString("utf8"), { maxBytes: 16 * 1024 * 1024, maxDepth: 128, maxNodes: 1_000_000, requireObject: true });
invariant(sha256(parentA42Bytes) === "a16f186e6154bd60b091459af70b69a87ed798567e2eb6b659197b35d2295ec7" && parentA42.evidenceDigestSha256 === "cf57d77d7ddef7a49a67625f5c0750144a40ad99b228c7baa5ccd0b515d4b520", "a102r42_parent_a42_identity");
const a42Core = {
  schemaVersion: "velmere.pass36.a102r42.a42-critical-rebaseline.v1",
  revisionId: REV,
  parentRevisionId: PARENT,
  recordedAt: RECORDED_AT,
  recordedAtSemantics: "Authority metadata recording time only; not a source freeze, execution receipt or promotion timestamp.",
  criticalFileDenominator: 76,
  parentEvidencePath: "config/pass36/a102r41-a42-critical-rebaseline.json",
  parentEvidenceRawSha256: sha256(parentA42Bytes),
  parentEvidenceDigestSha256: parentA42.evidenceDigestSha256,
  retainedHistoricalRows: structuredClone(parentA42.rebaselinedRows),
  currentRebaselinedRows: currentRows,
  rebaselinedRowCount: parentA42.rebaselinedRows.length + currentRows.length,
  rowDenominatorMigration: { reason: "Retain all five frozen R41 rows and add the three current R42 critical authority rows; repeated paths are separate revision-bound observations.", old: 5, new: 8, retained: 5, added: 3, removed: 0, scoreCredit: false },
  verifierDenominatorMigration: { reason: "Retain all exact 38 R41 verification assertions, add the parent-evidence anchor, and add fifteen exact current-row assertions.", old: 38, new: 54, retainedAssertions: 38, addedAssertions: 16, removedAssertions: 0, scoreCredit: false },
  verifierPath: "scripts/pass36/verify-a102r42-a42-critical-rebaseline.mjs",
  globalDecision: "NO_GO", live: false, saleEnabled: false, productionApproved: false, worldClassProven: false,
  truthBoundary: "Historical rows bind frozen R41 evidence/package bytes; current rows bind exact R42 physical bytes and the unchanged 76-file contract. No build/browser, staging, LIVE or sale credit.",
};
write(A42_EVIDENCE, digestDocument(a42Core, "evidenceDigestSha256"));

console.log(JSON.stringify({
  status: "BUILT_A102R42_AUTHORITY_FILES_ACTION_REQUIRED_NO_PROMOTION",
  revisionId: REV,
  parentRevisionId: PARENT,
  findings: findings.length,
  actionAuthorityChecksRequired: 47,
  currentSourcePreflightScenariosRequired: 60,
  sourceModeExecutablePaths: 58,
  frozenRegressionStages: 29,
  a42CriticalFiles: 76,
  a42EvidenceRows: 8,
  a42VerifierChecks: 54,
  a80r1MechanismChecks: 48,
  descendantVerifierChecks: 28,
  packageBoundaryChecks: 38,
  globalDecision: "NO_GO", live: false, saleEnabled: false, productionApproved: false, worldClassProven: false,
}, null, 2));
