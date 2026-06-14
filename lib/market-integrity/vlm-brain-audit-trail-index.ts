import type { VlmBrainReleaseChainAudit } from "./vlm-brain-release-chain-auditor";
import type { VlmBrainSourceLedgerUiPreview } from "./vlm-brain-source-ledger-ui-preview";
export type VlmBrainAuditTrailIndex = { schemaVersion:"vlm-brain-audit-trail-index-v1-pass240"; indexMode:"operator_audit_trail_index_preview"; indexId:string; createdAt:string; token:{symbol:string;name:string}; indexDecision:"blocked"|"index_ready_for_review"; durableIndexReady:false; rawPayloadAllowed:false; entries:Array<{id:string;label:string;state:"blocked"|"review"|"preview";ref:string;nextAction:string}>; operatorSummary:string; customerBoundary:string; };
const SCHEMA="vlm-brain-audit-trail-index-v1-pass240" as const;
function c(v:unknown,f="audit trail index review required",l=260){return String(v??f).replace(/[\u0000-\u001f\u007f]/g," ").replace(/\s+/g," ").trim().slice(0,l)||f}
function id(v:string){return c(v,"VLM-AUDIT-TRAIL",240).toUpperCase().replace(/[^A-Z0-9-]+/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"")}
export function buildVlmBrainAuditTrailIndex(audit:VlmBrainReleaseChainAudit,ledger:VlmBrainSourceLedgerUiPreview): VlmBrainAuditTrailIndex{
 const createdAt=ledger.createdAt??audit.createdAt??new Date().toISOString();
 const entries=audit.chainLanes.map(l=>({id:l.id,label:l.label,state:l.state==="blocked"?"blocked" as const:l.state==="review"?"review" as const:"preview" as const,ref:l.upstreamRef,nextAction:l.operatorAction}));
 return {schemaVersion:SCHEMA,indexMode:"operator_audit_trail_index_preview",indexId:id(`VLM-AUDIT-TRAIL-${audit.token.symbol}-${audit.auditId}-${createdAt}`),createdAt,token:audit.token,indexDecision:entries.some(e=>e.state==="blocked")?"blocked":"index_ready_for_review",durableIndexReady:false,rawPayloadAllowed:false,entries,operatorSummary:"Audit trail index links every release-chain lane back to source ledger refs before report export.",customerBoundary:"Audit index is internal source traceability, not a public proof or trading recommendation."};
}
export const PASS240_VLM_BRAIN_AUDIT_TRAIL_INDEX_CONTRACT = true;
