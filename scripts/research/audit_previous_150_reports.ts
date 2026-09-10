import fs from "fs";
import path from "path";
import { MASTER_50_ASSETS, type MasterAuditAsset } from "../../lib/security/corpus/master-50-assets";
import {
  buildFullInternalCanonicalReport,
  filterCanonicalReportByEntitlement,
  type AuditTier,
  type CanonicalAuditReportModel,
} from "../../lib/security/audit-canonical-report";

const ROOT_DIR = process.cwd();

interface ClaimAudit {
  claimText: string;
  category: "metric" | "finding" | "paragraph" | "teaser" | "verdict";
  classification: "A" | "B" | "C" | "D" | "E" | "F";
  statusDeclared: string;
  isCompliant: boolean;
  notes: string;
}

interface ReportAuditRecord {
  reportIndex: number;
  assetId: string;
  symbol: string;
  name: string;
  tier: AuditTier;
  locale: string;
  canonicalAssetClass: string;
  verificationType: "REAL" | "SIMULATED_FIXTURE";
  chain: string;
  addressOrSymbol: string;
  pdfFileName: string;
  byteLength: number;
  sha256: string;
  score: number;
  confidence: number;
  coverage: number;
  claimsCount: number;
  claimBreakdown: {
    A: number;
    B: number;
    C: number;
    D: number;
    E: number;
    F: number;
  };
  defects: string[];
  auditPassed: boolean;
}

function classifyClaim(
  text: string,
  category: "metric" | "finding" | "paragraph" | "teaser" | "verdict",
  statusDeclared: string,
  asset: MasterAuditAsset,
  hasBytecode: boolean,
): ClaimAudit {
  const isFixture = asset.verificationType === "SIMULATED_FIXTURE";
  const lower = text.toLowerCase();

  // If asset is simulated fixture
  if (isFixture) {
    if (statusDeclared === "verified") {
      return {
        claimText: text,
        category,
        classification: "E", // Defect: declaring "verified" on simulated fixture without explicit fixture qualification
        statusDeclared,
        isCompliant: false,
        notes: "DEFECT: Verified claim on simulated fixture without explicit fixture isolation",
      };
    }
    return {
      claimText: text,
      category,
      classification: "F",
      statusDeclared,
      isCompliant: true,
      notes: "Simulated fixture claim",
    };
  }

  // Check for impossible claims when bytecode is missing
  if (asset.assetClass === "evm_contract" && !hasBytecode) {
    if (lower.includes("opcode") || lower.includes("reentrancy") || lower.includes("proxy") || lower.includes("oracle")) {
      if (statusDeclared === "verified" || lower.includes("verified")) {
        return {
          claimText: text,
          category,
          classification: "E", // Contradictory: claiming opcode/reentrancy verification without bytecode
          statusDeclared,
          isCompliant: false,
          notes: "DEFECT: Bytecode-derived claim made when bytecode is unavailable",
        };
      }
    }
  }

  // Check for EVM claims on native or market assets
  if (asset.assetClass === "traditional_market" || asset.assetClass === "native_chain") {
    if (lower.includes("solidity") || lower.includes("reentrancy") || lower.includes("bytecode") || lower.includes("erc-20")) {
      return {
        claimText: text,
        category,
        classification: "E",
        statusDeclared,
        isCompliant: false,
        notes: "DEFECT: Cross-asset contamination (EVM terminology in non-EVM asset)",
      };
    }
  }

  // Check heuristic vs verified
  if (statusDeclared === "verified") {
    // If it's verified data like symbol, chain, explorer verified bytecode
    if (lower.includes("symbol") || lower.includes("network") || lower.includes("verified source") || lower.includes("chainlink")) {
      return {
        claimText: text,
        category,
        classification: "A",
        statusDeclared,
        isCompliant: true,
        notes: "Directly evidenced",
      };
    }
    return {
      claimText: text,
      category,
      classification: "B",
      statusDeclared,
      isCompliant: true,
      notes: "Deterministically derived from evidence",
    };
  }

  if (statusDeclared === "flagged" || statusDeclared === "neutral") {
    return {
      claimText: text,
      category,
      classification: "C",
      statusDeclared,
      isCompliant: true,
      notes: "Heuristic / Analytical interpretation",
    };
  }

  if (statusDeclared === "missing") {
    return {
      claimText: text,
      category,
      classification: "D",
      statusDeclared,
      isCompliant: true,
      notes: "Unverified / Missing data",
    };
  }

  return {
    claimText: text,
    category,
    classification: "B",
    statusDeclared,
    isCompliant: true,
    notes: "Default derived claim",
  };
}

