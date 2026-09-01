import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  evaluatePass35ProductCellCheckout,
  listPass35ProductCells,
  PASS35_LEGACY_PRODUCT_IDS,
  PASS35_PRODUCT_CELL_CATALOG,
  PASS35_PRODUCT_CELL_GATE_ID,
  resolvePass35ProductCellBinding,
} from "../../lib/commerce/pass35-product-cell-readiness.ts";

assert.equal(PASS35_PRODUCT_CELL_GATE_ID, "PASS35_PC00_PRODUCT_CELL_CHECKOUT_GATE");
assert.equal(PASS35_PRODUCT_CELL_CATALOG.schemaVersion, "velmere.pass35.product-cell-catalog.v1");
assert.equal(PASS35_PRODUCT_CELL_CATALOG.productCells.length, 30);
assert.equal(PASS35_PRODUCT_CELL_CATALOG.legacySkuMappings.length, 6);
assert.deepEqual(
  [...PASS35_PRODUCT_CELL_CATALOG.legacySkuMappings.map((row) => row.legacyProductId)].sort(),
  [...PASS35_LEGACY_PRODUCT_IDS].sort(),
);
assert.equal(new Set(PASS35_PRODUCT_CELL_CATALOG.productCells.map((cell) => cell.productCellId)).size, 30);
assert.equal(PASS35_PRODUCT_CELL_CATALOG.productCells.every((cell) => cell.sellEnabled === false), true);
assert.equal(PASS35_PRODUCT_CELL_CATALOG.productCells.some((cell) => cell.role === "FLAGSHIP"), false);
assert.equal(listPass35ProductCells().length, 30);

const compatibleLegacyBindings = [
  ["vlm_pro_analysis_single", "shield", "pro", "brain_pro_evidence_analysis"],
  ["vlm_pro_analysis_single", "real-markets", "pro", "brain_pro_evidence_analysis"],
  ["vlm_advanced_analysis_single", "shield", "advanced", "brain_advanced_investigation"],
  ["vlm_advanced_analysis_single", "real-markets", "advanced", "brain_advanced_investigation"],
  ["vlm_pro_pdf_single", "browser", "pro", "lens_pro_evidence_pdf"],
  ["vlm_advanced_pdf_single", "browser", "advanced", "lens_advanced_proof_pdf"],
  ["vlm_pro_audit_review", "audit", "pro", "audit_evm_pro_automated_review"],
  ["vlm_advanced_audit_human_review", "audit", "advanced", "audit_evm_advanced_human_review"],
];

for (const [legacyProductId, surface, tier, productCellId] of compatibleLegacyBindings) {
  const derived = resolvePass35ProductCellBinding({ legacyProductId, surface, tier });
  assert.equal(derived.ok, true, `${legacyProductId}/${surface}/${tier} must resolve uniquely`);
  if (!derived.ok) continue;
  assert.equal(derived.productCell.productCellId, productCellId);
  assert.equal(derived.derivedFromLegacy, true);
  assert.equal(derived.chargeAllowed, false);
  assert.match(derived.bindingSha256, /^[a-f0-9]{64}$/u);

  const exact = resolvePass35ProductCellBinding({
    legacyProductId,
    requestedProductCellId: productCellId,
    surface,
    tier,
  });
  assert.equal(exact.ok, true);
  if (exact.ok) {
    assert.equal(exact.derivedFromLegacy, false);
    assert.equal(exact.bindingSha256, derived.bindingSha256);
  }

  const readiness = evaluatePass35ProductCellCheckout({ legacyProductId, surface, tier, requestedProductCellId: productCellId });
  assert.equal(readiness.ok, false);
  assert.equal(readiness.chargeAllowed, false);
  assert.equal(readiness.error, "product_cell_not_sell_ready");
  assert.equal(readiness.status, 503);
  assert.equal(readiness.readinessEvaluated, true);
  assert.ok(readiness.blockers.includes("PASS35_PRODUCT_CELL_SELL_DISABLED"));
  assert.ok(readiness.blockers.includes("PASS35_CATALOG_NOT_APPROVED"));
  assert.ok(readiness.blockers.includes("PASS35_FLAGSHIP_NOT_SELECTED"));
}

const wrongSurface = resolvePass35ProductCellBinding({
  legacyProductId: "vlm_pro_pdf_single",
  requestedProductCellId: "lens_pro_evidence_pdf",
  surface: "shield",
  tier: "pro",
});
assert.equal(wrongSurface.ok, false);
assert.equal(wrongSurface.error, "product_cell_surface_tier_mismatch");
assert.equal(wrongSurface.chargeAllowed, false);

const wrongTier = resolvePass35ProductCellBinding({
  legacyProductId: "vlm_pro_analysis_single",
  requestedProductCellId: "brain_pro_evidence_analysis",
  surface: "shield",
  tier: "advanced",
});
assert.equal(wrongTier.ok, false);
assert.equal(wrongTier.error, "product_cell_surface_tier_mismatch");

const wrongCell = resolvePass35ProductCellBinding({
  legacyProductId: "vlm_pro_audit_review",
  requestedProductCellId: "lens_pro_evidence_pdf",
  surface: "audit",
  tier: "pro",
});
assert.equal(wrongCell.ok, false);
assert.equal(wrongCell.error, "product_cell_binding_mismatch");
assert.equal(wrongCell.expectedProductCellId, "audit_evm_pro_automated_review");

const wrongSku = resolvePass35ProductCellBinding({
  legacyProductId: "vlm_pro_not_registered",
  requestedProductCellId: "brain_pro_evidence_analysis",
  surface: "shield",
  tier: "pro",
});
assert.equal(wrongSku.ok, false);
assert.equal(wrongSku.error, "invalid_legacy_product_id");

const invalidCell = resolvePass35ProductCellBinding({
  legacyProductId: "vlm_pro_analysis_single",
  requestedProductCellId: "not_registered_cell",
  surface: "shield",
  tier: "pro",
});
assert.equal(invalidCell.ok, false);
assert.equal(invalidCell.error, "invalid_product_cell_id");

const route = readFileSync("app/api/checkout/vlm-service/route.ts", "utf8");
const gateIndex = route.indexOf("const productCellGate = evaluatePass35ProductCellCheckout(");
const accountIndex = route.indexOf("const account = await resolveRequestAccount(request);");
const stripeClientIndex = route.indexOf("const stripe = getStripeServerClient();");
const stripeCreateIndex = route.indexOf("stripe.checkout.sessions.create(sessionParams,");
assert.ok(gateIndex >= 0, "checkout route must call the PASS35 product-cell gate");
assert.ok(accountIndex > gateIndex, "product-cell no-sell gate must run before account/provider work");
assert.ok(stripeClientIndex > gateIndex, "product-cell gate must run before creating a Stripe client");
assert.ok(stripeCreateIndex > stripeClientIndex, "Stripe session creation must remain after the product-cell gate");
assert.match(route.slice(stripeCreateIndex, stripeCreateIndex + 280), /idempotencyKey:\s*stripeIdempotencyKey/u, "Stripe session creation must remain server-idempotency bound");
assert.match(route.slice(gateIndex, accountIndex), /chargeAllowed:\s*false/u);
assert.match(route, /productCellId:\s*productCellGate\.productCell\.productCellId/u);
assert.match(route, /productCellBindingSha256:\s*productCellGate\.bindingSha256/u);

console.log("PASS35 product-cell catalog: 30 candidate cells and all 6 legacy IDs are registered");
console.log("PASS35 binding: exact surface/tier/cell/SKU mismatches fail closed");
console.log("PASS35 checkout: no readiness means no Stripe client and no charge");

