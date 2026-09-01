import assert from "node:assert/strict";

import {
  REAL_MARKETS_CURRENT_ASSET_CLASSES,
  REAL_MARKETS_CURRENT_FIELD_AUTHORITY_ID,
  REAL_MARKETS_CURRENT_TIERS,
  buildRealMarketsCurrentFieldAuthoritySnapshot,
  evaluateRealMarketsCurrentFieldSet,
  type RealMarketsCurrentProductId,
} from "../../lib/market-integrity/real-markets-current-field-authority";
import {
  PASS69_ECB_REFERENCE_DATA_URL,
  PASS69_ECB_REQUIRED_ATTRIBUTION,
  PASS69_ECB_REUSE_POLICY_REVIEWED_AT,
  PASS69_ECB_REUSE_POLICY_URL,
  PASS69_ECB_REUSE_POLICY_VALID_UNTIL,
  loadPass69EcbOfficialFxReferenceEnvelope,
} from "../../lib/market-integrity/real-markets-quote-hydration";
import {
  brokeredEgressFetch,
  fetchPass69EcbOfficialReferenceData,
  withPass4825BrokeredEgressTestTransport,
} from "../../lib/network/brokered-egress";
import { R7_ECB_POLICY_REVIEW_SHA256 } from "../../lib/compliance/ecb-statistics-policy-receipt";

const snapshot = buildRealMarketsCurrentFieldAuthoritySnapshot();
assert.equal(snapshot.schemaVersion, REAL_MARKETS_CURRENT_FIELD_AUTHORITY_ID);
assert.equal(snapshot.catalogAssetDenominator, 555);
assert.equal(snapshot.catalogUniqueSymbolDenominator, 555);
assert.equal(snapshot.supportedAssetClasses.length, 6);
assert.equal(snapshot.tiers.length, 3);
assert.equal(snapshot.ruleRowCount, snapshot.ruleRows.length);
assert.ok(snapshot.ruleRowCount > 100);
assert.ok(snapshot.criticalRuleRowCount > 0);
assert.ok(snapshot.optionalRuleRowCount > 0);
assert.ok(snapshot.notApplicableRuleRowCount > 0);
assert.match(snapshot.authorityDigest, /^sha256:[a-f0-9]{64}$/u);
assert.equal(snapshot.customerFinalCredit, false);
assert.deepEqual(
  snapshot.currentExecutionBaseline.map((row) => ({
    tier: row.tier,
    critical: row.criticalFieldCellDenominator,
    available: row.availableCriticalFieldCellNumerator,
    completenessBps: row.completenessBps,
    providerRequired: row.providerRequiredAssetCount,
    paidBlocked: row.providerRequiredPaidBlockedCount,
  })),
  [
    { tier: "basic", critical: 6253, available: 0, completenessBps: 0, providerRequired: 482, paidBlocked: 0 },
    { tier: "pro", critical: 8313, available: 0, completenessBps: 0, providerRequired: 482, paidBlocked: 482 },
    { tier: "advanced", critical: 11485, available: 0, completenessBps: 0, providerRequired: 482, paidBlocked: 482 },
  ],
);
assert.equal(
  new Set(snapshot.ruleRows.map((row) => `${row.assetClass}:${row.tier}:${row.fieldId}`)).size,
  snapshot.ruleRowCount,
);

const productForTier: Readonly<Record<(typeof REAL_MARKETS_CURRENT_TIERS)[number], RealMarketsCurrentProductId>> = {
  basic: "real-markets-basic",
  pro: "real-markets-pro",
  advanced: "real-markets-advanced",
};

