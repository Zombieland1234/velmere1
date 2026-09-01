import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import zlib from "node:zlib";
import { pathToFileURL } from "node:url";
import { buildA45DeterministicQaFixture } from "../pass35/a45-browser-qa-fixture.mjs";
import { sanitizeA45EvidenceText, sanitizeA45HttpEvidenceUrl } from "../pass35/a45-browser-http-evidence.mjs";
import { evaluateBrowserRouteEvidence, evaluatePopupEvidence, expectedA60EvidencePaths, expectedBrowserRows, expectedScreenshotPaths, inspectPng, validateA60EvidencePathSet, validateBrowserReceipt } from "./a79-exact-build-browser-lib.mjs";
import { canonicalJson } from "../pass4826/release-package-contract.mjs";

const REVISION_ID = "VELMERE_PASS36_A102R41_ACTION_REQUIRED_SECURITY_EVIDENCE_AUTHORITY_EXACT_WINDOWS_AND_FAIL_CLOSED_RELEASE_PACKAGING_NO_LIVE_CREDIT";
const MIGRATION_PATH = "config/pass36/a102r41-a60-browser-fixture-evidence-denominator-migration.json";
const POLICY_PATH = "config/pass36/a60-exact-final-byte-build-browser-acceptance.json";
const CONTRACT_PATH = "config/pass35/a45-exact-runtime-browser-acceptance.json";
const PROFILE_MIGRATION_PATH = "config/pass36/a102r44p30-browser-evidence-race-and-profile-migration.json";
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

function exactUniqueIdentityList(actual, expected) {
  return Array.isArray(actual)
    && Array.isArray(expected)
    && actual.length === expected.length
    && new Set(actual).size === actual.length
    && actual.every((value) => typeof value === "string" && value.length > 0)
    && canonicalJson(actual) === canonicalJson(expected);
}

function fixtureRequestPolicyIsExact(qaFixture, migrationFixture) {
  const requestCounterKeys = Array.isArray(migrationFixture?.requestCounterKeyIdentities) ? migrationFixture.requestCounterKeyIdentities : [];
  const requiredPositive = Array.isArray(migrationFixture?.requiredPositiveRequestFamilyIdentities) ? migrationFixture.requiredPositiveRequestFamilyIdentities : [];
  const requiredZero = Array.isArray(migrationFixture?.requiredZeroRequestFamilyIdentities) ? migrationFixture.requiredZeroRequestFamilyIdentities : [];
  const instrumentedNonRequired = Array.isArray(migrationFixture?.instrumentedNonRequiredRequestFamilyIdentities) ? migrationFixture.instrumentedNonRequiredRequestFamilyIdentities : [];
  const declaredCounterKeys = Array.isArray(qaFixture?.requestCounterKeys) ? qaFixture.requestCounterKeys : [];
  const declaredPositive = new Set(Array.isArray(qaFixture?.requiredPositiveRequestFamilies) ? qaFixture.requiredPositiveRequestFamilies : []);
  const declaredZero = new Set(Array.isArray(qaFixture?.requiredZeroRequestFamilies) ? qaFixture.requiredZeroRequestFamilies : []);
  const inferredNonRequired = declaredCounterKeys.filter((family) => !declaredPositive.has(family) && !declaredZero.has(family));
  const requestKeySet = new Set(requestCounterKeys);
  const positiveSet = new Set(requiredPositive);
  return exactUniqueIdentityList(qaFixture?.requestCounterKeys, requestCounterKeys)
    && exactUniqueIdentityList(qaFixture?.requiredPositiveRequestFamilies, requiredPositive)
    && exactUniqueIdentityList(qaFixture?.requiredZeroRequestFamilies, requiredZero)
    && exactUniqueIdentityList(inferredNonRequired, instrumentedNonRequired)
    && requestCounterKeys.length === migrationFixture.requestCounterKeys
    && requiredPositive.length === migrationFixture.requiredPositiveRequestFamilies
    && requiredZero.length === migrationFixture.requiredZeroRequestFamilies
    && instrumentedNonRequired.length === migrationFixture.instrumentedNonRequiredRequestFamilies
    && requiredPositive.every((family) => requestKeySet.has(family))
    && requiredZero.every((family) => requestKeySet.has(family) && !positiveSet.has(family))
    && requiredPositive.length + requiredZero.length === migrationFixture.constrainedRequestFamilies
    && requiredPositive.length + requiredZero.length + instrumentedNonRequired.length === requestCounterKeys.length;
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const output = Buffer.alloc(12 + data.length);
  output.writeUInt32BE(data.length, 0);
  typeBytes.copy(output, 4);
  data.copy(output, 8);
  output.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 8 + data.length);
  return output;
}
function deterministicPng(width, height) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const row = Buffer.alloc(1 + width * 3);
  const raw = Buffer.concat(Array.from({ length: height }, () => row));
  return Buffer.concat([signature, pngChunk("IHDR", ihdr), pngChunk("IDAT", zlib.deflateSync(raw)), pngChunk("IEND", Buffer.alloc(0))]);
}

