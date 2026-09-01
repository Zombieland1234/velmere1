import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  PASS35_PAID_UI_STOP_SELL_ID,
  resolvePass35PaidUiStopSell,
} from "../../lib/commerce/pass35-paid-ui-stop-sell.ts";
import { evaluatePass35ProductCellCheckout } from "../../lib/commerce/pass35-product-cell-readiness.ts";

assert.equal(PASS35_PAID_UI_STOP_SELL_ID, "PASS35_PC00_PAID_UI_STOP_SELL");

const compatibleBindings = [
  ["vlm_pro_analysis_single", "shield", "pro", "brain_pro_evidence_analysis"],
  ["vlm_pro_analysis_single", "real-markets", "pro", "brain_pro_evidence_analysis"],
  ["vlm_advanced_analysis_single", "shield", "advanced", "brain_advanced_investigation"],
  ["vlm_advanced_analysis_single", "real-markets", "advanced", "brain_advanced_investigation"],
  ["vlm_pro_pdf_single", "browser", "pro", "lens_pro_evidence_pdf"],
  ["vlm_advanced_pdf_single", "browser", "advanced", "lens_advanced_proof_pdf"],
  ["vlm_pro_audit_review", "audit", "pro", "audit_evm_pro_automated_review"],
  ["vlm_advanced_audit_human_review", "audit", "advanced", "audit_evm_advanced_human_review"],
];

const coveredLegacyIds = new Set();
for (const [productId, surface, tier, productCellId] of compatibleBindings) {
  coveredLegacyIds.add(productId);
  const derived = resolvePass35PaidUiStopSell({ productId, surface, tier });
  assert.equal(derived.ok, false);
  assert.equal(derived.checkoutAllowed, false);
  assert.equal(derived.reason, "product_cell_not_sell_ready");
  assert.equal(derived.productCellId, productCellId);
  assert.equal(derived.derivedFromLegacy, true);
  assert.ok(derived.blockers.includes("PASS35_PRODUCT_CELL_SELL_DISABLED"));

  const explicit = resolvePass35PaidUiStopSell({
    productId,
    requestedProductCellId: productCellId,
    surface,
    tier,
  });
  assert.equal(explicit.ok, false);
  assert.equal(explicit.checkoutAllowed, false);
  assert.equal(explicit.productCellId, productCellId);
  assert.equal(explicit.derivedFromLegacy, false);

  const server = evaluatePass35ProductCellCheckout({
    legacyProductId: productId,
    requestedProductCellId: productCellId,
    surface,
    tier,
  });
  assert.equal(server.ok, false);
  assert.equal(server.chargeAllowed, false);
  assert.equal(server.error, "product_cell_not_sell_ready");
  assert.equal(server.productCell.productCellId, explicit.productCellId);
}
assert.equal(coveredLegacyIds.size, 6, "all six legacy paid IDs must have UI coverage");

for (const candidate of [
  {
    productId: "vlm_pro_pdf_single",
    requestedProductCellId: "lens_pro_evidence_pdf",
    surface: "shield",
    tier: "pro",
  },
  {
    productId: "vlm_pro_analysis_single",
    requestedProductCellId: "brain_pro_evidence_analysis",
    surface: "shield",
    tier: "advanced",
  },
  {
    productId: "vlm_pro_audit_review",
    requestedProductCellId: "lens_pro_evidence_pdf",
    surface: "audit",
    tier: "pro",
  },
  {
    productId: "vlm_unknown_paid_sku",
    surface: "browser",
    tier: "pro",
  },
  {
    productId: "vlm_pro_pdf_single",
    requestedProductCellId: "",
    surface: "browser",
    tier: "pro",
  },
  {
    productId: "vlm_pro_pdf_single",
    surface: "browser",
    tier: "basic",
  },
]) {
  const verdict = resolvePass35PaidUiStopSell(candidate);
  assert.equal(verdict.ok, false);
  assert.equal(verdict.checkoutAllowed, false);
  assert.ok(verdict.blockers.length > 0);
}

const client = readFileSync("lib/commerce/vlm-paid-access-client.ts", "utf8");
const clientGateIndex = client.indexOf("const productCellGate = resolvePass35PaidUiStopSell(");
const clientIntentIndex = client.indexOf("writeVlmPaidCheckoutIntent({", clientGateIndex);
const clientFetchIndex = client.indexOf('fetchWithDeadline("/api/checkout/vlm-service"', clientGateIndex);
assert.ok(clientGateIndex >= 0);
assert.ok(clientIntentIndex > clientGateIndex, "UI gate must precede pending checkout intent");
assert.ok(clientFetchIndex > clientIntentIndex, "UI gate must precede checkout network work");
assert.match(client.slice(clientGateIndex, clientIntentIndex), /throw new Pass35PaidUiStopSellError/u);
assert.match(client.slice(clientFetchIndex), /productCellId:\s*productCellGate\.productCellId/u);

const uiFiles = [
  "components/checkout/VelmereCheckoutFlowClient.tsx",
  "components/market-integrity/AssetDetailModal.tsx",
  "components/market-integrity/CrossAssetCollapseRadarPanel.tsx",
  "components/search/VelmereIntelligenceSearchClient.tsx",
  "components/security/SecurityAuditsCleanPage.tsx",
];
for (const file of uiFiles) {
  const source = readFileSync(file, "utf8");
  assert.match(source, /pass35PaidUiStopSell|resolvePass35PaidUiStopSell|paidAnalysisUiStopSell/u, `${file} must consume the PASS35 UI gate`);
}

const checkout = readFileSync("components/checkout/VelmereCheckoutFlowClient.tsx", "utf8");
assert.match(checkout, /serviceStopSell/u);
assert.match(checkout, /data-pass35-paid-ui-stop-sell/u);
assert.match(checkout, /productCellId:\s*serviceLine\?\.productCellGate\.ok/u);

const audit = readFileSync("components/security/SecurityAuditsCleanPage.tsx", "utf8");
assert.match(audit, /disabled=\{!inputValid \|\| paidSaleBlocked/u);
assert.match(audit, /productCellId:\s*productCellGate\.productCellId/u);

const lens = readFileSync("components/search/VelmereIntelligenceSearchClient.tsx", "utf8");
assert.match(lens, /disabled=\{[\s\S]{0,160}paidPdfUiGate\(selectedPdfDepth\)/u);

console.log("PASS35 paid UI: all six legacy IDs map to exact canonical product cells");
console.log("PASS35 paid UI: deep links, Lens, Audit, Shield and Real Markets stop-sell fail closed");
console.log("PASS35 paid UI: disabled cells create neither a pending intent nor a checkout request");
