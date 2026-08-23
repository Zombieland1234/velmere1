import fs from 'node:fs';
import path from 'node:path';
import { buildPass2570AuditSourceQuorumReport } from '../p73-work/source/lib/security/audit-source-quorum-runtime';
import { buildPass2571AuditProviderIntelligenceReport } from '../p73-work/source/lib/security/audit-provider-intelligence';
import { buildPass2572AuditProviderRuntimeReport } from '../p73-work/source/lib/security/audit-provider-runtime-client';
import { buildPass2573AuditRuntimeConfidenceReport } from '../p73-work/source/lib/security/audit-runtime-confidence';
import { buildPass2574AuditClaimLedgerReport } from '../p73-work/source/lib/security/audit-claim-ledger';
import { buildPass2575AuditSourceFreshnessReport } from '../p73-work/source/lib/security/audit-source-freshness';
import { buildPass2576AuditPermissionParserReport } from '../p73-work/source/lib/security/audit-permission-parser';
import { buildPass2577AuditLiquidityHolderLockRiskReport } from '../p73-work/source/lib/security/audit-liquidity-holder-lock-risk';
import { buildPass2578AuditReportAssemblerReport } from '../p73-work/source/lib/security/audit-report-assembler';
import { buildAuditPublicSourceReceiptReport } from '../p73-work/source/lib/security/audit-public-source-receipts';
import { buildPass4820AuditCustomerReportPipeline } from '../p73-work/source/lib/security/audit-customer-report-pipeline';
import { evaluateAuditPaidEvidenceReadiness, isStrictAuditEvidenceLane } from '../p73-work/source/lib/security/audit-paid-evidence-readiness';
import { getAuditTierContract } from '../p73-work/source/lib/security/audit-tier-contract';

const OUT = process.env.P73_RESULT_DIR || path.resolve('p73-out');
fs.mkdirSync(OUT, { recursive: true });

const input = {
  locale: 'en',
  chain: 'ancient8',
  contractAddress: '0xca11bde05977b3631167028862be2a173976ca11',
  reviewLevel: 'basic_review' as const,
  docsUrl: 'https://docs.ancient8.gg/using-ancient8-chain/contracts',
  githubUrl: 'https://github.com/mds1/multicall3/issues/336',
  website: 'https://ancient8.gg',
};

