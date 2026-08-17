import fs from 'node:fs';
import path from 'node:path';
import { buildPass2570AuditSourceQuorumReport } from '../p74-basic-work/source/lib/security/audit-source-quorum-runtime';
import { buildPass2571AuditProviderIntelligenceReport } from '../p74-basic-work/source/lib/security/audit-provider-intelligence';
import { buildPass2572AuditProviderRuntimeReport } from '../p74-basic-work/source/lib/security/audit-provider-runtime-client';
import { buildPass2573AuditRuntimeConfidenceReport } from '../p74-basic-work/source/lib/security/audit-runtime-confidence';
import { buildPass2574AuditClaimLedgerReport } from '../p74-basic-work/source/lib/security/audit-claim-ledger';
import { buildPass2575AuditSourceFreshnessReport } from '../p74-basic-work/source/lib/security/audit-source-freshness';
import { buildPass2576AuditPermissionParserReport } from '../p74-basic-work/source/lib/security/audit-permission-parser';
import { buildPass2577AuditLiquidityHolderLockRiskReport } from '../p74-basic-work/source/lib/security/audit-liquidity-holder-lock-risk';
import { buildPass2578AuditReportAssemblerReport } from '../p74-basic-work/source/lib/security/audit-report-assembler';
import { buildPass4820AuditCustomerReportPipeline } from '../p74-basic-work/source/lib/security/audit-customer-report-pipeline';
import { evaluateAuditPaidEvidenceReadiness } from '../p74-basic-work/source/lib/security/audit-paid-evidence-readiness';
import { getAuditTierContract } from '../p74-basic-work/source/lib/security/audit-tier-contract';
import { buildAuditAdjudicatedAuthorityEvidence, verifyAuditAdjudicatedAuthorityEvidence } from '../p74-basic-work/source/lib/security/audit-adjudicated-authority-evidence';

