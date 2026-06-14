import type { TokenRiskResult } from "./risk-types";
import type { VlmBrainPdfPreviewManifest } from "./vlm-brain-pdf-preview-manifest";
import type { VlmBrainReleaseBlockerResolver } from "./vlm-brain-release-blocker-resolver";
export type VlmBrainCustomerCopySanitizer = { schemaVersion:"vlm-brain-customer-copy-sanitizer-v1-pass227"; sanitizerMode:"customer_copy_preview_guard"; sanitizerId:string; createdAt:string; token:{symbol:string;name:string}; copyDecision:"blocked"|"review_only"; publicCopyReady:false; forbiddenTermCount:number; redactionScore:number; previewCopy:string; operatorSummary:string; customerBoundary:string; blockedTerms:string[]; };
const SCHEMA="vlm-brain-customer-copy-sanitizer-v1-pass227" as const;
const forbidden=["buy signal","sell signal","guaranteed profit","risk-free","safe investment","scam confirmed","fraud proven","enter seed phrase","public sale is live"];
function c(v:unknown,f="copy review required",l=360){return String(v??f).replace(/[\u0000-\u001f\u007f]/g," ").replace(/\s+/g," ").trim().slice(0,l)||f}
function id(v:string){return c(v,"VLM-COPY-SANITIZER",260).toUpperCase().replace(/[^A-Z0-9-]+/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"")}
function sanitize(text:string){let out=text; for(const term of forbidden){out=out.replace(new RegExp(term,"ig"),"manual review");} return c(out,"Algorithmic risk flag requires source review. Missing data remains visible before any customer brief.",380)}
export function buildVlmBrainCustomerCopySanitizer(pdf: VlmBrainPdfPreviewManifest, resolver: VlmBrainReleaseBlockerResolver, result: TokenRiskResult): VlmBrainCustomerCopySanitizer {
 const createdAt=result.generatedAt??pdf.createdAt??new Date().toISOString();
 const sourceText=[pdf.operatorSummary,resolver.operatorSummary,result.aiSummary].join(" ");
 const lower=sourceText.toLowerCase();
 const blockedTerms=forbidden.filter(t=>lower.includes(t));
 const redactionScore=Math.max(0,Math.min(100,Math.round(84-blockedTerms.length*10-resolver.p0Count*8)));
 return {schemaVersion:SCHEMA,sanitizerMode:"customer_copy_preview_guard",sanitizerId:id(`VLM-COPY-SANITIZER-${pdf.token.symbol}-${pdf.manifestId}-${createdAt}`),createdAt,token:pdf.token,copyDecision:resolver.resolverDecision==="blocked"||pdf.routeState==="download_blocked"?"blocked":"review_only",publicCopyReady:false,forbiddenTermCount:blockedTerms.length,redactionScore,previewCopy:sanitize("Algorithmic risk flag: source confidence, missing data and manual review status must stay visible before any customer-facing brief."),operatorSummary:"Customer copy is sanitized to anomaly/review/missing-data language and stays blocked until release QA and durable stores pass.",customerBoundary:"No customer copy may imply guaranteed safety, profit, investment advice, scam proof or final verdict.",blockedTerms};
}
export const PASS227_VLM_BRAIN_CUSTOMER_COPY_SANITIZER_CONTRACT = true;
