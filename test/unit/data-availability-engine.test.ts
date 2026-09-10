import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  evaluateDataAvailability,
  classifyAvailabilityStatus,
} from "@/lib/data-integrity/data-availability-engine";

describe("Data Availability Engine (DAS)", () => {
  it("evaluates a fully populated asset to FULL_DATA_COVERAGE (>= 85%)", () => {
    const result = evaluateDataAvailability({
      hasBytecode: true,
      hasSourceCode: true,
      hasVerifiedAbi: true,
      hasImplementationSource: true,
      hasStaticAnalysis: true,
      hasCfgGraph: true,
      hasTaintAnalysis: true,
      hasFormalInvariants: true,
      hasPrice: true,
      has24hVolume: true,
      hasMarketCap: true,
      verifiedProviderCount: 3,
      candleCount: 100,
      hasContinuousTimeline: true,
      hasNoSyntheticGaps: true,
      hasOrderbookBidsAsks: true,
      hasDexPoolReserves: true,
      hasSlippageBounds: true,
      hasTop10Holders: true,
      hasConcentrationMetrics: true,
      hasLpTokenLockProof: true,
      historicalSnapshotCount: 45,
      has30dRiskHistory: true,
    }, "en");

    assert.equal(result.score, 100);
    assert.equal(result.status, "FULL_DATA_COVERAGE");
    assert.equal(result.purchaseRecommendation.canPurchasePro, true);
    assert.equal(result.purchaseRecommendation.canPurchaseAdvanced, true);
    assert.equal(result.missingItems.length, 0);
  });

  it("evaluates an unverified/scarce asset to CRITICAL_DATA_DEFICIT (< 30%) and blocks Pro/Advanced purchase", () => {
    const result = evaluateDataAvailability({
      hasBytecode: true,
      hasSourceCode: false,
      hasVerifiedAbi: false,
      hasStaticAnalysis: false,
      hasCfgGraph: false,
      hasPrice: true,
      candleCount: 4,
    }, "pl");

    assert.ok(result.score < 30);
    assert.equal(result.status, "CRITICAL_DATA_DEFICIT");
    assert.equal(result.purchaseRecommendation.canPurchasePro, false);
    assert.equal(result.purchaseRecommendation.canPurchaseAdvanced, false);
    assert.ok(result.missingItems.length > 0);
  });

  it("evaluates partial asset to PARTIAL_DATA (30-59.9%), permitting Pro but restricting Advanced", () => {
    const result = evaluateDataAvailability({
      hasBytecode: true,
      hasSourceCode: true,
      hasVerifiedAbi: true,
      hasStaticAnalysis: true,
      hasPrice: true,
      has24hVolume: true,
      candleCount: 28,
      hasContinuousTimeline: true,
    }, "de");

    assert.ok(result.score >= 30 && result.score < 60);
    assert.equal(result.status, "PARTIAL_DATA");
    assert.equal(result.purchaseRecommendation.canPurchasePro, true);
    assert.equal(result.purchaseRecommendation.canPurchaseAdvanced, false);
  });

  it("strictly validates boundary conditions: 29.9%, 30.0%, 30.1%, 59.9%, 60.0%, 84.9%, 85.0%", () => {
    assert.equal(classifyAvailabilityStatus(29.9), "CRITICAL_DATA_DEFICIT");
    assert.equal(classifyAvailabilityStatus(30.0), "PARTIAL_DATA");
    assert.equal(classifyAvailabilityStatus(30.1), "PARTIAL_DATA");
    assert.equal(classifyAvailabilityStatus(59.9), "PARTIAL_DATA");
    assert.equal(classifyAvailabilityStatus(60.0), "SUBSTANTIAL_DATA");
    assert.equal(classifyAvailabilityStatus(84.9), "SUBSTANTIAL_DATA");
    assert.equal(classifyAvailabilityStatus(85.0), "FULL_DATA_COVERAGE");
  });

  it("enforces field-level availability: blocks purchase when contract code is missing even with 80% other data", () => {
    const result = evaluateDataAvailability({
      hasBytecode: false,
      hasSourceCode: false, // Critical contract gap
      hasPrice: true,
      has24hVolume: true,
      hasMarketCap: true,
      candleCount: 60,
      hasContinuousTimeline: true,
      hasNoSyntheticGaps: true,
      hasOrderbookBidsAsks: true,
      hasDexPoolReserves: true,
      hasTop10Holders: true,
      hasConcentrationMetrics: true,
      historicalSnapshotCount: 30,
      has30dRiskHistory: true,
    }, "en");

    assert.equal(result.fieldAvailability.contract.available, false);
    assert.ok(result.criticalGaps.some(g => g.includes("CRITICAL_CONTRACT_UNAVAILABLE")));
    assert.equal(result.purchaseRecommendation.canPurchasePro, false, "Must block Pro purchase if contract code missing");
    assert.equal(result.purchaseRecommendation.canPurchaseAdvanced, false, "Must block Adv purchase if contract code missing");
  });

  it("flags provider staleness and provider disagreement in field availability report", () => {
    const result = evaluateDataAvailability({
      hasBytecode: true,
      hasSourceCode: true,
      hasPrice: true,
      isProviderStale: true,
      hasProviderDisagreement: true,
    }, "en");

    assert.equal(result.fieldAvailability.providerIntegrity.stale, true);
    assert.equal(result.fieldAvailability.providerIntegrity.disagreement, true);
    assert.ok(result.criticalGaps.some(g => g.includes("PROVIDER_STALENESS")));
    assert.ok(result.criticalGaps.some(g => g.includes("PROVIDER_DISAGREEMENT")));
  });
});
