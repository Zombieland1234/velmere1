import { TwoDimensionalScorer } from "../lib/security/scoring/two-dimensional-scorer.ts";
import { createEvidenceRecord } from "../lib/security/evidence/evidence-record.ts";

console.log("=== TESTING PASS 6: TWO-DIMENSIONAL SCORING ENGINE ===");

// 1. Setup Evidence and Findings
const mockEv1 = createEvidenceRecord({
  id: "EV-01",
  auditId: "AUD-01",
  category: "SOURCE",
  status: "PASS",
  method: "OBSERVED",
  source: "Etherscan",
  tool: "solc",
  timestamp: new Date().toISOString(),
});

const mockEv2 = createEvidenceRecord({
  id: "EV-02",
  auditId: "AUD-01",
  category: "STATIC_ANALYSIS",
  status: "PASS",
  method: "OBSERVED",
  source: "Slither",
  tool: "slither",
  timestamp: new Date().toISOString(),
});

const mockFinding = {
  id: "VLM-SEC-01",
  title: "Critical Delegatecall Flaw",
  severity: "CRITICAL",
  confidence: "HIGH",
  likelihood: "HIGH",
  impact: "CRITICAL",
  detector: "ast.delegatecall",
  category: "UPGRADEABILITY",
  file: "Vault.sol",
  lineStart: 42,
  lineEnd: 48,
  affectedContract: "Vault",
  affectedFunction: "execute",
  codeSnippet: "delegatecall(data);",
  description: "Unchecked delegatecall",
  attackScenario: "Drain funds",
  recommendation: "Restrict access",
  evidenceIds: [mockEv1.id],
};

const scoreResult = TwoDimensionalScorer.calculate({
  findings: [mockFinding],
  evidenceRecords: [mockEv1, mockEv2],
  isUpgradeable: true,
  hasCentralizedAuthority: true,
  hasHumanReview: false, // Honest: Automated run
  hasDynamicFuzzing: true,
  hasFormalProofs: true,
});

console.log("Score Breakdown:");
console.log("- Risk Score:", scoreResult.riskScore, `(${scoreResult.riskTier})`);
console.log("- Audit Quality Score:", scoreResult.auditQualityScore, `(${scoreResult.auditQualityTier})`);
console.log("- Confidence:", scoreResult.confidenceScore, "%");
console.log("- Quality Factors Human Review Points:", scoreResult.qualityFactors.humanReviewPoints, "/ 10");
console.log("- Explanation:", scoreResult.explanation);

if (scoreResult.riskScore < 50) {
  throw new Error("Critical finding + centralization must yield risk score >= 50!");
}

if (scoreResult.qualityFactors.humanReviewPoints !== 0) {
  throw new Error("Human review points must be 0 when no human review performed!");
}

console.log("\nPASS 6 VERIFICATION SUCCESSFUL!");
