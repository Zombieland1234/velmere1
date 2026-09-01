#!/usr/bin/env python3
from __future__ import annotations
import argparse, csv, hashlib, json, os, re, sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

SCHEMA = "velmere.pass36.a102r44p44.brutal-product-reality.v1"
REVISION = "VELMERE_PASS36_A102R44P44_ACTION_REQUIRED_BRUTAL_PRODUCT_REALITY_50_CONTRACT_ANGEL120_PERSONA100_FULL_QA_TEST_CYCLE_3_OF_3_NO_LIVE_CREDIT"
PARENT = "VELMERE_PASS36_A102R44P43_ACTION_REQUIRED_PUBLIC_BALANCED_HOLDOUT_LEGACY_COMPILER_AST_AND_CONTROL_ALERT_RATE_TEST_CYCLE_2_OF_3_NO_LIVE_CREDIT"
OBSERVED_AT = "2026-08-10T00:00:00.000Z"

def dump(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")

def write_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fields: list[str] = []
    seen = set()
    for row in rows:
        for key in row:
            if key not in seen:
                fields.append(key); seen.add(key)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            cooked = {k: json.dumps(v, ensure_ascii=False, sort_keys=True) if isinstance(v,(dict,list)) else v for k,v in row.items()}
            writer.writerow(cooked)

def sha256_file(path: Path) -> str:
    h=hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda:f.read(1024*1024),b""):h.update(chunk)
    return h.hexdigest()

def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))

def feature(status: str, evidence: str, value: str, blocker: str = "", target: str = "") -> dict[str,str]:
    return {"status":status,"evidence":evidence,"customerValue":value,"blocker":blocker,"worldClassTarget":target}

def build_tier_truth() -> list[dict[str,Any]]:
    rows=[]
    audit_features={
      "contract identity / source binding": [
        feature("IMPLEMENTED_TESTED","compiler source bundle and packet binding","identifies exact analyzed source","real-chain deployed bytecode still absent","real RPC source↔runtime binding"),
        feature("IMPLEMENTED_TESTED","same truth plus expanded evidence","reproducible technical review","independent review absent","two-reviewer source/deployment adjudication"),
        feature("IMPLEMENTED_NOT_SELLABLE","traceability structure only","professional evidence workspace candidate","Advanced is NOT_FOR_SALE","signed reviewer workflow and SLA")],
      "compiler AST / IR": [
        feature("OFFLINE_PROVEN_BOUNDED","legacy + modern compiler AST lanes","stronger than regex prescreen","40/69 SmartBugs families unsupported","multi-version whole-protocol semantic analysis"),
        feature("OFFLINE_PROVEN_BOUNDED","same finding truth, deeper evidence","better review context","no independent accuracy","independent balanced holdout"),
        feature("OFFLINE_PROVEN_BOUNDED","same finding truth, full evidence register","technical traceability","no material detection delta","cross-contract IR + business logic")],
      "official fuzz / invariants": [
        feature("IMPLEMENTED_LOCAL_ONLY","Foundry 1.7.1 local corpus","replayable local counterexamples","developer-owned corpus","unseen protocol invariants and fork replay"),
        feature("IMPLEMENTED_LOCAL_ONLY","counterexamples included in evidence","faster technical triage","not real protocol proof","replayable real protocol exploit/fix verification"),
        feature("PLANNED","workflow scaffolding","professional review candidate","0 independently reviewed invariant campaigns","two-reviewer invariant adjudication")],
      "finding identity / severity": [
        feature("PARTIAL","bounded rule severity","prioritizes review","severity accuracy unmeasured","category-specific severity agreement"),
        feature("PARTIAL","same finding truth, more context","stronger remediation review","no severity adjudication","two-reviewer severity range"),
        feature("MISSING_PROFESSIONAL_PROOF","not sellable","none yet","0/2 reviewers","formal adjudication and sign-off")],
      "confidence": [
        feature("IMPLEMENTED","NOT_CALIBRATED","avoids fake certainty","no calibrated probability","evidence-quality confidence only"),
        feature("IMPLEMENTED","NOT_CALIBRATED + evidence completeness","clearer uncertainty","no independent calibration","calibrated evidence quality, never price-derived"),
        feature("NOT_FOR_SALE","no premium truth boost","prevents manipulation","professional calibration missing","independent calibration governance")],
      "manual review": [
        feature("NOT_INCLUDED","explicit copy","clear boundary","not a human audit","optional external referral workflow"),
        feature("REQUIRED_BEFORE_BETA_DELIVERY","policy, not proven operations","reduces refund/accuracy risk","no contracted reviewers/capacity","documented reviewer qualifications and QA"),
        feature("NOT_INCLUDED_NOT_FOR_SALE","customer path blocked","prevents false promise","no reviewer team/SLA","two-reviewer professional service")],
      "remediation / next safe action": [
        feature("IMPLEMENTED_BOUNDED","finding remediation strings","actionable prescreen","not independently validated","fix tests and re-audit workflow"),
        feature("IMPLEMENTED_BOUNDED","evidence + remediation","developer usefulness","fix review absent","fix review with reproduced closure"),
        feature("PLANNED","workflow structures","team workflow candidate","no customer-proven outcome","signed re-audit and closure ledger")],
      "customer delivery": [
        feature("TARGET_FREE_ACTION_REQUIRED","Browser/PDF engineering","free prescreen candidate","current pass full QA pending","limited public prescreen after release closure"),
        feature("INVITATION_ONLY_BLOCKED","entitlement and redaction boundaries","controlled pilot candidate","real willingness-to-pay 0","manual-QA pilot outcomes"),
        feature("NOT_FOR_SALE","hard fail-closed","none yet","no professional delta","professional SLA + reviewers + collaboration")],
    }
    for fname, vals in audit_features.items():
        for tier, val in zip(["Basic","Pro","Advanced"], vals): rows.append({"product":"Audit","tier":tier,"feature":fname,**val})

    report_features=[
      ("finding truth parity","IMPLEMENTED_TESTED","same findings/severity across tiers","prevents pay-to-truth","independent semantic QA missing"),
      ("evidence depth","IMPLEMENTED","Basic summary / Pro evidence / Advanced registers","real tier delta in explanation","Advanced customer use unproven"),
      ("preview redaction","IMPLEMENTED_TESTED_LOCAL","separate redacted artifact","reduces paid-content leakage","external two-account staging absent"),
      ("signed download / entitlement","IMPLEMENTED_LOCAL","server-bound short-lived links","account isolation","real storage/KMS staging absent"),
      ("PDF format safety","IMPLEMENTED_TESTED_PARENT","A4/fonts/ToUnicode/no active content","safe document format","current-child corpus pending"),
      ("customer semantics","PARTIAL","fact/derived/missing labels","reduces misinterpretation","real comprehension 0"),
    ]
    for product in ["PDF","Browser"]:
      for feature_name,status,evidence,value,blocker in report_features:
        for tier in ["Basic","Pro","Advanced"]:
          decision="FREE_ACTION_REQUIRED" if tier=="Basic" else "INVITATION_ONLY" if tier=="Pro" else "NOT_FOR_SALE"
          rows.append({"product":product,"tier":tier,"feature":feature_name,"status":status,"evidence":evidence,"customerValue":value,"blocker":blocker,"worldClassTarget":"real customer parity and accessibility cohort","decision":decision})

    # Standalone products: tier column means report-context presentation, not a separate SKU.
    standalone = {
      "Shield": ["identity/on-chain permissions","source provenance","freshness/stale/conflict","liquidity/holder context","provider outage fail-closed"],
      "Shield Pro": ["terminal workflow","order-book evidence","cross-source contradiction","history/export","alerts/operations"],
      "Shield Map": ["UNCLASSIFIED default","label provenance","graph concentration","label correction","cross-chain identity"],
      "Real Markets": ["multi-asset identity","price/change/volume","history/timeframes","corporate events/fundamentals","provider rights/freshness"],
      "Market Impact": ["input mode truth","spread/depth","slippage assumptions","uncertainty","predicted-vs-realized outcomes"],
      "Whale Watch": ["transfer-not-trade","label provenance","unknown addresses","bridge/exchange/mixer handling","freshness/correction SLA"],
      "Angel": ["standalone truth","abstention","fact/inference/unknown","prompt security","multilingual context"],
      "Risk Indicator": ["descriptive risk only","technical vs market vs data","missing-data refusal","same-data same-score","calibration/outcomes"],
    }
    for product, features in standalone.items():
      for fname in features:
        if product in {"Shield","Shield Pro","Shield Map","Real Markets"}:
          status="PARTIAL_SYNTHETIC_OR_REFERENCE"; blocker="rights-approved current data coverage is zero"
        elif product=="Market Impact": status="SIMULATION_ONLY"; blocker="real order-book and realized outcomes absent"
        elif product=="Whale Watch": status="ONCHAIN_FACTS_PARTIAL"; blocker="signed labels, monitoring and correction SLA absent"
        elif product=="Angel": status="IMPLEMENTED_BOUNDARY_TESTED"; blocker="live independent answer evals 0/300"
        else: status="DESCRIPTIVE_ONLY"; blocker="outcome calibration absent"
        rows.append({"product":product,"tier":"Standalone","feature":fname,"status":status,"evidence":"current source + inherited targeted evidence","customerValue":"bounded informational value","blocker":blocker,"worldClassTarget":"real data, external operations and independent customer proof","decision":"FREE_ACTION_REQUIRED" if product!="Shield Pro" else "NOT_FOR_SALE"})
    return rows

