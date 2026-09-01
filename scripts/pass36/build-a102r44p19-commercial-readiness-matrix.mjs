#!/usr/bin/env node
import fs from "node:fs";
import {
  buildVlmCommercialReadinessMatrix,
} from "../../lib/commerce/vlm-commercial-readiness.ts";

const policy = JSON.parse(fs.readFileSync(
  "config/pass36/a102r44p19-basic-free-pro-advanced-commercial-readiness-policy.json",
  "utf8",
));
const retained = policy.currentRetainedEvidence;
const evidence = {
  gates: Object.fromEntries(policy.gateIds.map((id) => [id, retained[id] === true])),
  auditRecallBps: retained.auditRecallBps,
  controlFlagBps: retained.controlFlagBps,
  independentlyReviewedCases: retained.independentlyReviewedCases,
  realCustomerCases: retained.realCustomerCases,
  rightsApprovedRows: retained.rightsApprovedRows,
};
const families = [
  "audit", "pdf", "browser", "shield", "shield-map", "real-markets",
  "market-impact", "whale-watch", "angel", "risk",
];
const evidenceByFamily = Object.fromEntries(families.map((family) => [family, evidence]));
const rows = buildVlmCommercialReadinessMatrix({ locale: "en", evidenceByFamily });
const result = {
  schemaVersion: "velmere.pass36.a102r44p19.commercial-readiness-matrix.v1",
  revisionId: policy.revisionId,
  globalDecision: "NO_GO",
  basicAlwaysFree: true,
  proAdvancedTarget: "GO_PAID_AFTER_EVIDENCE",
  rowCount: rows.length,
  readyForReleaseReview: rows.filter((row) => row.readyForReleaseReview).length,
  rows,
  truthBoundary: policy.truthBoundary,
};
console.log(JSON.stringify(result, null, 2));
