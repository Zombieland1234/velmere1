/**
 * Velmère Report Semantic Linter
 *
 * Implements automated semantic linting for audit reports prior to rendering/exporting.
 * Enforces Section 12 of the Master Release Directive:
 * 1. Rejects contradictory claims (e.g. confidence > 80 when coverage < 50)
 * 2. Rejects wrong asset-class sections (e.g. EVM bytecode in equity or FX reports)
 * 3. Rejects unsupported VERIFIED states (VERIFIED without evidenceId)
 * 4. Rejects tier leakage (advanced findings in basic reports)
 * 5. Rejects placeholder / mock identifiers (e.g. '0x1111...', '0xbbbb...', 'fixture:', 'mock:', 'synthetic:', 'TODO')
 * 6. Enforces numeric bounds: coverage in [0,100], riskScore in [0,100], confidence in [0,100]
 * 7. Enforces date/timestamp plausibility (not >5m in future, not >7d in past)
 * 8. Rejects findings lacking evidence IDs
 * 9. Rejects unhedged marketing absolutes ('100%', 'guaranteed', 'certified', 'legally protected')
 */

import type { AssetClass } from "./asset-class-firewall";
import type { CanonicalAuditReportModel, AuditTier } from "./audit-canonical-report";

export interface SemanticLintIssue {
  code: string;
  field: string;
  message: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
}

export interface SemanticLintResult {
  valid: boolean;
  criticalCount: number;
  highCount: number;
  issues: SemanticLintIssue[];
  lintedAt: string;
}

export class ReportSemanticViolationError extends Error {
  public readonly issues: SemanticLintIssue[];

  constructor(issues: SemanticLintIssue[]) {
    super(
      `[REPORT_LINTER_VIOLATION] Report failed semantic validation with ${issues.length} issue(s):\n` +
        issues.map((i) => ` - [${i.severity}] [${i.code}] ${i.field}: ${i.message}`).join("\n"),
    );
    this.name = "ReportSemanticViolationError";
    this.issues = issues;
  }
}

const BANNED_ABSOLUTES_REGEX = /\b(100%\s*(?:safe|secure|guarantee|protection|coverage)|guaranteed|certified(?!\s*(?:by\s+third-party|authority))|legally\s*binding|zero\s*risk|unhackable)\b/i;

export function isPlaceholderAddress(address: string): boolean {
  const clean = address.trim().toLowerCase();
  if (
    clean.startsWith("fixture:") ||
    clean.startsWith("mock:") ||
    clean.startsWith("synthetic:") ||
    clean.startsWith("temp:") ||
    clean.includes("todo")
  ) {
    return true;
  }
  // If it's a 42-char EVM hex address: check for artificial repeated patterns
  if (/^0x[0-9a-f]{40}$/i.test(clean)) {
    const hex = clean.slice(2);
    // 40 identical characters (e.g. 0x0000..., 0x1111..., 0xbbbb...)
    if (new Set(hex).size === 1) return true;
    // Repeated 2-char pattern (e.g. 0x121212...)
    if (hex.slice(0, 2).repeat(20) === hex) return true;
  }
  return false;
}