def select_contracts(holdout: Path) -> list[dict[str,Any]]:
    positives=[]; controls=[]
    for p in sorted((holdout/"positive-cases").glob("*.json")):
        j=load_json(p); j["_path"]=str(p); positives.append(j)
    for p in sorted((holdout/"control-cases").glob("*.json")):
        j=load_json(p); j["_path"]=str(p); controls.append(j)
    # Diversity: round-robin positive categories, then 15 controls.
    by=defaultdict(list)
    for j in positives: by[j.get("category","UNKNOWN")].append(j)
    chosen=[]
    while len(chosen)<35 and any(by.values()):
        for cat in sorted(by):
            if by[cat] and len(chosen)<35: chosen.append(by[cat].pop(0))
    chosen += controls[:15]
    if len(chosen)!=50: raise RuntimeError(f"contract selection {len(chosen)}")
    return chosen

def contract_tier_rows(cases: list[dict[str,Any]]) -> list[dict[str,Any]]:
    rows=[]
    for j in cases:
        kind="CONTROL_CANDIDATE" if j["caseId"].startswith("OZ5_") else "PUBLIC_VULNERABLE"
        expected = [] if kind=="CONTROL_CANDIDATE" else j.get("expectedRuleIds",[])
        actual = j.get("rootRuleIds",[]) if kind=="CONTROL_CANDIDATE" else j.get("observedRuleIds",[])
        matched = [] if kind=="CONTROL_CANDIDATE" else j.get("matchedRuleIds",[])
        result = j.get("resultStatus") or ("CONTROL_ALERT" if actual else "CONTROL_NO_ALERT")
        withheld = str(result).startswith("WITHHELD")
        unsupported = result=="UNSUPPORTED_DETECTOR_FAMILY"
        misses = [] if kind=="CONTROL_CANDIDATE" else sorted(set(expected)-set(matched)) if not unsupported and not withheld else []
        false_alarm = bool(actual) if kind=="CONTROL_CANDIDATE" else False
        severity = "NOT_ADJUDICATED"
        findings = j.get("rootFindings",[]) if kind=="CONTROL_CANDIDATE" else j.get("findings",[])
        if findings:
            severity = ",".join(sorted({str(x.get("severity","unknown")).upper() for x in findings}))
        category = j.get("category") or "OPENZEPPELIN_CONTROL"
        source = j.get("sourceMetadata",{}).get("sourcePath") or j.get("rootPath")
        for tier in ["Basic","Pro","Advanced"]:
            usefulness = {
              "Basic":"brief prescreen: observed signals, withheld/unsupported and next safe check",
              "Pro":"same truth plus evidence excerpts, limitations and remediation; manual QA required",
              "Advanced":"same truth plus full registers; NOT_FOR_SALE and no human review included",
            }[tier]
            rows.append({
              "caseId":j["caseId"],"kind":kind,"category":category,"sourcePath":source,"compilerVersion":j.get("compilerVersion"),
              "tier":tier,"expectedSignals":expected,"actualSignals":actual,"matchedSignals":matched,"misses":misses,
              "falseAlarmCandidate":false_alarm,"withheld":withheld,"unsupported":unsupported,"resultStatus":result,
              "evidenceQuality":"PUBLIC_PINNED_BOUNDED_NO_TWO_REVIEWER_GROUND_TRUTH","severity":severity,
              "confidence":"NOT_CALIBRATED","exploitability":"NOT_PROVEN","customerUsefulness":usefulness,
              "findingTruthSameAcrossTiers":True,"customerProof":0,"saleCredit":False,"worldClassCredit":False,
            })
    return rows