const OUT=process.env.P74_RESULT_DIR||path.resolve('p74-basic-out');
fs.mkdirSync(OUT,{recursive:true});
const input={locale:'en',chain:'ancient8',contractAddress:'0xca11bde05977b3631167028862be2a173976ca11',reviewLevel:'basic_review' as const,docsUrl:'https://docs.ancient8.gg/using-ancient8-chain/contracts',githubUrl:'https://github.com/mds1/multicall3',website:'https://ancient8.gg'};
const clean=(v:any)=>JSON.parse(JSON.stringify(v));
const serialError=(e:unknown)=>e instanceof Error?`${e.name}: ${e.message}`:String(e);
function summarizePipeline(p:any){return p?{releaseState:p.releaseState,deliveredTier:p.deliveredTier,pipelineDigest:p.pipelineDigest,sourceTruth:p.sourceTruth,deliveryPolicy:p.customerReport?.deliveryPolicy??null,reportState:p.customerReport?.state??p.customerReport?.status??null,summary:p.customerReport?.summary??null,topFindings:(p.customerReport?.topFindings??[]).slice(0,8),missingCriticalEvidence:p.customerReport?.missingCriticalEvidence??p.missingCriticalEvidence??null}:null;}
async function pipelineVariant(args:{paymentVerified:boolean,evidenceLedgerVerified:boolean}){try{return{ok:true,value:summarizePipeline(buildPass4820AuditCustomerReportPipeline({report:argsContext.report,providerRuntime:argsContext.providerRuntime,requestedTier:'basic',paymentVerified:args.paymentVerified,evidenceLedgerVerified:args.evidenceLedgerVerified,manualReviewVerified:false,monitoringConfigured:false,authorityEvidence:argsContext.authorityEvidence} as any))};}catch(e){return{ok:false,error:serialError(e)};}}
const argsContext:any={};
async function main(){
  const authorityEvidence=await buildAuditAdjudicatedAuthorityEvidence({chain:input.chain,contractAddress:input.contractAddress});
  const sourceQuorum=buildPass2570AuditSourceQuorumReport(input);
  const providerIntelligence=buildPass2571AuditProviderIntelligenceReport({...input,sourceQuorum});
  const providerRuntime=await buildPass2572AuditProviderRuntimeReport({...input,providerIntelligence});
  const runtimeConfidence=buildPass2573AuditRuntimeConfidenceReport({...input,sourceQuorum,providerRuntime});
  const claimLedger=buildPass2574AuditClaimLedgerReport({...input,sourceQuorum,providerRuntime,runtimeConfidence,authorityEvidence} as any);
  const sourceFreshness=buildPass2575AuditSourceFreshnessReport({...input,providerRuntime,claimLedger});
  const permissionParser=buildPass2576AuditPermissionParserReport({...input,providerRuntime,claimLedger,sourceFreshness});
  const liquidityHolderRisk=buildPass2577AuditLiquidityHolderLockRiskReport({...input,providerRuntime,claimLedger,sourceFreshness,permissionParser});
  const report=buildPass2578AuditReportAssemblerReport({...input,providerRuntime,runtimeConfidence,claimLedger,sourceFreshness,permissionParser,liquidityHolderRisk,authorityEvidence} as any);
  const tier=getAuditTierContract('basic');
  const readiness=evaluateAuditPaidEvidenceReadiness({lanes:providerRuntime.lanes,tier:'basic',tierContract:tier,evidenceRows:report.summary.totalEvidence,authorityEvidence} as any);
  argsContext.report=report;argsContext.providerRuntime=providerRuntime;argsContext.authorityEvidence=authorityEvidence;
  const variants={
    freeRealLedgerFalse:await pipelineVariant({paymentVerified:false,evidenceLedgerVerified:false}),
    freeLedgerTrueIsolation:await pipelineVariant({paymentVerified:false,evidenceLedgerVerified:true}),
    paidTrueLedgerFalseControl:await pipelineVariant({paymentVerified:true,evidenceLedgerVerified:false}),
    paidTrueLedgerTrueIsolation:await pipelineVariant({paymentVerified:true,evidenceLedgerVerified:true}),
  };
  const adverse=claimLedger.claims.filter((x:any)=>x.adverseKind==='deployment_identity'||(x.grade==='confirmed'&&x.canShowAsFact===true)).map((x:any)=>({id:x.id,grade:x.grade,adverseKind:x.adverseKind,category:x.category,claim:x.claim,customerLine:x.customerLine,canShowAsFact:x.canShowAsFact,adverseRiskFloor:x.adverseRiskFloor,evidenceRefs:x.evidenceRefs}));
  const result={schemaVersion:'velmere.p74.p73r7-basic-customer-pipeline-diagnostic.v1',status:'PASS_DIAGNOSTIC_ZERO_CREDIT',generatedAt:new Date().toISOString(),parent:{revision:'P73R7',fileCount:1598,payloadBytes:21014913,pathSetSha256:'9cb47f15e73ec678e32fe214b8e2947a4bfbaa624d8fb5101650296700d3dd25',aggregateSha256:'b25efb6aeb017989e96ed1c4bc1fee02a4f181fc5103e9396091d23333a7c92b'},target:input,authority:{state:authorityEvidence.state,selfVerifies:verifyAuditAdjudicatedAuthorityEvidence(authorityEvidence),documentedAlternateAddress:authorityEvidence.documentedAlternateAddress,riskFloor:authorityEvidence.riskFloor,severity:authorityEvidence.severity,blockers:authorityEvidence.blockers,receipts:authorityEvidence.receipts.map(x=>({authorityClass:x.authorityClass,providerId:x.providerId,upstreamRoot:x.upstreamRoot,targetBound:x.targetBound,statusCode:x.statusCode,bodyDigest:x.bodyDigest,assertions:x.assertions}))},providerRuntime:{summary:providerRuntime.summary,lanes:providerRuntime.lanes.map((x:any)=>({id:x.id,state:x.state,provider:x.provider,providerFamily:x.providerFamily,upstreamRoot:x.lineage?.upstreamRoot,missing:x.missing,receipt:x.receipt?{statusCode:x.receipt.statusCode,bodyBytes:x.receipt.bodyBytes,bodyDigest:x.receipt.bodyDigest}:null}))},runtimeConfidence:runtimeConfidence.overall,claimLedger:{summary:claimLedger.summary,adverse},report:{finalVerdict:report.finalVerdict,summary:report.summary,basicState:(report as any).basicState??null,topFindings:report.topFindings,missingCriticalEvidence:(report as any).missingCriticalEvidence??null},basicReadiness:readiness,variants,diagnosticInterpretation:{paymentAffectsFreeBasic:JSON.stringify(variants.freeRealLedgerFalse)!==JSON.stringify(variants.paidTrueLedgerFalseControl)||JSON.stringify(variants.freeLedgerTrueIsolation)!==JSON.stringify(variants.paidTrueLedgerTrueIsolation),ledgerIsolationChangesOutcome:JSON.stringify(variants.freeRealLedgerFalse)!==JSON.stringify(variants.freeLedgerTrueIsolation)},credit:{productChange:0,currentRuntimeBytecode:0,customerFinalOutput:0,auditFinalPdf:0,rights:0,paidValue:0,sale:0,live:false},truthBoundary:'Exact-P73R7 diagnostic only. evidenceLedgerVerified=true branches are simulated solely to isolate downstream blockers. paymentVerified=true is a negative control because Audit Basic is free. Authority evidence is real live P73R7 evidence. No customer FINAL/PDF/rights/value/sale/LIVE credit may be inferred.'};
  fs.writeFileSync(path.join(OUT,'P74_P73R7_BASIC_CUSTOMER_PIPELINE_DIAGNOSTIC.json'),JSON.stringify(clean(result),null,2)+'\n');
  console.log(JSON.stringify({status:result.status,authority:result.authority,basicReadiness:result.basicReadiness,report:result.report,variants:result.variants,interpretation:result.diagnosticInterpretation,credit:result.credit},null,2));
}
main().catch(e=>{const result={schemaVersion:'velmere.p74.p73r7-basic-customer-pipeline-diagnostic.v1',status:'FAIL_CLOSED',error:serialError(e),credit:{productChange:0,currentRuntimeBytecode:0,customerFinalOutput:0,auditFinalPdf:0,rights:0,paidValue:0,sale:0,live:false}};fs.writeFileSync(path.join(OUT,'P74_P73R7_BASIC_CUSTOMER_PIPELINE_DIAGNOSTIC.json'),JSON.stringify(result,null,2)+'\n');console.error(JSON.stringify(result,null,2));process.exit(1);});
