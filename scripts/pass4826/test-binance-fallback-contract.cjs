const assert = require("node:assert/strict");
const fs = require("node:fs");
const { loadTypeScript } = require("../lib/load-typescript.cjs");

const ts = loadTypeScript();

function compile(brokeredEgressFetch, captures) {
  const source = fs.readFileSync("lib/market-integrity/binance-market-fallback.ts", "utf8");
  const result = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
    },
    reportDiagnostics: true,
  });
  const errors = (result.diagnostics || []).filter((item) => item.category === ts.DiagnosticCategory.Error);
  assert.equal(errors.length, 0, `transpile diagnostics: ${errors.length}`);

  const module = { exports: {} };
  const localRequire = (id) => {
    if (id === "@/lib/network/fetch-with-deadline") {
      return { readJsonResponseBounded: async (response) => response.json() };
    }
    if (id === "@/lib/network/brokered-egress") return { brokeredEgressFetch };
    if (id === "./risk-engine") {
      return {
        analyzeTokenRisk(input, dataQuality) {
          captures.riskInputs.push(input);
          return {
            token: { marketId: input.marketId, symbol: input.symbol, name: input.name },
            score: 0,
            level: "low",
            badge: "low_detected_risk",
            signals: [],
            metrics: { currentPrice: input.currentPrice },
            dataQuality,
            dataSources: input.dataSources || [],
            generatedAt: new Date().toISOString(),
          };
        },
      };
    }
    if (id === "./provider-evidence-receipt") {
      return {
        createPass4644ProviderEvidenceReceipt(input) {
          captures.receiptInputs.push(input);
          return { receiptId: `test-${captures.receiptInputs.length}`, ...input };
        },
        attachPass4644ProviderReceipts(resultValue, receipts) {
          resultValue.providerEvidenceReceipts = receipts;
          return resultValue;
        },
      };
    }
    throw new Error(`unexpected require: ${id}`);
  };
  new Function("require", "module", "exports", result.outputText)(localRequire, module, module.exports);
  return module.exports;
}

function ticker(closeTime) {
  const value = {
    symbol: "BTCUSDT",
    lastPrice: "68000",
    openPrice: "67000",
    highPrice: "69000",
    lowPrice: "66000",
    priceChangePercent: "1.49",
    quoteVolume: "42000000000",
  };
  if (closeTime !== "missing") value.closeTime = closeTime;
  return value;
}

async function runCase(closeTime, options = {}) {
  const captures = { riskInputs: [], receiptInputs: [], calls: [] };
  const brokeredEgressFetch = async (url) => {
    captures.calls.push(url);
    if ("allPayload" in options) return Response.json(options.allPayload, { status: 200 });
    if (String(url).includes("api.binance.com")) {
      if ("primaryPayload" in options) return Response.json(options.primaryPayload, { status: 200 });
      throw new TypeError("simulated provider failure");
    }
    return Response.json([ticker(closeTime)], { status: 200 });
  };
  const module = compile(brokeredEgressFetch, captures);
  const startedAt = Date.now();
  const output = await module.fetchBinanceMarketFallback({ page: 1, perPage: 10 });
  const elapsedMs = Date.now() - startedAt;
  return { output, captures, elapsedMs };
}

