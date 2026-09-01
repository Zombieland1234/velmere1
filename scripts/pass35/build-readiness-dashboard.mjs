#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const readJson = (file) => JSON.parse(readFileSync(path.join(root, file), "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

const current = readJson("config/current-release.json");
const preGates = readJson("config/pass35/pre-gates.json");
const catalog = readJson("config/pass35/product-cell-catalog.json");
const evidencePolicy = readJson("config/pass35/evidence-policy.json");
const external = readJson("config/pass35/external-proof-register.json");
const statusRegister = readJson(current.currentStatusRegisterPath);

const candidates = new Set([current.candidateId, preGates.candidateId, external.candidateId]);
if (candidates.size !== 1 || candidates.has(undefined) || candidates.has(null)) {
  throw new Error("pass35_readiness_dashboard_candidate_mismatch");
}
if (preGates.globalResult !== "NO_GO" || preGates.promotionAllowed !== false || current.productionPromotionAllowed !== false) {
  throw new Error("pass35_readiness_dashboard_false_promotion_state");
}
if (external.promotionAllowed !== false || external.status !== "BLOCKED_EXTERNAL") {
  throw new Error("pass35_readiness_dashboard_external_register_not_blocked");
}
if (!Array.isArray(catalog.productCells) || catalog.productCells.some((cell) => cell.sellEnabled !== false)) {
  throw new Error("pass35_readiness_dashboard_sell_enabled_cell");
}

const preGateBoard = Object.entries(preGates.preGates).map(([gateId, gate]) => ({
  gateId,
  status: gate.status,
  owner: gate.owner,
  reason: gate.reason,
}));
const productCellBoard = catalog.productCells.map((cell) => ({
  productCellId: cell.productCellId,
  productFamily: cell.productFamily,
  tier: cell.tier,
  role: cell.role,
  currentStatus: cell.currentStatus,
  sellEnabled: cell.sellEnabled,
  sellBlockedReasons: cell.sellBlockedReasons,
  readinessPassed: Object.values(cell.readiness).filter(Boolean).length,
  readinessRequired: Object.keys(cell.readiness).length,
}));
const externalBoard = external.workstreams.map((stream) => ({
  id: stream.id,
  status: stream.status,
  verifiedCount: stream.verifiedCount,
  requiredCount: stream.requiredCount,
  remainingCount: stream.requiredCount - stream.verifiedCount,
}));
const topBlockers = [...externalBoard]
  .sort((left, right) => right.remainingCount - left.remainingCount || left.id.localeCompare(right.id))
  .slice(0, 5);
if (statusRegister.schemaVersion !== "velmere.pass35.current-status-register.v1"
  || statusRegister.canonicalCurrentTruth !== true
  || statusRegister.candidateId !== current.candidateId
  || statusRegister.sourceRevisionId !== current.sourceRevisionId
  || statusRegister.globalDecision !== "NO_GO"
  || statusRegister.promotionAllowed !== false
  || statusRegister.sellEnabledCount !== 0) {
  throw new Error("pass35_readiness_dashboard_status_register_invalid");
}
const roadmapStatusCounts = { DONE: 0, PARTIAL: 0, BLOCKED_EXTERNAL: 0, NOT_DONE: 0 };
for (const row of statusRegister.rows ?? []) {
  if (!(row.status in roadmapStatusCounts)) throw new Error(`pass35_readiness_dashboard_status_invalid:${row.id}`);
  roadmapStatusCounts[row.status] += 1;
}
const roadmapStatusTotal = Object.values(roadmapStatusCounts).reduce((sum, count) => sum + count, 0);
if (roadmapStatusTotal === 0) throw new Error("pass35_readiness_dashboard_status_register_empty");
const strictCompletionPercent = Number(((roadmapStatusCounts.DONE / roadmapStatusTotal) * 100).toFixed(1));
const weightedCompletionPercent = Number((((roadmapStatusCounts.DONE + roadmapStatusCounts.PARTIAL * 0.5) / roadmapStatusTotal) * 100).toFixed(1));

const dashboardCore = {
  schemaVersion: "velmere.pass35.readiness-dashboard.v1",
  candidateId: current.candidateId,
  generatedFromStateAt: external.evaluatedAt,
  globalDecision: "NO_GO",
  promotionAllowed: false,
  releaseId: null,
  sourceArchive: current.inputSourceArchive,
  currentRoadmapPath: current.currentRoadmapPath,
  currentStatusRegisterPath: current.currentStatusRegisterPath,
  currentStatusBoardPath: current.currentStatusBoardPath,
  roadmapStatusSummary: {
    denominator: roadmapStatusTotal,
    ...roadmapStatusCounts,
    strictCompletionPercent,
    weightedCompletionPercent,
    method: "Only config/pass35/current-status-register.json is counted. Older roadmap addenda are historical notes. PARTIAL contributes zero to strict completion and one half only to the explicitly weighted planning metric.",
  },
  preGateBoard,
  productCellSummary: {
    total: productCellBoard.length,
    sellEnabled: productCellBoard.filter((cell) => cell.sellEnabled).length,
    flagship: productCellBoard.filter((cell) => cell.role === "FLAGSHIP").length,
    parked: productCellBoard.filter((cell) => cell.role === "PARKED").length,
  },
  productCellBoard,
  externalEvidenceSummary: {
    required: externalBoard.reduce((sum, stream) => sum + stream.requiredCount, 0),
    verified: externalBoard.reduce((sum, stream) => sum + stream.verifiedCount, 0),
    completeWorkstreams: externalBoard.filter((stream) => stream.status === "COMPLETE_EXTERNAL").length,
    totalWorkstreams: externalBoard.length,
  },
  externalBoard,
  topBlockers,
  evidenceRules: {
    fixtureIsolationRequired: evidencePolicy.fixtureIsolationRequired,
    fixtureEvidenceMayUseCanonicalPaths: evidencePolicy.fixtureEvidenceMayUseCanonicalPaths,
    requiredBinding: evidencePolicy.requiredBinding,
  },
  allowedClaims: ["offline_engineering_checkpoint", "static_control_contracts", "deterministic_local_package"],
  forbiddenClaims: preGates.forbiddenClaims,
  nextDecision: "Obtain signed FG00 and ORG00 records; until then no product cell may be promoted or sold.",
  truthBoundary: "This dashboard is computed from fail-closed local control records. It is not staging, live, legal, independent, customer or market proof.",
};
const dashboard = { ...dashboardCore, dashboardSha256: sha256(JSON.stringify(dashboardCore)) };
const output = path.join(root, "_velmere/pass35/PASS35_READINESS_DASHBOARD.json");
mkdirSync(path.dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(dashboard, null, 2)}\n`);
console.log(JSON.stringify({
  status: "PASS_FAIL_CLOSED_READINESS_DASHBOARD",
  productCells: dashboard.productCellSummary.total,
  sellEnabled: dashboard.productCellSummary.sellEnabled,
  externalEvidence: `${dashboard.externalEvidenceSummary.verified}/${dashboard.externalEvidenceSummary.required}`,
  roadmapStrictCompletion: `${dashboard.roadmapStatusSummary.strictCompletionPercent}%`,
  promotionAllowed: dashboard.promotionAllowed,
  output: path.relative(root, output),
}, null, 2));
