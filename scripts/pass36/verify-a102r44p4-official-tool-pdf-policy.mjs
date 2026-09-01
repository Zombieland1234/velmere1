#!/usr/bin/env node
import fs from "node:fs";
const policy=JSON.parse(fs.readFileSync("config/pass36/a102r44p4-official-tool-pdf-evidence-policy.json","utf8"));
const state=JSON.parse(fs.readFileSync("config/pass36/a102r44p4-product-reality-wave4-state.json","utf8"));
const provenance=JSON.parse(fs.readFileSync("config/pass36/a102r44p4-github-actions-provenance.json","utf8"));
const checks=[];const check=(id,p,d=null)=>checks.push({id,passed:Boolean(p),detail:d});const sha=x=>/^[0-9a-f]{64}$/.test(String(x||""));
check("documents-150",policy.documents===150&&policy.basic===50&&policy.pro===50&&policy.advanced===50,policy);
check("pages-700",policy.pages===700,policy.pages);
check("packets-450",policy.packetRows===450,policy.packetRows);
check("official-executions-200",policy.officialToolExecutionsBound===200,policy.officialToolExecutionsBound);
for(const key of ["packetFileSha256","packetSummarySha256","pdfManifestSha256","pdfVerificationSha256","bindingReceiptSha256"])check(`sha:${key}`,sha(policy[key]),policy[key]);
check("pdf-qa",policy.pdfQa.passed===150&&policy.pdfQa.failed===0&&policy.pdfQa.activeContentDocuments===0&&policy.pdfQa.blankPages===0&&policy.pdfQa.fontEmbeddedDocuments===150&&policy.pdfQa.toUnicodeDocuments===150,policy.pdfQa);
check("binding-4418",policy.bindingChecks===4418&&policy.bindingFailed===0,{checks:policy.bindingChecks,failed:policy.bindingFailed});
check("claim-boundary",policy.claimBoundary.humanReviewed===false&&policy.claimBoundary.independentlyCertified===false&&policy.claimBoundary.personalisedAdvice===false&&policy.claimBoundary.securityGuarantee===false,policy.claimBoundary);
check("state-parity",state.localEvidence.officialToolPdfs.documents===150&&state.localEvidence.officialToolPdfs.pages===700&&state.localEvidence.officialToolPdfs.officialToolExecutionsBound===200&&state.localEvidence.officialToolPdfs.pdfManifestSha256===policy.pdfManifestSha256,state.localEvidence.officialToolPdfs);
check("artifact-verification",provenance.independentVerification.status==="PASS"&&provenance.independentVerification.checks===34&&provenance.independentVerification.failed===0,provenance.independentVerification);
check("fail-closed",policy.realCustomerPdfCredit===0&&policy.rightsApprovedRealAuditCredit===0&&policy.liveCredit===0&&policy.saleEnabled===false&&state.globalDecision==="NO_GO"&&state.saleEnabled===false);
const failed=checks.filter(x=>!x.passed);const out={schemaVersion:"velmere.pass36.a102r44p4.official-tool-pdf-evidence-policy-verification.v1",status:failed.length?"FAIL":"PASS_A102R44P4_450_PACKETS_150_PDFS_700_PAGES_200_TOOL_RECEIPTS_BOUND",checks:checks.length,passed:checks.length-failed.length,failed:failed.length,failures:failed,rows:checks,realCustomerPdfCredit:0,liveCredit:0,saleEnabled:false};console.log(JSON.stringify(out,null,2));if(failed.length)process.exit(1);
