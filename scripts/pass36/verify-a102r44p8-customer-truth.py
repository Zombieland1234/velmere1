#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, json, re
from pathlib import Path
import fitz

def stable(v): return json.dumps(v,ensure_ascii=False,sort_keys=True,separators=(",",":"))
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--packets',required=True);ap.add_argument('--manifest',required=True);ap.add_argument('--accuracy',required=True);ap.add_argument('--blind',required=True);ap.add_argument('--receipt',required=True);a=ap.parse_args()
 packets=[json.loads(x) for x in Path(a.packets).read_text(encoding='utf-8').splitlines() if x.strip()]; byhash={hashlib.sha256(stable(p).encode()).hexdigest():p for p in packets}
 manifest=json.loads(Path(a.manifest).read_text()); failures=[]; checks=0; passed=0; rows=[]
 def check(cid,ok,detail=None):
  nonlocal checks,passed;checks+=1;passed+=int(bool(ok));
  if not ok: failures.append({'id':cid,'detail':detail})
 check('packet-count',len(packets)==450,len(packets));check('manifest-count',len(manifest['rows'])==150,len(manifest['rows']))
 check('numeric-confidence-removed',all(p.get('confidence') is None for p in packets),sum(p.get('confidence') is not None for p in packets))
 required_model={'findingConfidence','evidenceCompleteness','sourceIdentityConfidence','deploymentReproductionConfidence','toolAgreementState','reviewStatus','adjudicationStatus','uncertainty'}
 check('confidence-model-complete',all(required_model<=set((p.get('confidenceModel') or {}).keys()) for p in packets),None)
 check('no-signal-not-100',all(not ((p.get('confidenceModel') or {}).get('toolAgreementState')=='NO_SIGNAL' and ((p.get('advancedEvidence') or {}).get('crossToolConsensus') or {}).get('agreementScore')==100) for p in packets),None)
 check('full-official-coverage',all((p.get('officialToolCoverage') or {}).get('completed')==4 for p in packets),None)
 for mr in manifest['rows']:
  path=Path(mr['path']);
  if not path.is_absolute(): path=(Path(a.manifest).parent/path).resolve()
  doc=fitz.open(path); text='\n'.join(page.get_text('text') for page in doc);doc.close()
  packet=byhash.get(mr['packetSha256']); expected=(packet or {}).get('officialToolCoverage',{}).get('completed')
  ok=packet is not None and f'OFFICIAL_TOOL_EXECUTIONS: {expected}/4' in text and f'{expected}/4 actual hash-bound executions' in text
  checks+=1;passed+=int(ok)
  if not ok:failures.append({'id':f"pdf-coverage:{mr['path']}",'detail':{'expected':expected}})
  rows.append({'path':mr['path'],'expectedCoverage':expected,'semanticCoverageOk':ok})
 acc=json.loads(Path(a.accuracy).read_text());check('accuracy-denominator',acc.get('riskCases')==24 and acc.get('controlCases')==24,acc)
 check('accuracy-not-independent',acc.get('independentGroundTruthCredit')==0,acc.get('independentGroundTruthCredit'))
 blind=[json.loads(x) for x in Path(a.blind).read_text().splitlines() if x.strip()]
 check('blind-count',len(blind)==50,len(blind));check('blind-full-source',all(b.get('neutralSourceName')=='case.sol' and len(b.get('source',''))>100 and '/' not in b.get('neutralSourceName','') for b in blind),None)
 check('blind-no-revealing-path',all('sourcePath' not in b and 'filename' not in b and 'category' not in b for b in blind),None)
 receipt={'schemaVersion':'velmere.pass36.a102r44p8.customer-truth-verification.v1','status':'PASS_A102R44P8_CUSTOMER_TRUTH' if not failures else 'FAIL_A102R44P8_CUSTOMER_TRUTH','checks':checks,'passed':passed,'failed':len(failures),'packetRows':len(packets),'pdfRows':len(rows),'semanticPdfCoveragePassed':sum(r['semanticCoverageOk'] for r in rows),'accuracy':{k:acc.get(k) for k in ['truePositive','falseNegative','falsePositive','trueNegative','recall','precision','specificity']},'independentGroundTruthCredit':0,'customerPdfCredit':0,'liveCredit':0,'saleEnabled':False,'failures':failures[:100],'rows':rows}
 Path(a.receipt).write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps({k:receipt[k] for k in ['status','checks','passed','failed','packetRows','pdfRows','semanticPdfCoveragePassed','accuracy']},indent=2));return 1 if failures else 0
if __name__=='__main__':raise SystemExit(main())
