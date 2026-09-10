import { MarketProvenanceEngine } from "../lib/security/market-evidence/market-provenance-engine.ts";

console.log("=== TESTING PASS 5: MARKET PROVENANCE & REGULATORY ENGINE ===");

// 1. Test Shield Crypto
const btcShield = MarketProvenanceEngine.evaluateShieldCrypto("AUD-TEST-BTC", "BTC", 64500.25);
console.log("BTC Shield Telemetry:");
console.log("- Observed Price:", btcShield.metrics.price, `(${btcShield.metrics.priceType})`);
console.log("- Gini Index:", btcShield.metrics.giniIndex, `(${btcShield.metrics.giniMethodology})`);
console.log("- Whale Status:", btcShield.metrics.whaleOutflowStatus);
console.log("- Evidence records generated:", btcShield.evidenceRecords.length);

// 2. Test Real Markets AAPL
const aaplTrad = MarketProvenanceEngine.evaluateRealMarkets("AUD-TEST-AAPL", "AAPL", 228.45);
console.log("\nAAPL Traditional Telemetry:");
console.log("- Exchange:", aaplTrad.metrics.exchange);
console.log("- Dark Pool Share:", aaplTrad.metrics.darkPoolSharePercent, "%", `Status: ${aaplTrad.metrics.darkPoolStatus}`);
console.log("- SEC EDGAR CIK:", aaplTrad.metrics.secEdgarFiling?.cik, "Auditor:", aaplTrad.metrics.secEdgarFiling?.auditorName);
console.log("- Best Execution:", aaplTrad.metrics.bestExecutionStatus);
console.log("- SIP Feed:", aaplTrad.metrics.sipFeedType);

// 3. Test Commodities (Gold)
const goldTrad = MarketProvenanceEngine.evaluateRealMarkets("AUD-TEST-GOLD", "GC=F", 2510.30);
console.log("\nGold Futures Telemetry:");
console.log("- Exchange:", goldTrad.metrics.exchange);
console.log("- Dark Pool Share Status:", goldTrad.metrics.darkPoolStatus);

if (goldTrad.metrics.darkPoolStatus !== "NOT_OBSERVED_INSUFFICIENT_DATA") {
  throw new Error("Gold commodities must not report ATS dark pool volume!");
}

if (aaplTrad.metrics.bestExecutionStatus !== "NOT_ASSESSED") {
  throw new Error("Best Execution must be NOT_ASSESSED when tick routing data is unobserved!");
}

console.log("\nPASS 5 VERIFICATION SUCCESSFUL!");
