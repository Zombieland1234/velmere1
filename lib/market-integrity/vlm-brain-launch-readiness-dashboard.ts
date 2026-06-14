import type { VlmBrainBrowserQaRunbook } from "./vlm-brain-browser-qa-runbook";
import type { VlmBrainCustomerCopySanitizer } from "./vlm-brain-customer-copy-sanitizer";
import type { VlmBrainLedgerPersistenceAdapterPlan } from "./vlm-brain-ledger-persistence-adapter-plan";
import type { VlmBrainLiveFeedAdapterMatrix } from "./vlm-brain-live-feed-adapter-matrix";
import type { VlmBrainPdfRouteContract } from "./vlm-brain-pdf-route-contract";
import type { VlmBrainReleaseBlockerResolver } from "./vlm-brain-release-blocker-resolver";
import type { VlmBrainWalletAccessGateMatrix } from "./vlm-brain-wallet-access-gate-matrix";
export type VlmBrainLaunchReadinessDashboard = { schemaVersion:"vlm-brain-launch-readiness-dashboard-v1-pass232"; dashboardMode:"operator_launch_readiness_preview"; dashboardId:string; createdAt:string; token:{symbol:string;name:string}; launchDecision:"blocked"|"review_required"; overallScore:number; publicLaunchReady:false; zipCheckpointRecommended:true; lanes:{id:string;label:string;state:"blocked"|"review"|"preview";score:number;nextAction:string}[]; operatorSummary:string; customerBoundary:string; };
const SCHEMA="vlm-brain-launch-readiness-dashboard-v1-pass232" as const;
function c(v:unknown,f="launch readiness review required",l=260){return String(v??f).replace(/[\u0000-\u001f\u007f]/g," ").replace(/\s+/g," ").trim().slice(0,l)||f}
function id(v:string){return c(v,"VLM-LAUNCH-READINESS",240).toUpperCase().replace(/[^A-Z0-9-]+/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"")}
function clamp(n:number){return Math.max(0,Math.min(100,Math.round(Number.isFinite(n)?n:0)))}
export function buildVlmBrainLaunchReadinessDashboard(resolver:VlmBrainReleaseBlockerResolver, browser:VlmBrainBrowserQaRunbook, copy:VlmBrainCustomerCopySanitizer, pdf:VlmBrainPdfRouteContract, persistence:VlmBrainLedgerPersistenceAdapterPlan, live:VlmBrainLiveFeedAdapterMatrix, wallet:VlmBrainWalletAccessGateMatrix): VlmBrainLaunchReadinessDashboard{
 const createdAt=wallet.createdAt??live.createdAt??new Date().toISOString();
 const lanes=[
  {id:"blockers",label:"Release blockers",state:resolver.resolverDecision==="blocked"?"blocked" as const:"review" as const,score:100-resolver.p0Count*18-resolver.p1Count*8,nextAction:"Resolve P0/P1 blockers before customer routes."},
  {id:"browser",label:"Browser QA",state:"review" as const,score:browser.qaDecision==="blocked"?35:48,nextAction:"Run Vercel browser QA and attach trace."},
  {id:"copy",label:"Customer copy",state:copy.copyDecision==="blocked"?"blocked" as const:"review" as const,score:copy.redactionScore,nextAction:"Finalize sanitized anomaly/review copy."},
  {id:"pdf",label:"PDF route",state:pdf.routeDecision==="download_blocked"?"blocked" as const:"review" as const,score:pdf.htmlPreviewReady?58:34,nextAction:"Keep binary PDF disabled until generator/storage/redaction exists."},
  {id:"persistence",label:"Durable persistence",state:persistence.persistenceDecision==="blocked"?"blocked" as const:"review" as const,score:persistence.persistenceDecision==="blocked"?34:48,nextAction:"Implement server-only durable adapters."},
  {id:"live_feeds",label:"Live feeds",state:live.matrixDecision==="blocked"?"blocked" as const:"review" as const,score:live.feeds.reduce((s,f)=>s+f.score,0)/live.feeds.length,nextAction:"Connect holder/orderbook/contract/OSINT adapters."},
  {id:"wallet",label:"Wallet/access",state:wallet.accessDecision==="blocked"?"blocked" as const:"review" as const,score:36,nextAction:"Implement entitlement/session gate without seed phrase flow."},
 ];
 const overallScore=clamp(lanes.reduce((s,l)=>s+l.score,0)/lanes.length);
 const launchDecision=lanes.some(l=>l.state==="blocked")?"blocked":"review_required";
 return {schemaVersion:SCHEMA,dashboardMode:"operator_launch_readiness_preview",dashboardId:id(`VLM-LAUNCH-READINESS-${wallet.token.symbol}-${resolver.resolverId}-${createdAt}`),createdAt,token:wallet.token,launchDecision,overallScore,publicLaunchReady:false,zipCheckpointRecommended:true,lanes,operatorSummary:"Launch readiness stays blocked until browser QA, durable stores, live feeds, PDF route and wallet/session gates are connected.",customerBoundary:"Launch dashboard is internal operator readiness only; it is not a public proof, safety certificate or trading recommendation."};
}
export const PASS232_VLM_BRAIN_LAUNCH_READINESS_DASHBOARD_CONTRACT = true;
