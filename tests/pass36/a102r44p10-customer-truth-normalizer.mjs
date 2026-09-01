import assert from "node:assert/strict";
import { normalizeCustomerStatus, toCustomerFacingAssessment } from "../../lib/security/customer-truth-normalizer.mjs";

const rows = [];
function check(id, fn) {
  try { fn(); rows.push({id, ok:true}); }
  catch (error) { rows.push({id, ok:false, error:error.message}); }
}
check("legacy-queue-normalized",()=>assert.equal(normalizeCustomerStatus("human_review_queued"),"analysis_queue"));
check("legacy-processing-normalized",()=>assert.equal(normalizeCustomerStatus("human_review_processing"),"analysis_processing"));
check("legacy-completed-normalized",()=>assert.equal(normalizeCustomerStatus("human_review_completed"),"analysis_completed"));
check("operator-signoff-normalized",()=>assert.equal(normalizeCustomerStatus("operator_signoff_pending"),"analysis_verification_pending"));
check("unknown-status-preserved",()=>assert.equal(normalizeCustomerStatus("FAILED"),"FAILED"));
const assessment=toCustomerFacingAssessment({evidenceCompleteness:"4/4",toolAgreementState:"NO_SIGNAL"});
check("confidence-not-numeric",()=>assert.equal(assessment.findingConfidence,"NOT_CALIBRATED"));
check("automated-unreviewed",()=>assert.equal(assessment.reviewStatus,"AUTOMATED_UNREVIEWED"));
check("adjudication-not-performed",()=>assert.equal(assessment.adjudicationStatus,"NOT_PERFORMED"));
check("no-synthetic-agreement-score",()=>assert.equal(Object.hasOwn(assessment,"agreementScore"),false));
const failed=rows.filter(x=>!x.ok);
console.log(JSON.stringify({schemaVersion:"velmere.pass36.a102r44p10.customer-truth-normalizer.v1",checks:rows.length,passed:rows.length-failed.length,failed:failed.length,rows},null,2));
if(failed.length)process.exit(1);
