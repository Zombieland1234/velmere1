import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  projectShieldProTableRow,
  SHIELD_PRO_TABLE_FIELD_CONTRACTS,
} from "@/lib/market-integrity/shield-pro-table-customer-projection";

const sourceAsOf = "2026-08-21T12:00:00.000Z";
const receiptDigest = "a".repeat(64);

function deliveryField(fieldId: keyof typeof SHIELD_PRO_TABLE_FIELD_CONTRACTS) {
  const contract = SHIELD_PRO_TABLE_FIELD_CONTRACTS[fieldId];
  return {
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
  };
}

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
  marketCap: 1_260_000_000_000,
  volume24h: 32_000_000_000,
  sparkline7d: [60_000, 61_000, 64_000.25],
  result: { dataQuality: "live" as const },
  delivery: {
    state: "verified",
    receiptDigest,
    fields: Object.fromEntries(
      Object.keys(SHIELD_PRO_TABLE_FIELD_CONTRACTS).map((fieldId) => [
        fieldId,
        deliveryField(fieldId as keyof typeof SHIELD_PRO_TABLE_FIELD_CONTRACTS),
      ]),
    ),
  },
};

const ready = projectShieldProTableRow(verified, "live");
assert.ok(ready, "a fully receipt-bound row must be customer-projectable");
assert.equal(ready.marketId, "bitcoin");
assert.equal(ready.symbol, "BTC");
assert.equal(ready.name, "Bitcoin");
assert.equal(ready.fields.price.state, "READY");
assert.equal(ready.fields.price.value, 64_000.25);
assert.equal(ready.fields.price.fieldId, "market.price");
assert.equal(ready.fields.price.semanticClass, "reference");
assert.equal(ready.fields.price.unit, "price");
assert.equal(ready.fields.price.currency, "USD");
assert.equal(ready.fields.price.sourceAsOf, sourceAsOf);
assert.equal(ready.fields.price.receiptId, `p4644_${"b".repeat(24)}`);
assert.deepEqual(ready.fields.sparkline7d.value, [60_000, 61_000, 64_000.25]);

const partial = projectShieldProTableRow(verified, "partial");
assert.ok(partial);
assert.equal(partial.fields.price.state, "PARTIAL");
assert.equal(partial.fields.price.value, 64_000.25);

const stale = projectShieldProTableRow(verified, "stale");
assert.ok(stale);
assert.equal(stale.fields.price.state, "STALE");
assert.equal(stale.fields.price.value, 64_000.25);

for (const mode of ["loading", "error"] as const) {
  assert.equal(projectShieldProTableRow(verified, mode), null, `${mode} cannot retain customer values`);
}

const unverifiedPrice = structuredClone(verified);
unverifiedPrice.delivery.fields["market.price"].state = "withheld";
const priceWithheld = projectShieldProTableRow(unverifiedPrice, "live");
assert.ok(priceWithheld);
assert.equal(priceWithheld.fields.price.state, "WITHHELD");
assert.equal(priceWithheld.fields.price.value, null, "raw numeric value must be absent when its field receipt is withheld");

for (const mutate of [
  (row: typeof verified) => { row.delivery.fields["market.price"].valueAvailable = false; },
  (row: typeof verified) => { row.delivery.fields["market.price"].receiptId = ""; },
  (row: typeof verified) => { row.delivery.fields["market.price"].sourceAsOf = "not-a-time"; },
  (row: typeof verified) => { row.delivery.fields["market.price"].semanticClass = "executable_quote"; },
  (row: typeof verified) => { row.delivery.fields["market.price"].unit = "BTC"; },
  (row: typeof verified) => { row.delivery.fields["market.price"].executionEligible = true; },
  (row: typeof verified) => { row.delivery.fields["market.price"].liveClaimed = true; },
  (row: typeof verified) => { row.delivery.fields["market.price"].upstreamCount = 0; },
  (row: typeof verified) => { row.price = Number.NaN; },
]) {
  const hostile = structuredClone(verified);
  mutate(hostile);
  const projection = projectShieldProTableRow(hostile, "live");
  assert.ok(projection);
  assert.equal(projection.fields.price.state, "WITHHELD");
  assert.equal(projection.fields.price.value, null);
}

const tamperedDeliveryRoot = structuredClone(verified);
tamperedDeliveryRoot.delivery.receiptDigest = "tampered";
assert.equal(projectShieldProTableRow(tamperedDeliveryRoot, "live"), null, "a tampered row receipt root withholds the entire row");

for (const identityField of ["identity.market_id", "identity.symbol", "identity.name"] as const) {
  const hostile = structuredClone(verified);
  hostile.delivery.fields[identityField].state = "withheld";
  assert.equal(projectShieldProTableRow(hostile, "live"), null, `${identityField} is required before exposing a row`);
}

const hostileSeries = structuredClone(verified);
hostileSeries.sparkline7d = [60_000, Number.POSITIVE_INFINITY, 64_000];
const seriesProjection = projectShieldProTableRow(hostileSeries, "live");
assert.ok(seriesProjection);
assert.equal(seriesProjection.fields.sparkline7d.state, "WITHHELD");
assert.equal(seriesProjection.fields.sparkline7d.value, null);

const component = fs.readFileSync(
  path.join(process.cwd(), "components/market-integrity/ShieldProCleanTerminalClient.tsx"),
  "utf8",
);
assert.match(component, /projectShieldProTableRow/);
assert.match(component, /customerRows/);
assert.doesNotMatch(component, /<td>\{formatMoney\(row\.price,/u, "desktop table still renders raw price");
assert.doesNotMatch(component, /<Sparkline values=\{row\.sparkline7d\}/u, "table still renders raw sparkline");

console.log("Shield Pro table field projection boundary: PASS");
