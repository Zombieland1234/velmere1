import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

const sourceRoot=process.env.P71_SOURCE_ROOT || process.cwd();
const resultDir=process.env.P71_RESULT_DIR || process.cwd();
const mod=(p:string)=>import(pathToFileURL(path.join(sourceRoot,p)).href);
const history=await mod('lib/security/audit-case-customer-history.ts');
const orchestration=await mod('lib/security/audit-review-orchestration.ts');
const paid=await mod('lib/commerce/vlm-paid-access.ts');
const flow=await mod('lib/security/audit-review-flow.ts');
const checks:Array<{id:string;passed:boolean;detail?:unknown}>=[];
const check=(id:string,cond:unknown,detail?:unknown)=>{assert.ok(cond,id);checks.push({id,passed:true,...(detail===undefined?{}:{detail})});};

const advancedRecord={
  caseId:'00000000-0000-4000-8000-000000000071',caseRef:'AUD-P710000001',requestId:'p71-runtime',
  target:{kind:'contract',canonicalTarget:'0xca11bde05977b3631167028862be2a173976ca11',displayLabel:'0xca11bd…76ca11',targetHash:'sha256:test'},
  sourceCandidates:{},tier:'advanced',locale:'en',status:'queued_paid_review',entitlementRequired:true,entitlementVerified:true,analysisStarted:false,
  createdAt:'2026-08-17T00:00:00.000Z',updatedAt:'2026-08-17T00:00:00.000Z',storageMode:'memory_runtime_only',durable:false,
};
const queue=history.deriveAuditCustomerQueueLane(advancedRecord);
check('queue:advanced-current-write-is-automation',queue==='advanced_automation',queue);
const review=await orchestration.getAuditReviewCustomerProjection(advancedRecord);
check('review:advanced-processing-mode',review.processingMode==='advanced_automation',review.processingMode);
check('review:no-mandatory-human-assignment',review.humanReviewerAssigned===false,review.humanReviewerAssigned);
check('review:no-human-sla-gate',review.sla.state==='not_applicable',review.sla);
check('review:boundary-explicit-optional-qa',String(review.boundary).includes('optional internal QA metadata') && String(review.boundary).includes('never a customer requirement'),review.boundary);
const legacyProduct=paid.getVlmPaidProduct('vlm_advanced_audit_human_review','en');
check('commerce:legacy-billing-id-maps-current-analysis-scope',legacyProduct.accessScope==='audit_advanced_analysis',legacyProduct.accessScope);
const preview=flow.buildAuditVerificationPreview({projectName:'P71 runtime truth',contractAddress:'0xca11bde05977b3631167028862be2a173976ca11',reviewLevel:'advanced_review'});
const previewText=JSON.stringify(preview);
check('flow:advanced-automated-copy',previewText.includes('Deeper automated evidence checks') && previewText.includes('automated evidence, conflict, remediation and retest gates'));
check('flow:no-stale-manual-assisted-copy',!previewText.includes('Manual-assisted checklist') && !previewText.includes('Add reviewer notes'));
check('flow:no-stale-149-price-label',!previewText.includes('149€') && previewText.includes('not for sale'));
const result={schemaVersion:'velmere.p71.owner-bound-advanced-automation-runtime.v1',status:'PASS',checkCount:checks.length,checks};
fs.mkdirSync(resultDir,{recursive:true});fs.writeFileSync(path.join(resultDir,'P71_OWNER_BOUND_ADVANCED_AUTOMATION_RUNTIME_TEST.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