function serialError(error: unknown) {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

async function main() {
  const sourceQuorum = buildPass2570AuditSourceQuorumReport(input);
  const providerIntelligence = buildPass2571AuditProviderIntelligenceReport({ ...input, sourceQuorum });
  const providerRuntime = await buildPass2572AuditProviderRuntimeReport({ ...input, providerIntelligence });
  const runtimeConfidence = buildPass2573AuditRuntimeConfidenceReport({ ...input, sourceQuorum, providerRuntime });
  const claimLedger = buildPass2574AuditClaimLedgerReport({ ...input, sourceQuorum, providerRuntime, runtimeConfidence });
  const sourceFreshness = buildPass2575AuditSourceFreshnessReport({ ...input, providerRuntime, claimLedger });
  const permissionParser = buildPass2576AuditPermissionParserReport({ ...input, providerRuntime, claimLedger, sourceFreshness });
  const liquidityHolderRisk = buildPass2577AuditLiquidityHolderLockRiskReport({ ...input, providerRuntime, claimLedger, sourceFreshness, permissionParser });
  const report = buildPass2578AuditReportAssemblerReport({ ...input, providerRuntime, runtimeConfidence, claimLedger, sourceFreshness, permissionParser, liquidityHolderRisk });
  const publicSources = await buildAuditPublicSourceReceiptReport({
    docsUrl: input.docsUrl,
    githubUrl: input.githubUrl,
    websiteUrl: input.website,
    contractAddress: input.contractAddress,
    chain: input.chain,
  });
  const tier = getAuditTierContract('basic');
  const readiness = evaluateAuditPaidEvidenceReadiness({ lanes: providerRuntime.lanes, tier: 'basic', tierContract: tier, evidenceRows: report.summary.totalEvidence });

  let pipelineWithoutLedger: unknown = null;
  let pipelineWithoutLedgerError: string | null = null;
  try {
    pipelineWithoutLedger = buildPass4820AuditCustomerReportPipeline({ report, providerRuntime, requestedTier: 'basic', paymentVerified: true, evidenceLedgerVerified: false, manualReviewVerified: false, monitoringConfigured: false });
  } catch (error) { pipelineWithoutLedgerError = serialError(error); }

  let pipelineWithLedger: any = null;
  let pipelineWithLedgerError: string | null = null;
  try {
    pipelineWithLedger = buildPass4820AuditCustomerReportPipeline({ report, providerRuntime, requestedTier: 'basic', paymentVerified: true, evidenceLedgerVerified: true, manualReviewVerified: false, monitoringConfigured: false });
  } catch (error) { pipelineWithLedgerError = serialError(error); }

  const reportRoutePath = path.resolve('p73-work/source/lib/server/security-route-modules/audit-report-assembler.ts');
  const reportRouteSource = fs.readFileSync(reportRoutePath, 'utf8');
  const routeSourceUrlBindings = {
    auditUrl: /searchParams\.get\(["']auditUrl["']\)/.test(reportRouteSource),
    docsUrl: /searchParams\.get\(["']docsUrl["']\)/.test(reportRouteSource),
    githubUrl: /searchParams\.get\(["']githubUrl["']\)/.test(reportRouteSource),
    website: /searchParams\.get\(["']website["']\)/.test(reportRouteSource),
    publicSourceReceiptBuilder: /buildAuditPublicSourceReceiptReport/.test(reportRouteSource),
  };

  const result = {
    schemaVersion: 'velmere.p73r3.basic-customer-pipeline-diagnostic.v1',
    status: 'PASS_DIAGNOSTIC_ZERO_CREDIT',
    parent: { revision: 'P72R3', projectionAggregateSha256: '4db46e951d3f7f2cc04f61418279b9347bc21b4300b7152aa3e2c77395216252' },
    target: input,
    routeSourceUrlBindings,
    sourceQuorum: { overall: sourceQuorum.overall, laneStates: sourceQuorum.lanes.map((x:any) => ({ id:x.id, state:x.state, family:x.family, evidence:x.evidence.length, missing:x.missing })) },
    providerRuntime: {
      summary: providerRuntime.summary,
      strictLanes: providerRuntime.lanes.filter(isStrictAuditEvidenceLane).map((x:any) => ({ id:x.id, provider:x.provider, providerFamily:x.providerFamily, upstreamRoot:x.lineage?.upstreamRoot, bodyDigest:x.receipt?.bodyDigest, state:x.state })),
      lanes: providerRuntime.lanes.map((x:any) => ({ id:x.id, provider:x.provider, state:x.state, identity:x.identity, receipt: x.receipt ? { statusCode:x.receipt.statusCode, bodyBytes:x.receipt.bodyBytes, bodyDigest:x.receipt.bodyDigest } : null, missing:x.missing })),
    },
    runtimeConfidence: runtimeConfidence.overall,
    claimLedger: { summary: claimLedger.summary, confirmedAdverseLikeClaims: claimLedger.claims.filter((x:any) => x.grade==='confirmed' && ['identity','security_flags','source_code','public_audit'].includes(x.category)).map((x:any) => ({ id:x.id, category:x.category, claim:x.claim, sourceFamily:x.sourceFamily, customerLine:x.customerLine })) },
    publicSources: { summary: publicSources.summary, receipts: publicSources.receipts.map((x:any) => ({ kind:x.kind, state:x.state, requestedUrl:x.requestedUrl, finalUrl:x.finalUrl, contentBound:x.contentBound, exactAddressPresent:x.identity.exactAddressPresent, chainMentioned:x.identity.chainMentioned, scopeSignals:x.scopeSignals, missing:x.missing, bodyDigest:x.bodyDigest })) },
    report: { finalVerdict: report.finalVerdict, summary: report.summary, topFindings: report.topFindings },
    basicReadiness: readiness,
    pipelineWithoutLedger: pipelineWithoutLedger ? { releaseState:(pipelineWithoutLedger as any).releaseState, deliveredTier:(pipelineWithoutLedger as any).deliveredTier, visibleTier:(pipelineWithoutLedger as any).customerReport?.deliveryPolicy?.visibleTier, blockedReasons:(pipelineWithoutLedger as any).customerReport?.deliveryPolicy?.blockedReasons } : null,
    pipelineWithoutLedgerError,
    pipelineWithLedger: pipelineWithLedger ? { releaseState:pipelineWithLedger.releaseState, deliveredTier:pipelineWithLedger.deliveredTier, visibleTier:pipelineWithLedger.customerReport?.deliveryPolicy?.visibleTier, blockedReasons:pipelineWithLedger.customerReport?.deliveryPolicy?.blockedReasons, pipelineDigest:pipelineWithLedger.pipelineDigest, sourceTruth:pipelineWithLedger.sourceTruth } : null,
    pipelineWithLedgerError,
    credit: { customerFinalOutput:0, auditFinalPdf:0, deploymentGroundTruthCaseDelta:0, rights:0, paidValue:0, sale:0, live:false },
    truthBoundary: 'Diagnostic only. evidenceLedgerVerified=true is intentionally simulated in one branch solely to isolate non-ledger blockers. No customer FINAL, PDF, rights, value, sale or LIVE credit may be inferred from this result.',
  };
  fs.writeFileSync(path.join(OUT, 'P73R3_BASIC_CUSTOMER_PIPELINE_DIAGNOSTIC.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  const result = { schemaVersion:'velmere.p73r3.basic-customer-pipeline-diagnostic.v1', status:'FAIL_CLOSED', error:serialError(error), credit:{customerFinalOutput:0,auditFinalPdf:0,rights:0,paidValue:0,sale:0,live:false} };
  fs.writeFileSync(path.join(OUT, 'P73R3_BASIC_CUSTOMER_PIPELINE_DIAGNOSTIC.json'), JSON.stringify(result,null,2)+'\n');
  console.error(JSON.stringify(result,null,2));
  process.exit(1);
});
