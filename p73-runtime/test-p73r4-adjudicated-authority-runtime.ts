import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildAuditAdjudicatedAuthorityEvidence, verifyAuditAdjudicatedAuthorityEvidence } from '../p73r4-work/source/lib/security/audit-adjudicated-authority-evidence';
import { buildPass2574AuditClaimLedgerReport } from '../p73r4-work/source/lib/security/audit-claim-ledger';
import { buildPass2578AuditReportAssemblerReport } from '../p73r4-work/source/lib/security/audit-report-assembler';
import { evaluateAuditPaidEvidenceReadiness } from '../p73r4-work/source/lib/security/audit-paid-evidence-readiness';
import { getAuditTierContract } from '../p73r4-work/source/lib/security/audit-tier-contract';

const OUT = process.env.P73_RESULT_DIR || path.resolve('p73r4-out');
fs.mkdirSync(OUT,{recursive:true});
const checks:any[]=[];
function check(id:string,value:unknown,detail?:unknown){assert.ok(value,id);checks.push({id,passed:true,...(detail===undefined?{}:{detail})});}

async function main(){
  const evidence=await buildAuditAdjudicatedAuthorityEvidence({
    chain:'ancient8',
    contractAddress:'0xca11bde05977b3631167028862be2a173976ca11',
  });
  check('authority:confirmed',evidence.state==='confirmed',evidence);
  check('authority:self-verifies',verifyAuditAdjudicatedAuthorityEvidence(evidence));
  check('authority:chain-id',evidence.target.chainId==='888888888',evidence.target);
  check('authority:canonical-reference',evidence.target.canonicalReferenceId==='p70-multicall3-canonical-reference',evidence.target);
  check('authority:alternate-address',evidence.documentedAlternateAddress==='0xb76d6e8c82d06fd262ef3799db73d5a724108d4e',evidence.documentedAlternateAddress);
  check('authority:two-receipts',evidence.receipts.length===2,evidence.receipts.map((x)=>[x.authorityClass,x.upstreamRoot,x.bodyDigest]));
  check('authority:two-independent-roots',new Set(evidence.receipts.map((x)=>x.upstreamRoot)).size===2,evidence.authorityRoots);
  check('authority:risk-floor-90',evidence.riskFloor===90 && evidence.severity==='critical',{riskFloor:evidence.riskFloor,severity:evidence.severity});
  check('authority:runtime-explicitly-unverified',evidence.blockers.includes('current_runtime_bytecode_quorum_unavailable'),evidence.blockers);

  const tampered={...evidence,riskFloor:10};
  check('authority:tamper-fails',verifyAuditAdjudicatedAuthorityEvidence(tampered)===false);

  const nonApplicable=await buildAuditAdjudicatedAuthorityEvidence({chain:'ethereum',contractAddress:'0xca11bde05977b3631167028862be2a173976ca11'});
  check('authority:unsupported-chain-fails-closed',nonApplicable.state==='not_applicable' && nonApplicable.riskFloor===null,nonApplicable);

  const claimLedger=buildPass2574AuditClaimLedgerReport({
    locale:'en',chain:'ancient8',contractAddress:'0xca11bde05977b3631167028862be2a173976ca11',reviewLevel:'basic_review',authorityEvidence:evidence,
  });
  const adverse=claimLedger.claims.filter((x)=>x.adverseKind==='deployment_identity');
  check('claim:exactly-one-adverse',adverse.length===1,adverse);
  check('claim:confirmed-fact',adverse[0]?.grade==='confirmed' && adverse[0]?.canShowAsFact===true,adverse[0]);
  check('claim:risk-floor-bound',adverse[0]?.adverseRiskFloor===90,adverse[0]);
  check('claim:evidence-refs-two',adverse[0]?.evidenceRefs?.length===2,adverse[0]?.evidenceRefs);

  const report=buildPass2578AuditReportAssemblerReport({
    locale:'en',chain:'ancient8',contractAddress:'0xca11bde05977b3631167028862be2a173976ca11',reviewLevel:'basic_review',claimLedger,
  });
  check('report:risk-score-from-confirmed-adverse',report.finalVerdict.riskScore===90,report.finalVerdict);
  check('report:critical-deployment-finding',report.topFindings[0]?.severity==='critical' && report.topFindings[0]?.title.includes('Deployment identity mismatch'),report.topFindings[0]);
  check('report:no-exploitability-claim',!JSON.stringify(report).toLowerCase().includes('exploitable vulnerability'),report.topFindings);

  const basic=evaluateAuditPaidEvidenceReadiness({lanes:[],tier:'basic',tierContract:getAuditTierContract('basic'),evidenceRows:Math.max(2,report.summary.totalEvidence),authorityEvidence:evidence});
  const pro=evaluateAuditPaidEvidenceReadiness({lanes:[],tier:'pro',tierContract:getAuditTierContract('pro'),evidenceRows:Math.max(6,report.summary.totalEvidence),authorityEvidence:evidence});
  const advanced=evaluateAuditPaidEvidenceReadiness({lanes:[],tier:'advanced',tierContract:getAuditTierContract('advanced'),evidenceRows:Math.max(10,report.summary.totalEvidence),authorityEvidence:evidence});
  check('readiness:basic-authority-supplement-passes',basic.met===true && basic.verifiedAuthorityReceipts===2,basic);
  check('readiness:pro-not-unlocked',pro.met===false && pro.verifiedAuthorityReceipts===0,pro);
  check('readiness:advanced-not-unlocked',advanced.met===false && advanced.verifiedAuthorityReceipts===0,advanced);

  const providerSource=fs.readFileSync(path.resolve('p73r4-work/source/lib/security/audit-provider-runtime-client.ts'),'utf8');
  check('chain-map:ancient8-not-ethereum-fallback',providerSource.includes('ancient8: "888888888"'));
  const routeSource=fs.readFileSync(path.resolve('p73r4-work/source/lib/server/security-route-modules/audit-report-assembler.ts'),'utf8');
  check('route:source-url-binding',routeSource.includes('searchParams.get("docsUrl")') && routeSource.includes('searchParams.get("githubUrl")'));
  check('route:authority-builder-bound',routeSource.includes('buildAuditAdjudicatedAuthorityEvidence'));

  const result={schemaVersion:'velmere.p73r4.adjudicated-authority-runtime-test.v1',status:'PASS',checkCount:checks.length,checks,authorityEvidenceDigest:evidence.evidenceDigest,reportRiskScore:report.finalVerdict.riskScore,basicReadiness:basic,proReadiness:pro,advancedReadiness:advanced};
  fs.writeFileSync(path.join(OUT,'P73R4_ADJUDICATED_AUTHORITY_RUNTIME_TEST.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result,null,2));
}
main().catch((error)=>{console.error(error);process.exit(1)});
