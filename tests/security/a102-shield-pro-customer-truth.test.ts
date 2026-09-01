import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  shieldProAggregateMetricsAvailable,
  shieldProCalibratedRiskConfidencePublishable,
  shieldProFieldVerified,
  shieldProModalMarketDataState,
  shieldProModeAfterRefreshFailure,
  shieldProPrimaryMarketSourceAsOf,
  shieldProRiskVerified,
  shieldProSourceLabel,
  shieldProVerifiedProviders,
} from "../../lib/market-integrity/shield-pro-customer-truth.js";

const verified = {
  observedAt: "2026-08-11T12:00:00.000Z",
  result: { dataQuality: "live" as const, dataSources: ["legacy-risk-source"] },
  delivery: {
    state: "verified",
    verifiedProviderIds: ["provider-a", "provider-a", "provider-b"],
    sourceReceiptCount: 4,
    risk: { state: "verified" },
    fields: {
      "market.price": { state: "verified", sourceAsOf: "2026-08-11T12:01:00.000Z" },
      "market.observed_at": { state: "verified", sourceAsOf: "2026-08-11T12:00:30.000Z" },
      "market.change_24h": { state: "verified" },
    },
  },
};

assert.equal(shieldProFieldVerified(verified, "market.price"), true);
assert.equal(shieldProRiskVerified(verified), true);
assert.equal(shieldProCalibratedRiskConfidencePublishable(verified), false, "verified transport is not confidence calibration");
assert.deepEqual(shieldProVerifiedProviders(verified), ["provider-a", "provider-b"]);
assert.equal(shieldProSourceLabel(verified, "feed-level"), "provider-a · provider-b");
assert.equal(shieldProPrimaryMarketSourceAsOf(verified), "2026-08-11T12:01:00.000Z");
assert.equal(shieldProModalMarketDataState(verified, "live"), "live_verified");
assert.equal(shieldProModalMarketDataState(verified, "stale"), "last_known_good");
assert.equal(shieldProModalMarketDataState(verified, "partial"), "partial_not_live");
assert.equal(shieldProModalMarketDataState(verified, "reference"), "local_reference");

const calibratedRisk = {
  ...verified,
  result: {
    ...verified.result,
    customerTruth: { confidenceClass: "EVIDENCE_BOUND" as const },
  },
};
assert.equal(shieldProCalibratedRiskConfidencePublishable(calibratedRisk), true);
const limitedButUncalibrated = {
  ...verified,
  result: {
    ...verified.result,
    customerTruth: { confidenceClass: "LIMITED_EVIDENCE" as const },
  },
};
assert.equal(shieldProCalibratedRiskConfidencePublishable(limitedButUncalibrated), false, "LIMITED_EVIDENCE is not calibration");
const explicitlyNotCalibrated = {
  ...verified,
  result: {
    ...verified.result,
    customerTruth: { confidenceClass: "NOT_CALIBRATED" as const },
  },
};
assert.equal(shieldProCalibratedRiskConfidencePublishable(explicitlyNotCalibrated), false);

const weakLive = {
  result: { dataQuality: "live" as const, dataSources: ["risk-source"] },
  delivery: { state: "withheld", risk: { state: "withheld" }, fields: {} },
};
assert.equal(shieldProModalMarketDataState(weakLive, "live"), "partial_not_live", "dataQuality=live cannot mint live_verified");
assert.equal(shieldProRiskVerified(weakLive), false);
assert.deepEqual(shieldProVerifiedProviders(weakLive), []);
assert.equal(shieldProSourceLabel(weakLive, "feed disclosure"), "feed disclosure");
assert.equal(shieldProSourceLabel(weakLive, "—"), "Source unavailable");
assert.equal(shieldProPrimaryMarketSourceAsOf(weakLive), null);

const demo = {
  result: { dataQuality: "demo" as const },
  delivery: {
    state: "verified",
    risk: { state: "verified" },
    fields: { "market.price": { state: "verified" }, "market.observed_at": { state: "verified" } },
  },
};
assert.equal(shieldProModalMarketDataState(demo, "live"), "local_reference");

assert.equal(shieldProModeAfterRefreshFailure("live"), "stale", "verified live may degrade to stale on refresh failure");
assert.equal(shieldProModeAfterRefreshFailure("stale"), "stale");
assert.equal(shieldProModeAfterRefreshFailure("partial"), "partial", "partial must not be promoted to last-known-good");
assert.equal(shieldProModeAfterRefreshFailure("reference"), "reference");
assert.equal(shieldProAggregateMetricsAvailable("live"), true);
assert.equal(shieldProAggregateMetricsAvailable("stale"), true);
assert.equal(shieldProAggregateMetricsAvailable("partial"), false, "partial catalog cannot claim full aggregate denominator");

const componentPath = path.join(process.cwd(), "components/market-integrity/ShieldProCleanTerminalClient.tsx");
const component = fs.readFileSync(componentPath, "utf8");
assert.equal(component.includes('feedSource || "Disclosed market source"'), false, "invented source fallback returned");
assert.equal(component.includes('row.result?.dataQuality === "live" ? "live_verified"'), false, "weak dataQuality-only live claim returned");
assert.equal(component.includes("shieldProModalMarketDataState(row, feedMode)"), true, "modal does not bind state to feed+delivery truth");
assert.equal(component.includes("shieldProRiskVerified(row)"), true, "risk is not receipt-gated");
assert.equal(component.includes("shieldProCalibratedRiskConfidence(row)"), true, "Shield Pro still bypasses the full calibrated Risk confidence boundary");
assert.equal(component.includes("sourceVerified: sources.length > 0"), true, "Shield Pro analysis source credit is not bound to verified provider identities");
assert.equal(component.includes("mode={mode}"), true, "active modal does not receive live/stale/partial state");
assert.equal(component.includes("shieldProModeAfterRefreshFailure(current)"), true, "Shield Pro refresh failure does not preserve/degrade prior quality monotonically");
assert.equal(component.includes("aggregateMetricsAvailable"), true, "Shield Pro aggregate metrics are not gated by catalog completeness state");
const shield = fs.readFileSync(path.join(process.cwd(), "components/market-integrity/ShieldRealMarketsParityClient.tsx"), "utf8");
assert.equal(shield.includes('row.result?.dataQuality === "live" ? "live_verified"'), false, "Shield modal still mints live_verified from dataQuality alone");
assert.equal(shield.includes("shieldProModeAfterRefreshFailure(current)"), true, "Shield refresh failure can promote partial data");
assert.equal(shield.includes("!shieldProAggregateMetricsAvailable(feedMode)"), true, "Shield aggregates can still use incomplete partial catalog");
assert.equal(shield.includes("rowToModalData(selected, safeLocale, feedMode, sourceLabel)"), true, "Shield modal is not bound to current feed state");
assert.equal(shield.includes("shieldProCalibratedRiskConfidencePublishable(row)"), true, "Shield still exposes uncalibrated Risk confidence");
assert.equal(shield.includes("sourceVerified: verifiedSources.length > 0"), true, "Shield analysis source credit is not bound to verified provider identities");

console.log("A102 Shield Pro customer truth / delivery-receipt binding regression: PASS");
