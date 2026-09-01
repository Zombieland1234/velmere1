from __future__ import annotations
import hashlib, json, subprocess, tempfile
from pathlib import Path
from PIL import Image
from pypdf import PdfReader

ROOT=Path('/mnt/data/velmere_recover/p68_tmp_pdfs')
REND=Path('/mnt/data/velmere_recover/p68_pdf_renders')
OUT=Path('artifacts/closure/p68/receipts/P68_AUDIT_CUSTOMER_PDF_QA.json')
rows=[]; failures=[]; total_pages=0
for pdf in sorted(ROOT.glob('audit-customer-*.pdf')):
    parts=pdf.stem.split('-')
    tier=parts[-2]; locale=parts[-1]
    data=pdf.read_bytes(); reader=PdfReader(str(pdf)); total_pages += len(reader.pages)
    root=reader.trailer['/Root']
    active=[]
    for key in ['/OpenAction','/AA','/JavaScript','/JS','/EmbeddedFiles','/AcroForm']:
        if key in root: active.append(key)
    annots=sum(len(page.get('/Annots') or []) for page in reader.pages)
    page_sizes=[]; font_checks=[]
    for pno,page in enumerate(reader.pages,1):
        mb=page.mediabox; w=float(mb.width); h=float(mb.height); page_sizes.append([round(w,3),round(h,3)])
        if abs(w-595)>1 or abs(h-842)>1: failures.append(f'{pdf.name}:not_a4:{w}x{h}')
        fonts=(page['/Resources'].get('/Font') or {}).get_object()
        for name,ref in fonts.items():
            fo=ref.get_object(); desc=fo.get('/FontDescriptor'); embedded=False
            if desc:
                d=desc.get_object(); embedded=any(k in d for k in ['/FontFile','/FontFile2','/FontFile3'])
            to_unicode='/ToUnicode' in fo
            font_checks.append({'page':pno,'name':str(name),'embedded':embedded,'toUnicode':to_unicode,'subtype':str(fo.get('/Subtype'))})
            if not embedded or not to_unicode: failures.append(f'{pdf.name}:font_contract:{name}:embedded={embedded}:unicode={to_unicode}')
    text=subprocess.check_output(['pdftotext',str(pdf),'-'],text=True,errors='replace')
    required=['Finding [','source=','Source-bound provider receipts:','Content-bound current receipts:','Independent upstream roots:']
    for needle in required:
        if needle not in text: failures.append(f'{pdf.name}:missing_text:{needle}')
    if tier=='basic' and 'Finding action -' in text: failures.append(f'{pdf.name}:basic_action_leak')
    if tier!='basic' and 'Finding action -' not in text: failures.append(f'{pdf.name}:paid_action_missing')
    locale_needles={'pl':'Podsumowanie customer-safe','en':'Customer-safe summary','de':'Customer-safe Zusammenfassung'}
    if locale_needles[locale] not in text: failures.append(f'{pdf.name}:locale_marker_missing')
    render=REND/pdf.stem/'page-1.png'
    im=Image.open(render).convert('L')
    pix=im.load(); W,H=im.size
    def nonwhite_box(x0,y0,x1,y1,threshold=245):
        c=0
        for y in range(max(0,y0),min(H,y1)):
            for x in range(max(0,x0),min(W,x1)):
                if pix[x,y] < threshold: c+=1
        return c
    edge={'left':nonwhite_box(0,0,4,H),'right':nonwhite_box(W-4,0,W,H),'top':nonwhite_box(0,0,W,4),'bottom':nonwhite_box(0,H-4,W,H)}
    if any(edge.values()): failures.append(f'{pdf.name}:edge_contact:{edge}')
    rows.append({'file':pdf.name,'tier':tier,'locale':locale,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'pages':len(reader.pages),'pageSizes':page_sizes,'activeRootKeys':active,'annotations':annots,'fonts':font_checks,'renderSize':[W,H],'edgeContact4px':edge,'textChars':len(text)})
receipt={'schemaVersion':'velmere.p68.audit-customer-pdf-qa.v1','status':'PASS' if not failures else 'FAIL','truthClass':'INTERNAL_FIXTURE_ONLY','pdfs':len(rows),'pages':total_pages,'failures':failures,'cases':rows,'customerFinalOutputCredit':0,'auditFinalCustomerPdfCredit':0,'rightsCredit':0,'saleCredit':0,'live':False,'truthBoundary':'Physical PDF QA of synthetic P68 audit customer snapshots only. A4, embedded subset fonts with ToUnicode, text binding, no active root content/annotations, and rendered-edge integrity do not promote fixture PDFs to final customer artifacts.'}
OUT.write_text(json.dumps(receipt,indent=2,sort_keys=True)+'\n',encoding='utf-8')
print(json.dumps({'status':receipt['status'],'pdfs':len(rows),'pages':total_pages,'failures':failures},indent=2))
raise SystemExit(0 if not failures else 2)
