import { MASTER_50_ASSETS } from "@/lib/security/corpus/master-50-assets";
import { buildCanonicalAuditReport } from "@/lib/security/audit-canonical-report";
import { CrossAssetAndTierForensicEngine } from "@/lib/security/furnace/cross-asset-and-tier-forensics";

const reports = [];
for (const asset of MASTER_50_ASSETS) {
  for (const tier of ["basic", "pro", "advanced"] as const) {
    const report = buildCanonicalAuditReport(
      {
        reportId: `rep_${asset.symbol.toLowerCase()}_${String(asset.index).padStart(2, "0")}_${tier}`,
        contractName: asset.name,
        contractAddress: asset.address,
        network: asset.network,
        chainId: asset.chainId,
        tokenSymbol: asset.symbol,
        locale: asset.locale,
      },
      tier,
    );
    reports.push({ asset, tier, report });
  }
}

const engine = new CrossAssetAndTierForensicEngine();
const result = engine.auditCorpus(reports);
console.log("Forensic Analysis Result:");
console.log("Passed:", result.passed);
console.log("Total Reports Audited:", result.totalReportsAudited);
console.log("Total Violations:", result.totalViolations);
for (const v of result.violations) {
  console.log(`[${v.code}] ${v.assetId} (${v.tier}): ${v.message}`);
}
console.log("Asset Isolation Score:", result.assetIsolationScore);
console.log("Tier Enforcement Score:", result.tierEnforcementScore);
console.log("Metric Integrity Score:", result.metricIntegrityScore);
