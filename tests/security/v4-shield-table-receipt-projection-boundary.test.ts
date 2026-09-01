import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  projectShieldProTableRow,
  SHIELD_PRO_TABLE_FIELD_CONTRACTS,
} from "@/lib/market-integrity/shield-pro-table-customer-projection";

type Contract = {
  semanticClass: "reference" | "derived" | "historical";
  unit: "text" | "rank" | "url" | "price" | "percent" | "currency" | "price_series";
  currency: "USD" | null;
  maxAgeSeconds: number;
};

const contracts = SHIELD_PRO_TABLE_FIELD_CONTRACTS as Readonly<Record<string, Contract>>;
assert.ok(contracts["market.change_30d"], "the customer projector must cover Shield's visible 30D column");

const sourceAsOf = "2026-08-21T20:00:00.000Z";
const fields = Object.fromEntries(Object.entries(contracts).map(([fieldId, contract]) => [
  fieldId,
  {
    state: "verified",
    required: true,
    valueAvailable: true,
    sourceAsOf,
    receiptId: `p4644_${"b".repeat(24)}`,
    upstreamCount: 2,
    requiredUpstreamCount: 1,
    semanticClass: contract.semanticClass,
    unit: contract.unit,
    currency: contract.currency,
    venueScope: "aggregated_multi_venue_reference",
    executionEligible: false,
    currentnessClass: "provider_timestamped_reference",
    maxAgeSeconds: contract.maxAgeSeconds,
    liveClaimed: false,
    executableQuoteClaimed: false,
  },
]));

const verified = {
  id: "bitcoin",
  symbol: "BTC",
  name: "Bitcoin",
  image: "https://assets.example.test/btc.png",
  rank: 1,
  price: 64_000.25,
  priceChange1h: 0.5,
  priceChange24h: -1.25,
  priceChange7d: 4.75,
  priceChange30d: 9.5,
  marketCap: 1_260_000_000_000,
  volume24h: 32_000_000_000,
  sparkline7d: [60_000, 61_000, 64_000.25],
  result: { dataQuality: "live" as const },
  delivery: {
    state: "verified",
    receiptDigest: "a".repeat(64),
    fields,
  },
};

for (const optionalField of ["market.image", "market.change_1h", "market.change_7d", "market.change_30d", "market.sparkline_7d"]) {
  verified.delivery.fields[optionalField].required = false;
}

const projected = projectShieldProTableRow(verified, "live");
assert.ok(projected);
assert.equal((projected as unknown as { priceChange30d: number | null }).priceChange30d, 9.5);
assert.equal(projected.priceChange1h, 0.5);
assert.equal(projected.priceChange7d, 4.75);
assert.deepEqual(projected.sparkline7d, [60_000, 61_000, 64_000.25]);

const hostile30d = structuredClone(verified);
hostile30d.delivery.fields["market.change_30d"].state = "withheld";
const hostileProjection = projectShieldProTableRow(hostile30d, "live");
assert.ok(hostileProjection);
assert.equal(
  (hostileProjection as unknown as { priceChange30d: number | null }).priceChange30d,
  null,
  "a raw 30D value must be absent when its field receipt is withheld",
);

const malformedRequiredFlag = structuredClone(verified);
malformedRequiredFlag.delivery.fields["market.change_30d"].required = "false" as unknown as boolean;
const malformedRequiredProjection = projectShieldProTableRow(malformedRequiredFlag, "live");
assert.ok(malformedRequiredProjection);
assert.equal(
  (malformedRequiredProjection as unknown as { priceChange30d: number | null }).priceChange30d,
  null,
  "a string-shaped required flag cannot imitate a verified optional-field receipt",
);

const missingDelivery = structuredClone(verified) as typeof verified & { delivery?: typeof verified.delivery };
delete missingDelivery.delivery;
assert.equal(projectShieldProTableRow(missingDelivery, "live"), null, "missing field evidence must fail closed without throwing");

const shield = fs.readFileSync(
  path.join(process.cwd(), "components/market-integrity/ShieldRealMarketsParityClient.tsx"),
  "utf8",
);
assert.match(shield, /projectShieldProTableRow/u, "Shield customer table must use the shared receipt projector");
assert.match(shield, /customerRows/u, "Shield customer table must render only projected rows");
assert.match(shield, /filterMarketInstruments\(customerRows,/u, "Shield filtering must not re-enter raw rows");

console.log("V4 Shield customer table receipt projection boundary: PASS");
