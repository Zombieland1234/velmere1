import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const MAX_FIXTURE_BYTES = 8 * 1024 * 1024;
const KLINE_RANGES = new Set(["1m", "15m", "1h", "4h", "1d", "7d", "1mo"]);
const FIXED_REFERENCE_EPOCH = "2026-08-01T00:00:00.000Z";
const FIXED_REFERENCE_EPOCH_MS = Date.parse(FIXED_REFERENCE_EPOCH);
const GENERATOR_ID = "a102r41-a45-deterministic-local-reference-fixture-v1";
const TRUTH_BOUNDARY = "Deterministic local UI reference fixture only; not current market data, provider truth, durable account data, staging evidence, LIVE evidence or sale-readiness evidence.";
const SAFE_ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" role="img" aria-label="Local reference icon"><rect width="64" height="64" rx="16" fill="#111827"/><path d="M18 20h28v6H18zm0 12h20v6H18zm0 12h14v6H18z" fill="#94a3b8"/></svg>';

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function assertRecord(value, id) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`a45_fixture_${id}_invalid`);
  return value;
}

function normalizeRelative(file, root) {
  const relative = path.relative(root, file).replaceAll("\\", "/");
  if (!relative || relative.startsWith("../") || path.isAbsolute(relative) || !relative.startsWith("artifacts/")) {
    throw new Error("a45_fixture_path_must_be_inside_artifacts");
  }
  return relative;
}

function assertFixturePathPhysicalContainment(root, absolutePath, includeLeaf) {
  const rootAbsolute = path.resolve(root);
  const relative = normalizeRelative(absolutePath, rootAbsolute);
  const parts = relative.split("/");
  const inspectedParts = includeLeaf ? parts : parts.slice(0, -1);
  let current = rootAbsolute;
  for (const part of inspectedParts) {
    current = path.join(current, part);
    if (!fs.existsSync(current)) continue;
    const metadata = fs.lstatSync(current);
    if (metadata.isSymbolicLink()) throw new Error("a45_fixture_reparse_component_forbidden");
    const finalPart = part === inspectedParts.at(-1);
    if (!finalPart && !metadata.isDirectory()) throw new Error("a45_fixture_parent_component_not_directory");
  }
  const rootReal = fs.realpathSync.native(rootAbsolute);
  const physicalTarget = fs.realpathSync.native(includeLeaf ? absolutePath : path.dirname(absolutePath));
  const physicalRelative = path.relative(rootReal, physicalTarget);
  if (!physicalRelative || physicalRelative.startsWith(`..${path.sep}`) || physicalRelative === ".." || path.isAbsolute(physicalRelative)) {
    if (!physicalRelative && includeLeaf) return relative;
    throw new Error("a45_fixture_physical_path_must_be_inside_root");
  }
  return relative;
}

function ensureFixtureParentDirectories(root, absolutePath) {
  const rootAbsolute = path.resolve(root);
  const rootMetadata = fs.lstatSync(rootAbsolute);
  if (!rootMetadata.isDirectory() || rootMetadata.isSymbolicLink()) throw new Error("a45_fixture_root_not_physical_directory");
  const rootReal = fs.realpathSync.native(rootAbsolute);
  const relative = normalizeRelative(absolutePath, rootAbsolute);
  const parentParts = relative.split("/").slice(0, -1);
  let current = rootAbsolute;
  for (const part of parentParts) {
    current = path.join(current, part);
    if (!fs.existsSync(current)) fs.mkdirSync(current);
    const metadata = fs.lstatSync(current);
    if (!metadata.isDirectory() || metadata.isSymbolicLink()) throw new Error("a45_fixture_reparse_component_forbidden");
    const physical = fs.realpathSync.native(current);
    const physicalRelative = path.relative(rootReal, physical);
    if (physicalRelative === ".." || physicalRelative.startsWith(`..${path.sep}`) || path.isAbsolute(physicalRelative)) throw new Error("a45_fixture_physical_path_must_be_inside_root");
  }
}

function referenceSeries(price, seed, points = 42) {
  return Array.from({ length: points }, (_, index) => {
    const wave = Math.sin((index + seed) / 4.1) * 0.018;
    const drift = ((index - Math.floor(points / 2)) / Math.max(1, points)) * (((seed % 7) - 3) * 0.0012);
    return Math.max(price * 0.01, price * (1 + wave + drift));
  });
}

