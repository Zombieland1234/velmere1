import type { VlmBrainDurableSnapshotPlan } from "./vlm-brain-durable-snapshot-plan";
import type { VlmBrainSourceLedgerUiPreview } from "./vlm-brain-source-ledger-ui-preview";
export type VlmBrainLedgerPersistenceAdapterPlan = { schemaVersion:"vlm-brain-ledger-persistence-adapter-plan-v1-pass229"; adapterMode:"server_only_persistence_plan"; adapterPlanId:string; createdAt:string; token:{symbol:string;name:string}; persistenceDecision:"blocked"|"server_adapter_required"; rawPayloadAllowed:false; adapters:{id:string;label:string;target:string;state:"blocked"|"server_required";nextAction:string}[]; operatorSummary:string; customerBoundary:string; };
const SCHEMA="vlm-brain-ledger-persistence-adapter-plan-v1-pass229" as const;
function c(v:unknown,f="ledger persistence review required",l=260){return String(v??f).replace(/[\u0000-\u001f\u007f]/g," ").replace(/\s+/g," ").trim().slice(0,l)||f}
function id(v:string){return c(v,"VLM-LEDGER-PERSISTENCE",240).toUpperCase().replace(/[^A-Z0-9-]+/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"")}
export function buildVlmBrainLedgerPersistenceAdapterPlan(ledger:VlmBrainSourceLedgerUiPreview,durable:VlmBrainDurableSnapshotPlan): VlmBrainLedgerPersistenceAdapterPlan{
 const createdAt=ledger.createdAt??durable.createdAt??new Date().toISOString();
 const adapters=durable.writes.map(write=>({id:write.id,label:write.label,target:write.storageTarget,state:write.state==="blocked"?"blocked" as const:"server_required" as const,nextAction:write.nextWriteStep}));
 return {schemaVersion:SCHEMA,adapterMode:"server_only_persistence_plan",adapterPlanId:id(`VLM-LEDGER-PERSISTENCE-${ledger.token.symbol}-${ledger.ledgerPreviewId}-${createdAt}`),createdAt,token:ledger.token,persistenceDecision:adapters.some(a=>a.state==="blocked")?"blocked":"server_adapter_required",rawPayloadAllowed:false,adapters,operatorSummary:"Persistence plan maps every source/case/redaction/export write to a server-only adapter; browser/localStorage proof is not accepted.",customerBoundary:"Persistence adapter plan is internal operational readiness evidence only."};
}
export const PASS229_VLM_BRAIN_LEDGER_PERSISTENCE_ADAPTER_PLAN_CONTRACT = true;
