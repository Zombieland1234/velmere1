import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  brokeredEgressFetch,
  withPass4825BrokeredEgressTestTransport,
} from "../../lib/network/brokered-egress.ts";

const originalFetch = globalThis.fetch;
let physicalNetworkCalls = 0;
globalThis.fetch = (async () => {
  physicalNetworkCalls += 1;
  throw new Error("physical_network_call_forbidden");
}) as typeof fetch;

try {
  const rightsGatedProfiles = [
    ["alpha_vantage", "https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=IBM", "GET"],
    ["audit_provider_runtime", "https://api.etherscan.io/v2/api?chainid=1", "GET"],
    ["binance_spot", "https://api.binance.com/api/v3/time", "GET"],
    ["coingecko", "https://api.coingecko.com/api/v3/ping", "GET"],
    ["defi_llama", "https://api.llama.fi/protocols", "GET"],
    ["derivatives", "https://fapi.binance.com/fapi/v1/time", "GET"],
    ["dex_screener", "https://api.dexscreener.com/latest/dex/search?q=BTC", "GET"],
    ["gecko_terminal", "https://api.geckoterminal.com/api/v2/networks", "GET"],
    ["gemini", "https://generativelanguage.googleapis.com/v1beta/models", "POST"],
    ["goplus", "https://api.gopluslabs.io/api/v1/token_security/1", "GET"],
    ["market_intelligence", "https://api.kraken.com/0/public/Time", "GET"],
    ["public_probe", "https://query1.finance.yahoo.com/v8/finance/chart/AAPL", "GET"],
    ["real_markets", "https://stooq.com/q/l/?s=aapl.us&f=sd2t2ohlcv&h&e=csv", "GET"],
    ["sec_edgar", "https://data.sec.gov/submissions/CIK0000320193.json", "GET"],
    ["twelve_data", "https://api.twelvedata.com/time_series?symbol=AAPL", "GET"],
    ["venue_health", "https://api.exchange.coinbase.com/time", "GET"],
  ] as const;
  for (const [profile, url, method] of rightsGatedProfiles) {
    await assert.rejects(
      () => brokeredEgressFetch(
        url,
        {
          method,
          cache: "no-store",
          ...(method === "POST"
            ? {
                headers: { "content-type": "application/json" },
                body: "{}",
              }
            : {}),
        },
        { profile, operation: `a102r2_rights_gate_${profile}` },
      ),
      (error: unknown) =>
        error instanceof Error
        && error.message.includes("blocked until signed"),
    );
    assert.equal(physicalNetworkCalls, 0);
  }

  let fixtureTransportCalls = 0;
  const fixtureResponse = await withPass4825BrokeredEgressTestTransport(
    async () => {
      fixtureTransportCalls += 1;
      return new Response('{"fixture":true}', {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
    () => brokeredEgressFetch(
      "https://api.coingecko.com/api/v3/ping",
      { cache: "no-store" },
      { profile: "coingecko", operation: "a102r2_fixture_only" },
    ),
  );
  assert.equal(fixtureResponse.status, 200);
  assert.equal(fixtureTransportCalls, 1);
  assert.equal(physicalNetworkCalls, 0);

  for (const [profile, url] of [
    ["printful", "https://api.printful.com/orders"],
    ["resend", "https://api.resend.com/emails"],
  ] as const) {
    await assert.rejects(
      () => brokeredEgressFetch(
        url,
        {
          method: "POST",
          cache: "no-store",
          headers: { "content-type": "application/json" },
          body: "{}",
        },
        { profile, operation: `a102r2_provider_effect_gate_${profile}` },
      ),
      (error: unknown) =>
        error instanceof Error
        && error.message.includes("durable outbox"),
    );
    assert.equal(physicalNetworkCalls, 0);
  }

  const receipt = {
    schemaVersion: "velmere.pass36.a102r2.provider-rights-egress-gate.v1",
    status: "PASS_A102R2_PROVIDER_RIGHTS_EGRESS_FAIL_CLOSED_NO_PROMOTION",
    productionDataProfilesAuthorized: 0,
    productionDataProfilesBlockedBeforeTransport:
      rightsGatedProfiles.length,
    productionProviderMutationsAuthorized: 0,
    productionProviderMutationsBlockedBeforeTransport: 2,
    physicalNetworkCalls,
    fixtureTransportCalls,
    fixtureCredit: false,
  };
  const outputDirectory = process.env.VELMERE_A102R2_OUTPUT_DIR?.trim();
  if (outputDirectory) {
    fs.mkdirSync(outputDirectory, { recursive: true });
    fs.writeFileSync(
      path.join(outputDirectory, "PASS36_A102R2_PROVIDER_RIGHTS_EGRESS_RECEIPT.json"),
      `${JSON.stringify(receipt, null, 2)}\n`,
    );
  }
  console.log(JSON.stringify(receipt));
} finally {
  globalThis.fetch = originalFetch;
}
