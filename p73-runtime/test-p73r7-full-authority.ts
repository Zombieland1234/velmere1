import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildAuditAdjudicatedAuthorityEvidence, verifyAuditAdjudicatedAuthorityEvidence } from '../p73r7-work/source/lib/security/audit-adjudicated-authority-evidence';
import { buildPass2574AuditClaimLedgerReport } from '../p73r7-work/source/lib/security/audit-claim-ledger';
import { buildPass2578AuditReportAssemblerReport } from '../p73r7-work/source/lib/security/audit-report-assembler';
import { evaluateAuditPaidEvidenceReadiness } from '../p73r7-work/source/lib/security/audit-paid-evidence-readiness';
import { getAuditTierContract } from '../p73r7-work/source/lib/security/audit-tier-contract';

const OUT = process.env.P73_RESULT_DIR || path.resolve('p73r7-out');
const ROOT = process.env.P73_SOURCE_ROOT || path.resolve('p73r7-work/source');
fs.mkdirSync(OUT, { recursive: true });
const checks: any[] = [];
function check(id: string, value: unknown, detail?: unknown) {
  assert.ok(value, id);
  checks.push({ id, passed: true, ...(detail === undefined ? {} : { detail }) });
}

async function main() {
  const canonical = '0xca11bde05977b3631167028862be2a173976ca11';
  const expectedOfficial = '0xb76d6e8c82d06fd262ef3799db73d5a724108d4e';
  const neighborMessenger = '0x4200000000000000000000000000000000000007';

  const evidence = await buildAuditAdjudicatedAuthorityEvidence({ chain: 'ancient8', contractAddress: canonical });
  check('authority:confirmed', evidence.state === 'confirmed', evidence);
  check('authority:self-verifies', verifyAuditAdjudicatedAuthorityEvidence(evidence));
  check('authority:chain-id', evidence.target.chainId === '888888888', evidence.target);
  check('authority:canonical-reference', evidence.target.canonicalReferenceId === 'p70-multicall3-canonical-reference', evidence.target);
  check('authority:official-multicall3-row-bound', evidence.documentedAlternateAddress === expectedOfficial, evidence.documentedAlternateAddress);
  check('authority:not-neighbor-contract', evidence.documentedAlternateAddress !== neighborMessenger, evidence.documentedAlternateAddress);
  check('authority:two-receipts', evidence.receipts.length === 2, evidence.receipts);
  check('authority:two-independent-roots', new Set(evidence.receipts.map((x) => x.upstreamRoot)).size === 2, evidence.authorityRoots);

  const docs = evidence.receipts.find((x) => x.authorityClass === 'chain_official_docs');
  const maintainer = evidence.receipts.find((x) => x.authorityClass === 'project_maintainer');
  check('authority:docs-address-assertion', docs?.assertions.includes(`documented_address:${expectedOfficial}`), docs);
  check('authority:pinned-maintainer-commit', maintainer?.assertions.includes('source_commit:b667d67ecfa5361a81e8f110234ce242613b0012'), maintainer);
  check('authority:risk-floor-90', evidence.riskFloor === 90 && evidence.severity === 'critical', { riskFloor: evidence.riskFloor, severity: evidence.severity });
  check('authority:runtime-explicitly-unverified', evidence.blockers.includes('current_runtime_bytecode_quorum_unavailable'), evidence.blockers);
  check('authority:tamper-fails', verifyAuditAdjudicatedAuthorityEvidence({ ...evidence, riskFloor: 10 }) === false);

  const nonApplicable = await buildAuditAdjudicatedAuthorityEvidence({ chain: 'ethereum', contractAddress: canonical });
  check('authority:unsupported-chain-fails-closed', nonApplicable.state === 'not_applicable' && nonApplicable.riskFloor === null, nonApplicable);

  const claimLedger = buildPass2574AuditClaimLedgerReport({
    locale: 'en',
    chain: 'ancient8',
    contractAddress: canonical,
    reviewLevel: 'basic_review',
    authorityEvidence: evidence,
  });
  const adverse = claimLedger.claims.filter((x) => x.adverseKind === 'deployment_identity');
  check('claim:exactly-one-adverse', adverse.length === 1, adverse);
  check('claim:confirmed-fact', adverse[0]?.grade === 'confirmed' && adverse[0]?.canShowAsFact === true, adverse[0]);
  check('claim:risk-floor-bound', adverse[0]?.adverseRiskFloor === 90, adverse[0]);
  check('claim:evidence-refs-two', adverse[0]?.evidenceRefs?.length === 2, adverse[0]?.evidenceRefs);

  const report = buildPass2578AuditReportAssemblerReport({
    locale: 'en',
    chain: 'ancient8',
    contractAddress: canonical,
    reviewLevel: 'basic_review',
    claimLedger,
  });
  check('report:risk-score-90', report.finalVerdict.riskScore === 90, report.finalVerdict);
  check('report:critical-deployment-finding', report.topFindings[0]?.severity === 'critical' && report.topFindings[0]?.title.includes('Deployment identity mismatch'), report.topFindings[0]);
  check('report:no-exploitability-overclaim', !JSON.stringify(report).toLowerCase().includes('exploitable vulnerability'), report.topFindings);

  const basic = evaluateAuditPaidEvidenceReadiness({ lanes: [], tier: 'basic', tierContract: getAuditTierContract('basic'), evidenceRows: Math.max(2, report.summary.totalEvidence), authorityEvidence: evidence });
  const pro = evaluateAuditPaidEvidenceReadiness({ lanes: [], tier: 'pro', tierContract: getAuditTierContract('pro'), evidenceRows: Math.max(6, report.summary.totalEvidence), authorityEvidence: evidence });
  const advanced = evaluateAuditPaidEvidenceReadiness({ lanes: [], tier: 'advanced', tierContract: getAuditTierContract('advanced'), evidenceRows: Math.max(10, report.summary.totalEvidence), authorityEvidence: evidence });
  check('readiness:basic-authority-supplement', basic.met === true && basic.verifiedAuthorityReceipts === 2, basic);
  check('readiness:pro-still-blocked', pro.met === false && pro.verifiedAuthorityReceipts === 0, pro);
  check('readiness:advanced-still-blocked', advanced.met === false && advanced.verifiedAuthorityReceipts === 0, advanced);

  const provider = fs.readFileSync(path.join(ROOT, 'lib/security/audit-provider-runtime-client.ts'), 'utf8');
  check('chain-map:ancient8', provider.includes('ancient8: "888888888"'));
  const route = fs.readFileSync(path.join(ROOT, 'lib/server/security-route-modules/audit-report-assembler.ts'), 'utf8');
  check('route:source-url-binding', route.includes('searchParams.get("docsUrl")') && route.includes('searchParams.get("githubUrl")'));
  check('route:authority-builder', route.includes('buildAuditAdjudicatedAuthorityEvidence'));

  const result = {
    schemaVersion: 'velmere.p73r7.full-authority-integration.v1',
    status: 'PASS',
    checkCount: checks.length,
    checks,
    evidenceDigest: evidence.evidenceDigest,
    documentedAlternateAddress: evidence.documentedAlternateAddress,
    reportRiskScore: report.finalVerdict.riskScore,
    basicReadiness: basic,
    proReadiness: pro,
    advancedReadiness: advanced,
  };
  fs.writeFileSync(path.join(OUT, 'P73R7_FULL_AUTHORITY_INTEGRATION_TEST.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => { console.error(error); process.exit(1); });
