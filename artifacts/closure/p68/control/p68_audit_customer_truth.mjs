import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const FIXED='2026-08-16T19:20:00.000Z';
const RealDate=Date;
class FixedDate extends RealDate { constructor(...args){super(...(args.length?args:[FIXED]));} static now(){return RealDate.parse(FIXED);} }
globalThis.Date=FixedDate;

const { buildPass2578AuditReportAssemblerReport } = await import('../../../../lib/security/audit-report-assembler.ts');
const { projectAuditReportForCustomer } = await import('../../../../lib/security/audit-report-customer-projection.ts');
const { buildAuditAccountCustomerSnapshot } = await import('../../../../lib/security/audit-account-customer-snapshot.ts');
const { renderCustomerSafeAuditPdf } = await import('../../../../lib/security/customer-safe-audit-layout.ts');

const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const outDir=process.env.P68_PDF_OUT || '/mnt/data/velmere_recover/p68_tmp_pdfs';
fs.rmSync(outDir,{recursive:true,force:true}); fs.mkdirSync(outDir,{recursive:true});

const perm={
  summary:{detected:2,notDetected:1,unknown:1,blocked:0,proRequired:5,riskDelta:13,confidenceDelta:2},
  customerRule:'Permission evidence is source-bound.',
  signals:[{category:'source/abi'},{category:'bytecode'}],
  advancedQueue:['Re-run ownership/proxy evidence after source refresh.'],
};
const liq={
  summary:{confirmed:2,partial:1,missing:1,blocked:0,proRequired:4,riskDelta:16,confidenceDelta:-1},
  customerRule:'Liquidity evidence is incomplete and source-bound.',
  signals:[{sourceFamilies:['rpc','indexer']},{sourceFamilies:['explorer']}],
  advancedQueue:['Revalidate LP custody and holder concentration after refresh.'],
};

const report=buildPass2578AuditReportAssemblerReport({
  locale:'en',chain:'ethereum',projectName:'P68 Internal Audit Fixture',contractAddress:'0x1111111111111111111111111111111111111111',
  permissionParser:perm,liquidityHolderRisk:liq,
});
if(report.summary.manualReview!==0) throw new Error(`manual_review_generated:${report.summary.manualReview}`);
if(report.sections.some(s=>s.state==='manual_review')) throw new Error('manual_review_section_generated');
if(report.finalVerdict.advancedState==='manual_review') throw new Error('advanced_state_manual_review');
const positiveManualClaim=/(requires?\s+(?:a\s+)?manual|manually\s+verify|manual-review actions|operator[- ]signoff required|human review required)/i;
const activeText=[report.rule,report.finalVerdict.advancedVerdict,...report.sections.map(s=>s.advancedAction),...report.advancedQueue].join('\n');
if(positiveManualClaim.test(activeText)) throw new Error('positive_manual_or_operator_claim_present');
if(!/automated/i.test(report.finalVerdict.advancedVerdict)) throw new Error('advanced_automated_semantics_missing');

