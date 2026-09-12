/**
 * VELMÈRE EVIDENCE-FIRST AUDIT PLATFORM
 * CLAIM AUDIT BLOCKER & REWRITE ENGINE
 *
 * R10 truth rule:
 *   evidence presence is not evidence validity.
 * A customer-facing claim is supportable only when at least one EvidenceRecord
 * for the required category has status PASS, satisfies any claim-specific
 * method/provenance constraints, and is bound to the exact requested scope.
 */

import type { EvidenceRecord } from "./evidence-record";

export interface ClaimAuditScope {
  /** Exact audit/report execution scope. Strong claims require this field. */
  auditId: string;
  contractAddress?: string | null;
  commitHash?: string | null;
  provider?: string | null;
  dataset?: string | null;
}

export interface ClaimAuditResult {
  passed: boolean;
  blockedCount: number;
  rewrittenCount: number;
  sanitizedLines: string[];
  findings: Array<{
    originalLine: string;
    sanitizedLine: string;
    matchedPattern: string;
    action: "REWRITTEN" | "BLOCKED" | "VERIFIED";
    evidenceId?: string;
    reason: string;
  }>;
}

type ClaimRule = {
  regex: RegExp;
  category: string;
  requiredEvidenceCategory?: EvidenceRecord["category"];
  truthfulFallback: string;
  reason: string;
  requireExactScope?: boolean;
  evidenceValidator?: (evidence: EvidenceRecord) => boolean;
};

function normalized(value: string | null | undefined): string | null {
  if (value == null) return null;
  return value.trim().toLowerCase();
}

function evidenceMatchesScope(evidence: EvidenceRecord, scope: ClaimAuditScope | undefined): boolean {
  if (!scope?.auditId) return false;
  if (evidence.auditId !== scope.auditId) return false;

  const optionalPairs: Array<[string | null | undefined, string | null | undefined]> = [
    [scope.contractAddress, evidence.contractAddress],
    [scope.commitHash, evidence.commitHash],
    [scope.provider, evidence.provider],
    [scope.dataset, evidence.dataset],
  ];

  for (const [expected, actual] of optionalPairs) {
    if (expected == null) continue;
    if (normalized(expected) !== normalized(actual)) return false;
  }

  return true;
}

function hasFreshObservedData(evidence: EvidenceRecord): boolean {
  return evidence.dataFreshness === "FRESH" && Boolean(evidence.observedAt || evidence.retrievedAt);
}

function hasExternalRfc3161Proof(evidence: EvidenceRecord): boolean {
  const haystack = [
    evidence.source,
    evidence.tool,
    evidence.rawArtifact ?? "",
    JSON.stringify(evidence.normalizedArtifact ?? {}),
  ].join(" ");

  return evidence.method === "OBSERVED" && /\b(RFC\s*3161|TSA|TimeStampToken)\b/i.test(haystack);
}

function hasConfirmedHumanReview(evidence: EvidenceRecord): boolean {
  return (
    evidence.method === "HUMAN_VERIFIED" &&
    Boolean(evidence.reviewerId) &&
    evidence.reviewStatus === "CONFIRMED"
  );
}

function hasFormalSolverProof(evidence: EvidenceRecord): boolean {
  const haystack = [
    evidence.tool,
    evidence.source,
    evidence.command ?? "",
    evidence.rawArtifact ?? "",
    JSON.stringify(evidence.normalizedArtifact ?? {}),
  ].join(" ");

  return evidence.method === "FORMALLY_PROVEN" && /\b(z3|cvc5|smt|solver)\b/i.test(haystack);
}

function hasDirectSipL3Proof(evidence: EvidenceRecord): boolean {
  const haystack = [
    evidence.provider ?? "",
    evidence.dataset ?? "",
    evidence.source,
    evidence.tool,
    evidence.rawArtifact ?? "",
  ].join(" ");

  return hasFreshObservedData(evidence) && /\b(SIP|ITCH|OUCH|L3|level\s*3)\b/i.test(haystack);
}

function supportingEvidence(
  rule: ClaimRule,
  records: EvidenceRecord[],
  scope: ClaimAuditScope | undefined,
): EvidenceRecord | undefined {
  if (!rule.requiredEvidenceCategory) return undefined;
  if (rule.requireExactScope !== false && !scope?.auditId) return undefined;

  return records.find((evidence) => {
    if (evidence.category !== rule.requiredEvidenceCategory) return false;
    if (evidence.status !== "PASS") return false;
    if (rule.requireExactScope !== false && !evidenceMatchesScope(evidence, scope)) return false;
    if (rule.evidenceValidator && !rule.evidenceValidator(evidence)) return false;
    return true;
  });
}

