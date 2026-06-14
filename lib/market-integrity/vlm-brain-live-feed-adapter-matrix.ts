import type { TokenRiskResult } from "./risk-types";
import type { VlmBrainLiveAdapterFreshnessMesh } from "./vlm-brain-live-adapter-freshness";
export type VlmBrainLiveFeedAdapterMatrix = { schemaVersion:"vlm-brain-live-feed-adapter-matrix-v1-pass230"; matrixMode:"live_feed_adapter_readiness_preview"; matrixId:string; createdAt:string; token:{symbol:string;name:string}; matrixDecision:"blocked"|"review_required"|"operator_preview"; liveFeedReady:false; feeds:{id:"holders"|"orderbook"|"contract"|"osint"|"market"|"source_freshness";label:string;state:"missing"|"stale"|"partial"|"preview";score:number;nextAction:string}[]; operatorSummary:string; customerBoundary:string; };
const SCHEMA="vlm-brain-live-feed-adapter-matrix-v1-pass230" as const;
function c(v:unknown,f="live feed adapter review required",l=260){return String(v??f).replace(/[\u0000-\u001f\u007f]/g," ").replace(/\s+/g," ").trim().slice(0,l)||f}
function id(v:string){return c(v,"VLM-LIVE-FEED-MATRIX",230).toUpperCase().replace(/[^A-Z0-9-]+/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"")}
export function buildVlmBrainLiveFeedAdapterMatrix(mesh:VlmBrainLiveAdapterFreshnessMesh,result:TokenRiskResult): VlmBrainLiveFeedAdapterMatrix{
 const createdAt=result.generatedAt??mesh.createdAt??new Date().toISOString();
 const quality=result.dataQuality;
 const feeds=[
  {id:"holders" as const,label:"Holder graph feed",state:"missing" as const,score:28,nextAction:"Connect holder clustering adapter before whale/cluster claims."},
  {id:"orderbook" as const,label:"Orderbook depth feed",state:"missing" as const,score:30,nextAction:"Connect depth/spread/slippage adapter before exit-liquidity wording."},
  {id:"contract" as const,label:"Contract control feed",state:"partial" as const,score:quality==="live"?58:42,nextAction:"Attach owner/proxy/mint/pause/blacklist/tax source evidence."},
  {id:"osint" as const,label:"OSINT narrative feed",state:"stale" as const,score:36,nextAction:"Attach social/KOL disclosure and narrative source ledger."},
  {id:"market" as const,label:"Market tape feed",state:quality==="live"?"preview" as const:"partial" as const,score:quality==="live"?72:50,nextAction:"Keep source timestamp and stale/missing-data copy visible."},
  {id:"source_freshness" as const,label:"Source freshness mesh",state:mesh.decision==="internal_preview"?"preview" as const:mesh.decision==="operator_review"?"partial" as const:mesh.decision==="refresh_required"?"stale" as const:"missing" as const,score:Math.max(0,100-mesh.hardStopCount*18-mesh.refreshRequiredCount*8),nextAction:"Refresh expired/stale source lanes and persist snapshot ids."},
 ];
 const missing=feeds.filter(f=>f.state==="missing").length;
 const stale=feeds.filter(f=>f.state==="stale").length;
 return {schemaVersion:SCHEMA,matrixMode:"live_feed_adapter_readiness_preview",matrixId:id(`VLM-LIVE-FEED-${mesh.token.symbol}-${mesh.meshId}-${createdAt}`),createdAt,token:mesh.token,matrixDecision:missing>0?"blocked":stale>0?"review_required":"operator_preview",liveFeedReady:false,feeds,operatorSummary:"Live feed matrix exposes holder/orderbook/contract/OSINT gaps so missing data cannot look neutral.",customerBoundary:"Live feed matrix is an internal readiness layer; missing feeds must not become confident customer claims."};
}
export const PASS230_VLM_BRAIN_LIVE_FEED_ADAPTER_MATRIX_CONTRACT = true;
