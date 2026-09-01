import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { buildSanitizedChildEnv, sanitizeChildOutput } from "./sanitized-child-process-boundary.mjs";
import { sameSourceSnapshot, sourceAuthoritySnapshot } from "./a80r1-two-phase-release-controller-lib.mjs";
import { PARENT, REV } from "./a102r42-source-boundary.mjs";
import { parseStrictJsonCli } from "./strict-json-cli.mjs";
import { readDescriptorBoundRegularFile } from "./descriptor-bound-regular-file.mjs";

const invariant = (condition, code) => { if (!condition) throw new Error(code); };
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const noGo = (value) => value?.globalDecision === "NO_GO" && value?.live === false && value?.saleEnabled === false && value?.productionApproved === false && value?.worldClassProven === false;
const allDigests = (value) => value && Object.values(value).every((entry) => /^[a-f0-9]{64}$/u.test(String(entry)));
const a60TypeScriptPolicy = parseStrictJsonCli(fs.readFileSync(path.join(process.cwd(), "config/pass36/a60-exact-final-byte-build-browser-acceptance.json"), "utf8"), { maxBytes: 2 * 1024 * 1024, maxDepth: 128, maxNodes: 250000, requireObject: true }).typescript;

function argumentsExact(argv) {
  invariant(argv.length === 2 && argv[0] === "--receipt-dir" && typeof argv[1] === "string" && argv[1].length > 0, "a102r42_regression_arguments");
  return path.resolve(argv[1]);
}
function strictJson(text, label) {
  try { return parseStrictJsonCli(text, { maxBytes: 16 * 1024 * 1024, maxDepth: 128, maxNodes: 1500000, requireObject: true }); }
  catch (error) { throw new Error(`a102r42_regression_strict_json:${label}:${error instanceof Error ? error.message : String(error)}`, { cause: error }); }
}
function safe(value) { return value.replace(/[^a-z0-9_.-]+/giu, "_"); }
function artifactPath(id, root) {
  const paths = {
    "route-dispatch": ".velmere/pass15-diagnostics/route-dispatch-verification.json",
    "lazy-routes": ".velmere/pass15-diagnostics/lazy-route-shell-verification.json",
    "source-audit": "artifacts/pass35/a44/PASS35_A44_SOURCE_INTEGRITY_AUDIT.json",
    eslint: "artifacts/pass13/PASS13_PARTITIONED_ESLINT.json",
    typescript: "artifacts/pass13/PASS13_PARTITIONED_TYPESCRIPT.json",
  };
  return paths[id] ? path.join(root, ...paths[id].split("/")) : null;
}
function readArtifact(filePath, id) {
  const observed = readDescriptorBoundRegularFile(filePath, { maxBytes: 128 * 1024 * 1024, errorPrefix: `a102r42_regression_artifact_${safe(id)}` });
  return { value: strictJson(observed.bytes.toString("utf8"), `${id}:artifact`), binding: observed.binding };
}
function validStructuredPrivacyWarning(text) {
  if (!text.endsWith("\n") || text.indexOf("\n") !== text.length - 1) return false;
  let value;
  try { value = strictJson(text.slice(0, -1), "paid-browser:stderr"); } catch { return false; }
  return value.schemaVersion === "velmere.pass36.a102r13.operational-log-boundary.v1"
    && value.level === "warn" && value.system === "velmere.vlm.paid_entitlement"
    && value.event === "entitlement_memory_fallback" && value.code === "durable_storage_missing"
    && value.rawIdentifiersIncluded === false && value.rawErrorMessageIncluded === false && value.stackIncluded === false
    && allDigests(value.identifierHashes);
}
function validateEslint(value) {
  return value?.schemaVersion === "velmere.pass13.partitioned-eslint.v4" && value.ok === true
    && value.requestedPartitionStart === 1 && value.requestedPartitionEnd === 98
    && value.partitionCount === 98 && value.completedPartitions === 98 && value.passedPartitions === 98
    && Number.isInteger(value.fileCount) && value.fileCount >= 3405 && value.filesCovered === value.fileCount
    && value.lintErrors === 0 && value.lintWarnings === 0 && value.processFailureCount === 0
    && value.firstProcessFailure === null && Array.isArray(value.messages) && value.messages.length === 0
    && Array.isArray(value.processFailures) && value.processFailures.length === 0
    && Array.isArray(value.parts) && value.parts.length === 98
    && value.parts.every((part) => part.passed === true && part.resultPathSetMatch === true && part.lintErrors === 0 && part.lintWarnings === 0 && part.processFailure === null && part.completedInvocations === part.plannedInvocations)
    && value.eslintIdentity?.packageName === "eslint" && value.eslintIdentity?.packageVersion === "10.8.0"
    && value.eslintIdentity?.cliSha256 === "bb07a179294caee1175397035fef38347782cb8fbf00356ca8c6fd2c87a989fa"
    && value.sourceImmutable === true && value.sourceBefore === value.sourceAfter;
}
function validateTypescript(value) {
  const expectedTransitiveMinimum = value?.configuredRootFiles === a60TypeScriptPolicy.preBuildExpectedRootFiles
    ? a60TypeScriptPolicy.preBuildMinimumTransitiveFirstPartyFiles
    : value?.configuredRootFiles === a60TypeScriptPolicy.postDualBuildExpectedRootFiles
      ? a60TypeScriptPolicy.postDualBuildMinimumTransitiveFirstPartyFiles
      : null;
  return value?.schemaVersion === "velmere.pass13.partitioned-typescript.v1" && value.ok === true
    && value.typescriptVersion === "5.9.3" && value.partitionCount === 18
    && Number.isInteger(expectedTransitiveMinimum) && value.rootFilesCovered === value.configuredRootFiles
    && Number.isInteger(value.transitiveFirstPartyFiles) && value.transitiveFirstPartyFiles >= expectedTransitiveMinimum
    && Number.isInteger(value.toolingSyntaxFiles) && value.toolingSyntaxFiles >= a60TypeScriptPolicy.minimumToolingSyntaxFiles
    && Array.isArray(value.toolingSyntaxErrors) && value.toolingSyntaxErrors.length === 0
    && Array.isArray(value.partitions) && value.partitions.length === 18
    && value.partitions.every((part) => part.exitCode === 0 && part.signal === null && part.timedOut === false && Array.isArray(part.diagnostics) && part.diagnostics.length === 0)
    && value.sourceImmutable === true && value.sourceBefore === value.sourceAfter;
}
function validateStage(id, value, artifact, source) {
  switch (id) {
    case "current-authority": return value.schemaVersion === "velmere.pass36.a102r42.action-required-authority-verification.v1" && value.status === "PASS_A102R42_ACTION_REQUIRED_AUTHORITY_A60_TOTAL_FAIL_CLOSED_RECEIPT_AND_LOG_CLASSIFIER_BOUNDARY_EXACT_WINDOWS_NO_LIVE_CREDIT" && value.revisionId === REV && value.checks === 47 && value.passed === 47 && value.failed === 0 && noGo(value);
    case "descendant": return value.schemaVersion === "velmere.pass36.a102r42.current-root-descendant-verification.v1" && value.status === "PASS_A102R42_CURRENT_ROOT_DESCENDANT_ACTION_REQUIRED_NO_PROMOTION" && value.revisionId === REV && value.checks === 28 && value.passed === 28 && value.failed === 0 && value.historicalChainChecks === 422 && value.manifestDigestSha256 === source.descendantManifestDigestSha256 && value.payload?.aggregateSha256 === source.aggregateSha256 && value.globalDecision === "NO_GO" && value.live === false && value.saleEnabled === false;
    case "approved-changes": return value.schemaVersion === "velmere.pass36.a102r42.approved-current-source-changes-verification.v1" && value.status === "PASS_A102R42_APPROVED_CURRENT_SOURCE_CHANGES_COMPLETE_NO_PROMOTION" && value.revisionId === REV && Number.isInteger(value.fileCount) && value.fileCount > 0 && value.checks === 11 + (4 * value.fileCount) && value.passed === value.checks && value.failed === 0 && value.deletedFiles === 0 && value.addedFiles + value.modifiedFiles === value.fileCount && value.globalDecision === "NO_GO" && value.live === false && value.saleEnabled === false;
    case "authority-harness": return value.schemaVersion === "velmere.pass36.a102r42.current-source-authority-preflight-test.v1" && value.status === "PASS_A102R42_CURRENT_SOURCE_AUTHORITY_PREFLIGHT_LOCAL_ONLY_NO_EXACT_FINAL_BYTE_BUILD_BROWSER_CREDIT" && value.checks === 60 && value.passed === 60 && value.failed === 0 && value.retainedChecks === 46 && value.addedChecks === 14 && value.removedChecks === 0 && value.releaseSourceBindingSurfaces === 6 && noGo(value);
    case "historical-chain": return value.schemaVersion === "velmere.pass36.a80.current-root-descendant-verification.v3" && value.status === "PASS_A80_HISTORICAL_DESCENDANT_CHAIN_TO_CURRENT" && value.checks === 433 && value.passed === 433 && value.failed === 0 && value.currentChildPayload?.aggregateSha256 === source.aggregateSha256 && value.liveProven === false && value.saleEnabled === false;
    case "a42-critical": return value.schemaVersion === "velmere.pass36.a102r42.a42-critical-rebaseline-verification.v1" && value.revisionId === REV && value.status === "PASS_A102R42_A42_CRITICAL_REBASELINE_76_OF_76_RETAINED_5_ADDED_3_NO_WINDOWS_BROWSER_STAGING_OR_SALE_CREDIT" && value.checks === 54 && value.passed === 54 && value.failed === 0 && value.criticalFilesPassed === 76 && value.retainedHistoricalRows === 5 && value.currentRebaselinedRows === 3 && noGo(value);
    case "route-dispatch": return artifact?.schemaVersion === "velmere.pass15.route-dispatch-verification.v1" && artifact.summary?.groups === 5 && artifact.summary?.routesPreserved === 160 && artifact.summary?.publicPathsUnique === 160 && artifact.summary?.checks === 1480 && artifact.summary?.passed === 1480 && artifact.summary?.failed === 0 && artifact.summary?.netNextEntrypointReduction === 155 && artifact.summary?.routeAstRegistryFiles === 254 && artifact.summary?.routeAstRegistryExactCredit === true && Array.isArray(artifact.failures) && artifact.failures.length === 0 && value.checks === 1480 && value.failed === 0 && value.routeAstRegistryExactCredit === true;
    case "route-tamper": return value.suite === "PASS15_ROUTE_DISPATCH_MANIFEST_TAMPER" && value.status === "PASS" && value.assertions === 7 && value.routeDenominator === 160 && value.detectedFailure === "/api/internal/workers/auth-security-alerts:handler_bytes";
    case "lazy-routes": return artifact?.schemaVersion === "velmere.pass15.lazy-route-shell-verification.v1" && artifact.summary?.routes === 16 && artifact.summary?.checks === 176 && artifact.summary?.passed === 176 && artifact.summary?.failed === 0 && artifact.summary?.eagerBytesBefore === 23306289 && artifact.summary?.eagerBytesAfter === 57853 && artifact.summary?.eagerByteReduction === 23248436 && artifact.summary?.routeAstRegistryFiles === 254 && artifact.summary?.routeAstRegistryExactCredit === true && Array.isArray(artifact.failures) && artifact.failures.length === 0 && value.checks === 176 && value.failed === 0 && value.routeAstRegistryExactCredit === true;
    case "production-smoke-contract": return value.status === "PASS" && value.assertions === 82 && value.behavior?.realHttpServer === true && value.behavior?.apiEdgeBoundary === true && value.behavior?.negativeOriginAndProto === true && value.behavior?.sourceTextInspection === false;
    case "a45-browser-fixture": return value.schemaVersion === "velmere.pass36.a102r41.a45-browser-qa-fixture-test.v1" && value.status === "PASS_A102R41_A45_DETERMINISTIC_QA_FIXTURE_NO_LIVE_PROVIDER_OR_SALE_CREDIT" && value.checks === 28 && value.passed === 28 && value.failed === 0 && value.live === false && value.saleEnabled === false && value.providerCredit === false && value.durableStorageCredit === false && value.realDataCredit === false;
    case "product-tiers": return value.status === "PASS_PRODUCT_TIER_CONTENT_CONTRACT" && value.checks === 186 && value.surfaces === 7 && value.tiers === 21 && value.visualChangesMade === false;
    case "zero-budget": return value.status === "PASS_ZERO_BUDGET_FUNCTIONAL_ROADMAP" && value.checks === 439 && value.coreDenominator === 86 && value.counts?.DONE === 73 && value.counts?.PARTIAL === 12 && value.counts?.NOT_DONE === 1 && value.counts?.OPTIONAL_EXTERNAL === 0 && value.weightedPlanningPercent === 91.9 && value.targetPercent === 100;
    case "rls": return value.schemaVersion === "velmere.pass36.a102r41.entitlement-revocation-rls-remediation-test.v1" && value.status === "PASS_A102R41_ENTITLEMENT_REVOCATION_RLS_LOCAL_STATIC_NO_STAGING_CREDIT" && value.checks === 18 && value.passed === 18 && value.failed === 0 && value.stagedTenantCasesExecuted === 0 && noGo(value);
    case "external-command": return value.schemaVersion === "velmere.pass36.a102r41.external-command-containment-and-tool-spec-test.v1" && value.total === 11 && value.passed === 11 && value.failed === 0 && value.externalCommandExecutionCredit === false && value.platformContainment?.executable === false && value.platformContainment?.status === "BLOCKED_WINDOWS_JOB_OBJECT_BROKER_REQUIRED" && value.live === false && value.saleEnabled === false;
    case "sanitized-child": return value.schemaVersion === "velmere.pass36.a102r41.sanitized-child-process-boundary-test.v1" && value.status === "PASS_A102R41_SANITIZED_CHILD_PROCESS_NO_SECRET_PERSISTENCE" && value.checks === 11 && value.passed === 11 && value.failed === 0 && noGo(value);
    case "physical-evidence": return value.schemaVersion === "velmere.pass36.a102r41.real-evidence-physical-boundary-test.v1" && value.status === "PASS_A102R41_REAL_EVIDENCE_PHYSICAL_BOUNDARY_LOCAL_CRYPTO_NO_REAL_CREDIT" && value.checks === 9 && value.passed === 9 && value.failed === 0 && value.realEvidenceRows === 0 && noGo(value);
    case "self-assertion-denial": return value.schemaVersion === "velmere.pass36.a102r41.real-intake-self-assertion-denial-test.v1" && value.status === "PASS_A102R41_REAL_INTAKE_SELF_ASSERTION_DENIAL_NO_REAL_CREDIT" && value.checks === 14 && value.passed === 14 && value.failed === 0 && Object.values(value.realDenominators ?? {}).every((entry) => entry === 0) && noGo(value);
    case "account-operation": return value.schemaVersion === "velmere.pass36.a102r41.account-operation-privacy-containment-test.v1" && value.revisionId === PARENT && value.sensitiveOperationDenominator === 8 && value.total === 55 && value.passed === 55 && value.failed === 0 && value.durableServerOwnedWorkflowsImplemented === 0 && value.authorityCredit === false && value.live === false && value.saleEnabled === false;
    case "checkout": return value.schemaVersion === "velmere.pass36.a102r41.paid-checkout-containment-and-browser-storage-test.v1" && value.revisionId === PARENT && value.total === 15 && value.passed === 15 && value.failed === 0 && value.durableOpaqueCheckoutFlowImplemented === false && value.realStripeTestLifecycles === 0 && value.live === false && value.saleEnabled === false;
    case "paid-browser": return value.status === "PASS_A102R5_SERVER_ACCOUNT_ENTITLEMENT_NO_BROWSER_BEARER_PERSISTENCE" && value.assertions === 26 && value.browserBearerTokenIssued === false && value.localStoragePaidTokenAuthority === false && value.browserHeaderEntitlementAuthority === false && value.serverAccountLedgerRequired === true && value.exactContextBindingRequired === true && value.realPaymentCredit === false;
    case "package-boundary": return value.schemaVersion === "velmere.pass36.a102r42.package-portability-and-parser-test.v1" && value.status === "PASS_A102R42_PACKAGE_PORTABILITY_AND_STRICT_MANIFEST_BOUNDARY_NO_PROMOTION" && value.required === 38 && value.executed === 38 && value.passed === 38 && value.failed === 0 && value.denominatorMigration?.old === 36 && value.denominatorMigration?.current === 38 && value.denominatorMigration?.retained === 36 && value.denominatorMigration?.added === 2 && value.denominatorMigration?.removed === 0 && value.denominatorMigration?.verifierChecks === 16 && noGo(value);
    case "a80": return value.schemaVersion === "velmere.pass36.a80.frozen-local-release-candidate-admission-test.v1" && value.status === "PASS_A80_LOCAL_ADMISSION_BLOCKED_EXACT_PREREQUISITES" && value.summary?.checks === 41 && value.summary?.passed === 41 && value.summary?.failed === 0 && value.actualDecision === "BLOCKED_FROZEN_RELEASE_CANDIDATE_PREREQUISITES" && value.exactReleaseCandidateVerified === false && value.liveProven === false && value.saleEnabled === false;
    case "a80r1": return value.schemaVersion === "velmere.pass36.a102r42.a80r1-two-phase-release-controller-test.v1" && value.status === "PASS_A102R42_A80R1_TWO_PHASE_CONTROLLER_MECHANISM_NO_PROMOTION" && value.required === 48 && value.executed === 48 && value.passed === 48 && value.failed === 0 && value.denominatorMigration?.old === 36 && value.denominatorMigration?.new === 48 && value.denominatorMigration?.retainedAssertions === 36 && value.denominatorMigration?.addedAssertions === 12 && value.denominatorMigration?.removedAssertions === 0 && noGo(value);
    case "a60-total-fail-closed": {
      const denominator = value?.checks?.find?.((row) => row?.id === "stage-denominator")?.detail;
      return value?.schemaVersion === "velmere.pass36.a60.exact-final-byte-build-browser-acceptance-test.v1"
        && value?.status === "PASS_A60_HARNESS_AND_FAIL_CLOSED_PREFLIGHT"
        && value?.revisionId === "VELMERE_PASS36_A60R0_EXACT_FINAL_BYTE_BUILD_BROWSER_ACCEPTANCE"
        && value?.summary?.checks === 36 && value?.summary?.passed === 36 && value?.summary?.failed === 0
        && denominator?.requiredStages?.length === 14 && new Set(denominator.requiredStages).size === 14 && value?.exactRuntimeExecuted === false
        && value?.saleEnabled === false && value?.liveProven === false
        && denominator?.failureFinalizationMigration?.checks === 21 && denominator?.failureFinalizationMigration?.passed === 21 && denominator?.failureFinalizationMigration?.failed === 0
        && denominator?.semanticCases?.denominator === 34 && denominator?.semanticCases?.passed === 34
        && denominator?.semanticCases?.identitySha256 === "1713af0162fadb1d2a6bf7ad5d52beed61f85bee5ee6a3442cf7c6a648a4c7bd"
        && denominator?.failureFinalizationMigration?.semanticCaseIdentitySha256 === "1713af0162fadb1d2a6bf7ad5d52beed61f85bee5ee6a3442cf7c6a648a4c7bd"
        && denominator?.failureFinalizationMigration?.retainedSemanticCases === 16 && denominator?.failureFinalizationMigration?.addedSemanticCases === 18 && denominator?.failureFinalizationMigration?.removedSemanticCases === 0;
    }
    case "source-audit-generated-types": return value.schemaVersion === "velmere.pass36.a102r38.source-audit-generated-next-types-test.v1" && value.status === "PASS_A102R38_SOURCE_AUDIT_GENERATED_NEXT_TYPES_BOUNDARY" && value.assertions === 13 && value.positiveProfiles === 2 && value.negativeProfiles === 3;
    case "source-audit": return artifact?.schemaVersion === "velmere.pass35.a44.source-integrity-audit.v1" && artifact.typescriptVersion === "5.9.3" && artifact.summary?.filesRead > 0 && artifact.summary?.bytesRead > 0 && artifact.summary?.codeFiles > 0 && artifact.summary?.syntaxErrors === 0 && artifact.summary?.missingLocalImports === 0 && artifact.summary?.missingCssModuleClasses === 0 && Array.isArray(artifact.syntaxErrors) && artifact.syntaxErrors.length === 0 && Array.isArray(artifact.missingImports) && artifact.missingImports.length === 0 && Array.isArray(artifact.missingCssClasses) && artifact.missingCssClasses.length === 0 && value.syntaxErrors === 0 && value.missingLocalImports === 0 && value.missingCssModuleClasses === 0;
    case "eslint": return validateEslint(artifact);
    case "typescript": return validateTypescript(artifact);
    default: return false;
  }
}

