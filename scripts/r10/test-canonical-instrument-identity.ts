import assert from "node:assert/strict";
import {
  assertTierIndependentInstrumentIdentity,
  canonicalInstrumentKey,
  validateCanonicalInstrumentIdentity,
  type CanonicalInstrumentIdentity,
  type VelmereTier,
} from "../../lib/market-integrity/canonical-instrument";

function base(overrides: Partial<CanonicalInstrumentIdentity> = {}): CanonicalInstrumentIdentity {
  return {
    instrumentId: "xau-usd-spot",
    assetClass: "commodity",
    instrumentType: "spot",
    economicExposure: "Gold spot price in USD",
    underlying: "Gold",
    canonicalSymbol: "XAUUSD",
    providerSymbol: "XAUUSD",
    venue: null,
    mic: null,
    baseCurrency: "XAU",
    quoteCurrency: "USD",
    contractMonth: null,
    expiry: null,
    settlementType: "none",
    priceType: "spot",
    timezone: "UTC",
    marketCalendar: "OTC_METALS",
    jurisdiction: ["GLOBAL_OTC"],
    dataProvider: "fixture-provider",
    asOf: "2026-09-11T00:00:00.000Z",
    freshnessSeconds: 60,
    rollMethodology: null,
    ...overrides,
  };
}

// Spot gold must not silently point at the CME GC futures family.
{
  const invalid = base({ providerSymbol: "cme:gc-front" });
  const result = validateCanonicalInstrumentIdentity(invalid);
  assert.equal(result.valid, false);
  assert(result.errors.some((error) => /spot identity cannot carry futures/i.test(error)));
}

// A GC future is valid only when its futures identity is explicit.
{
  const future = base({
    instrumentId: "gc-front",
    instrumentType: "future",
    providerSymbol: "CME:GC-FRONT",
    venue: "CME COMEX",
    mic: "XCEC",
    contractMonth: null,
    expiry: null,
    settlementType: "physical",
    priceType: "settlement",
    marketCalendar: "CME_METALS",
    jurisdiction: ["US_CFTC"],
    rollMethodology: "front-month continuous contract",
  });
  const result = validateCanonicalInstrumentIdentity(future);
  assert.equal(result.valid, true, result.errors.join("\n"));
}

// OTC EURUSD cannot be described as spot while carrying the CME 6E future identity.
{
  const invalid = base({
    instrumentId: "eurusd-spot",
    assetClass: "fx",
    instrumentType: "spot",
    economicExposure: "EUR/USD OTC spot",
    underlying: "EUR/USD",
    canonicalSymbol: "EURUSD",
    providerSymbol: "CME:6E-FRONT",
    baseCurrency: "EUR",
    quoteCurrency: "USD",
    marketCalendar: "FX_24X5",
    jurisdiction: ["GLOBAL_OTC"],
  });
  const result = validateCanonicalInstrumentIdentity(invalid);
  assert.equal(result.valid, false);
  assert(result.errors.some((error) => /futures contract metadata\/provider symbol/i.test(error)));
}

// VIX is an index identity, not a smart-contract application or a future unless explicitly modeled as VX future.
{
  const vix = base({
    instrumentId: "vix-index",
    assetClass: "index",
    instrumentType: "index",
    economicExposure: "Cboe Volatility Index",
    underlying: "S&P 500 option-implied volatility",
    canonicalSymbol: "VIX",
    providerSymbol: "VIX",
    venue: "CBOE",
    mic: "XCBO",
    baseCurrency: null,
    quoteCurrency: null,
    settlementType: "none",
    priceType: "index",
    marketCalendar: "CBOE_INDEX",
    jurisdiction: ["US"],
  });
  const result = validateCanonicalInstrumentIdentity(vix);
  assert.equal(result.valid, true, result.errors.join("\n"));
}

// Identity is invariant across customer tiers. Only analysis depth may change.
{
  const identity = base();
  const tiers: VelmereTier[] = ["basic", "pro", "advanced"];
  const views = tiers.map((tier) => ({
    tier,
    identity: { ...identity, asOf: tier === "basic" ? "2026-09-11T00:00:00.000Z" : "2026-09-11T00:01:00.000Z", freshnessSeconds: tier === "advanced" ? 15 : 60 },
    analysisDepth: tier,
  }));
  const result = assertTierIndependentInstrumentIdentity(views);
  assert.equal(result.valid, true, result.errors.join("\n"));
}

// Tier-specific provider symbol drift is a release blocker.
{
  const identity = base();
  const result = assertTierIndependentInstrumentIdentity([
    { tier: "basic", identity },
    { tier: "pro", identity: { ...identity, providerSymbol: "CME:GC-FRONT" } },
    { tier: "advanced", identity },
  ]);
  assert.equal(result.valid, false);
  assert(result.errors.some((error) => /providerSymbol/i.test(error)));
}

// Canonical key changes when economic identity changes.
{
  const spot = base();
  const future = base({ instrumentId: "gc-front", instrumentType: "future", providerSymbol: "CME:GC-FRONT", venue: "CME COMEX", contractMonth: "FRONT", rollMethodology: "front-month" });
  assert.notEqual(canonicalInstrumentKey(spot), canonicalInstrumentKey(future));
}

console.log("R10 canonical instrument identity regression: PASS");