function marketRow({ symbol, name, price, marketCap, volume24h, index }) {
  const priceChange1h = ((index % 9) - 4) * 0.18;
  const priceChange24h = ((index % 11) - 5) * 0.72;
  const priceChange7d = ((index % 13) - 6) * 1.35;
  const priceChange30d = ((index % 15) - 7) * 2.1;
  const sparkline7d = referenceSeries(price, index);
  const id = `local-reference-${symbol.toLowerCase()}`;
  return {
    id,
    rank: index + 1,
    symbol,
    name,
    image: `/market-logos/${symbol.toLowerCase()}.svg`,
    price,
    priceChange1h,
    priceChange24h,
    priceChange7d,
    priceChange30d,
    marketCap,
    volume24h,
    observedAt: FIXED_REFERENCE_EPOCH,
    sparkline7d,
    result: {
      token: { marketId: id, symbol, name, image: `/market-logos/${symbol.toLowerCase()}.svg`, rank: index + 1, assetClass: "crypto" },
      score: 0,
      confidence: 0,
      level: "low",
      badge: "low_detected_risk",
      signals: [],
      metrics: { currentPrice: price, marketCap, volume24h, priceChange1h, priceChange24h, priceChange7d, priceChange30d },
      dataQuality: "demo",
      chart: { sevenDay: sparkline7d },
      dataSources: [GENERATOR_ID],
      limitations: [
        "Local deterministic UI reference only.",
        "Values are illustrative and are not current market data.",
        "Risk, confidence, provider, LIVE and paid-delivery claims are withheld.",
      ],
      providerRiskDelivery: {
        schemaVersion: "pass6_provider_risk_delivery_v1",
        state: "withheld",
        scorePublished: false,
        canonicalIdentity: id,
        sourceReceiptRoot: "withheld_local_reference",
        receiptDigest: "withheld_local_reference",
        completenessBps: 0,
        sourceAsOf: null,
        blockers: ["local_reference_not_live", "provider_rights_not_verified"],
      },
      generatedAt: FIXED_REFERENCE_EPOCH,
    },
  };
}

function klineResponse(range, price, seed) {
  const intervalMs = {
    "1m": 60_000,
    "15m": 15 * 60_000,
    "1h": 60 * 60_000,
    "4h": 4 * 60 * 60_000,
    "1d": 24 * 60 * 60_000,
    "7d": 7 * 24 * 60 * 60_000,
    "1mo": 24 * 60 * 60_000,
  }[range];
  const points = referenceSeries(price, seed, 24);
  const candles = points.map((close, index) => {
    const open = index === 0 ? close : points[index - 1];
    const spread = Math.max(price * 0.0015, Math.abs(close - open));
    return {
      timestamp: FIXED_REFERENCE_EPOCH_MS - intervalMs * (points.length - index),
      open,
      high: Math.max(open, close) + spread,
      low: Math.max(price * 0.01, Math.min(open, close) - spread),
      close,
      volume: 10_000 + seed * 100 + index * 17,
    };
  });
  return {
    mode: "local_reference",
    freshness: "local_reference_not_live",
    source: "Velmere deterministic UI reference; illustrative fixed series; not current market data",
    range,
    candles,
    generatedAt: FIXED_REFERENCE_EPOCH,
    receivedAt: FIXED_REFERENCE_EPOCH,
    providerErrors: ["provider_rights_not_verified"],
    liveProven: false,
    saleEnabled: false,
  };
}

