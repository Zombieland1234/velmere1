#!/usr/bin/env node
import fs from "node:fs";
import { collectPass35Inventory } from "../pass35/source-inventory.mjs";
import { canonicalJson, digestValid, readJson, sha256 } from "./historical-descendant-chain-lib.mjs";
const root = process.cwd();
const REV = "VELMERE_PASS36_A88R1_SEMANTIC_GENERALIZATION_ROUTE_EXECUTION_PRIVACY_AND_PDF_EVIDENCE_RETENTION";
const policy = readJson(root, "config/pass36/a88r1-semantic-route-privacy-pdf-policy.json");
const parent = readJson(root, policy.parentDescendantManifestPath);
if (!digestValid(parent)) throw new Error("a88r1_parent_manifest_invalid");
if (parent.revisionId !== policy.parentRevisionId) throw new Error(`a88r1_parent_revision:${parent.revisionId}`);
const excluded = new Set(policy.descendantManifestExclusions);
const inv = collectPass35Inventory(root);
if (inv.unknownCount !== 0) throw new Error(`a88r1_unknown_inventory:${inv.unknownCount}`);
const rows = inv.entries.filter((row) => row.sourceIncluded && !excluded.has(row.path)).map((row) => ({ path: row.path, byteLength: row.byteLength, sha256: row.sha256, mode: row.mode })).sort((a, b) => a.path.localeCompare(b.path, "en"));
const payload = { fileCount: rows.length, byteLength: rows.reduce((sum, row) => sum + row.byteLength, 0), pathSetSha256: sha256(rows.map((row) => row.path).join("\n")), aggregateSha256: sha256(rows.map((row) => `${row.path}\0${row.byteLength}\0${row.sha256}\0${row.mode}`).join("\n")) };
const receipt = readJson(root, "config/pass36/a88r1-test-receipt.json");
if (receipt.status !== "PASS_A88R1_LOCAL_SEMANTIC_ROUTE_PRIVACY_PDF_NO_PROMOTION" || receipt.summary?.failed !== 0) throw new Error("a88r1_receipt_not_pass");
const core = {
  schemaVersion: "velmere.pass36.a88r1.current-root-descendant-manifest.v1",
  revisionId: REV,
  parentRevisionId: policy.parentRevisionId,
  parentDescendantManifestDigestSha256: parent.manifestDigestSha256,
  generatedAt: policy.deterministicEpoch,
  payload,
  exclusions: [...excluded].sort(),
  claims: {
    semanticGeneralizationImplemented: true,
    combinedSyntheticCases: receipt.combined.cases,
    focusedSemanticCases: receipt.focused.cases,
    channelProjections: receipt.combined.projections,
    semanticMutations: receipt.combined.mutations,
    mutationKilled: receipt.combined.mutationKilled,
    decisionMismatches: receipt.invariants.decisionMismatches,
    routePreflightCases: receipt.routeEvidence.cases,
    routePreflightChecks: receipt.routeEvidence.checks,
    providerCallsOnBlockedCases: receipt.routeEvidence.providerCallsOnBlockedCases,
    publicStablePromptFingerprints: 0,
    physicalSyntheticPdfsRetained: receipt.pdfEvidence.pdfCount,
    physicalSyntheticPdfPages: receipt.pdfEvidence.pageCount,
    realCustomerPdfs: 0,
    realEvalCasesVerified: 0,
    realModelExecutions: 0,
    rightsApprovedCases: 0,
    independentAdjudications: 0,
    customerDecisionUtilityLabels: 0,
    realCalibrationWindowsClosed: 0,
    legalRegulatoryDecisionsSigned: 0,
    exactA80CandidateBound: false,
    paidGateEligible: false,
    liveProven: false,
    saleEnabled: false,
  },
};
const manifest = { ...core, manifestDigestSha256: sha256(canonicalJson(core)) };
fs.writeFileSync(policy.descendantManifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: "PASS_A88R1_DESCENDANT_MANIFEST_BUILD", output: policy.descendantManifestPath, payload, manifestDigestSha256: manifest.manifestDigestSha256 }, null, 2));
