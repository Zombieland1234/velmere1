#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runReleaseTruthScan } from "./release-truth-lib.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(HERE, "../..");

const REPLACEMENTS = new Map([
  ["CLAIM_FORMAL_FULL_SMT", "FORMAL SOLVER STATUS REQUIRES EXACT-SCOPE RECEIPT"],
  ["CLAIM_FORMAL_STATIC_AND_FORMAL", "AUTOMATED STATIC ANALYSIS - FORMAL STATUS REPORTED SEPARATELY"],
  ["CLAIM_FORMAL_STATIC_AND_FORMAL_PL", "ZAUTOMATYZOWANA ANALIZA STATYCZNA - STATUS FORMALNY RAPORTOWANY ODDZIELNIE"],
  ["CLAIM_FULLY_AUDITED", "AUDIT CONTENT STATUS EVIDENCE-BOUND"],
  ["CLAIM_PRODUCTION_READY", "RELEASE BLOCKED - PRODUCTION EVIDENCE INCOMPLETE"],
  ["CLAIM_CERTIFIED", "CERTIFICATION STATUS REQUIRES AUTHORITY EVIDENCE"],
  ["CLAIM_COMMERCIAL_RELEASE", "COMMERCIAL RELEASE STATUS REQUIRES CURRENT RELEASE EVIDENCE"],
  ["CLAIM_IMMUTABLE_CONTENT", "[FILE INTEGRITY VERIFIED]"],
  ["CLAIM_HUMAN_DEFAULT", "HUMAN REVIEW RECEIPT REQUIRED"],
]);

const DISALLOWED_IDS = new Set([
  "HARDCODED_DETECTOR_72",
  "LOCAL_TSA_NOT_EXTERNAL",
  "LOCAL_SIGNER_NOT_ROOT_CA",
  "PROVENANCE_PLACEHOLDER",
  "REAL_MARKETS_SMART_CONTRACT_ASSET_CLASS",
  "REAL_MARKETS_GENERIC_REGULATOR_TRIAD",
  "REAL_MARKETS_GOLD_IDENTITY",
  "REAL_MARKETS_SILVER_IDENTITY",
  "REAL_MARKETS_EURUSD_IDENTITY",
  "REAL_MARKETS_USDJPY_IDENTITY",
  "BUILD_TS_ERRORS_IGNORED",
  "BUILD_NODE_RUNTIME_NOT_EXACT",
  "BUILD_NPM_RUNTIME_NOT_EXACT",
]);

function parseArgs(argv) {
  const rootIndex = argv.indexOf("--root");
  const outputIndex = argv.indexOf("--output");
  return {
    root: rootIndex >= 0 ? path.resolve(argv[rootIndex + 1]) : DEFAULT_ROOT,
    write: argv.includes("--write"),
    output: outputIndex >= 0 ? path.resolve(argv[outputIndex + 1]) : null,
  };
}

export function migrateLegacyClaimWording(root, { write = false } = {}) {
  const before = runReleaseTruthScan(root).filter((finding) => finding.severity === "P0");
  const sourceOnly = before.filter((finding) => !String(finding.id).startsWith("BUILD_"));
  const edits = new Map();
  const unsupported = [];

  for (const finding of sourceOnly) {
    if (DISALLOWED_IDS.has(finding.id)) {
      unsupported.push({ ...finding, migrationReason: "semantic_or_structural_fix_required" });
      continue;
    }
    const replacement = REPLACEMENTS.get(finding.id);
    if (!replacement) {
      unsupported.push({ ...finding, migrationReason: "no_exact_replacement_registered" });
      continue;
    }
    const absolute = path.resolve(root, finding.path);
    const original = edits.get(absolute)?.next ?? fs.readFileSync(absolute, "utf8");
    if (!original.includes(finding.match)) {
      throw new Error(`r10_claim_migration_exact_match_missing:${finding.id}:${finding.path}:${finding.match}`);
    }
    const next = original.split(finding.match).join(replacement);
    edits.set(absolute, {
      path: finding.path,
      next,
      findingIds: [...new Set([...(edits.get(absolute)?.findingIds ?? []), finding.id])],
    });
  }

  if (unsupported.length) {
    throw new Error(`r10_claim_migration_structural_blockers:${JSON.stringify(unsupported.slice(0, 12))}`);
  }

  if (write) {
    for (const edit of edits.values()) fs.writeFileSync(path.resolve(root, edit.path), edit.next, "utf8");
  }

  let after;
  if (write) {
    after = runReleaseTruthScan(root).filter((finding) => finding.severity === "P0");
  } else {
    const originals = new Map();
    try {
      for (const [absolute, edit] of edits) {
        originals.set(absolute, fs.readFileSync(absolute, "utf8"));
        fs.writeFileSync(absolute, edit.next, "utf8");
      }
      after = runReleaseTruthScan(root).filter((finding) => finding.severity === "P0");
    } finally {
      for (const [absolute, original] of originals) fs.writeFileSync(absolute, original, "utf8");
    }
  }

  return {
    schemaVersion: "velmere.r10.legacy-claim-wording-migration.v1",
    context: "R10_CANDIDATE_NO_RELEASE_CREDIT",
    beforeP0: before.length,
    afterP0: after.length,
    changedFiles: edits.size,
    files: [...edits.values()].map(({ path: filePath, findingIds }) => ({ path: filePath, findingIds })),
    remainingP0: after,
    passed: after.length === 0,
    limitations: [
      "This migration only neutralizes unsupported release/customer wording identified by the R10 scanner.",
      "It does not create evidence for formal verification, human review, certification, commercial readiness, or production readiness.",
      "Semantic blockers such as detector registry counts, market identity, build policy, provenance, and authority must be fixed structurally rather than word-substituted.",
    ],
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = parseArgs(process.argv.slice(2));
  const receipt = migrateLegacyClaimWording(args.root, { write: args.write });
  const output = args.output ?? path.join(args.root, "artifacts", "r10", "R10_LEGACY_CLAIM_WORDING_MIGRATION.json");
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(receipt, null, 2));
  if (!receipt.passed) process.exitCode = 1;
}
