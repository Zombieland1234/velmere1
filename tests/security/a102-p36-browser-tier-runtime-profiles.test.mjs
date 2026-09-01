import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { buildCurrentEvidenceAvailabilityMatrix } from "../../lib/commerce/vlm-current-evidence-availability-matrix.ts";
import {
  buildP36BrowserTierRuntimeProfiles,
  canonicalSha256,
  runP36BrowserTierRuntimeProfiles,
  verifyP36BrowserTierRuntimeProfiles,
} from "../../scripts/closure/build-p36-browser-tier-runtime-profiles.mjs";
import { expectedScreenshotPaths } from "../../scripts/pass36/a79-exact-build-browser-lib.mjs";
import { buildA45DeterministicQaFixture } from "../../scripts/pass35/a45-browser-qa-fixture.mjs";

const ROOT = path.resolve(import.meta.dirname, "../..");
const contract = JSON.parse(
  fs.readFileSync(path.join(ROOT, "config/pass35/a45-exact-runtime-browser-acceptance.json"), "utf8"),
);
const a60Policy = JSON.parse(
  fs.readFileSync(path.join(ROOT, "config/pass36/a60-exact-final-byte-build-browser-acceptance.json"), "utf8"),
);
const qaFixturePolicy = a60Policy.browser.qaFixture;
const qaFixtureBytes = Buffer.from(`${JSON.stringify(buildA45DeterministicQaFixture(), null, 2)}\n`, "utf8");
const qaFixtureSha256 = crypto.createHash("sha256").update(qaFixtureBytes).digest("hex");
const referencePng = fs.readFileSync(
  path.join(ROOT, "public/velmere/velmere-neural-core-pass2241.png"),
);
const referencePngSha256 = crypto.createHash("sha256").update(referencePng).digest("hex");
const emptyEvidenceSummary = Object.freeze({
  total: 0,
  retained: 0,
  truncated: false,
  limit: 60,
});

