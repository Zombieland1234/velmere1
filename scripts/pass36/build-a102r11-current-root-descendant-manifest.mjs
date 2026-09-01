#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {REV,PARENT,MANIFEST,PARENT_MANIFEST,STATE,RECEIPT,sha256,canonicalJson,readJson,collect,payload} from "./a102r11-source-boundary.mjs";
const root=process.cwd(); const state=readJson(root,STATE); const parent=readJson(root,PARENT_MANIFEST); const receipt=readJson(root,RECEIPT);
if(state.revisionId!==REV||state.parentRevisionId!==PARENT)throw new Error("a102r11_state_identity");
if(parent.revisionId!==PARENT||!parent.manifestDigestSha256)throw new Error("a102r11_parent_manifest_identity");
if(receipt.revisionId!==REV||receipt.status!=="PASS_A102R11_LOCAL_REGRESSION_ACTION_REQUIRED_NO_PROMOTION")throw new Error("a102r11_receipt_identity");
const inventory=collect(root); if(inventory.rejected.length)throw new Error(`a102r11_rejected:${JSON.stringify(inventory.rejected)}`);
const passCredit=Object.fromEntries(Array.from({length:27},(_,i)=>[`a${i+90}PassCredit`,false]));
const claims={
 ...passCredit,
 exactA77R1ToA80R1Credit:false,
 a88r2HistoricalLocalResultRetained:true,
 a88r2FreshSourceBoundCredit:false,
 freshExactBuildBrowserCredit:false,
 syntheticPdfExternalToolDocuments:450,
 realCustomerPdfDocuments:0,
 realObservationRuns:0,
 realEvidenceBound:false,
 stagingCredit:false,
 rightsApprovedProviders:0,
 legalDecisionsSigned:0,
 customerCohortsVerified:0,
 independentAssuranceVerified:false,
 exactChromiumVerified:false,
 clientLensPdfExactByteBindingRequired:true,
 clientLensPdfCanonicalReportBindingRequired:true,
 clientLensPdfCanonicalPayloadArtifactDigestBindingRequired:true,
 clientLensPdfRendererTierPageCountBindingRequired:true,
 clientLensPdfActiveContentRedactionParityRequired:true,
 clientPdfObjectUrlCentralBoundaryImplemented:true,
 rawClientPdfObjectUrlSinksOutsideBoundary:0,
 paidAuditZeroDelayObjectUrlRevocationRemoved:true,
 safeClientPdfFilenameAndNoReferrerRequired:true,
 realClientPdfBrowserRows:0,
 realCustomerPdfSecureDeliveries:0,
 liveProven:false,
 saleEnabled:false,
 productionApproved:false,
 worldClassProven:false,
};
const core={
 schemaVersion:"velmere.pass36.a102r11.action-required-current-root-descendant-manifest.v1",
 revisionId:REV,
 parentRevisionId:PARENT,
 parentDescendantManifestDigestSha256:parent.manifestDigestSha256,
 generatedAt:state.generatedAt,
 checkpointClass:"ACTION_REQUIRED_NON_PASS",
 completedThrough:89,
 coveredWorkRange:"A90-A102_LOCAL_CLIENT_LENS_PDF_BYTE_BINDING_OBJECT_URL_AND_DOWNLOAD_LIFECYCLE_HARDENING_NO_FORMAL_PASS_CREDIT",
 payload:payload(inventory.rows),
 localRegressionReceiptSha256:sha256(fs.readFileSync(path.join(root,RECEIPT))),
 claims,
 denominators:state.denominators??state.realDenominators,
 skuDecisions:state.skuDecisions,
};
const output={...core,manifestDigestSha256:sha256(canonicalJson(core))};
fs.writeFileSync(path.join(root,MANIFEST),`${JSON.stringify(output,null,2)}\n`);
console.log(JSON.stringify({status:"BUILT_A102R11_DESCENDANT_ACTION_REQUIRED_NO_PROMOTION",payload:output.payload,manifestDigestSha256:output.manifestDigestSha256},null,2));
