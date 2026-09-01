#!/usr/bin/env python3
from __future__ import annotations
import argparse,csv,json,hashlib
from pathlib import Path
REV="VELMERE_PASS36_A102R44P45_ACTION_REQUIRED_CONTINUOUS_CURRENT_STATE_CONTEXT_QUALIFIED_INTERACTION_ORDERING_PUBLIC_CONTROL_DELTA_NO_LIVE_CREDIT"
SCENARIOS=[
 {"id":"TIMELOCK_BOUNDED_CONTEXT","truth":"BOUNDED_CONTEXT_REVIEW","finding":False,"severity":"NOT_APPLICABLE","expected":"Do not call vulnerable; show bounded review note and require business-logic review."},
 {"id":"FLASH_MINT_SETTLEMENT","truth":"BOUNDED_CONTEXT_REVIEW","finding":False,"severity":"NOT_APPLICABLE","expected":"Do not call reentrancy vulnerability; show checked temporary-mint settlement and independent review boundary."},
 {"id":"UNSAFE_STATE_AFTER_CALL","truth":"KNOWN_SYNTHETIC_RISK","finding":True,"severity":"HIGH","expected":"Detect interaction-before-state-effect and provide checks-effects-interactions/reentrancy remediation."},
 {"id":"SAFE_REENTRANCY_GUARD","truth":"KNOWN_SYNTHETIC_CONTROL","finding":False,"severity":"NOT_APPLICABLE","expected":"No reentrancy finding; disclose that absence of a finding is not proof of safety."},
 {"id":"UNGUARDED_BOOTSTRAP_INITIALIZER","truth":"KNOWN_SYNTHETIC_RISK","finding":True,"severity":"HIGH","expected":"Detect unguarded initializer even when named bootstrap/configure."},
]
PERSONAS=[
 {"id":"BEGINNER","focus":"plain-language comprehension","base":62},
 {"id":"PROTOCOL_FOUNDER","focus":"decision and remediation utility","base":70},
 {"id":"SECURITY_ENGINEER","focus":"evidence and false-positive discipline","base":78},
 {"id":"PROCUREMENT_COMPLIANCE","focus":"claims, liability and refund risk","base":66},
]
TIERS=["Basic","Pro","Advanced"]
REVIEWERS=[
 ("A","Vulnerability Researcher"),("B","Sceptical Auditor"),("C","Exploitability Reviewer"),("D","Remediation Reviewer"),("E","Customer Report Reviewer"),("F","Claims / Legal-risk Reviewer"),("G","False-Negative Hunter"),("H","False-Positive Hunter"),("I","Severity Challenger"),("J","Protocol / Business Logic Reviewer"),("K","Data Provenance Reviewer"),("L","Adversarial Product Reviewer"),
]
def digest(obj):return hashlib.sha256(json.dumps(obj,sort_keys=True,separators=(",",":"),ensure_ascii=False).encode()).hexdigest()
def customer_row(sc,p,t):
 bonus={"Basic":0,"Pro":8,"Advanced":3}[t]
 penalty=0
 if t=="Advanced": penalty=10
 comprehension=max(0,min(100,p["base"]+bonus-(6 if sc["truth"]=="BOUNDED_CONTEXT_REVIEW" and p["id"]=="BEGINNER" else 0)))
 utility=max(0,min(100,p["base"]+bonus+(4 if p["id"] in {"PROTOCOL_FOUNDER","SECURITY_ENGINEER"} and t=="Pro" else 0)-penalty))
 trust=max(0,min(100,74+bonus-(15 if t=="Advanced" else 0)+(4 if sc["truth"]=="BOUNDED_CONTEXT_REVIEW" else 0)))
 confusion=max(0,100-comprehension)
 refund="HIGH" if t=="Advanced" else ("MEDIUM" if t=="Pro" and p["id"]=="PROCUREMENT_COMPLIANCE" else "LOW")
 status="AI_SIMULATED"
 row={"schemaVersion":"velmere.r44p45.ai-customer-session.v1","revisionId":REV,"classification":status,"scenarioId":sc["id"],"personaId":p["id"],"personaFocus":p["focus"],"tier":t,"journeyCompletion":100,"comprehension":comprehension,"decisionUtility":utility,"trust":trust,"confusion":confusion,"dropOffRisk":"HIGH" if confusion>=40 else "MEDIUM" if confusion>=25 else "LOW","tierValue":"STRONGER_EVIDENCE" if t=="Pro" else "UNPROVEN_PROFESSIONAL_DELTA" if t=="Advanced" else "USEFUL_FREE_PRESCREEN","refundRisk":refund,"expectationMismatch":"HUMAN_REVIEW_AND_ACCURACY_NOT_PROVEN" if t=="Advanced" else "NONE_MATERIAL" if t=="Basic" else "ACCURACY_DELTA_NOT_PROVEN","purchaseIntentSimulation":"NO_PUBLIC_PURCHASE" if t!="Basic" else "USE_FREE","externalHumanProofCredit":0,"realWillingnessToPayCredit":0,"notes":sc["expected"]}
 row["evidenceSha256"]=digest(row);return row
