/**
 * VELMÈRE EVIDENCE INTELLIGENCE
 * Claim and Evidence Authoritative Model
 *
 * CORE PRINCIPLE:
 * NO EVIDENCE -> NO FACT
 * NO VERIFIED PROVENANCE -> NO VERIFIED CLAIM
 * NO CLAIM/ASSET BINDING -> NO AUTHORITY
 */

import crypto from "crypto";

export type CanonicalAssetClassV2 =
  | "EVM_CONTRACT"
  | "NATIVE_BLOCKCHAIN"
  | "TRADITIONAL_EQUITY"
  | "ETF"
  | "COMMODITY_FUTURE"
  | "FX"
  | "OTHER_TRADITIONAL"
  | "SIMULATED_FIXTURE";

export type ClaimClassification =
  | "A" // Directly evidenced
  | "B" // Derived deterministically from evidenced data
  | "C" // Heuristic / inference (must state HEURISTIC / INFERENCE)
  | "D" // Unverified
  | "E" // Contradictory / impossible (must become defect)
  | "F"; // Fixture / simulation only (must state SIMULATED_FIXTURE)

export type EvidenceSourceType =
  | "onchain_rpc"
  | "block_explorer_api"
  | "verified_solidity_source"
  | "market_exchange_feed"
  | "node_p2p"
  | "simulated_fixture";

export interface EvidenceObject {
  evidence_id: string;
  claim_id: string;
  asset_id: string;
  asset_class: CanonicalAssetClassV2;
  chain_or_market: string;
  source_type: EvidenceSourceType;
  source_uri: string;
  source_provider: string;
  retrieved_at: string;
  snapshot_id: string;
  block_number: number | null;
  transaction_hash: string | null;
  contract_address: string | null;
  symbol: string | null;
  raw_input_hash: string;
  normalized_input_hash: string;
  analysis_version: string;
  ruleset_version: string;
  result_hash: string;
  status: "verified" | "derived" | "heuristic" | "unverified" | "fixture";
  reproducible: boolean;
  notes: string;
}

export interface ClaimObject {
  claim_id: string;
  asset_id: string;
  subject: string;
  statement: string;
  classification: ClaimClassification;
  status: "verified" | "derived" | "heuristic" | "unverified" | "fixture";
  evidence_ids: string[];
  confidence: number;
  created_at: string;
}

export function computeSha256(data: string | Buffer): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

export function computeNormalizedSha256(data: Record<string, unknown>): string {
  const jsonStr = JSON.stringify(data, Object.keys(data).sort());
  return computeSha256(jsonStr);
}

export function generateEvidenceId(prefix: string, index: number): string {
  return `EVD-${prefix.toUpperCase()}-${String(index).padStart(6, "0")}`;
}

export function generateClaimId(prefix: string, index: number): string {
  return `CLM-${prefix.toUpperCase()}-${String(index).padStart(6, "0")}`;
}

/**
 * Validates that a claim meets strict truth requirements.
 *
 * R10 invariants:
 * - classification A may be `verified` only with bound, reproducible, verified evidence;
 * - classification B is `derived`, not silently upgraded to `verified`;
 * - heuristic/unverified/fixture evidence never authorizes a verified/derived claim;
 * - evidence must be bound to the exact claim_id and asset_id;
 * - simulated fixtures never authorize a real-asset verified/derived claim.
 */
export function validateClaimIntegrity(claim: ClaimObject, evidenceMap: Map<string, EvidenceObject>): {
  isValid: boolean;
  violations: string[];
} {
  const violations: string[] = [];

  if (claim.confidence < 0 || claim.confidence > 100 || !Number.isFinite(claim.confidence)) {
    violations.push(`Violation: Claim ${claim.claim_id} confidence must be a finite number from 0 to 100.`);
  }

  if (claim.classification === "A" && claim.status !== "verified" && claim.status !== "unverified") {
    violations.push(`Violation: Direct-evidence claim ${claim.claim_id} has incompatible status ${claim.status}.`);
  }

  if (claim.classification === "B" && claim.status !== "derived" && claim.status !== "unverified") {
    violations.push(`Violation: Derived claim ${claim.claim_id} must be labeled 'derived' (or 'unverified'), not ${claim.status}.`);
  }

  if (claim.classification === "C" && claim.status !== "heuristic" && claim.status !== "unverified") {
    violations.push(`Violation: Heuristic claim ${claim.claim_id} must be labeled 'heuristic' (or 'unverified').`);
  }

  if (claim.classification === "D" && claim.status !== "unverified") {
    violations.push(`Violation: Unverified claim ${claim.claim_id} must have status 'unverified'.`);
  }

  if (claim.classification === "E" && claim.status === "verified") {
    violations.push(`Violation: Contradictory/impossible claim ${claim.claim_id} cannot be verified.`);
  }

  if (claim.classification === "F" && claim.status !== "fixture") {
    violations.push(`Violation: Fixture claim ${claim.claim_id} must have status 'fixture'.`);
  }

  const needsAuthoritativeEvidence = claim.status === "verified" || claim.status === "derived";
  if (needsAuthoritativeEvidence && claim.evidence_ids.length === 0) {
    violations.push(`Violation: Claim ${claim.claim_id} is marked ${claim.status} but has zero evidence IDs.`);
  }

  const resolvedEvidence: EvidenceObject[] = [];
  for (const evId of claim.evidence_ids) {
    const evidence = evidenceMap.get(evId);
    if (!evidence) {
      violations.push(`Violation: Claim ${claim.claim_id} references nonexistent evidence ID ${evId}.`);
      continue;
    }
    resolvedEvidence.push(evidence);

    if (evidence.claim_id !== claim.claim_id) {
      violations.push(`Violation: Evidence ${evId} is bound to claim ${evidence.claim_id}, not ${claim.claim_id}.`);
    }
    if (evidence.asset_id !== claim.asset_id) {
      violations.push(`Violation: Evidence ${evId} is bound to asset ${evidence.asset_id}, not ${claim.asset_id}.`);
    }
    if (needsAuthoritativeEvidence && !evidence.reproducible) {
      violations.push(`Violation: Evidence ${evId} is not reproducible and cannot authorize a ${claim.status} claim.`);
    }
    if (needsAuthoritativeEvidence && ["heuristic", "unverified", "fixture"].includes(evidence.status)) {
      violations.push(`Violation: Evidence ${evId} has status ${evidence.status} and cannot authorize a ${claim.status} claim.`);
    }
    if (
      needsAuthoritativeEvidence &&
      (evidence.source_type === "simulated_fixture" || evidence.asset_class === "SIMULATED_FIXTURE")
    ) {
      violations.push(`Violation: Simulated fixture evidence ${evId} cannot authorize a real verified/derived claim.`);
    }
  }

  if (claim.status === "verified") {
    const hasVerifiedEvidence = resolvedEvidence.some((evidence) => evidence.status === "verified");
    if (!hasVerifiedEvidence) {
      violations.push(`Violation: Verified claim ${claim.claim_id} has no evidence with status 'verified'.`);
    }
  }

  if (claim.status === "derived") {
    const hasUsableEvidence = resolvedEvidence.some((evidence) => evidence.status === "verified" || evidence.status === "derived");
    if (!hasUsableEvidence) {
      violations.push(`Violation: Derived claim ${claim.claim_id} has no verified/derived evidence input.`);
    }
  }

  return {
    isValid: violations.length === 0,
    violations,
  };
}