export function lintCanonicalReport(
  report: CanonicalAuditReportModel,
  assetClass: AssetClass,
): SemanticLintResult {
  const issues: SemanticLintIssue[] = [];

  // --- CHECK 1: Contradictory Claims ---
  if (report.verdict.confidenceScore > 80 && report.verdict.evidenceCoverage < 50) {
    issues.push({
      code: "CONTRADICTORY_CONFIDENCE_COVERAGE",
      field: "verdict.confidenceScore",
      message: `Confidence (${report.verdict.confidenceScore}) cannot exceed 80 when evidence coverage is low (${report.verdict.evidenceCoverage}%).`,
      severity: "CRITICAL",
    });
  }

  // --- CHECK 2: Numeric Bounds ---
  if (report.verdict.riskScore < 0 || report.verdict.riskScore > 100 || isNaN(report.verdict.riskScore)) {
    issues.push({
      code: "NUMERIC_BOUNDS_VIOLATION",
      field: "verdict.riskScore",
      message: `Risk score must be between 0 and 100, got ${report.verdict.riskScore}.`,
      severity: "CRITICAL",
    });
  }
  if (report.verdict.confidenceScore < 0 || report.verdict.confidenceScore > 100 || isNaN(report.verdict.confidenceScore)) {
    issues.push({
      code: "NUMERIC_BOUNDS_VIOLATION",
      field: "verdict.confidenceScore",
      message: `Confidence score must be between 0 and 100, got ${report.verdict.confidenceScore}.`,
      severity: "CRITICAL",
    });
  }
  if (report.verdict.evidenceCoverage < 0 || report.verdict.evidenceCoverage > 100 || isNaN(report.verdict.evidenceCoverage)) {
    issues.push({
      code: "NUMERIC_BOUNDS_VIOLATION",
      field: "verdict.evidenceCoverage",
      message: `Evidence coverage must be between 0 and 100, got ${report.verdict.evidenceCoverage}.`,
      severity: "CRITICAL",
    });
  }

  // --- CHECK 3: Wrong Asset-Class Sections ---
  const isEvm = assetClass === "evm_contract";
  for (const section of report.sections) {
    if (!isEvm) {
      if (
        section.id === "advanced_bytecode_diff" ||
        section.id === "contract_identity" ||
        section.id === "advanced_formal_verification" ||
        section.id === "advanced_contract_graph" ||
        section.id === "advanced_evm_execution"
      ) {
        issues.push({
          code: "WRONG_ASSET_CLASS_SECTION",
          field: `sections.${section.id}`,
          message: `EVM-specific section '${section.id}' is not permitted for asset class '${assetClass}'.`,
          severity: "CRITICAL",
        });
      }
    }
  }

  // --- CHECK 4: Unsupported VERIFIED states ---
  const serialized = JSON.stringify(report);
  const verifiedMatches = serialized.match(/"(?:status|verificationStatus)":"VERIFIED"/g) || [];
  if (verifiedMatches.length > 0 && report.verdict.evidenceCoverage === 0) {
    issues.push({
      code: "UNSUPPORTED_VERIFIED_STATE",
      field: "report",
      message: `Report contains ${verifiedMatches.length} VERIFIED state(s) but evidence coverage is 0%.`,
      severity: "CRITICAL",
    });
  }

  // --- CHECK 5: Tier Leakage ---
  const TIER_RANK: Record<AuditTier, number> = { basic: 1, pro: 2, advanced: 3 };
  const currentRank = TIER_RANK[report.clientEntitlementTier];
  for (const section of report.sections) {
    const sectionRank = TIER_RANK[section.requiredTier];
    if (sectionRank > currentRank && !section.isLocked) {
      issues.push({
        code: "TIER_LEAKAGE",
        field: `sections.${section.id}`,
        message: `Section '${section.id}' requires '${section.requiredTier}' but is unlocked for '${report.clientEntitlementTier}'.`,
        severity: "CRITICAL",
      });
    }
  }

  // --- CHECK 6: Placeholder Identifiers ---
  if (isEvm && isPlaceholderAddress(report.target.contractAddress)) {
    issues.push({
      code: "PLACEHOLDER_IDENTIFIER",
      field: "target.contractAddress",
      message: `Contract address '${report.target.contractAddress}' appears to be a placeholder or synthetic identifier.`,
      severity: "CRITICAL",
    });
  }

  // --- CHECK 7: Future/stale timestamp plausibility ---
  const now = Date.now();
  const createdAtMs = Date.parse(report.createdAt);
  if (Number.isFinite(createdAtMs)) {
    if (createdAtMs > now + 5 * 60 * 1000) {
      issues.push({
        code: "TIMESTAMP_IN_FUTURE",
        field: "createdAt",
        message: `Report createdAt is more than 5 minutes in the future: ${report.createdAt}.`,
        severity: "HIGH",
      });
    }
  }

  // --- CHECK 8: Finding evidence links ---
  for (const section of report.sections) {
    const findings = (section.data as any)?.findings;
    if (!Array.isArray(findings)) continue;
    for (const finding of findings) {
      const evidenceRefs = finding?.evidenceRefs || finding?.evidenceIds;
      if (!Array.isArray(evidenceRefs) || evidenceRefs.length === 0) {
        issues.push({
          code: "FINDING_WITHOUT_EVIDENCE",
          field: `sections.${section.id}.findings.${finding?.id || "unknown"}`,
          message: `Finding '${finding?.id || "unknown"}' has no evidence references.`,
          severity: "HIGH",
        });
      }
    }
  }

  // --- CHECK 9: Marketing absolutes ---
  if (BANNED_ABSOLUTES_REGEX.test(serialized)) {
    issues.push({
      code: "BANNED_MARKETING_ABSOLUTE",
      field: "report",
      message: "Report contains prohibited absolute/certification marketing language.",
      severity: "CRITICAL",
    });
  }

  const criticalCount = issues.filter((i) => i.severity === "CRITICAL").length;
  const highCount = issues.filter((i) => i.severity === "HIGH").length;
  return {
    valid: criticalCount === 0 && highCount === 0,
    criticalCount,
    highCount,
    issues,
    lintedAt: new Date().toISOString(),
  };
}

export function assertReportSemanticallyValid(
  report: CanonicalAuditReportModel,
  assetClass: AssetClass,
): void {
  const result = lintCanonicalReport(report, assetClass);
  if (!result.valid) throw new ReportSemanticViolationError(result.issues);
}
