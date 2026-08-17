import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

async function main() {
  const sourceRoot=process.env.P71_SOURCE_ROOT || process.cwd();
  const resultDir=process.env.P71_RESULT_DIR || process.cwd();
  const mod=(p:string)=>import(pathToFileURL(path.join(sourceRoot,p)).href);
  const tier=await mod('lib/security/audit-tier-contract.ts');
  const layout=await mod('lib/security/customer-safe-audit-layout.ts');
  const checks:Array<{id:string;passed:boolean;detail?:unknown}>=[];
  const check=(id:string,cond:unknown,detail?:unknown)=>{assert.ok(cond,id);checks.push({id,passed:true,...(detail===undefined?{}:{detail})});};

  const current=tier.CURRENT_AUDIT_TIER_CONTRACTS;
  check('tier:three-current-audit-tiers',Object.keys(current).sort().join(',')==='advanced,basic,pro',Object.keys(current));
  check('tier:advanced-automated',current.advanced.humanReviewRequired===false && current.advanced.humanReviewClaimAllowed===false,current.advanced);
  check('tier:advanced-stop-sold',current.advanced.customerDecision==='NOT_FOR_SALE' && current.advanced.publicCheckoutAllowed===false,current.advanced.customerDecision);
  check('tier:advanced-no-current-price',current.advanced.price===null,current.advanced.price);
  check('tier:legacy-billing-id-not-current-human-claim',current.advanced.billingIdentifierClass==='legacy_compatibility_only' && current.advanced.commercialMode==='paid_automated_informational_analysis',current.advanced);
  check('tier:current-advanced-package-not-human',current.advanced.packageId==='advanced_audit',current.advanced.packageId);
  check('tier:pro-automated',current.pro.humanReviewRequired===false && current.pro.humanReviewClaimAllowed===false,current.pro);
  check('tier:basic-no-entitlement',current.basic.entitlementRequired===false,current.basic.entitlementRequired);

  const matrix=tier.buildAuditTierCustomerMatrix({
    requestedTier:'advanced',
    paymentVerified:true,
    paymentVerifiedForTier:{basic:true,pro:true,advanced:true},
    preCheckoutReady:{basic:true,pro:true,advanced:true},
    deliveryReady:{basic:true,pro:true,advanced:true},
    blockers:{basic:[],pro:[],advanced:[]},
  });
  const adv=matrix.find((x:any)=>x.tier==='advanced');
  check('matrix:advanced-payment-cannot-unlock',adv?.releaseState==='blocked',adv);
  check('matrix:advanced-not-for-sale-blocker',Array.isArray(adv?.blockers) && adv.blockers.includes('not_for_sale'),adv?.blockers);
  check('matrix:no-manual-review-gate-current-advanced',!Array.isArray(adv?.blockers) || !adv.blockers.includes('manual_review_required'),adv?.blockers);

  const pdf=layout.renderCustomerSafeAuditPdf({
    reportId:'p71r5-current-projection-regression',requestId:'p71r5-current-projection-regression',locale:'en',
    title:'Velmere Audit current projection regression',summary:'Automated Advanced product truth regression.',status:'INTERNAL_TEST_ONLY',
    projectName:'Current projection',reviewLevel:'ADVANCED',
    sections:['Advanced remains automated.','Optional human QA has zero customer feature credit.','Advanced remains NOT_FOR_SALE.'],
    nextSteps:['Keep customer delivery blocked until final product gates pass.'],
    forbidden:['human-reviewed claim','sale-ready claim','guaranteed safe'],
    customerBoundary:'Internal current-projection regression only.',refreshedAt:'2026-08-17T00:00:00.000Z',
  });
  check('pdf:current-render-nonempty',pdf.pdfByteLength>500 && pdf.pageCount>=1,{bytes:pdf.pdfByteLength,pages:pdf.pageCount});
  check('pdf:no-glyph-replacement',pdf.unsupportedGlyphReplacements===0,pdf.unsupportedGlyphReplacements);
  check('pdf:has-digest',typeof pdf.pdfDigest==='string' && pdf.pdfDigest.length>20,pdf.pdfDigest);

  const result={schemaVersion:'velmere.p71r5.current-projection-audit-regression.v1',status:'PASS',checkCount:checks.length,checks};
  fs.mkdirSync(resultDir,{recursive:true});
  fs.writeFileSync(path.join(resultDir,'P71R5_CURRENT_PROJECTION_AUDIT_REGRESSION.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result,null,2));
}

main().catch((error)=>{console.error(error);process.exit(1);});