let assertions = 0;
let mutations = 0;
function check(value, message) {
  assertions += 1;
  assert.ok(value, message);
}
function clone(value) {
  return structuredClone(value);
}
function shaFile(relativePath) {
  const bytes = fs.readFileSync(path.join(ROOT, relativePath));
  return { path: relativePath, byteLength: bytes.length, sha256: crypto.createHash("sha256").update(bytes).digest("hex") };
}
function evidenceCounts() {
  return {
    consoleErrors: { ...emptyEvidenceSummary },
    ignoredConsoleErrors: { ...emptyEvidenceSummary },
    pageErrors: { ...emptyEvidenceSummary },
    hydrationErrors: { ...emptyEvidenceSummary },
    httpErrors: { ...emptyEvidenceSummary },
    failedRequests: { ...emptyEvidenceSummary },
    ignoredRequestFailures: { ...emptyEvidenceSummary },
  };
}
function routeRow({ locale, viewport, route }) {
  const url = `http://127.0.0.1:4173/${locale}${route.suffix}`;
  const screenshot = locale === "pl";
  return {
    locale,
    route: route.id,
    viewport,
    url,
    finalUrl: url,
    sameOrigin: true,
    status: 200,
    selector: route.selector,
    selectorCount: 1,
    navigationError: null,
    fatalTokenPresent: false,
    consoleErrors: [],
    ignoredConsoleErrors: [],
    pageErrors: [],
    hydrationErrors: [],
    httpErrors: [],
    failedRequests: [],
    ignoredRequestFailures: [],
    evidenceCounts: evidenceCounts(),
    firstPartyFailureCount: 0,
    imageSettle: { candidates: 0, incomplete: 0 },
    brokenImages: [],
    brokenImagesTotal: 0,
    brokenImagesTruncated: false,
    securityHeaders: {
      contentSecurityPolicyPresent: true,
      frameAncestorsDeclared: true,
      contentTypeOptionsNosniff: true,
      referrerPolicyPresent: true,
    },
    interactions: {
      reducedMotion: true,
      keyboardFocus: { escapedBody: true },
      zoom200: { applied: true, bodyVisible: true, fatalTokenPresent: false },
    },
    layout: {
      bodyHeight: 1000,
      horizontalOverflowPx: 0,
      invalidTokens: [],
    },
    screenshotPath: screenshot
      ? `artifacts/pass35/a45/screenshots/pl-${viewport}-${route.id}.png`
      : null,
    screenshotSha256: screenshot ? referencePngSha256 : null,
    ok: true,
  };
}
function buildA45Fixture() {
  const rows = [];
  for (const locale of contract.locales) {
    for (const route of contract.routes) rows.push(routeRow({ locale, viewport: "desktop", route }));
  }
  for (const route of contract.routes) rows.push(routeRow({ locale: "pl", viewport: "mobile", route }));
  const popupPath = "artifacts/pass35/a45/screenshots/pl-desktop-shield-popup-four-tabs.png";
  return {
    schemaVersion: "velmere.pass35.a45.browser-acceptance.v2",
    revisionId: "VELMERE_PASS35_A45_EXACT_RUNTIME_BROWSER_ACCEPTANCE",
    generatedAt: "2026-08-13T12:00:00.000Z",
    baseUrl: "http://127.0.0.1:4173",
    transport: {
      scheme: "http",
      loopbackOnly: true,
      localCertificateTrustBypassed: false,
      productionCertificateVerified: false,
    },
    bindings: {
      sourceManifestSha256: "1".repeat(64),
      runtimeInstanceSha256: "2".repeat(64),
      browserExecutableSha256: "3".repeat(64),
      buildId: "p36-test-build",
    },
    truthBoundary: "Synthetic unit fixture. No runtime credit.",
    summary: { checks: 57, passed: 57, failed: 0 },
    qaFixture: {
      enabled: true,
      generated: true,
      generatorId: qaFixturePolicy.generatorId,
      fixtureRelativePath: qaFixturePolicy.relativePath,
      fixtureSha256: qaFixtureSha256,
      fixtureByteLength: qaFixtureBytes.length,
      truthBoundary: "Deterministic local UI reference fixture only; not current market data.",
      liveProven: false,
      saleEnabled: false,
      providerCredit: false,
      durableStorageCredit: false,
      realDataCredit: false,
      requests: {
        authSession: 1,
        profile: 0,
        markets: 1,
        klines: 0,
        marketIntelligence: 0,
        realMarketsCatalog: 1,
        realMarkets: 1,
        assetLogo: 0,
        brandIcon: 0,
        icon: 0,
      },
    },
    rows,
    popup: {
      id: "shield-popup-four-tabs",
      url: "http://127.0.0.1:4173/pl/market-integrity",
      finalUrl: "http://127.0.0.1:4173/pl/market-integrity",
      tabRows: contract.requiredPopupTabs.map((tabId) => ({ tabId, selected: "true", visible: true })),
      modalBounds: { x: 10, y: 10, width: 1000, height: 700 },
      viewport: { width: 1440, height: 1000 },
      fitsViewport: true,
      consoleErrors: [],
      ignoredConsoleErrors: [],
      pageErrors: [],
      hydrationErrors: [],
      httpErrors: [],
      failedRequests: [],
      ignoredRequestFailures: [],
      evidenceCounts: evidenceCounts(),
      brokenImages: [],
      brokenImagesTotal: 0,
      brokenImagesTruncated: false,
      error: null,
      screenshotPath: popupPath,
      screenshotSha256: referencePngSha256,
      ok: true,
    },
    failures: [],
  };
}

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-p36-browser-profiles-"));
const qaFixturePath = path.join(tempRoot, qaFixturePolicy.relativePath);
fs.mkdirSync(path.dirname(qaFixturePath), { recursive: true });
fs.writeFileSync(qaFixturePath, qaFixtureBytes);
for (const screenshotPath of expectedScreenshotPaths(contract)) {
  const absolute = path.join(tempRoot, screenshotPath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, Buffer.from("physical-file-presence-only", "utf8"));
}
const artifactReader = (relativePath) => {
  const bytes = relativePath === qaFixturePolicy.relativePath ? qaFixtureBytes : referencePng;
  return {
    path: relativePath,
    bytes,
    byteLength: bytes.length,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
  };
};
const matrix = buildCurrentEvidenceAvailabilityMatrix({
  locale: "en",
  evaluatedAt: "2026-08-13T12:00:00.000Z",
});
const a45 = buildA45Fixture();
const baseInput = {
  root: tempRoot,
  a45,
  a45ReceiptBinding: { path: "fixture/a45.json", byteLength: 1, sha256: "4".repeat(64) },
  contract,
  contractBinding: { path: "fixture/a45-contract.json", byteLength: 1, sha256: "5".repeat(64) },
  qaFixturePolicy,
  qaFixturePolicyBinding: { path: "fixture/a45-qa-policy.json", byteLength: 1, sha256: "6".repeat(64) },
  matrix,
  currentEvidenceSourceBinding: shaFile("lib/commerce/vlm-current-commercial-evidence.ts"),
  currentMatrixSourceBinding: shaFile("lib/commerce/vlm-current-evidence-availability-matrix.ts"),
  artifactReader,
};

