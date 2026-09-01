const assert = require("node:assert/strict");
const fs = require("node:fs");
const { loadTypeScript } = require("../lib/load-typescript.cjs");

const ts = loadTypeScript();
const GLOBAL_KEY = "__velmereMarketSnapshotCachePass4826";

function canonicalJson(value, seen = new WeakSet()) {
  if (typeof value === "undefined") return "undefined";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (seen.has(value)) throw new Error("canonical_json_cycle");
  seen.add(value);
  try {
    if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item, seen)).join(",")}]`;
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key], seen)}`).join(",")}}`;
  } finally {
    seen.delete(value);
  }
}

function compile() {
  const source = fs.readFileSync("lib/market-integrity/market-snapshot-cache.ts", "utf8");
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
    if (id === "node:crypto") return require("node:crypto");
    if (id === "@/lib/security/canonical-json") return { canonicalJson };
    if (id === "@/lib/network/fetch-with-deadline") {
      return {
        readJsonResponseBounded: async (response) => response.json(),
        readTextResponseBounded: async (response) => response.text(),
      };
    }
    if (id === "@/lib/network/brokered-egress") {
      return { brokeredConfiguredOriginFetch: (url, init) => global.fetch(url, init) };
    }
    throw new Error(`unexpected require: ${id}`);
  };
  new Function("require", "module", "exports", result.outputText)(localRequire, module, module.exports);
  return module.exports;
}

function marketRow(overrides = {}) {
  const generatedAt = overrides.generatedAt || new Date().toISOString();
  return {
    id: "bitcoin",
    rank: 1,
    symbol: "BTC",
    name: "Bitcoin",
    price: 67_000,
    marketCap: 1_300_000_000_000,
    volume24h: 42_000_000_000,
    observedAt: generatedAt,
    sparkline7d: [65_000, 66_000, 67_000],
    result: {
      score: 18,
      level: "low",
      badge: "low_detected_risk",
      token: { marketId: "bitcoin", symbol: "BTC", name: "Bitcoin" },
      metrics: { currentPrice: 67_000, marketCap: 1_300_000_000_000, volume24h: 42_000_000_000 },
      signals: [],
      confidence: 0.86,
      dataQuality: "live",
      dataSources: ["CoinGecko markets"],
      chart: { sevenDay: [65_000, 66_000, 67_000] },
      generatedAt,
    },
    ...overrides,
  };
}

function clearMemory() {
  delete globalThis[GLOBAL_KEY];
}

async function run() {
  const originalFetch = global.fetch;
  const originalUrl = process.env.SUPABASE_URL;
  const originalPublicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    delete process.env.SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    clearMemory();

    const memoryModule = compile();
    const memoryReceipt = await memoryModule.persistMarketSnapshot({
      page: 1,
      perPage: 100,
      source: "CoinGecko markets · verified test",
      rows: [marketRow()],
    });
    assert.equal(memoryReceipt.stored, true);
    assert.equal(memoryReceipt.mode, "memory");
    assert.equal(memoryReceipt.durableConfigured, false);
    assert.match(memoryReceipt.payloadHash, /^[a-f0-9]{64}$/);
    const memoryRead = memoryModule.readMarketSnapshot({ page: 1, perPage: 100 });
    assert.equal(memoryRead?.readMode, "memory");
    assert.equal(memoryRead?.rows[0]?.symbol, "BTC");

    const memoryState = globalThis[GLOBAL_KEY];
    memoryState.entries.get("1:100").rows[0].price = 1;
    assert.equal(memoryModule.readMarketSnapshot({ page: 1, perPage: 100 }), null, "tampered memory snapshot must fail closed");

    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test-secret-not-public";
    clearMemory();
    let storedRow = null;
    global.fetch = async (url, init = {}) => {
      if (init.method === "POST") {
        storedRow = JSON.parse(init.body);
        return new Response("", { status: 201 });
      }
      if (String(url).includes("/rest/v1/velmere_market_snapshots?")) {
        return Response.json(storedRow ? [storedRow] : []);
      }
      throw new Error(`unexpected URL ${url}`);
    };

    const durableModule = compile();
    const generatedAt = new Date().toISOString();
    const durableReceipt = await durableModule.persistMarketSnapshot({
      page: 1,
      perPage: 100,
      source: "CoinGecko markets · verified durable test",
      generatedAt,
      rows: [marketRow({ generatedAt })],
    });
    assert.equal(durableReceipt.mode, "memory_and_supabase");
    assert.equal(durableReceipt.durableStored, true);
    assert.equal(storedRow.row_count, 1);
    assert.equal(storedRow.snapshot_key, "1:100");

    clearMemory();
    const readerModule = compile();
    const durableRead = await readerModule.readMarketSnapshotWithDurable({ page: 1, perPage: 100 });
    assert.equal(durableRead?.readMode, "supabase");
    assert.equal(durableRead?.payloadHash, storedRow.payload_hash);
    assert.equal(durableRead?.rows[0]?.id, "bitcoin");

    clearMemory();
    storedRow.rows[0].price = 2;
    const tamperModule = compile();
    assert.equal(
      await tamperModule.readMarketSnapshotWithDurable({ page: 1, perPage: 100 }),
      null,
      "tampered durable snapshot must fail closed",
    );

    const restoredRow = marketRow({ generatedAt });
    storedRow.rows = [restoredRow];
    storedRow.payload_hash = durableReceipt.payloadHash;
    storedRow.stored_at = new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString();
    storedRow.expires_at = new Date(Date.now() - 60_000).toISOString();
    clearMemory();
    const expiredModule = compile();
    assert.equal(
      await expiredModule.readMarketSnapshotWithDurable({ page: 1, perPage: 100 }),
      null,
      "expired durable snapshot must not be served",
    );

    storedRow.stored_at = new Date().toISOString();
    storedRow.expires_at = new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString();
    clearMemory();
    assert.equal(
      await compile().readMarketSnapshotWithDurable({ page: 1, perPage: 100 }),
      null,
      "durable TTL above the 24-hour contract must fail closed",
    );

    storedRow.stored_at = new Date(Date.now() + 10 * 60_000).toISOString();
    storedRow.expires_at = new Date(Date.now() + 60 * 60_000).toISOString();
    clearMemory();
    assert.equal(
      await compile().readMarketSnapshotWithDurable({ page: 1, perPage: 100 }),
      null,
      "future-dated durable storage metadata must fail closed",
    );

    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    clearMemory();
    const validationModule = compile();
    const malformed = marketRow({ price: Number.NaN });
    const malformedReceipt = await validationModule.persistMarketSnapshot({
      page: 1,
      perPage: 100,
      source: "malformed-test",
      rows: [malformed],
    });
    assert.equal(malformedReceipt.stored, false);
    const futureReceipt = await validationModule.persistMarketSnapshot({
      page: 1,
      perPage: 100,
      source: "future-test",
      generatedAt: new Date(Date.now() + 10 * 60_000).toISOString(),
      rows: [marketRow()],
    });
    assert.equal(futureReceipt.stored, false);
    const missingSignals = marketRow();
    delete missingSignals.result.signals;
    assert.equal((await validationModule.persistMarketSnapshot({
      page: 1,
      perPage: 100,
      source: "missing-signals-test",
      rows: [missingSignals],
    })).stored, false, "result without required signals must fail closed");
    const mismatchedIdentity = marketRow();
    mismatchedIdentity.result.token.symbol = "ETH";
    assert.equal((await validationModule.persistMarketSnapshot({
      page: 1,
      perPage: 100,
      source: "identity-mismatch-test",
      rows: [mismatchedIdentity],
    })).stored, false, "row/result identity mismatch must fail closed");
    const mismatchedBadge = marketRow();
    mismatchedBadge.result.badge = "critical_market_integrity_risk";
    assert.equal((await validationModule.persistMarketSnapshot({
      page: 1,
      perPage: 100,
      source: "badge-level-mismatch-test",
      rows: [mismatchedBadge],
    })).stored, false, "score, level and badge mismatch must fail closed");
    const missingMarketId = marketRow();
    delete missingMarketId.result.token.marketId;
    assert.equal((await validationModule.persistMarketSnapshot({
      page: 1,
      perPage: 100,
      source: "missing-market-id-test",
      rows: [missingMarketId],
    })).stored, false, "unbound row/result market identity must fail closed");
    assert.equal((await validationModule.persistMarketSnapshot({
      page: 1,
      perPage: 100,
      source: "duplicate-row-test",
      rows: [marketRow(), marketRow()],
    })).stored, false, "duplicate market identities must fail closed");
    const elevenRows = Array.from({ length: 11 }, (_, index) => {
      const row = marketRow({
        id: `asset-${index}`,
        symbol: `A${index}`,
        name: `Asset ${index}`,
      });
      row.result.token.marketId = row.id;
      row.result.token.symbol = row.symbol;
      row.result.token.name = row.name;
      return row;
    });
    assert.equal((await validationModule.persistMarketSnapshot({
      page: 1,
      perPage: 10,
      source: "row-count-over-page-test",
      rows: elevenRows,
    })).stored, false, "row count above the canonical page bucket must fail closed");
    assert.equal((await validationModule.persistMarketSnapshot({
      page: 1,
      perPage: 99,
      source: "noncanonical-bucket-test",
      rows: [marketRow()],
    })).stored, false, "noncanonical per-page keys must not expand durable cardinality");
    assert.equal((await validationModule.persistMarketSnapshot({
      page: 21,
      perPage: 100,
      source: "page-cap-test",
      rows: [marketRow()],
    })).stored, false, "pages above the durable retention cap must fail closed");

    console.log("PASS memory market snapshot integrity and clone boundary");
    console.log("PASS Supabase durable market snapshot cold-start read");
    console.log("PASS tamper, expiry, strict result, identity, coordinate and future-date rejection");
    console.log("PASS service-role-only durable adapter contract");
  } finally {
    global.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = originalUrl;
    if (originalPublicUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL; else process.env.NEXT_PUBLIC_SUPABASE_URL = originalPublicUrl;
    if (originalKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
    clearMemory();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
