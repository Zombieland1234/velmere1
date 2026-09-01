#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, json
from pathlib import Path

def stable(v):return json.dumps(v,ensure_ascii=False,sort_keys=True,separators=(',',':'))
def sha(b:bytes)->str:return hashlib.sha256(b).hexdigest()

def main()->int:
 ap=argparse.ArgumentParser();ap.add_argument('--packets',required=True);ap.add_argument('--execution-index',required=True);ap.add_argument('--corpus-index',required=True);ap.add_argument('--pdf-manifest',required=True);ap.add_argument('--pdf-verification',required=True);ap.add_argument('--receipt',required=True);a=ap.parse_args()
 packets=[json.loads(x) for x in Path(a.packets).read_text().splitlines() if x.strip()]
 index=json.loads(Path(a.execution_index).read_text());corpus=json.loads(Path(a.corpus_index).read_text());pdf=json.loads(Path(a.pdf_manifest).read_text());pv=json.loads(Path(a.pdf_verification).read_text())
 fails=[];checks=[]
 def check(i,p,d=None):checks.append({'id':i,'passed':bool(p),'detail':d});fails.append({'id':i,'detail':d}) if not p else None
 check('packet-count-450',len(packets)==450,len(packets));keys={(p['caseId'],p['tier'],p['locale']) for p in packets};check('packet-keys-unique',len(keys)==450,len(keys))
 bycase={c['caseId']:c for c in corpus['cases']};receipts={r['executionId']:r for r in index['rows']};check('execution-index-200',len(receipts)==200,len(receipts))
 grouped={}
 for p in packets:
  parts=p['caseId'].split('-');cid=f"{int(parts[1]):02d}";c=bycase.get(cid);check(f"packet:{p['matrixId']}:case",c is not None)
  if not c:continue
  check(f"packet:{p['matrixId']}:source",p['sourceSha256']==c['sourceSha256'] and p['sourcePath']==c['sourcePath'])
  temp={k:v for k,v in p.items() if k!='outputSha256'};check(f"packet:{p['matrixId']}:output-hash",p['outputSha256']==sha(stable(temp).encode()))
  cb=p['claimBoundary'];check(f"packet:{p['matrixId']}:claims",cb['automated'] is True and cb['humanReviewIncluded'] is False and cb['humanReviewClaimAllowed'] is False and cb['independentCertificationClaimAllowed'] is False and cb['personalisedAdviceAllowed'] is False and cb['securityGuaranteeAllowed'] is False,cb)
  ev=p['evidenceTable'];needed=1 if p['tier']=='basic' else 4;check(f"packet:{p['matrixId']}:evidence-floor",len(ev)>=needed,len(ev))
  for e in ev:check(f"packet:{p['matrixId']}:receipt:{e['sourceId']}",e['sourceId'] in receipts and e['payloadSha256']==receipts[e['sourceId']]['receiptSha256'])
  grouped.setdefault((p['caseId'],p['locale']),{})[p['tier']]=p
 for k,g in grouped.items():
  check(f"tiers:{k}:complete",set(g)=={'basic','pro','advanced'},sorted(g))
  if set(g)=={'basic','pro','advanced'}:
   check(f"tiers:{k}:monotonic-evidence",g['basic']['tierValue']['evidenceFamilyCount']<=g['pro']['tierValue']['evidenceFamilyCount']<=g['advanced']['tierValue']['evidenceFamilyCount'])
   check(f"tiers:{k}:no-human-review",all(not g[t]['tierValue']['humanReviewIncluded'] for t in g))
 check('pdf-documents',pdf['documents']==150 and pdf['pages']==700,{k:pdf.get(k) for k in ('documents','pages')});check('pdf-verification',pv['failed']==0 and pv['documentsPassed']==150 and pv['pagesExecuted']==700,pv.get('status'))
 packet_by={(p['caseId'],p['tier'],p['locale']):p for p in packets}
 for r in pdf['rows']:
  p=packet_by.get((r['caseId'],r['tier'],r['locale']));check(f"pdf:{r['reportId']}:packet",p is not None)
  if p:check(f"pdf:{r['reportId']}:packet-sha",r['packetSha256']==sha(stable(p).encode()),{'actual':r['packetSha256']})
 out={'schemaVersion':'velmere.pass36.a102r44p4.official-tool-tier-pdf-binding.v1','status':'PASS_A102R44P4_OFFICIAL_TOOL_TIER_PDF_BINDING_LOCAL_FIXTURE_ONLY' if not fails else 'FAIL','checks':len(checks),'passed':len(checks)-len(fails),'failed':len(fails),'packets':len(packets),'pdfDocuments':pdf['documents'],'pdfPages':pdf['pages'],'officialToolExecutionsBound':200,'realAuditCredit':0,'realCustomerPdfCredit':0,'liveCredit':0,'saleEnabled':False,'failures':fails[:100],'truthBoundary':'Actual official tool receipts and 150 technical PDFs are bound to project-owned synthetic fixtures. No deployed-contract, independent-adjudication, customer, staging, Windows, LIVE or sale credit.'}
 Path(a.receipt).write_text(json.dumps(out,indent=2,ensure_ascii=False)+'\n');print(json.dumps(out,indent=2,ensure_ascii=False));return 1 if fails else 0
if __name__=='__main__':raise SystemExit(main())