for (const assetClass of REAL_MARKETS_CURRENT_ASSET_CLASSES) {
  for (const tier of REAL_MARKETS_CURRENT_TIERS) {
    const rules = snapshot.ruleRows.filter((row) => row.assetClass === assetClass && row.tier === tier);
    const observations = rules
      .filter((row) => row.requirement !== "not_applicable")
      .map((row) => ({
        fieldId: row.fieldId,
        state: "READY" as const,
        rightsState: "GREEN_EXACT" as const,
      }));
    const ready = evaluateRealMarketsCurrentFieldSet({
      productId: productForTier[tier],
      assetClass,
      observations,
    });
    assert.equal(ready.state, "READY", `${assetClass}:${tier}`);
    assert.equal(ready.readyCriticalFieldNumerator, ready.criticalFieldDenominator);
    assert.equal(ready.readyOptionalFieldNumerator, ready.optionalFieldDenominator);
    assert.equal(ready.customerFinalCredit, false);
    assert.equal(ready.paidDeliveryEligible, tier !== "basic");

    const firstCritical = rules.find((row) => row.requirement === "critical");
    assert.ok(firstCritical, `${assetClass}:${tier}:critical`);
    const withoutCritical = observations.filter((row) => row.fieldId !== firstCritical.fieldId);
    const blocked = evaluateRealMarketsCurrentFieldSet({
      productId: productForTier[tier],
      assetClass,
      observations: withoutCritical,
    });
    assert.equal(blocked.state, "WITHHELD");
    assert.ok(blocked.blockedCriticalFieldIds.includes(firstCritical.fieldId));
    assert.ok(blocked.missingObservationFieldIds.includes(firstCritical.fieldId));
    assert.equal(blocked.paidDeliveryEligible, false);

    const rightsBlocked = evaluateRealMarketsCurrentFieldSet({
      productId: productForTier[tier],
      assetClass,
      observations: observations.map((row, index) => index === 0
        ? { ...row, rightsState: "GRAY_UNKNOWN" as const }
        : row),
    });
    assert.equal(rightsBlocked.state, "WITHHELD");
    assert.equal(rightsBlocked.paidDeliveryEligible, false);

    const duplicate = evaluateRealMarketsCurrentFieldSet({
      productId: productForTier[tier],
      assetClass,
      observations: [...observations, observations[0]],
    });
    assert.equal(duplicate.state, "WITHHELD");
    assert.deepEqual(duplicate.duplicateObservationFieldIds, [observations[0].fieldId]);

    const unknown = evaluateRealMarketsCurrentFieldSet({
      productId: productForTier[tier],
      assetClass,
      observations: [...observations, {
        fieldId: "attacker.optionalized_field",
        state: "READY" as const,
        rightsState: "GREEN_EXACT" as const,
      }],
    });
    assert.equal(unknown.state, "WITHHELD");
    assert.deepEqual(unknown.unknownObservationFieldIds, ["attacker.optionalized_field"]);
  }
}

const conditional = snapshot.ruleRows
  .filter((row) => row.assetClass === "equity" && row.tier === "advanced" && row.requirement !== "not_applicable")
  .map((row) => ({ fieldId: row.fieldId, state: "READY" as const, rightsState: "GREEN_CONDITIONAL" as const }));
const conditionalBlocked = evaluateRealMarketsCurrentFieldSet({
  productId: "real-markets-advanced",
  assetClass: "equity",
  observations: conditional,
});
assert.equal(conditionalBlocked.state, "WITHHELD");
const conditionalReady = evaluateRealMarketsCurrentFieldSet({
  productId: "real-markets-advanced",
  assetClass: "equity",
  observations: conditional.map((row) => ({ ...row, conditionalRightsSatisfied: true })),
});
assert.equal(conditionalReady.state, "READY");