const basic=projectAuditReportForCustomer({report,requestedTier:'basic',deliveredTier:'basic',manualReviewVerified:true});
const pro=projectAuditReportForCustomer({report,requestedTier:'pro',deliveredTier:'pro',manualReviewVerified:true});
const advRequested=projectAuditReportForCustomer({report,requestedTier:'advanced',deliveredTier:'advanced',manualReviewVerified:true});
if(basic.deliveredTier!=='basic'||pro.deliveredTier!=='pro'||advRequested.deliveredTier!=='pro') throw new Error('delivery_tier_lock_mismatch');
if(basic.manualReviewVerified!==false||pro.manualReviewVerified!==false) throw new Error('manual_review_flag_not_ignored');
if(basic.report.proPdfLines.length!==0) throw new Error('basic_pro_lines_leaked');
if(basic.report.topFindings.some(f=>f.proLine!==f.publicLine)) throw new Error('basic_pro_finding_detail_leaked');
if(basic.report.topFindings.some(f=>!/not for sale|nie jest w sprzedaży|steht nicht zum verkauf/i.test(f.advancedAction))) throw new Error('basic_action_lock_missing');
if(pro.report.topFindings.length===0) throw new Error('pro_findings_missing');
if(!pro.report.topFindings.some(f=>f.proLine!==f.publicLine)) throw new Error('pro_evidence_detail_missing');
if(!pro.report.topFindings.some(f=>/restore|resolve|refresh|reproduce|revalidate/i.test(f.advancedAction))) throw new Error('pro_remediation_action_missing');
if(pro.report.advancedQueue.length!==0||advRequested.report.advancedQueue.length!==0) throw new Error('advanced_queue_exposed_while_advanced_not_for_sale');
if(pro.report.visualMergeContract.uiSlots.some(s=>/advanced_(manual_queue|automated_evidence_actions)/.test(s.slot))) throw new Error('advanced_ui_slot_leaked');

function fakePipeline(locale,tier){
  const findingBase=report.topFindings.slice(0,3).map((f,i)=>({
    ...f,
    title:`${tier.toUpperCase()} ${f.title}`,
    publicLine:`Public evidence line ${i+1} for ${tier}`,
    proLine:`Extended evidence detail ${i+1} for ${tier}`,
    advancedAction:`Automated evidence action ${i+1} for ${tier}`,
    sourceFamily:i%2?'nvd':'source-bytecode',
  }));
  const projection={...pro,requestedTier:tier,deliveredTier:tier,report:{...pro.report,locale,topFindings:findingBase},projectionDigest:`sha256:${'1'.repeat(64)}`};
  return {
    requestedTier:tier, deliveredTier:tier,
    releaseState:'INTERNAL_FIXTURE_ONLY',
    pipelineDigest:`sha256:${'2'.repeat(64)}`,
    projection,
    sourceTruth:{providerReceiptCount:tier==='basic'?2:tier==='pro'?5:8,contentBoundProviderReceiptCount:tier==='basic'?1:tier==='pro'?4:7,strictUpstreamRoots:tier==='basic'?['nvd']:tier==='pro'?['nvd','source-bytecode']:['nvd','source-bytecode','rpc']},
    customerReportPreviewLayout:{layoutDigest:`sha256:${'3'.repeat(64)}`},
    customerReport:{
      reportId:`p68-${tier}-${locale}-fixture`, generatedAt:FIXED, locale,
      target:{name:'P68 Internal Audit Fixture',symbol:'P68'},
      summary:{riskScore:tier==='basic'?57:tier==='pro'?58:59,confidenceScore:tier==='basic'?61:tier==='pro'?76:88},
      deliveryPolicy:{visibleTier:tier.toUpperCase()},
      decisionSections:[
        {title:'Risk summary',summary:`Evidence-bound ${tier} risk summary`,actions:[`Review ${tier} evidence gaps`]},
        {title:'Source freshness',summary:`Currentness state for ${tier}`,actions:[`Refresh stale ${tier} sources`]},
      ],
      missingEvidence:tier==='basic'?['ABI confirmation']:tier==='pro'?['independent fork replay']:['holdout verification'],
    },
  };
}