async function run() {
  const validEpoch = Date.now() - 1_000;
  const valid = await runCase(validEpoch);
  assert.ok(valid.elapsedMs < 2_000, `hedged fallback took ${valid.elapsedMs}ms`);
  assert.ok(valid.captures.calls.length >= 2, "fallback must hedge after the first host fails");
  assert.equal(valid.output.rows.length, 1);
  assert.equal(valid.output.rows[0].rank, undefined, "catalog order must not masquerade as market rank");
  assert.deepEqual(valid.output.rows[0].sparkline7d, [], "24h open/close must not masquerade as a 7d series");
  assert.equal(valid.captures.riskInputs[0].rank, undefined);
  assert.equal(valid.captures.riskInputs[0].sparkline7d, undefined);
  assert.equal(valid.output.coverage.rankAvailable, false);
  assert.equal(valid.output.coverage.ordering, "static_identity_catalog_not_market_rank");
  assert.equal(valid.output.generatedAt, valid.captures.receiptInputs[0].receivedAt);
  assert.equal(valid.captures.receiptInputs[0].observedAt, new Date(validEpoch).toISOString());
  assert.equal(valid.captures.receiptInputs[0].state, "partial");
  assert.equal(valid.captures.receiptInputs[0].providerFamily, "binance_spot");

  const emptyPrimary = await runCase(validEpoch, { primaryPayload: [] });
  assert.ok(emptyPrimary.captures.calls.length >= 2, "empty primary payload must not abort a valid hedge");
  assert.equal(emptyPrimary.output.rows[0].symbol, "BTC");

  const malformedPrimary = await runCase(validEpoch, { primaryPayload: [{ symbol: "BTCUSDT", lastPrice: null }] });
  assert.ok(malformedPrimary.captures.calls.length >= 2, "malformed primary tickers must not win the hedge");
  assert.equal(malformedPrimary.output.rows[0].symbol, "BTC");
  assert.match(malformedPrimary.output.source, /api-gcp\.binance\.com/);

  const toxicPrimaryCases = [
    ["negative quote volume", { ...ticker(validEpoch), quoteVolume: "-1" }],
    ["future close time", { ...ticker(validEpoch), closeTime: Date.now() + 10 * 60_000 }],
    ["percent below the physical floor", { ...ticker(validEpoch), priceChangePercent: "-100.01" }],
    ["percent above the risk-schema ceiling", { ...ticker(validEpoch), priceChangePercent: "1000000.01" }],
    ["null optional", { ...ticker(validEpoch), quoteVolume: null }],
    ["empty optional", { ...ticker(validEpoch), highPrice: "" }],
    ["high below last price", { ...ticker(validEpoch), highPrice: "67999" }],
    ["low above last price", { ...ticker(validEpoch), lowPrice: "68001" }],
    ["invalid open range", { ...ticker(validEpoch), openPrice: "70000" }],
    ["non-integral trade count", { ...ticker(validEpoch), count: 1.5 }],
    ["non-decimal price syntax", { ...ticker(validEpoch), lastPrice: "0x10" }],
    ["unsafe numeric range", { ...ticker(validEpoch), quoteVolume: String(Number.MAX_SAFE_INTEGER + 1) }],
  ];
  for (const [label, primaryTicker] of toxicPrimaryCases) {
    const hedged = await runCase(validEpoch, { primaryPayload: [primaryTicker] });
    assert.ok(hedged.captures.calls.length >= 2, `${label}: a valid secondary must be attempted`);
    assert.match(hedged.output.source, /api-gcp\.binance\.com/, `${label}: toxic primary must not win`);
    assert.equal(hedged.output.rows[0].price, 68000);
    assert.equal(hedged.captures.riskInputs[0].volume24h, 42000000000);
  }

  await assert.rejects(
    () => runCase(validEpoch, {
      allPayload: [{ ...ticker(validEpoch), quoteVolume: "-1" }],
    }),
    /Binance fallback unavailable/,
    "a payload without one completely valid mapped row must fail closed",
  );

  const missingTicker = ticker("missing");
  const missing = await runCase("missing", { primaryPayload: [missingTicker] });
  assert.equal(missing.output.rows[0].observedAt, undefined, "missing provider time must remain missing");
  assert.equal(missing.captures.receiptInputs[0].observedAt, undefined);
  assert.match(missing.output.source, /api\.binance\.com/);

  const nullOptionals = await runCase(validEpoch, {
    primaryPayload: [{ symbol: "BTCUSDT", lastPrice: "68000", highPrice: null, lowPrice: "", quoteVolume: null, closeTime: validEpoch }],
  });
  assert.match(nullOptionals.output.source, /api-gcp\.binance\.com/);
  assert.equal(nullOptionals.output.rows[0].high24h, 69000);
  assert.equal(nullOptionals.output.rows[0].low24h, 66000);
  assert.equal(nullOptionals.output.rows[0].volume24h, 42000000000);

  const normalizedReceipt = valid.captures.receiptInputs[0].normalizedPayload;
  assert.equal(normalizedReceipt.lastPrice, 68000, "receipt must bind the normalized number");
  assert.equal(normalizedReceipt.quoteVolume, 42000000000);
  assert.equal(typeof normalizedReceipt.closeTime, "number");

  console.log("PASS hedged Binance fallback completes after primary-host failure");
  console.log("PASS malformed required and optional fields cannot win a valid hedge");
  console.log("PASS future/null/range/relationship/decimal adversarial rows fail closed before Promise.any");
  console.log("PASS payload eligibility requires at least one completely valid mapped row");
  console.log("PASS catalog order and 24h endpoints are not mislabeled as rank/7d history");
  console.log("PASS valid and missing provider timestamps preserve provenance");
  console.log("PASS receipts contain only normalized, bounded ticker values");
  console.log("PASS partial Binance evidence receipt is attached without commercial overclaim");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
