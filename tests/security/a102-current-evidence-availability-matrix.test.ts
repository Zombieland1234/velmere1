import assert from "node:assert/strict";
import { buildCurrentEvidenceAvailabilityMatrix } from "@/lib/commerce/vlm-current-evidence-availability-matrix";
import { verifyVlmTierEligibilityReceipt } from "@/lib/commerce/vlm-evidence-availability";

let assertions = 0;
function check(value: unknown, message: string) {
  assertions += 1;
  assert.ok(value, message);
}

const matrix = buildCurrentEvidenceAvailabilityMatrix({
  locale: "en",
  evaluatedAt: "2026-08-14T05:00:00.000Z",
});

check(
  matrix.schemaVersion === "velmere.current-evidence-availability-matrix.p66.v1" ||
  matrix.schemaVersion === "velmere.current-evidence-availability-matrix.v3",
  "matrix must use the canonical topology schema",
);
check(matrix.denominator === 20, "execution matrix must cover 20 canonical rows");
check(matrix.executionCoverageDenominator === 20, "execution denominator must remain explicit");
check(matrix.customerFacingSaleEligibilityDenominator === 20, "sale eligibility denominator must use 20 real customer-facing rows");
check(matrix.products === 10, "10-product canonical topology must remain frozen");
check(new Set(matrix.profiles.map((row) => row.profileId)).size === 20, "profile ids must be unique");
check(new Set(matrix.customerFacingRows.map((row) => row.rowId)).size === 20, "customer-facing row ids must be unique");
check(matrix.profiles.every((row) => verifyVlmTierEligibilityReceipt(row.receipt)), "all eligibility receipts must verify");
check(matrix.profiles.every((row) => row.publicProjection.schemaVersion === "velmere.public-tier-eligibility.v1"), "all public projections must use the pinned schema");
check(matrix.customerFacingRows.every((row) => row.receipt.saleEligible === false), "current catalog/evidence must keep every customer-facing sale fail-closed");
check(matrix.saleEligibleCustomerFacingRowCount === 0, "20-row sale summary must retain zero sale-eligible rows");
check(matrix.saleEligibleInternalProfileCount === 0, "20-profile internal context summary must retain zero eligible contexts");
check(matrix.analysisEligibleCustomerFacingRowCount === 0, "generic current matrix has no case/time/provider/policy evidence and must retain zero customer-row analysis eligibility");
check(
  Object.entries(matrix.evidenceAuthority.currentLocalGates)
    .every(([gate, value]) => gate === "source_authority" ? value === true : value === false),
  "customer-facing runtime cannot mirror unauthenticated filesystem receipts as compile-time true gates",
);
check(matrix.profiles.every((row) => row.receipt.estimatedRestorationAt === null), "matrix must not invent restoration ETA");
check(matrix.productSummaries.length === 10, "every product family must have a summary");
check(matrix.profiles.some((row) => row.canonicalFamily === "shield-pro"), "Shield Pro must remain a separate family");
check(matrix.customerFacingRows.some((row) => row.rowId === "market-impact"), "Market Impact must remain a customer-facing standalone row");
check(matrix.customerFacingRows.some((row) => row.rowId === "whale-watch"), "Whale Watch must remain a customer-facing standalone row");
check(matrix.customerFacingRows.some((row) => row.rowId === "shield-map"), "Shield Map must remain a customer-facing standalone row");
check(matrix.customerFacingRows.some((row) => row.rowId === "angel"), "Angel must remain a customer-facing standalone row");
check(matrix.customerFacingRows.some((row) => row.rowId === "risk-indicator"), "Risk Indicator must remain a customer-facing standalone row");
check(matrix.transitions.length === 10, "5 tiered families must expose two tier transitions each = 10");
check(matrix.profiles.every((row) => row.truthInvariantAcrossContexts && row.safetyInvariantAcrossContexts), "truth and safety invariants must apply to every context");
check(matrix.truthBoundary.includes("20 real customer-facing rows"), "matrix must preserve the 20 customer rows boundary");

console.log(`Current evidence availability matrix 20-row: PASS (${assertions}/${assertions})`);
