import assert from "node:assert/strict";
import { runPass636FailureDrill } from "../../lib/security/provider-failure-drills.ts";
import { buildPass624ProviderContradictionEngine } from "../../lib/market-integrity/provider-contradiction-engine.ts";
import { evaluatePass4656ProviderObservation } from "../../lib/market-integrity/provider-failure-matrix.ts";

async function main() {
  let assertions = 0;
  const ok = (cond: boolean, msg: string) => {
    assertions += 1;
    assert.ok(cond, msg);
  };

  console.log("=== PASS-014: PROVIDER RESILIENCE & CONTRADICTION ENGINE SUITE ===");

  // 1. Provider Down / Offline Drill
  const offlineDrill = runPass636FailureDrill("coingecko", "offline");
  ok(offlineDrill.sourceState === "offline", "Offline provider must have sourceState: offline");
  ok(offlineDrill.confidenceCap === 0, "Offline provider confidence cap must drop to 0");
  ok(offlineDrill.mayConfirmCurrentFact === false, "Offline provider cannot confirm current facts");
  ok(offlineDrill.uiFunctional === true, "UI must remain functional during provider offline");

  // 2. Timeout Resilience Drill
  const timeoutDrill = runPass636FailureDrill("binance", "timeout");
  ok(timeoutDrill.sourceState === "fallback", "Timed out provider must shift to fallback");
  ok(timeoutDrill.confidenceCap === 28, "Timeout confidence cap must be strictly bounded (28)");
  ok(timeoutDrill.mayConfirmCurrentFact === false, "Timeout cannot confirm current facts as live");
  ok(timeoutDrill.retryAllowed === true, "Timeout allows controlled retry");

  // 3. Rate Limit Drill
  const rateLimitDrill = runPass636FailureDrill("alpha_vantage", "rate_limit");
  ok(rateLimitDrill.sourceState === "fallback", "Rate limited provider shifts to fallback");
  ok(rateLimitDrill.retryAfterMs === 30_000, "Rate limit respects 30s cooldown window");
  ok(rateLimitDrill.mayConfirmCurrentFact === false, "Rate limited provider cannot confirm current facts");

  // 4. Malformed JSON Drill
  const malformedDrill = runPass636FailureDrill("pyth", "malformed_json");
  ok(malformedDrill.sourceState === "offline", "Malformed JSON response forces offline state");
  ok(malformedDrill.confidenceCap === 0, "Malformed payload confidence cap is 0");
  ok(malformedDrill.retryAllowed === false, "Corrupted schema must not loop retries");

  // 5. Partial Payload Drill
  const partialDrill = runPass636FailureDrill("coingecko", "partial_payload");
  ok(partialDrill.sourceState === "partial", "Partial response marked as partial");
  ok(partialDrill.confidenceCap === 42, "Partial response confidence capped at 42");

  // 6. Provider Failure Matrix Classification
  const now = new Date().toISOString();
  const verdictTimeout = evaluatePass4656ProviderObservation({
    providerId: "binance",
    providerFamily: "market_data",
    requestedIdentity: "BTC",
    resolvedIdentity: "BTC",
    elapsedMs: 8000,
    timedOut: true,
    observedAt: now,
    maxAgeMs: 60_000,
    capabilities: ["price"],
  });
  ok(verdictTimeout.failureKind === "timeout", "Matrix classifies timeout");
  ok(verdictTimeout.retryable === true, "Timeout is marked retryable");
  ok(verdictTimeout.acceptedAsEvidence === false, "Timeout is rejected as valid evidence");

  const verdictRateLimited = evaluatePass4656ProviderObservation({
    providerId: "alpha_vantage",
    providerFamily: "market_data",
    requestedIdentity: "AAPL",
    resolvedIdentity: "AAPL",
    httpStatus: 429,
    elapsedMs: 250,
    retryAfterSeconds: 45,
    observedAt: now,
    maxAgeMs: 60_000,
    capabilities: ["price"],
  });
  ok(verdictRateLimited.failureKind === "rate_limited", "Matrix classifies HTTP 429 as rate_limited");
  ok(verdictRateLimited.retryAfterSeconds === 45, "Matrix captures Retry-After header");
  ok(verdictRateLimited.acceptedAsEvidence === false, "Rate-limited response is rejected as evidence");

  const verdictSchemaDrift = evaluatePass4656ProviderObservation({
    providerId: "coingecko",
    providerFamily: "market_data",
    requestedIdentity: "ETH",
    resolvedIdentity: "ETH",
    httpStatus: 200,
    elapsedMs: 200,
    observedAt: now,
    maxAgeMs: 60_000,
    capabilities: ["price"],
    payload: { price: 3000 },
    requiredFields: ["price", "market_cap", "volume24h"],
  });
  ok(verdictSchemaDrift.failureKind === "schema_drift", "Matrix classifies missing required fields as schema_drift");
  ok(verdictSchemaDrift.acceptedAsEvidence === false, "Incomplete schema rejected as evidence");

  // 7. Contradiction Engine (Divergent Observations)
  const contradictionEngine = buildPass624ProviderContradictionEngine({
    assetClass: "crypto",
    observations: [
      {
        fieldId: "price",
        sourceId: "binance",
        kind: "price",
        value: 92_000,
        observedAt: now,
        confidenceCap: 95,
      },
      {
        fieldId: "price",
        sourceId: "kraken",
        kind: "price",
        value: 94_000, // ~2.15% divergence = 215 bps > 90 bps crypto threshold
        observedAt: now,
        confidenceCap: 95,
      },
    ],
  });
  ok(contradictionEngine.state === "contradiction", "215 bps divergence on crypto must trigger state: contradiction");
  ok(contradictionEngine.contradictions === 1, "Must detect exactly 1 contradiction");
  ok(contradictionEngine.confidenceCap < 50, "Contradiction must penalize confidence cap below 50");

  // 8. Contradiction Engine (Aligned Observations)
  const alignedEngine = buildPass624ProviderContradictionEngine({
    assetClass: "crypto",
    observations: [
      {
        fieldId: "price",
        sourceId: "binance",
        kind: "price",
        value: 92_000,
        observedAt: now,
        confidenceCap: 95,
      },
      {
        fieldId: "price",
        sourceId: "coinbase",
        kind: "price",
        value: 92_020, // ~2.17 bps divergence < 90 bps crypto threshold
        observedAt: now,
        confidenceCap: 95,
      },
    ],
  });
  ok(alignedEngine.state === "aligned", "Close quotes must trigger state: aligned");
  ok(alignedEngine.aligned === 1, "Must detect exactly 1 aligned comparison");
  ok(alignedEngine.contradictions === 0, "No contradiction for aligned quotes");

  // 9. Truth Invariant: Fail-Closed Against Fake LIVE Status
  ok(offlineDrill.sourceState !== "live", "Offline provider must never be labeled live");
  ok(timeoutDrill.sourceState !== "live", "Timeout provider must never be labeled live");
  ok(partialDrill.sourceState !== "live", "Partial provider must never be labeled live");

  console.log(`PASS-014 Provider Resilience & Contradiction: PASS (${assertions}/${assertions} assertions)`);
}

main().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
