import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const FIXED_ISO='2026-08-16T17:30:00.000Z';
const RealDate=Date;
class FixedDate extends RealDate {
  constructor(...args){ super(...(args.length?args:[FIXED_ISO])); }
  static now(){ return RealDate.parse(FIXED_ISO); }
}
globalThis.Date=FixedDate;

const { buildProAuditPdfSnapshot, renderProAuditPdfSnapshot } = await import('../../lib/security/pro-audit-pdf/render-pro-audit-pdf.ts');
const { buildCustomerSafeMinimalPdf } = await import('../../lib/security/pro-audit-pdf/customer-safe-renderer.ts');
const { getAuditTierContract } = await import('../../lib/security/audit-tier-contract.ts');

const outDir=process.env.P66_AUDIT_PDF_OUT || '/tmp/p66-audit-pdf';
fs.rmSync(outDir,{recursive:true,force:true}); fs.mkdirSync(outDir,{recursive:true});
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const labels={
 pl:{basic:['VELMÈRE BASIC AUDYT','Automatyczny raport wstępnego audytu'],pro:['VELMÈRE PRO AUDYT','Rozszerzony automatyczny raport dowodowy'],advanced:['VELMÈRE ADVANCED AUDYT','Rozszerzony automatyczny raport informacyjny']},
 en:{basic:['VELMERE BASIC AUDIT','Automated audit prescreen report'],pro:['VELMERE PRO AUDIT','Extended automated evidence report'],advanced:['VELMERE ADVANCED AUDIT','Extended automated informational report']},
 de:{basic:['VELMÈRE BASIC AUDIT','Automatisierter Audit-Vorprüfbericht'],pro:['VELMÈRE PRO AUDIT','Erweiterter automatisierter Evidenzbericht'],advanced:['VELMÈRE ADVANCED AUDIT','Erweiterter automatisierter Informationsbericht']},
};
function options(locale,tier,requestId){
  const [title,subtitle]=labels[locale][tier];
  return {title,subtitle,maxLines:480,footer:tier==='basic'?'BASIC automated informational prescreen | Not independently certified or guaranteed safe':`${tier.toUpperCase()} automated informational analysis | Not manually QA-checked, independently certified or guaranteed safe`,issuer:'Issued by Velmère Security',generator:'Generated automatically by Velmère Security Engine',documentId:requestId,generatedAt:FIXED_ISO,locale,classification:'customer_private'};
}
const rows=[];
for (const locale of ['pl','en','de']) for (const tier of ['basic','pro','advanced']) {
  const requestId=`p66-${tier}-${locale}-fixture`;
  const snapshot=await buildProAuditPdfSnapshot({requestId,target:'Velmere Internal Audit Fixture',chain:'ethereum',locale,tier,sourceCandidates:{}});
  if(snapshot.generatedAt!==FIXED_ISO) throw new Error(`generatedAt:${tier}/${locale}:${snapshot.generatedAt}`);
  if(snapshot.tier!==tier) throw new Error(`tier:${tier}/${locale}`);
  if(snapshot.lines[0]!==labels[locale][tier][0]) throw new Error(`title:${tier}/${locale}:${snapshot.lines[0]}`);
  if(!snapshot.renderContract||snapshot.renderContract.unsupportedGlyphReplacements!==0) throw new Error(`render_contract:${tier}/${locale}`);
  const canonicalLines=snapshot.layout.sections.flatMap(s=>s.lines);
  const bytes=Buffer.from(buildCustomerSafeMinimalPdf(canonicalLines,options(locale,tier,requestId)));
  const digest=`sha256:${sha(bytes)}`;
  if(digest!==snapshot.renderContract.pdfDigest) throw new Error(`pdf_digest:${tier}/${locale}:${digest}!=${snapshot.renderContract.pdfDigest}`);
  if(bytes.length!==snapshot.renderContract.pdfByteLength) throw new Error(`pdf_bytes:${tier}/${locale}`);
  if(tier==='basic') {
    const official=Buffer.from(renderProAuditPdfSnapshot(snapshot));
    if(sha(official)!==sha(bytes)) throw new Error(`basic_official_render:${locale}`);
  } else {
    let blocked=false;
    try { renderProAuditPdfSnapshot(snapshot); } catch(e) { blocked=String(e?.message||e).startsWith('audit_pdf_paid_completeness_blocked:'); }
    if(!blocked) throw new Error(`paid_fail_closed_missing:${tier}/${locale}`);
  }
  const file=path.join(outDir,`audit-${tier}-${locale}.pdf`); fs.writeFileSync(file,bytes);
  rows.push({tier,locale,requestId,pdfBytes:bytes.length,pdfSha256:sha(bytes),snapshotDigest:snapshot.digest,pageCount:snapshot.renderContract.pageCount,renderedRowCount:snapshot.renderContract.renderedRowCount,lineCount:snapshot.lines.length,riskLabel:snapshot.verdict.riskLabel,confidenceScore:snapshot.verdict.confidenceScore,paidExportState:tier==='basic'?'NOT_APPLICABLE_BASIC_RENDER_ALLOWED':'FAIL_CLOSED_AS_EXPECTED_WITHOUT_PAID_EVIDENCE'});
}
for(const locale of ['pl','en','de']){
 const s=rows.filter(r=>r.locale===locale).map(r=>r.pdfSha256);
 if(new Set(s).size!==3) throw new Error(`tier_bytes_not_distinct:${locale}`);
}
const contracts=['basic','pro','advanced'].map(t=>getAuditTierContract(t));
// explicit semantic, non-padding tier checks
if(!contracts[1].includes.some(x=>/source and ABI|permission and control|liquidity|provider-conflict|PDF/i.test(x))) throw new Error('pro_semantic_delta_missing');
if(!contracts[2].includes.some(x=>/cross-tool consensus|compiler artifact|remediation|bytecode/i.test(x))) throw new Error('advanced_semantic_delta_missing');
const receipt={schemaVersion:'velmere.p66.audit-pdf-all-tier-fixture-runtime.v1',generatedAt:FIXED_ISO,status:'PASS_P66_AUDIT_PDF_ALL_TIERS_INTERNAL_FIXTURE_NO_CUSTOMER_PROMOTION',truthClass:'INTERNAL_FIXTURE_ONLY',customerFinalOutputCredit:0,saleCredit:0,live:false,tiers:['basic','pro','advanced'],locales:['pl','en','de'],cases:rows,tierContracts:contracts.map(c=>({tier:c.id,includes:c.includes,excludes:c.excludes})),invariants:{ninePdfsGenerated:rows.length===9,allPdfHashesUnique:new Set(rows.map(r=>r.pdfSha256)).size===9,basicOfficialRendererPathPass:rows.filter(r=>r.tier==='basic').length===3,paidRoutesFailClosedWithoutEvidence:true,unsupportedGlyphReplacementsZero:true,semanticTierDeltasPresent:true},truthBoundary:'These PDFs are deterministic internal fixtures proving artifact generation, tier identity, locale/layout renderer behavior and paid fail-closed boundaries. They are not customer audit results and do not receive customer, value, rights, sale, LIVE or WORLD_CLASS credit.'};
fs.writeFileSync('artifacts/closure/p66/P66_AUDIT_PDF_ALL_TIER_FIXTURE_RUNTIME.json',JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({status:receipt.status,cases:rows.length,uniqueHashes:new Set(rows.map(r=>r.pdfSha256)).size,basicRendered:3,paidFailClosed:6,outDir},null,2));