const receiptDir = argumentsExact(process.argv.slice(2));
invariant(process.version === "v24.18.0", `a102r42_regression_exact_node:${process.version}`);
invariant(!fs.existsSync(receiptDir), "a102r42_regression_receipt_dir_must_be_new");
fs.mkdirSync(receiptDir, { recursive: false });
const root = process.cwd();
const before = sourceAuthoritySnapshot(root);
const node = process.execPath;
const tsLoader = [node, "--import", "./scripts/pass11/register-offline-ts-loader.mjs"];
const stages = [
  { id: "current-authority", command: [node, "scripts/pass36/verify-a102r42-action-required-authority.mjs"] },
  { id: "descendant", command: [node, "scripts/pass36/verify-a102r42-current-root-descendant.mjs"] },
  { id: "approved-changes", command: [node, "scripts/pass36/verify-a102r42-approved-current-source-changes.mjs"] },
  { id: "authority-harness", command: [node, "scripts/pass36/test-a102r42-current-source-authority-preflight.mjs"] },
  { id: "historical-chain", command: [node, "scripts/pass36/verify-a80-current-root-descendant.mjs"] },
  { id: "a42-critical", command: [node, "scripts/pass36/verify-a102r42-a42-critical-rebaseline.mjs"] },
  { id: "route-dispatch", command: [node, "scripts/pass15/verify-route-dispatch-consolidation.mjs"] },
  { id: "route-tamper", command: [node, "scripts/pass15/test-route-dispatch-manifest-tamper.mjs"] },
  { id: "lazy-routes", command: [node, "scripts/pass15/verify-lazy-route-shells.mjs"] },
  { id: "production-smoke-contract", command: [...tsLoader, "scripts/deployment/test-production-smoke-contract.mjs"] },
  { id: "a45-browser-fixture", command: [node, "scripts/pass35/test-a45-browser-qa-fixture.mjs"] },
  { id: "product-tiers", command: [node, "scripts/pass35/test-product-tier-content-contract.mjs"] },
  { id: "zero-budget", command: [node, "scripts/pass35/test-zero-budget-functional-roadmap.mjs"] },
  { id: "rls", command: [node, "scripts/pass36/test-a102r41-entitlement-revocation-rls-remediation.mjs"] },
  { id: "external-command", command: [...tsLoader, "scripts/pass36/test-a102r41-external-command-containment-and-tool-spec.mjs"] },
  { id: "sanitized-child", command: [node, "scripts/pass36/test-a102r41-sanitized-child-process-boundary.mjs"] },
  { id: "physical-evidence", command: [node, "scripts/pass36/test-a102r41-real-evidence-physical-boundary.mjs"] },
  { id: "self-assertion-denial", command: [...tsLoader, "scripts/pass36/test-a102r41-real-intake-self-assertion-denial.ts"] },
  { id: "account-operation", command: [...tsLoader, "scripts/pass36/test-a102r41-account-operation-privacy-containment.ts"] },
  { id: "checkout", command: [...tsLoader, "scripts/pass36/test-a102r41-paid-checkout-containment-and-browser-storage.ts"] },
  { id: "paid-browser", command: [...tsLoader, "scripts/pass36/test-a102r5-paid-entitlement-browser-secret-boundary.ts"], structuredPrivacyWarning: true },
  { id: "package-boundary", command: [node, "scripts/pass36/test-a102r42-package-portability-and-parser.mjs"] },
  { id: "a80", command: [node, "scripts/pass36/test-a80-frozen-local-release-candidate-admission.mjs"] },
  { id: "a80r1", command: [node, "scripts/pass36/test-a102r42-a80r1-two-phase-release-controller.mjs"] },
  { id: "a60-total-fail-closed", command: [node, "scripts/pass36/test-a60-exact-final-byte-build-browser-acceptance.mjs"] },
  { id: "source-audit-generated-types", command: [node, "scripts/pass36/test-a102r38-source-audit-generated-next-types.mjs"] },
  { id: "source-audit", command: [node, "scripts/a44-source-integrity-audit.mjs"] },
  { id: "eslint", command: [node, "scripts/pass13/run-partitioned-eslint.mjs"], timeoutMs: 3600000, plainStdout: true },
  { id: "typescript", command: [node, "scripts/pass13/run-partitioned-typescript.mjs"], timeoutMs: 1800000, plainStdout: true },
];