export function buildA45DeterministicQaFixture() {
  const marketSeeds = [
    { symbol: "BTC", name: "Bitcoin", price: 64_000, marketCap: 1_260_000_000_000, volume24h: 31_000_000_000 },
    { symbol: "ETH", name: "Ethereum", price: 3_300, marketCap: 397_000_000_000, volume24h: 18_000_000_000 },
    { symbol: "SOL", name: "Solana", price: 170, marketCap: 79_000_000_000, volume24h: 3_800_000_000 },
    { symbol: "BNB", name: "BNB", price: 590, marketCap: 87_000_000_000, volume24h: 1_900_000_000 },
    { symbol: "ADA", name: "Cardano", price: 0.42, marketCap: 15_000_000_000, volume24h: 420_000_000 },
    { symbol: "XRP", name: "XRP", price: 0.55, marketCap: 30_000_000_000, volume24h: 1_200_000_000 },
    { symbol: "DOGE", name: "Dogecoin", price: 0.13, marketCap: 19_000_000_000, volume24h: 900_000_000 },
    { symbol: "AVAX", name: "Avalanche", price: 32, marketCap: 12_500_000_000, volume24h: 380_000_000 },
  ];
  const catalogRows = [
    ["local-reference-aapl", "AAPL", "Apple Inc.", "stock", "NASDAQ reference lane"],
    ["local-reference-spy", "SPY", "SPDR S&P 500 ETF", "etf", "ETF reference lane"],
    ["local-reference-eurusd", "EUR/USD", "Euro / US Dollar", "fx", "FX reference lane"],
    ["local-reference-xauusd", "XAU/USD", "Gold / US Dollar", "commodity", "Commodity reference lane"],
    ["local-reference-dax", "^GDAXI", "DAX Index", "index", "Index reference lane"],
    ["local-reference-vnq", "VNQ", "Vanguard Real Estate ETF", "real_estate", "Real-estate reference lane"],
    ["local-reference-nyse", "NYSE", "New York Stock Exchange", "exchange", "Venue reference lane"],
  ].map(([id, symbol, name, assetClass, priceLane], index) => ({
    id,
    rank: index + 1,
    symbol,
    name,
    assetClass,
    priceLane,
    proofOrDisclosureLane: "Local UI fixture only; provider and commercial-rights evidence absent",
    riskPressure: 0,
    adapterState: "provider_required",
  }));
  return {
    schemaVersion: "velmere.a45.market-ui-fixture.v1",
    generatorId: GENERATOR_ID,
    generatedAt: FIXED_REFERENCE_EPOCH,
    truthBoundary: TRUTH_BOUNDARY,
    liveProven: false,
    saleEnabled: false,
    providerCredit: false,
    durableStorageCredit: false,
    realDataCredit: false,
    auth: {
      sessionResponse: {
        authenticated: false,
        session: null,
        refreshRequired: false,
        mode: "local_reference_anonymous_no_auth_credit",
      },
    },
    profile: {
      response: {
        profile: {
          displayName: "Local Reference Visitor",
          handle: "local.reference",
          bio: "Deterministic browser QA reference; no customer or durable profile data.",
          lastNameChange: FIXED_REFERENCE_EPOCH,
        },
        source: "local-preview",
        account: null,
        mode: "local_reference_no_durable_storage_credit",
      },
    },
    markets: {
      response: {
        mode: "partial",
        generatedAt: FIXED_REFERENCE_EPOCH,
        source: "Velmere deterministic local UI reference; not current market data",
        rows: marketSeeds.map((seed, index) => marketRow({ ...seed, index })),
        liveProven: false,
        saleEnabled: false,
      },
    },
    klines: {
      byRange: Object.fromEntries([...KLINE_RANGES].map((range, index) => [range, klineResponse(range, 64_000, index + 1)])),
    },
    realMarkets: {
      catalogResponse: {
        ok: true,
        responseGeneratedAt: FIXED_REFERENCE_EPOCH,
        catalogSnapshotAt: FIXED_REFERENCE_EPOCH,
        catalogDataMode: "STATIC_REFERENCE_UNIVERSE",
        fixtureDataMode: "LOCAL_REFERENCE_FIXTURE_NOT_PROVIDER_TRUTH",
        liveDataIncluded: false,
        commercialRightsVerified: false,
        schemaVersion: "real_markets_catalog_v3",
        counts: {
          total: catalogRows.length,
          uniqueSymbols: catalogRows.length,
          inheritedRowsCollapsed: 0,
          stocks: 1,
          fx: 1,
          etf: 1,
          commodities: 1,
          realEstate: 1,
          crypto: 0,
          exchangeTokens: 0,
          indices: 1,
          exchanges: 1,
        },
        rows: catalogRows,
      },
      searchResults: catalogRows.map((row) => ({
        symbol: row.symbol,
        name: row.name,
        exchange: row.priceLane,
        quoteType: row.assetClass.toUpperCase(),
      })),
      quoteTemplate: {
        state: "unavailable",
        source: "Velmere local reference fixture; not provider truth",
        sourceTimestamp: null,
        exchange: null,
        currency: null,
        currentPrice: null,
        changePercent: null,
        candles: [],
        truthState: "source_required",
        providerStatus: "not_configured",
        missingReason: "LOCAL_REFERENCE_FIXTURE_NOT_PROVIDER_TRUTH",
        freshnessState: "missing",
        consensusState: "unavailable",
        confidenceCap: 0,
        providerPlan: [],
        providerFunctions: [],
        providerEvidence: [],
        docs: [],
        consensusNotes: [],
      },
    },
  };
}

