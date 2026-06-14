import type { VlmBrainReleaseBlockerResolver } from "./vlm-brain-release-blocker-resolver";
import type { VlmBrainReleaseQaScorecard } from "./vlm-brain-release-qa-scorecard";
export type VlmBrainBrowserQaStep = { id: "modal_layer" | "orbit_motion" | "tile_drawer" | "search_portal" | "keyboard" | "mobile" | "webgl_compare"; label: string; state: "required" | "review" | "blocked"; priority: "P0" | "P1" | "P2"; nextAction: string; evidence: string; };
export type VlmBrainBrowserQaRunbook = { schemaVersion: "vlm-brain-browser-qa-runbook-v1-pass226"; runbookMode: "operator_browser_qa_preview"; runbookId: string; createdAt: string; token: { symbol: string; name: string }; qaDecision: "blocked" | "browser_required"; browserTraceRequired: true; publicExportReady: false; steps: VlmBrainBrowserQaStep[]; requiredStepCount: number; operatorSummary: string; customerBoundary: string; };
const SCHEMA = "vlm-brain-browser-qa-runbook-v1-pass226" as const;
function c(v: unknown, f="browser QA review required", l=240){return String(v??f).replace(/[\u0000-\u001f\u007f]/g," ").replace(/\s+/g," ").trim().slice(0,l)||f}
function id(v:string){return c(v,"VLM-BROWSER-QA",220).toUpperCase().replace(/[^A-Z0-9-]+/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"")}
function step(input: VlmBrainBrowserQaStep): VlmBrainBrowserQaStep { return { ...input, label:c(input.label,"QA step",110), nextAction:c(input.nextAction), evidence:c(input.evidence,"capture evidence",220) }; }
export function buildVlmBrainBrowserQaRunbook(resolver: VlmBrainReleaseBlockerResolver, qa: VlmBrainReleaseQaScorecard): VlmBrainBrowserQaRunbook {
 const createdAt = qa.createdAt ?? resolver.createdAt ?? new Date().toISOString();
 const steps = [
  step({id:"modal_layer",label:"Token modal layering",state:"required",priority:"P0",nextAction:"Verify VLM drawer, search suggestions and chart modal are not clipped by parent overflow.",evidence:"Screenshot + console trace on /pl Shield modal."}),
  step({id:"orbit_motion",label:"Orbit motion FPS",state:"review",priority:"P1",nextAction:"Compare DOM Orbit FPS with WebGL prototype and record motion quality state.",evidence:"FPS trace from gated QA HUD or browser Performance panel."}),
  step({id:"tile_drawer",label:"Tile drawer read flow",state:"required",priority:"P0",nextAction:"Open several tiles, test ESC, arrows, scroll lock and pause-on-read.",evidence:"Manual QA notes attached to case timeline."}),
  step({id:"search_portal",label:"Shield search portal",state:"review",priority:"P1",nextAction:"Search BTC/ETH/SOL and verify dropdown stays above Shield Investigator.",evidence:"Screenshot with dropdown over lower panels."}),
  step({id:"keyboard",label:"Keyboard accessibility",state:"review",priority:"P1",nextAction:"Run tab order, focus ring and escape/arrow navigation on modal and drawer.",evidence:"Keyboard checklist stored as operator-only note."}),
  step({id:"mobile",label:"Mobile downgrade",state:"review",priority:"P2",nextAction:"Verify static/reduced-motion fallback and drawer width on mobile viewport.",evidence:"Mobile screenshot with no clipped detail panel."}),
  step({id:"webgl_compare",label:"WebGL comparison gate",state:resolver.resolverDecision === "blocked" ? "blocked" : "review",priority:"P1",nextAction:"Enable NEXT_PUBLIC_VLM_BRAIN_RENDERER=webgl-prototype only in QA and compare input latency.",evidence:"QA-only renderer trace, not customer-facing copy."}),
 ];
 return { schemaVersion:SCHEMA, runbookMode:"operator_browser_qa_preview", runbookId:id(`VLM-BROWSER-QA-${resolver.token.symbol}-${resolver.resolverId}-${createdAt}`), createdAt, token:resolver.token, qaDecision:resolver.resolverDecision === "blocked" ? "blocked" : "browser_required", browserTraceRequired:true, publicExportReady:false, steps, requiredStepCount:steps.filter(s=>s.state==="required"||s.state==="blocked").length, operatorSummary:"Browser QA runbook is required before public export, PDF route or renderer migration.", customerBoundary:"Browser QA is internal release evidence. It is not a safety certificate or final token verdict." };
}
export const PASS226_VLM_BRAIN_BROWSER_QA_RUNBOOK_CONTRACT = true;
