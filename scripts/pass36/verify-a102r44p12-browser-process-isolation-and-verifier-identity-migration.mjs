#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateBrowserReceipt } from "./a79-exact-build-browser-lib.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const migration = JSON.parse(fs.readFileSync(path.join(root, "config/pass36/a102r44p12-browser-process-isolation-and-verifier-identity-migration.json"), "utf8"));
const identities = JSON.parse(fs.readFileSync(path.join(root, "config/pass36/a102r44p12-browser-verifier-check-identities.json"), "utf8"));
const policy = JSON.parse(fs.readFileSync(path.join(root, "config/pass36/a60-exact-final-byte-build-browser-acceptance.json"), "utf8"));
const contract = JSON.parse(fs.readFileSync(path.join(root, "config/pass35/a45-exact-runtime-browser-acceptance.json"), "utf8"));
const harness = fs.readFileSync(path.join(root, "scripts/a45-browser-acceptance.mjs"), "utf8");
const a60Test = fs.readFileSync(path.join(root, "scripts/pass36/test-a60-exact-final-byte-build-browser-acceptance.mjs"), "utf8");
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const checks = [];
const check = (id, ok, detail = null) => checks.push({ id, ok: Boolean(ok), detail });

const dummyReceipt = { schemaVersion: "velmere.pass35.a45.browser-acceptance.v2", baseUrl: "http://127.0.0.1:4176", bindings: {}, qaFixture: {}, summary: {}, rows: [], popup: null, failures: [] };
const expected = {
  baseUrl: "http://127.0.0.1:4176",
  sourceManifestSha256: "a".repeat(64), runtimeInstanceSha256: "b".repeat(64), browserExecutableSha256: "c".repeat(64), buildId: "r44p12-dummy",
  requireHttpErrors: true, qaFixtureRequired: true,
  qaFixtureRelativePath: policy.browser.qaFixture.relativePath,
  qaFixtureGeneratorId: policy.browser.qaFixture.generatorId,
  qaFixtureRequestCounterKeys: policy.browser.qaFixture.requestCounterKeys,
  qaFixtureRequiredPositiveRequestFamilies: policy.browser.qaFixture.requiredPositiveRequestFamilies,
};
const validation = validateBrowserReceipt({ root, receipt: dummyReceipt, contract, expected });
const physicalIds = validation.checks.map((row) => row.id);
const physicalHash = sha256(physicalIds.join("\n"));
const frozenHash = sha256(identities.ids.join("\n"));