function runAudit() {
  console.log("Starting forensic audit of previous 150-report system...");

  const manifestPath = path.join(ROOT_DIR, "dowody2/rejestr_150_wygenerowanych_pdf.json");
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Previous manifest not found at ${manifestPath}`);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  console.log(`Loaded manifest with ${manifest.totalGenerated} items.`);

  const auditRecords: ReportAuditRecord[] = [];
  let totalDefectsCount = 0;
  const globalClaimBreakdown = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };

  for (let i = 0; i < manifest.items.length; i++) {
    const item = manifest.items[i];
    const assetDef = MASTER_50_ASSETS.find((a) => a.assetId === item.assetId);
    if (!assetDef) {
      console.warn(`Asset not found in MASTER_50_ASSETS: ${item.assetId}`);
      continue;
    }

    const tier: AuditTier = item.tier as AuditTier;
    const locale = item.locale || "pl";

    // Generate canonical report representation to inspect all claims
    const fullInternal = buildFullInternalCanonicalReport({
      reportId: item.assetId,
      contractName: assetDef.name,
      contractAddress: assetDef.address,
      tokenSymbol: assetDef.symbol,
      network: assetDef.network,
      chainId: assetDef.chainId ? String(assetDef.chainId) : undefined,
      locale,
      rawBytecode: (assetDef as any).rawBytecode,
    });

    const entitledReport = filterCanonicalReportByEntitlement(fullInternal, tier);

    const reportClaims: ClaimAudit[] = [];
    const defects: string[] = [];
    const claimCounts = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };

    // 1. Audit verdict
    const vClaim = classifyClaim(
      `Risk score ${entitledReport.verdict.riskScore} (${entitledReport.verdict.riskLabel}): ${entitledReport.verdict.summary}`,
      "verdict",
      "verified",
      assetDef,
      Boolean((assetDef as any).rawBytecode),
    );
    reportClaims.push(vClaim);

    // 2. Audit sections
    for (const sec of entitledReport.sections) {
      if (sec.isLocked) {
        if (sec.sampleSummaryLines) {
          for (const line of sec.sampleSummaryLines) {
            const tClaim = classifyClaim(line, "teaser", "neutral", assetDef, Boolean((assetDef as any).rawBytecode));
            reportClaims.push(tClaim);
          }
        }
      } else if (sec.data) {
        if (sec.data.metrics) {
          for (const m of sec.data.metrics) {
            const mClaim = classifyClaim(
              `${m.label}: ${m.value}`,
              "metric",
              m.status,
              assetDef,
              Boolean((assetDef as any).rawBytecode),
            );
            reportClaims.push(mClaim);
          }
        }
        if (sec.data.paragraphs) {
          for (const p of sec.data.paragraphs) {
            const pClaim = classifyClaim(p, "paragraph", "neutral", assetDef, Boolean((assetDef as any).rawBytecode));
            reportClaims.push(pClaim);
          }
        }
        if (sec.data.findings) {
          for (const f of sec.data.findings) {
            const fClaim = classifyClaim(
              `[${f.severity.toUpperCase()}] ${f.title}: ${f.evidence}`,
              "finding",
              "flagged",
              assetDef,
              Boolean((assetDef as any).rawBytecode),
            );
            reportClaims.push(fClaim);
          }
        }
      }
    }

    // Tally claims
    for (const c of reportClaims) {
      claimCounts[c.classification]++;
      globalClaimBreakdown[c.classification]++;
      if (c.classification === "E") {
        defects.push(c.notes + " -> " + c.claimText.slice(0, 80));
      }
    }

    // Check specific architectural defects:
    // Defect check: If simulated fixture has non-zero risk score without explicit simulation caveat
    if (assetDef.verificationType === "SIMULATED_FIXTURE" && entitledReport.verdict.riskScore === 0) {
      defects.push("Defect: Simulated fixture assigned score 0 without simulated score model");
    }

    if (defects.length > 0) {
      totalDefectsCount += defects.length;
    }

    auditRecords.push({
      reportIndex: item.totalIndex,
      assetId: item.assetId,
      symbol: item.symbol,
      name: item.name,
      tier,
      locale,
      canonicalAssetClass: item.assetClass,
      verificationType: assetDef.verificationType,
      chain: assetDef.network,
      addressOrSymbol: assetDef.address,
      pdfFileName: item.fileName,
      byteLength: item.byteLength,
      sha256: item.sha256,
      score: item.riskScore,
      confidence: item.confidenceScore,
      coverage: item.evidenceCoverage,
      claimsCount: reportClaims.length,
      claimBreakdown: claimCounts,
      defects,
      auditPassed: defects.length === 0,
    });
  }

  const result = {
    auditedAt: new Date().toISOString(),
    totalReportsAudited: auditRecords.length,
    totalDefectsFound: totalDefectsCount,
    globalClaimBreakdown,
    summary: {
      totalClaimsEvaluated: Object.values(globalClaimBreakdown).reduce((a, b) => a + b, 0),
      classificationLegend: {
        A: "Directly evidenced",
        B: "Derived deterministically from evidenced data",
        C: "Heuristic / inference (analytical interpretation)",
        D: "Unverified / missing data",
        E: "Contradictory / impossible / architecture defect",
        F: "Fixture / simulation only",
      },
      cleanPassReportsCount: auditRecords.filter((r) => r.auditPassed).length,
      defectiveReportsCount: auditRecords.filter((r) => !r.auditPassed).length,
    },
    reports: auditRecords,
  };

  const outPath = path.join(ROOT_DIR, "reports/research/previous_150_forensic_audit.json");
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2), "utf-8");
  console.log(`Wrote previous 150 forensic audit JSON to ${outPath}`);
  console.log(`Audit Summary: ${result.reports.length} reports audited. ${totalDefectsCount} defects flagged.`);
  console.log(`Claims breakdown: A=${globalClaimBreakdown.A}, B=${globalClaimBreakdown.B}, C=${globalClaimBreakdown.C}, D=${globalClaimBreakdown.D}, E=${globalClaimBreakdown.E}, F=${globalClaimBreakdown.F}`);
}

runAudit();
