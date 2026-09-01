import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { projectShieldMapCustomerAssetDisplay } from "../../lib/market-integrity/shield-map-customer-asset-display.js";

const receiptId = `p4644_${"a".repeat(64)}`;
const marketIdentity = {
  namespace: "symbol_or_market" as const,
  providerId: "coingecko",
  providerFamily: "market_data",
  requested: "btc",
  resolvedMarketId: "bitcoin",
  resolvedSymbol: "BTC",
  resolvedQuote: "USD" as const,
  receiptId,
};

const providerToken = {
  marketId: "bitcoin",
  symbol: "BTC",
  name: "Bitcoin",
  image: "https://provider.example/bitcoin.png",
};

const canonicalMarket = projectShieldMapCustomerAssetDisplay({
  identity: marketIdentity,
  token: providerToken,
});
assert.deepEqual(canonicalMarket, {
  state: "canonical_only",
  canonicalSymbol: "BTC",
  canonicalIdentity: "market:bitcoin",
  customerLabel: "BTC",
  name: null,
  imageUrl: null,
  metadataState: "withheld",
  blocker: "field_level_receipt_and_rights_required",
});

const address = "0x00000000000000000000000000000000000000aa";
const canonicalAddress = projectShieldMapCustomerAssetDisplay({
  identity: {
    namespace: "address",
    providerId: "dexscreener",
    providerFamily: "dex_market",
    requested: address,
    resolvedAddress: address,
    resolvedChainId: "ethereum",
    resolvedSymbol: "TOK",
    resolvedQuote: "USD",
    receiptId,
  },
  token: {
    tokenAddress: address.toUpperCase(),
    chainId: "Ethereum",
    symbol: "tok",
    name: "Provider-derived label",
    image: "https://provider.example/token.svg",
  },
});
assert.deepEqual(canonicalAddress, {
  state: "canonical_only",
  canonicalSymbol: "TOK",
  canonicalIdentity: `ethereum:${address}`,
  customerLabel: "TOK",
  name: null,
  imageUrl: null,
  metadataState: "withheld",
  blocker: "field_level_receipt_and_rights_required",
});

for (const [label, metadata] of [
  ["script name", { name: "<script>alert(1)</script>", image: "javascript:alert(1)" }],
  ["data URL", { name: "Verified Bitcoin", image: "data:image/svg+xml,<svg onload=alert(1)>" }],
  ["homoglyph and controls", { name: "B\u0456tcoin\u0000 VERIFIED", image: "file:///C:/secret" }],
  ["oversized label", { name: "A".repeat(100_000), image: "https://evil.invalid/x" }],
] as const) {
  const projected = projectShieldMapCustomerAssetDisplay({
    identity: marketIdentity,
    token: { ...providerToken, ...metadata },
  });
  assert.deepEqual(projected, canonicalMarket, `${label} must not reach customer display`);
}

const rejectedInputs: Array<
  [string, Parameters<typeof projectShieldMapCustomerAssetDisplay>[0]]
> = [
  ["missing identity", { identity: null, token: providerToken }],
  ["symbol substitution", {
    identity: marketIdentity,
    token: { ...providerToken, symbol: "ETH" },
  }],
  ["market substitution", {
    identity: marketIdentity,
    token: { ...providerToken, marketId: "ethereum" },
  }],
  ["malformed token", {
    identity: marketIdentity,
    token: { symbol: { toString: () => "BTC" }, marketId: "bitcoin" },
  }],
  ["prototype-shaped token", {
    identity: marketIdentity,
    token: Object.create({ symbol: "BTC", marketId: "bitcoin" }) as unknown,
  }],
];

for (const [label, input] of rejectedInputs) {
  assert.deepEqual(
    projectShieldMapCustomerAssetDisplay(input),
    {
      state: "withheld",
      canonicalSymbol: null,
      canonicalIdentity: null,
      customerLabel: "WITHHELD",
      name: null,
      imageUrl: null,
      metadataState: "withheld",
      blocker: "canonical_identity_invalid",
    },
    `${label} must fail closed`,
  );
}

const client = readFileSync(
  "components/market-integrity/ShieldMapCommandClient.tsx",
  "utf8",
);
assert.match(client, /projectShieldMapCustomerAssetDisplay\(\{/);
assert.match(client, /setCustomerAssetDisplay\(assetDisplay\)/);
assert.match(client, /data-testid="shield-map-asset-metadata-withheld"/);
assert.match(client, /data-testid="shield-map-canonical-symbol-badge"/);
assert.doesNotMatch(client, /snapshot\?\.token\.name/);
assert.doesNotMatch(client, /snapshot\?\.token\.image/);
assert.doesNotMatch(client, /investigator\?\.caseFrame\.asset/);
assert.doesNotMatch(client, /className="shield-map-result-token-logo"/);
assert.ok(
  client.indexOf("projectShieldMapCustomerAssetDisplay({")
    < client.indexOf("setInvestigator(payload.investigator)"),
  "asset display projection must fail closed before customer state is published",
);

console.log("Shield Map customer asset display boundary: PASS");
