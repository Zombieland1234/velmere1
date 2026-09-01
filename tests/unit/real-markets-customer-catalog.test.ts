import { test } from "node:test";
import assert from "node:assert/strict";
import {
  REAL_MARKETS_CUSTOMER_CATALOG_COUNTS,
  REAL_MARKETS_CUSTOMER_CATALOG_DATA_MODE,
  REAL_MARKETS_CUSTOMER_CATALOG_LIVE_DATA_INCLUDED,
  REAL_MARKETS_CUSTOMER_CATALOG_COMMERCIAL_RIGHTS_VERIFIED,
  REAL_MARKETS_CUSTOMER_CATALOG_ROWS,
} from "@/lib/market-integrity/real-markets-customer-catalog";

test("real-markets catalog: total matches rows", () => {
  assert.equal(REAL_MARKETS_CUSTOMER_CATALOG_COUNTS.total, REAL_MARKETS_CUSTOMER_CATALOG_ROWS.length);
  assert.equal(REAL_MARKETS_CUSTOMER_CATALOG_COUNTS.uniqueSymbols, REAL_MARKETS_CUSTOMER_CATALOG_ROWS.length);
});

test("real-markets catalog: data mode is STATIC_REFERENCE_UNIVERSE", () => {
  assert.equal(REAL_MARKETS_CUSTOMER_CATALOG_DATA_MODE, "STATIC_REFERENCE_UNIVERSE");
});

test("real-markets catalog: live data NOT included", () => {
  assert.equal(REAL_MARKETS_CUSTOMER_CATALOG_LIVE_DATA_INCLUDED, false);
});

test("real-markets catalog: commercial rights NOT verified", () => {
  assert.equal(REAL_MARKETS_CUSTOMER_CATALOG_COMMERCIAL_RIGHTS_VERIFIED, false);
});

test("real-markets catalog: ETH and SOL are present after R7", () => {
  const symbols = new Set(REAL_MARKETS_CUSTOMER_CATALOG_ROWS.map((r) => r.symbol));
  assert.ok(symbols.has("ETH"), "ETH must be in catalog");
  assert.ok(symbols.has("SOL"), "SOL must be in catalog");
});

test("real-markets catalog: AAPL, NVDA, BTC.D, XPD/USD are present", () => {
  const symbols = new Set(REAL_MARKETS_CUSTOMER_CATALOG_ROWS.map((r) => r.symbol));
  assert.ok(symbols.has("AAPL"));
  assert.ok(symbols.has("NVDA"));
  assert.ok(symbols.has("BTC.D"));
  assert.ok(symbols.has("XPD/USD"));
});

test("real-markets catalog: total >= 555", () => {
  assert.ok(REAL_MARKETS_CUSTOMER_CATALOG_COUNTS.total >= 555, "must have at least 555 unique rows including ETH+SOL");
});

test("real-markets catalog: all rows have valid assetClass", () => {
  const valid = new Set(["stock", "fx", "etf", "commodity", "real_estate", "crypto", "exchange_token", "index", "exchange"]);
  for (const r of REAL_MARKETS_CUSTOMER_CATALOG_ROWS) {
    assert.ok(valid.has(r.assetClass), `assetClass ${r.assetClass} must be valid`);
  }
});

test("real-markets catalog: no duplicate IDs", () => {
  const ids = REAL_MARKETS_CUSTOMER_CATALOG_ROWS.map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("real-markets catalog: no duplicate symbols", () => {
  const symbols = REAL_MARKETS_CUSTOMER_CATALOG_ROWS.map((r) => r.symbol.trim().toUpperCase());
  assert.equal(new Set(symbols).size, symbols.length);
});