const results = [];
for (const [index, stage] of stages.entries()) {
  const stageBefore = sourceAuthoritySnapshot(root);
  const artifactFile = artifactPath(stage.id, root);
  const artifactBefore = artifactFile && fs.existsSync(artifactFile)
    ? {
        binding: readDescriptorBoundRegularFile(artifactFile, { maxBytes: 128 * 1024 * 1024, errorPrefix: "a102r42_regression_prior_artifact" }).binding,
        mtimeNs: fs.statSync(artifactFile, { bigint: true }).mtimeNs.toString(),
      }
    : null;
  const result = spawnSync(stage.command[0], stage.command.slice(1), {
    cwd: root, env: buildSanitizedChildEnv(process.env), encoding: "utf8",
    timeout: stage.timeoutMs ?? 900000, maxBuffer: 128 * 1024 * 1024, shell: false, windowsHide: true,
  });
  const stdoutScan = sanitizeChildOutput(result.stdout ?? "", process.env);
  const stderrScan = sanitizeChildOutput(result.stderr ?? "", process.env);
  const prefix = `${String(index + 1).padStart(2, "0")}-${safe(stage.id)}`;
  fs.writeFileSync(path.join(receiptDir, `${prefix}.stdout.txt`), stdoutScan.sanitized, { encoding: "utf8", flag: "wx" });
  fs.writeFileSync(path.join(receiptDir, `${prefix}.stderr.txt`), stderrScan.sanitized, { encoding: "utf8", flag: "wx" });
  let parsed = null;
  let parseError = null;
  if (!stage.plainStdout) {
    try { parsed = strictJson(stdoutScan.sanitized.trim(), `${stage.id}:stdout`); }
    catch (error) { parseError = error instanceof Error ? error.message : String(error); }
  }
  let artifact = null;
  let artifactBinding = null;
  let artifactFresh = artifactFile === null;
  let artifactError = null;
  if (artifactFile) {
    try {
      const read = readArtifact(artifactFile, stage.id);
      artifact = read.value; artifactBinding = read.binding;
      const artifactAfterMtimeNs = fs.statSync(artifactFile, { bigint: true }).mtimeNs.toString();
      artifactFresh = artifactBefore === null || artifactBefore.mtimeNs !== artifactAfterMtimeNs;
    } catch (error) { artifactError = error instanceof Error ? error.message : String(error); }
  }
  let stageAfter = null;
  let sourceImmutable = false;
  let sourceAfterError = null;
  try { stageAfter = sourceAuthoritySnapshot(root); sourceImmutable = sameSourceSnapshot(stageBefore, stageAfter); }
  catch (error) { sourceAfterError = error instanceof Error ? error.message : String(error); }
  const stderrAllowed = stderrScan.sanitized.length === 0 || (stage.structuredPrivacyWarning === true && validStructuredPrivacyWarning(stderrScan.sanitized));
  const contractPassed = parseError === null && artifactError === null && artifactFresh && validateStage(stage.id, parsed, artifact, stageBefore);
  const passed = result.status === 0 && result.signal === null && !result.error
    && !stdoutScan.sensitiveOutputDetected && !stderrScan.sensitiveOutputDetected
    && stderrAllowed && sourceImmutable && contractPassed;
  results.push({
    id: stage.id,
    command: stage.command.map((part, position) => position === 0 ? "<EXACT_NODE>" : part),
    exitCode: result.status, signal: result.signal ?? null, timedOut: result.error?.code === "ETIMEDOUT",
    spawnError: result.error?.message ?? null, parseError, artifactError, artifactFresh,
    observedSchema: parsed?.schemaVersion ?? artifact?.schemaVersion ?? null,
    observedStatus: parsed?.status ?? parsed?.decision ?? null,
    artifactBinding, sourceBefore: stageBefore, sourceAfter: stageAfter, sourceAfterError, sourceImmutable,
    stderrPolicy: stage.structuredPrivacyWarning ? "SINGLE_STRICT_REDACTED_OPERATIONAL_JSON" : "EMPTY_REQUIRED",
    stderrAllowed, stdoutBytes: Buffer.byteLength(stdoutScan.sanitized), stdoutSha256: sha256(stdoutScan.sanitized),
    stderrBytes: Buffer.byteLength(stderrScan.sanitized), stderrSha256: sha256(stderrScan.sanitized),
    sensitiveOutputDetected: stdoutScan.sensitiveOutputDetected || stderrScan.sensitiveOutputDetected,
    contractPassed, passed,
  });
  if (!passed) break;
}

