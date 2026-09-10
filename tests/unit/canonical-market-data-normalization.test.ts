import assert from "node:assert/strict";
import {
  pass4570SanitizePercent,
  pass4570PercentEnvelope,
  pass4570SanityCaption,
  pass4572PercentEnvelope,
} from "../../lib/market-integrity/market-data-sanity-source";

async function main() {
  let assertions = 0;
  const ok = (cond: boolean, msg: string) => {
    assertions += 1;
    assert.ok(cond, msg);
  };

  console.log("=== PASS 003: CANONICAL MARKET DATA NORMALIZATION & SANITY SUITE ===");

  // 1. Rejection of NaN, Infinity, and Non-numeric types
  ok(pass4570SanitizePercent(NaN, "crypto", 86400) === null, "Rejects NaN percent");
  ok(pass4570SanitizePercent(Infinity, "stocks", 86400) === null, "Rejects Infinity percent");
  ok(pass4570SanitizePercent(-Infinity, "fx", 86400) === null, "Rejects -Infinity percent");
  ok(pass4570SanitizePercent(null as unknown as number, "etf", 86400) === null, "Rejects null percent");
  ok(pass4570SanitizePercent(undefined as unknown as number, "commodities", 86400) === null, "Rejects undefined percent");

  // 2. Asset-Class Specific Bounds Enforcement
  // FX daily moves > 7% must be rejected as impossible / corrupted
  ok(pass4570PercentEnvelope("fx", 86400) === 7, "FX 24h envelope is 7%");
  ok(pass4570SanitizePercent(3.5, "fx", 86400) === 3.5, "Normal FX move of 3.5% accepted");
  ok(pass4570SanitizePercent(15.2, "fx", 86400) === null, "Extreme FX move of 15.2% rejected");

  // Stocks / Equities daily moves > 35% must be rejected
  ok(pass4570PercentEnvelope("stocks", 86400) === 35, "Stocks 24h envelope is 35%");
  ok(pass4570SanitizePercent(12.4, "stocks", 86400) === 12.4, "Normal Stock move accepted");
  ok(pass4570SanitizePercent(500.0, "stocks", 86400) === null, "Corrupt Stock move (+500%) rejected");

  // Crypto envelope allows up to 180% daily moves, but caps hard limit > 900%
  ok(pass4570PercentEnvelope("crypto", 86400) === 180, "Crypto 24h envelope is 180%");
  ok(pass4570SanitizePercent(45.5, "crypto", 86400) === 45.5, "High-volatility crypto move accepted");
  ok(pass4570SanitizePercent(1200.0, "crypto", 86400) === null, "Absurd +1200% move rejected");

  // 3. Multi-Locale Sanity Captions
  ok(pass4570SanityCaption(50.0, "fx", 86400, "pl") === "odrzucone przez sanity guard", "PL caption returned for rejected value");
  ok(pass4570SanityCaption(50.0, "fx", 86400, "en") === "rejected by sanity guard", "EN caption returned for rejected value");
  ok(pass4570SanityCaption(50.0, "fx", 86400, "de") === "durch Sanity-Guard verworfen", "DE caption returned for rejected value");
  ok(pass4570SanityCaption(2.0, "fx", 86400, "en") === null, "Valid move yields null caption (no rejection)");

  // 4. PASS4572 Major Symbols Trust Gate
  const aaplEnvelope = pass4572PercentEnvelope("stocks", 86400, "AAPL");
  const smallCapEnvelope = pass4572PercentEnvelope("stocks", 86400, "TINYCO");
  ok(aaplEnvelope <= smallCapEnvelope, "Major liquid symbol (AAPL) has tighter or equal envelope than small cap");

  // 5. OHLC Mathematical Validation Invariant Simulation
  function validateCandle(c: { open: number; high: number; low: number; close: number; timestamp: number; volume: number | null }) {
    if (
      !Number.isFinite(c.timestamp) || c.timestamp <= 0 ||
      !Number.isFinite(c.open) || c.open <= 0 ||
      !Number.isFinite(c.high) || c.high <= 0 ||
      !Number.isFinite(c.low) || c.low <= 0 ||
      !Number.isFinite(c.close) || c.close <= 0 ||
      c.high < Math.max(c.open, c.close) ||
      c.low > Math.min(c.open, c.close) ||
      (c.volume !== null && (!Number.isFinite(c.volume) || c.volume < 0))
    ) {
      return false;
    }
    return true;
  }

  // Normal candle
  ok(validateCandle({ timestamp: 1700000000, open: 100, high: 105, low: 95, close: 102, volume: 5000 }) === true, "Valid OHLC candle passes");
  // Inverted high (high < close)
  ok(validateCandle({ timestamp: 1700000000, open: 100, high: 90, low: 85, close: 95, volume: 5000 }) === false, "Inverted high candle rejected");
  // Inverted low (low > open)
  ok(validateCandle({ timestamp: 1700000000, open: 100, high: 110, low: 105, close: 108, volume: 5000 }) === false, "Inverted low candle rejected");
  // Negative price
  ok(validateCandle({ timestamp: 1700000000, open: -100, high: 100, low: -150, close: 50, volume: 5000 }) === false, "Negative price candle rejected");
  // Zero timestamp
  ok(validateCandle({ timestamp: 0, open: 100, high: 105, low: 95, close: 102, volume: 5000 }) === false, "Zero timestamp candle rejected");
  // Negative volume
  ok(validateCandle({ timestamp: 1700000000, open: 100, high: 105, low: 95, close: 102, volume: -50 }) === false, "Negative volume candle rejected");

  console.log(`PASS 003 Canonical Market Data Normalization: PASS (${assertions}/${assertions} assertions)`);
}

main().catch((err) => {
  console.error("Test failure:", err);
  process.exit(1);
});
