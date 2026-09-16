/**
 * Remediation evidence boundary. This module performs text preflight only.
 * It does not apply a unified diff, invoke solc, re-run a detector, execute
 * invariants, or prove that a vulnerability was eliminated.
 */
import { createHash } from "node:crypto";
import type { StandardFindingV2 } from "./types";

export interface PatchValidationReport {
  findingId: string;
  patchApplied: boolean;
  compilationClean: boolean;
  vulnerabilityEliminated: boolean;
  regressionIntroduced: boolean;
  allInvariantsSatisfied: boolean;
  validationStatus: "VERIFIED" | "FAILED" | "INCONCLUSIVE";
  /** Integrity digest of this assessment, NOT a proof of patch correctness. */
  validationProofDigest: string;
  validationScope: "TEXT_PREFLIGHT_ONLY";
  evidenceMissing: string[];
}

export function validateRemediationPatch(
  finding: StandardFindingV2,
  originalSource?: string,
): PatchValidationReport {
  const suppliedDiff: unknown = finding.remediation?.solidityPatchDiff;
  const diff = typeof suppliedDiff === "string" ? suppliedDiff : "";
  const editPresent = diff.split(/\r?\n/u).some((line) =>
    ((line.startsWith("+") && !line.startsWith("+++"))
      || (line.startsWith("-") && !line.startsWith("---")))
    && line.slice(1).trim().length > 0,
  );
  const validationStatus = editPresent ? "INCONCLUSIVE" : "FAILED";
  const assessment = {
    schemaVersion: "velmere.r13g.patch-preflight.v1",
    findingId: finding.findingId,
    originalSourceSha256: typeof originalSource === "string"
      ? createHash("sha256").update(originalSource).digest("hex") : null,
    diffSha256: createHash("sha256").update(diff).digest("hex"),
    validationStatus,
    validationScope: "TEXT_PREFLIGHT_ONLY" as const,
  };
  return {
    findingId: finding.findingId,
    patchApplied: false,
    compilationClean: false,
    vulnerabilityEliminated: false,
    // False here means no regression was demonstrated, not that its absence
    // was verified. validationStatus and evidenceMissing are authoritative.
    regressionIntroduced: false,
    allInvariantsSatisfied: false,
    validationStatus,
    validationProofDigest: `sha256:${createHash("sha256").update(JSON.stringify(assessment)).digest("hex")}`,
    validationScope: "TEXT_PREFLIGHT_ONLY",
    evidenceMissing: [
      ...(typeof originalSource !== "string" || !originalSource.trim() ? ["original_source"] : []),
      ...(!editPresent ? ["candidate_diff"] : []),
      "applied_diff_receipt", "compiler_receipt", "vulnerability_recheck",
      "executed_regression_tests", "executed_invariant_tests",
    ],
  };
}
