import type { VlmBrainLaunchReadinessDashboard } from "./vlm-brain-launch-readiness-dashboard";
import type { VlmBrainLiveFeedAdapterMatrix } from "./vlm-brain-live-feed-adapter-matrix";
export type VlmBrainMissingDataEscalationQueue = { schemaVersion:"vlm-brain-missing-data-escalation-queue-v1-pass237"; queueMode:"missing_data_operator_escalation_preview"; queueId:string; createdAt:string; token:{symbol:string;name:string}; queueDecision:"blocked"|"escalate"; missingDataIsNeutral:false; items:Array<{id:string;label:string;severity:"P0"|"P1"|"P2"; state:"blocked"|"escalate"|"review"; nextAction:string}>; operatorSummary:string; customerBoundary:string; };
const SCHEMA="vlm-brain-missing-data-escalation-queue-v1-pass237" as const;
function c(v:unknown,f="missing data escalation required",l=260){return String(v??f).replace(/[\u0000-\u001f\u007f]/g," ").replace(/\s+/g," ").trim().slice(0,l)||f}
function id(v:string){return c(v,"VLM-MISSING-DATA",230).toUpperCase().replace(/[^A-Z0-9-]+/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"")}
export function buildVlmBrainMissingDataEscalationQueue(dashboard:VlmBrainLaunchReadinessDashboard,feed:VlmBrainLiveFeedAdapterMatrix): VlmBrainMissingDataEscalationQueue{
 const createdAt=feed.createdAt??dashboard.createdAt??new Date().toISOString();
 const items=feed.feeds.map(f=>({id:f.id,label:f.label,severity:f.state==="missing"?"P0" as const:f.state==="stale"?"P1" as const:"P2" as const,state:f.state==="missing"?"blocked" as const:f.state==="stale"?"escalate" as const:"review" as const,nextAction:f.nextAction}));
 return {schemaVersion:SCHEMA,queueMode:"missing_data_operator_escalation_preview",queueId:id(`VLM-MISSING-DATA-${feed.token.symbol}-${feed.matrixId}-${createdAt}`),createdAt,token:feed.token,queueDecision:items.some(i=>i.state==="blocked")||dashboard.launchDecision==="blocked"?"blocked":"escalate",missingDataIsNeutral:false,items,operatorSummary:"Missing data queue escalates absent holder/orderbook/contract/OSINT evidence instead of treating it as neutral.",customerBoundary:"Missing data must be described as uncertainty and review pressure, never as a clean result."};
}
export const PASS237_VLM_BRAIN_MISSING_DATA_ESCALATION_QUEUE_CONTRACT = true;
