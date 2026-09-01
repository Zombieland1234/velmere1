import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { createPass4644ProviderEvidenceReceipt } from "../../lib/market-integrity/provider-evidence-receipt.js";
import { verifyShieldMapCustomerIdentity } from "../../lib/market-integrity/shield-map-customer-identity.js";

const generatedReceipt = createPass4644ProviderEvidenceReceipt({
  providerId: "coingecko",
  providerFamily: "market_data",
  surface: "crypto",
  verification: "normalized_response",
  requestedIdentity: "btc",
  resolvedMarketId: "bitcoin",
  resolvedSymbol: "BTC",
  identityMatched: true,
  capabilities: ["identity", "price"],
  timestampProvenance: "provider",
  observedAt: "2026-08-21T09:59:59.000Z",
  receivedAt: "2026-08-21T10:00:00.000Z",
  ttlMs: 60_000,
  httpStatus: 200,
  latencyMs: 5,
  normalizedPayload: { id: "bitcoin", symbol: "BTC", price: 60_000 },
});
const receiptId = generatedReceipt.receiptId;
assert.match(receiptId, /^p4644_[a-f0-9]{24}$/u);

const exactMarket = verifyShieldMapCustomerIdentity({
  requestedQuery: "BTC",
  binding: {
    namespace: "symbol_or_market",
    providerId: "coingecko",
    providerFamily: "market_data",
    requested: "btc",
    resolvedMarketId: "bitcoin",
    resolvedSymbol: "BTC",
    resolvedQuote: "USD",
    receiptId,
  },
  token: { marketId: "bitcoin", symbol: "BTC" },
});
assert.deepEqual(exactMarket, {
  ok: true,
  value: {
    namespace: "symbol_or_market",
    providerId: "coingecko",
    providerFamily: "market_data",
    requested: "btc",
    resolvedMarketId: "bitcoin",
    resolvedSymbol: "BTC",
    resolvedQuote: "USD",
    receiptId,
  },
});

const address = "0x00000000000000000000000000000000000000Aa";
const exactAddress = verifyShieldMapCustomerIdentity({
  requestedQuery: `address:${address}`,
  binding: {
    namespace: "address",
    providerId: "dexscreener",
    providerFamily: "dex_market",
    requested: `address:${address.toLowerCase()}`,
    resolvedAddress: address.toLowerCase(),
    resolvedChainId: "ethereum",
    resolvedSymbol: "TOK",
    resolvedQuote: "USD",
    receiptId,
  },
  token: {
    tokenAddress: address,
    chainId: "Ethereum",
    symbol: "tok",
  },
});
if (!exactAddress.ok) throw new Error(`address identity rejected: ${exactAddress.code}`);
assert.equal(exactAddress.value.namespace, "address");
if (exactAddress.value.namespace !== "address") {
  throw new Error("expected address identity");
}
assert.equal(exactAddress.value.resolvedAddress, address.toLowerCase());
assert.equal(exactAddress.value.resolvedChainId, "ethereum");

const marketBinding = exactMarket.ok ? exactMarket.value : null;
assert.ok(marketBinding);

const rejectedCases: Array<[string, Parameters<typeof verifyShieldMapCustomerIdentity>[0]]> = [
  ["request substitution", {
    requestedQuery: "ETH",
    binding: marketBinding,
    token: { marketId: "bitcoin", symbol: "BTC" },
  }],
  ["result market substitution", {
    requestedQuery: "BTC",
    binding: marketBinding,
    token: { marketId: "ethereum", symbol: "BTC" },
  }],
  ["result symbol substitution", {
    requestedQuery: "BTC",
    binding: marketBinding,
    token: { marketId: "bitcoin", symbol: "ETH" },
  }],
  ["namespace substitution", {
    requestedQuery: address,
    binding: marketBinding,
    token: { marketId: "bitcoin", symbol: "BTC" },
  }],
  ["quote substitution", {
    requestedQuery: "BTC",
    binding: { ...marketBinding, resolvedQuote: "EUR" },
    token: { marketId: "bitcoin", symbol: "BTC" },
  }],
  ["receipt injection", {
    requestedQuery: "BTC",
    binding: { ...marketBinding, receiptId: "<script>alert(1)</script>" },
    token: { marketId: "bitcoin", symbol: "BTC" },
  }],
  ["fabricated legacy 64-hex receipt", {
    requestedQuery: "BTC",
    binding: { ...marketBinding, receiptId: `p4644_${"a".repeat(64)}` },
    token: { marketId: "bitcoin", symbol: "BTC" },
  }],
  ["short receipt", {
    requestedQuery: "BTC",
    binding: { ...marketBinding, receiptId: `p4644_${"a".repeat(23)}` },
    token: { marketId: "bitcoin", symbol: "BTC" },
  }],
  ["receipt tamper", {
    requestedQuery: "BTC",
    binding: { ...marketBinding, receiptId: `${receiptId.slice(0, -1)}z` },
    token: { marketId: "bitcoin", symbol: "BTC" },
  }],
  ["ambiguous market/address binding", {
    requestedQuery: "BTC",
    binding: { ...marketBinding, resolvedAddress: address.toLowerCase() },
    token: { marketId: "bitcoin", symbol: "BTC" },
  }],
  ["chain substitution", {
    requestedQuery: address,
    binding: {
      namespace: "address",
      providerId: "dexscreener",
      providerFamily: "dex_market",
      requested: address.toLowerCase(),
      resolvedAddress: address.toLowerCase(),
      resolvedChainId: "ethereum",
      resolvedSymbol: "TOK",
      resolvedQuote: "USD",
      receiptId,
    },
    token: { tokenAddress: address, chainId: "base", symbol: "TOK" },
  }],
  ["homoglyph query", {
    requestedQuery: "ВTC",
    binding: marketBinding,
    token: { marketId: "bitcoin", symbol: "BTC" },
  }],
  ["malformed runtime binding", {
    requestedQuery: "BTC",
    binding: { ...marketBinding, providerId: { toString: () => "coingecko" } },
    token: { marketId: "bitcoin", symbol: "BTC" },
  }],
];

for (const [label, input] of rejectedCases) {
  const result = verifyShieldMapCustomerIdentity(input);
  assert.equal(result.ok, false, `${label} must fail closed`);
}

const client = readFileSync("components/market-integrity/ShieldMapCommandClient.tsx", "utf8");
assert.match(client, /identityBinding: unknown/);
assert.match(client, /verifyShieldMapCustomerIdentity\(\{/);
assert.match(client, /setCanonicalIdentity\(verifiedIdentity\.value\)/);
assert.match(client, /data-testid="shield-map-canonical-identity"/);
assert.match(client, /canonicalIdentity\.resolvedChainId/);
assert.match(client, /canonicalIdentity\.resolvedAddress/);
assert.ok(
  client.indexOf("verifyShieldMapCustomerIdentity({")
    < client.indexOf("setInvestigator(payload.investigator)"),
  "identity must be verified before customer graph state is published",
);

console.log("Shield Map customer identity boundary: PASS");
