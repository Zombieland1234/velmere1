import { JsonExporter } from "../lib/security/evidence-vault/json-exporter.ts";
import { EvidenceVault } from "../lib/security/evidence-vault/evidence-vault.ts";
import path from "path";
import fs from "fs";

console.log("=== TESTING PASS 8: PUBLIC VERIFICATION & JSON EXPORT SUITE ===");

const testVaultDir = path.resolve("test_evidence_suite");
const vault = new EvidenceVault(testVaultDir);
const auditId = "AUD-VERIFY-001";

vault.storeArtifact(auditId, {
  category: "source",
  filename: "Token.sol",
  content: "contract Token {}"
});

const manifest = vault.buildAndStoreManifest({
  auditId,
  symbol: "USDT",
  name: "Tether USD",
  chain: "ethereum",
  contractAddress: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  sourceHash: "a5579e9b5f13db7f",
  reportBuffer: Buffer.from("PDF REPORT CONTENT")
});

const suite = JsonExporter.exportSuite({
  auditId,
  target: {
    symbol: "USDT",
    name: "Tether USD",
    tier: "advanced",
    addressOrId: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    networkOrExchange: "Ethereum Mainnet"
  },
  scoring: {
    riskScore: 24,
    riskTier: "GUARDED",
    auditQualityScore: 85,
    auditQualityTier: "INSTITUTIONAL",
    confidenceScore: 98,
    riskFactors: { criticalFindingsPenalty: 0, highFindingsPenalty: 0, mediumFindingsPenalty: 0, centralizationPenalty: 15, upgradeabilityRiskPenalty: 0, marketLiquidityPenalty: 0, baseScore: 15 },
    qualityFactors: { sourceProvenancePoints: 20, bytecodeVerificationPoints: 15, staticAnalysisPoints: 15, dynamicFuzzingPoints: 15, formalVerificationPoints: 10, reproducibilityManifestPoints: 10, humanReviewPoints: 0 },
    explanation: "Reproducible score breakdown"
  },
  findings: [],
  evidenceRecords: [],
  manifest
});

console.log("JSON Export Suite Output:");
console.log("- report.json schema:", suite.reportJson.schemaVersion);
console.log("- findings.json schema:", suite.findingsJson.schemaVersion);
console.log("- evidence.json schema:", suite.evidenceJson.schemaVersion);
console.log("- manifest.json evidenceRoot:", suite.manifestJson.evidenceRoot);

if (!suite.reportJson || !suite.findingsJson || !suite.evidenceJson || !suite.manifestJson) {
  throw new Error("Missing JSON suite components!");
}

// Clean up
fs.rmSync(testVaultDir, { recursive: true, force: true });

// Test live Next.js endpoint
async function testLiveVerificationEndpoint() {
  const url = "http://localhost:3000/api/audit/verify/AUD-USDT-ADV";
  console.log(`\nTesting HTTP GET ${url}...`);
  const res = await fetch(url);
  const data = await res.json();
  console.log("HTTP Response Status:", res.status);
  console.log("- Verified:", data.verified);
  console.log("- Merkle Integrity Match:", data.merkleIntegrityMatch);
  console.log("- Evidence Root:", data.evidenceRoot);
  console.log("- Seal Type:", data.sealType);

  if (res.status !== 200 || !data.verified || !data.merkleIntegrityMatch) {
    throw new Error("Verification API test failed!");
  }
}

await testLiveVerificationEndpoint();

console.log("\nPASS 8 VERIFICATION SUCCESSFUL!");