const after = sourceAuthoritySnapshot(root);
const sourceImmutable = sameSourceSnapshot(before, after);
const passed = results.length === stages.length && results.every((row) => row.passed) && sourceImmutable;
const truth = { globalDecision: "NO_GO", live: false, saleEnabled: false, productionApproved: false, worldClassProven: false };
const sourceBinding = { revisionId: before.revisionId, descendantManifestRawSha256: before.descendantManifestRawSha256, descendantManifestDigestSha256: before.descendantManifestDigestSha256, aggregateSha256: before.aggregateSha256 };
const receipt = {
  schemaVersion: "velmere.pass36.a102r42.frozen-local-regression-receipt.v1",
  revisionId: REV,
  status: passed ? "PASS_A102R42_FROZEN_SOURCE_FULL_LOCAL_REGRESSION_NO_PROMOTION" : "FAIL_A102R42_FROZEN_SOURCE_LOCAL_REGRESSION",
  passed, sourceBinding, sourceBefore: before, sourceAfter: after, sourceImmutable,
  exactNode: { version: process.version.slice(1), fileName: path.basename(process.execPath), byteLength: fs.statSync(process.execPath).size, sha256: sha256(fs.readFileSync(process.execPath)) },
  requiredStages: stages.length, executedStages: results.length, passedStages: results.filter((row) => row.passed).length,
  failedStages: results.filter((row) => !row.passed).map((row) => row.id), stages: results,
  windowsProcessTreeContainment: false,
  processTreeContainmentBlocker: "BLOCKED_WINDOWS_JOB_OBJECT_BROKER_REQUIRED",
  exactBuildBrowserCredit: false, a77r1ToA80r1Credit: false, ...truth,
};
fs.writeFileSync(path.join(receiptDir, "A102R42_FULL_REGRESSION_RECEIPT.json"), `${JSON.stringify(receipt, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
for (const [stageId, fileName] of [
  ["current-authority", "A102R42_CURRENT_AUTHORITY_RECEIPT.json"],
  ["descendant", "A102R42_DESCENDANT_RECEIPT.json"],
  ["approved-changes", "A102R42_APPROVED_CHANGES_RECEIPT.json"],
]) {
  const stage = results.find((row) => row.id === stageId);
  if (!stage?.passed) continue;
  const wrapper = {
    schemaVersion: "velmere.pass36.a102r42.physical-command-receipt-wrapper.v1", revisionId: REV,
    status: stage.observedStatus, passed: true, sourceBinding,
    validatorContractPassed: stage.contractPassed, observedSchema: stage.observedSchema,
    commandResultBinding: { stdoutBytes: stage.stdoutBytes, stdoutSha256: stage.stdoutSha256, stderrBytes: stage.stderrBytes, stderrSha256: stage.stderrSha256, exitCode: stage.exitCode },
    ...truth,
  };
  fs.writeFileSync(path.join(receiptDir, fileName), `${JSON.stringify(wrapper, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
}
console.log(JSON.stringify(receipt, null, 2));
if (!passed) process.exit(1);
