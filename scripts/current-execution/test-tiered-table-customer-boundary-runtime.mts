import assert from "node:assert/strict";
import {
  VLM_CUSTOMER_DATA_STATES,
  VLM_FIELD_RIGHTS_STATES,
  VLM_MARKET_SEMANTIC_CLASSES,
  VLM_TIERED_TABLE_CONTRACT_ROWS,
  VLM_TIERED_TABLE_PRODUCT_IDS,
  evaluateVlmTieredTableCustomerBoundary,
  type VlmTieredTableBoundaryInput,
  type VlmTieredTableProductId,
} from "../../lib/product/vlm-tiered-table-customer-contract";
import { getVlmCanonicalCustomerProduct } from "../../lib/product/vlm-canonical-product-topology";

const evaluatedAt = "2026-08-22T12:00:00.000Z";
const observedAt = "2026-08-22T11:59:30.000Z";

function base(productId: VlmTieredTableProductId): VlmTieredTableBoundaryInput {
  return {
    requestedProductId: productId,
    analyzedProductId: productId,
    deliveredProductId: productId,
    rightsState: "GREEN_EXACT",
    sourceState: "READY",
    sourceSemanticClass: "REFERENCE",
    customerSemanticClass: "REFERENCE",
    sourceObservedAt: observedAt,
    evaluatedAt,
    maxAgeSeconds: 60,
    value: 123.45,
    riskScore: 42,
    confidence: 81,
  };
}

assert.equal(VLM_TIERED_TABLE_PRODUCT_IDS.length, 9);
assert.equal(new Set(VLM_TIERED_TABLE_PRODUCT_IDS).size, 9);
assert.equal(VLM_TIERED_TABLE_CONTRACT_ROWS.length, 9);
assert.deepEqual([...VLM_CUSTOMER_DATA_STATES], [
  "LOADING", "READY", "PARTIAL", "STALE", "WITHHELD", "UNAVAILABLE", "ERROR_CUSTOMER_SAFE",
]);
assert.equal(VLM_MARKET_SEMANTIC_CLASSES.length, 9);
assert.equal(VLM_FIELD_RIGHTS_STATES.length, 5);

for (const row of VLM_TIERED_TABLE_CONTRACT_ROWS) {
  const canonical = getVlmCanonicalCustomerProduct(row.productId);
  assert.ok(canonical);
  assert.equal(canonical.family, row.family);
  assert.equal(canonical.tier, row.tier);
  assert.equal(canonical.productClass, "TIERED_PRODUCT");

  const ready = evaluateVlmTieredTableCustomerBoundary(base(row.productId));
  assert.equal(ready.state, "READY");
  assert.equal(ready.value, 123.45);
  assert.equal(ready.riskScore, 42);
  assert.equal(ready.confidence, 81);
  assert.equal(ready.liveClaimed, false);
  assert.equal(ready.executableQuoteClaimed, false);
  assert.equal(ready.silentTierDowngradeAllowed, false);
}

for (const rightsState of ["AMBER_REVIEW", "RED_BLOCKED", "GRAY_UNKNOWN"] as const) {
  const blocked = evaluateVlmTieredTableCustomerBoundary({
    ...base("shield-basic"),
    rightsState,
    value: 999,
    riskScore: 99,
    confidence: 99,
  });
  assert.equal(blocked.state, "WITHHELD");
  assert.equal(blocked.reason, "rights_blocked");
  assert.equal(blocked.value, null);
  assert.equal(blocked.riskScore, null);
  assert.equal(blocked.confidence, null);
}

const conditionalBlocked = evaluateVlmTieredTableCustomerBoundary({
  ...base("real-markets-basic"),
  rightsState: "GREEN_CONDITIONAL",
  conditionalRightsSatisfied: false,
});
assert.equal(conditionalBlocked.state, "WITHHELD");

const conditionalReady = evaluateVlmTieredTableCustomerBoundary({
  ...base("real-markets-basic"),
  rightsState: "GREEN_CONDITIONAL",
  conditionalRightsSatisfied: true,
});
assert.equal(conditionalReady.state, "READY");