export function generateA45QaFixture(root, configuredPath) {
  const value = String(configuredPath ?? "").trim();
  if (!value) throw new Error("a45_fixture_generation_path_required");
  const absolutePath = path.resolve(root, value);
  const relativePath = normalizeRelative(absolutePath, root);
  const fixture = buildA45DeterministicQaFixture();
  const bytes = Buffer.from(`${JSON.stringify(fixture, null, 2)}\n`, "utf8");
  if (bytes.length > MAX_FIXTURE_BYTES) throw new Error("a45_fixture_generation_budget_invalid");
  ensureFixtureParentDirectories(root, absolutePath);
  assertFixturePathPhysicalContainment(root, absolutePath, false);
  const descriptor = fs.openSync(absolutePath, "wx");
  try {
    fs.writeFileSync(descriptor, bytes);
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
  assertFixturePathPhysicalContainment(root, absolutePath, true);
  return { created: true, generatorId: GENERATOR_ID, absolutePath, relativePath, byteLength: bytes.length, sha256: sha256(bytes) };
}

export function loadA45QaFixture(root, configuredPath) {
  const value = String(configuredPath ?? "").trim();
  if (!value) return null;
  const absolutePath = path.resolve(root, value);
  const relativePath = normalizeRelative(absolutePath, root);
  assertFixturePathPhysicalContainment(root, absolutePath, true);
  const stat = fs.lstatSync(absolutePath);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size < 2 || stat.size > MAX_FIXTURE_BYTES) throw new Error("a45_fixture_file_budget_invalid");
  const bytes = fs.readFileSync(absolutePath);
  const fixture = assertRecord(JSON.parse(bytes.toString("utf8")), "root");
  if (fixture.schemaVersion !== "velmere.a45.market-ui-fixture.v1" || fixture.generatorId !== GENERATOR_ID) throw new Error("a45_fixture_schema_invalid");
  if (fixture.liveProven !== false || fixture.saleEnabled !== false || fixture.providerCredit !== false || fixture.durableStorageCredit !== false || fixture.realDataCredit !== false) {
    throw new Error("a45_fixture_truth_boundary_invalid");
  }
  if (typeof fixture.truthBoundary !== "string" || !fixture.truthBoundary.includes("not current market data")) {
    throw new Error("a45_fixture_truth_label_invalid");
  }
  const auth = assertRecord(fixture.auth, "auth");
  const sessionResponse = assertRecord(auth.sessionResponse, "auth_session_response");
  if (sessionResponse.authenticated !== false || sessionResponse.session !== null) throw new Error("a45_fixture_auth_truth_boundary_invalid");
  const profile = assertRecord(fixture.profile, "profile");
  const profileResponse = assertRecord(profile.response, "profile_response");
  if (profileResponse.source !== "local-preview" || profileResponse.account !== null) throw new Error("a45_fixture_profile_truth_boundary_invalid");
  const markets = assertRecord(fixture.markets, "markets");
  const marketResponse = assertRecord(markets.response, "markets_response");
  if (marketResponse.mode !== "partial" || marketResponse.liveProven !== false || marketResponse.saleEnabled !== false) {
    throw new Error("a45_fixture_markets_truth_boundary_invalid");
  }
  if (!Array.isArray(marketResponse.rows) || marketResponse.rows.length < 1 || marketResponse.rows.length >= 250) {
    throw new Error("a45_fixture_markets_rows_invalid");
  }
  const klines = assertRecord(fixture.klines, "klines");
  const byRange = assertRecord(klines.byRange, "klines_ranges");
  for (const range of KLINE_RANGES) {
    const response = assertRecord(byRange[range], `kline_${range}`);
    if (response.mode !== "local_reference" || response.liveProven !== false || response.saleEnabled !== false) {
      throw new Error(`a45_fixture_kline_truth_boundary_invalid:${range}`);
    }
    if (!Array.isArray(response.candles) || response.candles.length < 2 || response.candles.length > 500) {
      throw new Error(`a45_fixture_kline_candles_invalid:${range}`);
    }
  }
  const realMarkets = assertRecord(fixture.realMarkets, "real_markets");
  const catalogResponse = assertRecord(realMarkets.catalogResponse, "real_markets_catalog");
  const quoteTemplate = assertRecord(realMarkets.quoteTemplate, "real_markets_quote_template");
  if (catalogResponse.ok !== true || catalogResponse.liveDataIncluded !== false || catalogResponse.commercialRightsVerified !== false || !Array.isArray(catalogResponse.rows) || catalogResponse.rows.length < 1) {
    throw new Error("a45_fixture_real_markets_catalog_invalid");
  }
  if (quoteTemplate.state !== "unavailable" || quoteTemplate.sourceTimestamp !== null || quoteTemplate.currentPrice !== null || !Array.isArray(quoteTemplate.candles) || quoteTemplate.candles.length !== 0) {
    throw new Error("a45_fixture_real_markets_quote_truth_boundary_invalid");
  }
  return { absolutePath, relativePath, sha256: sha256(bytes), fixture };
}

