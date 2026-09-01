#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { evaluateDataLicenseEligibility } from "../../lib/worldclass/data-license-eligibility.mjs";

const root = process.cwd();
const matrixPath = path.join(root, "evaluation/pass20/data-field-provider-license-matrix.jsonl");
const summaryPath = path.join(root, "evaluation/pass20/data-field-provider-license-summary.json");
const rows = fs.readFileSync(matrixPath, "utf8").trim().split(/\r?\n/u).filter(Boolean).map((line) => JSON.parse(line));
const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
function sha256(value) { return createHash("sha256").update(value).digest("hex"); }
function evidenceFor(cell) {
  const families = cell.requiredSourceFamilies.slice(0, cell.minimumIndependentFamilies);
  while (families.length < cell.minimumIndependentFamilies) families.push(`independent_${families.length + 1}`);
  return families.map((family, index) => ({
    sourceId: `${cell.cellId.slice(0, 12)}-${index + 1}`,
    family,
    canonicalIdentity: cell.canonicalIdentity,
    fieldId: cell.fieldId,
    observedAt: "2026-07-20T12:00:00.000Z",
    licenseStatus: cell.tier === "basic" && index === 0 ? "display_only" : "verified",
    payloadSha256: sha256(`${cell.cellId}:${family}`),
    value: `${cell.fieldId}:${index + 1}`
  }));
}
let eligiblePass = 0;
let currentNoGoPass = 0;
const failures = [];
const uniqueIds = new Set();
for (const cell of rows) {
  if (uniqueIds.has(cell.cellId)) failures.push({ cellId: cell.cellId, code: "duplicate_cell_id" });
  uniqueIds.add(cell.cellId);
  if (cell.currentProviderBoundEvidenceRows === 0 && cell.currentSellEligible === false && cell.currentEvidenceStatus === "missing_provider_bound_evidence") currentNoGoPass += 1;
  else failures.push({ cellId: cell.cellId, code: "current_truth_boundary_invalid" });
  const result = evaluateDataLicenseEligibility({
    cell,
    evidenceRows: evidenceFor(cell),
    entitlementStatus: cell.requiresEntitlement ? "verified" : "not_required",
    humanReviewStatus: (cell.specialGates ?? []).includes("human_review_approved") ? "approved" : "not_required",
    renderParityStatus: (cell.specialGates ?? []).includes("preview_download_account_parity_verified") ? "verified" : "not_applicable",
    now: "2026-07-20T12:00:30.000Z"
  });
  if (result.status === "eligible" && result.blockers.length === 0 && /^[0-9a-f]{64}$/u.test(result.receiptSha256)) eligiblePass += 1;
  else failures.push({ cellId: cell.cellId, code: "eligible_fixture_rejected", blockers: result.blockers });
}
const ok = failures.length === 0 && rows.length === summary.requirementCells && summary.providerBoundCells === 0 && summary.sellEligibleCells === 0;
const receipt = {
  schemaVersion: "velmere.pass20.data-license-matrix-verification.v1",
  generatedAt: "2026-07-20T12:00:00.000Z",
  ok,
  cells: rows.length,
  uniqueCellIds: uniqueIds.size,
  currentNoGoTruthPass: currentNoGoPass,
  syntheticEligibleContractPass: eligiblePass,
  failures,
  truthBoundary: "Synthetic eligible packets prove evaluator behavior only. Current provider-bound/license-verified/sell-eligible cells remain zero."
};
const out = path.join(root, ".velmere/pass20-diagnostics/data-license-matrix-verification.json");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ ok, cells: rows.length, currentNoGoTruthPass: currentNoGoPass, syntheticEligibleContractPass: eligiblePass, failures: failures.length }, null, 2));
if (!ok) process.exit(1);
