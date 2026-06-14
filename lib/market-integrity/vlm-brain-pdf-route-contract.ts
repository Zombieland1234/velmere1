import type { VlmBrainCustomerCopySanitizer } from "./vlm-brain-customer-copy-sanitizer";
import type { VlmBrainPdfPreviewManifest } from "./vlm-brain-pdf-preview-manifest";
import type { VlmBrainReleaseBlockerResolver } from "./vlm-brain-release-blocker-resolver";
export type VlmBrainPdfRouteContract = { schemaVersion:"vlm-brain-pdf-route-contract-v1-pass228"; routeMode:"pdf_route_preview_disabled"; routeId:string; createdAt:string; token:{symbol:string;name:string}; routeDecision:"download_blocked"|"html_preview_only"; binaryPdfReady:false; htmlPreviewReady:boolean; rawPayloadAllowed:false; routeChecks:{id:string;label:string;state:"blocked"|"review"|"preview";nextAction:string}[]; operatorSummary:string; customerBoundary:string; };
const SCHEMA="vlm-brain-pdf-route-contract-v1-pass228" as const;
function c(v:unknown,f="PDF route review required",l=260){return String(v??f).replace(/[\u0000-\u001f\u007f]/g," ").replace(/\s+/g," ").trim().slice(0,l)||f}
function id(v:string){return c(v,"VLM-PDF-ROUTE",230).toUpperCase().replace(/[^A-Z0-9-]+/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"")}
export function buildVlmBrainPdfRouteContract(pdf:VlmBrainPdfPreviewManifest, sanitizer:VlmBrainCustomerCopySanitizer, resolver:VlmBrainReleaseBlockerResolver): VlmBrainPdfRouteContract{
 const createdAt=sanitizer.createdAt??pdf.createdAt??new Date().toISOString();
 const blocked=pdf.routeState==="download_blocked"||sanitizer.copyDecision==="blocked"||resolver.p0Count>0;
 const routeChecks=[
  {id:"generator",label:"Binary PDF generator",state:"blocked" as const,nextAction:"Implement server-side binary PDF generator only after manifest and durable storage pass."},
  {id:"manifest",label:"Preview manifest",state:pdf.blockedSectionCount>0?"blocked" as const:"review" as const,nextAction:"Keep PDF-ready HTML as preview with visible source confidence and missing-data appendix."},
  {id:"redaction",label:"Redaction envelope",state:sanitizer.redactionScore>=80?"review" as const:"blocked" as const,nextAction:"Attach final redaction envelope before any customer artifact."},
  {id:"download",label:"Download button",state:"blocked" as const,nextAction:"Keep download disabled until generator, durable store and browser QA are green."},
 ];
 return {schemaVersion:SCHEMA,routeMode:"pdf_route_preview_disabled",routeId:id(`VLM-PDF-ROUTE-${pdf.token.symbol}-${pdf.manifestId}-${createdAt}`),createdAt,token:pdf.token,routeDecision:blocked?"download_blocked":"html_preview_only",binaryPdfReady:false,htmlPreviewReady:!blocked&&pdf.sections.length>0,rawPayloadAllowed:false,routeChecks,operatorSummary:"PDF route contract keeps binary download disabled and preserves HTML preview as operator-only artifact.",customerBoundary:"PDF route is not a certificate, not investment advice and not a guarantee of token safety."};
}
export const PASS228_VLM_BRAIN_PDF_ROUTE_CONTRACT = true;