def persona_specs() -> list[dict[str,Any]]:
    archetypes=[
      ("beginner crypto investor","retail","low","anxious","understand token risk"),
      ("beginner ETF investor","retail","low","calm","compare funds"),
      ("experienced spot trader","trading","medium","impatient","fresh market context"),
      ("leveraged trader","trading","high","euphoric","seek certainty"),
      ("long-term holder","retail","medium","patient","monitor structural risk"),
      ("degen meme trader","trading","high","hyped","fast answer"),
      ("Solidity developer","web3 engineering","medium","technical","fix findings"),
      ("protocol architect","web3 engineering","high","skeptical","cross-contract review"),
      ("security researcher","security","high","adversarial","find false negatives"),
      ("token founder","web3 founder","high","defensive","launch readiness"),
      ("startup founder","business","medium","budget constrained","choose Pro"),
      ("enterprise buyer","enterprise","low","skeptical","procurement evidence"),
      ("risk manager","finance","low","methodical","risk governance"),
      ("compliance officer","legal/compliance","low","cautious","claims and rights"),
      ("fund researcher","institutional","medium","analytical","repeatable provenance"),
      ("portfolio manager","institutional","medium","time pressured","decision support"),
      ("journalist","media","medium","skeptical","verify claims"),
      ("lawyer","legal","low","skeptical","legal blockers"),
      ("procurement analyst","enterprise","low","price sensitive","scope comparison"),
      ("angry refund customer","support","medium","angry","refund/delete"),
      ("confused nontechnical user","retail","low","confused","plain language"),
      ("impatient mobile user","retail","medium","impatient","finish quickly"),
      ("screen-reader user","accessibility","low","patient","accessible flow"),
      ("slow-network user","accessibility","medium","frustrated","recover from latency"),
      ("high-value audit buyer","enterprise","low","demanding","professional assurance"),
    ]
    locales=["pl","en","de","en"]
    budgets=["0 EUR","49 EUR","500 EUR","5000+ EUR"]
    specs=[]
    for i in range(100):
        a=archetypes[i%len(archetypes)]
        specs.append({"personaId":f"PERSONA_{i+1:03d}","archetype":a[0],"industry":a[1],"riskTolerance":a[2],"emotion":a[3],"goal":a[4],"locale":locales[i%len(locales)],"budget":budgets[(i//len(archetypes))%len(budgets)],"technicalLevel":["none","basic","advanced","expert"][i%4],"timePressure":["low","medium","high"][i%3],"skepticism":["low","medium","high"][((i//3)%3)]})
    return specs

def persona_journeys(specs:list[dict[str,Any]]) -> list[dict[str,Any]]:
    steps=["landing","registration","login","profile","choose_product","audit_basic","upgrade_intent_pro","advanced_check","shield","real_markets","browser","angel","pdf","account","checkout","wrong_account","provider_error","slow_network","refresh_back_forward","logout","return_visit","refund","delete_account","dsar"]
    rows=[]
    for p in specs:
      for step in steps:
        status="STATIC_OR_RETAINED_LOCAL_EVIDENCE"
        result="bounded flow appears implementable but not customer-proven"
        blocker="real moderated participant absent"
        if step in {"checkout","refund","delete_account","dsar"}: status="BLOCKED_EXTERNAL"; result="no real provider/customer lifecycle credit"; blocker="Stripe/storage/email/DSAR staging and real user required"
        if step=="advanced_check": status="PASS_FAIL_CLOSED"; result="Advanced NOT_FOR_SALE; no public price, checkout or human-review claim"; blocker="professional service not implemented"
        if step=="angel": status="BOUNDARY_TESTED_NO_LIVE_MODEL_QUALITY"; result="standalone, client tier ignored, safety/advice boundaries tested"; blocker="independent model-answer evaluation 0/300"
        if step=="real_markets": status="REFERENCE_ONLY"; result="missing data is withheld; real current rights-approved coverage remains zero"; blocker="provider rights and current data"
        if step=="shield": status="REFERENCE_OR_ONCHAIN_PARTIAL"; result="identity/fail-closed architecture; real provider coverage zero"; blocker="rights-approved provider and labels"
        rows.append({**p,"step":step,"status":status,"actualResult":result,"trustRisk":"high" if status.startswith("BLOCKED") else "medium","dropOffRisk":"high" if step in {"checkout","advanced_check","provider_error"} else "medium","pricingExpectation":"free Basic; Pro only if reviewed; no Advanced sale","unansweredQuestion":blocker,"customerProofCredit":0})
    return rows


def ai_customer_panel(specs:list[dict[str,Any]], journeys:list[dict[str,Any]]) -> list[dict[str,Any]]:
    """Internal model simulation only. Never grants human/customer/willingness-to-pay credit."""
    by=defaultdict(list)
    for row in journeys: by[row["personaId"]].append(row)
    status_score={
      "PASS_FAIL_CLOSED":90,
      "STATIC_OR_RETAINED_LOCAL_EVIDENCE":65,
      "BOUNDARY_TESTED_NO_LIVE_MODEL_QUALITY":55,
      "REFERENCE_OR_ONCHAIN_PARTIAL":42,
      "REFERENCE_ONLY":36,
      "BLOCKED_EXTERNAL":10,
    }
    rows=[]
    for p in specs:
      steps=by[p["personaId"]]
      internal=sum(status_score.get(x["status"],25) for x in steps)/max(1,len(steps))
      blocked=sum(x["status"]=="BLOCKED_EXTERNAL" for x in steps)
      reference=sum(x["status"] in {"REFERENCE_ONLY","REFERENCE_OR_ONCHAIN_PARTIAL"} for x in steps)
      clarity=max(0,min(100,round(internal+8-blocked*1.5-reference*1.2,2)))
      trust=max(0,min(100,round(internal-blocked*2-reference*1.5,2)))
      rows.append({
        **p,
        "panelClass":"AI_SIMULATED_CUSTOMER_INTERNAL_ONLY",
        "journeySteps":len(steps),
        "blockedExternalSteps":blocked,
        "referenceOnlySteps":reference,
        "simulatedJourneyScore":round(internal,2),
        "simulatedClarityScore":clarity,
        "simulatedTrustScore":trust,
        "simulatedWouldContinue":"YES_WITH_LIMITS" if internal>=55 else "UNCERTAIN_OR_NO",
        "simulatedPaidIntent":"PRO_ONLY_AFTER_MANUAL_QA" if p["budget"]!="0 EUR" and internal>=55 else "NO_VALIDATED_PAID_INTENT",
        "realHumanParticipant":False,
        "customerProofCredit":0,
        "willingnessToPayCredit":0,
        "saleCredit":False,
        "worldClassCredit":False,
        "limitations":"Generated by the same AI workstream from deterministic evidence; not an independent human observation."
      })
    return rows

def ai_reviewer_panel() -> list[dict[str,Any]]:
    roles=[
      ("smart-contract-auditor","accuracySemanticTruth",-8,"Real-protocol false-negative review and severity adjudication are missing."),
      ("application-security-lead","securityPrivacy",0,"Local boundaries are broad; real two-tenant staging and IdP evidence are missing."),
      ("ai-safety-reviewer","accuracySemanticTruth",-6,"Angel has boundary tests but no live independent answer-quality corpus."),
      ("market-data-lead","dataProvenance",-16,"Shield and Real Markets have zero rights-approved current-data coverage."),
      ("legal-engineering-reviewer","legalClaims",-12,"Provider redistribution, caching, financial-advice and consumer-law claims require professional review."),
      ("product-value-reviewer","uxPsychology",-8,"Pro has bounded evidence depth; Advanced lacks a proven professional outcome delta."),
      ("accessibility-reviewer","uxPsychology",-2,"Automated mobile/browser checks exist; real assistive-technology participants are absent."),
      ("sre-incident-reviewer","operations",-10,"External provider loss, backup/restore, incident and 72-hour observation are incomplete."),
      ("payments-identity-reviewer","securityPrivacy",-10,"Stripe-mock and local lifecycle are not real Stripe TEST or real IdP evidence."),
      ("institutional-buyer","customerProof",-18,"No SLA, external reviewer team, customer outcomes or procurement proof."),
      ("skeptical-retail-customer","uxPsychology",-5,"Basic can be useful if unknown/withheld states remain prominent and free."),
      ("evidence-methodology-reviewer","accuracySemanticTruth",-7,"Strong receipts do not by themselves prove semantic correctness or generalization."),
    ]
    products={
      "Audit Basic":68,"Audit Pro":70,"Audit Advanced":66,
      "PDF Basic":80,"PDF Pro":81,"PDF Advanced":77,
      "Browser Basic":83,"Browser Pro":79,"Browser Advanced":76,
      "Shield":54,"Shield Pro":43,"Shield Map":55,"Real Markets":42,
      "Market Impact":50,"Whale Watch":56,"Angel":66,"Risk Indicator":57,
    }
    rows=[]
    for role,dimension,penalty,global_finding in roles:
      for product,baseline in products.items():
        product_penalty=penalty
        if role=="market-data-lead" and product not in {"Shield","Shield Pro","Shield Map","Real Markets","Market Impact","Whale Watch"}: product_penalty=-2
        if role=="ai-safety-reviewer" and product!="Angel": product_penalty=-1
        if role=="smart-contract-auditor" and not product.startswith("Audit"): product_penalty=-1
        if role=="payments-identity-reviewer" and product not in {"PDF Pro","Browser Pro","Audit Pro"}: product_penalty=-3
        score=max(0,min(100,baseline+product_penalty))
        rows.append({
          "reviewerRole":role,
          "panelClass":"AI_SIMULATED_REVIEWER_INTERNAL_ONLY",
          "product":product,
          "focusDimension":dimension,
          "baselineInternalScore":baseline,
          "simulatedReviewerScore":round(score,2),
          "verdict":"BLOCKED_OR_ACTION_REQUIRED" if score<70 else "BOUNDED_POSITIVE_WITH_BLOCKERS",
          "primaryFinding":global_finding,
          "independentHumanReviewer":False,
          "independentReviewerCredit":0,
          "customerProofCredit":0,
          "saleCredit":False,
          "worldClassCredit":False,
          "limitations":"Same-model simulated review; useful for adversarial ideation, never independent assurance."
        })
    return rows

def human_external_evidence_status() -> list[dict[str,Any]]:
    return [
      {"evidenceClass":"real_customer_participants","required":100,"current":0,"score":0,"status":"BLOCKED_EXTERNAL","canAiSimulationSatisfy":False},
      {"evidenceClass":"independent_audit_reviewers","required":2,"current":0,"score":0,"status":"BLOCKED_EXTERNAL","canAiSimulationSatisfy":False},
      {"evidenceClass":"moderated_customer_comprehension","required":1,"current":0,"score":0,"status":"BLOCKED_EXTERNAL","canAiSimulationSatisfy":False},
      {"evidenceClass":"willingness_to_pay_observations","required":1,"current":0,"score":0,"status":"BLOCKED_EXTERNAL","canAiSimulationSatisfy":False},
      {"evidenceClass":"real_customer_pdf_deliveries","required":50,"current":0,"score":0,"status":"BLOCKED_EXTERNAL","canAiSimulationSatisfy":False},
      {"evidenceClass":"independent_angel_evaluations","required":300,"current":0,"score":0,"status":"BLOCKED_EXTERNAL","canAiSimulationSatisfy":False},
      {"evidenceClass":"professional_legal_review","required":1,"current":0,"score":0,"status":"BLOCKED_EXTERNAL","canAiSimulationSatisfy":False},
    ]

def two_track_evidence_score(ai_customers:list[dict[str,Any]], ai_reviewers:list[dict[str,Any]], human:list[dict[str,Any]]) -> dict[str,Any]:
    customer_score=sum(r["simulatedJourneyScore"] for r in ai_customers)/max(1,len(ai_customers))
    reviewer_score=sum(r["simulatedReviewerScore"] for r in ai_reviewers)/max(1,len(ai_reviewers))
    ai_score=round((customer_score*0.55)+(reviewer_score*0.45),2)
    human_score=round(sum(r["score"] for r in human)/max(1,len(human)),2)
    return {
      "schemaVersion":"velmere.r44p44.two-track-evidence-score.v1",
      "aiSimulatedPanel":{
        "customerPersonas":len(ai_customers),
        "reviewerRows":len(ai_reviewers),
        "score":ai_score,
        "classification":"INTERNAL_MODEL_PANEL",
        "maximumContributionToInternalReadinessPoints":5,
        "customerProofCredit":0,
        "independentReviewerCredit":0,
        "saleCredit":False,
        "worldClassCredit":False,
      },
      "realHumanExternal":{
        "score":human_score,
        "realParticipants":0,
        "independentReviewers":0,
        "customerProof":0,
        "willingnessToPay":0,
      },
      "formula":"AI panel may contribute at most five points to an internal readiness view. It cannot change human Customer Proof, independent review, saleEnabled, LIVE or worldClassProven.",
    }

def source_claim_scan(source:Path) -> list[dict[str,Any]]:
    terms=re.compile(r"\b(best|safest|safe|secure|accurate|verified|real[- ]?time|world[- ]?class|professional|institutional|guaranteed|guarantee|risk[- ]?free|complete|live|AI[- ]?powered)\b",re.I)
    rows=[]
    roots=[source/"app",source/"components",source/"messages",source/"lib/server"]
    for root in roots:
      if not root.exists(): continue
      for p in root.rglob("*"):
        if not p.is_file() or p.suffix.lower() not in {".ts",".tsx",".js",".mjs",".json"}: continue
        try: lines=p.read_text(encoding="utf-8",errors="replace").splitlines()
        except Exception: continue
        for n,line in enumerate(lines,1):
          for m in terms.finditer(line):
            low=line.lower()
            context="NEGATIVE_OR_INTERNAL" if any(x in low for x in ["not for sale","do not claim","cannot claim","false","data-pass","test","fixture","no live","not live","never claim"]) else "CUSTOMER_CLAIM_REVIEW_REQUIRED"
            rows.append({"path":p.relative_to(source).as_posix(),"line":n,"term":m.group(0),"context":context,"snippet":line.strip()[:500],"evidenceState":"NOT_AUTOMATICALLY_PROVEN","action":"review/downgrade unless exact evidence binding exists"})
    return rows

def security_matrix() -> list[dict[str,Any]]:
    items=[
      ("authentication","session/account binding","IMPLEMENTED_LOCAL","real IdP and cross-device revocation absent"),
      ("authorization","wrong-user report/IDOR","IMPLEMENTED_LOCAL_TESTS","two real tenants staging absent"),
      ("CSRF","same-origin and route guards","IMPLEMENTED","full browser attack suite pending"),
      ("XSS/HTML injection","sanitization/CSP/output filtering","IMPLEMENTED_TESTED_LOCAL","third-party widget surface review pending"),
      ("SSRF","URL/provider controls","PARTIAL","real provider egress allowlist staging absent"),
      ("command injection","bounded runners/no user shell","PARTIAL_TESTED","full untrusted upload corpus pending"),
      ("path/ZIP traversal","packaging/extraction verifiers","IMPLEMENTED_TESTED","ZIP bomb/resource exhaustion needs dedicated caps"),
      ("symlink/TOCTOU","descriptor and regular-file boundaries","IMPLEMENTED_TESTED_LOCAL","multi-process staging race drill absent"),
      ("prototype pollution","strict JSON/key guards","IMPLEMENTED_TESTED","dependency transitive review ongoing"),
      ("CORS/CSP/headers","production smoke checks","PARENT_PROVEN_CURRENT_PENDING","external edge/Vercel proof absent"),
      ("rate limiting/bot abuse","route limits and abuse shield","IMPLEMENTED","distributed enforcement/load proof absent"),
      ("credential stuffing","rate controls","PARTIAL","real IdP controls absent"),
      ("large payload/DoS","bounded JSON and route budgets","IMPLEMENTED_PARTIAL","system load and memory leak soak absent"),
      ("secrets/source maps","package scanning","IMPLEMENTED_TESTED","production deployment scan absent"),
      ("checkout/webhook","idempotency/replay model","MOCK_OR_LOCAL_ONLY","real Stripe TEST 0/12"),
      ("entitlement substitution","server-bound context","IMPLEMENTED_LOCAL","real parallel accounts staging absent"),
      ("signed report download","short-lived account-bound design","IMPLEMENTED_LOCAL","real storage/KMS provider absent"),
      ("service worker/cache","no-store policies","PARTIAL","full multi-tab/browser cache matrix pending"),
    ]
    return [{"domain":a,"control":b,"status":c,"blocker":d,"customerCredit":0,"externalProof":False} for a,b,c,d in items]

def provider_rights() -> list[dict[str,Any]]:
    return [
      {"source":"SEC EDGAR / data.sec.gov","observedAt":"2026-08-10","publicTermsFinding":"SEC exposes unauthenticated JSON APIs and bulk archives, but automated access must follow SEC fair-access/privacy/security rules; the API page does not by itself grant every downstream redistribution or paid-display right.","commercialUse":"FIELD_LEVEL_LEGAL_REVIEW_REQUIRED","redistribution":"RIGHTS_UNVERIFIED_FOR_CUSTOMER_RESale","caching":"BULK_ARCHIVES_AVAILABLE__RETENTION_POLICY_STILL_REQUIRED","attribution":"SOURCE_AND_FILING_PROVENANCE_REQUIRED","rateLimits":"FAIR_ACCESS_POLICY_REQUIRED","status":"CANDIDATE_NOT_AUTO_APPROVED","officialSource":"https://www.sec.gov/search-filings/edgar-application-programming-interfaces"},
      {"source":"ECB / ESCB public statistics","observedAt":"2026-08-10","publicTermsFinding":"Public ESCB statistics may be reused free of charge for commercial or non-commercial use when the source is quoted and the statistics/metadata are not modified; third-party data is excluded.","commercialUse":"ALLOWED_FOR_ELIGIBLE_PUBLIC_ESCB_STATISTICS","redistribution":"ALLOWED_SUBJECT_TO_ATTRIBUTION_INTEGRITY_AND_THIRD_PARTY_EXCLUSIONS","caching":"OPERATIONAL_RETENTION_POLICY_REQUIRED","attribution":"REQUIRED","rateLimits":"DATA_PORTAL_TECHNICAL_POLICY_REVIEW_REQUIRED","status":"CANDIDATE_RIGHTS_APPROVED_PER_DATASET_ONLY","officialSource":"https://www.ecb.europa.eu/stats/ecb_statistics/governance_and_quality_framework/html/usage_policy.en.html"},
      {"source":"EIA Open Data","observedAt":"2026-08-10","publicTermsFinding":"EIA data and information products are generally public domain and may be used or distributed with acknowledgement; protected third-party materials and the EIA logo are excluded. API registration/terms and service limits still apply.","commercialUse":"GENERALLY_ALLOWED_FOR_EIA_PUBLIC_DOMAIN_DATA","redistribution":"GENERALLY_ALLOWED_WITH_ACKNOWLEDGEMENT__THIRD_PARTY_EXCLUSIONS","caching":"ALLOWED_SUBJECT_TO_UPDATE_AND_ATTRIBUTION_POLICY","attribution":"RECOMMENDED_WITH_PUBLICATION_DATE","rateLimits":"API_TERMS_AND_SERVICE_AVAILABILITY_RULES_APPLY","status":"CANDIDATE_RIGHTS_APPROVED_PER_SERIES_ONLY","officialSource":"https://www.eia.gov/about/copyrights_reuse.php"},
      {"source":"Own Ethereum node / JSON-RPC","observedAt":"2026-08-10","publicTermsFinding":"Operating an execution/consensus node avoids a third-party RPC service licence for protocol facts, but entity labels, token metadata, off-chain enrichments and customer claims remain separate rights/provenance problems.","commercialUse":"ONCHAIN_PROTOCOL_FACTS_CANDIDATE","redistribution":"RAW_OR_DERIVED_DISPLAY_POLICY_REQUIRED","caching":"CONTROLLED_BY_VELMERE_WITH_REORG_AND_RETENTION_RULES","attribution":"CHAIN_BLOCK_HASH_TIMESTAMP_AND_CLIENT_PROVENANCE_REQUIRED","rateLimits":"SELF_OPERATED_CAPACITY_AND_ABUSE_LIMITS","status":"BEST_LOW_DEPENDENCY_LANE","officialSource":"https://ethereum.org/en/developers/docs/apis/json-rpc/"},
      {"source":"Alchemy","observedAt":"2026-08-10","publicTermsFinding":"Public terms grant use for internal business purposes and prohibit resale, third-party use, competitive benchmarking/development and use beyond expressly granted scope unless agreed in writing.","commercialUse":"INTERNAL_BUSINESS_USE_ONLY_BY_DEFAULT","redistribution":"SEPARATE_WRITTEN_AGREEMENT_REQUIRED","caching":"CONTRACT_AND_PRODUCT_SPECIFIC_REVIEW_REQUIRED","attribution":"CONTRACT_SPECIFIC","rateLimits":"LICENSED_VOLUME_AND_PLAN_LIMITS","status":"FAIL_CLOSED_FOR_CUSTOMER_FACING_REDISTRIBUTION","officialSource":"https://legal.alchemy.com/"},
      {"source":"QuickNode","observedAt":"2026-08-10","publicTermsFinding":"Public terms prohibit sublicensing, selling, reselling, renting, distributing, transferring or allowing QuickNode Products for a third party's benefit. They do not establish a blanket right to redistribute provider responses inside a paid intelligence product.","commercialUse":"SERVICE_USE_ALLOWED_WITHIN_PLAN__CUSTOMER_DATA_PRODUCT_RIGHTS_UNVERIFIED","redistribution":"SEPARATE_WRITTEN_CONFIRMATION_REQUIRED","caching":"RIGHTS_UNVERIFIED","attribution":"CONTRACT_SPECIFIC","rateLimits":"API_CREDITS_AND_PLAN_LIMITS","status":"FAIL_CLOSED_FOR_REDISTRIBUTION","officialSource":"https://www.quicknode.com/terms"},
      {"source":"Etherscan API","observedAt":"2026-08-10","publicTermsFinding":"API terms updated 15 June 2026 restrict content to personal/non-commercial use by default and require separate written approval for commercial use, redistribution, extended caching/retention and specified AI evaluation/development uses.","commercialUse":"SEPARATE_WRITTEN_LICENCE_REQUIRED","redistribution":"SEPARATE_WRITTEN_LICENCE_REQUIRED","caching":"SEPARATE_WRITTEN_LICENCE_FOR_EXTENDED_RETENTION","attribution":"NOT_A_SUBSTITUTE_FOR_LICENCE","rateLimits":"REASONABLE_USAGE_AND_PLAN_RULES","status":"BLOCKED_UNLESS_CONTRACTED","officialSource":"https://etherscan.io/apiterms"},
      {"source":"Arkham labels/data","observedAt":"2026-08-10","publicTermsFinding":"No sufficiently specific public grant for Velmere's intended customer-facing label redistribution, caching and paid-product use was established in this pass.","commercialUse":"RIGHTS_UNVERIFIED","redistribution":"RIGHTS_UNVERIFIED","caching":"RIGHTS_UNVERIFIED","attribution":"RIGHTS_UNVERIFIED","rateLimits":"RIGHTS_UNVERIFIED","status":"FAIL_CLOSED","officialSource":"provider contract/terms review required"},
    ]

def competitor_matrix() -> list[dict[str,Any]]:
    return [
      {"category":"security audit","competitor":"OpenZeppelin","observedStrength":"expert manual review, business-logic understanding, fuzz/invariants, fix review","velmereGap":"0/2 independent reviewers; no customer-proven manual service","velmerePotential":"machine-verifiable provenance and evidence receipts","source":"https://www.openzeppelin.com/security-audits"},
      {"category":"security assurance","competitor":"Trail of Bits","observedStrength":"design assessment, smart-contract/node/bridge/DeFi review, fuzzing, static analysis and formal-verification strategy","velmereGap":"no comparable expert assurance team, formal methods programme or real-protocol track record","velmerePotential":"reproducible evidence packaging and cross-product provenance","source":"https://www.trailofbits.com/services/software-assurance/blockchain/"},
      {"category":"security audit","competitor":"ChainSecurity","observedStrength":"professional protocol audits and specialized security research","velmereGap":"no independently proven protocol accuracy or reviewer team","velmerePotential":"cross-link security, on-chain and market context","source":"https://www.chainsecurity.com/security-audits"},
      {"category":"security monitoring","competitor":"CertiK Skynet","observedStrength":"continuous monitoring and broad project coverage","velmereGap":"no continuous provider-backed coverage","velmerePotential":"explicit missing-proof/contradiction registers","source":"https://www.certik.com/products/skynet"},
      {"category":"wallet intelligence","competitor":"Nansen","observedStrength":"large proprietary wallet-label graph, smart-money and alerts","velmereGap":"signed labels, coverage and monitoring SLA absent","velmerePotential":"label provenance and correction ledger","source":"https://www.nansen.ai/"},
      {"category":"entity intelligence","competitor":"Arkham","observedStrength":"entity graph, labels, alerts and confidence distinctions","velmereGap":"no equivalent verified label operation","velmerePotential":"UNCLASSIFIED default plus auditable disputes","source":"https://arkm.com/"},
      {"category":"on-chain research","competitor":"Glassnode","observedStrength":"large metric/asset/history catalog","velmereGap":"real historical metrics and provider rights absent","velmerePotential":"security-context integration","source":"https://glassnode.com/"},
      {"category":"on-chain analytics","competitor":"Dune","observedStrength":"queryable multi-chain datasets, dashboards and data sharing","velmereGap":"no open query/data lineage ecosystem","velmerePotential":"signed customer report authenticity","source":"https://dune.com/"},
      {"category":"markets workflow","competitor":"TradingView","observedStrength":"mature charting, alerts, screeners and multi-device workflow","velmereGap":"real-time feeds and chart depth absent","velmerePotential":"evidence-first risk explanations","source":"https://www.tradingview.com/"},
      {"category":"research workflow","competitor":"Koyfin","observedStrength":"multi-asset research, dashboards, portfolio and client reporting","velmereGap":"fundamentals, events, exports and data rights incomplete","velmerePotential":"security/on-chain provenance in one report","source":"https://www.koyfin.com/"},
    ]

def deep_modules() -> dict[str,Any]:
    return {
      "marketImpact":{
        "have":["explicit input modes","SIMULATION_ONLY and WITHHELD states","spread/depth/assumption boundaries","no realized-slippage claim"],
        "proven":["local deterministic state handling","fail-closed on unusable order book"],
        "derived":["snapshot walk and scenario estimates"],
        "simulated":["fixture/user-supplied snapshot outcomes"],
        "unsupported":["hidden liquidity","queue position","market reaction","future liquidity","causal forecast"],
        "P0":["real L2 multi-venue corpus","predicted-vs-realized outcome error","stale/reordered book handling under provider failures"],
        "decision":"SIMULATION_ONLY_FREE_ACTION_REQUIRED"},
      "whaleWatch":{
        "have":["transfer-not-trade rule","UNCLASSIFIED default","label provenance model","correction/dispute scaffolding"],
        "proven":["local on-chain fact handling"],
        "unsupported":["continuous external monitoring","verified entity coverage","cross-chain deduplication outcomes","mixer/aggregator attribution accuracy"],
        "P0":["signed label registry","validity/expiry/revalidation","false-attribution metrics","correction SLA","reorg/double-count handling"],
        "decision":"ONCHAIN_FACTS_ONLY_FREE_ACTION_REQUIRED"},
      "shield":{
        "have":["chain/address identity","permission risk fields","stale/conflicted/failed states","reference catalog"],
        "realDataCredit":"0/318 rights-approved/current provider cases",
        "shieldProTruth":"terminal UI and workflow exist; real order-book depth and paid data value are not proven",
        "shieldMapTruth":"visual graph exists; verified labels and operational correction flow are not proven",
        "decision":"BASIC_REFERENCE_ONLY__PRO_NOT_FOR_SALE__MAP_DEMO_ONLY"},
      "realMarkets":{
        "assetClasses":["crypto","equities","ETF/funds","FX","commodities","REITs","indices"],
        "have":["reference identities","field state machine","freshness/conflict/missing handling","charts/UI scaffolding"],
        "realDataCredit":"0/583 rights-approved current evidence",
        "missing":["current quotes/history","corporate actions","session calendars","FX normalization","provider quorum","correction operations","fundamentals rights"],
        "decision":"REFERENCE_ONLY_FREE_ACTION_REQUIRED"},
    }

def main() -> int:
    ap=argparse.ArgumentParser()
    ap.add_argument("--source",required=True)
    ap.add_argument("--materials",required=True)
    ap.add_argument("--angel-receipt",required=True)
    ap.add_argument("--output",required=True)
    args=ap.parse_args()
    source=Path(args.source).resolve(); materials=Path(args.materials).resolve(); out=Path(args.output).resolve(); out.mkdir(parents=True,exist_ok=True)
    holdout=materials/"CURRENT_CHILD_EVIDENCE"/"HOLDOUT_RUN_1"
    angel=load_json(Path(args.angel_receipt))
    tier=build_tier_truth(); contracts=select_contracts(holdout); contract_rows=contract_tier_rows(contracts)
    specs=persona_specs(); journeys=persona_journeys(specs); ai_customers=ai_customer_panel(specs,journeys); ai_reviewers=ai_reviewer_panel(); human_evidence=human_external_evidence_status(); two_track=two_track_evidence_score(ai_customers,ai_reviewers,human_evidence); claims=source_claim_scan(source); security=security_matrix(); rights=provider_rights(); competitors=competitor_matrix(); deep=deep_modules()
    write_csv(out/"R44P44_TIER_TRUTH_MATRIX.csv",tier); dump(out/"R44P44_TIER_TRUTH_MATRIX.json",tier)
    write_csv(out/"R44P44_CONTRACT50_TIER150.csv",contract_rows); dump(out/"R44P44_CONTRACT50_TIER150.json",contract_rows)
    write_csv(out/"R44P44_PERSONA100_JOURNEY2400.csv",journeys); dump(out/"R44P44_PERSONA100_JOURNEY2400.json",journeys)
    write_csv(out/"R44P44_AI_SIMULATED_CUSTOMER_PANEL_100.csv",ai_customers); dump(out/"R44P44_AI_SIMULATED_CUSTOMER_PANEL_100.json",ai_customers)
    write_csv(out/"R44P44_AI_SIMULATED_REVIEWER_PANEL_12X17.csv",ai_reviewers); dump(out/"R44P44_AI_SIMULATED_REVIEWER_PANEL_12X17.json",ai_reviewers)
    write_csv(out/"R44P44_REAL_HUMAN_EXTERNAL_EVIDENCE_STATUS.csv",human_evidence); dump(out/"R44P44_REAL_HUMAN_EXTERNAL_EVIDENCE_STATUS.json",human_evidence)
    dump(out/"R44P44_TWO_TRACK_EVIDENCE_SCORECARD.json",two_track)
    write_csv(out/"R44P44_CLAIM_SCAN.csv",claims); dump(out/"R44P44_CLAIM_SCAN.json",claims)
    dump(out/"R44P44_SECURITY_AUTH_PAYMENT_MATRIX.json",security)
    dump(out/"R44P44_PROVIDER_RIGHTS_RESEARCH.json",rights)
    dump(out/"R44P44_COMPETITOR_BENCHMARK.json",competitors)
    dump(out/"R44P44_MARKET_IMPACT_WHALE_SHIELD_MARKETS_DEEP_AUDIT.json",deep)
    dump(out/"R44P44_ANGEL120_EVALUATION.json",angel)
    # Metrics with honest denominator separation.
    selected_positive=[r for r in contract_rows if r["tier"]=="Basic" and r["kind"]=="PUBLIC_VULNERABLE"]
    selected_controls=[r for r in contract_rows if r["tier"]=="Basic" and r["kind"]=="CONTROL_CANDIDATE"]
    analyzed=[r for r in selected_positive if not r["unsupported"] and not r["withheld"]]
    summary={
      "schemaVersion":SCHEMA,"revisionId":REVISION,"parentRevisionId":PARENT,"observedAt":OBSERVED_AT,"testCycle":"3/3",
      "sourceAuthority":"SOURCE_ONLY_ONLY","materialsMayOverwriteSource":False,
      "contractCorpus":{"uniqueContracts":50,"tierExecutions":150,"publicVulnerable":len(selected_positive),"publicControlCandidates":len(selected_controls),"analyzedSupported":len(analyzed),"withheld":sum(r["withheld"] for r in selected_positive),"unsupported":sum(r["unsupported"] for r in selected_positive),"formalPrecision":None,"formalFpr":None,"severityAccuracy":None,"exploitabilityAccuracy":None},
      "angel":{"cases":angel["cases"],"passed":angel["passed"],"failed":angel["failed"],"executionClass":angel["executionClass"],"liveModelCalls":0,"independentQualityCredit":0},
      "personas":{"syntheticPersonas":100,"journeyRows":len(journeys),"aiSimulatedPanelScore":two_track["aiSimulatedPanel"]["score"],"realParticipants":0,"customerProof":0,"willingnessToPay":0},
      "reviewers":{"aiSimulatedReviewerRoles":12,"aiSimulatedReviewerRows":len(ai_reviewers),"realIndependentReviewers":0,"independentReviewerCredit":0},
      "twoTrackEvidence":two_track,
      "claims":{"matches":len(claims),"customerClaimReviewRequired":sum(x["context"]=="CUSTOMER_CLAIM_REVIEW_REQUIRED" for x in claims)},
      "tierTruthRows":len(tier),"securityRows":len(security),"providerRightsRows":len(rights),"competitors":len(competitors),
      "globalDecision":"NO_GO","LIVE":False,"saleEnabled":False,"productionApproved":False,"worldClassProven":False,
      "P0":[
        "Full current-byte release must pass after R44P44 source changes.",
        "Audit generalization remains coverage-limited and lacks two independent reviewers.",
        "Advanced remains NOT_FOR_SALE and must never expose checkout/human-review promises.",
        "Shield/Real Markets rights-approved current data coverage remains zero.",
        "Angel independent answer-quality evaluations remain 0/300 despite boundary tests.",
        "Real Stripe/storage/KMS/e-mail/two-tenant lifecycle remains external and unproven.",
      ],
      "P1":[
        "Candidate control alerts require manual adjudication before formal FPR.",
        "Market Impact needs real L2 outcome cohorts.",
        "Whale Watch needs signed labels, monitoring and correction SLA.",
        "Exact Windows remains required.",
        "Real moderated customer cohort and willingness-to-pay remain zero.",
      ],
    }
    dump(out/"R44P44_BRUTAL_PRODUCT_REALITY_SUMMARY.json",summary)
    # Human-readable report.
    text=[]
    text += ["R44P44 BRUTAL PRODUCT REALITY REPORT", "", f"Revision: {REVISION}", "Global decision: NO_GO", "LIVE=false | saleEnabled=false | productionApproved=false | worldClassProven=false", ""]
    text += ["1. CORE VERDICT", "Velmère has strong evidence infrastructure and increasingly real compiler/fuzz lanes, but customer proof, independent audit assurance, data rights and external operations remain unproven.", "The most dangerous failure mode is a convincing interface or report implying certainty beyond supported coverage.", ""]
    text += ["2. CORPUS", f"50 unique contracts, 150 Basic/Pro/Advanced projections. Formal precision/FPR/severity/exploitability metrics remain unavailable because controls lack independent true-negative adjudication.", ""]
    text += ["3. ANGEL", f"{angel['cases']} deterministic safety/advice cases: {angel['passed']} pass, {angel['failed']} fail. This is boundary evidence only; naturalness, grounded answer quality, context retention and live model behavior remain unproven.", ""]
    text += ["4. CUSTOMERS AND REVIEWERS", f"100 AI-simulated personas × 24 steps = {len(journeys)} rows. Internal AI-panel score={two_track["aiSimulatedPanel"]["score"]}%, capped to at most five points in internal readiness only.", "Real human participants=0, real independent reviewers=0/2, Customer Proof=0%, willingness-to-pay=0. AI simulation never satisfies those gates.", ""]
    text += ["5. STANDALONE PRODUCT TRUTH", json.dumps(deep,ensure_ascii=False,indent=2), ""]
    text += ["6. SECURITY", "Local controls are broad, but real IdP, two-tenant staging, real Stripe TEST, storage/KMS/e-mail, cross-device revocation, DSAR and incident drills remain external blockers.", ""]
    text += ["7. DATA RIGHTS", "No provider becomes customer-facing by assumption. Unverified fields remain RIGHTS_UNVERIFIED and fail closed. SEC/ECB/EIA/own-node lanes still need field-level legal review and operational controls.", ""]
    text += ["8. TOP-OF-MARKET GAPS", "Independent reviewers, sealed balanced holdout, business-logic analysis, real data operations, continuous monitoring, customer outcomes, professional legal review, exact Windows and external lifecycle evidence.", ""]
    text += ["9. DECISION", "Audit Basic: free limited prescreen after release closure. Audit Pro/PDF Pro: invitation-only with 100% manual QA. Advanced: NOT_FOR_SALE. Shield Pro: NOT_FOR_SALE. Data products: reference/informational until rights-approved current coverage exists.", ""]
    (out/"R44P44_BRUTAL_PRODUCT_REALITY_REPORT.txt").write_text("\n".join(text),encoding="utf-8")
    # self-manifest
    manifest=[]
    for p in sorted(out.iterdir(), key=lambda x:x.name.encode()):
        if p.is_file() and p.name!="R44P44_REPORTS_MANIFEST.json": manifest.append({"path":p.name,"byteLength":p.stat().st_size,"sha256":sha256_file(p)})
    dump(out/"R44P44_REPORTS_MANIFEST.json",{"schemaVersion":"velmere.r44p44.reports-manifest.v1","files":manifest,"count":len(manifest)})
    print(json.dumps(summary,ensure_ascii=False,indent=2))
    return 0
if __name__=="__main__": raise SystemExit(main())
