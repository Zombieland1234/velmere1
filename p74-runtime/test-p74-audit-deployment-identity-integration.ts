import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  buildAuditDeploymentIdentityEvidence,
  verifyAuditDeploymentIdentityEvidence,
} from '../p74-work/source/lib/security/audit-deployment-identity-evidence';
import {
  buildAuditAdjudicatedAuthorityEvidence,
  verifyAuditAdjudicatedAuthorityEvidence,
} from '../p74-work/source/lib/security/audit-adjudicated-authority-evidence';
import { buildPass2574AuditClaimLedgerReport } from '../p74-work/source/lib/security/audit-claim-ledger';
import { buildPass2578AuditReportAssemblerReport } from '../p74-work/source/lib/security/audit-report-assembler';
import { buildPass4820AuditCustomerReportPipeline } from '../p74-work/source/lib/security/audit-customer-report-pipeline';
import { evaluateAuditPaidEvidenceReadiness } from '../p74-work/source/lib/security/audit-paid-evidence-readiness';
import { getAuditTierContract } from '../p74-work/source/lib/security/audit-tier-contract';
import type {
  Pass2572AuditProviderRuntimeReport,
  Pass2572RuntimeLane,
} from '../p74-work/source/lib/security/audit-provider-runtime-client';

const OUT = process.env.P74_RESULT_DIR || path.resolve('p74-product-out');
const ROOT = process.env.P74_SOURCE_ROOT || path.resolve('p74-work/source');
const CANONICAL = '0xca11bde05977b3631167028862be2a173976ca11';
const OFFICIAL = '0xb76d6e8c82d06fd262ef3799db73d5a724108d4e';
const EXPECTED_RUNTIME = 'sha256:435d8ffcf6c6dac190ab1d07c5c9f09d7f9ee92acd6b5c24d8149601ac12bbc1';
const EXPECTED_SOURCE = 'sha256:e9a893737791350d763db354b1b1f5eb48a7b3046cdc7933713867ea7c340a74';
fs.mkdirSync(OUT, { recursive: true });

const checks: Array<{ id: string; passed: true; detail?: unknown }> = [];
function check(id: string, value: unknown, detail?: unknown) {
  assert.ok(value, id);
  checks.push({ id, passed: true, ...(detail === undefined ? {} : { detail }) });
}

function syntheticStrictLane(args: {
  sourceTimestamp?: string | null;
  sourceTimestampProvenance?: 'provider' | 'blockchain' | 'transport_received';
}): Pass2572RuntimeLane {
  const observedAt = new Date().toISOString();
  return {
    id: 'p74-unit-source-clock-lane',
    label: 'P74 source-clock unit control',
    provider: 'P74 unit provider',
    providerFamily: 'p74_unit_provider',
    lineage: {
      providerId: 'p74-unit-provider',
      upstreamRoot: 'unit.example',
      correlationGroup: 'p74-unit-control',
      independenceEligible: true,
      transport: 'direct_api',
    },
    receipt: {
      observedAt,
      sourceTimestamp: args.sourceTimestamp,
      sourceTimestampProvenance: args.sourceTimestampProvenance,
      statusCode: 200,
      contentType: 'application/json',
      bodyBytes: 128,
      bodyDigest: 'a'.repeat(64),
      requestUrlDigest: 'b'.repeat(64),
      relatedResponseDigests: [],
    },
    identity: {
      verification: 'exact_response',
      requestedAddress: CANONICAL,
      resolvedAddress: CANONICAL,
      requestedChainId: '888888888',
      resolvedChainId: '888888888',
      matched: true,
    },
    state: 'confirmed',
    tier: ['basic'],
    claim: 'Unit-only receipt freshness control.',
    evidence: ['unit-only-source-clock'],
    missing: [],
    latencyMs: 10,
    timeoutMs: 1000,
    noStore: true,
    boundary: 'SYNTHETIC_UNIT_ONLY_NO_PRODUCT_CREDIT',
  };
}

function providerRuntime(lanes: Pass2572RuntimeLane[], generatedAt: string): Pass2572AuditProviderRuntimeReport {
  return {
    passId: 'audit-provider-runtime-client',
    generatedAt,
    locale: 'en',
    target: { contractAddress: CANONICAL, chain: 'ancient8', chainId: '888888888' },
    rule: 'SYNTHETIC_UNIT_ONLY_NO_PRODUCT_CREDIT',
    runtimeMode: 'p74_unit_control',
    lanes,
    summary: {
      confirmed: lanes.filter((lane) => lane.state === 'confirmed').length,
      confirmedResponses: lanes.filter((lane) => lane.state === 'confirmed' && lane.receipt).length,
      partial: 0,
      missing: 0,
      blocked: 0,
      timedOut: 0,
      errors: 0,
      independentUpstreamRoots: lanes.filter((lane) => lane.lineage.independenceEligible).map((lane) => lane.lineage.upstreamRoot),
      strictUpstreamQuorumMet: false,
      liveProviderCoverage: 'SYNTHETIC_UNIT_ONLY',
      confidenceHint: 'SYNTHETIC_UNIT_ONLY',
    },
    basicRows: [],
    proRows: [],
    advancedRows: [],
    nextQueue: [],
  };
}

