import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

const FIXED='2026-08-16T19:20:00.000Z';
const RealDate=Date; class FixedDate extends RealDate { constructor(...a){super(...(a.length?a:[FIXED]));} static now(){return RealDate.parse(FIXED);} } globalThis.Date=FixedDate;
const src=process.cwd(); const u=(p)=>pathToFileURL(path.join(src,p)).href;
const {buildPass2578AuditReportAssemblerReport}=await import(u('lib/security/audit-report-assembler.ts'));
const {projectAuditReportForCustomer}=await import(u('lib/security/audit-report-customer-projection.ts'));
const {buildAuditAccountCustomerSnapshot}=await import(u('lib/security/audit-account-customer-snapshot.ts'));
const {renderCustomerSafeAuditPdf}=await import(u('lib/security/customer-safe-audit-layout.ts'));
const out=process.env.P68_RESULT_DIR||path.resolve(src,'../p68-out'); fs.mkdirSync(out,{recursive:true}); const pdfDir=path.join(out,'audit-customer-fixture-pdfs');fs.rmSync(pdfDir,{recursive:true,force:true});fs.mkdirSync(pdfDir,{recursive:true});
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const permissionParser={summary:{detected:2,notDetected:1,unknown:1,blocked:0,proRequired:5,riskDelta:13,confidenceDelta:2},customerRule:'Permission evidence is source-bound.',signals:[{category:'source/abi'},{category:'bytecode'}],advancedQueue:['Re-run ownership/proxy evidence after source refresh.']};
const liquidityHolderRisk={summary:{confirmed:2,partial:1,missing:1,blocked:0,proRequired:4,riskDelta:16,confidenceDelta:-1},customerRule:'Liquidity evidence is incomplete and source-bound.',signals:[{sourceFamilies:['rpc','indexer']},{sourceFamilies:['explorer']}],advancedQueue:['Revalidate LP custody and holder concentration after refresh.']};
const report=buildPass2578AuditReportAssemblerReport({locale:'en',chain:'ethereum',projectName:'P68 Internal Audit Fixture',contractAddress:'0x1111111111111111111111111111111111111111',permissionParser,liquidityHolderRisk});
if(report.summary.manualReview!==0||report.sections.some(s=>s.state==='manual_review')||report.finalVerdict.advancedState==='manual_review') throw new Error('active_manual_review_semantics_generated');
const positive=/(requires?\s+(?:a\s+)?manual|manually\s+verify|manual-review actions|operator[- ]signoff required|human review required)/i;
if(positive.test([report.rule,report.finalVerdict.advancedVerdict,...report.sections.map(s=>s.advancedAction),...report.advancedQueue].join('\n'))) throw new Error('positive_manual_claim');
const basic=projectAuditReportForCustomer({report,requestedTier:'basic',deliveredTier:'basic',manualReviewVerified:true});
const pro=projectAuditReportForCustomer({report,requestedTier:'pro',deliveredTier:'pro',manualReviewVerified:true});
const adv=projectAuditReportForCustomer({report,requestedTier:'advanced',deliveredTier:'advanced',manualReviewVerified:true});
if(basic.deliveredTier!=='basic'||pro.deliveredTier!=='pro'||adv.deliveredTier!=='pro') throw new Error('advanced_sale_lock_regression');
if(basic.report.proPdfLines.length||basic.report.topFindings.some(f=>f.proLine!==f.publicLine)) throw new Error('basic_paid_evidence_leak');
if(!pro.report.topFindings.some(f=>f.proLine!==f.publicLine)||!pro.report.topFindings.some(f=>/restore|resolve|refresh|reproduce|revalidate/i.test(f.advancedAction))) throw new Error('pro_evidence_or_remediation_missing');
if(pro.report.advancedQueue.length||adv.report.advancedQueue.length) throw new Error('advanced_queue_exposed');

