#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const REVISION="VELMERE_PASS36_A102R44P22_ACTION_REQUIRED_RUTHLESS_CUSTOMER_SECURE_PAID_PREVIEW_RISK_TIER_SPLIT_CROSS_ASSET_AND_LEGAL_DATA_ALTERNATIVES_NO_LIVE_CREDIT";
const personas=[
  ["beginner-investor","Początkujący inwestor","simple language and no false safety signal"],
  ["experienced-trader","Doświadczony trader","freshness, speed and explicit unavailable data"],
  ["token-founder","Twórca tokena","pre-launch findings and remediation"],
  ["smart-contract-auditor","Audytor smart kontraktów","methodology, false negatives and reproducibility"],
  ["web3-developer","Developer Web3","technical evidence and actionable fixes"],
  ["advanced-company","Firma rozważająca Advanced","professional workflow and team value"],
  ["fund-research","Fundusz / research team","provenance, repeatability and history"],
  ["skeptical-customer","Sceptyczny klient","reasons not to buy and refund risk"],
  ["competitor-comparison","Klient porównujący konkurencję","material differentiation from free tools"],
  ["mobile-user","Użytkownik mobilny","touch, layout and low cognitive load"],
  ["slow-network-user","Użytkownik ze słabym łączem","bounded loading and recoverable failures"],
  ["multilingual-user","Użytkownik PL/EN/DE","semantic locale parity"],
  ["bad-input-user","Błędne lub sprzeczne dane","fail-closed and clear recovery"],
  ["paywall-attacker","Próba obejścia paywalla","no paid content before entitlement"],
  ["refund-delete-user","Niezadowolony klient / refund / delete","revocation, refund and data rights"],
];
const steps=[
  ["first-impression","pierwsze wrażenie"],
  ["home-understanding","zrozumienie strony głównej"],
  ["module-selection","wybór modułu"],
  ["data-entry","wprowadzenie danych"],
  ["loading","loading i oczekiwanie"],
  ["error-handling","obsługa błędów"],
  ["result-reception","odbiór wyniku"],
  ["score-understanding","zrozumienie scoringu"],
  ["evidence-discovery","znalezienie dowodów"],
  ["tier-comparison","porównanie tierów"],
  ["paid-preview","podgląd Pro i Advanced"],
  ["login","logowanie"],
  ["checkout","checkout"],
  ["access-grant","nadanie dostępu"],
  ["pdf-download","pobranie PDF"],
  ["account-return","ponowne wejście na konto"],
  ["access-revocation","cofnięcie dostępu"],
  ["cancellation","anulowanie"],
  ["refund","refund"],
  ["account-delete","usunięcie konta"],
];
const runtimeLocal=new Set(["first-impression","module-selection","data-entry","loading","error-handling","paid-preview"]);
const externalBlocked=new Set(["checkout","access-grant","access-revocation","cancellation","refund","account-delete"]);
const securityCritical=new Set(["paid-preview","checkout","access-grant","pdf-download","access-revocation"]);

function rowFor(persona,step){
  const [personaId,personaName,concern]=persona;
  const [stepId,stepName]=step;
  const blocked=externalBlocked.has(stepId);
  const runtime=runtimeLocal.has(stepId);
  const status=blocked?"BLOCKED":runtime?"RUNTIME_TESTED":"STATICALLY_TESTED";
  const problem=blocked
    ? "Disposable staging and real provider/customer operations are not physically proven."
    : stepId==="paid-preview"
      ? "Preview is server-redacted and separate, but full cross-browser staging IDOR/refund replay remains open."
      : stepId==="score-understanding"
        ? "Confidence and evidence completeness can still be misunderstood without comprehension testing."
        : stepId==="tier-comparison"
          ? "Pro and Advanced value is described, but willingness-to-pay is not customer-proven."
          : "No blocking defect in the current static/local contract; real-person comprehension remains unproven.";
  const severity=blocked?(securityCritical.has(stepId)?"P0":"P1"):(stepId==="score-understanding"||stepId==="tier-comparison"?"P1":"P2");
  return {
    personaId,persona:personaName,personaConcern:concern,stepId,step:stepName,
    expectation:`The ${personaName} can complete ${stepName} with clear evidence, provenance and limitations.`,
    actual:blocked?"The code path and local contracts exist, but the real staging/customer lifecycle is not proven.":runtime?"Implemented and executed in a bounded local/runtime contract.":"Implemented and verified by source-level or deterministic contract tests.",
    problem,severity,
    purchaseImpact:blocked?"HIGH":stepId==="tier-comparison"?"HIGH":"MEDIUM",
    trustImpact:securityCritical.has(stepId)?"HIGH":stepId==="score-understanding"?"HIGH":"MEDIUM",
    refundImpact:blocked&&["refund","cancellation","access-revocation"].includes(stepId)?"HIGH":"LOW",
    implementation:stepId==="paid-preview"
      ? "Separate server-redacted JSON/PDF preview, PREVIEW watermark, no-store, query allowlist and no full paid material."
      : blocked
        ? "Execute disposable staging lifecycle with signed receipts, isolated tenants and fail-closed rollback."
        : "Preserve explicit fact/derived/assumption/missing-proof states and add persona comprehension evidence.",
    acceptanceTest:stepId==="paid-preview"
      ? "No report ID, target, source, token, entitlement, exploit detail or full finding appears in HTML, JSON, PDF, cache or browser storage."
      : blocked
        ? "A real staging receipt proves success, wrong-account denial, revocation and rollback without production mutation."
        : "The persona completes the step and correctly explains scope, evidence, limitations and next action.",
    status,
  };
}
const rows=personas.flatMap((persona)=>steps.map((step)=>rowFor(persona,step)));
const summary={
  rows:rows.length,personas:personas.length,stepsPerPersona:steps.length,
  byStatus:Object.fromEntries([...new Set(rows.map((row)=>row.status))].sort().map((status)=>[status,rows.filter((row)=>row.status===status).length])),
  bySeverity:Object.fromEntries([...new Set(rows.map((row)=>row.severity))].sort().map((severity)=>[severity,rows.filter((row)=>row.severity===severity).length])),
};
const result={schemaVersion:"velmere.pass36.a102r44p22.ruthless-customer-matrix.v1",revisionId:REVISION,globalDecision:"NO_GO",saleEnabled:false,customerProven:false,summary,rows};
const outIndex=process.argv.indexOf("--output");
if(outIndex>=0){const out=process.argv[outIndex+1];if(!out)throw new Error("output_path_required");fs.mkdirSync(path.dirname(path.resolve(out)),{recursive:true});fs.writeFileSync(path.resolve(out),JSON.stringify(result,null,2)+"\n");}
console.log(JSON.stringify(result,null,2));
