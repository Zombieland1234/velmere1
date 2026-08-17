import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root=process.env.P71_SOURCE_ROOT||process.env.P70_SOURCE_ROOT||process.cwd();
const out=process.env.P71_RESULT_DIR||path.resolve(root,'../p71-out');
fs.mkdirSync(out,{recursive:true});
const u=p=>pathToFileURL(path.join(root,p)).href;
const {buildPass2578AuditReportAssemblerReport}=await import(u('lib/security/audit-report-assembler.ts'));
const {projectAuditReportForCustomer}=await import(u('lib/security/audit-report-customer-projection.ts'));
const {buildAuditAccountCustomerSnapshot}=await import(u('lib/security/audit-account-customer-snapshot.ts'));
const {buildCustomerSafeAuditPdfPlan,renderCustomerSafeAuditPdf}=await import(u('lib/security/customer-safe-audit-layout.ts'));

const address='0xca11bde05977b3631167028862be2a173976ca11';
const locales=['pl','en','de'];
const tiers=[['basic','basic'],['pro','pro'],['advanced','pro']];
const cases=[];
for(const locale of locales){
  const perm={summary:{detected:1,notDetected:0,unknown:2,blocked:1,proRequired:1,riskDelta:0,confidenceDelta:-3},customerRule:'Source-bound permission evidence incomplete.',signals:[{category:'source'}],advancedQueue:[]};
  const liq={summary:{confirmed:1,partial:1,missing:2,blocked:0,proRequired:1,riskDelta:0,confidenceDelta:-4},customerRule:'Source-bound liquidity evidence incomplete.',signals:[{sourceFamilies:['rpc']}],advancedQueue:[]};
  const report=buildPass2578AuditReportAssemblerReport({locale,chain:'ethereum',projectName:'Multicall3',contractAddress:address,permissionParser:perm,liquidityHolderRisk:liq});
  if(report.topFindings.length!==0) throw new Error(`fake_top_finding:${locale}:${report.topFindings.length}`);
  if(!Array.isArray(report.evidenceGaps)||report.evidenceGaps.length===0) throw new Error(`missing_evidence_gaps:${locale}`);
  if(report.summary.verifiedFindings!==0||report.summary.evidenceGaps!==report.evidenceGaps.length) throw new Error(`summary_truth_mismatch:${locale}`);
  for(const gap of report.evidenceGaps){
    if(gap.truthClass!=='evidence_gap') throw new Error(`gap_truth_class:${locale}`);
    if(Object.prototype.hasOwnProperty.call(gap,'severity')) throw new Error(`gap_has_vulnerability_severity:${locale}:${gap.id}`);
    if(!['low','medium','high','blocked'].includes(gap.priority)) throw new Error(`gap_priority:${locale}:${gap.id}`);
  }
  for(const [requestedTier,deliveredTier] of tiers){
    const projection=projectAuditReportForCustomer({report,requestedTier,deliveredTier,manualReviewVerified:false});
    if(projection.report.topFindings.length!==0) throw new Error(`projected_fake_finding:${locale}:${requestedTier}`);
    if(projection.report.evidenceGaps.some(g=>g.truthClass!=='evidence_gap')) throw new Error(`projected_gap_truth:${locale}:${requestedTier}`);
    const pipeline={requestedTier,deliveredTier:projection.deliveredTier,releaseState:'INTERNAL_TRUTH_REGRESSION_ONLY',pipelineDigest:`sha256:${'2'.repeat(64)}`,projection,sourceTruth:{providerReceiptCount:0,contentBoundProviderReceiptCount:0,strictUpstreamRoots:[]},customerReportPreviewLayout:{layoutDigest:`sha256:${'3'.repeat(64)}`},customerReport:{reportId:`p71-${locale}-${requestedTier}`,generatedAt:new Date().toISOString(),locale,target:{name:'Multicall3',symbol:'MC3'},summary:{riskScore:null,confidenceScore:0},deliveryPolicy:{visibleTier:String(projection.deliveredTier).toUpperCase()},decisionSections:[{title:'Truth boundary',summary:'Evidence readiness is not a vulnerability finding.',actions:['Resolve missing evidence before adverse claims.']}],missingEvidence:['Independent vulnerability ground truth']}};
    const snap=buildAuditAccountCustomerSnapshot({pipeline,accountIdHash:'a'.repeat(64),requestId:`p71-${locale}-${requestedTier}`,projectName:'Multicall3',targetLabel:address});
    const sectionText=snap.layoutInput.sections.join('\n');
    if(!/Evidence gap \[priority=/i.test(sectionText)) throw new Error(`gap_not_customer_visible:${locale}:${requestedTier}`);
    if(/(^|\n)Finding \[/i.test(sectionText)) throw new Error(`legacy_fake_finding_line:${locale}:${requestedTier}`);
    if(/Verified finding \[/i.test(sectionText)) throw new Error(`unverified_verified_finding:${locale}:${requestedTier}`);
    const planned=buildCustomerSafeAuditPdfPlan(snap.layoutInput);
    const planText=planned.plan.pages.flatMap(p=>p.rows).map(r=>String(r.text)).join('\n');
    if(!/Evidence gap \[priority=/i.test(planText)) throw new Error(`gap_not_pdf_plan:${locale}:${requestedTier}`);
    if(/Finding \[/i.test(planText)) throw new Error(`fake_finding_pdf_plan:${locale}:${requestedTier}`);
    const rerender=renderCustomerSafeAuditPdf(snap.layoutInput);
    if(rerender.pdfDigest!==snap.pdfArtifact.pdfDigest||rerender.pdfByteLength!==snap.pdfArtifact.pdfByteLength||rerender.renderPlanDigest!==planned.plan.planDigest) throw new Error(`pdf_parity:${locale}:${requestedTier}`);
    cases.push({locale,requestedTier,deliveredTier:projection.deliveredTier,evidenceGaps:projection.report.evidenceGaps.length,verifiedFindings:projection.report.topFindings.length,pdfDigest:rerender.pdfDigest,pdfBytes:rerender.pdfByteLength,pageCount:rerender.pageCount,renderPlanDigest:rerender.renderPlanDigest});
  }
}
if(cases.length!==9) throw new Error(`case_count:${cases.length}`);
const receipt={schemaVersion:'velmere.p71.audit-finding-truth-runtime.v1',status:'PASS_P71_AUDIT_FINDING_TRUTH_9_OF_9_NO_PROMOTION',cases,caseCount:cases.length,legacyFakeFindingLines:0,verifiedAdverseFindings:0,evidenceGapCases:cases.filter(c=>c.evidenceGaps>0).length,customerFinalOutputCredit:0,auditFinalCustomerPdfCredit:0,rightsCredit:0,paidValueCredit:0,saleCredit:0,live:false,truthBoundary:'Nine bounded PL/EN/DE tier-context executions prove that current evidence readiness gaps remain evidence gaps through customer projection, account snapshot, PDF safety/render planning and deterministic rerender. No vulnerability finding, final-customer, rights, paid-value, sale, LIVE or WORLD_CLASS credit is granted.'};
fs.writeFileSync(path.join(out,'P71_AUDIT_FINDING_TRUTH_RUNTIME.json'),JSON.stringify(receipt,null,2)+'\n','utf8');
console.log(JSON.stringify({status:receipt.status,cases:9,evidenceGapCases:receipt.evidenceGapCases,fakeFindingLines:0,finalOutputs:'0/20',auditFinalPdfs:'0/3'},null,2));
