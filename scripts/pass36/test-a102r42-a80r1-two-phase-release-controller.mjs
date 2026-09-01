import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  CLEAN_UNPACK_STEP_IDS, FULL_REGRESSION_STAGE_IDS, PHASE1_BLOCKED, PHASE1_VERIFIED, RECEIPT_SPECS,
  assertExternalOutput, buildExternalIntegritySeal, buildPhase1UnsealedCandidate,
  parseControllerArguments, readReceiptSet, readStableStrictJson,
  sameSourceSnapshot, verifyPhase1UnsealedCandidate,
} from "./a80r1-two-phase-release-controller-lib.mjs";
import { REV } from "./a102r42-source-boundary.mjs";
import { collectA102R42Inventory, MATERIALS_FILE_NAME, ROADMAP_FILE_NAME, SOURCE_FILE_NAME } from "./package-a102r42-deterministic.mjs";
import { createPortableRejectedSymlink } from "./portable-symlink-negative-fixture.mjs";
import { parseStrictJsonCli } from "./strict-json-cli.mjs";

const digest = (character) => character.repeat(64);
const source = {
  revisionId: REV,
  descendantManifestPath: "config/pass36/a102r42-current-root-descendant-manifest.json",
  descendantManifestRawSha256: digest("a"),
  descendantManifestDigestSha256: digest("b"),
  fileCount: 5500,
  byteLength: 123456789,
  pathSetSha256: digest("c"),
  aggregateSha256: digest("d"),
};
const checks = [];
const check = (id, passed, detail = null) => checks.push({ id, passed: Boolean(passed), detail });
const expectThrow = (id, fn, fragment) => {
  let error = null;
  try { fn(); } catch (caught) { error = caught; }
  check(id, error instanceof Error && error.message.includes(fragment), error?.message ?? null);
};
const sourceBinding = {
  revisionId: source.revisionId,
  descendantManifestRawSha256: source.descendantManifestRawSha256,
  descendantManifestDigestSha256: source.descendantManifestDigestSha256,
  aggregateSha256: source.aggregateSha256,
};
const canonical = (value) => Array.isArray(value)
  ? `[${value.map(canonical).join(",")}]`
  : value && typeof value === "object"
    ? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`
    : JSON.stringify(value);
const resignModeMigration = (document) => {
  const core = { ...document }; delete core.migrationDigestSha256;
  document.migrationDigestSha256 = crypto.createHash("sha256").update(canonical(core)).digest("hex");
  return document;
};
const readStrict = (relativePath, maxBytes = 2 * 1024 * 1024) => parseStrictJsonCli(fs.readFileSync(relativePath, "utf8"), { maxBytes, maxDepth: 128, maxNodes: 1_000_000, requireObject: true });
const mode = readStrict("config/pass36/a102r42-cross-platform-source-mode-policy.json");
const frozenMode = readStrict("config/pass36/a102r41-cross-platform-source-mode-policy.json");
const modeMigration = readStrict("config/pass36/a102r42-source-mode-denominator-migration.json");
const mechanismMigration = readStrict("config/pass36/a102r42-a80r1-receipt-denominator-migration.json");
const historicalFrozenMode = readStrict("config/pass36/a102r40-cross-platform-source-mode-policy.json");
const historicalModeMigration = readStrict("config/pass36/a102r41-source-mode-denominator-migration.json");
const historicalMechanismMigration = readStrict("config/pass36/a102r41-a80r1-mechanism-denominator-migration.json");
const parentManifest = readStrict("config/pass36/a102r42-parent-source-package-manifest.json", 16 * 1024 * 1024);
const parentPaths = new Set(parentManifest.entries.map((row) => row.path));
const currentRows = collectA102R42Inventory(process.cwd(), "source", { allowReservedManifestInput: true }).rows;
const stableNewRows = currentRows.filter((row) => !parentPaths.has(row.path)).map((row) => {
  const absolute = path.resolve(row.path);
  const before = fs.lstatSync(absolute);
  if (!before.isFile() || before.isSymbolicLink()) throw new Error(`mode_migration_new_path_not_regular:${row.path}`);
  const bytes = fs.readFileSync(absolute);
  const after = fs.lstatSync(absolute);
  const stable = before.dev === after.dev && before.ino === after.ino && before.mode === after.mode
    && before.size === after.size && before.mtimeMs === after.mtimeMs;
  const bound = stable && bytes.length === row.byteLength
    && crypto.createHash("sha256").update(bytes).digest("hex") === row.sha256;
  if (!bound) throw new Error(`mode_migration_new_path_unstable_or_unbound:${row.path}`);
  return { path: row.path, shebang: bytes.subarray(0, 2).toString("utf8") === "#!" };
});
const observedNewShebangPaths = stableNewRows.filter((row) => row.shebang).map((row) => row.path).sort();
const validateModeMigration = (document, observedShebangPaths = observedNewShebangPaths) => {
  const core = { ...document }; delete core.migrationDigestSha256;
  return document.migrationDigestSha256 === crypto.createHash("sha256").update(canonical(core)).digest("hex")
    && document.oldDenominator === 58 && document.newDenominator === 58
    && document.retainedPaths.length === 58 && document.addedPaths.length === 0 && document.removedPaths.length === 0
    && new Set(document.retainedPaths).size === 58
    && canonical(document.retainedPaths) === canonical(frozenMode.executablePaths)
    && canonical([...document.retainedPaths, ...document.addedPaths].sort()) === canonical(mode.executablePaths)
    && canonical(document.addedPaths) === canonical(observedShebangPaths)
    && document.addedPaths.every((entry) => typeof entry === "string" && !/[?*]/u.test(entry) && fs.readFileSync(entry).subarray(0, 2).toString("utf8") === "#!")
    && document.scoreImprovementClaimed === false;
};
const validateMechanismMigration = (document) => {
  const core = { ...document }; delete core.migrationDigestSha256;
  return document.migrationDigestSha256 === crypto.createHash("sha256").update(canonical(core)).digest("hex")
    && document.oldDenominator === 36 && document.newDenominator === 48
    && document.retainedAssertionCount === 36 && canonical(document.addedAssertionIds) === canonical([
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
    ])
    && document.removedAssertionIds.length === 0 && document.fullRegressionStageDenominator === 29
    && document.scoreImprovementClaimed === false;
};
const validateHistoricalMigrations = () => {
  const modeCore = { ...historicalModeMigration }; delete modeCore.migrationDigestSha256;
  const mechanismCore = { ...historicalMechanismMigration }; delete mechanismCore.migrationDigestSha256;
  return historicalModeMigration.migrationDigestSha256 === crypto.createHash("sha256").update(canonical(modeCore)).digest("hex")
    && historicalModeMigration.oldDenominator === 35 && historicalModeMigration.newDenominator === 58
    && historicalModeMigration.retainedPaths.length === 35 && historicalModeMigration.addedPaths.length === 23 && historicalModeMigration.removedPaths.length === 0
    && canonical(historicalModeMigration.retainedPaths) === canonical(historicalFrozenMode.executablePaths)
    && canonical([...historicalModeMigration.retainedPaths, ...historicalModeMigration.addedPaths].sort()) === canonical(frozenMode.executablePaths)
    && historicalModeMigration.addedPaths.every((entry) => fs.readFileSync(entry).subarray(0, 2).toString("utf8") === "#!")
    && historicalMechanismMigration.migrationDigestSha256 === crypto.createHash("sha256").update(canonical(mechanismCore)).digest("hex")
    && historicalMechanismMigration.oldDenominator === 35 && historicalMechanismMigration.newDenominator === 36
    && historicalMechanismMigration.retainedAssertionCount === 35 && historicalMechanismMigration.addedAssertionIds.length === 1
    && historicalMechanismMigration.removedAssertionIds.length === 0 && historicalMechanismMigration.denominatorCollapseNegativeTest === true;
};
const resignMechanismMigration = (document) => {
  const core = { ...document }; delete core.migrationDigestSha256;
  document.migrationDigestSha256 = crypto.createHash("sha256").update(canonical(core)).digest("hex");
  return document;
};

check("mode-migration:baseline-35-to-58", validateHistoricalMigrations());
check("mode-migration:baseline-58-to-58-and-a80-36-to-48", validateModeMigration(modeMigration) && validateMechanismMigration(mechanismMigration));
for (const [id, mutate, resign = true] of [
  ["mode-migration:denominator-collapse-rejected", (row) => { row.newDenominator = 57; }],
  ["mode-migration:frozen-removal-rejected", (row) => { row.removedPaths.push(row.retainedPaths.pop()); }],
  ["mode-migration:duplicate-addition-rejected", (row) => { row.addedPaths.push(row.retainedPaths[0], row.retainedPaths[0]); }],
  ["mode-migration:wildcard-addition-rejected", (row) => { row.addedPaths.push("scripts/pass36/*"); }],
  ["mode-migration:self-digest-tamper-rejected", (row) => { row.reason = "tampered"; }, false],
]) {
  const document = structuredClone(modeMigration); mutate(document); if (resign) resignModeMigration(document);
  check(id, !validateModeMigration(document));
}
const collapsedMechanismMigration = structuredClone(mechanismMigration);
collapsedMechanismMigration.newDenominator = 36;
resignMechanismMigration(collapsedMechanismMigration);
check(
  "mode-migration:omitted-current-shebang-and-test-denominator-collapse-rejected",
  !validateModeMigration(modeMigration, [...observedNewShebangPaths, "scripts/pass36/omitted-current-shebang-negative-fixture.mjs"].sort())
    && !validateMechanismMigration(collapsedMechanismMigration),
);

function receipt(spec) {
  return {
    schemaVersion: spec.schema, revisionId: REV,
    status: spec.statuses[0], passed: true, verified: spec.id === "dual_control",
    sourceBinding,
    ...(spec.observedSchema ? { observedSchema: spec.observedSchema, validatorContractPassed: true } : {}),
    ...(spec.id === "a78_exact" ? { verified: true, exactNodeVersion: "24.18.0", exactNpmVersion: "11.16.0", dependencyTreeVerified: true, lockfileIntegrityVerified: true, browserBundleVerified: true, sourceImmutable: true } : {}),
    ...(spec.id === "a79_a60_exact" ? { verified: true, a60ReceiptSchemaVersion: "velmere.pass36.a60.exact-final-byte-build-browser-acceptance-receipt.v3", requiredStages: 14, browserRows: 56, browserScenarioChecks: 57, screenshots: 29, popupTabs: 4, evidencePaths: 59, sourceImmutable: true } : {}),
    ...(spec.id === "full_regression" ? { requiredStages: 29, executedStages: 29, passedStages: 29, failedStages: [], stages: FULL_REGRESSION_STAGE_IDS.map((id) => ({ id, passed: true })), sourceImmutable: true } : {}),
    ...(spec.id === "clean_unpack" ? { requiredSteps: 17, executedSteps: 17, passedSteps: 17, failedSteps: [], steps: CLEAN_UNPACK_STEP_IDS.map((id) => ({ id, passed: true })), nestedReceiptProvenance: ["A102R42_CURRENT_AUTHORITY_RECEIPT.json", "A102R42_DESCENDANT_RECEIPT.json", "A102R42_APPROVED_CHANGES_RECEIPT.json", "A102R42_FULL_REGRESSION_RECEIPT.json"].map((fileName) => ({ fileName, sourceRelativePath: `full-regression/${fileName}`, byteLength: 1, sha256: "a".repeat(64) })), sourceImmutable: true, a58LiteralFirstChild: true } : {}),
    ...(spec.id === "dual_control" ? { independentSigners: [{ keyId: "independent-a", independent: true }, { keyId: "independent-b", independent: true }] } : {}),
    globalDecision: "NO_GO", live: false, saleEnabled: false,
    productionApproved: false, worldClassProven: false,
  };
}

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-a80r1-test-"));
const sourceRoot = path.join(temporary, "source");
const evidenceRoot = path.join(temporary, "evidence");
const outside = path.join(temporary, "output");
fs.mkdirSync(sourceRoot); fs.mkdirSync(evidenceRoot); fs.mkdirSync(outside);
try {
  for (const spec of RECEIPT_SPECS) fs.writeFileSync(path.join(evidenceRoot, spec.fileName), `${JSON.stringify(receipt(spec))}\n`, "utf8");
  const complete = buildPhase1UnsealedCandidate({ source, observedReceipts: readReceiptSet(evidenceRoot) });
  check("baseline:self-declared-dual-control-rejected", complete.requiredReceipts === 8 && complete.passedReceipts === 7 && complete.blockers.includes("receipt:dual_control:cryptographic_trust_verification_not_implemented"));
  check("baseline:mechanism-remains-blocked", complete.verified === false && complete.status === PHASE1_BLOCKED);
  check("baseline:verified-still-no-promotion", complete.globalDecision === "NO_GO" && !complete.live && !complete.saleEnabled && !complete.productionApproved && !complete.worldClassProven);
  check("baseline:phase1-self-digest", verifyPhase1UnsealedCandidate(complete).passed);
  check("baseline:same-source-snapshot", sameSourceSnapshot(source, structuredClone(source)));

  const missing = path.join(evidenceRoot, RECEIPT_SPECS[3].fileName);
  const saved = fs.readFileSync(missing);
  fs.unlinkSync(missing);
  const blockedMissing = buildPhase1UnsealedCandidate({ source, observedReceipts: readReceiptSet(evidenceRoot) });
  check("reject:missing-a78", !blockedMissing.verified && blockedMissing.status === PHASE1_BLOCKED && blockedMissing.blockers.includes("receipt:a78_exact:missing_or_unreadable"));
  fs.writeFileSync(missing, saved);

  const mutate = (id, mutateReceipt, blocker) => {
    const spec = RECEIPT_SPECS.find((row) => row.id === id);
    const file = path.join(evidenceRoot, spec.fileName);
    const original = fs.readFileSync(file);
    const value = receipt(spec); mutateReceipt(value);
    fs.writeFileSync(file, `${JSON.stringify(value)}\n`);
    const candidate = buildPhase1UnsealedCandidate({ source, observedReceipts: readReceiptSet(evidenceRoot) });
    fs.writeFileSync(file, original);
    return !candidate.verified && candidate.blockers.includes(blocker);
  };
  check("reject:stale-status", mutate("a79_a60_exact", (row) => { row.status = "BLOCKED_EXACT_PREFLIGHT"; }, "receipt:a79_a60_exact:status"));
  check("reject:other-source", mutate("full_regression", (row) => { row.sourceBinding.aggregateSha256 = digest("e"); }, "receipt:full_regression:source_binding"));
check("reject:full-regression-denominator-or-immutability", mutate("full_regression", (row) => { row.requiredStages = 28; }, "receipt:full_regression:denominator_or_immutability"));
  check("reject:full-regression-executed-denominator", mutate("full_regression", (row) => { row.executedStages = 28; }, "receipt:full_regression:denominator_or_immutability"));
  check("reject:full-regression-passed-denominator", mutate("full_regression", (row) => { row.passedStages = 28; }, "receipt:full_regression:denominator_or_immutability"));
  check("reject:full-regression-failed-stage-contradiction", mutate("full_regression", (row) => { row.failedStages = ["contradictory-stage"]; }, "receipt:full_regression:denominator_or_immutability"));
  check("reject:full-regression-source-mutability", mutate("full_regression", (row) => { row.sourceImmutable = false; }, "receipt:full_regression:denominator_or_immutability"));
  check("reject:receipt-schema-substitution", mutate("authority", (row) => { row.schemaVersion = "fixture.substituted.v1"; }, "receipt:authority:schema"));
  check("reject:wrapper-observed-schema-substitution", mutate("authority", (row) => { row.observedSchema = "fixture.substituted.v1"; }, "receipt:authority:validator_contract"));
  check("reject:full-regression-stage-row-collapse", mutate("full_regression", (row) => { row.stages.pop(); }, "receipt:full_regression:denominator_or_immutability"));
  check("reject:full-regression-stage-order-substitution", mutate("full_regression", (row) => { [row.stages[0], row.stages[1]] = [row.stages[1], row.stages[0]]; }, "receipt:full_regression:denominator_or_immutability"));
  check("reject:clean-unpack-step-row-collapse", mutate("clean_unpack", (row) => { row.steps.pop(); }, "receipt:clean_unpack:a58_or_immutability"));
  check("reject:clean-unpack-provenance-collapse", mutate("clean_unpack", (row) => { row.nestedReceiptProvenance.pop(); }, "receipt:clean_unpack:a58_or_immutability"));
  check("reject:promotion-claim", mutate("authority", (row) => { row.live = true; }, "receipt:authority:truth_boundary"));
  check("reject:physical-pass-absent", mutate("descendant", (row) => { row.passed = false; }, "receipt:descendant:physical_pass"));
  check("reject:clean-a58-not-first", mutate("clean_unpack", (row) => { row.a58LiteralFirstChild = false; }, "receipt:clean_unpack:a58_or_immutability"));
  check("reject:one-dual-control-signer", mutate("dual_control", (row) => { row.independentSigners.pop(); }, "receipt:dual_control:two_independent_signers"));
  check("reject:duplicate-dual-control-signer", mutate("dual_control", (row) => { row.independentSigners[1].keyId = row.independentSigners[0].keyId; }, "receipt:dual_control:two_independent_signers"));

  const strict = path.join(evidenceRoot, "strict.json");
  fs.writeFileSync(strict, '{"a":1,"a":2}');
  expectThrow("reject:duplicate-json-key", () => readStableStrictJson(strict, { evidenceRoot }), "strict_json_duplicate_key");
  fs.writeFileSync(strict, JSON.stringify({ nested: [[[[[true]]]]] }));
  expectThrow("reject:depth-budget", () => readStableStrictJson(strict, { evidenceRoot, maxBytes: 1024, maxDepth: 3 }), "strict_json_depth_exceeded");
  fs.writeFileSync(strict, "x".repeat(1025));
  expectThrow("reject:byte-budget", () => readStableStrictJson(strict, { evidenceRoot, maxBytes: 1024 }), "a80r1_receipt_too_large");

  const link = path.join(evidenceRoot, "link.json");
  const portableLink = createPortableRejectedSymlink(link, path.join(evidenceRoot, RECEIPT_SPECS[0].fileName), { junctionTargetRoot: evidenceRoot });
  try {
    if (!fs.lstatSync(link).isSymbolicLink()) throw new Error(`portable_reparse_fixture_not_link:${portableLink.kind}`);
    expectThrow("reject:receipt-symlink", () => readStableStrictJson(link, { evidenceRoot }), "a80r1_receipt_not_regular");
  } finally { portableLink.cleanup(); }

  check("output:external-new-accepted", assertExternalOutput(sourceRoot, path.join(outside, "phase1.json")) === path.resolve(outside, "phase1.json"));
  expectThrow("reject:output-inside-source", () => assertExternalOutput(sourceRoot, path.join(sourceRoot, "phase1.json")), "a80r1_output_inside_source");
  const existing = path.join(outside, "existing.json"); fs.writeFileSync(existing, "{}");
  expectThrow("reject:output-overwrite", () => assertExternalOutput(sourceRoot, existing), "a80r1_output_exists_no_overwrite");

  expectThrow("reject:unknown-cli", () => parseControllerArguments(["--source-root", sourceRoot, "--evidence-root", evidenceRoot, "--output", path.join(outside, "x"), "--unknown", "x"]), "a80r1_argument_unknown");
  expectThrow("reject:duplicate-cli", () => parseControllerArguments(["--source-root", sourceRoot, "--source-root", sourceRoot, "--evidence-root", evidenceRoot, "--output", path.join(outside, "x")]), "a80r1_argument_duplicate");
  expectThrow("reject:old-success-boolean-cli", () => parseControllerArguments(["--source-root", sourceRoot, "--evidence-root", evidenceRoot, "--output", path.join(outside, "x"), "--a58-pass", "true"]), "a80r1_argument_unknown");

  const tampered = structuredClone(complete); tampered.source.aggregateSha256 = digest("f");
  check("reject:phase1-digest-tamper", !verifyPhase1UnsealedCandidate(tampered).passed);
  const falseVerified = structuredClone(blockedMissing); falseVerified.verified = true; falseVerified.status = PHASE1_VERIFIED;
  check("reject:false-verified-candidate", !verifyPhase1UnsealedCandidate(falseVerified).passed);
  check("blocked:still-no-promotion", blockedMissing.globalDecision === "NO_GO" && !blockedMissing.live && !blockedMissing.saleEnabled && !blockedMissing.productionApproved && !blockedMissing.worldClassProven);

  const sourceZip = path.join(outside, SOURCE_FILE_NAME);
  const materialsZip = path.join(outside, MATERIALS_FILE_NAME);
  const roadmap = path.join(outside, ROADMAP_FILE_NAME);
  const finalVerification = path.join(outside, "FINAL_PACKAGE_VERIFICATION.json");
  fs.writeFileSync(sourceZip, "source"); fs.writeFileSync(materialsZip, "materials"); fs.copyFileSync("VELMERE_WORLD_CLASS_MAX_ROADMAP_PASS35.txt", roadmap);
  const fileIdentity = (file) => { const bytes = fs.readFileSync(file); return { fileName: path.basename(file), byteLength: bytes.length, sha256: crypto.createHash("sha256").update(bytes).digest("hex") }; };
  const sourceIdentity = fileIdentity(sourceZip);
  const materialsIdentity = fileIdentity(materialsZip);
  const roadmapIdentity = fileIdentity(roadmap);
  fs.writeFileSync(finalVerification, `${JSON.stringify({
    schemaVersion: "velmere.pass36.a102r42.final-packages-verification.v1",
    revisionId: REV,
    status: "PASS_A102R42_FINAL_ACTION_REQUIRED_PACKAGES_NO_PROMOTION",
    packageIntegrityPassed: true,
    canonicalArtifactSetPassed: true,
    failed: 0,
    source: { ...sourceIdentity, passed: true },
    materials: { ...materialsIdentity, passed: true },
    roadmap: { ...roadmapIdentity, passed: true, sourceByteIdentical: true },
    materialsSourceBindingPassed: true,
    roadmapSourceBindingPassed: true,
    roadmapLineagePassed: true,
    globalDecision: "NO_GO", live: false, saleEnabled: false,
    productionApproved: false, worldClassProven: false,
  })}\n`);
  const seal = buildExternalIntegritySeal({ phase1: blockedMissing, sourceArchivePath: sourceZip, materialsArchivePath: materialsZip, finalVerificationPath: finalVerification, roadmapPath: roadmap });
  check("seal:explicit-local-integrity-only", seal.sealKind === "LOCAL_SHA256_INTEGRITY_SEAL_NOT_SIGNATURE_NOT_DUAL_CONTROL" && seal.dualControlProven === false && seal.independentSignatureCount === 0);
  check("seal:blocked-no-a80r1-promotion", seal.status === "SEALED_ACTION_REQUIRED_PACKAGE_NO_A80R1_PROMOTION" && !seal.verified && !seal.live && !seal.saleEnabled);
  const badPhase = structuredClone(blockedMissing); badPhase.phase1DigestSha256 = digest("0");
  expectThrow("reject:seal-from-tampered-phase1", () => buildExternalIntegritySeal({ phase1: badPhase, sourceArchivePath: sourceZip, materialsArchivePath: materialsZip, finalVerificationPath: finalVerification, roadmapPath: roadmap }), "a80r1_phase1_invalid");
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}

const failed = checks.filter((row) => !row.passed);
const result = {
  schemaVersion: "velmere.pass36.a102r42.a80r1-two-phase-release-controller-test.v1",
  revisionId: REV,
  status: failed.length === 0 ? "PASS_A102R42_A80R1_TWO_PHASE_CONTROLLER_MECHANISM_NO_PROMOTION" : "FAIL_A102R42_A80R1_TWO_PHASE_CONTROLLER_MECHANISM",
  required: 48, executed: checks.length, passed: checks.length - failed.length, failed: failed.length,
  denominatorMigration: { old: 36, new: 48, retainedAssertions: 36, addedAssertions: 12, removedAssertions: 0 },
  globalDecision: "NO_GO", live: false, saleEnabled: false,
  productionApproved: false, worldClassProven: false,
  failures: failed,
};
console.log(JSON.stringify(result, null, 2));
if (failed.length || checks.length !== 48) process.exit(1);