const tierMismatch = evaluateVlmTieredTableCustomerBoundary({
  ...base("real-markets-advanced"),
  analyzedProductId: "real-markets-pro",
  deliveredProductId: "real-markets-pro",
});
assert.equal(tierMismatch.state, "WITHHELD");
assert.equal(tierMismatch.reason, "tier_identity_mismatch");
assert.equal(tierMismatch.value, null);
assert.equal(tierMismatch.silentTierDowngradeAllowed, false);

const referenceEscalation = evaluateVlmTieredTableCustomerBoundary({
  ...base("real-markets-basic"),
  sourceSemanticClass: "REFERENCE",
  customerSemanticClass: "EXECUTABLE_QUOTE",
});
assert.equal(referenceEscalation.state, "WITHHELD");
assert.equal(referenceEscalation.reason, "semantic_class_mismatch");
assert.equal(referenceEscalation.executableQuoteClaimed, false);

const derivedWithoutReceipt = evaluateVlmTieredTableCustomerBoundary({
  ...base("shield-advanced"),
  sourceSemanticClass: "REFERENCE",
  customerSemanticClass: "DERIVED",
});
assert.equal(derivedWithoutReceipt.state, "WITHHELD");
assert.equal(derivedWithoutReceipt.reason, "derivation_receipt_missing");

const derivedWithReceipt = evaluateVlmTieredTableCustomerBoundary({
  ...base("shield-advanced"),
  sourceSemanticClass: "REFERENCE",
  customerSemanticClass: "DERIVED",
  derivedFromReceiptIds: ["receipt:source:12345678"],
});
assert.equal(derivedWithReceipt.state, "READY");
assert.equal(derivedWithReceipt.semanticClass, "DERIVED");

const stale = evaluateVlmTieredTableCustomerBoundary({
  ...base("shield-pro-basic"),
  sourceObservedAt: "2026-08-22T11:55:00.000Z",
  maxAgeSeconds: 60,
});
assert.equal(stale.state, "STALE");
assert.equal(stale.liveClaimed, false);

const missingTimestamp = evaluateVlmTieredTableCustomerBoundary({
  ...base("real-markets-pro"),
  sourceObservedAt: null,
});
assert.equal(missingTimestamp.state, "UNAVAILABLE");
assert.equal(missingTimestamp.reason, "source_timestamp_invalid");
assert.equal(missingTimestamp.value, null);

const safeError = evaluateVlmTieredTableCustomerBoundary({
  ...base("shield-pro-pro"),
  sourceState: "ERROR_CUSTOMER_SAFE",
  customerErrorCode: "provider_route_unavailable",
  value: 100,
});
assert.equal(safeError.state, "ERROR_CUSTOMER_SAFE");
assert.equal(safeError.customerErrorCode, "provider_route_unavailable");
assert.equal(safeError.value, null);
assert.equal(safeError.riskScore, null);
assert.equal(safeError.confidence, null);
assert.equal("rawError" in safeError, false);
assert.equal("providerPayload" in safeError, false);

const currentVenue = evaluateVlmTieredTableCustomerBoundary({
  ...base("real-markets-basic"),
  sourceSemanticClass: "VENUE_QUOTE",
  customerSemanticClass: "VENUE_QUOTE",
});
assert.equal(currentVenue.state, "READY");
assert.equal(currentVenue.liveClaimed, true);
assert.equal(currentVenue.executableQuoteClaimed, false);

const executable = evaluateVlmTieredTableCustomerBoundary({
  ...base("real-markets-advanced"),
  sourceSemanticClass: "EXECUTABLE_QUOTE",
  customerSemanticClass: "EXECUTABLE_QUOTE",
});
assert.equal(executable.state, "READY");
assert.equal(executable.liveClaimed, false);
assert.equal(executable.executableQuoteClaimed, true);

process.stdout.write(`${JSON.stringify({
  schemaVersion: "velmere.current-execution.tiered-table-customer-boundary-runtime.v1",
  status: "PASS",
  canonicalRows: VLM_TIERED_TABLE_PRODUCT_IDS.length,
  testedRightsStates: VLM_FIELD_RIGHTS_STATES.length,
  testedSemanticClasses: VLM_MARKET_SEMANTIC_CLASSES.length,
  testedCustomerStates: VLM_CUSTOMER_DATA_STATES.length,
  finalCredit: false,
})}\n`);
