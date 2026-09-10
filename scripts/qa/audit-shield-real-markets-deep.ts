import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

interface AuditSection {
  id: string;
  title: string;
  isLocked: boolean;
  content?: string;
  body?: string;
  summary?: string;
  findings?: unknown[];
  data?: unknown;
  signals?: unknown[];
  merkleLeaf?: string;
}

interface AuditReport {
  id: string;
  domain: string;
  tier: 'basic' | 'pro' | 'advanced';
  locale: string;
  target: {
    symbol: string;
    name: string;
    assetClass?: string;
    address?: string;
    proxyPattern?: string;
    [key: string]: unknown;
  };
  riskScore: number;
  auditQualityScore: number;
  reportDigest: string;
  merkleRoot: string;
  sections: AuditSection[];
  integrityProof?: {
    pdfSha256?: string;
    jsonSha256?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface DomainAuditSummary {
  domain: string;
  totalJsonFiles: number;
  totalPdfFiles: number;
  pdfMissing: string[];
  pdfHashMismatches: string[];
  jsonCorruptions: string[];
  schemaAnomalies: string[];
  domainFirewallViolations: string[];
  tierDistribution: {
    basic: number;
    pro: number;
    advanced: number;
  };
  contractSampleByTier: {
    basic?: AuditReport;
    pro?: AuditReport;
    advanced?: AuditReport;
  };
  scoreRange: {
    minRisk: number;
    maxRisk: number;
    minQuality: number;
    maxQuality: number;
  };
  sectionSchemaByTier: {
    basic: { total: number; locked: number; unlocked: number; ids: string[] };
    pro: { total: number; locked: number; unlocked: number; ids: string[] };
    advanced: { total: number; locked: number; unlocked: number; ids: string[] };
  };
}

function auditCorpus(domain: string, corpusDir: string): DomainAuditSummary {
  const files = fs.readdirSync(corpusDir);
  const jsonFiles = files.filter(f => f.endsWith('.json'));
  const pdfFiles = files.filter(f => f.endsWith('.pdf'));

  const summary: DomainAuditSummary = {
    domain,
    totalJsonFiles: jsonFiles.length,
    totalPdfFiles: pdfFiles.length,
    pdfMissing: [],
    pdfHashMismatches: [],
    jsonCorruptions: [],
    schemaAnomalies: [],
    domainFirewallViolations: [],
    tierDistribution: { basic: 0, pro: 0, advanced: 0 },
    contractSampleByTier: {},
    scoreRange: { minRisk: 100, maxRisk: 0, minQuality: 100, maxQuality: 0 },
    sectionSchemaByTier: {
      basic: { total: 0, locked: 0, unlocked: 0, ids: [] },
      pro: { total: 0, locked: 0, unlocked: 0, ids: [] },
      advanced: { total: 0, locked: 0, unlocked: 0, ids: [] }
    }
  };

  for (const jf of jsonFiles) {
    const jsonPath = path.join(corpusDir, jf);
    let report: AuditReport;
    try {
      report = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    } catch (e: unknown) {
      summary.jsonCorruptions.push(`${jf}: ${e instanceof Error ? e.message : String(e)}`);
      continue;
    }

    const tier = report.clientEntitlementTier || (jf.includes('basic') ? 'basic' : jf.includes('pro') ? 'pro' : 'advanced');
    if (summary.tierDistribution[tier] !== undefined) {
      summary.tierDistribution[tier]++;
    }

    // Save sample for data contract extraction
    if (!summary.contractSampleByTier[tier]) {
      summary.contractSampleByTier[tier] = report;
    }

    // PDF parity check
    const pdfName = jf.replace('.json', '.pdf');
    const pdfPath = path.join(corpusDir, pdfName);
    if (!fs.existsSync(pdfPath)) {
      summary.pdfMissing.push(pdfName);
    } else if (report.integrityProof?.pdfSha256) {
      const pdfBuf = fs.readFileSync(pdfPath);
      const computedHash = crypto.createHash('sha256').update(pdfBuf).digest('hex');
      const declared = (report.integrityProof.pdfSha256 || '').replace(/^sha256:/, '');
      if (computedHash !== declared) {
        summary.pdfHashMismatches.push(`${jf}: computed ${computedHash} !== declared ${declared}`);
      }
    }

    // Domain Firewall check
    if (domain === 'REAL_MARKETS') {
      const rawStr = JSON.stringify(report);
      if (rawStr.includes('proxyPattern') || rawStr.includes('solc') || rawStr.includes('0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c') || report.verdict?.snapshotProvenance?.runtimeBytecodeSha256) {
        summary.domainFirewallViolations.push(`${jf}: contains EVM smart contract artifacts in Real Markets`);
      }
    }

    // Score ranges from verdict
    const risk = report.verdict?.riskScore;
    const quality = report.verdict?.auditQualityScore;
    if (typeof risk === 'number') {
      summary.scoreRange.minRisk = Math.min(summary.scoreRange.minRisk, risk);
      summary.scoreRange.maxRisk = Math.max(summary.scoreRange.maxRisk, risk);
    } else {
      summary.schemaAnomalies.push(`${jf}: verdict.riskScore is not a number`);
    }

    if (typeof quality === 'number') {
      summary.scoreRange.minQuality = Math.min(summary.scoreRange.minQuality, quality);
      summary.scoreRange.maxQuality = Math.max(summary.scoreRange.maxQuality, quality);
    } else {
      summary.schemaAnomalies.push(`${jf}: verdict.auditQualityScore is not a number`);
    }

    // Sections analysis
    if (!report.sections || !Array.isArray(report.sections)) {
      summary.schemaAnomalies.push(`${jf}: missing or invalid sections`);
    } else {
      const locked = report.sections.filter(s => s.isLocked).length;
      const unlocked = report.sections.filter(s => !s.isLocked).length;
      const ids = report.sections.map(s => s.id);

      summary.sectionSchemaByTier[tier] = {
        total: report.sections.length,
        locked,
        unlocked,
        ids
      };

      if (tier === 'basic' && locked === 0) {
        summary.schemaAnomalies.push(`${jf} (basic): expected locked premium sections, found 0`);
      }
      if (tier === 'advanced' && locked > 0) {
        summary.schemaAnomalies.push(`${jf} (advanced): expected 0 locked sections, found ${locked}`);
      }
    }
  }

  return summary;
}

export function runDeepAudit() {
  console.log('================================================================================');
  console.log('🔍 DEEP AUDIT & DATA CONTRACT EXTRACTION: SHIELD & REAL MARKETS');
  console.log('================================================================================\n');

  const shieldSummary = auditCorpus('SHIELD', 'velmere-final/reports/shield/corpus');
  const realMarketsSummary = auditCorpus('REAL_MARKETS', 'velmere-final/reports/real-markets/corpus');

  console.log('--- 1. SHIELD DOMAIN AUDIT RESULTS ---');
  console.log(`JSON Files: ${shieldSummary.totalJsonFiles} | PDF Files: ${shieldSummary.totalPdfFiles}`);
  console.log(`Tiers: Basic=${shieldSummary.tierDistribution.basic}, Pro=${shieldSummary.tierDistribution.pro}, Advanced=${shieldSummary.tierDistribution.advanced}`);
  console.log(`Risk Scores: [${shieldSummary.scoreRange.minRisk} - ${shieldSummary.scoreRange.maxRisk}] | Quality Scores: [${shieldSummary.scoreRange.minQuality} - ${shieldSummary.scoreRange.maxQuality}]`);
  console.log(`PDF Missing: ${shieldSummary.pdfMissing.length} | PDF Hash Mismatches: ${shieldSummary.pdfHashMismatches.length}`);
  console.log(`JSON Corruptions: ${shieldSummary.jsonCorruptions.length} | Schema Anomalies: ${shieldSummary.schemaAnomalies.length}`);
  console.log(`Basic Sections: ${shieldSummary.sectionSchemaByTier.basic.unlocked} unlocked, ${shieldSummary.sectionSchemaByTier.basic.locked} locked`);
  console.log(`Pro Sections: ${shieldSummary.sectionSchemaByTier.pro.unlocked} unlocked, ${shieldSummary.sectionSchemaByTier.pro.locked} locked`);
  console.log(`Advanced Sections: ${shieldSummary.sectionSchemaByTier.advanced.unlocked} unlocked, ${shieldSummary.sectionSchemaByTier.advanced.locked} locked`);

  console.log('\n--- 2. REAL MARKETS DOMAIN AUDIT RESULTS ---');
  console.log(`JSON Files: ${realMarketsSummary.totalJsonFiles} | PDF Files: ${realMarketsSummary.totalPdfFiles}`);
  console.log(`Tiers: Basic=${realMarketsSummary.tierDistribution.basic}, Pro=${realMarketsSummary.tierDistribution.pro}, Advanced=${realMarketsSummary.tierDistribution.advanced}`);
  console.log(`Risk Scores: [${realMarketsSummary.scoreRange.minRisk} - ${realMarketsSummary.scoreRange.maxRisk}] | Quality Scores: [${realMarketsSummary.scoreRange.minQuality} - ${realMarketsSummary.scoreRange.maxQuality}]`);
  console.log(`PDF Missing: ${realMarketsSummary.pdfMissing.length} | PDF Hash Mismatches: ${realMarketsSummary.pdfHashMismatches.length}`);
  console.log(`JSON Corruptions: ${realMarketsSummary.jsonCorruptions.length} | Schema Anomalies: ${realMarketsSummary.schemaAnomalies.length}`);
  console.log(`Domain Firewall Violations: ${realMarketsSummary.domainFirewallViolations.length}`);
  console.log(`Basic Sections: ${realMarketsSummary.sectionSchemaByTier.basic.unlocked} unlocked, ${realMarketsSummary.sectionSchemaByTier.basic.locked} locked`);
  console.log(`Pro Sections: ${realMarketsSummary.sectionSchemaByTier.pro.unlocked} unlocked, ${realMarketsSummary.sectionSchemaByTier.pro.locked} locked`);
  console.log(`Advanced Sections: ${realMarketsSummary.sectionSchemaByTier.advanced.unlocked} unlocked, ${realMarketsSummary.sectionSchemaByTier.advanced.locked} locked`);

  // Save audit results and extracted contracts to JSON
  const output = {
    auditTimestamp: new Date().toISOString(),
    overallStatus: (shieldSummary.schemaAnomalies.length === 0 && realMarketsSummary.schemaAnomalies.length === 0 && realMarketsSummary.domainFirewallViolations.length === 0) ? 'AUDIT_CLEAN_TOP_WORLD' : 'DEFECTS_DETECTED',
    shield: shieldSummary,
    realMarkets: realMarketsSummary
  };

  fs.writeFileSync('artifacts/DEEP_AUDIT_SHIELD_REAL_MARKETS_EVALUATION.json', JSON.stringify(output, null, 2));
  console.log('\n✅ Audit report written to: artifacts/DEEP_AUDIT_SHIELD_REAL_MARKETS_EVALUATION.json');
}

runDeepAudit();
