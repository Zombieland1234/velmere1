import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  POST,
  evaluateMarketIntelligencePublicationPreflight,
} from "../../lib/server/market-integrity-route-modules/market-intelligence.ts";
import { handleRealMarketsGet } from "../../lib/market-integrity/real-markets-route-orchestrator.ts";
import {
  inferMarketSession,
  dynamicRisk,
  quoteMarketCap,
  quoteVolume,
} from "../../lib/market-integrity/pass4414-cross-asset-quote-format-helpers.ts";

const originalFetch = globalThis.fetch;
let providerCalls = 0;
globalThis.fetch = (async () => {
  providerCalls += 1;
  throw new Error("provider_call_after_blocked_publication_preflight");
}) as typeof fetch;

try {
  const gate = evaluateMarketIntelligencePublicationPreflight();
  assert.deepEqual(gate, {
    authorized: false,
    mode: "withheld",
    evidenceState: "withheld",
    scorePublished: false,
    blockers: [
      "pass4993_signed_field_projection_not_attached",
      "commercial_field_quorum_not_verified",
      "provider_rights_runtime_authority_not_verified",
    ],
  });

  for (const depth of ["basic", "pro", "advanced"] as const) {
    const response = await POST(new Request(
      "http://localhost/api/market-integrity/market-intelligence",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost",
        },
        body: JSON.stringify({
          assetKey: "BTC-USD",
          depth,
          locale: "en",
          surface: "shield",
          evidenceMode: "server_owned",
        }),
      },
    ));
    assert.equal(response.status, 424);
    const payload = await response.json();
    assert.equal(payload.ok, false);
    assert.equal(payload.mode, "withheld");
    assert.equal(payload.publication.authorized, false);
    assert.equal(payload.publication.scorePublished, false);
    assert.equal(payload.risk.score, null);
    assert.equal("marketImpact" in payload, false);
    assert.equal("whaleWatch" in payload, false);
    assert.equal("evidencePacket" in payload, false);
    assert.equal("evidenceLedger" in payload, false);
  }
  const realMarketsResponse = await handleRealMarketsGet(
    new Request(
      "http://localhost/api/market-integrity/real-markets?symbols=AAPL&detail=1&tier=basic&locale=en",
      { method: "GET" },
    ),
  );
  assert.equal(realMarketsResponse.status, 200);
  const realMarketsPayload = await realMarketsResponse.json();
  assert.equal(
    realMarketsPayload.pass4825RiskVerdictPublicationBoundary.state,
    "withheld",
  );
  assert.equal(
    realMarketsPayload.pass4825RiskVerdictPublicationBoundary
      .numericalRiskPublished,
    false,
  );
  assert.equal(realMarketsPayload.pass4818CustomerReport, null);
  assert.equal(realMarketsPayload.pass4818CustomerReportPdfArtifact, null);

  const syntheticAsset = {
    id: "a102r2-synthetic-equity",
    providerSymbol: "A102R2",
    name: "A102R2 synthetic control",
    symbol: "A102R2",
    category: "stocks",
  } as never;
  const sourceBoundUnsignedQuote = {
    state: "live",
    truthState: "source_bound",
    sourceTimestamp: Date.now(),
    currentPrice: 123,
    marketCap: 999_999_999,
    volume24h: 888_888,
    candles: [{ timestamp: 1, open: 1, high: 1, low: 1, close: 1, volume: 777_777 }],
    fundamentals: { sharesOutstanding: 1_000_000 },
  } as never;
  assert.equal(quoteMarketCap(undefined, syntheticAsset), null);
  assert.equal(quoteMarketCap(sourceBoundUnsignedQuote, syntheticAsset), null);
  assert.equal(quoteVolume(sourceBoundUnsignedQuote), null);
  assert.equal(dynamicRisk(sourceBoundUnsignedQuote, 36, syntheticAsset), null);
  assert.equal(inferMarketSession(syntheticAsset, "en"), "Session unavailable");
  assert.equal(inferMarketSession(syntheticAsset, "pl"), "Sesja niedostępna");
  assert.equal(inferMarketSession(syntheticAsset, "de"), "Sitzung nicht verfügbar");
  assert.equal(providerCalls, 0);

  const receipt = {
    schemaVersion: "velmere.pass36.a102r2.market-publication-preflight.v1",
    status: "PASS_A102R2_MARKET_PUBLICATION_PREFLIGHT_NO_PROMOTION",
    handlerExecutions: 4,
    localPublicationHelperAssertions: 7,
    providerCallsAfterBlockedPreflight: providerCalls,
    numericalCustomerProjection: false,
    persistenceProjection: false,
  };
  const outputDirectory = process.env.VELMERE_A102R2_OUTPUT_DIR?.trim();
  if (outputDirectory) {
    fs.mkdirSync(outputDirectory, { recursive: true });
    fs.writeFileSync(
      path.join(outputDirectory, "PASS36_A102R2_MARKET_PUBLICATION_PREFLIGHT_RECEIPT.json"),
      `${JSON.stringify(receipt, null, 2)}\n`,
    );
  }
  console.log(JSON.stringify(receipt));
} finally {
  globalThis.fetch = originalFetch;
}