const cases=[];
for(const locale of ['pl','en','de']) for(const tier of ['basic','pro','advanced']){
  const pipeline=fakePipeline(locale,tier);
  const snap=buildAuditAccountCustomerSnapshot({pipeline,accountIdHash:'a'.repeat(64),requestId:`p68-${tier}-${locale}-request`,projectName:'P68 Audit Artifact Fixture',targetLabel:'P68'});
  if(snap.deliveredTier!==tier) throw new Error(`snapshot_tier:${tier}/${locale}`);
  const sectionText=snap.layoutInput.sections.join('\n');
  if(!sectionText.includes('Finding [')) throw new Error(`finding_not_bound:${tier}/${locale}`);
  if(!sectionText.includes('source=')) throw new Error(`finding_source_not_bound:${tier}/${locale}`);
  if(!sectionText.includes('Source-bound provider receipts:')) throw new Error(`source_receipt_count_missing:${tier}/${locale}`);
  if(!sectionText.includes('Content-bound current receipts:')) throw new Error(`current_receipt_count_missing:${tier}/${locale}`);
  if(!sectionText.includes('Independent upstream roots:')) throw new Error(`upstream_roots_missing:${tier}/${locale}`);
  if(tier==='basic' && snap.layoutInput.nextSteps.some(x=>x.startsWith('Finding action -'))) throw new Error(`basic_finding_action_leak:${locale}`);
  if(tier!=='basic' && !snap.layoutInput.nextSteps.some(x=>x.startsWith('Finding action -'))) throw new Error(`paid_finding_action_missing:${tier}/${locale}`);
  const rerender=renderCustomerSafeAuditPdf(snap.layoutInput);
  if(rerender.pdfDigest!==snap.pdfArtifact.pdfDigest||rerender.pdfByteLength!==snap.pdfArtifact.pdfByteLength||rerender.renderPlanDigest!==snap.pdfArtifact.renderPlanDigest||rerender.pageCount!==snap.pdfArtifact.pageCount) throw new Error(`snapshot_download_parity:${tier}/${locale}`);
  if(rerender.unsupportedGlyphReplacements!==0) throw new Error(`unsupported_glyph:${tier}/${locale}`);
  const bytes=Buffer.from(rerender.bytes);
  const file=path.join(outDir,`audit-customer-${tier}-${locale}.pdf`);fs.writeFileSync(file,bytes);
  cases.push({tier,locale,pdfSha256:sha(bytes),pdfBytes:bytes.length,pageCount:rerender.pageCount,layoutDigest:rerender.layoutDigest,renderPlanDigest:rerender.renderPlanDigest,snapshotDigest:snap.snapshotDigest,sections:snap.layoutInput.sections.length,nextSteps:snap.layoutInput.nextSteps.length});
}
for(const locale of ['pl','en','de']){
 const arr=cases.filter(x=>x.locale===locale).map(x=>x.pdfSha256); if(new Set(arr).size!==3) throw new Error(`tier_artifacts_not_distinct:${locale}`);
}
const receipt={
 schemaVersion:'velmere.p68.audit-customer-artifact-truth-fixture.v1', generatedAt:FIXED,
 status:'PASS_P68_AUDIT_CUSTOMER_ARTIFACT_TRUTH_INTERNAL_FIXTURE_NO_PROMOTION', truthClass:'INTERNAL_FIXTURE_ONLY',
 cases, invariants:{assemblerManualReviewGenerated:0,positiveHumanReviewClaims:false,basicEvidenceIsolation:true,proEvidenceAndRemediation:true,advancedCustomerDeliveryStillCappedToPro:true,nineImmutableCustomerSnapshots:true,snapshotDownloadByteParity:true,findingsSeveritySourceBound:true,sourceCurrentnessCountsBound:true,unsupportedGlyphReplacementsZero:true,tierArtifactsDistinctPerLocale:true},
 customerFinalOutputCredit:0,auditFinalCustomerPdfCredit:0,rightsCredit:0,saleCredit:0,live:false,
 truthBoundary:'This receipt proves current-source customer artifact assembly semantics and deterministic internal PDF snapshot parity using synthetic evidence. It does not prove a real customer audit, provider truth, rights clearance, paid value, sale eligibility, LIVE or WORLD_CLASS readiness.'
};
fs.writeFileSync('artifacts/closure/p68/receipts/P68_AUDIT_CUSTOMER_ARTIFACT_TRUTH_FIXTURE.json',JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({status:receipt.status,cases:cases.length,uniquePdfHashes:new Set(cases.map(x=>x.pdfSha256)).size,outDir},null,2));
