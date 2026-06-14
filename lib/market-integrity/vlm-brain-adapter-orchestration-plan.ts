import type { VlmBrainLedgerPersistenceAdapterPlan } from "./vlm-brain-ledger-persistence-adapter-plan";
import type { VlmBrainLiveFeedAdapterMatrix } from "./vlm-brain-live-feed-adapter-matrix";
export type VlmBrainAdapterOrchestrationPlan = { schemaVersion:"vlm-brain-adapter-orchestration-plan-v1-pass234"; orchestrationMode:"server_adapter_orchestration_preview"; orchestrationId:string; createdAt:string; token:{symbol:string;name:string}; orchestrationDecision:"blocked"|"server_required"; liveFeedReady:false; persistenceReady:false; rawPayloadAllowed:false; lanes:Array<{id:string;label:string;state:"blocked"|"server_required"|"review"; score:number; nextAction:string}>; operatorSummary:string; customerBoundary:string; };
const SCHEMA="vlm-brain-adapter-orchestration-plan-v1-pass234" as const;
function c(v:unknown,f="adapter orchestration review required",l=260){return String(v??f).replace(/[\u0000-\u001f\u007f]/g," ").replace(/\s+/g," ").trim().slice(0,l)||f}
function id(v:string){return c(v,"VLM-ADAPTER-ORCH",230).toUpperCase().replace(/[^A-Z0-9-]+/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"")}
function clamp(n:number){return Math.max(0,Math.min(100,Math.round(Number.isFinite(n)?n:0)))}
export function buildVlmBrainAdapterOrchestrationPlan(feed:VlmBrainLiveFeedAdapterMatrix,persistence:VlmBrainLedgerPersistenceAdapterPlan): VlmBrainAdapterOrchestrationPlan{
 const createdAt=feed.createdAt??persistence.createdAt??new Date().toISOString();
 const feedLanes=feed.feeds.map(f=>({id:`feed_${f.id}`,label:f.label,state:f.state==="missing"?"blocked" as const:f.state==="stale"?"server_required" as const:"review" as const,score:clamp(f.score),nextAction:f.nextAction}));
 const storeLanes=persistence.adapters.map(a=>({id:`store_${a.id}`,label:a.label,state:a.state==="blocked"?"blocked" as const:"server_required" as const,score:a.state==="blocked"?28:46,nextAction:a.nextAction}));
 const lanes=[...feedLanes,...storeLanes];
 return {schemaVersion:SCHEMA,orchestrationMode:"server_adapter_orchestration_preview",orchestrationId:id(`VLM-ADAPTER-ORCH-${feed.token.symbol}-${feed.matrixId}-${createdAt}`),createdAt,token:feed.token,orchestrationDecision:lanes.some(l=>l.state==="blocked")?"blocked":"server_required",liveFeedReady:false,persistenceReady:false,rawPayloadAllowed:false,lanes,operatorSummary:"Adapter orchestration keeps live feeds and durable stores as server-required work before public export.",customerBoundary:"Adapter orchestration is internal readiness only; missing adapters cannot be presented as confidence."};
}
export const PASS234_VLM_BRAIN_ADAPTER_ORCHESTRATION_PLAN_CONTRACT = true;