const ecbHeader = "KEY,FREQ,CURRENCY,CURRENCY_DENOM,EXR_TYPE,EXR_SUFFIX,TIME_PERIOD,OBS_VALUE";
const ecbValidRow = "EXR.D.USD.EUR.SP00.A,D,USD,EUR,SP00,A,2026-08-22,1.1734";
const ecbValidCsv = `${ecbHeader}\n${ecbValidRow}`;
const ecbRightsManifest = {
  sourceDataUrl: PASS69_ECB_REFERENCE_DATA_URL,
  usagePolicyUrl: PASS69_ECB_REUSE_POLICY_URL,
  usagePolicyReviewedAt: PASS69_ECB_REUSE_POLICY_REVIEWED_AT,
  usagePolicyValidUntil: PASS69_ECB_REUSE_POLICY_VALID_UNTIL,
  rightsReceiptSha256: R7_ECB_POLICY_REVIEW_SHA256,
  attribution: PASS69_ECB_REQUIRED_ATTRIBUTION,
  allowedFieldIds: ["market.reference_rate", "market.reference_date"],
} as const;
const ecbNow = new Date("2026-08-24T18:00:00.000Z");
const hasEgressCode = (expected: string) => (error: unknown) =>
  Boolean(error && typeof error === "object" && "code" in error && (error as { code: unknown }).code === expected);

let deniedEcbNetworkCalls = 0;
await withPass4825BrokeredEgressTestTransport(async () => {
  deniedEcbNetworkCalls += 1;
  return new Response(ecbValidCsv, { status: 200, headers: { "content-type": "text/csv" } });
}, async () => {
  await assert.rejects(
    () => brokeredEgressFetch(PASS69_ECB_REFERENCE_DATA_URL, {
      method: "GET",
      headers: {
        accept: "text/csv,application/vnd.sdmx.data+csv",
        "user-agent": "Velmere-ECB-Reference/1.0",
      },
      cache: "no-store",
      redirect: "error",
    }, {
      profile: "ecb_statistics",
      operation: "pass69_ecb_reference_fx",
      timeoutMs: 8_000,
      maxRedirects: 0,
      maxRequestBytes: 0,
      maxResponseBytes: 1_000_000,
    }),
    hasEgressCode("provider_rights_capability_required"),
  );
  await assert.rejects(
    () => fetchPass69EcbOfficialReferenceData({ ...ecbRightsManifest, allowedFieldIds: ["market.reference_rate"] }),
    hasEgressCode("provider_rights_not_verified"),
  );
  await assert.rejects(
    () => fetchPass69EcbOfficialReferenceData({ ...ecbRightsManifest, rightsReceiptSha256: "0".repeat(64) }),
    hasEgressCode("provider_rights_not_verified"),
  );
});
assert.equal(deniedEcbNetworkCalls, 0, "forged or scope-widened ECB calls must fail before transport");

let validEcbNetworkCalls = 0;
const validEcbEnvelope = await withPass4825BrokeredEgressTestTransport(async (url, init, context) => {
  validEcbNetworkCalls += 1;
  assert.equal(url.toString(), PASS69_ECB_REFERENCE_DATA_URL);
  assert.equal((init.method ?? "GET").toUpperCase(), "GET");
  assert.equal(init.cache, "no-store");
  assert.equal(init.redirect, "error");
  assert.equal(context.operation, "pass4825-brokered-egress-v1:ecb_statistics:pass69_ecb_reference_fx");
  return new Response(ecbValidCsv, { status: 200, headers: { "content-type": "text/csv" } });
}, () => loadPass69EcbOfficialFxReferenceEnvelope(["EURUSD=X"], { now: ecbNow }));
assert.equal(validEcbNetworkCalls, 1);
assert.equal(validEcbEnvelope.state, "available");
assert.equal(validEcbEnvelope.references.length, 1);
assert.equal(validEcbEnvelope.references[0]?.pair, "EUR/USD");
assert.equal(validEcbEnvelope.references[0]?.referenceRate, 1.1734);
assert.equal(validEcbEnvelope.references[0]?.derivedRate, false);
assert.equal(validEcbEnvelope.references[0]?.marketPriceFieldEligible, false);

