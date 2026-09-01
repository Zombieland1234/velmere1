#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, json, pathlib, sys

REV="VELMERE_PASS36_A94R2_ROUTE_AST_ORPHAN_LOCK_PDF_AND_CROSS_SURFACE_VALUE_TRUTH_CHECKPOINT"

def sha256_file(path: pathlib.Path) -> str:
    h=hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda:f.read(1024*1024),b''): h.update(chunk)
    return h.hexdigest()

def canonical_json(value) -> bytes:
    return json.dumps(value,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()

def main() -> int:
    ap=argparse.ArgumentParser()
    ap.add_argument('--source-root',default='.')
    ap.add_argument('--materials-root',required=True)
    ap.add_argument('--output')
    args=ap.parse_args()
    src=pathlib.Path(args.source_root).resolve(); mat=pathlib.Path(args.materials_root).resolve()
    summary=json.loads((src/'config/pass36/a94r2-retained-pdf-evidence-summary.json').read_text())
    checks=[]
    def check(i,p,d=None): checks.append({'id':i,'passed':bool(p),'detail':d})
    check('summary:revision',summary.get('revisionId')==REV,summary.get('revisionId'))
    paths=summary['materialsPaths']; bindings=summary['bindings']
    receipt_path=mat/paths['receipt']; details_path=mat/paths['details']; contact_path=mat/paths['contactSheet']
    for label,p,bkey,skey in [('receipt',receipt_path,'receiptByteLength','receiptSha256'),('details',details_path,'detailsByteLength','detailsSha256'),('contactSheet',contact_path,'contactSheetByteLength','contactSheetSha256')]:
        check(f'{label}:exists',p.is_file(),str(p))
        if p.is_file():
            check(f'{label}:bytes',p.stat().st_size==bindings[bkey],{'declared':bindings[bkey],'actual':p.stat().st_size})
            check(f'{label}:sha256',sha256_file(p)==bindings[skey],{'declared':bindings[skey],'actual':sha256_file(p)})
    receipt=json.loads(receipt_path.read_text()); details=json.loads(details_path.read_text())
    check('receipt:revision',receipt.get('revisionId')==REV,receipt.get('revisionId'))
    core={k:v for k,v in receipt.items() if k!='receiptCoreSha256'}
    check('receipt:core-digest',hashlib.sha256(canonical_json(core)).hexdigest()==receipt.get('receiptCoreSha256'),receipt.get('receiptCoreSha256'))
    check('receipt:details-digest',receipt.get('detailsSha256')==sha256_file(details_path),receipt.get('detailsSha256'))
    rows=details.get('pdfResults',[])
    check('corpus:row-count',len(rows)==450,len(rows))
    corpus=mat/receipt['corpusRoot']
    observed=[]; failures=[]
    for row in rows:
        p=corpus/row['path']
        if not p.is_file(): failures.append({'path':row['path'],'reason':'missing'}); continue
        b=p.stat().st_size; h=sha256_file(p)
        if b!=row['byte_length'] or h!=row['sha256']:
            failures.append({'path':row['path'],'reason':'binding_mismatch','declaredBytes':row['byte_length'],'actualBytes':b,'declaredSha256':row['sha256'],'actualSha256':h})
        observed.append(f"{row['path']}\0{b}\0{h}\0{row['pages']}")
    aggregate=hashlib.sha256('\n'.join(sorted(observed)).encode()).hexdigest()
    check('corpus:all-bindings',not failures,failures[:10])
    check('corpus:aggregate',aggregate==bindings['entryAggregateSha256'],{'declared':bindings['entryAggregateSha256'],'actual':aggregate})
    check('qa:denominator',receipt.get('documents')==450 and receipt.get('pages')==2100 and receipt.get('blankPages')==0 and receipt.get('edgeContactPages')==0,{'documents':receipt.get('documents'),'pages':receipt.get('pages'),'blank':receipt.get('blankPages'),'edge':receipt.get('edgeContactPages')})
    check('qa:security',all(not r.get('disallowed_actions') and not r.get('disallowed_catalog_keys') and not r.get('embedded_files_present') and not r.get('javascript_names_present') and not r.get('encrypted') for r in rows),None)
    check('truth:no-promotion',receipt.get('realCustomerPdfs')==0 and receipt.get('productionBrowserRuns')==0 and receipt.get('secureCustomerDeliveries')==0 and receipt.get('liveProven') is False and receipt.get('saleEnabled') is False,None)
    failed=[c for c in checks if not c['passed']]
    result={'schemaVersion':'velmere.pass36.a94r2.retained-pdf-evidence-verification.v1','revisionId':REV,'status':'PASS_RETAINED_PHYSICAL_SYNTHETIC_PDF_EVIDENCE_NO_REAL_CREDIT' if not failed else 'FAIL_RETAINED_PDF_EVIDENCE','checks':len(checks),'passed':len(checks)-len(failed),'failed':len(failed),'failures':failed,'documents':len(rows),'pages':receipt.get('pages'),'realCustomerPdfs':0,'browserCreditGranted':False,'saleEnabled':False}
    if args.output:
        out=pathlib.Path(args.output); out.parent.mkdir(parents=True,exist_ok=True); out.write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps(result,indent=2))
    return 1 if failed else 0
if __name__=='__main__': raise SystemExit(main())
