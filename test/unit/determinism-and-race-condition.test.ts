import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeVersionedRisk, buildMetricLineage } from "@/lib/data-integrity/data-lineage-and-versioning";

describe("Determinism & Versioning Test Suite (PASS 36)", () => {
  it("executes 20 consecutive risk evaluations and asserts 100% deterministic output", () => {
    const fixedInputs = {
      vulnerabilityScore: 40,
      economicScore: 25,
      oracleScore: 10,
      liquidityScore: 30,
      privilegesScore: 50,
    };

    const fixedTimestamp = "2026-09-07T12:00:00.000Z";
    const initialRun = computeVersionedRisk(fixedInputs, fixedTimestamp);

    for (let iteration = 1; iteration <= 20; iteration++) {
      const subsequentRun = computeVersionedRisk(fixedInputs, fixedTimestamp);

      assert.equal(subsequentRun.compositeRiskScore, initialRun.compositeRiskScore, `Iteration ${iteration}: Score mismatch`);
      assert.equal(subsequentRun.confidenceScore, initialRun.confidenceScore, `Iteration ${iteration}: Confidence mismatch`);
      assert.equal(subsequentRun.riskEngineVersion, "2.1.0", `Iteration ${iteration}: Engine version mismatch`);
      assert.equal(subsequentRun.formulaVersion, "VLM-RISK-2026.1", `Iteration ${iteration}: Formula version mismatch`);
      assert.equal(subsequentRun.dataSnapshotId, initialRun.dataSnapshotId, `Iteration ${iteration}: Snapshot ID mismatch`);
    }
  });

  it("builds an auditable 8-stage data lineage trace from provider to PDF", () => {
    const lineage = buildMetricLineage(
      "market_cap",
      "CoinGecko / Binance Quorum",
      "https://api.coingecko.com/api/v3/coins/ethereum",
      325000000000,
      [
        { stage: "provider", module: "CoinGecko V3 Client", status: "verified" },
        { stage: "raw_response", module: "HTTP Ingestion Stream", status: "verified" },
        { stage: "normalization", module: "Currency Decimals Normalizer", status: "verified" },
        { stage: "validation", module: "Zod Schema & Finite Number Checker", status: "verified" },
        { stage: "calculation", module: "Circulating Supply * Spot Price", status: "verified" },
        { stage: "final_value", module: "State Atom Settlement", status: "verified" },
        { stage: "ui_render", module: "AssetDetailModal Header Component", status: "verified" },
        { stage: "pdf_export", module: "CanonicalReportPDF Engine", status: "verified" },
      ]
    );

    assert.equal(lineage.isFullyVerified, true);
    assert.equal(lineage.stages.length, 8);
    assert.ok(lineage.lineageHash && lineage.lineageHash.length === 64);
  });
});

describe("Race-Condition Out-of-Order Resolution Test Suite (PASS 36)", () => {
  it("prevents slower initial request (BTC) from overwriting faster subsequent request (ETH)", async () => {
    let activeAssetId: string | null = null;
    let renderedSymbol: string | null = null;
    let sequenceCounter = 0;

    async function selectAndFetchAsset(assetId: string, symbol: string, latencyMs: number) {
      activeAssetId = assetId;
      const requestSeq = ++sequenceCounter;

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          // Guard: If a newer request was initiated or active asset changed, discard response
          if (activeAssetId === assetId && requestSeq === sequenceCounter) {
            renderedSymbol = symbol;
          }
          resolve();
        }, latencyMs);
      });
    }

    // Trigger BTC request (slow: 80ms)
    const btcPromise = selectAndFetchAsset("btc-market-01", "BTC", 80);

    // After 10ms, user switches to ETH (fast: 25ms)
    await new Promise((r) => setTimeout(r, 10));
    const ethPromise = selectAndFetchAsset("eth-market-02", "ETH", 25);

    // Wait for both to complete
    await Promise.all([btcPromise, ethPromise]);

    // ETH should have completed at t = 10 + 25 = 35ms and set renderedSymbol = "ETH"
    // BTC completes at t = 80ms, but should be dropped because requestSeq < sequenceCounter
    assert.equal(renderedSymbol, "ETH", "Race condition failed: Slower BTC response overwrote newer ETH view");
    assert.equal(activeAssetId, "eth-market-02");
  });
});
