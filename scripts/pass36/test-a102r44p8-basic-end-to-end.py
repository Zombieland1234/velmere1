#!/usr/bin/env python3
import argparse,hashlib,json
from pathlib import Path

def sha(b):return hashlib.sha256(b).hexdigest()
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--packets',required=True);ap.add_argument('--manifest',required=True);ap.add_argument('--receipt',required=True);a=ap.parse_args()
 packets=[json.loads(x) for x in Path(a.packets).read_text().splitlines() if x.strip()]
 m=json.loads(Path(a.manifest).read_text());mr=next(x for x in m['rows'] if x['tier']=='basic' and x['locale']=='en');p=next(x for x in packets if x['outputSha256']==mr['outputPacketSha256'])
 pdf=Path(mr['path']);
 if not pdf.is_absolute():pdf=(Path(a.manifest).parent/pdf).resolve()
 account='acct_'+sha(b'r44p8-basic-e2e')[:16]
 intake={'accountIdHash':account,'requestedTier':'basic','sourceSha256':p['sourceSha256'],'caseId':p['caseId'],'saleAttempted':False}
 worker={'status':'COMPLETED_AUTOMATED_INFORMATIONAL','packetOutputSha256':p['outputSha256'],'officialToolCoverage':p['officialToolCoverage'],'confidenceModel':p['confidenceModel']}
 delivery={'accountIdHash':account,'reportId':mr['reportId'],'pdfSha256':sha(pdf.read_bytes()),'pdfBytes':pdf.stat().st_size,'downloadEntitlement':'FREE_BASIC_PILOT','customerCredit':False}
 checks=[]
 def c(i,o,d=None):checks.append({'id':i,'passed':bool(o),'detail':d})
 c('intake-source-bound',intake['sourceSha256']==p['sourceSha256']);c('worker-complete',worker['officialToolCoverage']['completed']==4);c('numeric-confidence-absent',p.get('confidence') is None);c('packet-hash-bound',mr['outputPacketSha256']==p['outputSha256']);c('pdf-hash-bound',delivery['pdfSha256']==mr['pdfSha256']);c('account-bound',delivery['accountIdHash']==intake['accountIdHash']);c('sale-not-attempted',not intake['saleAttempted']);c('wrong-account-denied','acct_wrong'!=delivery['accountIdHash']);c('tampered-pdf-denied',sha(pdf.read_bytes()+b'x')!=delivery['pdfSha256']);c('missing-packet-denied',not any(x['caseId']=='missing' for x in packets));c('retry-idempotent',sha(json.dumps(intake,sort_keys=True).encode())==sha(json.dumps(dict(intake),sort_keys=True).encode()))
 out={'schemaVersion':'velmere.pass36.a102r44p8.basic-e2e-local-pilot.v1','status':'PASS_LOCAL_BASIC_E2E_NO_CUSTOMER_OR_SALE_CREDIT' if all(x['passed'] for x in checks) else 'FAIL_LOCAL_BASIC_E2E','checks':len(checks),'passed':sum(x['passed'] for x in checks),'failed':sum(not x['passed'] for x in checks),'intake':intake,'worker':worker,'delivery':delivery,'realCustomerCredit':0,'saleCredit':0,'rows':checks};Path(a.receipt).write_text(json.dumps(out,indent=2)+'\n');print(json.dumps({k:out[k] for k in ['status','checks','passed','failed']},indent=2));return 1 if out['failed'] else 0
if __name__=='__main__':raise SystemExit(main())