check("schema", migration.schemaVersion === "velmere.pass36.a102r44p12.browser-process-isolation-and-verifier-identity-migration.v1");
check("revision", migration.revisionId === identities.revisionId);
check("scenario-denominator-stable", migration.browserScenarioDenominator.routeRowsBefore === 56 && migration.browserScenarioDenominator.routeRowsAfter === 56 && migration.browserScenarioDenominator.scenarioChecksBefore === 57 && migration.browserScenarioDenominator.scenarioChecksAfter === 57 && migration.browserScenarioDenominator.screenshotsBefore === 29 && migration.browserScenarioDenominator.screenshotsAfter === 29 && migration.browserScenarioDenominator.popupTabsBefore === 4 && migration.browserScenarioDenominator.popupTabsAfter === 4 && migration.browserScenarioDenominator.removed === 0);
check("process-isolation-contract", migration.browserProcessIsolation.before === "SINGLE_LONG_LIVED_BROWSER_PROCESS" && migration.browserProcessIsolation.after === "SIX_ROUTE_BROWSER_PROCESS_BATCH" && migration.browserProcessIsolation.batchSize === 6 && migration.browserProcessIsolation.routeBatches === 10 && migration.browserProcessIsolation.popupBrowserLaunches === 1 && migration.browserProcessIsolation.expectedTotalBrowserLaunches === 11 && migration.browserProcessIsolation.routeOrAssertionDenominatorChanged === false);
check("verifier-denominator-stable", migration.browserVerifierIdentity.denominatorBefore === 584 && migration.browserVerifierIdentity.denominatorAfter === 584 && migration.browserVerifierIdentity.retainedCurrentVerifierChecks === 584 && migration.browserVerifierIdentity.added === 0 && migration.browserVerifierIdentity.removed === 0);
check("stale-identity-recorded", migration.browserVerifierIdentity.staleDeclaredIdentitySha256 === "21ae399b4bc46252ed02f29946019e2e97544ac0afb2bd9d5c48ca0412702ea3" && migration.browserVerifierIdentity.staleParentDeclarationSupportedByCurrentVerifierSource === false);
check("physical-identity-recorded", migration.browserVerifierIdentity.physicalCurrentVerifierIdentitySha256 === "35cccfef96eece4751495d9f87f9f6cc8a63d3a4df380005ad7769ffa2ddc882");
check("identity-document-schema", identities.schemaVersion === "velmere.pass36.a102r44p12.browser-verifier-check-identities.v1");
check("identity-denominator", identities.denominator === 584 && identities.ids.length === 584);
check("identity-unique", new Set(identities.ids).size === 584);
check("identity-frozen-hash", frozenHash === identities.checkIdentitySha256 && frozenHash === migration.browserVerifierIdentity.physicalCurrentVerifierIdentitySha256);
check("physical-verifier-denominator", physicalIds.length === 584);
check("physical-verifier-identity-exact", JSON.stringify(physicalIds) === JSON.stringify(identities.ids), { physicalHash, frozenHash });
check("physical-verifier-hash-exact", physicalHash === identities.checkIdentitySha256);
check("policy-denominator", policy.evidencePackage.browserVerifierChecksRequired === 584);
check("policy-identity", policy.evidencePackage.browserVerifierCheckIdentitySha256 === identities.checkIdentitySha256);
check("policy-process-isolation", policy.browser.processIsolation.mode === "SIX_ROUTE_BROWSER_PROCESS_BATCH" && policy.browser.processIsolation.batchSize === 6 && policy.browser.processIsolation.expectedRouteBatches === 10 && policy.browser.processIsolation.expectedPopupLaunches === 1 && policy.browser.processIsolation.expectedBrowserLaunches === 11 && policy.browser.processIsolation.routeRowDenominator === 56 && policy.browser.processIsolation.scenarioDenominator === 57 && policy.browser.processIsolation.screenshotDenominator === 29 && policy.browser.processIsolation.denominatorStable === true && policy.browser.processIsolation.scoreCredit === false);
check("harness-batch-size", harness.includes("const batchSize = 6;") && harness.includes("tasks.slice(start, start + batchSize)"));
check("harness-bounded-launcher", harness.includes("async function launchBrowser()") && harness.includes("browserLaunches += 1") && harness.includes("await browser.close().catch(() => {})"));
check("harness-popup-isolated", harness.includes("const popupBrowser = await launchBrowser()") && harness.includes("await popupBrowser.close().catch(() => {})"));
check("harness-receipt-isolation", harness.includes('executionIsolation: { mode: "SIX_ROUTE_BROWSER_PROCESS_BATCH", batchSize, browserLaunches }'));
check("harness-no-denominator-change", harness.includes("summary: { checks: rows.length + 1") && harness.includes("for (const locale of contract.locales) for (const route of contract.routes)") && harness.includes("for (const route of contract.routes) tasks.push"));
check("a60-test-bound", a60Test.includes(identities.checkIdentitySha256) && a60Test.includes('processIsolation?.mode === "SIX_ROUTE_BROWSER_PROCESS_BATCH"') && a60Test.includes("expectedBrowserLaunches === 11"));
check("diagnostic-parent-only", migration.diagnosticExactLinuxRetest.routeRowsPassed === 56 && migration.diagnosticExactLinuxRetest.scenarioChecksPassed === 57 && migration.diagnosticExactLinuxRetest.screenshotsProduced === 29 && migration.diagnosticExactLinuxRetest.verifierChecksPassed === 584 && migration.diagnosticExactLinuxRetest.finalByteCredit === false);
check("no-test-removal", migration.testsDeleted === 0 && migration.skipsAdded === 0 && migration.timeoutsIncreased === 0 && migration.denominatorsReduced === 0);
check("truth-boundary", migration.exactWindowsCredit === false && migration.stagingCredit === false && migration.liveCredit === false && migration.saleCredit === false && migration.globalDecision === "NO_GO");

const removed = identities.ids.slice(0, -1);
const duplicated = [...identities.ids.slice(0, -1), identities.ids[0]];
const reordered = [...identities.ids]; [reordered[0], reordered[1]] = [reordered[1], reordered[0]];
const mutated = [...identities.ids]; mutated[123] = `${mutated[123]}:tampered`;
check("negative-remove-detected", removed.length === 583 && sha256(removed.join("\n")) !== identities.checkIdentitySha256);
check("negative-duplicate-detected", duplicated.length === 584 && new Set(duplicated).size === 583 && sha256(duplicated.join("\n")) !== identities.checkIdentitySha256);
check("negative-reorder-detected", reordered.length === 584 && sha256(reordered.join("\n")) !== identities.checkIdentitySha256);
check("negative-mutation-detected", mutated.length === 584 && sha256(mutated.join("\n")) !== identities.checkIdentitySha256);
check("negative-stale-declaration-detected", migration.browserVerifierIdentity.staleDeclaredIdentitySha256 !== identities.checkIdentitySha256);

const failed = checks.filter((row) => !row.ok);
const result = {
  schemaVersion: "velmere.pass36.a102r44p12.browser-process-isolation-and-verifier-identity-migration-verification.v1",
  status: failed.length ? "FAIL_R44P12_BROWSER_PROCESS_ISOLATION_MIGRATION" : "PASS_R44P12_BROWSER_PROCESS_ISOLATION_MIGRATION_NO_LIVE_CREDIT",
  revisionId: migration.revisionId,
  checks: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  verifierDenominatorBefore: migration.browserVerifierIdentity.denominatorBefore,
  verifierDenominatorAfter: migration.browserVerifierIdentity.denominatorAfter,
  staleIdentitySha256: migration.browserVerifierIdentity.staleDeclaredIdentitySha256,
  physicalIdentitySha256: physicalHash,
  browserProcessIsolation: migration.browserProcessIsolation,
  checksDetail: checks,
  globalDecision: "NO_GO", exactWindowsCredit: false, stagingCredit: false, liveCredit: false, saleEnabled: false,
};
console.log(JSON.stringify(result, null, 2));
if (failed.length) process.exit(1);
