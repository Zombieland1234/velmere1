import type { TokenRiskResult } from "./risk-types";
import type { VlmBrainReleaseQaScorecard } from "./vlm-brain-release-qa-scorecard";
export type VlmBrainWalletAccessGateMatrix = { schemaVersion:"vlm-brain-wallet-access-gate-matrix-v1-pass231"; gateMode:"wallet_access_preview_no_seed"; gateId:string; createdAt:string; token:{symbol:string;name:string}; accessDecision:"blocked"|"review_only"; walletConnectReady:false; seedPhraseAllowed:false; lanes:{id:"basic"|"pro"|"advanced"|"wallet"|"session";label:string;state:"preview"|"review"|"blocked";nextAction:string}[]; operatorSummary:string; customerBoundary:string; };
const SCHEMA="vlm-brain-wallet-access-gate-matrix-v1-pass231" as const;
function c(v:unknown,f="wallet access gate review required",l=260){return String(v??f).replace(/[\u0000-\u001f\u007f]/g," ").replace(/\s+/g," ").trim().slice(0,l)||f}
function id(v:string){return c(v,"VLM-WALLET-ACCESS",220).toUpperCase().replace(/[^A-Z0-9-]+/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"")}
export function buildVlmBrainWalletAccessGateMatrix(qa:VlmBrainReleaseQaScorecard,result:TokenRiskResult): VlmBrainWalletAccessGateMatrix{
 const createdAt=result.generatedAt??qa.createdAt??new Date().toISOString();
 const lanes=[
  {id:"basic" as const,label:"Basic access",state:"preview" as const,nextAction:"Keep Basic as lightweight preview with fewer source lanes and no ROI language."},
  {id:"pro" as const,label:"Pro access",state:"review" as const,nextAction:"Require account/session gate before Pro review surfaces deeper source context."},
  {id:"advanced" as const,label:"Advanced access",state:"review" as const,nextAction:"Gate Orbit 360 Advanced behind utility/access framing, not token profit framing."},
  {id:"wallet" as const,label:"Wallet connect",state:"blocked" as const,nextAction:"Never request seed phrase/private key; use wallet signature/session only after explicit implementation."},
  {id:"session" as const,label:"Session entitlement",state:"blocked" as const,nextAction:"Connect server-side entitlement/session checks before unlocking paid/access tiers."},
 ];
 return {schemaVersion:SCHEMA,gateMode:"wallet_access_preview_no_seed",gateId:id(`VLM-WALLET-ACCESS-${qa.token.symbol}-${qa.scorecardId}-${createdAt}`),createdAt,token:qa.token,accessDecision:"blocked",walletConnectReady:false,seedPhraseAllowed:false,lanes,operatorSummary:"Access gate matrix keeps Basic/Pro/Advanced as UI preview until wallet/session entitlement is implemented without seed phrase flow.",customerBoundary:"VLM access is utility/intelligence access only, not an ROI promise, public sale claim or investment recommendation."};
}
export const PASS231_VLM_BRAIN_WALLET_ACCESS_GATE_MATRIX_CONTRACT = true;
