#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { buildVlmCommercialReadinessMatrix } from "../../lib/commerce/vlm-commercial-readiness.ts";
import { buildCurrentR44P22CommercialEvidence } from "../../lib/commerce/vlm-r44p22-commercial-evidence.ts";

const args=process.argv.slice(2); const value=(flag)=>{const i=args.indexOf(flag);return i>=0?args[i+1]:null;};
const output=value("--output"); if(!output) throw new Error("--output required");
const families=["audit","pdf","browser","shield","shield-map","real-markets","market-impact","whale-watch","angel","risk"];
const evidenceByFamily=Object.fromEntries(families.map(f=>[f,buildCurrentR44P22CommercialEvidence(f)]));
const readiness=buildVlmCommercialReadinessMatrix({locale:"pl",evidenceByFamily});
const score={
 audit:{technology:93,security:92,data:86,ux:82,value:82,trust:78},
 pdf:{technology:96,security:95,data:84,ux:87,value:83,trust:82},
 browser:{technology:94,security:93,data:76,ux:88,value:79,trust:80},
 shield:{technology:91,security:92,data:50,ux:86,value:58,trust:62},
 "shield-map":{technology:92,security:90,data:40,ux:91,value:43,trust:55},
 "real-markets":{technology:88,security:88,data:43,ux:85,value:50,trust:54},
 "market-impact":{technology:85,security:87,data:38,ux:82,value:55,trust:52},
 "whale-watch":{technology:84,security:86,data:36,ux:80,value:50,trust:50},
 angel:{technology:92,security:93,data:58,ux:84,value:75,trust:69},
 risk:{technology:87,security:92,data:52,ux:80,value:70,trust:66},
};
const tierDelta={basic:"Complete free core, not a teaser.",pro:"Must add measurable depth, workflow and evidence beyond Basic.",advanced:"Must add independently reviewed professional workflow, not more pages."};
const decision=(family,tier)=> tier==="basic" ? "PREPARE_FREE_RELEASE_ACTION_REQUIRED" : family==="audit"||family==="pdf" ? tier==="pro"?"INVITATION_ONLY_BETA_AFTER_CURRENT_BYTE_QA_AND_MANUAL_QA":"NOT_FOR_SALE" : "NOT_FOR_SALE";
const buy=(family,tier)=> tier==="basic"?"YES_IF_FREE_AND_LIMITATIONS_ARE_CLEAR":(tier==="pro"&&(family==="audit"||family==="pdf"))?"ONLY_IN_CONTROLLED_BETA_WITH_MANUAL_QA":"NO";
const maxPrice=(family,tier)=> tier==="basic"?0:null;
const betaHypothesis=(family,tier)=>tier==="pro"&&(family==="audit"||family==="pdf")?49:null;
const refundRisk=(family,tier)=>tier==="basic"?"LOW":(family==="audit"||family==="pdf")?"HIGH_WITHOUT_MANUAL_QA_AND_SCOPE_CONFIRMATION":"VERY_HIGH";
const priority=(family,tier)=>tier==="basic"?"P1":(tier==="pro"&&(family==="audit"||family==="pdf"))?"P0":"P1";
const rows=readiness.map(r=>({
 family:r.family,tier:r.tier,...score[r.family],realCustomerValuePct:score[r.family].value,
 tierDelta:tierDelta[r.tier],fieldDeliverabilityPct:r.fieldCompletionBps/100,coreDeliverable:r.coreDeliverable,
 deliveryMode:r.deliveryMode,gateCompletionPct:r.gateCompletionBps/100,freeReadinessPct:r.tier==="basic"?r.freeReleaseReadinessBps/100:null,
 betaReadinessPct:r.betaReadinessBps==null?null:r.betaReadinessBps/100,paidSaleReadinessPct:r.paidSaleReadinessBps==null?null:r.paidSaleReadinessBps/100,
 currentByteReleaseClosure:false,saleEnabled:false,decision:decision(r.family,r.tier),blockers:r.blockers.slice(0,12),hiddenFields:r.hiddenFieldIds,
 concreteFix:r.blockers.slice(0,3).map(x=>x.replace(/^missing_gate:/u,"Close gate: ").replace(/^field_blocked:/u,"Deliver or safely hide field: ")),
 wouldBuy:buy(r.family,r.tier),maxHonestPublicPriceEur:maxPrice(r.family,r.tier),controlledBetaOneTimePriceHypothesisEur:betaHypothesis(r.family,r.tier),
 willingnessToPayEvidence:"MISSING",refundRisk:refundRisk(r.family,r.tier),repairPriority:priority(r.family,r.tier),
 }));
const result={schemaVersion:"velmere.pass36.a102r44p22.ruthless-product-tier-table.v1",revisionId:"VELMERE_PASS36_A102R44P22_ACTION_REQUIRED_RUTHLESS_CUSTOMER_SECURE_PAID_PREVIEW_RISK_TIER_SPLIT_CROSS_ASSET_AND_LEGAL_DATA_ALTERNATIVES_NO_LIVE_CREDIT",generatedAt:"2026-08-06T00:00:00.000Z",globalDecision:"NO_GO",saleEnabled:false,rows,
 summary:{rows:rows.length,basicRows:rows.filter(x=>x.tier==="basic").length,proRows:rows.filter(x=>x.tier==="pro").length,advancedRows:rows.filter(x=>x.tier==="advanced").length,readyForPublicPaidSale:0,publicPricesPublished:0},
 truthBoundary:"Scores are a ruthless engineering/product assessment, not customer survey, certification, willingness-to-pay proof or sale approval. Current-byte exact build/browser/PDF closure is false after R44P22 changes."};
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,`${JSON.stringify(result,null,2)}\n`);console.log(JSON.stringify(result.summary,null,2));
