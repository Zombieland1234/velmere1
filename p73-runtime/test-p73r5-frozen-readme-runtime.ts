import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildAuditAdjudicatedAuthorityEvidence, verifyAuditAdjudicatedAuthorityEvidence } from '../p73r5-work/source/lib/security/audit-adjudicated-authority-evidence';
import { buildPass2574AuditClaimLedgerReport } from '../p73r5-work/source/lib/security/audit-claim-ledger';
import { buildPass2578AuditReportAssemblerReport } from '../p73r5-work/source/lib/security/audit-report-assembler';
import { evaluateAuditPaidEvidenceReadiness } from '../p73r5-work/source/lib/security/audit-paid-evidence-readiness';
import { getAuditTierContract } from '../p73r5-work/source/lib/security/audit-tier-contract';

const OUT=process.env.P73_RESULT_DIR || path.resolve('p73r5-out');fs.mkdirSync(OUT,{recursive:true});
const checks:any[]=[];function check(id:string,v:unknown,d?:unknown){assert.ok(v,id);checks.push({id,passed:true,...(d===undefined?{}:{detail:d})});}
const TARGET='0xca11bde05977b3631167028862be2a173976ca11';
const FROZEN_COMMIT='b667d67ecfa5361a81e8f110234ce242613b0012';
const FROZEN_BODY_DIGEST='sha256:fd8a92998d33ecaf49eed4fa3b856a741c6a53995b4994525707c21e299a43b9e';

async function main(){
  const evidence=await buildAuditAdjudicatedAuthorityEvidence({chain:'ancient8',contractAddress:TARGET,maintainerUrl:'https://example.com/user-controlled-authority'});
  check('authority:confirmed',evidence.state==='confirmed',evidence);
  check('authority:self-verifies',verifyAuditAdjudicatedAuthorityEvidence(evidence));
  check('authority:chain-id',evidence.target.chainId==='888888888',evidence.target);
  check('authority:alternate-address',evidence.documentedAlternateAddress==='0xb76d6e8c82d06fd262ef3799db73d5a724108d4e',evidence.documentedAlternateAddress);
  check('authority:two-independent-roots',new Set(evidence.receipts.map(x=>x.upstreamRoot)).size===2,evidence.authorityRoots);
  const project=evidence.receipts.find(x=>x.authorityClass==='project_maintainer');
  const chain=evidence.receipts.find(x=>x.authorityClass==='chain_official_docs');
  check('authority:project-receipt-exists',Boolean(project),project);
  check('authority:chain-receipt-exists',Boolean(chain),chain);
  check('authority:frozen-project-root',project?.upstreamRoot==='raw.githubusercontent.com',project);
  check('authority:frozen-project-provider-id',project?.providerId===`repo-commit:mds1/multicall3@${FROZEN_COMMIT}`,project);
  check('authority:frozen-readme-body-digest',project?.bodyDigest===FROZEN_BODY_DIGEST,project);
  check('authority:user-cannot-replace-project-root',project?.requestUrlDigest!==undefined && !JSON.stringify(project).includes('example.com'),project);
  check('authority:risk-floor-90',evidence.riskFloor===90 && evidence.severity==='critical',evidence);
  check('authority:runtime-explicitly-unverified',evidence.blockers.includes('current_runtime_bytecode_quorum_unavailable'),evidence.blockers);

  const tampered={...evidence,authorityRoots:['docs.ancient8.gg']};
  check('authority:tamper-fails',verifyAuditAdjudicatedAuthorityEvidence(tampered)===false);
  const nonApplicable=await buildAuditAdjudicatedAuthorityEvidence({chain:'ethereum',contractAddress:TARGET});
  check('authority:ethereum-does-not-inherit-ancient8-adverse',nonApplicable.state==='not_applicable' && nonApplicable.riskFloor===null,nonApplicable);

  const claimLedger=buildPass2574AuditClaimLedgerReport({locale:'en',chain:'ancient8',contractAddress:TARGET,reviewLevel:'basic_review',authorityEvidence:evidence});
  const adverse=claimLedger.claims.filter(x=>x.adverseKind==='deployment_identity');
  check('claim:exactly-one-confirmed-deployment-identity',adverse.length===1 && adverse[0]?.grade==='confirmed' && adverse[0]?.canShowAsFact===true,adverse);
  check('claim:evidence-refs-two',adverse[0]?.evidenceRefs?.length===2,adverse[0]);
  const report=buildPass2578AuditReportAssemblerReport({locale:'en',chain:'ancient8',contractAddress:TARGET,reviewLevel:'basic_review',claimLedger});
  check('report:risk-score-90',report.finalVerdict.riskScore===90,report.finalVerdict);
  check('report:critical-deployment-finding',report.topFindings[0]?.severity==='critical' && report.topFindings[0]?.title.includes('Deployment identity mismatch'),report.topFindings[0]);
  check('report:no-exploitability-promotion',!JSON.stringify(report).toLowerCase().includes('exploitable vulnerability'),report.topFindings);

  const basic=evaluateAuditPaidEvidenceReadiness({lanes:[],tier:'basic',tierContract:getAuditTierContract('basic'),evidenceRows:Math.max(2,report.summary.totalEvidence),authorityEvidence:evidence});
  const pro=evaluateAuditPaidEvidenceReadiness({lanes:[],tier:'pro',tierContract:getAuditTierContract('pro'),evidenceRows:Math.max(6,report.summary.totalEvidence),authorityEvidence:evidence});
  const advanced=evaluateAuditPaidEvidenceReadiness({lanes:[],tier:'advanced',tierContract:getAuditTierContract('advanced'),evidenceRows:Math.max(10,report.summary.totalEvidence),authorityEvidence:evidence});
  check('readiness:basic-passes-with-two-authorities',basic.met===true && basic.verifiedAuthorityReceipts===2,basic);
  check('readiness:pro-still-blocked',pro.met===false && pro.verifiedAuthorityReceipts===0,pro);
  check('readiness:advanced-still-blocked',advanced.met===false && advanced.verifiedAuthorityReceipts===0,advanced);

  const source=fs.readFileSync(path.resolve('p73r5-work/source/lib/security/audit-adjudicated-authority-evidence.ts'),'utf8');
  check('source:no-runtime-api-comment',!source.includes('api.github.com/repos/mds1/multicall3/issues/comments/2495504312'));
  check('source:frozen-commit-bound',source.includes(`raw.githubusercontent.com/mds1/multicall3/${FROZEN_COMMIT}/README.md`));
  check('source:explicit-runtime-unverified-boundary',source.includes('current_runtime_bytecode_quorum_unavailable'));

  const result={schemaVersion:'velmere.p73r5.frozen-readme-authority-runtime-test.v1',status:'PASS',checkCount:checks.length,checks,authorityEvidenceDigest:evidence.evidenceDigest,projectReceiptDigest:project?.receiptDigest,projectBodyDigest:project?.bodyDigest,reportRiskScore:report.finalVerdict.riskScore,basicReadiness:basic,proReadiness:pro,advancedReadiness:advanced};
  fs.writeFileSync(path.join(OUT,'P73R5_FROZEN_README_AUTHORITY_RUNTIME_TEST.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
}
main().catch(error=>{console.error(error);process.exit(1)});