const CRITICAL_CLAIM_PATTERNS: ClaimRule[] = [
  {
    regex: /\b(RFC\s*3161|RFC3161)\b/i,
    category: "CRYPTOGRAPHIC",
    requiredEvidenceCategory: "CRYPTOGRAPHIC",
    requireExactScope: true,
    evidenceValidator: hasExternalRfc3161Proof,
    truthfulFallback: "SHA-256 INTEGRITY SEAL [LOCAL DETERMINISTIC]",
    reason: "RFC 3161 requires an observed external TSA TimeStampToken bound to the exact audit scope; a local hash alone is insufficient.",
  },
  {
    regex: /\b(PCAOB\s*CERTIFIED|PCAOB\s*AUDITED)\b/i,
    category: "REGULATORY_DATA",
    truthfulFallback: "EXTERNAL AUDITOR REFERENCE [NOT A VELMÈRE CERTIFICATION]",
    reason: "Velmère cannot award or claim PCAOB certification for its own software audit output.",
  },
  {
    regex: /\b(41\.2%|41,2%)\s*(?:dziennego|dark\s*pool|ats)\b/i,
    category: "MARKET_MICROSTRUCTURE",
    requiredEvidenceCategory: "MARKET_MICROSTRUCTURE",
    requireExactScope: true,
    evidenceValidator: hasFreshObservedData,
    truthfulFallback: "ATS / Dark Pool Share: NOT OBSERVED [INSUFFICIENT DATA]",
    reason: "A fixed ATS/dark-pool percentage requires a fresh observed dataset bound to the exact instrument/audit scope.",
  },
  {
    regex: /\b2\.8\s*(?:bps|punkty\s*bazowe)\b/i,
    category: "MARKET_MICROSTRUCTURE",
    requiredEvidenceCategory: "MARKET_MICROSTRUCTURE",
    requireExactScope: true,
    evidenceValidator: hasFreshObservedData,
    truthfulFallback: "Kyle Slippage: ESTIMATED HEURISTIC [UNOBSERVED]",
    reason: "A fixed slippage metric requires fresh observed market-depth evidence bound to the exact scope.",
  },
  {
    regex: /\b(Wszystkie\s*niezmienniki\s*(?:stanu\s*)?udowodnione|all\s*invariants\s*proven)\b/i,
    category: "FORMAL",
    truthfulFallback: "Invariants: BOUNDED / PARTIAL; SEE FORMAL EXECUTION COVERAGE",
    reason: "An absolute all-invariants claim is prohibited without explicit complete-path coverage evidence.",
  },
  {
    regex: /\b(FULL\s*SMT\s*(?:Z3\s*)?SOLVER\s*VERIFICATION|SMT\s*Z3\s*SOLVER\s*VERIFICATION)\b/i,
    category: "FORMAL",
    requiredEvidenceCategory: "FORMAL",
    requireExactScope: true,
    evidenceValidator: hasFormalSolverProof,
    truthfulFallback: "FORMAL VERIFICATION: NOT VERIFIED FOR THIS SCOPE",
    reason: "SMT/formal wording requires PASS evidence produced by an executed formal solver bound to the exact audit scope.",
  },
  {
    regex: /\b(100%\s*SECURE|100%\s*SAFE|ABSOLUTELY\s*SECURE)\b/i,
    category: "VULNERABILITY",
    truthfulFallback: "ASSESSMENT: BOUNDED SECURITY ANALYSIS",
    reason: "Absolute security claims are categorically prohibited.",
  },
  {
    regex: /\b(HUMAN\s*AUDITED|HUMAN\s*REVIEWED|Zweryfikowany\s*przez\s*audytora)\b/i,
    category: "HUMAN_REVIEW",
    requiredEvidenceCategory: "HUMAN_REVIEW",
    requireExactScope: true,
    evidenceValidator: hasConfirmedHumanReview,
    truthfulFallback: "HUMAN REVIEW: NOT VERIFIED",
    reason: "Human-review wording requires exact-scope PASS + HUMAN_VERIFIED + reviewerId + CONFIRMED review status.",
  },
  {
    regex: /\b(L3\/SIP\s*połączenia|Direct\s*L3\/SIP)\b/i,
    category: "MARKET_DATA",
    requiredEvidenceCategory: "MARKET_DATA",
    requireExactScope: true,
    evidenceValidator: hasDirectSipL3Proof,
    truthfulFallback: "Market Data Source: DIRECT L3/SIP NOT VERIFIED",
    reason: "Direct L3/SIP wording requires fresh observed evidence identifying the licensed feed/source and exact scope.",
  },
  {
    regex: /\b(Best\s*Execution\s*PASS|Best\s*Execution\s*VERIFIED)\b/i,
    category: "MARKET_DATA",
    requiredEvidenceCategory: "MARKET_DATA",
    requireExactScope: true,
    evidenceValidator: hasFreshObservedData,
    truthfulFallback: "Best Execution: NOT VERIFIED FOR THIS SCOPE",
    reason: "Best-execution wording requires current execution-routing evidence bound to the exact scope.",
  },
  {
    regex: /\b(Multisig\s*3-of-5)\b/i,
    category: "ACCESS_CONTROL",
    requiredEvidenceCategory: "ACCESS_CONTROL",
    requireExactScope: true,
    truthfulFallback: "Multisig: THRESHOLD UNKNOWN [NO VERIFIED ON-CHAIN RESULT]",
    reason: "A concrete threshold requires a PASS access-control evidence record bound to the exact audit/contract scope.",
  },
  {
    regex: /\b(Timelock\s*48h)\b/i,
    category: "ACCESS_CONTROL",
    requiredEvidenceCategory: "ACCESS_CONTROL",
    requireExactScope: true,
    truthfulFallback: "Timelock: DELAY UNKNOWN [NO VERIFIED ON-CHAIN RESULT]",
    reason: "A concrete timelock duration requires a PASS access-control evidence record bound to the exact audit/contract scope.",
  },
  {
    regex: /\b(Zero\s*Risk|Zero\s*Vulnerabilit(?:y|ies)|Zero\s*Ryzyka)\b/i,
    category: "VULNERABILITY",
    truthfulFallback: "Risk Level: RESIDUAL RISK REMAINS",
    reason: "Absolute zero-risk claims are invalid in software verification.",
  },
  {
    regex: /\b(Unbreakable|Invulnerable|Niezłomn[ya]|Niezwyciężon[ya])\b/i,
    category: "VULNERABILITY",
    truthfulFallback: "Security Posture: BOUNDED EVALUATION",
    reason: "Marketing adjectives implying invulnerability are prohibited.",
  },
  {
    regex: /\b(Certified\s*Bug-Free|Bug-Free\s*Guarantee|Gwarancja\s*braku\s*(?:błędów|podatności))\b/i,
    category: "FORMAL",
    truthfulFallback: "Defect Assurance: ABSENCE OF DEFECTS CANNOT BE GUARANTEED",
    reason: "Testing and bounded formal analysis cannot establish a universal bug-free guarantee.",
  },
];

