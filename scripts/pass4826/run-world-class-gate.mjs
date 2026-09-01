#!/usr/bin/env node

import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { computePass4823SourceTree } from "../pass4823/typecheck-source-contract.mjs";
import {
  REQUIREMENT_IDS,
  evaluateWorldClassGate,
  sealWorldClassGate,
  sha256,
  validateWorldClassGateReceipt,
} from "./world-class-gate-contract.mjs";

const root = process.cwd();

function readArgument(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  if (!process.argv[index + 1] || process.argv[index + 1].startsWith("--")) {
    throw new Error(`argument_value_missing:${name}`);
  }
  return process.argv[index + 1];
}

function resolveInsideRoot(relativePath) {
  const absolute = path.resolve(root, relativePath);
  const relative = path.relative(root, absolute);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error(`path_outside_root:${relativePath}`);
  return absolute;
}

function readJson(relativePath) {
  try {
    const raw = readFileSync(resolveInsideRoot(relativePath));
    return { value: JSON.parse(raw.toString("utf8")), raw, error: null };
  } catch (error) {
    return { value: null, raw: null, error: error?.code ?? error?.message ?? "read_error" };
  }
}

const evidenceIndexPath = readArgument(
  "--evidence-index",
  "artifacts/pass4826/PASS4826_WORLD_CLASS_EVIDENCE_INDEX.json",
);
const policyPath = readArgument("--policy", "scripts/pass4826/world-class-policy.json");
const outputPath = readArgument("--output", "artifacts/pass4826/PASS4826_WORLD_CLASS_GATE_RECEIPT.json");
const evaluationTime = readArgument("--evaluation-time", new Date().toISOString());

const policyRead = readJson(policyPath);
const indexRead = readJson(evidenceIndexPath);
const evidenceIndex = indexRead.value ?? {};
const evidenceByRequirement = {};

for (const id of REQUIREMENT_IDS) {
  const references = Array.isArray(evidenceIndex?.requirements?.[id]?.receipts)
    ? evidenceIndex.requirements[id].receipts
    : [];
  evidenceByRequirement[id] = references.map((reference) => {
    const read = readJson(reference?.path ?? "");
    return {
      path: reference?.path ?? null,
      expectedFileSha256: reference?.fileSha256 ?? null,
      actualFileSha256: read.raw === null ? null : sha256(read.raw),
      value: read.value,
      error: read.error,
    };
  });
}

const sourceTree = computePass4823SourceTree(root);
const gateCore = evaluateWorldClassGate({
  currentSourceTreeSha256: sourceTree.sha256,
  policy: policyRead.value,
  evidenceIndex,
  evidenceByRequirement,
  evaluationTime,
});
if (policyRead.error) gateCore.globalErrors.push(`policy_read_error:${policyRead.error}`);
if (indexRead.error) gateCore.globalErrors.push(`evidence_index_read_error:${indexRead.error}`);
if (policyRead.error || indexRead.error) {
  gateCore.ok = false;
  gateCore.strictWorldClassGatePassed = false;
  gateCore.status = "FAIL";
  gateCore.blockers = [
    ...gateCore.blockers,
    ...(policyRead.error ? [`global:policy_read_error:${policyRead.error}`] : []),
    ...(indexRead.error ? [`global:evidence_index_read_error:${indexRead.error}`] : []),
  ];
}
const enrichedCore = {
  ...gateCore,
  sourceTreeFileCount: sourceTree.fileCount,
  sourceTreeByteLength: sourceTree.totalBytes,
  policy: {
    path: policyPath,
    fileSha256: policyRead.raw === null ? null : sha256(policyRead.raw),
    schemaVersion: policyRead.value?.schemaVersion ?? null,
  },
  evidenceIndex: {
    path: evidenceIndexPath,
    fileSha256: indexRead.raw === null ? null : sha256(indexRead.raw),
    schemaVersion: indexRead.value?.schemaVersion ?? null,
  },
  limitations: [
    "The Node preload is a process-level defense-in-depth control only; it is not an operating-system air-gap attestation.",
    "Missing receipts, missing fields, stale source bindings, checksum mismatches and false claims are blockers by design.",
    "Internal receipts cannot satisfy the independent external-certification requirement unless the dedicated evidence contract is met.",
  ],
};
const receipt = sealWorldClassGate(enrichedCore);
validateWorldClassGateReceipt(receipt);
mkdirSync(path.dirname(resolveInsideRoot(outputPath)), { recursive: true });
writeFileSync(resolveInsideRoot(outputPath), `${JSON.stringify(receipt, null, 2)}\n`);

console.log(JSON.stringify({
  status: receipt.status,
  strictWorldClassGatePassed: receipt.strictWorldClassGatePassed,
  passedRequirementCount: receipt.passedRequirementCount,
  requiredRequirementCount: receipt.requiredRequirementCount,
  blockerCount: receipt.blockers.length,
  blockers: receipt.blockers,
  outputPath,
}, null, 2));
process.exit(receipt.ok ? 0 : 1);