export function verifyA60BrowserFixtureEvidenceDenominatorMigration(root = process.cwd()) {
  const migration = JSON.parse(fs.readFileSync(path.join(root, MIGRATION_PATH), "utf8"));
  const policy = JSON.parse(fs.readFileSync(path.join(root, POLICY_PATH), "utf8"));
  const contract = JSON.parse(fs.readFileSync(path.join(root, CONTRACT_PATH), "utf8"));
  const profileMigration = JSON.parse(fs.readFileSync(path.join(root, PROFILE_MIGRATION_PATH), "utf8"));
  const browser = fs.readFileSync(path.join(root, "scripts/a45-browser-acceptance.mjs"), "utf8");
  const httpEvidenceLib = fs.readFileSync(path.join(root, "scripts/pass35/a45-browser-http-evidence.mjs"), "utf8");
  const browserLib = fs.readFileSync(path.join(root, "scripts/pass36/a79-exact-build-browser-lib.mjs"), "utf8");
  const fixtureLib = fs.readFileSync(path.join(root, "scripts/pass35/a45-browser-qa-fixture.mjs"), "utf8");
  const fixtureTest = fs.readFileSync(path.join(root, "scripts/pass35/test-a45-browser-qa-fixture.mjs"), "utf8");
  const a45ContractTest = fs.readFileSync(path.join(root, "scripts/pass35/test-a45-exact-runtime-browser-acceptance.mjs"), "utf8");
  const a60Test = fs.readFileSync(path.join(root, "scripts/pass36/test-a60-exact-final-byte-build-browser-acceptance.mjs"), "utf8");
  const packageEvidence = fs.readFileSync(path.join(root, "scripts/a60-package-evidence.mjs"), "utf8");
  const frozenRegression = fs.readFileSync(path.join(root, "scripts/pass36/run-a102r41-frozen-local-regression.mjs"), "utf8");
  const cleanUnpack = fs.readFileSync(path.join(root, "scripts/pass36/verify-a102r41-clean-unpack.mjs"), "utf8");
  const packageBoundary = fs.readFileSync(path.join(root, "scripts/pass36/test-a102r41-package-portability-and-parser.mjs"), "utf8");
  const rows = expectedBrowserRows(contract);
  const screenshots = expectedScreenshotPaths(contract);
  const evidencePlan = expectedA60EvidencePaths(policy, contract);
  const fixtureBytesA = Buffer.from(`${JSON.stringify(buildA45DeterministicQaFixture(), null, 2)}\n`, "utf8");
  const fixtureBytesB = Buffer.from(`${JSON.stringify(buildA45DeterministicQaFixture(), null, 2)}\n`, "utf8");
  const checks = [];
  const check = (id, passed, detail = null) => checks.push({ id, passed: Boolean(passed), detail });

  check("schema", migration.schemaVersion === "velmere.pass36.a102r41.a60-browser-fixture-evidence-denominator-migration.v1");
  check("revision", migration.revisionId === REVISION_ID);
  check("route-row-denominator-retained", rows.length === 56 && migration.browserScenarioDenominator.routeRowsBefore === 56 && migration.browserScenarioDenominator.routeRowsAfter === 56 && migration.browserScenarioDenominator.removed === 0, rows.length);
  check("scenario-denominator-retained", migration.browserScenarioDenominator.popupRowsBefore === 1 && migration.browserScenarioDenominator.popupRowsAfter === 1 && migration.browserScenarioDenominator.scenarioChecksBefore === 57 && migration.browserScenarioDenominator.scenarioChecksAfter === 57);
  check("screenshot-denominator-retained", screenshots.length === 29 && migration.browserScenarioDenominator.screenshotsBefore === 29 && migration.browserScenarioDenominator.screenshotsAfter === 29, screenshots.length);
  check("popup-tab-denominator-retained", contract.requiredPopupTabs?.length === 4 && migration.browserScenarioDenominator.popupTabsBefore === 4 && migration.browserScenarioDenominator.popupTabsAfter === 4);
  check("a60-stage-denominator-retained", policy.requiredStages?.length === 14 && migration.a60StageDenominator.before === 14 && migration.a60StageDenominator.after === 14 && migration.a60StageDenominator.retained === 14 && migration.a60StageDenominator.added === 0 && migration.a60StageDenominator.removed === 0);
  check("frozen-regression-denominator-migration", migration.frozenLocalRegressionStageDenominator.before === 27 && migration.frozenLocalRegressionStageDenominator.after === 28 && migration.frozenLocalRegressionStageDenominator.retained === 27 && migration.frozenLocalRegressionStageDenominator.added === 1 && migration.frozenLocalRegressionStageDenominator.removed === 0 && migration.frozenLocalRegressionStageDenominator.addedIdentity === "a45-browser-fixture" && frozenRegression.includes('id: "a45-browser-fixture"') && cleanUnpack.includes('value.requiredStages === 28 && value.executedStages === 28 && value.passedStages === 28') && packageBoundary.includes('requiredStages: 28') && packageBoundary.includes('executedStages: 28') && packageBoundary.includes('passedStages: 28'));
  check("evidence-denominator-math", migration.browserEvidenceVerifier.before === 520 && migration.browserEvidenceVerifier.after === 584 && migration.browserEvidenceVerifier.retained === 520 && migration.browserEvidenceVerifier.added === 64 && migration.browserEvidenceVerifier.removed === 0 && 520 + 64 === 584);
  check("evidence-addition-decomposition", migration.browserEvidenceVerifier.addedFixtureChecks === 7 && migration.browserEvidenceVerifier.addedRouteHttpChecks === rows.length && migration.browserEvidenceVerifier.addedPopupHttpChecks === 1 && 7 + rows.length + 1 === 64);
  check("evidence-row-denominator-stable", migration.browserEvidenceVerifier.denominatorStableOnMissingRows === true && browserLib.includes("for (const expectedRow of expectedRows)") && browserLib.includes("declaredRowByKey"));
  check("evidence-screenshot-denominator-stable", migration.browserEvidenceVerifier.denominatorStableOnMissingScreenshots === true && browserLib.includes("for (const expectedPath of expectedPaths)") && browserLib.includes("screenshotByPath"));
  const atomicSnapshotSemantics = {
    evidenceSnapshots: (browser.match(/const evidenceSnapshot = \{/gu) ?? []).length,
    httpErrorSnapshots: (browser.match(/httpErrors: httpErrors\.snapshot\(\)/gu) ?? []).length,
    httpErrorItemBindings: (browser.match(/httpErrors: evidenceSnapshot\.httpErrors\.items/gu) ?? []).length,
    httpErrorSummaryBindings: (browser.match(/httpErrors: evidenceSnapshot\.httpErrors\.summary/gu) ?? []).length,
    staleMutableItemBindings: (browser.match(/httpErrors: httpErrors\.items/gu) ?? []).length,
  };
  check("route-http-collection", browser.includes('page.on("response"') && browser.includes("deriveBrowserRouteEvidence") && browser.includes("derivePopupEvidence")
    && atomicSnapshotSemantics.evidenceSnapshots === 2 && atomicSnapshotSemantics.httpErrorSnapshots === 2
    && atomicSnapshotSemantics.httpErrorItemBindings === 2 && atomicSnapshotSemantics.httpErrorSummaryBindings === 2
    && atomicSnapshotSemantics.staleMutableItemBindings === 0 && policy.browser.qaFixture.evidenceConsistencyMode === "ATOMIC_COLLECTOR_SNAPSHOT"
    && profileMigration.collectorMigration?.after === "ATOMIC_COLLECTOR_SNAPSHOT"
    && browser.includes("requestFailureEvidence") && browser.includes("sanitizeA45EvidenceText") && browser.includes("sanitizeA45HttpEvidenceUrl")
    && browserLib.includes("collectorEvidenceIsComplete(row.httpErrors") && browserLib.includes("collectorEvidenceIsComplete(popup.httpErrors")
    && httpEvidenceLib.includes("rawQueryValuesIncluded: false") && httpEvidenceLib.includes('digestScope: "sanitized-endpoint-only"'), atomicSnapshotSemantics);
  const hostileUrl = "https://user:password@127.0.0.1:4176/api/accounts/acc_12345678901234567890/person%40example.com?token=raw-secret-token&session=raw-session-value&email=person%40example.com#private-fragment";
  const sanitizedHostileUrl = sanitizeA45HttpEvidenceUrl(hostileUrl);
  const sameEndpointDifferentValues = sanitizeA45HttpEvidenceUrl("https://different:credentials@127.0.0.1:4176/api/accounts/acc_12345678901234567890/person%40example.com?token=different&session=other&email=other%40example.com");
  const unicodeKey = sanitizeA45HttpEvidenceUrl("https://127.0.0.1:4176/api/profile?%EF%BD%94%EF%BD%8F%EF%BD%8B%EF%BD%85%EF%BD%8E=secret");
  const externalOrigin = sanitizeA45HttpEvidenceUrl("https://tenant-secret.private-provider.example/customer/cus_1234567890?api_key=hidden");
  const excessiveKeys = sanitizeA45HttpEvidenceUrl(`https://127.0.0.1:4176/api/profile?${Array.from({ length: 40 }, (_, index) => `k${index}=v${index}`).join("&")}`);
  const textEvidence = sanitizeA45EvidenceText("failure https://user:pass@private.example/customer/cus_123456?token=raw person@example.com bearer raw-secret-token", "adversarial");
  const boundedTextEvidence = sanitizeA45EvidenceText("x".repeat(40_000), "adversarial_oversized");
  const redactionRows = [
    { id: "secret-elision", passed: !["user", "password", "raw-secret-token", "raw-session-value", "person@example.com", "private-fragment", "acc_12345678901234567890"].some((value) => JSON.stringify(sanitizedHostileUrl).includes(value)) },
    { id: "endpoint-value-invariance", passed: sameEndpointDifferentValues.urlSha256 === sanitizedHostileUrl.urlSha256 },
    { id: "query-key-tokenization", passed: sanitizedHostileUrl.digestScope === "sanitized-endpoint-only" && sanitizedHostileUrl.originClass === "loopback" && sanitizedHostileUrl.queryKeys.length === 3 && sanitizedHostileUrl.queryKeys.every((key) => /^~query-key-[a-f0-9]{12}$/u.test(key)) },
    { id: "unicode-key-tokenization", passed: unicodeKey.queryKeys.length === 1 && /^~query-key-[a-f0-9]{12}$/u.test(unicodeKey.queryKeys[0]) },
    { id: "external-origin-redaction", passed: externalOrigin.originClass === "external-redacted" && !JSON.stringify(externalOrigin).includes("private-provider.example") && !JSON.stringify(externalOrigin).includes("tenant-secret") },
    { id: "query-key-cap", passed: excessiveKeys.queryKeyCount === 32 && excessiveKeys.queryKeyLimitApplied === true },
    { id: "text-nonpersistence", passed: textEvidence.rawTextIncluded === false && textEvidence.sanitizedTextIncluded === false && !JSON.stringify(textEvidence).includes("person@example.com") && !JSON.stringify(textEvidence).includes("raw-secret-token") },
    { id: "text-input-cap", passed: boundedTextEvidence.inputTruncated === true && boundedTextEvidence.inputCharacterLimit === 32_768 && boundedTextEvidence.rawTextIncluded === false && boundedTextEvidence.sanitizedTextIncluded === false },
  ];
  const redactionIds = redactionRows.map((row) => row.id);
  check("http-evidence-redaction-adversarial", redactionRows.length === 8 && new Set(redactionIds).size === 8 && sha256(redactionIds.join("\n")) === "a738d145e05f6abe93b4bb1f245b1d67dc746f225d777e368b0c4a810b0f32d3" && redactionRows.every((row) => row.passed), { cases: redactionRows.length, identitySha256: sha256(redactionIds.join("\n")), passed: redactionRows.filter((row) => row.passed).length, rows: redactionRows, sanitizedHostileUrl, unicodeKey, externalOrigin, excessiveKeys, textEvidence, boundedTextEvidence });
  check("http-verification", browserLib.includes("row-http-errors:") && browserLib.includes("popup-http-errors") && browserLib.includes("expected.requireHttpErrors === true"));
  check("fixture-policy-binding", policy.browser?.qaFixture?.generate === true && policy.browser.qaFixture.relativePath === migration.fixture.relativePath && policy.browser.qaFixture.generatorId === migration.fixture.generatorId && policy.browser.qaFixture.denominatorMigrationPath === MIGRATION_PATH);
  const canonicalFixtureRequestPolicy = structuredClone(policy.browser.qaFixture);
  const fixtureRequestPolicyCases = [
    { id: "canonical", accepted: fixtureRequestPolicyIsExact(canonicalFixtureRequestPolicy, migration.fixture) },
    { id: "counter-key-omitted", accepted: fixtureRequestPolicyIsExact({ ...canonicalFixtureRequestPolicy, requestCounterKeys: canonicalFixtureRequestPolicy.requestCounterKeys.slice(0, -1) }, migration.fixture) },
    { id: "counter-key-substituted", accepted: fixtureRequestPolicyIsExact({ ...canonicalFixtureRequestPolicy, requestCounterKeys: canonicalFixtureRequestPolicy.requestCounterKeys.map((family) => family === "icon" ? "replacementFamily" : family) }, migration.fixture) },
    { id: "positive-family-omitted", accepted: fixtureRequestPolicyIsExact({ ...canonicalFixtureRequestPolicy, requiredPositiveRequestFamilies: canonicalFixtureRequestPolicy.requiredPositiveRequestFamilies.slice(0, -1) }, migration.fixture) },
    { id: "positive-family-substituted", accepted: fixtureRequestPolicyIsExact({ ...canonicalFixtureRequestPolicy, requiredPositiveRequestFamilies: canonicalFixtureRequestPolicy.requiredPositiveRequestFamilies.map((family) => family === "realMarkets" ? "klines" : family) }, migration.fixture) },
    { id: "zero-family-omitted", accepted: fixtureRequestPolicyIsExact({ ...canonicalFixtureRequestPolicy, requiredZeroRequestFamilies: [] }, migration.fixture) },
    { id: "positive-zero-overlap", accepted: fixtureRequestPolicyIsExact({ ...canonicalFixtureRequestPolicy, requiredZeroRequestFamilies: ["authSession"] }, migration.fixture) },
    { id: "duplicate-positive-family", accepted: fixtureRequestPolicyIsExact({ ...canonicalFixtureRequestPolicy, requiredPositiveRequestFamilies: ["authSession", "markets", "realMarkets", "realMarkets"] }, migration.fixture) },
  ];
  const fixtureRequestPolicyCaseIds = fixtureRequestPolicyCases.map((row) => row.id);
  const profileTransitionIsExact = profileMigration.profileMigration?.anonymousProfileExpectedBefore === "POSITIVE"
    && profileMigration.profileMigration?.anonymousProfileExpectedAfter === "EXACT_ZERO"
    && profileMigration.profileMigration?.positiveFamiliesBefore === migration.fixture.requiredPositiveRequestFamiliesAtR41
    && profileMigration.profileMigration?.positiveFamiliesAfter === migration.fixture.requiredPositiveRequestFamilies
    && profileMigration.profileMigration?.zeroFamiliesAfter === migration.fixture.requiredZeroRequestFamilies
    && profileMigration.profileMigration?.requestCounterRetained === true
    && migration.fixture.positiveToZeroTransitions?.length === 1
    && migration.fixture.positiveToZeroTransitions[0] === "profile"
    && migration.fixture.constrainedRequestFamiliesAtR41 === migration.fixture.constrainedRequestFamilies
    && migration.fixture.requestCounterKeysAtR41 === migration.fixture.requestCounterKeys;
  check("fixture-request-denominator", fixtureRequestPolicyCases.length === 8 && new Set(fixtureRequestPolicyCaseIds).size === 8
    && sha256(fixtureRequestPolicyCaseIds.join("\n")) === "9b0cbbf870b6d07307d435173789642ee4b7a26c46403419eaf313354a246633"
    && fixtureRequestPolicyCases[0].accepted === true && fixtureRequestPolicyCases.slice(1).every((row) => row.accepted === false)
    && profileTransitionIsExact, { profileTransitionIsExact, cases: fixtureRequestPolicyCases });
  check("fixture-policy-no-credit", ["providerCredit", "durableStorageCredit", "realDataCredit", "liveCredit", "saleCredit"].every((key) => policy.browser.qaFixture[key] === false && migration.fixture[key] === false));
  check("fixture-deterministic-bytes", fixtureBytesA.equals(fixtureBytesB) && fixtureBytesA.length > 0 && sha256(fixtureBytesA) === sha256(fixtureBytesB), { byteLength: fixtureBytesA.length, sha256: sha256(fixtureBytesA) });
  check("fixture-no-clobber-and-reparse", fixtureLib.includes('fs.openSync(absolutePath, "wx")') && fixtureLib.includes("ensureFixtureParentDirectories") && fixtureLib.includes("lstatSync") && fixtureLib.includes("a45_fixture_reparse_component_forbidden") && fixtureLib.includes("realpathSync.native"));
  check("fixture-independent-verifier-binding", browserLib.includes("buildA45DeterministicQaFixture") && browserLib.includes("canonicalFixtureBytes") && browserLib.includes("fixtureBytes.equals(canonicalFixtureBytes)"));
  check("fixture-seven-controls", ["fixture-enabled", "fixture-path", "fixture-generated", "fixture-digest", "fixture-truth-boundary", "fixture-request-shape", "fixture-required-usage"].every((token) => browserLib.includes(JSON.stringify(token))));
  const probeRoot = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-a60-browser-evidence-probe-"));
  try {
    const fixtureAbsolute = path.join(probeRoot, ...migration.fixture.relativePath.split("/"));
    fs.mkdirSync(path.dirname(fixtureAbsolute), { recursive: true });
    fs.writeFileSync(fixtureAbsolute, fixtureBytesA);
    const popupPath = "artifacts/pass35/a45/screenshots/pl-desktop-shield-popup-four-tabs.png";
    const popupAbsolute = path.join(probeRoot, ...popupPath.split("/"));
    fs.mkdirSync(path.dirname(popupAbsolute), { recursive: true });
    fs.writeFileSync(popupAbsolute, deterministicPng(640, 360));
    const probeExpected = {
      baseUrl: "http://127.0.0.1:4176",
      sourceManifestSha256: "a".repeat(64),
      runtimeInstanceSha256: "b".repeat(64),
      browserExecutableSha256: "c".repeat(64),
      buildId: "a102r41-browser-evidence-probe",
      requireHttpErrors: true,
      qaFixtureRequired: true,
      qaFixtureRelativePath: migration.fixture.relativePath,
      qaFixtureGeneratorId: migration.fixture.generatorId,
      qaFixtureRequestCounterKeys: policy.browser.qaFixture.requestCounterKeys,
      qaFixtureRequiredPositiveRequestFamilies: policy.browser.qaFixture.requiredPositiveRequestFamilies,
      qaFixtureRequiredZeroRequestFamilies: policy.browser.qaFixture.requiredZeroRequestFamilies,
    };
    const probeContract = { locales: [], routes: [], requiredPopupTabs: [] };
    const requestUsage = Object.fromEntries(policy.browser.qaFixture.requestCounterKeys.map((key) => [key, 1]));
    for (const key of policy.browser.qaFixture.requiredZeroRequestFamilies) requestUsage[key] = 0;
    const emptyEvidenceCounts = () => ({ total: 0, retained: 0, truncated: false, limit: 60 });
    const probePopupEvidenceCounts = {
      consoleErrors: emptyEvidenceCounts(), ignoredConsoleErrors: emptyEvidenceCounts(), pageErrors: emptyEvidenceCounts(), hydrationErrors: emptyEvidenceCounts(),
      httpErrors: emptyEvidenceCounts(), failedRequests: emptyEvidenceCounts(), ignoredRequestFailures: emptyEvidenceCounts(),
    };
    const probeReceipt = {
      schemaVersion: "velmere.pass35.a45.browser-acceptance.v2",
      baseUrl: probeExpected.baseUrl,
      bindings: {
        sourceManifestSha256: probeExpected.sourceManifestSha256,
        runtimeInstanceSha256: probeExpected.runtimeInstanceSha256,
        browserExecutableSha256: probeExpected.browserExecutableSha256,
        buildId: probeExpected.buildId,
      },
      qaFixture: {
        enabled: true,
        generated: true,
        generatorId: migration.fixture.generatorId,
        fixtureRelativePath: migration.fixture.relativePath,
        fixtureSha256: sha256(fixtureBytesA),
        fixtureByteLength: fixtureBytesA.length,
        truthBoundary: buildA45DeterministicQaFixture().truthBoundary,
        liveProven: false,
        saleEnabled: false,
        providerCredit: false,
        durableStorageCredit: false,
        realDataCredit: false,
        requests: requestUsage,
      },
      summary: { checks: 1, passed: 1, failed: 0 },
      failures: [],
      rows: [],
      popup: {
        ok: true, id: "shield-popup-four-tabs",
        url: `${probeExpected.baseUrl}/pl/market-integrity`, finalUrl: `${probeExpected.baseUrl}/pl/market-integrity`, error: null,
        modalBounds: { x: 10, y: 10, width: 600, height: 320 }, viewport: { width: 640, height: 360 }, fitsViewport: true,
        tabRows: [],
        consoleErrors: [], ignoredConsoleErrors: [], pageErrors: [], hydrationErrors: [], httpErrors: [], failedRequests: [], ignoredRequestFailures: [],
        evidenceCounts: probePopupEvidenceCounts,
        brokenImages: [], brokenImagesTotal: 0, brokenImagesTruncated: false,
        screenshotPath: popupPath,
        screenshotSha256: sha256(fs.readFileSync(popupAbsolute)),
      },
    };
    const validProbe = validateBrowserReceipt({ root: probeRoot, receipt: probeReceipt, contract: probeContract, expected: probeExpected });
    const strictBudgets = { maximumConsoleErrorsPerRoute: 0, maximumPageErrorsPerRoute: 0, minimumBodyHeightPx: 100, maximumHorizontalOverflowPx: 4 };
    const strictRoute = { id: "probe", selector: "main" };
    const strictExpectedUrl = `${probeExpected.baseUrl}/pl/probe`;
    const strictRow = {
      ok: true, navigationError: null, fatalTokenPresent: false, url: strictExpectedUrl, finalUrl: strictExpectedUrl, sameOrigin: true, status: 200,
      selector: "main", selectorCount: 1, consoleErrors: [], ignoredConsoleErrors: [], pageErrors: [], hydrationErrors: [], httpErrors: [], failedRequests: [], ignoredRequestFailures: [], firstPartyFailureCount: 0,
      evidenceCounts: probePopupEvidenceCounts, brokenImages: [], brokenImagesTotal: 0, brokenImagesTruncated: false,
      imageSettle: { candidates: 0, incomplete: 0 },
      securityHeaders: { contentSecurityPolicyPresent: true, frameAncestorsDeclared: true, contentTypeOptionsNosniff: true, referrerPolicyPresent: true },
      interactions: { reducedMotion: true, keyboardFocus: { escapedBody: true }, zoom200: { applied: true, bodyVisible: true, fatalTokenPresent: false } },
      layout: { bodyHeight: 1000, horizontalOverflowPx: 0, invalidTokens: [] },
    };
    const routeMutations = [
      ["selector", (value) => { value.selectorCount = 0; }], ["csp", (value) => { value.securityHeaders.contentSecurityPolicyPresent = false; }],
      ["hydration", (value) => { value.hydrationErrors = [{ category: "hydration_error" }]; value.evidenceCounts.hydrationErrors = { total: 1, retained: 1, truncated: false, limit: 60 }; }],
      ["focus", (value) => { value.interactions.keyboardFocus.escapedBody = false; }], ["overflow", (value) => { value.layout.horizontalOverflowPx = 5; }],
      ["navigation", (value) => { value.navigationError = { category: "navigation_error" }; }], ["origin", (value) => { value.sameOrigin = false; }],
      ["ignored-forgery", (value) => { value.ignoredRequestFailures = [{ classification: "expected_next_rsc_abort", url: `${probeExpected.baseUrl}/pl`, error: "net::ERR_ABORTED", method: "GET", resourceType: "fetch", isNavigationRequest: false }]; value.evidenceCounts.ignoredRequestFailures = { total: 1, retained: 1, truncated: false, limit: 60 }; }],
    ].map(([id, mutate]) => { const value = structuredClone(strictRow); mutate(value); return { id, rejected: !evaluateBrowserRouteEvidence(value, { route: strictRoute, expectedUrl: strictExpectedUrl, baseUrl: probeExpected.baseUrl, budgets: strictBudgets, strict: true }) }; });
    const popupMutations = [
      ["final-url", (value) => { value.finalUrl = `${probeExpected.baseUrl}/pl`; }], ["bounds", (value) => { value.modalBounds.width = 999; }],
      ["console", (value) => { value.consoleErrors = [{ category: "popup_console_error" }]; value.evidenceCounts.consoleErrors = { total: 1, retained: 1, truncated: false, limit: 60 }; }],
      ["request", (value) => { value.failedRequests = [{ classification: "request_failed" }]; value.evidenceCounts.failedRequests = { total: 1, retained: 1, truncated: false, limit: 60 }; }],
    ].map(([id, mutate]) => { const value = structuredClone(probeReceipt.popup); mutate(value); return { id, rejected: !evaluatePopupEvidence(value, { expectedUrl: `${probeExpected.baseUrl}/pl/market-integrity`, requiredTabs: [], baseUrl: probeExpected.baseUrl, strict: true }) }; });
    const validPng = deterministicPng(640, 360);
    const idatCrcCorruptPng = Buffer.from(validPng);
    const idatTypeOffset = idatCrcCorruptPng.indexOf(Buffer.from("IDAT", "ascii"));
    if (idatTypeOffset < 0 || idatTypeOffset + 4 >= idatCrcCorruptPng.length) throw new Error("a60_png_probe_idat_missing");
    const idatLength = idatCrcCorruptPng.readUInt32BE(idatTypeOffset - 4);
    idatCrcCorruptPng[idatTypeOffset + 4 + idatLength + 3] ^= 0x01;
    const iendCrcCorruptPng = Buffer.from(validPng);
    iendCrcCorruptPng[iendCrcCorruptPng.length - 1] ^= 0x01;
    const pngCases = [
      { id: "valid-png", rejected: inspectPng(validPng).valid === true },
      { id: "idat-crc-corrupt", rejected: inspectPng(idatCrcCorruptPng).reason === "crc:IDAT" },
      { id: "iend-crc-corrupt", rejected: inspectPng(iendCrcCorruptPng).reason === "crc:IEND" },
    ];
    const pngCaseIds = pngCases.map((row) => row.id);
    if (pngCases.length !== 3 || new Set(pngCaseIds).size !== 3 || sha256(pngCaseIds.join("\n")) !== "30d4667598755fd95634be3a0bd7e1216dee4af0ba2301fa4cc746c520386c07") throw new Error("a60_png_probe_denominator_or_identity_invalid");
    const semanticCases = [
      { id: "valid-route", rejected: evaluateBrowserRouteEvidence(strictRow, { route: strictRoute, expectedUrl: strictExpectedUrl, baseUrl: probeExpected.baseUrl, budgets: strictBudgets, strict: true }) },
      ...routeMutations,
      ...popupMutations,
      ...pngCases,
    ];
    const semanticCaseIds = semanticCases.map((row) => row.id);
    check("adversarial-probe-pass-denominator", validProbe.passed === true && validProbe.checks.length === 24 && semanticCases.length === 16 && new Set(semanticCaseIds).size === 16 && sha256(semanticCaseIds.join("\n")) === "66d4e46cef6868b6fd7fbca37f75f651579c31193ea0e577b89d7f41174edf67" && semanticCases.every((row) => row.rejected), { checks: validProbe.checks.length, failures: validProbe.failures, semanticCases: { total: semanticCases.length, identitySha256: sha256(semanticCaseIds.join("\n")), passed: semanticCases.filter((row) => row.rejected).length, rows: semanticCases } });
    const substitutedFixture = { ...buildA45DeterministicQaFixture(), generatedAt: "2026-08-01T00:00:01.000Z" };
    const substitutedBytes = Buffer.from(`${JSON.stringify(substitutedFixture, null, 2)}\n`, "utf8");
    fs.writeFileSync(fixtureAbsolute, substitutedBytes);
    const substitutedReceipt = structuredClone(probeReceipt);
    substitutedReceipt.qaFixture.fixtureSha256 = sha256(substitutedBytes);
    substitutedReceipt.qaFixture.fixtureByteLength = substitutedBytes.length;
    const substitutedProbe = validateBrowserReceipt({ root: probeRoot, receipt: substitutedReceipt, contract: probeContract, expected: probeExpected });
    check("adversarial-substituted-fixture-rejected", substitutedProbe.passed === false && substitutedProbe.checks.length === 24 && substitutedProbe.failures.some((row) => row.id === "fixture-digest"), substitutedProbe.failures);
    fs.writeFileSync(fixtureAbsolute, fixtureBytesA);
    const httpReceipt = structuredClone(probeReceipt);
    httpReceipt.popup.httpErrors = [{ status: 503, url: "http://127.0.0.1:4176/api/profile", rawQueryValuesIncluded: false }];
    const httpProbe = validateBrowserReceipt({ root: probeRoot, receipt: httpReceipt, contract: probeContract, expected: probeExpected });
    check("adversarial-http-503-rejected", httpProbe.passed === false && httpProbe.checks.length === 24 && httpProbe.failures.some((row) => row.id === "popup-http-errors"), httpProbe.failures);
    const missingScreenshot = structuredClone(probeReceipt);
    missingScreenshot.popup.screenshotPath = null;
    missingScreenshot.popup.screenshotSha256 = null;
    const screenshotProbe = validateBrowserReceipt({ root: probeRoot, receipt: missingScreenshot, contract: probeContract, expected: probeExpected });
    check("adversarial-missing-screenshot-denominator-stable", screenshotProbe.passed === false && screenshotProbe.checks.length === 24 && screenshotProbe.failures.some((row) => row.id === `screenshot-present:${popupPath}`), screenshotProbe.failures);
    const zeroUsage = structuredClone(probeReceipt);
    zeroUsage.qaFixture.requests.authSession = 0;
    const usageProbe = validateBrowserReceipt({ root: probeRoot, receipt: zeroUsage, contract: probeContract, expected: probeExpected });
    const forbiddenZeroUsage = structuredClone(probeReceipt);
    forbiddenZeroUsage.qaFixture.requests.profile = 1;
    const forbiddenZeroUsageProbe = validateBrowserReceipt({ root: probeRoot, receipt: forbiddenZeroUsage, contract: probeContract, expected: probeExpected });
    check("adversarial-zero-fixture-usage-rejected", usageProbe.passed === false && usageProbe.checks.length === 24 && usageProbe.failures.some((row) => row.id === "fixture-required-usage")
      && forbiddenZeroUsageProbe.passed === false && forbiddenZeroUsageProbe.checks.length === 24 && forbiddenZeroUsageProbe.failures.some((row) => row.id === "fixture-required-usage"),
    { missingRequiredPositive: usageProbe.failures, forbiddenRequiredZero: forbiddenZeroUsageProbe.failures });
  } finally {
    fs.rmSync(probeRoot, { recursive: true, force: true });
  }
  check("a45-contract-migration", migration.a45StaticContractTest.before === 62 && migration.a45StaticContractTest.after === 64 && migration.a45StaticContractTest.retained === 62 && migration.a45StaticContractTest.added === 2 && migration.a45StaticContractTest.removed === 0 && migration.a45StaticContractTest.addedIdentities.every((identity) => a45ContractTest.includes(identity.split(":")[1])));
  check("fixture-test-migration", migration.a45FixtureTest.historicalDeclared === 9 && migration.a45FixtureTest.historicalPhysicallyIdentifiedPredicates === 7 && migration.a45FixtureTest.historicalDeclaredDenominatorSupported === false && migration.a45FixtureTest.after === 29 && migration.a45FixtureTest.retainedRequirements === 7 && migration.a45FixtureTest.addedChecks === 22 && migration.a45FixtureTest.removedRequirements === 0);
  check("fixture-test-identities", fixtureTest.includes('check("generator-byte-identical-2-of-2"') && fixtureTest.includes('check("handler-denominator-10"') && fixtureTest.includes('check("handler-request-family-ground-truth-10"') && fixtureTest.includes('check("reparse-component-rejected"') && fixtureTest.includes("generationRejected") && fixtureTest.includes('check("denominator-migration"') && fixtureTest.includes("checks: checks.length"));
  check("a60-harness-migration", migration.a60HarnessTest.before === 35 && migration.a60HarnessTest.after === 36 && migration.a60HarnessTest.retained === 35 && migration.a60HarnessTest.added === 1 && migration.a60HarnessTest.removed === 0 && a60Test.includes("verifyA60BrowserFixtureEvidenceDenominatorMigration"));
  check("a60-runner-fixture-binding", browser.includes("generateA45QaFixture") && fs.readFileSync(path.join(root, "scripts/a60-exact-final-byte-build-browser-acceptance.mjs"), "utf8").includes("VELMERE_A45_QA_FIXTURE_GENERATE"));
  const pathSetCases = [
    { id: "canonical-59", passed: evidencePlan.requiredPaths.length === 59 && evidencePlan.corePaths.length === 4 && evidencePlan.requiredLogPaths.length === 26 && evidencePlan.screenshotPaths.length === 29 && validateA60EvidencePathSet(evidencePlan.requiredPaths, policy, contract).passed === true },
    { id: "route-order-stable", passed: sha256(expectedA60EvidencePaths(policy, { ...contract, routes: [...contract.routes].reverse() }).requiredPaths.join("\n")) === policy.evidencePackage.requiredPathSetSha256 },
    { id: "missing-path", passed: validateA60EvidencePathSet(evidencePlan.requiredPaths.slice(1), policy, contract).passed === false },
    { id: "extra-path", passed: validateA60EvidencePathSet([...evidencePlan.requiredPaths, "artifacts/pass36/a60/unapproved.log"].sort(), policy, contract).passed === false },
    { id: "duplicate-path", passed: validateA60EvidencePathSet([...evidencePlan.requiredPaths, evidencePlan.requiredPaths[0]], policy, contract).passed === false },
    { id: "noncanonical-order", passed: validateA60EvidencePathSet([...evidencePlan.requiredPaths].reverse(), policy, contract).passed === false },
    { id: "renamed-log", passed: validateA60EvidencePathSet(evidencePlan.requiredPaths.map((entry) => entry.endsWith("npm-ci.stdout.log") ? entry.replace("npm-ci.stdout.log", "npm-ci-renamed.stdout.log") : entry), policy, contract).passed === false },
    { id: "unsafe-fixture-path", passed: (() => { const unsafePolicy = structuredClone(policy); unsafePolicy.browser.qaFixture.relativePath = "artifacts/pass35/a45/../outside.json"; return validateA60EvidencePathSet(evidencePlan.requiredPaths, unsafePolicy, contract).passed === false; })() },
  ];
  const pathSetCaseIds = pathSetCases.map((row) => row.id);
  check("evidence-package-self-contained", packageEvidence.includes("PASS35_A45_BROWSER_ACCEPTANCE.json") && packageEvidence.includes("policy.browser.qaFixture.relativePath") && packageEvidence.includes("validateBrowserReceipt") && packageEvidence.includes("validateA60StageSequence") && packageEvidence.includes("expectedA60EvidencePaths") && packageEvidence.includes("validateA60EvidencePathSet") && packageEvidence.includes("deterministicBuilds: 2") && packageEvidence.includes("a60_browser_verifier_not_exact_current_584_of_584") && pathSetCases.length === 8 && new Set(pathSetCaseIds).size === 8 && sha256(pathSetCaseIds.join("\n")) === "02ff58633ad9c01b3895f590ea09375edfa87f694fc768c91ea0ee6fd47fc5f8" && pathSetCases.every((row) => row.passed), { pathSetCases: { denominator: pathSetCases.length, identitySha256: sha256(pathSetCaseIds.join("\n")), passed: pathSetCases.filter((row) => row.passed).length, rows: pathSetCases }, decomposition: { core: evidencePlan.corePaths.length, logs: evidencePlan.requiredLogPaths.length, screenshots: evidencePlan.screenshotPaths.length, total: evidencePlan.requiredPaths.length, pathSetSha256: sha256(evidencePlan.requiredPaths.join("\n")) } });
  check("negative-evidence-no-credit", migration.final07NegativeEvidence.a60StagesPassed === 12 && migration.final07NegativeEvidence.a60StagesRequired === 14 && migration.final07NegativeEvidence.browserRowsExecuted === 56 && migration.final07NegativeEvidence.browserRowsPassed === 0 && migration.final07NegativeEvidence.screenshotsProduced === 28 && migration.final07NegativeEvidence.popupTabsPassed === 0 && migration.final07NegativeEvidence.genericConsole503Events === 313 && migration.final07NegativeEvidence.rowGenericConsole503Events === 306 && migration.final07NegativeEvidence.popupGenericConsole503Events === 7 && migration.final07NegativeEvidence.endpointIdentityCaptured === false && migration.final07NegativeEvidence.uniqueObservedHttp503Endpoints === null && migration.final07NegativeEvidence.sourceUnchanged === true && migration.final07NegativeEvidence.creditGranted === false);
  const strengthening = migration.postAuditExistingRowStrengthening;
  check("no-denominator-collapse", migration.browserEvidenceVerifier.after >= migration.browserEvidenceVerifier.before && migration.a45StaticContractTest.after >= migration.a45StaticContractTest.before && migration.a45FixtureTest.after >= migration.a45FixtureTest.historicalPhysicallyIdentifiedPredicates && migration.a60HarnessTest.after >= migration.a60HarnessTest.before
    && strengthening?.topLevelChecksBefore === 38 && strengthening?.topLevelChecksAfter === 38 && strengthening?.retainedTopLevelChecks === 38 && strengthening?.addedTopLevelChecks === 0 && strengthening?.removedTopLevelChecks === 0
    && canonicalJson(strengthening?.strengthenedExistingCheckIds) === canonicalJson(["fixture-no-clobber-and-reparse", "fixture-test-identities", "fixture-test-migration", "http-evidence-redaction-adversarial", "adversarial-probe-pass-denominator", "adversarial-zero-fixture-usage-rejected", "evidence-package-self-contained", "fixture-request-denominator", "route-http-collection"])
    && strengthening?.nestedSubcaseDenominators?.fixtureOperations === 2 && strengthening?.nestedSubcaseDenominators?.httpPrivacyAndBudget === 8
    && strengthening?.nestedSubcaseDenominators?.browserSemanticAndPng === 16 && strengthening?.nestedSubcaseDenominators?.pngIntegrity === 3
    && strengthening?.nestedSubcaseDenominators?.a60StageSequenceAndLogBinding === 16 && strengthening?.nestedSubcaseDenominators?.evidencePathSet === 8
    && strengthening?.nestedSubcaseDenominators?.fixtureRequestFamilyPolicy === 8 && strengthening?.nestedSubcaseDenominators?.fixtureRequestHandlerMappings === 10 && strengthening?.nestedSubcaseDenominators?.fixtureUsagePolarity === 2
    && strengthening?.scoreCredit === false);
  check("no-bypass", migration.testsDeleted === 0 && migration.skipsAdded === 0 && migration.timeoutsIncreased === 0);
  check("truth-boundary", migration.scoreCredit === false && migration.globalDecision === "NO_GO" && migration.live === false && migration.saleEnabled === false && migration.productionApproved === false && migration.worldClassProven === false);
  const core = { ...migration };
  delete core.migrationDigestSha256;
  check("self-digest", /^[a-f0-9]{64}$/u.test(migration.migrationDigestSha256) && migration.migrationDigestSha256 === sha256(canonicalJson(core)));

  const failures = checks.filter((row) => !row.passed);
  return {
    schemaVersion: "velmere.pass36.a102r41.a60-browser-fixture-evidence-denominator-migration-verification.v1",
    revisionId: REVISION_ID,
    status: failures.length === 0 ? "PASS_A102R41_A60_BROWSER_FIXTURE_EVIDENCE_DENOMINATOR_MIGRATION_NO_PROMOTION" : "FAIL_A102R41_A60_BROWSER_FIXTURE_EVIDENCE_DENOMINATOR_MIGRATION",
    checks: checks.length,
    passed: checks.length - failures.length,
    failed: failures.length,
    browserRows: rows.length,
    screenshots: screenshots.length,
    verifierDenominatorBefore: migration.browserEvidenceVerifier.before,
    verifierDenominatorAfter: migration.browserEvidenceVerifier.after,
    verifierChecksAdded: migration.browserEvidenceVerifier.added,
    verifierChecksRemoved: migration.browserEvidenceVerifier.removed,
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
  const result = verifyA60BrowserFixtureEvidenceDenominatorMigration();
  console.log(JSON.stringify(result, null, 2));
  if (result.failed) process.exit(1);
}