function jsonHeaders(extra = {}) {
  return {
    "cache-control": "no-store, max-age=0",
    "content-type": "application/json; charset=utf-8",
    "x-content-type-options": "nosniff",
    "x-velmere-a45-fixture": "fixture-only-no-live-credit",
    ...extra,
  };
}

function imageHeaders() {
  return {
    "cache-control": "no-store, max-age=0",
    "content-type": "image/svg+xml; charset=utf-8",
    "content-security-policy": "default-src 'none'; sandbox",
    "x-content-type-options": "nosniff",
    "x-velmere-a45-fixture": "presentation-only-no-provider-credit",
  };
}

function unavailableRealMarketsQuote(template, symbol, range) {
  const normalized = String(symbol ?? "").trim().toUpperCase().slice(0, 80);
  return {
    ...template,
    id: `local-reference-${normalized.toLowerCase().replace(/[^a-z0-9]+/gu, "-")}`,
    symbol: normalized,
    pass2808ChartReceipt: {
      schemaVersion: "pass2808_chart_receipt_v1",
      status: "skeleton_required",
      range,
      candleCount: 0,
      source: "Velmere local fixture guard",
      sourceTimestamp: null,
      confidence: 0,
      rule: "No provider receipt; render a neutral skeleton.",
    },
  };
}

export function createA45QaFixtureUsage(loaded, generation = null) {
  return {
    enabled: Boolean(loaded),
    generated: generation?.created === true,
    generatorId: loaded?.fixture.generatorId ?? generation?.generatorId ?? null,
    fixtureRelativePath: loaded?.relativePath ?? null,
    fixtureSha256: loaded?.sha256 ?? null,
    fixtureByteLength: loaded ? fs.statSync(loaded.absolutePath).size : null,
    truthBoundary: loaded?.fixture.truthBoundary ?? null,
    liveProven: false,
    saleEnabled: false,
    providerCredit: false,
    durableStorageCredit: false,
    realDataCredit: false,
    requests: {
      authSession: 0,
      profile: 0,
      markets: 0,
      klines: 0,
      marketIntelligence: 0,
      realMarketsCatalog: 0,
      realMarkets: 0,
      assetLogo: 0,
      brandIcon: 0,
      icon: 0,
    },
  };
}

