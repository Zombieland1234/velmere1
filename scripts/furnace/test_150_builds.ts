import { MASTER_50_ASSETS } from "@/lib/security/corpus/master-50-assets";
import { buildCanonicalAuditReport } from "@/lib/security/audit-canonical-report";
import { resolveSecurityEngine } from "@/lib/security/engines";

console.log("Total assets defined:", MASTER_50_ASSETS.length);
let okCount = 0;

for (const asset of MASTER_50_ASSETS) {
  for (const tier of ["basic", "pro", "advanced"] as const) {
    const reportId = `rep_${asset.symbol.toLowerCase()}_${String(asset.index).padStart(2, "0")}_${tier}`;
    const report = buildCanonicalAuditReport(
      {
        reportId,
        contractName: asset.name,
        contractAddress: asset.address,
        network: asset.network,
        chainId: asset.chainId,
        tokenSymbol: asset.symbol,
        locale: asset.locale,
      },
      tier,
    );

    if (!report || !report.verdict) {
      throw new Error(`Failed to build report for ${asset.symbol} on tier ${tier}`);
    }

    if (report.verdict.evidenceCoverage < 0 || report.verdict.evidenceCoverage > 100) {
      throw new Error(`Invalid coverage ${report.verdict.evidenceCoverage} for ${asset.symbol}`);
    }

    okCount++;
  }
}

console.log(`Successfully built reports for all ${okCount} asset-tier combinations (50 x 3 = 150)!`);
