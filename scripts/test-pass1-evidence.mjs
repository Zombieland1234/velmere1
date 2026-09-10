import { createEvidenceRecord } from "../lib/security/evidence/evidence-record.ts";
import { auditAndSanitizeReportLines } from "../lib/security/evidence/claim-audit-blocker.ts";

console.log("=== TESTING PASS 1: EVIDENCE & CLAIM BLOCKER ===");

// 1. Test EvidenceRecord generation and hashing
const ev1 = createEvidenceRecord({
  id: "EV-SOURCE-0001",
  auditId: "AUD-USDT-001",
  category: "SOURCE",
  status: "PASS",
  method: "OBSERVED",
  source: "Etherscan API",
  tool: "solc",
  toolVersion: "0.8.20",
  timestamp: new Date().toISOString(),
  chain: "ethereum",
  contractAddress: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  inputData: "contract TetherToken { ... }",
  outputData: { verified: true, compiler: "0.8.20" }
});

console.log("Created EvidenceRecord:", ev1.id, "inputHash:", ev1.inputHash.slice(0, 16), "status:", ev1.status);
if (!ev1.inputHash || !ev1.outputHash) {
  throw new Error("Missing input/output hashes!");
}

// 2. Test Claim Audit Blocker with buzzwords & unevidenced marketing claims
const sampleReportLines = [
  "Dokument podpisany deterministycznie zgodnie z RFC 3161",
  "Status: Certyfikowana przez PCAOB",
  "Dark Pool: 41.2% dziennego obrotu na giełdach ATS",
  "Poślizg: 2.8 bps przy zleceniu blokowym $10M",
  "Wszystkie niezmienniki stanu udowodnione",
  "Architektura: Multisig 3-of-5 z Timelock 48h",
  "Ocena końcowa: 100% SECURE i HUMAN AUDITED"
];

console.log("\nAuditing and sanitizing unevidenced sample lines...");
const result = auditAndSanitizeReportLines(sampleReportLines, []); // no evidence provided

console.log(`Rewritten count: ${result.rewrittenCount}`);
for (const f of result.findings) {
  console.log(`[${f.action}] Pattern: ${f.matchedPattern}`);
  console.log(`  Before: "${f.originalLine}"`);
  console.log(`  After:  "${f.sanitizedLine}"`);
}

if (result.rewrittenCount < 6) {
  throw new Error(`Expected at least 6 rewritten claims, got ${result.rewrittenCount}`);
}

console.log("\nPASS 1 VERIFICATION SUCCESSFUL!");
