/**
 * Master Verification Test Suite for Velmère Market & On-Chain Ingest Pipeline
 * Tests:
 * 1. Multi-provider failover cascading (Primary -> Secondary -> Tertiary)
 * 2. 429 Rate-limit & Timeout circuit resilience
 * 3. Quorum consensus engine (2% maximum divergence threshold)
 * 4. Completeness root cause diagnostics (Zero hallucination policy)
 * 5. EVM RPC multi-endpoint fallback configuration
 */

import assert from "node:assert/strict";
import {
  executeMultiProviderFailover,
  verifyQuorumConsensus,
  type ProviderQueryConfig,
} from "../../lib/data/multi-provider-failover";
import {
  diagnoseFieldCompleteness,
  type FieldObservationAttempt,
} from "../../lib/data/completeness-root-cause-engine";
import { SUPPORTED_CHAINS } from "../../lib/security/evm-rpc-fetcher";

console.log("========================================================");
console.log("   VELMÈRE MARKET & ON-CHAIN PIPELINE INTEGRITY QA     ");
console.log("========================================================");

async function runPipelineTests() {
  // Test 1: Cascade Failover on Primary 429 & Secondary Timeout
  console.log("[Test 1] Testing Multi-Provider Cascade Failover...");
  const providers: ProviderQueryConfig<{ price: number }>[] = [
    {
      providerName: "Binance-Primary",
      fetcher: async () => {
        throw new Error("HTTP 429 Too Many Requests: Rate limit exceeded");
      },
    },
    {
      providerName: "CoinGecko-Secondary",
      fetcher: async () => {
        // Simulating slow response that times out
        await new Promise((resolve) => setTimeout(resolve, 500));
        return { price: 3412.50 };
      },
      timeoutMs: 100, // Strict timeout trigger
    },
    {
      providerName: "DexScreener-Tertiary",
      fetcher: async () => {
        return { price: 3414.20 };
      },
    },
  ];

  const result = await executeMultiProviderFailover(providers);
  assert.equal(result.success, true, "Failover should succeed on tertiary provider");
  assert.equal(result.selectedProvider, "DexScreener-Tertiary", "Selected provider must be tertiary");
  assert.equal(result.value?.price, 3414.20, "Should return accurate payload");
  assert.equal(result.attempts.length, 3, "Should have logged all 3 provider attempts");
  assert.equal(result.attempts[0].status, "RATE_LIMITED", "First attempt must be classified as RATE_LIMITED");
  assert.equal(result.attempts[1].status, "TIMEOUT", "Second attempt must be classified as TIMEOUT");
  assert.equal(result.attempts[2].status, "SUCCESS", "Third attempt must be classified as SUCCESS");
  console.log("  -> Cascading Failover & Error Taxonomy: PASS");

  // Test 2: Invariant Truth Over Coverage (Zero Hallucination on Full Failure)
  console.log("[Test 2] Testing Zero-Hallucination Policy on Total Outage...");
  const failingProviders: ProviderQueryConfig<number>[] = [
    {
      providerName: "Provider-A",
      fetcher: async () => { throw new Error("503 Service Unavailable"); },
    },
    {
      providerName: "Provider-B",
      fetcher: async () => { throw new Error("Connection refused"); },
    },
  ];

  const fullFailureResult = await executeMultiProviderFailover(failingProviders);
  assert.equal(fullFailureResult.success, false, "Must return success=false on full outage");
  assert.equal(fullFailureResult.value, null, "Must NOT synthesize or hallucinate fake numbers");
  assert.equal(fullFailureResult.selectedProvider, null, "No provider should be selected");

  const diagnosis = diagnoseFieldCompleteness({
    fieldKey: "eth_usd_spot",
    fieldLabel: "ETH/USD Spot Price",
    category: "market",
    assetClass: "market_asset",
    value: fullFailureResult.value,
    attempts: fullFailureResult.attempts,
  });
  assert.equal(diagnosis.state, "UPSTREAM_OUTAGE", "Diagnosis must be UPSTREAM_OUTAGE");
  assert.ok(diagnosis.stateHumanExplanation.includes("failed") || diagnosis.stateHumanExplanation.includes("Provider") || diagnosis.stateHumanExplanation.includes("upstream"), "Must provide explanation");
  console.log("  -> Zero-Hallucination Invariant & Root Cause Diagnosis: PASS");

  // Test 3: Quorum Consensus Engine
  console.log("[Test 3] Testing Quorum Consensus Divergence Checking...");
  // 3a. Close values (0.1% diff) -> Consensus PASS
  const quorumPass = verifyQuorumConsensus(3450.00, 3453.45, 0.02);
  assert.equal(quorumPass.consensus, true, "Values within 2% must reach consensus");
  assert.ok(quorumPass.divergencePct < 0.002, "Divergence must be ~0.1%");

  // 3b. Divergent values (4.5% diff) -> Consensus REJECT
  const quorumFail = verifyQuorumConsensus(3450.00, 3610.00, 0.02);
  assert.equal(quorumFail.consensus, false, "Values exceeding 2% must be rejected from consensus");
  assert.ok(quorumFail.divergencePct > 0.04, "Divergence must reflect true discrepancy");
  console.log("  -> Quorum Consensus Engine (2% boundary): PASS");

  // Test 4: EVM RPC Multi-Chain Endpoint Redundancy
  console.log("[Test 4] Verifying EVM RPC Multi-Endpoint Redundancy across 7 Chains...");
  const supportedChains = Object.keys(SUPPORTED_CHAINS);
  assert.equal(supportedChains.length, 7, "Must support 7 EVM chains (1, 56, 42161, 137, 8453, 10, 43114)");

  for (const chainId of supportedChains) {
    const config = SUPPORTED_CHAINS[chainId as keyof typeof SUPPORTED_CHAINS];
    assert.ok(config.rpcUrls.length >= 3, `Chain ${config.chainName} (${chainId}) must have >= 3 fallback RPC endpoints`);
    for (const url of config.rpcUrls) {
      assert.ok(url.startsWith("https://"), `RPC URL ${url} must be secure HTTPS`);
    }
  }
  console.log("  -> EVM Multi-Chain RPC Failover Topology (>=3 endpoints/chain): PASS");

  console.log("========================================================");
  console.log(" ALL DATA PIPELINE & RESILIENCE ASSERTIONS PASSED (100%)");
  console.log("========================================================");
}

runPipelineTests().catch((err) => {
  console.error("Pipeline QA Test Failed:", err);
  process.exit(1);
});
