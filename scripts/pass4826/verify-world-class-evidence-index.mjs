#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { computePass4823SourceTree } from "../pass4823/typecheck-source-contract.mjs";
import {
  WORLD_CLASS_EVIDENCE_INDEX_VERIFICATION_SCHEMA,
  sealEvidenceIndexVerification,
  validateEvidenceIndexVerificationReceipt,
  verifyTruthBoundEvidenceIndex,
} from "./world-class-evidence-index-contract.mjs";

const root = process.cwd();

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`argument_value_missing:${name}`);
  return value;
}

function resolveProjectPath(relativePath) {
  if (path.isAbsolute(relativePath) || relativePath.includes("\\")) throw new Error("project_path_invalid");
  const absolute = path.resolve(root, relativePath);
  const relative = path.relative(root, absolute);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("project_path_outside_root");
  return absolute;
}

const workspaceRoot = path.resolve(argument("--workspace-root", path.resolve(root, "..")));
const indexPath = argument("--index", "artifacts/pass4826/PASS4826_WORLD_CLASS_EVIDENCE_INDEX.json");
const outputPath = argument(
  "--output",
  "artifacts/pass4826/PASS4826_WORLD_CLASS_EVIDENCE_INDEX_VERIFICATION.json",
);
const index = JSON.parse(readFileSync(resolveProjectPath(indexPath), "utf8"));
const current = computePass4823SourceTree(root);
const currentOperationalSource = {
  schemaVersion: current.schemaVersion,
  fileCount: current.fileCount,
  byteLength: current.totalBytes,
  sha256: current.sha256,
};
const verification = verifyTruthBoundEvidenceIndex({
  index,
  projectRoot: root,
  workspaceRoot,
  currentOperationalSource,
});
const core = {
  schemaVersion: WORLD_CLASS_EVIDENCE_INDEX_VERIFICATION_SCHEMA,
  evidenceClass: "local_truth_bound_evidence_index_integrity",
  status: verification.ok ? "PASS_INDEX_INTEGRITY_WORLD_CLASS_BLOCKED" : "FAIL",
  indexIntegrityPassed: verification.ok,
  worldClassGateEligible: false,
  index: {
    path: indexPath,
    indexSha256: index.indexSha256 ?? null,
  },
  currentOperationalSource,
  mappedScopes: index.scopeLedger ?? null,
  normalizedReceiptReferenceCount: verification.normalizedReceiptReferenceCount,
  blockedRequirementCount: verification.blockedRequirementCount,
  evidenceFileResults: verification.evidenceFileResults,
  errors: verification.errors,
  truthBoundary: {
    localIndexIntegrityIsWorldClassPass: false,
    localIndexIntegrityIsIndependentCertification: false,
    candidateEvidencePromotedToPass: false,
  },
};
const receipt = sealEvidenceIndexVerification(core);
validateEvidenceIndexVerificationReceipt(receipt);
const absoluteOutput = resolveProjectPath(outputPath);
mkdirSync(path.dirname(absoluteOutput), { recursive: true });
writeFileSync(absoluteOutput, `${JSON.stringify(receipt, null, 2)}\n`);

console.log(JSON.stringify({
  status: receipt.status,
  indexIntegrityPassed: receipt.indexIntegrityPassed,
  worldClassGateEligible: receipt.worldClassGateEligible,
  normalizedReceiptReferenceCount: receipt.normalizedReceiptReferenceCount,
  blockedRequirementCount: receipt.blockedRequirementCount,
  errorCount: receipt.errors.length,
  outputPath,
}, null, 2));
process.exit(receipt.indexIntegrityPassed ? 0 : 1);