async function main() {
  // REAL CURRENT EVIDENCE LANE: no synthetic provider facts are used here.
  const deployment = await buildAuditDeploymentIdentityEvidence({
    chain: 'ancient8',
    chainId: '888888888',
    address: OFFICIAL,
  });
  check('deployment:verified-current', deployment.state === 'verified_current', deployment);
  check('deployment:self-verifies', verifyAuditDeploymentIdentityEvidence(deployment));
  check('deployment:official-address', deployment.target.address === OFFICIAL, deployment.target);
  check('deployment:source-exact', deployment.source.exactMatch === true && deployment.source.sourceDigest === EXPECTED_SOURCE, deployment.source);
  check('deployment:compiler-exact', deployment.source.compilerVersion === '0.8.26+commit.8a97fa7a' && deployment.source.optimizerRuns === 200, deployment.source);
  check('deployment:runtime-exact', deployment.runtime.byteLength === 3178 && deployment.runtime.runtimeDigest === EXPECTED_RUNTIME, deployment.runtime);
  check('deployment:blockchain-clock', deployment.runtime.sourceTimestampProvenance === 'blockchain' && Boolean(deployment.runtime.blockTimestamp), deployment.runtime);
  check('deployment:p74r5-bound', deployment.replayReference.runId === '32063820844' && deployment.replayReference.artifactId === '9299112031', deployment.replayReference);
  check('deployment:single-provider-only', deployment.provider.independenceEligible === false && deployment.independentProviderQuorum === false, deployment.provider);
  check('deployment:independent-quorum-open', deployment.blockers.includes('independent_runtime_provider_quorum_unavailable'), deployment.blockers);

  const tamperedDeployment = {
    ...deployment,
    runtime: { ...deployment.runtime, runtimeDigest: `sha256:${'0'.repeat(64)}` },
  };
  check('deployment:tamper-fails', verifyAuditDeploymentIdentityEvidence(tamperedDeployment) === false);

  const wrongTarget = await buildAuditDeploymentIdentityEvidence({ chain: 'ancient8', chainId: '888888888', address: CANONICAL });
  check('deployment:canonical-address-not-registered-as-official-alternate', wrongTarget.state === 'not_applicable' && wrongTarget.runtime.runtimeDigest === null, wrongTarget);

  const authority = await buildAuditAdjudicatedAuthorityEvidence({ chain: 'ancient8', contractAddress: CANONICAL });
  check('authority:confirmed', authority.state === 'confirmed', authority);
  check('authority:self-verifies', verifyAuditAdjudicatedAuthorityEvidence(authority));
  check('authority:two-independent-authority-roots', authority.receipts.length === 2 && new Set(authority.receipts.map((row) => row.upstreamRoot)).size === 2, authority.authorityRoots);
  check('authority:nested-current-deployment', authority.deploymentIdentity?.state === 'verified_current', authority.deploymentIdentity);
  check('authority:nested-runtime-exact', authority.deploymentIdentity?.runtime.runtimeDigest === EXPECTED_RUNTIME, authority.deploymentIdentity?.runtime);
  check('authority:no-fake-runtime-quorum', authority.deploymentIdentity?.independentProviderQuorum === false && authority.blockers.includes('independent_runtime_provider_quorum_unavailable'), authority.blockers);
  check('authority:old-unverified-wording-removed', !String(authority.customerLine).includes('Current runtime bytecode remains unverified'), authority.customerLine);
  check('authority:no-exploitability-overclaim', !JSON.stringify(authority).toLowerCase().includes('exploitable vulnerability'), authority.customerLine);

  const claimLedger = buildPass2574AuditClaimLedgerReport({
    locale: 'en', chain: 'ancient8', contractAddress: CANONICAL, reviewLevel: 'basic_review', authorityEvidence: authority,
  });
  const adverse = claimLedger.claims.filter((row) => row.adverseKind === 'deployment_identity');
  check('claim:one-confirmed-deployment-identity', adverse.length === 1 && adverse[0]?.grade === 'confirmed', adverse);
  check('claim:three-evidence-refs-two-authority-plus-runtime', adverse[0]?.evidenceRefs?.length === 3, adverse[0]?.evidenceRefs);
  check('claim:deployment-evidence-digest-inherited', adverse[0]?.evidenceRefs?.includes(deployment.evidenceDigest) === true, adverse[0]?.evidenceRefs);

  const report = buildPass2578AuditReportAssemblerReport({
    locale: 'en', chain: 'ancient8', contractAddress: CANONICAL, reviewLevel: 'basic_review', claimLedger,
  });
  check('report:risk-floor-preserved', report.finalVerdict.riskScore === 90, report.finalVerdict);
  check('report:critical-deployment-finding-preserved', report.topFindings[0]?.severity === 'critical', report.topFindings[0]);
  check('report:no-vulnerability-ground-truth-created', !JSON.stringify(report).toLowerCase().includes('exploitable vulnerability'), report.topFindings);

  const basic = evaluateAuditPaidEvidenceReadiness({ lanes: [], tier: 'basic', tierContract: getAuditTierContract('basic'), evidenceRows: Math.max(2, report.summary.totalEvidence), authorityEvidence: authority });
  const pro = evaluateAuditPaidEvidenceReadiness({ lanes: [], tier: 'pro', tierContract: getAuditTierContract('pro'), evidenceRows: Math.max(6, report.summary.totalEvidence), authorityEvidence: null });
  const advanced = evaluateAuditPaidEvidenceReadiness({ lanes: [], tier: 'advanced', tierContract: getAuditTierContract('advanced'), evidenceRows: Math.max(10, report.summary.totalEvidence), authorityEvidence: null });
  check('readiness:basic-authority-supplement-still-bounded', basic.met === true && basic.verifiedAuthorityReceipts === 2, basic);
  check('readiness:pro-not-unlocked', pro.met === false && pro.verifiedAuthorityReceipts === 0, pro);
  check('readiness:advanced-not-unlocked', advanced.met === false && advanced.verifiedAuthorityReceipts === 0, advanced);

  // SYNTHETIC UNIT CONTROL ONLY: proves timestamp semantics; gives no product/evidence credit.
  const reportTime = new Date().toISOString();
  const sourceTime = new Date(Date.parse(reportTime) - 30_000).toISOString();
  const freshPipeline = buildPass4820AuditCustomerReportPipeline({
    report,
    providerRuntime: providerRuntime([syntheticStrictLane({ sourceTimestamp: sourceTime, sourceTimestampProvenance: 'blockchain' })], reportTime),
    requestedTier: 'basic',
    paymentVerified: true,
    evidenceLedgerVerified: true,
    authorityEvidence: authority,
  });
  check('receipt:source-bound-clock-can-be-commercially-fresh', freshPipeline.sourceTruth.contentBoundProviderReceiptCount === 1, freshPipeline.sourceTruth);

  const transportOnlyPipeline = buildPass4820AuditCustomerReportPipeline({
    report,
    providerRuntime: providerRuntime([syntheticStrictLane({ sourceTimestamp: null, sourceTimestampProvenance: 'transport_received' })], reportTime),
    requestedTier: 'basic',
    paymentVerified: true,
    evidenceLedgerVerified: true,
    authorityEvidence: authority,
  });
  check('receipt:transport-clock-never-commercially-fresh', transportOnlyPipeline.sourceTruth.contentBoundProviderReceiptCount === 0, transportOnlyPipeline.sourceTruth);
  check('pipeline:deployment-truth-visible', freshPipeline.sourceTruth.currentRuntimeIdentityVerified === true && freshPipeline.sourceTruth.currentRuntimeDigest === EXPECTED_RUNTIME, freshPipeline.sourceTruth);
  check('pipeline:independent-runtime-quorum-remains-false', freshPipeline.sourceTruth.independentRuntimeProviderQuorum === false && freshPipeline.sourceTruth.runtimeProviderIndependenceEligible === false, freshPipeline.sourceTruth);

  const deploymentSource = fs.readFileSync(path.join(ROOT, 'lib/security/audit-deployment-identity-evidence.ts'), 'utf8');
  const routeSource = fs.readFileSync(path.join(ROOT, 'lib/server/security-route-modules/audit-report-assembler.ts'), 'utf8');
  const pipelineSource = fs.readFileSync(path.join(ROOT, 'lib/security/audit-customer-report-pipeline.ts'), 'utf8');
  check('static:deployment-module-pinned-p74r5', deploymentSource.includes('32063820844') && deploymentSource.includes(EXPECTED_RUNTIME));
  check('static:route-exposes-deployment-identity', routeSource.includes('deploymentIdentity: authorityEvidence.deploymentIdentity ? {'));
  check('static:central-pass4644-receipt-factory', pipelineSource.includes('createPass4644ProviderEvidenceReceipt'));
  check('static:pro-advanced-authority-isolation', pipelineSource.match(/authorityEvidence: null/g)?.length === 2);

  const result = {
    schemaVersion: 'velmere.p74.audit-deployment-identity-integration.v1',
    status: 'PASS',
    evidenceClass: {
      liveCurrentDeploymentIdentity: 'PASS_BOUNDED',
      independentRuntimeProviderQuorum: 'OPEN',
      vulnerabilityGroundTruth: 0,
      syntheticTimestampControlProductCredit: 0,
      customerFinal: '0/20',
      auditFinalPdf: '0/3',
      rights: '2/203',
      paidValue: '0/10',
      sale: '0/20',
      live: false,
    },
    checkCount: checks.length,
    checks,
    deploymentIdentityDigest: deployment.evidenceDigest,
    authorityEvidenceDigest: authority.evidenceDigest,
    reportRiskScore: report.finalVerdict.riskScore,
  };
  fs.writeFileSync(path.join(OUT, 'P74_AUDIT_DEPLOYMENT_IDENTITY_INTEGRATION_TEST.json'), `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => { console.error(error); process.exit(1); });
