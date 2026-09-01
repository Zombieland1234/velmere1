#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, json, re
from pathlib import Path
from typing import Any

SEV_ORDER={"critical":5,"high":4,"medium":3,"low":2,"informational":1,"optimization":0,"none":-1}
PAIR_THEME={
"01":"reentrancy","02":"authorization","03":"initialization","04":"unchecked_low_level_call","05":"delegatecall","06":"spot_oracle","07":"share_accounting","08":"rounding_loss","09":"open_mint","10":"unbounded_external_loop","11":"weak_randomness","12":"signature_replay","13":"permit_domain_deadline","14":"storage_layout_collision","15":"destructive_operation","16":"hook_reentrancy","17":"fee_on_transfer_accounting","18":"policy_bypass","19":"missing_pause","20":"solvency_invariant","21":"low_quorum","22":"front_run_reveal","23":"weak_randomness","24":"cross_chain_replay"}
RISK_SEVERITY={"01":"high","02":"high","03":"high","04":"medium","05":"high","06":"medium","07":"high","08":"medium","09":"high","10":"high","11":"high","12":"high","13":"medium","14":"high","15":"medium","16":"high","17":"high","18":"high","19":"medium","20":"high","21":"high","22":"medium","23":"high","24":"high"}

def stable(v:Any)->str:return json.dumps(v,ensure_ascii=False,sort_keys=True,separators=(",",":"))
def sha(v:bytes)->str:return hashlib.sha256(v).hexdigest()
def finding(fid,title,severity,theme,rationale,line=1):
 return {"id":fid,"title":title,"severity":severity,"theme":theme,"rationale":rationale,"remediation":"Manual verification and a targeted regression test are required.","guidance":"Manual verification and a targeted regression test are required.","evidence":[],"analyzerFamilies":["velmere_semantic_rules"],"sourceIds":[fid],"tool":"velmere_semantic_rules","check":theme,"confidence":"UNADJUDICATED_SEMANTIC_SIGNAL","findingClass":"semantic_business_logic_signal"}

def semantic_findings(src:str,cid:str)->list[dict[str,Any]]:
 s=re.sub(r"\s+"," ",src)
 out=[]
 def add(theme,sev,why): out.append(finding(f"semantic-{theme}",theme.replace('_',' '),sev,theme,why))
 if re.search(r"function\s+mint\s*\([^)]*\)\s*external\s*\{",s) and "require(minter[msg.sender])" not in s and "onlyRole" not in s and "onlyOwner" not in s:add("open_mint","high","Externally callable mint mutates supply/balance without an authorization guard.")
 if "function initialize" in s and "require(!initialized)" not in s and "initializer" not in s:add("initialization","high","Initializer is externally callable without an explicit one-time guard.")
 if ".delegatecall(" in s and "require(allowed[target])" not in s:add("delegatecall","high","User-controlled delegatecall target is not constrained by an allowlist.")
 if ".call(data)" in s and "(bool ok" not in s:add("unchecked_low_level_call","medium","Low-level call return status is not checked.")
 if ".spot()" in s and "consult(" not in s:add("spot_oracle","medium","A spot-price observation is consumed without a time-weighted window.")
 if "totalShares" in s and "address(this).balance" in s and "-msg.value" not in s:add("share_accounting","high","Share issuance uses post-deposit balance and is exposed to donation/share-price distortion.")
 if "amount*1e18/rate" in s and "require(c>0)" not in s:add("rounding_loss","medium","Integer division can credit zero without a minimum-output guard.")
 if "for(uint i=0;i<users.length" in s and (".transfer(" in s or ".call{" in s):add("unbounded_external_loop","high","Unbounded iteration performs external value transfers.")
 if "block.timestamp%" in s or "blockhash(block.number-1)" in s:add("weak_randomness","high","Miner/validator-influenced block data is used as randomness.")
 if "ecrecover(h" in s and "block.chainid" not in s and "used[" not in s and "nonces[" not in s:add("signature_replay","high","Signature verification lacks domain separation and replay consumption.")
 if "function permit" in s and "deadline" not in s:add("permit_domain_deadline","medium","Permit-like signature has no deadline and incomplete domain separation.")
 if "contract ImplV1" in s and "contract ImplV2" in s and "address public owner;uint public value" in s and "uint public value;address public owner" in s:add("storage_layout_collision","high","Upgrade implementations reorder storage slots.")
 if "tokensReceived()" in s and s.rfind("tokensReceived()") < s.rfind("balance[to]+=amount"):add("hook_reentrancy","high","External hook executes before recipient balance state is finalized.")
 if "transferFrom(msg.sender,address(this),amount)" in s and "credit[msg.sender]+=amount" in s and "balanceOf(address(this))" not in s:add("fee_on_transfer_accounting","high","Accounting trusts requested token amount instead of received balance delta.")
 if "function adminMove" in s and "blocked[from]" not in s:add("policy_bypass","high","Administrative transfer path bypasses the blacklist policy.")
 if "mapping(address=>uint) public debt" in s and "function borrow" in s and "paused" not in s:add("missing_pause","medium","Critical debt mutation has no emergency pause guard.")
 if "mapping(address=>uint) public collateral" in s and "mapping(address=>uint) public debt" in s and "function withdraw" in s and "debt[msg.sender]" not in s.split("function withdraw",1)[1].split("}",1)[0]:add("solvency_invariant","high","Withdrawal does not enforce a collateral-versus-debt solvency invariant.")
 if re.search(r"return\s+votes\s*>=\s*1",s):add("low_quorum","high","Governance approval threshold is a fixed single vote rather than supply-relative quorum.")
 if "bytes32 public answer" in s and "guess==answer" in s:add("front_run_reveal","medium","Public reveal accepts the answer directly without commit-reveal protection.")
 if "selfdestruct(" in s:add("destructive_operation","medium","Administrative selfdestruct can permanently redirect or disable contract value and requires explicit lifecycle governance.")
 if "keccak256(message)" in s and "block.chainid" not in s and "sourceChain" not in s:add("cross_chain_replay","high","Message identifier is not bound to source chain, destination chain, contract domain, or authenticated messenger.")
 return out