function pipeline(locale,tier){
 const findings=report.topFindings.slice(0,3).map((f,i)=>({...f,title:`${tier.toUpperCase()} ${f.title}`,publicLine:`Public evidence ${i+1} ${tier}`,proLine:`Extended evidence ${i+1} ${tier}`,advancedAction:`Automated evidence action ${i+1} ${tier}`,sourceFamily:i%2?'nvd':'source-bytecode'}));
 return {requestedTier:tier,deliveredTier:tier,releaseState:'INTERNAL_FIXTURE_ONLY',pipelineDigest:`sha256:${'2'.repeat(64)}`,projection:{...pro,requestedTier:tier,deliveredTier:tier,projectionDigest:`sha256:${'1'.repeat(64)}`,report:{...pro.report,locale,topFindings:findings}},sourceTruth:{providerReceiptCount:tier==='basic'?2:tier==='pro'?5:8,contentBoundProviderReceiptCount:tier==='basic'?1:tier==='pro'?4:7,strictUpstreamRoots:tier==='basic'?['nvd']:tier==='pro'?['nvd','source-bytecode']:['nvd','source-bytecode','rpc']},customerReportPreviewLayout:{layoutDigest:`sha256:${'3'.repeat(64)}`},customerReport:{reportId:`p68-${tier}-${locale}`,generatedAt:FIXED,locale,target:{name:'P68 Internal Audit Fixture',symbol:'P68'},summary:{riskScore:tier==='basic'?57:tier==='pro'?58:59,confidenceScore:tier==='basic'?61:tier==='pro'?76:88},deliveryPolicy:{visibleTier:tier.toUpperCase()},decisionSections:[{title:'Risk summary',summary:`Evidence-bound ${tier} risk summary`,actions:[`Review ${tier} evidence gaps`]},{title:'Source freshness',summary:`Currentness state for ${tier}`,actions:[`Refresh stale ${tier} sources`]}],missingEvidence:[`${tier} bounded missing evidence`]}};
}
const cases=[];
for(const locale of ['pl','en','de']) for(const tier of ['basic','pro','advanced']){
 const p=pipeline(locale,tier); const snap=buildAuditAccountCustomerSnapshot({pipeline:p,accountIdHash:'a'.repeat(64),requestId:`p68-${tier}-${locale}-request`,projectName:'P68 Audit Artifact Fixture',targetLabel:'P68'}); const text=snap.layoutInput.sections.join('\n');
 if(!text.includes('Finding [')||!text.includes('source=')||!text.includes('Source-bound provider receipts:')||!text.includes('Content-bound current receipts:')||!text.includes('Independent upstream roots:')) throw new Error(`snapshot_truth_binding:${tier}/${locale}`);
 if(tier==='basic'&&snap.layoutInput.nextSteps.some(x=>x.startsWith('Finding action -'))) throw new Error(`basic_action_leak:${locale}`); if(tier!=='basic'&&!snap.layoutInput.nextSteps.some(x=>x.startsWith('Finding action -'))) throw new Error(`paid_action_missing:${tier}/${locale}`);
 const rr=renderCustomerSafeAuditPdf(snap.layoutInput); if(rr.pdfDigest!==snap.pdfArtifact.pdfDigest||rr.pdfByteLength!==snap.pdfArtifact.pdfByteLength||rr.renderPlanDigest!==snap.pdfArtifact.renderPlanDigest||rr.unsupportedGlyphReplacements!==0) throw new Error(`snapshot_download_parity:${tier}/${locale}`); const bytes=Buffer.from(rr.bytes);fs.writeFileSync(path.join(pdfDir,`audit-customer-${tier}-${locale}.pdf`),bytes);cases.push({tier,locale,pdfSha256:sha(bytes),pdfBytes:bytes.length,pageCount:rr.pageCount,snapshotDigest:snap.snapshotDigest});
}
for(const locale of ['pl','en','de']) if(new Set(cases.filter(x=>x.locale===locale).map(x=>x.pdfSha256)).size!==3) throw new Error(`tier_pdf_identity_not_distinct:${locale}`);
const receipt={schemaVersion:'velmere.p68.exact-runtime-audit-customer-truth-fixture.v1',generatedAt:FIXED,status:'PASS_P68_AUDIT_CUSTOMER_TRUTH_FIXTURE_NO_PROMOTION',cases,invariants:{manualReviewGenerated:0,basicPaidEvidenceIsolation:true,proEvidenceRemediationPresent:true,advancedSaleLockPreserved:true,nineImmutableCustomerPdfs:true,snapshotDownloadParity:true,sourceCurrentnessBound:true,unsupportedGlyphReplacementsZero:true},customerFinalOutputCredit:0,auditFinalCustomerPdfCredit:0,rightsCredit:0,saleCredit:0,live:false,truthBoundary:'Synthetic exact-runtime fixture proving active Audit customer artifact semantics and immutable PDF byte parity. It is not a real customer audit and grants no customer, rights, paid-value, sale, LIVE or WORLD_CLASS credit.'};fs.writeFileSync(path.join(out,'P68_AUDIT_CUSTOMER_TRUTH_FIXTURE.json'),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify({status:receipt.status,cases:cases.length,uniquePdfHashes:new Set(cases.map(x=>x.pdfSha256)).size},null,2));
