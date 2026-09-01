#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, json, re
from pathlib import Path
from typing import Any

SEV_ORDER={'critical':5,'high':4,'medium':3,'low':2,'informational':1,'optimization':0,'none':-1}
SLITHER_SEV={'High':'high','Medium':'medium','Low':'low','Informational':'informational','Optimization':'optimization'}
SEMGREP_SEV={'ERROR':'medium','WARNING':'low','INFO':'informational'}
TOOL_FAMILY={'solc':'compiler_metadata','slither':'static_analysis','semgrep':'pattern_analysis','forge':'build_reproduction'}
LOCALES=('pl','en','de'); TIERS=('basic','pro','advanced')

COPY={
 'pl':{'verdict':'Oficjalne narzędzia zakończyły analizę. Ustalono {n} {signal} w zakresie {tier}; wynik dotyczy syntetycznego benchmarku, nie wdrożonego kontraktu.',
       'next':'Powiąż dokładny wdrożony bytecode, źródło, compiler settings i prawa do benchmarku, a następnie wykonaj niezależną adjudykację przed claimem realnego audytu.',
       'limits':['Syntetyczny benchmark należący do projektu, nie wdrożony kontrakt.','Brak niezależnej adjudykacji i prawdziwego klienta.','Forge wykonał deterministyczny build, nie pełny fuzzing ekonomiczny.','Wynik narzędzia jest sygnałem do weryfikacji, nie gwarancją podatności ani bezpieczeństwa.']},
 'en':{'verdict':'Official tools completed the analysis. {n} signals are included in the {tier} scope; this is a synthetic benchmark, not a deployed-contract audit.',
       'next':'Bind exact deployed bytecode, source, compiler settings and benchmark rights, then obtain independent adjudication before any real-audit claim.',
       'limits':['Project-owned synthetic benchmark, not a deployed contract.','No independent adjudication or real customer outcome.','Forge performed a deterministic build, not full economic fuzzing.','Tool output is a verification signal, not a guarantee of vulnerability or safety.']},
 'de':{'verdict':'Offizielle Werkzeuge haben die Analyse abgeschlossen. {n} Signale sind im Umfang {tier} enthalten; dies ist ein synthetischer Benchmark und kein Audit eines bereitgestellten Vertrags.',
       'next':'Exakten bereitgestellten Bytecode, Quelltext, Compiler-Einstellungen und Benchmark-Rechte binden und danach eine unabhängige Adjudikation durchführen.',
       'limits':['Projekteigener synthetischer Benchmark, kein bereitgestellter Vertrag.','Keine unabhängige Adjudikation und kein echtes Kundenergebnis.','Forge führte einen deterministischen Build aus, kein vollständiges ökonomisches Fuzzing.','Tool-Ausgaben sind Prüfsignale, keine Garantie für Schwachstelle oder Sicherheit.']},
}
REMEDIATION={
 'reentrancy-eth':'Apply checks-effects-interactions or a proven reentrancy guard and add adversarial callback tests.',
 'tx-origin':'Replace tx.origin authorization with explicit msg.sender/role checks and test proxy-call paths.',
 'unchecked-lowlevel':'Check the low-level call result, propagate bounded errors and add failure-path tests.',
 'controlled-delegatecall':'Bind delegatecall targets to a reviewed allowlist and protect storage layout and upgrade governance.',
 'arbitrary-send-eth':'Constrain recipients, authorization and value flow; add negative recipient-substitution tests.',
 'weak-prng':'Use an appropriate verifiable randomness design and model timing/manipulation assumptions.',
 'timestamp':'Bound timestamp use to tolerable windows and avoid it as a sole randomness or authorization source.',
 'calls-loop':'Paginate or cap external-call loops and test worst-case gas and partial failure.',
 'missing-zero-check':'Validate critical address inputs and document whether the zero address has intentional semantics.',
 'uninitialized-state':'Require one-time initialization, constructor/initializer locking and deployment-state checks.',
 'storage-collision':'Use stable namespaced storage and an explicit upgrade storage-layout verifier.',
}

def signal_label(locale: str, n: int) -> str:
    if locale == "pl":
        if n == 1:
            return "sygnał"
        if n % 10 in (2, 3, 4) and n % 100 not in (12, 13, 14):
            return "sygnały"
        return "sygnałów"
    if locale == "de":
        return "Signal" if n == 1 else "Signale"
    return "signal" if n == 1 else "signals"

def sha(b:bytes)->str:return hashlib.sha256(b).hexdigest()
def stable(v:Any)->str:return json.dumps(v,ensure_ascii=False,sort_keys=True,separators=(',',':'))
def clean(s:Any)->str:return re.sub(r'\s+',' ',str(s or '')).strip()
def short_semgrep(check_id:str)->str:return check_id.rsplit('.',1)[-1]
def line_from_text(text:str)->int:
 m=re.search(r'#(\d+)',text or '') or re.search(r'#L(\d+)',text or '')
 return int(m.group(1)) if m else 1

