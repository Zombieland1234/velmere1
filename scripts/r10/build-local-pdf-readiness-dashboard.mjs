#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const root = process.cwd();
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

const policy = readJson("config/pass35/local-product-quality-policy.json");
const preGates = readJson("config/pass35/pre-gates.json");
const catalog = readJson("config/pass35/product-cell-catalog.json");
const external = readJson("config/pass35/external-proof-register.json");

const candidateId = policy.candidateId;
if (!candidateId || preGates.candidateId !== candidateId || external.candidateId !== candidateId) {
  throw new Error("r10_local_pdf_dashboard_local_candidate_mismatch");
}
if (policy.mode !== "synthetic_local_quality_only") {
  throw new Error("r10_local_pdf_dashboard_policy_mode_invalid");
}
if (preGates.globalResult !== "NO_GO" || preGates.promotionAllowed !== false) {
  throw new Error("r10_local_pdf_dashboard_pregates_not_fail_closed");
}
if (external.status !== "BLOCKED_EXTERNAL" || external.promotionAllowed !== false) {
  throw new Error("r10_local_pdf_dashboard_external_register_not_fail_closed");
}
if (!Array.isArray(catalog.productCells) || catalog.productCells.length !== policy.releaseBoundary.productCells) {
  throw new Error("r10_local_pdf_dashboard_catalog_size_invalid");
}
if (catalog.productCells.some((cell) => cell.sellEnabled !== false)) {
  throw new Error("r10_local_pdf_dashboard_sell_enabled_cell");
}

const externalBoard = (external.workstreams ?? []).map((stream) => ({
  id: stream.id,
  status: stream.status,
  verifiedCount: Number(stream.verifiedCount ?? 0),
  requiredCount: Number(stream.requiredCount ?? 0),
  remainingCount: Number(stream.requiredCount ?? 0) - Number(stream.verifiedCount ?? 0),
}));
const externalVerified = externalBoard.reduce((sum, row) => sum + row.verifiedCount, 0);
const externalRequired = externalBoard.reduce((sum, row) => sum + row.requiredCount, 0);
if (externalVerified !== policy.releaseBoundary.externalVerifiedCredit) {
  throw new Error("r10_local_pdf_dashboard_external_credit_nonzero");
}

const productCellBoard = catalog.productCells.map((cell) => ({
  productCellId: cell.productCellId,
  productFamily: cell.productFamily,
  tier: cell.tier,
  role: cell.role,
  currentStatus: cell.currentStatus,
  sellEnabled: cell.sellEnabled,
  sellBlockedReasons: Array.isArray(cell.sellBlockedReasons) ? cell.sellBlockedReasons : [],
}));
const sellEnabled = productCellBoard.filter((row) => row.sellEnabled === true).length;
if (sellEnabled !== policy.releaseBoundary.sellEnabledCells) {
  throw new Error("r10_local_pdf_dashboard_sell_count_invalid");
}

const core = {
  schemaVersion: policy.releaseBoundary.dashboardSchemaVersion,
  candidateId,
  sourceClass: "PASS35_LOCAL_SYNTHETIC_PDF_QUALITY_PROJECTION",
  generatedFrom: {
    policy: "config/pass35/local-product-quality-policy.json",
    preGates: "config/pass35/pre-gates.json",
    productCellCatalog: "config/pass35/product-cell-catalog.json",
    externalProofRegister: "config/pass35/external-proof-register.json",
  },
  globalDecision: policy.releaseBoundary.globalDecision,
  promotionAllowed: policy.releaseBoundary.promotionAllowed,
  releaseId: null,
  productCellSummary: {
    total: productCellBoard.length,
    sellEnabled,
    flagship: productCellBoard.filter((row) => row.role === "FLAGSHIP").length,
    parked: productCellBoard.filter((row) => row.role === "PARKED").length,
  },
  productCellBoard,
  externalEvidenceSummary: {
    required: externalRequired,
    verified: externalVerified,
    completeWorkstreams: externalBoard.filter((row) => row.status === "COMPLETE_EXTERNAL").length,
    totalWorkstreams: externalBoard.length,
  },
  externalBoard,
  allowedClaims: ["local synthetic product quality", "offline PDF renderer QA", "deterministic local control records"],
  forbiddenClaims: Array.isArray(preGates.forbiddenClaims) ? preGates.forbiddenClaims : [],
  truthBoundary: "This is a projection from Pass35 local control records for synthetic offline PDF quality only. It is not staging proof, not live proof, not customer proof, not legal proof, not independent benchmark proof, authorizes no sale, and grants zero external evidence credit.",
};
const dashboard = { ...core, dashboardSha256: sha256(JSON.stringify(core)) };
const out = path.join(root, policy.inputs.readinessDashboard);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, `${JSON.stringify(dashboard, null, 2)}\n`);

console.log(JSON.stringify({
  status: "PASS_LOCAL_PDF_DASHBOARD_NO_PROMOTION",
  candidateId,
  productCells: productCellBoard.length,
  sellEnabled,
  externalVerified,
  externalRequired,
  promotionAllowed: false,
  output: path.relative(root, out),
}, null, 2));