export async function installA45QaFixtureRoutes(context, loaded, usage) {
  if (!loaded) return;
  const fixture = loaded.fixture;
  await context.route("**/api/auth/session", async (route) => {
    const request = route.request();
    if (request.method() !== "GET") return route.continue();
    usage.requests.authSession += 1;
    await route.fulfill({ status: 200, headers: jsonHeaders(), body: JSON.stringify(fixture.auth.sessionResponse) });
  });
  await context.route("**/api/profile", async (route) => {
    const request = route.request();
    if (request.method() !== "GET") return route.continue();
    usage.requests.profile += 1;
    await route.fulfill({ status: 200, headers: jsonHeaders(), body: JSON.stringify(fixture.profile.response) });
  });
  await context.route("**/api/market-integrity/markets?*", async (route) => {
    const request = route.request();
    if (request.method() !== "GET") return route.continue();
    const url = new URL(request.url());
    const page = Number(url.searchParams.get("page") || "1");
    const response = page === 1 ? fixture.markets.response : { ...fixture.markets.response, rows: [], generatedAt: fixture.generatedAt };
    usage.requests.markets += 1;
    await route.fulfill({ status: 200, headers: jsonHeaders(), body: JSON.stringify(response) });
  });
  await context.route("**/api/market-integrity/klines?*", async (route) => {
    const request = route.request();
    if (request.method() !== "GET") return route.continue();
    const url = new URL(request.url());
    const range = url.searchParams.get("range") || "7d";
    const response = KLINE_RANGES.has(range) ? fixture.klines.byRange[range] : null;
    if (!response) {
      await route.fulfill({ status: 400, headers: jsonHeaders(), body: JSON.stringify({ mode: "error", error: "a45_fixture_range_unsupported" }) });
      return;
    }
    usage.requests.klines += 1;
    await route.fulfill({ status: 200, headers: jsonHeaders(), body: JSON.stringify(response) });
  });
  await context.route("**/api/market-integrity/market-intelligence", async (route) => {
    const request = route.request();
    if (request.method() !== "POST") return route.continue();
    let body;
    try { body = JSON.parse(request.postData() || "{}"); } catch { body = {}; }
    const assetKey = String(body.assetKey ?? "").trim().toUpperCase().replace(/\s+/gu, "").slice(0, 120);
    const depth = body.depth === "pro" ? "pro" : "basic";
    const surface = body.surface === "real_markets" ? "real_markets" : "shield";
    usage.requests.marketIntelligence += 1;
    await route.fulfill({
      status: 200,
      headers: jsonHeaders({ "x-velmere-market-intelligence-depth": depth }),
      body: JSON.stringify({
        ok: false,
        mode: "reference",
        error: "a45_fixture_market_intelligence_withheld",
        depth,
        surface,
        assetKey,
        publication: {
          mode: "withheld",
          evidenceState: "fixture_only",
          liveClaimed: false,
          blockers: ["a45_fixture_only", "local_reference_not_live", "provider_rights_not_verified"],
        },
      }),
    });
  });
  await context.route("**/api/market-integrity/real-markets/catalog", async (route) => {
    const request = route.request();
    if (request.method() !== "GET") return route.continue();
    usage.requests.realMarketsCatalog += 1;
    await route.fulfill({ status: 200, headers: jsonHeaders(), body: JSON.stringify(fixture.realMarkets.catalogResponse) });
  });
  await context.route("**/api/market-integrity/real-markets?*", async (route) => {
    const request = route.request();
    if (request.method() !== "GET") return route.continue();
    const url = new URL(request.url());
    const query = String(url.searchParams.get("q") ?? "").trim().toLowerCase();
    usage.requests.realMarkets += 1;
    if (query) {
      const results = fixture.realMarkets.searchResults.filter((row) => `${row.symbol} ${row.name}`.toLowerCase().includes(query));
      await route.fulfill({ status: 200, headers: jsonHeaders(), body: JSON.stringify({ ok: true, generatedAt: fixture.generatedAt, dataMode: "LOCAL_REFERENCE_FIXTURE_NOT_PROVIDER_TRUTH", results }) });
      return;
    }
    const symbols = String(url.searchParams.get("symbols") ?? "")
      .split(",")
      .map((symbol) => symbol.trim().toUpperCase())
      .filter(Boolean)
      .slice(0, 64);
    const range = String(url.searchParams.get("range") ?? "1w").slice(0, 12);
    const quotes = symbols.map((symbol) => unavailableRealMarketsQuote(fixture.realMarkets.quoteTemplate, symbol, range));
    await route.fulfill({ status: 200, headers: jsonHeaders(), body: JSON.stringify({ ok: true, generatedAt: fixture.generatedAt, dataMode: "LOCAL_REFERENCE_FIXTURE_NOT_PROVIDER_TRUTH", quotes }) });
  });
  for (const [pattern, requestKey] of [
    ["**/api/market-integrity/asset-logo?*", "assetLogo"],
    ["**/api/market-integrity/brand-icon?*", "brandIcon"],
    ["**/api/market-integrity/icon?*", "icon"],
  ]) {
    await context.route(pattern, async (route) => {
      const request = route.request();
      if (request.method() !== "GET") return route.continue();
      usage.requests[requestKey] += 1;
      await route.fulfill({ status: 200, headers: imageHeaders(), body: SAFE_ICON_SVG });
    });
  }
}
