import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  buildMarketRowDeliveryReceipt,
} from "../../lib/market-integrity/market-row-delivery-gate.ts";
import { buildMarketRowEvidencePayload } from "../../lib/market-integrity/market-row-evidence-payload.ts";
import { coinToMarketRow } from "../../lib/market-integrity/coingecko.ts";
import {
  attachPass4644ProviderReceipts,
  createPass4644ProviderEvidenceReceipt,
} from "../../lib/market-integrity/provider-evidence-receipt.ts";
import { getP99RealMarketsBasicFieldContracts } from "../../lib/market-integrity/real-markets-basic-field-policy.ts";

const generatedAt = "2026-08-21T10:00:20.000Z";
const observedAt = "2026-08-21T10:00:10.000Z";
const receivedAt = "2026-08-21T10:00:12.000Z";
const projectionEnv = {
  NODE_ENV: "test",
  VELMERE_SOURCE_RECEIPT_PROJECTION_SECRET_CURRENT: "current-execution-market-risk-secret-0001",
  VELMERE_SOURCE_RECEIPT_PROJECTION_KEY_ID_CURRENT: "current-execution-market-risk",
};

function fixtureRow() {
  return coinToMarketRow({
    id: "bitcoin",
    symbol: "btc",
    name: "Bitcoin",
    image: "https://assets.example.test/bitcoin.png",
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

let assertions = 0;
function equal(actual: unknown, expected: unknown, message: string) {
  assert.equal(actual, expected, message);
  assertions += 1;
}

const canonicalIds = new Set(getP99RealMarketsBasicFieldContracts().map((field) => field.fieldId));
equal(canonicalIds.size, 23, "canonical field registry denominator remains 23");

const missingEvidence = buildMarketRowDeliveryReceipt({
  row: fixtureRow(),
  generatedAt,
  projectionEnv,
});
equal(missingEvidence.state, "withheld", "missing evidence is withheld without throwing");
equal(missingEvidence.risk.state, "missing", "risk derives the missing evidence state");
equal(missingEvidence.risk.score, null, "withheld risk score is null");
equal(missingEvidence.risk.confidencePercent, null, "withheld risk confidence is null");
equal(missingEvidence.risk.inputFieldCount, 19, "all risk inputs are evaluated");
equal(missingEvidence.risk.verifiedInputFieldCount, 0, "no unverified input is credited");

const verifiedRow = fixtureRow();
attachPass4644ProviderReceipts(verifiedRow.result, [createPass4644ProviderEvidenceReceipt({
  providerId: "coingecko",
  providerFamily: "market_data",
  surface: "crypto",
  verification: "normalized_response",
  requestedIdentity: verifiedRow.id,
  resolvedSymbol: verifiedRow.symbol,
  resolvedMarketId: verifiedRow.id,
  identityMatched: true,
  capabilities: ["identity", "price", "market_cap", "volume", "history", "supply"],
  timestampProvenance: "provider",
  observedAt,
  receivedAt,
  ttlMs: 180_000,
  httpStatus: 200,
  latencyMs: 42,
  normalizedPayload: buildMarketRowEvidencePayload(verifiedRow),
})]);
const verified = buildMarketRowDeliveryReceipt({
  row: verifiedRow,
  generatedAt,
  projectionEnv,
});
equal(verified.state, "verified", "complete bound Basic row is verified locally");
equal(verified.risk.state, "verified", "risk derivation is verified locally");
equal(verified.risk.verifiedInputFieldCount, 19, "all risk inputs bind to canonical contracts");
equal(typeof verified.risk.score, "number", "verified risk is numeric");
for (const field of Object.values(verified.fields)) {
  assert.ok(
    canonicalIds.has(field.fieldId) || field.fieldId === "risk.score",
    `delivery field uses canonical or declared derived id: ${field.fieldId}`,
  );
  assert.ok(!field.fieldId.startsWith("risk.input."), `synthetic field id is never looked up: ${field.fieldId}`);
  assertions += 2;
}

const source = await readFile(new URL("../../lib/market-integrity/market-row-delivery-gate.ts", import.meta.url), "utf8");
assert.ok(source.includes("FIELD_ID_BY_EVIDENCE_PATH"));
assert.ok(source.includes("risk_input_contract_missing"));
assert.ok(!source.includes("fieldId: `risk.input.${path}`"));
assertions += 3;

console.log(JSON.stringify({
  schemaVersion: "velmere.current-execution.real-markets-risk-contract-binding.v1",
  status: "PASS_LOCAL_ONLY",
  assertions,
  canonicalFieldContracts: canonicalIds.size,
  riskInputContracts: verified.risk.inputFieldCount,
  missingEvidenceFailsClosed: true,
  syntheticFieldLookupRemoved: true,
  customerFinalCredit: false,
}, null, 2));