def reviewer_row(sc,code,name):
 verdict="CONFIRM_SYNTHETIC_FINDING" if sc["finding"] else "DO_NOT_CONFIRM_VULNERABILITY"
 if sc["truth"]=="BOUNDED_CONTEXT_REVIEW": verdict="BOUNDED_CONTEXT_REVIEW_REQUIRED"
 fn_candidate=code=="G" and sc["id"] in {"SAFE_REENTRANCY_GUARD","TIMELOCK_BOUNDED_CONTEXT"}
 fp_candidate=code=="H" and sc["truth"]=="BOUNDED_CONTEXT_REVIEW"
 severity_dispute=code=="I" and sc["finding"]
 row={"schemaVersion":"velmere.r44p45.ai-reviewer-assessment.v1","revisionId":REV,"classification":"AI_SIMULATED","reviewerCode":code,"reviewerRole":name,"scenarioId":sc["id"],"blindedToOtherReviewers":True,"verdict":verdict,"falseNegativeCandidate":fn_candidate,"falsePositiveCandidate":fp_candidate,"severityDispute":severity_dispute,"recommendedSeverity":"MEDIUM_OR_HIGH_REQUIRES_HUMAN_ADJUDICATION" if severity_dispute else sc["severity"],"exploitability":"NOT_PROVEN","independentReviewerCredit":0,"externalHumanProofCredit":0,"rationale":sc["expected"]}
 row["evidenceSha256"]=digest(row);return row
def main():
 ap=argparse.ArgumentParser();ap.add_argument("--output",required=True);args=ap.parse_args();out=Path(args.output);out.mkdir(parents=True,exist_ok=True)
 customers=[customer_row(sc,p,t) for sc in SCENARIOS for p in PERSONAS for t in TIERS]
 reviewers=[reviewer_row(sc,*rv) for sc in SCENARIOS for rv in REVIEWERS]
 summary={"schemaVersion":"velmere.r44p45.ai-panels-summary.v1","revisionId":REV,"classification":"AI_SIMULATED","customerSessions":len(customers),"reviewerAssessments":len(reviewers),"scenarios":len(SCENARIOS),"personas":len(PERSONAS),"tiers":len(TIERS),"reviewerRoles":len(REVIEWERS),"averageComprehension":round(sum(r["comprehension"] for r in customers)/len(customers),2),"averageDecisionUtility":round(sum(r["decisionUtility"] for r in customers)/len(customers),2),"averageTrust":round(sum(r["trust"] for r in customers)/len(customers),2),"falseNegativeCandidates":sum(r["falseNegativeCandidate"] for r in reviewers),"falsePositiveCandidates":sum(r["falsePositiveCandidate"] for r in reviewers),"severityDisputes":sum(r["severityDispute"] for r in reviewers),"realParticipants":0,"externalReviewers":0,"customerProofCredit":0,"independentReviewerCredit":0,"realWillingnessToPayCredit":0,"saleCredit":False,"liveCredit":False,"limitations":["The panel is deterministic AI-simulated evidence, not real customer research.","Reviewer roles are generated by one model process and are not organizationally independent.","Candidates require external human adjudication before becoming formal FP/FN or severity evidence."]}
 for key in ["averageComprehension","averageDecisionUtility","averageTrust"]:
  if isinstance(summary[key], float) and summary[key].is_integer(): summary[key]=int(summary[key])
 summary["evidenceSha256"]=digest(summary)
 (out/"R44P45_AI_CUSTOMER_SESSIONS.json").write_text(json.dumps(customers,indent=2,ensure_ascii=False)+"\n")
 (out/"R44P45_AI_REVIEWER_ASSESSMENTS.json").write_text(json.dumps(reviewers,indent=2,ensure_ascii=False)+"\n")
 (out/"R44P45_AI_PANELS_SUMMARY.json").write_text(json.dumps(summary,indent=2,ensure_ascii=False)+"\n")
 for name,rows in [("R44P45_AI_CUSTOMER_SESSIONS.csv",customers),("R44P45_AI_REVIEWER_ASSESSMENTS.csv",reviewers)]:
  with (out/name).open("w",newline="",encoding="utf-8") as f:
   w=csv.DictWriter(f,fieldnames=sorted({k for r in rows for k in r}));w.writeheader();w.writerows(rows)
 print(json.dumps(summary,ensure_ascii=False))
if __name__=="__main__":main()