/**
 * Validates and sanitizes report lines against EvidenceRecords.
 *
 * Important R10 invariants:
 * - FAIL / WARN / UNKNOWN / NOT_RUN / NOT_VERIFIED / INSUFFICIENT_EVIDENCE /
 *   SKIPPED / TIMEOUT / ERROR records NEVER authorize a positive claim;
 * - exact-scope claims require a ClaimAuditScope and matching auditId;
 * - optional contract/provider/dataset/commit scope values must match when provided.
 */
export function auditAndSanitizeReportLines(
  lines: string[],
  evidenceRecords: EvidenceRecord[],
  scope?: ClaimAuditScope,
): ClaimAuditResult {
  const blockedCount = 0;
  let rewrittenCount = 0;
  const sanitizedLines: string[] = [];
  const findings: ClaimAuditResult["findings"] = [];

  for (const line of lines) {
    let sanitizedLine = line;

    for (const rule of CRITICAL_CLAIM_PATTERNS) {
      rule.regex.lastIndex = 0;
      if (!rule.regex.test(sanitizedLine)) continue;

      const evidence = supportingEvidence(rule, evidenceRecords, scope);

      if (!evidence) {
        rule.regex.lastIndex = 0;
        sanitizedLine = sanitizedLine.replace(rule.regex, rule.truthfulFallback);
        rewrittenCount++;
        findings.push({
          originalLine: line,
          sanitizedLine,
          matchedPattern: rule.category,
          action: "REWRITTEN",
          reason: rule.reason,
        });
      } else {
        findings.push({
          originalLine: line,
          sanitizedLine,
          matchedPattern: rule.category,
          action: "VERIFIED",
          evidenceId: evidence.id,
          reason: `Backed by exact-scope PASS EvidenceRecord ${evidence.id}.`,
        });
      }
    }

    sanitizedLines.push(sanitizedLine);
  }

  return {
    // A safely rewritten unsupported claim is a successful fail-closed outcome.
    // blockedCount is reserved for future non-rewritable claims and therefore
    // remains zero with the current rule set.
    passed: blockedCount === 0,
    blockedCount,
    rewrittenCount,
    sanitizedLines,
    findings,
  };
}