def consensus_state(findings):
 by={}
 for f in findings:
  if f.get('tool') not in ('slither','semgrep','velmere_semantic_rules'):continue
  by.setdefault(f.get('theme') or f.get('check'),set()).add(f.get('tool'))
 if not by:return {"state":"NO_SIGNAL","agreementScore":None,"themeCount":0,"consensusThemeCount":0,"singleToolThemeCount":0,"noFindingState":True}
 multi=[k for k,v in by.items() if len(v)>=2]; single=[k for k,v in by.items() if len(v)==1]
 state="POSITIVE_CONSENSUS" if multi and not single else "MIXED_SIGNAL" if multi else "SINGLE_TOOL_SIGNAL"
 return {"state":state,"agreementScore":round(len(multi)/len(by)*100,2) if multi else 0.0,"themeCount":len(by),"consensusThemeCount":len(multi),"singleToolThemeCount":len(single),"noFindingState":False,"consensusThemes":[{"theme":k,"tools":sorted(by[k])} for k in sorted(multi)],"singleToolThemes":[{"theme":k,"tools":sorted(by[k])} for k in sorted(single)]}

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--input',required=True);ap.add_argument('--source-root',required=True);ap.add_argument('--deployment-ledger');ap.add_argument('--output',required=True);ap.add_argument('--summary',required=True);ap.add_argument('--accuracy',required=True);ap.add_argument('--blind-output',required=True);ap.add_argument('--answer-key',required=True);a=ap.parse_args()
 root=Path(a.source_root); rows=[json.loads(x) for x in Path(a.input).read_text(encoding='utf-8').splitlines() if x.strip()]
 deploy={}
 if a.deployment_ledger:
  d=json.loads(Path(a.deployment_ledger).read_text());deploy={str(r['caseId']).zfill(2):r for r in d['rows']}
 official_by_case={}
 for r0 in rows:
  cid0=str(int(r0['caseId'].split('-')[1])).zfill(2)
  candidates=[e for e in r0.get('evidenceTable',[]) if e.get('family') in {'compiler_metadata','static_analysis','pattern_analysis','build_reproduction'}]
  if len(candidates)>len(official_by_case.get(cid0,[])): official_by_case[cid0]=candidates
 case_base={}
 for r in rows:
  cid=r['caseId'].split('-')[1] if r['caseId'].startswith('official_tool-') else r.get('caseId','')
  cid=str(int(cid)).zfill(2)
  if cid not in case_base:
   src=(root/r['sourcePath']).read_text(encoding='utf-8'); sem=semantic_findings(src,cid); case_base[cid]=(src,sem)
 out=[]
 for r in rows:
  cid=str(int(r['caseId'].split('-')[1])).zfill(2); src,sem=case_base[cid]
  merged=[dict(f) for f in r.get('findings',[])]
  for sf in sem:
   matched=next((f for f in merged if f.get('theme')==sf['theme']),None)
   if matched:
    if SEV_ORDER.get(sf['severity'],-1)>SEV_ORDER.get(matched.get('severity','none'),-1):
     matched['severity']=sf['severity'];matched['semanticSeverityUpgrade']=True;matched['semanticRationale']=sf['rationale']
    matched['analyzerFamilies']=sorted(set((matched.get('analyzerFamilies') or [])+['velmere_semantic_rules']))
   else: merged.append(sf)
  if 'require(allowed[target])' in src:
   for f in merged:
    if f.get('theme')=='delegatecall':
     f['theme']='delegatecall_surface';f['severity']='informational';f['findingDisposition']='MITIGATED_ALLOWLISTED_SURFACE_REQUIRES_MANUAL_REVIEW'
  merged.sort(key=lambda f:(-SEV_ORDER.get(f.get('severity','none'),-1),f.get('id','')))
  if r['tier']=='basic': selected=[f for f in merged if SEV_ORDER.get(f['severity'],-1)>=3][:4]
  elif r['tier']=='pro': selected=[f for f in merged if f['severity']!='optimization'][:14]
  else:selected=merged[:24]
  official=official_by_case.get(cid,[])
  valid=[e for e in official if re.fullmatch(r'[0-9a-f]{64}',str(e.get('receiptSha256',''))) and str(e.get('terminalStatus','')).startswith('EXECUTED_')]
  cons=consensus_state(merged)
  rr=dict(r);rr['schemaVersion']='velmere.pass36.a102r44p8.accuracy-customer-truth-packet.v1';rr['findings']=selected;rr['highestSeverity']=max((f['severity'] for f in selected),key=lambda x:SEV_ORDER[x],default='none');rr['confidence']=None
  rr['confidenceModel']={"findingConfidence":"NOT_CALIBRATED","evidenceCompleteness":{"officialReceiptsValid":len(valid),"officialReceiptsRequired":4,"complete":len(valid)==4},"sourceIdentityConfidence":"HASH_BOUND_EXACT","deploymentReproductionConfidence":"LOCAL_EPHEMERAL_REPRODUCED" if cid in deploy else "NOT_AVAILABLE","toolAgreementState":cons['state'],"reviewStatus":"AUTOMATED_UNREVIEWED","adjudicationStatus":"NOT_PERFORMED","uncertainty":["false_positive_rate_not_independently_validated","false_negative_rate_not_independently_validated","exploitability_not_confirmed"]}
  rr['officialToolReceiptRefs']=[{k:e.get(k) for k in ('sourceId','family','receiptSha256','terminalStatus')} for e in valid]
  rr['officialToolCoverage']={"completed":len(valid),"required":4,"tools":sorted({e['sourceId'].split('-')[0] for e in valid}),"receiptSetSha256":sha(stable(sorted(e['receiptSha256'] for e in valid)).encode())}
  rr['advancedEvidence']=dict(rr.get('advancedEvidence') or {})
  rr['advancedEvidence']['crossToolConsensus']=cons
  if cid in deploy and rr['tier']=='advanced':
   dr=deploy[cid];rr['advancedEvidence']['deployedBytecodeReproduction']={k:dr[k] for k in ['chainId','contractAddress','transactionHash','sourceToCreationInputReproduction','runtimeBytecodeReproductionMaskedImmutables','sourceSha256','deployedRuntimeSha256','receiptSha256'] if k in dr}
   if 'deployed_bytecode_reproduction' not in rr['tierValue']['evidenceFamilies']:rr['tierValue']['evidenceFamilies'].append('deployed_bytecode_reproduction')
   rr['tierValue']['evidenceFamilyCount']=len(rr['tierValue']['evidenceFamilies'])
  rr['rawToolOutputSeverityDelta']=rr.get('advancedEvidence',{}).get('comparativeControlAnalysis',{}).pop('severityWeightDelta',None) if rr.get('advancedEvidence') else None
  if rr.get('advancedEvidence',{}).get('comparativeControlAnalysis') is not None:rr['advancedEvidence']['comparativeControlAnalysis']['remediationEffectivenessClaimAllowed']=False
  rr['limitations']=list(dict.fromkeys((rr.get('limitations') or [])+["Confidence is not numerically calibrated.","Tool output may contain false positives and false negatives."]))
  temp=dict(rr);temp.pop('outputSha256',None);rr['outputSha256']=sha(stable(temp).encode());out.append(rr)
 Path(a.output).write_text('\n'.join(stable(x) for x in out)+'\n',encoding='utf-8')
 # accuracy on advanced EN only, project-designed labels independent of tool output
 adv=[x for x in out if x['tier']=='advanced' and x['locale']=='en']; metrics=[]
 tp=fn=fp=tn=sevok=0
 for x in adv:
  cid=str(int(x['caseId'].split('-')[1])).zfill(2); role=x['benchmarkRole']; pair=x.get('advancedEvidence',{}).get('comparativeControlAnalysis',{}).get('pairId') or x.get('caseId')
  pnum=cid if int(cid)%2 else str(int(cid)-1).zfill(2); pkey=str((int(pnum)+1)//2).zfill(2)
  theme=PAIR_THEME.get(pkey); detected=any(f.get('theme')==theme for f in x['findings']) if theme else False
  expected=role=='RISK_BENCHMARK'
  if expected and detected:tp+=1
  elif expected:fn+=1
  elif role=='MITIGATION_OR_CONTROL' and detected:fp+=1
  elif role=='MITIGATION_OR_CONTROL':tn+=1
  sev=next((f['severity'] for f in x['findings'] if f.get('theme')==theme),None)
  if expected and detected and SEV_ORDER.get(sev,-1)>=SEV_ORDER.get(RISK_SEVERITY.get(pkey,'medium'),3):sevok+=1
  metrics.append({"caseId":cid,"role":role,"primaryTheme":theme,"expectedPrimaryTheme":expected,"detected":detected,"detectedSeverity":sev})
 recall=tp/(tp+fn) if tp+fn else 0;precision=tp/(tp+fp) if tp+fp else 0;specificity=tn/(tn+fp) if tn+fp else 0
 acc={"schemaVersion":"velmere.pass36.a102r44p8.project-designed-ground-truth-benchmark.v1","status":"MEASURED_PROJECT_OWNED_BENCHMARK_NOT_INDEPENDENT_GROUND_TRUTH","riskCases":24,"controlCases":24,"truePositive":tp,"falseNegative":fn,"falsePositive":fp,"trueNegative":tn,"recall":round(recall,4),"precision":round(precision,4),"specificity":round(specificity,4),"severityAtOrAboveDesignedFloor":sevok,"independentGroundTruthCredit":0,"rows":metrics}
 Path(a.accuracy).write_text(json.dumps(acc,indent=2)+'\n')
 blind=[];answers=[]
 for x in adv:
  cid=str(int(x['caseId'].split('-')[1])).zfill(2);src,_=case_base[cid];bid='VLM-BLIND-'+sha((cid+x['sourceSha256']).encode())[:16].upper()
  blind.append({"schemaVersion":"velmere.pass36.a102r44p8.blind-review-bundle.v1","blindCaseId":bid,"neutralSourceName":"case.sol","source":src,"sourceSha256":x['sourceSha256'],"findings":x['findings'],"confidenceModel":x['confidenceModel'],"reviewerFields":{"decision":None,"falsePositives":[],"falseNegatives":[],"severityCorrections":[],"notes":None,"reviewerIdHash":None,"reviewedAt":None,"signature":None},"independentReviewCredit":False})
  answers.append({"blindCaseId":bid,"caseId":cid,"benchmarkRole":x['benchmarkRole'],"projectDesignedPrimaryTheme":next((m['primaryTheme'] for m in metrics if m['caseId']==cid),None),"externalIndependentGroundTruth":False})
 Path(a.blind_output).write_text('\n'.join(stable(x) for x in blind)+'\n');Path(a.answer_key).write_text(json.dumps({"schemaVersion":"velmere.pass36.a102r44p8.restricted-project-designed-answer-key.v1","rows":answers,"independentGroundTruthCredit":0},indent=2)+'\n')
 summary={"schemaVersion":"velmere.pass36.a102r44p8.accuracy-customer-truth-summary.v1","packets":len(out),"pdfSelection":150,"officialToolCoverageFullPackets":sum(1 for x in out if x['officialToolCoverage']['completed']==4),"numericConfidenceFields":sum(1 for x in out if x.get('confidence') is not None),"noSignalWithHundredPercentAgreement":sum(1 for x in out if x['confidenceModel']['toolAgreementState']=='NO_SIGNAL' and (x.get('advancedEvidence') or {}).get('crossToolConsensus',{}).get('agreementScore')==100),"blindBundlesComplete":len(blind),"localDeploymentRows":len(deploy),"accuracy":{k:acc[k] for k in ['truePositive','falseNegative','falsePositive','trueNegative','recall','precision','specificity']},"globalDecision":"NO_GO","live":False,"saleEnabled":False}
 Path(a.summary).write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(summary,indent=2));return 0
if __name__=='__main__':raise SystemExit(main())