const first = buildP36BrowserTierRuntimeProfiles(baseInput);
const second = buildP36BrowserTierRuntimeProfiles(baseInput);
check(JSON.stringify(first) === JSON.stringify(second), "same exact inputs must produce byte-identical JSON objects");
check(verifyP36BrowserTierRuntimeProfiles(first), "output integrity must verify");
check(first.integritySha256 === second.integritySha256, "deterministic outputs must have one integrity digest");
check(first.physicalEvidence.a45Passed === 57 && first.physicalEvidence.a45Failed === 0, "full A45 denominator must pass");
check(first.physicalEvidence.fullRouteRows === 56, "full route matrix must contain 56 route rows");
check(first.physicalEvidence.screenshots === 29, "all 29 screenshots must be bound");
check(first.physicalEvidence.browserRouteRows.length === 4, "Browser route must be physical in four locale/viewport rows");
check(first.profiles.length === 3, "Basic, Pro and Advanced profiles must be explicit");
check(first.profiles.map((row) => row.tier).join(",") === "basic,pro,advanced", "tier order must be deterministic");
check(first.profiles.every((row) => row.tierProfileMappedToSharedEvidence === true), "all three tier labels must map to the one shared evidence set");
check(first.profiles.every((row) => row.distinctTierSpecificPhysicalExecution === false), "mapping must not promote distinct tier execution");
check(first.profiles.every((row) => row.sharedSurfaceExecution === 1 && row.sharedBrowserRouteRows === 4), "each mapping must identify the same one surface and four Browser rows");
check(first.profiles.every((row) => !Object.hasOwn(row, "physicalRuntimeRouteExecuted")), "the misleading per-tier physical execution field must be absent");
check(first.profiles.every((row) => row.tierSpecificInteractionExecuted === false), "tier-specific interaction must receive zero credit");
check(first.profiles.every((row) => row.sameInputTierOutputComparisonExecuted === false), "same-input comparison must receive zero credit");
check(first.profiles.every((row) => row.finalTierOutputHoldoutExecuted === false), "final tier output holdout must receive zero credit");
check(first.profiles.every((row) => row.saleEligible === false), "sale must remain fail-closed");
check(first.summary.finalTierOutputHoldoutsExecuted === 0, "summary must retain 0/3 final holdouts");
check(first.summary.tierProfilesMappedToSharedEvidence === 3, "three tier profiles must be mapped to shared evidence");
check(first.summary.sharedSurfaceExecution === 1 && first.summary.sharedBrowserRouteRows === 4, "one shared surface execution must bind four Browser rows");
check(first.summary.distinctTierSpecificPhysicalExecutions === 0 && first.summary.distinctTierSpecificPhysicalExecutionDenominator === 3, "distinct tier-specific execution must remain 0/3");
check(first.summary.realCustomerCredit === 0 && first.summary.externalEvidenceCredit === 0, "real and external credit must remain zero");
check(first.summary.paidReleaseCredit === 0 && first.summary.worldClassCredit === 0, "paid and world-class credit must remain zero");
check(first.physicalEvidence.qaFixture.enabled === true && first.physicalEvidence.qaFixture.generated === true, "the physical QA fixture must be explicitly bound");
check(first.physicalEvidence.qaFixture.fixtureSha256 === qaFixtureSha256 && first.physicalEvidence.qaFixture.fixtureByteLength === qaFixtureBytes.length, "QA fixture bytes and metadata must match A45");
check(Object.keys(first.physicalEvidence.qaFixture.requests).sort().join(",") === [...qaFixturePolicy.requestCounterKeys].sort().join(","), "QA request counter identities must be exact");
check(qaFixturePolicy.requiredPositiveRequestFamilies.every((key) => first.physicalEvidence.qaFixture.requests[key] > 0), "required QA request families must be exercised");
check(qaFixturePolicy.requiredZeroRequestFamilies.every((key) => first.physicalEvidence.qaFixture.requests[key] === 0), "required-zero QA request families must remain zero");
check(["providerCredit", "realDataCredit", "customerCredit", "paidReleaseCredit"].every((key) => first.physicalEvidence.qaFixture[key] === 0), "fixture provider, real, customer and paid credit must remain zero");
check(first.bindings.currentEligibilityMatrixCanonicalSha256 === canonicalSha256(matrix), "output must bind the current matrix");
check(first.bindings.declaredBuildBindings.complete === true, "complete declared A45 bindings must be recorded without independent proof credit");

