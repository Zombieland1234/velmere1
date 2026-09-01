import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { readCurrentConsolidatedRoute } from "../lib/current-route-contract";
import { GET as getMarkets } from "@/lib/server/market-integrity-route-modules/markets";
import {
  buildMarketRowDeliveryReceipt,
  gateMarketRowsForDelivery,
  projectMarketRowForDelivery,
  applyMarketRowRiskDeliveryFirewall,
  withholdProviderRiskResult,
} from "../../lib/market-integrity/market-row-delivery-gate";
import {
  buildMarketRowEvidencePayload,
} from "../../lib/market-integrity/market-row-evidence-payload";
import {
  coinToMarketRow,
  type MarketIntegrityRow,
} from "../../lib/market-integrity/coingecko";
import {
  attachPass4644ProviderReceipts,
  createPass4644ProviderEvidenceReceipt,
} from "../../lib/market-integrity/provider-evidence-receipt";
import { withPass4825BrokeredEgressTestTransport } from "../../lib/network/brokered-egress";

let assertions = 0;
function check(condition: unknown, message: string) {
  assertions += 1;
  assert.ok(condition, message);
}
function equal(actual: unknown, expected: unknown, message: string) {
  assertions += 1;
  assert.equal(actual, expected, message);
}

const projectionEnv = {
  NODE_ENV: "test",
  VELMERE_SOURCE_RECEIPT_PROJECTION_SECRET_CURRENT: "pass6-market-risk-projection-secret-current-0001",
  VELMERE_SOURCE_RECEIPT_PROJECTION_KEY_ID_CURRENT: "market-risk-current",
};

function fixtureRow(observedAt: string): MarketIntegrityRow {
  return coinToMarketRow({
    id: "bitcoin",
    symbol: "btc",
    name: "Bitcoin",
    image: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png",
    current_price: 63_250.25,
    market_cap: 1_250_000_000_000,
    market_cap_rank: 1,
    fully_diluted_valuation: 1_330_000_000_000,
    total_volume: 38_000_000_000,
    high_24h: 64_100,
    low_24h: 61_800,
    price_change_percentage_1h_in_currency: 0.4,
    price_change_percentage_24h_in_currency: 2.1,
    price_change_percentage_7d_in_currency: -1.8,
    price_change_percentage_14d_in_currency: 4.7,
    price_change_percentage_30d_in_currency: 9.2,
    circulating_supply: 19_800_000,
    total_supply: 19_800_000,
    max_supply: 21_000_000,
    ath: 73_737,
    ath_change_percentage: -14.2,
    ath_date: "2024-03-14T07:10:36.635Z",
    last_updated: observedAt,
    sparkline_in_7d: { price: [61_000, 62_000, 61_500, 63_250.25] },
  });
}

function attachCoinGeckoReceipt(args: {
  row: MarketIntegrityRow;
  observedAt: string;
  receivedAt: string;
  requestedIdentity?: string;
  ttlMs?: number;
}) {
  attachPass4644ProviderReceipts(args.row.result, [createPass4644ProviderEvidenceReceipt({
    providerId: "coingecko",
    providerFamily: "market_data",
    surface: "crypto",
    verification: "normalized_response",
    requestedIdentity: args.requestedIdentity ?? args.row.id,
    resolvedSymbol: args.row.symbol,
    resolvedMarketId: args.row.id,
    identityMatched: true,
    capabilities: ["identity", "price", "market_cap", "volume", "history", "supply"],
    timestampProvenance: "provider",
    observedAt: args.observedAt,
    receivedAt: args.receivedAt,
    ttlMs: args.ttlMs ?? 3 * 60_000,
    httpStatus: 200,
    latencyMs: 42,
    normalizedPayload: buildMarketRowEvidencePayload(args.row),
  })]);
  return args.row;
}

