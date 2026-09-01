#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json, subprocess, tempfile
from pathlib import Path
from pypdf import PdfReader
import fitz
from PIL import Image, ImageChops

ROOT=Path.cwd()
CORPUS=ROOT/'artifacts/pass36/a83/browser-lens-pdf-corpus'
OUT=ROOT/'artifacts/closure/p61/receipts/P61_TARGETED_PDF_QA.json'
EXPECTED_FONT_SHA='a07eea516ecb22957f162d68a559462c9af0534487669969d500f8e92aece0fa'
TIERS={'basic':2,'pro':4,'advanced':8}
LOCALES={'pl':'pl-PL','en':'en-US','de':'de-DE'}
MARKERS={'pl':'Przypadek','en':'Case','de':'Fall'}

def sha(b:bytes)->str: return hashlib.sha256(b).hexdigest()
def run(cmd): return subprocess.run(cmd,capture_output=True,text=True,timeout=60,check=False)
def ink_bbox(pix):
    img=Image.frombytes('RGB',[pix.width,pix.height],pix.samples)
    bg=Image.new('RGB',img.size,img.getpixel((0,0)))
    diff=ImageChops.difference(img,bg).convert('L').point(lambda x:255 if x>12 else 0)
    return diff.getbbox(), img.size

rows=[]; failures=[]
for locale,lang in LOCALES.items():
  for tier,pages_expected in TIERS.items():
    matches=sorted((CORPUS/locale/tier).glob(f'*-btc-{tier}-{locale}.pdf'))
    if len(matches)!=1:
      failures.append({'case':f'{tier}:{locale}','reason':'pdf_match_count','count':len(matches)}); continue
    p=matches[0]; b=p.read_bytes(); reader=PdfReader(str(p),strict=True)
    case={'tier':tier,'locale':locale,'path':p.relative_to(ROOT).as_posix(),'byteLength':len(b),'sha256':sha(b)}
    checks={}
    checks['pageCount']=len(reader.pages)==pages_expected
    checks['a4']=all(abs(float(pg.mediabox.width)-595)<=1 and abs(float(pg.mediabox.height)-842)<=1 for pg in reader.pages)
    root=reader.trailer['/Root']
    checks['lang']=str(root.get('/Lang'))==lang
    checks['structTree']=bool(root.get('/StructTreeRoot')) and bool(root.get('/MarkInfo'))
    checks['noRootActiveContent']=all(k not in root for k in ['/OpenAction','/AA','/AcroForm'])
    names=root.get('/Names')
    checks['noNamesActiveContent']=not names or ('/EmbeddedFiles' not in names and '/JavaScript' not in names)
    font_ok=True; tounicode_ok=True; font_hashes=[]; no_active_annots=True
    for pg in reader.pages:
      font=pg['/Resources']['/Font']['/F1'].get_object()
      font_ok &= str(font.get('/BaseFont'))=='/VelmereManrope-Regular'
      tounicode_ok &= '/ToUnicode' in font
      fd=font['/FontDescriptor'].get_object(); ff=fd['/FontFile2'].get_object(); fb=ff.get_data(); font_hashes.append(sha(fb))
      for aref in pg.get('/Annots',[]) or []:
        a=aref.get_object(); action=a.get('/A')
        if action and str(action.get('/S','')) in {'/URI','/Launch','/GoToR','/JavaScript'}: no_active_annots=False
    checks['fontEmbeddedExact']=font_ok and all(x==EXPECTED_FONT_SHA for x in font_hashes)
    checks['toUnicode']=tounicode_ok
    checks['noActiveAnnotations']=no_active_annots
    info=run(['pdfinfo',str(p)])
    checks['pdfinfo']=info.returncode==0 and f'Pages:           {pages_expected}' in info.stdout
    with tempfile.TemporaryDirectory() as td:
      txt=Path(td)/'x.txt'; rr=run(['pdftotext','-enc','UTF-8',str(p),str(txt)])
      text=txt.read_text('utf-8',errors='replace') if txt.exists() else ''
    checks['pdftotext']=rr.returncode==0 and MARKERS[locale] in text and 'BTC' in text
    gs=run(['gs','-q','-dNOPAUSE','-dBATCH','-sDEVICE=nullpage',str(p)])
    checks['ghostscript']=gs.returncode==0
    doc=fitz.open(str(p)); rendered=0; blank=0; edge=0
    for pg in doc:
      pix=pg.get_pixmap(matrix=fitz.Matrix(1.25,1.25),alpha=False)
      bbox,size=ink_bbox(pix); rendered+=1
      if bbox is None: blank+=1
      else:
        x0,y0,x1,y1=bbox
        if x0<=0 or y0<=0 or x1>=size[0] or y1>=size[1]: edge+=1
    checks['renderedAllPages']=rendered==pages_expected
    checks['noBlankPages']=blank==0
    checks['noRasterEdgeContact']=edge==0
    case['renderedPages']=rendered; case['blankPages']=blank; case['pagesTouchingEdge']=edge; case['checks']=checks
    case['pass']=all(checks.values())
    if not case['pass']: failures.append({'case':f'{tier}:{locale}','failed':[k for k,v in checks.items() if not v]})
    rows.append(case)

receipt={
 'schemaVersion':'velmere.p61.targeted-pdf-qa.v1',
 'status':'PASS_P61_TARGETED_CURRENT_RENDERER_PDF_QA' if not failures and len(rows)==9 else 'FAIL_P61_TARGETED_CURRENT_RENDERER_PDF_QA',
 'evidenceClass':'CURRENT_LINUX_NODE22_SYNTHETIC_FIXTURE_ONLY_NO_RELEASE_RUNTIME_CREDIT',
 'cases':len(rows),'passed':sum(1 for r in rows if r['pass']),'renderedPages':sum(r.get('renderedPages',0) for r in rows),
 'expectedFontSha256':EXPECTED_FONT_SHA,
 'truthBoundary':'Nine current-source BTC PDFs cover Basic/Pro/Advanced x PL/EN/DE using the recovered exact external Manrope bytes. This is targeted fixture QA, not exact Windows/Node24 release-runtime, provider, rights, customer-value, sale or LIVE evidence.',
 'rows':rows,'failures':failures,
}
core=json.dumps(receipt,sort_keys=True,separators=(',',':')).encode(); receipt['integritySha256']=sha(core)
OUT.write_text(json.dumps(receipt,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
print(json.dumps({k:receipt[k] for k in ['status','cases','passed','renderedPages','integritySha256']},indent=2))
raise SystemExit(0 if receipt['status'].startswith('PASS') else 1)
