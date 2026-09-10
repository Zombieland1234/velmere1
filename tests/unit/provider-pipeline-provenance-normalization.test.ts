import assert from "node:assert/strict";
import { createPass4644ProviderEvidenceReceipt, pass4644CanonicalReceiptDigest } from "../../lib/market-integrity/provider-evidence-receipt.ts";
import { blankPass464FundamentalQuality } from "../../lib/market-integrity/fundamental-quality.ts";
import { buildSecEdgarReferenceRequest } from "../../lib/market-integrity/sec-edgar-reference-policy.ts";
import { resolveProviderDeliveryRights } from "../../lib/compliance/provider-delivery-rights-gate.mjs";
import matrix from "../../config/pass36/a102r44p18-official-provider-rights-decision-matrix.json";

async function main() {
  let assertions = 0;
  const ok = (cond: boolean, msg: string) => {
    assertions += 1;
    assert.ok(cond, msg);
  };

  console.log("=== PASS-013: PROVIDER PIPELINE, NORMALIZATION & PROVENANCE SUITE ===");

  // 1. Evidence Receipt & Normalization Provenance (CoinGecko / Crypto Ingress)
  const now = new Date().toISOString();
  const receipt = createPass4644ProviderEvidenceReceipt({
    providerId: "coingecko",
    providerFamily: "market_data",
    surface: "crypto",
    verification: "normalized_response",
    requestedIdentity: "bitcoin",
    resolvedSymbol: "BTC",
    resolvedMarketId: "bitcoin",
    identityMatched: true,
    capabilities: ["identity", "price", "market_cap", "volume", "history", "supply"],
    timestampProvenance: "provider",
    observedAt: now,
    receivedAt: new Date(),
    ttlMs: 3 * 60_000,
    httpStatus: 200,
    latencyMs: 120,
    normalizedPayload: { price: 92500.5 },
    sourceUri: "https://api.coingecko.com/api/v3/coins/bitcoin",
  });

  ok(receipt.schemaVersion === "pass4644_provider_evidence_receipt_v1", "Receipt schema matches canonical v1");
  ok(receipt.providerId === "coingecko", "Receipt binds provider ID");
  ok(receipt.providerFamily === "market_data", "Receipt binds provider family");
  ok(typeof receipt.receiptId === "string" && receipt.receiptId.length > 10, "Receipt has deterministic receiptId");
  const digest = pass4644CanonicalReceiptDigest(receipt);
  ok(typeof digest === "string" && digest.length === 64, "Receipt digest is valid 64-char hex SHA-256");

  // 2. Alpha Vantage & Fundamental Quality Ingress
  const blankFund = blankPass464FundamentalQuality("equity");
  ok(blankFund.version === "fundamental-quality", "Fundamental quality version matches");
  ok(blankFund.qualityScore === 0, "Initial score defaults to 0 without false inflation");
  ok(blankFund.state === "source_required", "Blank fundamental state requires source");

  // 3. SEC EDGAR Official Regulatory Reference Policy
  const secReq = buildSecEdgarReferenceRequest({
    kind: "submissions",
    cik: "0000320193", // Apple Inc.
    userAgent: "Velmere/1.0 (Owner Operations; contact=ops@owner-domain.zz)",
    now: new Date("2026-08-21T15:00:00.000Z"),
  });
  ok(secReq.ok === true, "SEC EDGAR request generated successfully");
  if (secReq.ok) {
    ok(secReq.url.includes("0000320193"), "SEC request includes valid CIK endpoint");
    ok(secReq.headers["user-agent"].includes("Velmere/1.0"), "SEC EDGAR User-Agent compliance header present");
  }

  // 4. Rights Gate: Purpose Separation (Internal Computation vs Raw Customer Delivery)
  // For registered providers in matrix:
  const coingeckoDiagnostic = resolveProviderDeliveryRights({
    providerId: "coingecko",
    purpose: "internal_diagnostic",
    matrix,
  });
  ok(coingeckoDiagnostic.schemaVersion.includes("provider-delivery-rights-resolution"), "Resolution schema valid");
  ok(coingeckoDiagnostic.purpose === "internal_diagnostic", "Purpose resolved as internal_diagnostic");

  const coingeckoCustomerDelivery = resolveProviderDeliveryRights({
    providerId: "coingecko",
    purpose: "customer_delivery",
    matrix,
  });
  ok(coingeckoCustomerDelivery.purpose === "customer_delivery", "Purpose resolved as customer_delivery");
  // Customer delivery without commercial redistribution contract must fail-closed
  ok(coingeckoCustomerDelivery.allowed === false, "Unapproved commercial redistribution must be blocked");
  ok(coingeckoCustomerDelivery.blockers.some((b: string) => b.includes("legal_approval") || b.includes("provider_rights")), "Blocker reason recorded for customer delivery");

  // 5. Normalization Consistency: Timestamp & Provenance
  const observedMs = Date.parse(receipt.observedAt);
  ok(Number.isFinite(observedMs), "Observed timestamp is valid ISO date");
  ok(Math.abs(Date.now() - observedMs) < 60_000, "Observed timestamp is fresh");

  console.log(`PASS-013 Provider Pipeline & Provenance: PASS (${assertions}/${assertions} assertions)`);
}

main().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