const invalidEcbCsvCases = [
  ["wrong_key", `${ecbHeader}\nEXR.D.PLN.EUR.SP00.A,D,USD,EUR,SP00,A,2026-08-22,1.1734`, "ecb_csv_foreign_or_mismatched_series"],
  ["wrong_frequency", `${ecbHeader}\nEXR.D.USD.EUR.SP00.A,M,USD,EUR,SP00,A,2026-08-22,1.1734`, "ecb_csv_foreign_or_mismatched_series"],
  ["wrong_denominator", `${ecbHeader}\nEXR.D.USD.EUR.SP00.A,D,USD,USD,SP00,A,2026-08-22,1.1734`, "ecb_csv_foreign_or_mismatched_series"],
  ["wrong_type", `${ecbHeader}\nEXR.D.USD.EUR.SP00.A,D,USD,EUR,SP01,A,2026-08-22,1.1734`, "ecb_csv_foreign_or_mismatched_series"],
  ["wrong_suffix", `${ecbHeader}\nEXR.D.USD.EUR.SP00.A,D,USD,EUR,SP00,X,2026-08-22,1.1734`, "ecb_csv_foreign_or_mismatched_series"],
  ["foreign_currency", `${ecbHeader}\nEXR.D.JPY.EUR.SP00.A,D,JPY,EUR,SP00,A,2026-08-22,171.90`, "ecb_csv_foreign_or_mismatched_series"],
  ["duplicate_observation", `${ecbHeader}\n${ecbValidRow}\n${ecbValidRow}`, "ecb_csv_duplicate_observation"],
  ["duplicate_key_header", `KEY,KEY,FREQ,CURRENCY,CURRENCY_DENOM,EXR_TYPE,EXR_SUFFIX,TIME_PERIOD,OBS_VALUE\nEXR.D.USD.EUR.SP00.A,EXR.D.USD.EUR.SP00.A,D,USD,EUR,SP00,A,2026-08-22,1.1734`, "ecb_csv_required_header_contract_mismatch"],
  ["future_observation", `${ecbHeader}\nEXR.D.USD.EUR.SP00.A,D,USD,EUR,SP00,A,2026-08-25,1.1734`, "ecb_future_observation_rejected"],
] as const;
for (const [caseId, csv, expectedBlocker] of invalidEcbCsvCases) {
  let calls = 0;
  const envelope = await withPass4825BrokeredEgressTestTransport(async () => {
    calls += 1;
    return new Response(csv, { status: 200, headers: { "content-type": "text/csv" } });
  }, () => loadPass69EcbOfficialFxReferenceEnvelope(["EURUSD=X"], { now: ecbNow }));
  assert.equal(calls, 1, caseId);
  assert.equal(envelope.state, "temporarily_unavailable", caseId);
  assert.equal(envelope.references.length, 0, caseId);
  assert.equal(envelope.blocker, expectedBlocker, caseId);
}

let retryEcbNetworkCalls = 0;
const retryEnvelope = await withPass4825BrokeredEgressTestTransport(async () => {
  retryEcbNetworkCalls += 1;
  if (retryEcbNetworkCalls === 1) return new Response("rate limited", { status: 429 });
  return new Response(ecbValidCsv, { status: 200, headers: { "content-type": "application/vnd.sdmx.data+csv" } });
}, () => loadPass69EcbOfficialFxReferenceEnvelope(["EURUSD=X"], { now: ecbNow }));
assert.equal(retryEcbNetworkCalls, 2, "retry must pass through a fresh one-shot rights capability");
assert.equal(retryEnvelope.state, "available");
assert.equal(retryEnvelope.references[0]?.derivedRate, false);

process.stdout.write(`${JSON.stringify({
  schemaVersion: "velmere.current-execution.real-markets-current-field-authority-runtime.v1",
  status: "PASS",
  catalogAssetDenominator: snapshot.catalogAssetDenominator,
  assetClasses: snapshot.supportedAssetClasses.length,
  tiers: snapshot.tiers.length,
  ruleRows: snapshot.ruleRowCount,
  criticalRuleRows: snapshot.criticalRuleRowCount,
  optionalRuleRows: snapshot.optionalRuleRowCount,
  notApplicableRuleRows: snapshot.notApplicableRuleRowCount,
  authorityDigest: snapshot.authorityDigest,
  currentExecutionBaseline: snapshot.currentExecutionBaseline,
  customerFinalCredit: false,
})}\n`);