function expectMutation(name, mutate) {
  mutations += 1;
  const mutatedA45 = clone(a45);
  const mutatedMatrix = clone(matrix);
  const mutatedInput = { ...baseInput, a45: mutatedA45, matrix: mutatedMatrix };
  mutate(mutatedInput);
  assert.throws(
    () => buildP36BrowserTierRuntimeProfiles(mutatedInput),
    /p36_browser_tier_profiles:/u,
    name,
  );
}

expectMutation("summary promotion", ({ a45: value }) => { value.summary.passed = 56; value.summary.failed = 1; });
expectMutation("route removal", ({ a45: value }) => { value.rows.pop(); });
expectMutation("route duplicate", ({ a45: value }) => { value.rows.push(clone(value.rows[0])); value.summary.checks = 58; value.summary.passed = 58; });
expectMutation("row false promotion", ({ a45: value }) => { value.rows[0].ok = false; });
expectMutation("row content tamper behind true flag", ({ a45: value }) => { value.rows[0].interactions.keyboardFocus.escapedBody = false; });
expectMutation("screenshot digest tamper", ({ a45: value }) => { value.rows.find((row) => row.screenshotPath).screenshotSha256 = "f".repeat(64); });
expectMutation("popup tab removal", ({ a45: value }) => { value.popup.tabRows.pop(); });
expectMutation("non-loopback receipt", ({ a45: value }) => { value.baseUrl = "https://example.com"; });
expectMutation("transport production promotion", ({ a45: value }) => { value.transport.productionCertificateVerified = true; });
expectMutation("QA fixture generator tamper", ({ a45: value }) => { value.qaFixture.generatorId = "tampered-generator"; });
expectMutation("QA fixture counter removal", ({ a45: value }) => { delete value.qaFixture.requests.authSession; });
expectMutation("QA fixture required positive missing", ({ a45: value }) => { value.qaFixture.requests.realMarkets = 0; });
expectMutation("QA fixture required zero promoted", ({ a45: value }) => { value.qaFixture.requests.profile = 1; });
expectMutation("sale profile promotion", ({ matrix: value }) => { value.profiles.find((row) => row.profileId === "browser:basic" || row.profileId === "browser@BASIC_CONTEXT").receipt.saleEligible = true; value.saleEligibleProfileCount = 1; });
expectMutation("authority sale promotion", ({ matrix: value }) => { value.evidenceAuthority.saleEnabled = true; });
expectMutation("public disposition divergence", ({ matrix: value }) => { value.profiles.find((row) => row.profileId === "browser:pro" || row.profileId === "browser@PRO_CONTEXT").publicProjection.availabilityState = "AVAILABLE"; });

const tamperedOutput = clone(first);
tamperedOutput.summary.finalTierOutputHoldoutsExecuted = 3;
check(!verifyP36BrowserTierRuntimeProfiles(tamperedOutput), "integrity must reject false final-holdout promotion");

const missingA45Root = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-p36-browser-a45-missing-"));
assertions += 1;
assert.throws(
  () => runP36BrowserTierRuntimeProfiles({ root: missingA45Root }),
  undefined,
  "the executable builder must fail closed when the physical A45 receipt is absent",
);
fs.rmSync(missingA45Root, { recursive: true, force: true });

fs.rmSync(tempRoot, { recursive: true, force: true });
console.log(JSON.stringify({
  status: "PASS_P36_BROWSER_TIER_RUNTIME_PROFILES_CONTRACT",
  assertions,
  mutationsDetected: `${mutations}/${mutations}`,
  tierProfilesMappedToSharedEvidence: "3/3",
  sharedSurfaceExecution: 1,
  sharedBrowserRouteRows: 4,
  distinctTierSpecificPhysicalExecutions: "0/3",
  finalTierOutputHoldouts: "0/3",
  realExternalCustomerPaidCredit: 0,
}));