async function main() {
  const generatedAt = "2026-07-18T10:00:20.000Z";
  const observedAt = "2026-07-18T10:00:10.000Z";
  const receivedAt = "2026-07-18T10:00:12.000Z";

  const validRow = attachCoinGeckoReceipt({
    row: fixtureRow(observedAt),
    observedAt,
    receivedAt,
  });
  const valid = buildMarketRowDeliveryReceipt({
    row: validRow,
    generatedAt,
    projectionEnv,
  });
  equal(valid.state, "verified", "complete Basic row must pass");
  equal(valid.completenessBps, 10_000, "complete Basic row must be 10000/10000");
  equal(valid.risk.state, "verified", "risk must pass only after deterministic recomputation");
  equal(valid.risk.score, validRow.result.score, "published score must equal recomputed score");
  check(Boolean(valid.risk.derivationDigest?.startsWith("sha256:")), "derivation digest required");
  check(Boolean(valid.sourceReceiptRoot.startsWith("sha256:")), "source receipt root required");
  equal(valid.fields["market.price"].state, "verified", "price exact field hash must pass");
  equal(valid.fields["market.price"].sourceAsOf, observedAt, "provider sourceAsOf must be retained");
  check(Boolean(valid.fields["market.price"].receiptId), "per-field receipt id required");
  equal(valid.fields["risk.score"].required, true, "risk is a required delivery field");

  const projected = projectMarketRowForDelivery(validRow, valid, generatedAt);
  equal(projected.result.score, validRow.result.score, "verified projection publishes score");
  equal(projected.result.dataSources[0], "coingecko", "source labels are replaced by verified provider IDs");
  equal(projected.price, validRow.price, "verified price is projected");
  equal("memory" in projected, false, "unbound history memory is not projected");

  const noKey = buildMarketRowDeliveryReceipt({
    row: validRow,
    generatedAt,
    projectionEnv: { NODE_ENV: "production" },
  });
  equal(noKey.state, "withheld", "production without current signing key must fail closed");
  equal(noKey.risk.score, null, "unsigned score must be null");
  equal(noKey.fields["market.price"].state, "unsigned", "unsigned raw field must be explicit");
  check(noKey.blockers.some((blocker) => blocker.includes("signing_key")), "missing signing key blocker required");

  const previousOnly = buildMarketRowDeliveryReceipt({
    row: validRow,
    generatedAt,
    projectionEnv: {
      NODE_ENV: "production",
      VELMERE_SOURCE_RECEIPT_PROJECTION_SECRET_PREVIOUS: "pass6-previous-only-key-must-not-authorize-0001",
      VELMERE_SOURCE_RECEIPT_PROJECTION_KEY_ID_PREVIOUS: "previous-only",
    },
  });
  equal(previousOnly.state, "withheld", "previous-only production keyring must fail closed");
  equal(previousOnly.projectionSigningReady, false, "current key is mandatory in production");

  const tamperedValueRow = attachCoinGeckoReceipt({
    row: fixtureRow(observedAt),
    observedAt,
    receivedAt,
  });
  tamperedValueRow.price = Number(tamperedValueRow.price) + 100;
  const tamperedValue = buildMarketRowDeliveryReceipt({
    row: tamperedValueRow,
    generatedAt,
    projectionEnv,
  });
  equal(tamperedValue.fields["market.price"].state, "field_mismatch", "row mutation must break exact field binding");
  equal(tamperedValue.risk.score, null, "field mutation must withhold score");
  const tamperedProjection = projectMarketRowForDelivery(tamperedValueRow, tamperedValue, generatedAt);
  equal(tamperedProjection.price, undefined, "mutated price must not be projected");
  equal(tamperedProjection.result.score, null, "mutated row risk must be null");

  const tamperedScoreRow = attachCoinGeckoReceipt({
    row: fixtureRow(observedAt),
    observedAt,
    receivedAt,
  });
  tamperedScoreRow.result.score += 7;
  const tamperedScore = buildMarketRowDeliveryReceipt({
    row: tamperedScoreRow,
    generatedAt,
    projectionEnv,
  });
  equal(tamperedScore.risk.state, "derivation_mismatch", "tampered score must fail recomputation");
  equal(tamperedScore.risk.score, null, "tampered score must not publish");

  const staleRow = attachCoinGeckoReceipt({
    row: fixtureRow("2026-07-18T09:40:00.000Z"),
    observedAt: "2026-07-18T09:40:00.000Z",
    receivedAt: "2026-07-18T09:40:02.000Z",
    ttlMs: 60_000,
  });
  const stale = buildMarketRowDeliveryReceipt({ row: staleRow, generatedAt, projectionEnv });
  equal(stale.state, "withheld", "expired last-known-good receipt must be withheld");
  equal(stale.risk.state, "stale", "expired receipt state must be stale");
  equal(stale.risk.score, null, "expired receipt may not rank");

  const wrongIdentityRow = attachCoinGeckoReceipt({
    row: fixtureRow(observedAt),
    observedAt,
    receivedAt,
    requestedIdentity: "ethereum",
  });
  const wrongIdentity = buildMarketRowDeliveryReceipt({ row: wrongIdentityRow, generatedAt, projectionEnv });
  equal(wrongIdentity.state, "withheld", "wrong requested identity must fail closed");
  equal(wrongIdentity.risk.score, null, "identity mismatch score must be null");

  const pro = buildMarketRowDeliveryReceipt({
    row: validRow,
    tier: "pro",
    generatedAt,
    projectionEnv,
  });
  equal(pro.state, "withheld", "one upstream cannot satisfy Pro quorum");
  equal(pro.fields["market.price"].state, "quorum_shortfall", "Pro per-field quorum must be explicit");
  equal(pro.risk.score, null, "Pro score requires two exact independent upstreams");

  const batch = gateMarketRowsForDelivery({
    rows: [validRow, staleRow],
    generatedAt,
    projectionEnv,
  });
  equal(batch.state, "withheld", "aggregate state must reflect the worst required row");
  equal(batch.verifiedRows, 1, "one of two rows should pass");
  equal(batch.riskVerifiedRows, 1, "only one row may enter ranking");
  check(batch.completenessBps < 10_000, "partial batch completeness must be below 10000");

  const firewallRow = attachCoinGeckoReceipt({
    row: fixtureRow(observedAt),
    observedAt,
    receivedAt,
  });
  const firewall = applyMarketRowRiskDeliveryFirewall({
    row: firewallRow,
    generatedAt,
    projectionEnv: { NODE_ENV: "production" },
  });
  equal(firewall.state, "withheld", "shared adapter firewall must withhold without key");
  equal(firewallRow.result.score, null, "shared provider result score must become null");
  equal(firewallRow.result.providerRiskDelivery?.state, "withheld", "shared result needs explicit delivery state");
  equal(firewallRow.result.providerRiskDelivery?.scorePublished, false, "shared result must declare score unpublished");
  equal(firewallRow.result.dataSources.length, 0, "labels must not survive as evidence after withholding");

  const genericWithheld = fixtureRow(observedAt).result;
  withholdProviderRiskResult({
    result: genericWithheld,
    canonicalIdentity: "symbol:btc",
    generatedAt,
    blockers: ["provider_timestamp_provenance_not_available"],
  });
  equal(genericWithheld.score, null, "non-eligible shared adapter result must publish null score");
  equal(genericWithheld.providerRiskDelivery?.state, "withheld", "non-eligible shared adapter must expose delivery state");

  const oversized = await getMarkets(new Request(`https://velmere.test/api/market-integrity/markets?${"x".repeat(2_100)}`));
  equal(oversized.status, 414, "oversized market URL must be rejected");
  const duplicated = await getMarkets(new Request("https://velmere.test/api/market-integrity/markets?page=1&page=1"));
  equal(duplicated.status, 400, "duplicate coordinates must be rejected");
  const paidBatch = await getMarkets(new Request("https://velmere.test/api/market-integrity/markets?tier=pro"));
  equal(paidBatch.status, 402, "paid batch tier must require the server-authorized analysis path");
  const paidPayload = await paidBatch.json() as { tierState?: { deliveredTier?: unknown; entitlementVerified?: unknown } };
  equal(paidPayload.tierState?.deliveredTier, null, "server must not pretend paid tier activation");
  equal(paidPayload.tierState?.entitlementVerified, false, "server must not pretend entitlement");

  const currentSecret = process.env.VELMERE_SOURCE_RECEIPT_PROJECTION_SECRET_CURRENT;
  const currentKeyId = process.env.VELMERE_SOURCE_RECEIPT_PROJECTION_KEY_ID_CURRENT;
  const providerNow = new Date().toISOString();
  const providerPayload = [{
    id: "bitcoin",
    symbol: "btc",
    name: "Bitcoin",
    current_price: 63_250.25,
    market_cap: 1_250_000_000_000,
    market_cap_rank: 1,
    fully_diluted_valuation: 1_330_000_000_000,
    total_volume: 38_000_000_000,
    high_24h: 64_100,
    low_24h: 61_800,
    price_change_percentage_1h_in_currency: 0.4,
    price_change_percentage_24h_in_currency: 2.1,
    price_change_percentage_7d_in_currency: -1.8,
    price_change_percentage_14d_in_currency: 4.7,
    price_change_percentage_30d_in_currency: 9.2,
    circulating_supply: 19_800_000,
    total_supply: 19_800_000,
    max_supply: 21_000_000,
    ath: 73_737,
    ath_change_percentage: -14.2,
    last_updated: providerNow,
    sparkline_in_7d: { price: [61_000, 62_000, 61_500, 63_250.25] },
  }];
  try {
    delete process.env.VELMERE_SOURCE_RECEIPT_PROJECTION_SECRET_CURRENT;
    delete process.env.VELMERE_SOURCE_RECEIPT_PROJECTION_KEY_ID_CURRENT;
    const unsignedRouteResponse = await withPass4825BrokeredEgressTestTransport(
      async () => Response.json(providerPayload),
      () => getMarkets(new Request("https://velmere.test/api/market-integrity/markets?page=20&perPage=10")),
    );
    equal(unsignedRouteResponse.status, 200, "unsigned provider response is represented without route failure");
    const unsignedRoute = await unsignedRouteResponse.json() as {
      mode: string;
      rows: Array<{ result: { score: unknown }; delivery: { state: string } }>;
      topRisk: unknown[];
      source: string;
    };
    equal(unsignedRoute.mode, "partial", "unsigned provider response must never be called live");
    equal(unsignedRoute.rows[0]?.result.score, null, "unsigned route score must be null");
    equal(unsignedRoute.rows[0]?.delivery.state, "withheld", "unsigned route row must expose withheld state");
    equal(unsignedRoute.topRisk.length, 0, "unsigned rows may not be ranked");
    check(!/\blive\b/iu.test(unsignedRoute.source), "unsigned source label must not claim live delivery");

    process.env.VELMERE_SOURCE_RECEIPT_PROJECTION_SECRET_CURRENT = projectionEnv.VELMERE_SOURCE_RECEIPT_PROJECTION_SECRET_CURRENT;
    process.env.VELMERE_SOURCE_RECEIPT_PROJECTION_KEY_ID_CURRENT = projectionEnv.VELMERE_SOURCE_RECEIPT_PROJECTION_KEY_ID_CURRENT;
    const signedRouteResponse = await withPass4825BrokeredEgressTestTransport(
      async () => Response.json(providerPayload),
      () => getMarkets(new Request("https://velmere.test/api/market-integrity/markets?page=19&perPage=10")),
    );
    equal(signedRouteResponse.status, 200, "signed fixture provider response should return successfully");
    const signedText = await signedRouteResponse.text();
    check(Buffer.byteLength(signedText, "utf8") < 2 * 1024 * 1024, "market response must stay within client body budget");
    const signedRoute = JSON.parse(signedText) as {
      mode: string;
      rows: Array<{ result: { score: unknown }; delivery: { state: string; completenessBps: number } }>;
      topRisk: unknown[];
      deliveryGate: { state: string; completenessBps: number };
    };
    equal(signedRoute.mode, "live", "fresh signed complete deterministic fixture may use live mode");
    check(typeof signedRoute.rows[0]?.result.score === "number", "signed route score must be numeric");
    equal(signedRoute.rows[0]?.delivery.state, "verified", "signed route row must be verified");
    equal(signedRoute.rows[0]?.delivery.completenessBps, 10_000, "signed route row must be complete");
    equal(signedRoute.deliveryGate.state, "verified", "aggregate gate must pass only when every row passes");
    equal(signedRoute.topRisk.length, 1, "only verified row may enter the fixture ranking");
  } finally {
    if (currentSecret === undefined) delete process.env.VELMERE_SOURCE_RECEIPT_PROJECTION_SECRET_CURRENT;
    else process.env.VELMERE_SOURCE_RECEIPT_PROJECTION_SECRET_CURRENT = currentSecret;
    if (currentKeyId === undefined) delete process.env.VELMERE_SOURCE_RECEIPT_PROJECTION_KEY_ID_CURRENT;
    else process.env.VELMERE_SOURCE_RECEIPT_PROJECTION_KEY_ID_CURRENT = currentKeyId;
  }

  const marketsSurface = readCurrentConsolidatedRoute("/api/market-integrity/markets");
  const routeSource = marketsSurface.handlerSource;
  check(marketsSurface.methods.length === 1 && marketsSurface.methods[0] === "GET", "markets registry remains GET-only");
  check(routeSource.includes("row.delivery.risk.state === \"verified\""), "top-risk ranking must consume the delivery gate");
  check(!routeSource.includes("finite provider risk score + at least one named source"), "legacy label-only ranking rule must be removed");
  check(routeSource.includes("expiredLastKnownGoodMayRank: false"), "expired LKG ranking prohibition must remain explicit");
  const coinSource = await readFile(new URL("../../lib/market-integrity/coingecko.ts", import.meta.url), "utf8");
  check(coinSource.includes("applyMarketRowRiskDeliveryFirewall"), "CoinGecko shared result must use the firewall");
  const dexSource = await readFile(new URL("../../lib/market-integrity/dexscreener.ts", import.meta.url), "utf8");
  check(dexSource.includes("withholdProviderRiskResult"), "DEX shared result must fail closed until provider timestamps exist");

  console.log(JSON.stringify({
    ok: true,
    schemaVersion: "pass6_market_risk_delivery_gate_test_v1",
    assertions,
    externalCalls: 0,
    liveReadinessClaimed: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
