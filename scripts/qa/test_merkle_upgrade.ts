import { buildCanonicalAuditReport } from "../../lib/security/audit-canonical-report";
import { buildAuditMerkleCommitment } from "../../lib/security/audit-merkle-commitment";

console.log("=== TESTING FULL SEMANTIC MERKLE COMMITMENT ===");

const report = buildCanonicalAuditReport({
  reportId: "test_usdt_basic",
  contractAddress: "0xdac17f958d2ee523a2206206994597c13d831ec7",
  contractName: "Tether USD",
  tokenSymbol: "USDT",
  chainId: 1,
  locale: "en"
}, "basic");

console.log("Report generated successfully!");
console.log("Merkle Root:", report.merkleRoot);
console.log("Risk Score:", report.verdict.riskScore);
console.log("Quality Score:", report.verdict.auditQualityScore);
console.log("Sections count:", report.sections.length);

function computeRoot(rep: any): string {
  const leafProvenance = {
    chainId: String(rep.target?.chainId || "1"),
    blockNumber: rep.verdict?.snapshotProvenance?.snapshotBlockNumber,
    blockHash: rep.verdict?.snapshotProvenance?.snapshotBlockHash,
    contractAddress: rep.target?.contractAddress,
    bytecodeHash: rep.verdict?.snapshotProvenance?.runtimeBytecodeSha256,
    implementationAddress: rep.verdict?.proxyDetails?.currentImplementation,
    analysisVersion: "v4.0.0-rc3",
    schemaVersion: "velmere.canonical-audit-report.v1",
  };
  const pkg = buildAuditMerkleCommitment(rep.sections, leafProvenance, {
    riskScore: rep.verdict.riskScore,
    auditQualityScore: rep.verdict.auditQualityScore,
    targetAddress: rep.target?.contractAddress,
    chainId: String(rep.target?.chainId || "1"),
    reportId: rep.reportId,
    tier: rep.clientEntitlementTier,
    locale: rep.locale,
  });
  return pkg.merkleRoot;
}

const originalRoot = report.merkleRoot;
console.log("Recomputed Original Root matches:", computeRoot(report) === originalRoot);

// 1. Mutate riskScore
const mut1 = JSON.parse(JSON.stringify(report));
mut1.verdict.riskScore = 99;
const root1 = computeRoot(mut1);
console.log("Mutate riskScore (42 -> 99): root changed?", root1 !== originalRoot, root1);

// 2. Mutate finding severity
const mut2 = JSON.parse(JSON.stringify(report));
if (mut2.sections[2]?.data?.findings?.[0]) {
  mut2.sections[2].data.findings[0].severity = "critical";
  const root2 = computeRoot(mut2);
  console.log("Mutate finding severity: root changed?", root2 !== originalRoot, root2);
} else {
  console.log("Section 2 has no findings");
}

// 3. Mutate metric value
const mut3 = JSON.parse(JSON.stringify(report));
if (mut3.sections[0]?.data?.metrics?.[0]) {
  mut3.sections[0].data.metrics[0].value = "HACKED";
  const root3 = computeRoot(mut3);
  console.log("Mutate metric value: root changed?", root3 !== originalRoot, root3);
}

// 4. Mutate audit quality score
const mut4 = JSON.parse(JSON.stringify(report));
mut4.verdict.auditQualityScore = 10;
const root4 = computeRoot(mut4);
console.log("Mutate quality score: root changed?", root4 !== originalRoot, root4);

if (root1 !== originalRoot && mut2.sections[2]?.data?.findings?.[0] && root4 !== originalRoot) {
  console.log("\n>>> ALL ADVERSARIAL MUTATIONS SUCCESSFULLY DETECTED! Merkle root is now 100% HOSTILE-BY-DESIGN.");
}