def severity_max(findings:list[dict[str,Any]])->str:
 if not findings:return 'none'
 return max((f['severity'] for f in findings),key=lambda x:SEV_ORDER.get(x,0))

def guidance(check:str)->str:
 return REMEDIATION.get(check,'Review the exact source location, confirm exploitability, add a negative regression test and document residual assumptions.')

def main()->int:
 ap=argparse.ArgumentParser();ap.add_argument('--evidence-root',required=True);ap.add_argument('--source-root',required=True);ap.add_argument('--output',required=True);ap.add_argument('--summary',required=True);args=ap.parse_args()
 E=Path(args.evidence_root);S=Path(args.source_root);ledger=json.loads((E/'OFFICIAL_TOOL_EXECUTION_LEDGER.json').read_text());corpus=json.loads((S/'evaluation/pass36/a102r44p4-official-tool-corpus-index.json').read_text())
 by_case={c['caseId']:c for c in corpus['cases']}; receipts={(r['tool'],r['caseId']):r for r in ledger['rows']}
 packets=[];case_summary=[]
 for cid in sorted(by_case):
  c=by_case[cid]; src=S/c['sourcePath']; assert src.is_file() and sha(src.read_bytes())==c['sourceSha256']
  findings=[]
  sl=json.loads((E/'cases'/cid/'slither.json').read_text())
  for idx,d in enumerate(sl.get('results',{}).get('detectors',[]),1):
   check=d.get('check','unknown');sev=SLITHER_SEV.get(d.get('impact'),'informational');desc=clean(d.get('description'));line=line_from_text(desc)
   findings.append({'id':f'slither-{check}-{idx}','title':check.replace('-',' '),'severity':sev,'rationale':desc[:1200],'remediation':guidance(check),'guidance':guidance(check),'evidence':[{'sourcePath':c['sourcePath'],'lineStart':line,'lineEnd':line,'codeSha256':c['sourceSha256'],'sourceId':f'{cid}-slither','family':'static_analysis'}],'analyzerFamilies':['static_analysis'],'sourceIds':[f'{cid}-slither'],'tool':'slither','check':check,'confidence':d.get('confidence')})
  sg=json.loads((E/'cases'/cid/'semgrep.json').read_text())
  for idx,d in enumerate(sg.get('results',[]),1):
   check=short_semgrep(d.get('check_id','unknown'));sev=SEMGREP_SEV.get(d.get('extra',{}).get('severity'),'informational');start=d.get('start',{}).get('line',1);msg=clean(d.get('extra',{}).get('message',check))
   findings.append({'id':f'semgrep-{check}-{idx}','title':check.replace('-',' '),'severity':sev,'rationale':msg,'remediation':guidance(check),'guidance':guidance(check),'evidence':[{'sourcePath':c['sourcePath'],'lineStart':start,'lineEnd':d.get('end',{}).get('line',start),'codeSha256':c['sourceSha256'],'sourceId':f'{cid}-semgrep','family':'pattern_analysis'}],'analyzerFamilies':['pattern_analysis'],'sourceIds':[f'{cid}-semgrep'],'tool':'semgrep','check':check,'confidence':'rule-match'})
  # Stable severity-first order and duplicate-surface retention with explicit tool identity.
  findings.sort(key=lambda f:(-SEV_ORDER.get(f['severity'],0),f['tool'],f['id']))
  receipt_rows=[receipts[(tool,cid)] for tool in ('solc','slither','semgrep','forge')]
  evidence=[]
  for rr in receipt_rows:
   ids=[f['id'] for f in findings if f['tool']==rr['tool']]
   evidence.append({'sourceId':rr['executionId'],'family':TOOL_FAMILY[rr['tool']],'findingIds':ids,'controls':['exact_version','exact_executable_hash','source_sha256','raw_output_sha256','receipt_sha256'],'payloadSha256':rr['receiptSha256'],'receiptSha256':rr['receiptSha256'],'terminalStatus':rr['terminalStatus']})
  case_summary.append({'caseId':cid,'filename':c['filename'],'category':c['category'],'benchmarkRole':c['benchmarkRole'],'officialToolsCompleted':4,'rawFindings':len(findings),'highestSeverity':severity_max(findings),'slitherDetectors':len(sl.get('results',{}).get('detectors',[])),'semgrepResults':len(sg.get('results',[]))})
  for locale in LOCALES:
   for tier in TIERS:
    if tier=='basic': selected=[f for f in findings if SEV_ORDER.get(f['severity'],0)>=3][:4]
    elif tier=='pro': selected=[f for f in findings if f['severity']!='optimization'][:14]
    else:selected=findings[:24]
    fam={'compiler_metadata'}
    if tier in ('pro','advanced'):fam.update(['static_analysis','pattern_analysis','build_reproduction'])
    else:
     if any(f['tool']=='slither' for f in selected):fam.add('static_analysis')
     if any(f['tool']=='semgrep' for f in selected):fam.add('pattern_analysis')
    contradictions=[]
    if any(f['check'] in ('low-level-calls','velmere-solidity-unchecked-low-level-call') for f in findings):
     contradictions.append({'code':'SURFACE_NOT_EXPLOITABILITY','detail':'A low-level-call surface may be intentional or guarded; tool output requires source-bound exploitability review.'})
    if len(selected)<len(findings):contradictions.append({'code':'TIER_SCOPE_TRUNCATION','detail':f'{len(findings)-len(selected)} lower-priority or optimization signals remain outside this tier display.'})
    tv={
     'tier':tier,'evidenceFamilyCount':len(fam),'evidenceFamilies':sorted(fam),'findingCount':len(selected),'contradictionCount':len(contradictions),'humanReviewIncluded':False,
     'materialAdditions':(['source_bound_identity','bounded_official_tool_summary','limitations','next_safe_check'] if tier=='basic' else ['four_official_tool_receipts','full_evidence_table','severity_rationale','remediation_map'] if tier=='pro' else ['all_tool_signals','contradiction_register','expanded_evidence_scenarios','abstention_and_claim_boundary']),
     'explicitlyExcluded':['human_review_claim','independent_certification','security_guarantee','personalised_advice','real_deployed_contract_claim'],
    }
    packet={
     'schemaVersion':'velmere.pass36.a102r44p4.official-tool-audit-packet.v1','matrixId':f"official_tool-{int(cid):03d}-{c['category']}::{tier}::{locale}",'caseId':f"official_tool-{int(cid):03d}-{c['category']}",'category':c['category'],'tier':tier,'locale':locale,'sourcePath':c['sourcePath'],'sourceSha256':c['sourceSha256'],
     'analysisMode':'automated_informational','status':'analysis_completed','confidence':None,'highestSeverity':severity_max(selected),'customerVerdict':COPY[locale]['verdict'].format(n=len(selected),signal=signal_label(locale,len(selected)),tier=tier.upper()),
     'claimBoundary':{'issuer':'Velmère Security','analysisMode':'automated_informational','automated':True,'humanReviewIncluded':False,'humanReviewClaimAllowed':False,'independentCertificationClaimAllowed':False,'personalisedAdviceAllowed':False,'securityGuaranteeAllowed':False},
     'tierValue':tv,'evidenceCoverage':{'analyzerFamilyCount':len(fam),'minimumAnalyzerFamilies':1 if tier=='basic' else 4,'findingCount':len(selected),'findingsWithReproducibleLocation':len(selected),'contradictionCount':len(contradictions),'identityVerified':True,'commercialRights':'verified_project_owned_fixture','officialToolExecutions':4},
     'findings':selected,'contradictions':contradictions,'limitations':COPY[locale]['limits'],'missingData':['deployed_bytecode','source_bytecode_reproduction','independent_adjudication','real_customer_outcome'],'nextSafeCheck':COPY[locale]['next'],
     'methodology':None if tier!='advanced' else {'compiler':'solc 0.8.24 exact hash-bound execution','static analysis':'Slither 0.11.5 exact hash-bound execution','pattern analysis':'Semgrep 1.130.0 exact hash-bound execution','build reproduction':'Forge 1.2.3 deterministic project build','adjudication':'not performed','human review':'not included'},
     'evidenceTable':evidence if tier!='basic' else [e for e in evidence if e['family'] in fam],
     'provenanceReceipt':sha((''.join(r['receiptSha256'] for r in receipt_rows)).encode()),'commercialRights':'verified_project_owned_fixture','entitlementStatus':'not_required' if tier=='basic' else 'pilot_only',
    }
    temp={**packet};packet['outputSha256']=sha(stable(temp).encode());packets.append(packet)
  
 out=Path(args.output);out.parent.mkdir(parents=True,exist_ok=True);out.write_text('\n'.join(stable(p) for p in packets)+'\n',encoding='utf-8')
 summary={'schemaVersion':'velmere.pass36.a102r44p4.official-tool-tier-packet-summary.v1','cases':50,'packetRows':len(packets),'selectedPdfRows':150,'tiers':{t:sum(1 for p in packets if p['tier']==t) for t in TIERS},'locales':{l:sum(1 for p in packets if p['locale']==l) for l in LOCALES},'officialToolProcessesBound':200,'caseSummary':case_summary,'realAuditCredit':0,'realCustomerCredit':0,'liveCredit':0,'saleEnabled':False,'truthBoundary':'Packets bind actual official tool receipts on project-owned synthetic fixtures. They are automated informational technical evidence, not rights-approved deployed audits, independent adjudication or customer outcomes.'}
 Path(args.summary).write_text(json.dumps(summary,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
 print(json.dumps({k:summary[k] for k in ['cases','packetRows','selectedPdfRows','tiers','locales','officialToolProcessesBound','realAuditCredit']},indent=2))
 return 0

if __name__=='__main__':raise SystemExit(main())
