#!/usr/bin/env python3
from __future__ import annotations
import concurrent.futures as futures
import datetime, hashlib, importlib.metadata, json, os, platform, re, shutil, stat, subprocess, tempfile, sys, time
from pathlib import Path, PurePosixPath
import fitz
import PIL, pypdf
from PIL import Image, ImageChops, ImageDraw, ImageFont
from pypdf import PdfReader

ROOT=Path(__file__).resolve().parents[2]
POLICY=json.loads((ROOT/'config/pass36/a83-browser-lens-pdf-real-packet-policy.json').read_text('utf-8'))
MANIFEST_PATH=ROOT/POLICY['corpusOutput']['manifestPath']
OUTPUT_ROOT=ROOT/'artifacts/pass36/a83/renders'
RECEIPT=ROOT/POLICY['corpusOutput']['rasterReceiptPath']
TILE=(190,278); COLS=5
SHA256_RE=re.compile(r'^[a-f0-9]{64}$')

def sha256(path:Path)->str:
    h=hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda:f.read(1024*1024),b''): h.update(chunk)
    return h.hexdigest()

def sha256_bytes(value:bytes)->str: return hashlib.sha256(value).hexdigest()

def canonical_bytes(value)->bytes:
    return json.dumps(value,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode('utf-8')

def canonical_sha256(value)->str: return sha256_bytes(canonical_bytes(value))

def read_stable_regular_file(path:Path)->bytes:
    before=path.lstat()
    if not stat.S_ISREG(before.st_mode) or path.is_symlink(): raise RuntimeError(f'not_regular_file:{path}')
    flags=os.O_RDONLY | getattr(os,'O_NOFOLLOW',0)
    descriptor=os.open(path,flags)
    try:
        descriptor_before=os.fstat(descriptor)
        data=b''
        while True:
            chunk=os.read(descriptor,1024*1024)
            if not chunk: break
            data+=chunk
        descriptor_after=os.fstat(descriptor)
    finally: os.close(descriptor)
    after=path.lstat()
    identities=[(row.st_dev,row.st_ino,row.st_size,row.st_mtime_ns) for row in [before,descriptor_before,descriptor_after,after]]
    if len(set(identities))!=1 or len(data)!=after.st_size: raise RuntimeError(f'file_changed_during_read:{path}')
    return data

def binding(path:Path,display_path=None):
    data=read_stable_regular_file(path)
    return {'path':display_path or str(path),'byteLength':len(data),'sha256':sha256_bytes(data)}

def validate_manifest_snapshot():
    manifest_bytes=read_stable_regular_file(MANIFEST_PATH)
    try: manifest=json.loads(manifest_bytes.decode('utf-8'))
    except Exception as exc: raise RuntimeError(f'manifest_json:{exc}') from exc
    declared=manifest.get('integrity',{})
    core=dict(manifest); core.pop('integrity',None)
    computed=canonical_sha256(core)
    if declared.get('algorithm')!='sha256' or declared.get('digest')!=computed:
        raise RuntimeError(f'manifest_canonical_integrity:{declared.get("digest")}/{computed}')
    entries=manifest.get('entries',[])
    if len(entries)!=450 or manifest.get('totals',{}).get('physicalPdfs')!=450 or manifest.get('totals',{}).get('renderedPages')!=2100:
        raise RuntimeError('manifest_denominator')
    boundaries=manifest.get('boundaries',{})
    if boundaries.get('realPacketCredit')!=0 or boundaries.get('browserCredit')!=0 or boundaries.get('secureDeliveryCredit')!=0 or boundaries.get('comprehensionCredit')!=0 or boundaries.get('paidGateEligible') is not False or boundaries.get('saleEnabled') is not False:
        raise RuntimeError('manifest_credit_boundary')
    seen_entries=set(); seen_paths=set()
    for entry in entries:
        entry_id=entry.get('entryId'); relative=entry.get('path')
        if not isinstance(entry_id,str) or entry_id in seen_entries: raise RuntimeError(f'manifest_entry_id:{entry_id}')
        if not isinstance(relative,str) or relative in seen_paths: raise RuntimeError(f'manifest_entry_path:{relative}')
        seen_entries.add(entry_id); seen_paths.add(relative)
        entry_integrity=entry.get('integrity',{})
        entry_core=dict(entry); entry_core.pop('integrity',None)
        if entry_integrity.get('algorithm')!='sha256' or entry_integrity.get('digest')!=canonical_sha256(entry_core):
            raise RuntimeError(f'manifest_entry_integrity:{entry_id}')
    return manifest,manifest_bytes,{
        'path':POLICY['corpusOutput']['manifestPath'],
        'byteLength':len(manifest_bytes),
        'sha256':sha256_bytes(manifest_bytes),
        'canonicalIntegrity':{
            'algorithm':'sha256','declaredDigest':declared['digest'],'computedDigest':computed,'verified':True,
        },
    }

def safe_entry_path(relative:str)->Path:
    portable=PurePosixPath(relative)
    expected_root=PurePosixPath(POLICY['corpusOutput']['root'])
    if portable.is_absolute() or portable.as_posix()!=relative or '..' in portable.parts or '\\' in relative or portable.parts[:len(expected_root.parts)]!=expected_root.parts:
        raise RuntimeError(f'entry_path_outside_corpus:{relative}')
    corpus_root=(ROOT/POLICY['corpusOutput']['root']).resolve(strict=True)
    candidate=ROOT
    for part in portable.parts:
        candidate=candidate/part
        if candidate.is_symlink(): raise RuntimeError(f'entry_path_symlink:{relative}')
    absolute=candidate.resolve(strict=True)
    if absolute==corpus_root or corpus_root not in absolute.parents: raise RuntimeError(f'entry_path_physical_escape:{relative}')
    if absolute.is_symlink() or not absolute.is_file(): raise RuntimeError(f'entry_not_regular:{relative}')
    return absolute

def preflight_pdf_set(entries):
    rows=[]
    for entry in entries:
        entry_id=entry.get('entryId'); expected_length=entry.get('byteLength'); expected_sha=entry.get('pdfSha256'); expected_pages=entry.get('pageCount')
        if not isinstance(expected_length,int) or expected_length<=0 or not isinstance(expected_pages,int) or expected_pages<=0 or not SHA256_RE.fullmatch(str(expected_sha)):
            raise RuntimeError(f'entry_binding_shape:{entry_id}')
        pdf=safe_entry_path(entry['path']); data=read_stable_regular_file(pdf); actual_sha=sha256_bytes(data)
        if len(data)!=expected_length or actual_sha!=expected_sha:
            raise RuntimeError(f'entry_bytes_preflight:{entry_id}:{len(data)}/{expected_length}:{actual_sha}/{expected_sha}')
        rows.append({'entryId':entry_id,'path':entry['path'],'byteLength':len(data),'pdfSha256':actual_sha,'pageCount':expected_pages})
    if len(rows)!=450 or sum(row['pageCount'] for row in rows)!=2100: raise RuntimeError('pdf_set_denominator')
    return {
        'entryCount':len(rows),'totalByteLength':sum(row['byteLength'] for row in rows),
        'pageCount':sum(row['pageCount'] for row in rows),'rows':rows,'aggregateSha256':canonical_sha256(rows),
    }

def distribution_identity(distribution_name,module):
    distribution=importlib.metadata.distribution(distribution_name); rows=[]
    for declared in sorted((str(item) for item in distribution.files or [])):
        target=Path(distribution.locate_file(declared))
        if target.exists() and target.is_file() and not target.is_symlink():
            current=binding(target,declared); rows.append(current)
    if not rows: raise RuntimeError(f'distribution_files_missing:{distribution_name}')
    module_entry=binding(Path(module.__file__).resolve(),str(Path(module.__file__).resolve()))
    aggregate=canonical_sha256(rows)
    return {
        'id':distribution_name,'version':distribution.version,'moduleEntry':module_entry,
        'distributionFileCount':len(rows),'distributionFileSetSha256':aggregate,'binarySha256':aggregate,
    }

def resolve_executed_binary(launcher:Path):
    current=launcher.resolve(strict=True); chain=[]
    for _ in range(5):
        current_binding=binding(current,str(current)); chain.append(current_binding)
        data=read_stable_regular_file(current)
        if data.startswith(b'\x7fELF'): return current,chain
        text=data.decode('utf-8',errors='ignore'); variables={'SCRIPT_DIR':current.parent}
        for match in re.finditer(r'^([A-Z][A-Z0-9_]*)="\$\(cd "\$\{([A-Z][A-Z0-9_]*)\}/([^"\n]+)" && pwd\)"',text,re.MULTILINE):
            base=variables.get(match.group(2))
            if base is not None: variables[match.group(1)]=(base/match.group(3)).resolve(strict=True)
        match=re.search(r'exec\s+"\$\{([A-Z][A-Z0-9_]*)\}/([^"\n]+)"',text)
        if not match or match.group(1) not in variables: return current,chain
        following=(variables[match.group(1)]/match.group(2)).resolve(strict=True)
        if following==current or not following.is_file() or following.is_symlink(): raise RuntimeError(f'tool_wrapper_target:{current}')
        current=following
    raise RuntimeError(f'tool_wrapper_depth:{launcher}')

def external_tool_identity(name,version_args):
    located=shutil.which(name)
    if not located: raise RuntimeError(f'missing_tool:{name}')
    launcher=Path(located).absolute(); launcher_binding=binding(launcher,str(launcher)); binary,execution_chain=resolve_executed_binary(launcher)
    result=run([str(launcher),*version_args],timeout=30)
    version='\n'.join(part.strip() for part in [result.stdout,result.stderr] if part.strip())
    if result.returncode!=0 or not version: raise RuntimeError(f'tool_version:{name}:{result.returncode}')
    binary_binding=binding(binary,str(binary))
    return {
        'id':name,'version':version[:2000],'launcher':launcher_binding,'executionChain':execution_chain,'binary':binary_binding,
        'binarySha256':binary_binding['sha256'],
    }

def toolchain_identity():
    python_binary=Path(sys.executable).resolve(strict=True); python_binding=binding(python_binary,str(python_binary))
    tools=[
        {'id':'Python','version':platform.python_version(),'fullVersion':sys.version,'executable':python_binding,'binarySha256':python_binding['sha256']},
        distribution_identity('pypdf',pypdf),distribution_identity('PyMuPDF',fitz),distribution_identity('Pillow',PIL),
        external_tool_identity('pdfinfo',['-v']),external_tool_identity('pdftotext',['-v']),external_tool_identity('gs',['--version']),
    ]
    return {'toolCount':len(tools),'tools':tools,'aggregateSha256':canonical_sha256(tools)}

def run(cmd,timeout=120): return subprocess.run(cmd,capture_output=True,text=True,timeout=timeout,check=False)

def ink_box(image:Image.Image):
    rgb=image.convert('RGB'); bg=Image.new('RGB',rgb.size,rgb.getpixel((0,0)))
    diff=ImageChops.difference(rgb,bg).convert('L')
    mask=diff.point(lambda value: 255 if value > 12 else 0)
    return mask.getbbox()

def thumb(image:Image.Image):
    result=Image.new('RGB',TILE,'white'); copy=image.convert('RGB'); copy.thumbnail((TILE[0]-10,TILE[1]-32),Image.Resampling.LANCZOS); result.paste(copy,((TILE[0]-copy.width)//2,20)); return result

def contact_sheet(key,rows):
    height=TILE[1]*((len(rows)+COLS-1)//COLS); sheet=Image.new('RGB',(TILE[0]*COLS,height),'#dce4ee'); draw=ImageDraw.Draw(sheet); font=ImageFont.load_default()
    for i,(label,image) in enumerate(rows):
        x=(i%COLS)*TILE[0]; y=(i//COLS)*TILE[1]; sheet.paste(thumb(image),(x,y)); draw.rectangle((x,y,x+TILE[0]-1,y+TILE[1]-1),outline='#52657a',width=1); draw.text((x+5,y+5),label[:28],fill='#0b1726',font=font)
    target=OUTPUT_ROOT/f'{key}-first-pages-contact-sheet.png'; sheet.save(target,format='PNG',optimize=True); return target

def pypdf_check(pdf:Path,expected_pages:int):
    reader=PdfReader(str(pdf),strict=True)
    if reader.is_encrypted: raise RuntimeError('encrypted')
    if len(reader.pages)!=expected_pages: raise RuntimeError(f'page_count:{len(reader.pages)}/{expected_pages}')
    root=reader.trailer['/Root']
    for key in ['/OpenAction','/AA','/AcroForm']:
        if key in root: raise RuntimeError(f'root_active:{key}')
    names=root.get('/Names')
    if names and ('/EmbeddedFiles' in names or '/JavaScript' in names): raise RuntimeError('names_active')
    for page in reader.pages:
        mb=page.mediabox; width=float(mb.width); height=float(mb.height)
        if abs(width-595)>1 or abs(height-842)>1: raise RuntimeError(f'not_a4:{width}:{height}')
        for annot_ref in page.get('/Annots',[]) or []:
            annot=annot_ref.get_object(); action=annot.get('/A')
            if action and str(action.get('/S','')) in {'/URI','/Launch','/GoToR','/JavaScript'}: raise RuntimeError(f'active_annot:{action.get("/S")}')

def external_check(args):
    entry,pdf,tmp=args; expected=int(entry['pageCount']); reasons=[]
    info=run(['pdfinfo',str(pdf)],timeout=60)
    info_ok=info.returncode==0 and any(line.split(':',1)[0].strip()=='Pages' and line.split(':',1)[1].strip()==str(expected) for line in info.stdout.splitlines() if ':' in line)
    if not info_ok: reasons.append('pdfinfo')
    text_target=tmp/f"{entry['entryId'].replace(':','_')}.txt"
    text_run=run(['pdftotext','-enc','UTF-8',str(pdf),str(text_target)],timeout=60)
    extracted=text_target.read_text('utf-8',errors='replace') if text_run.returncode==0 and text_target.exists() else ''
    text_ok=text_run.returncode==0 and bool(extracted)
    if not text_ok: reasons.append('pdftotext')
    marker={'pl':'Przypadek','de':'Fall','en':'Case'}[entry['locale']]
    locale_ok=marker in extracted and entry['symbol'] in extracted
    if not locale_ok: reasons.append('locale_or_symbol_marker')
    return entry['entryId'],info_ok,text_ok,locale_ok,reasons

def gs_check(args):
    entry,pdf=args; result=run(['gs','-q','-dNOPAUSE','-dBATCH','-sDEVICE=nullpage',str(pdf)],timeout=120); return entry['entryId'],result.returncode==0

def verify_receipt_structure(receipt):
    declared=receipt.get('integritySha256'); core=dict(receipt); core.pop('integritySha256',None)
    if not SHA256_RE.fullmatch(str(declared)) or declared!=canonical_sha256(core): raise RuntimeError('receipt_self_integrity')
    if receipt.get('schemaVersion')!='velmere.pass36.a83.pdf-raster-external-parse-qa.v2': raise RuntimeError('receipt_schema')
    manifest=receipt.get('manifestBinding',{}); canonical=manifest.get('canonicalIntegrity',{})
    if not SHA256_RE.fullmatch(str(manifest.get('sha256'))) or canonical.get('verified') is not True or canonical.get('declaredDigest')!=canonical.get('computedDigest'):
        raise RuntimeError('receipt_manifest_binding')
    pdf_set=receipt.get('pdfSetBinding',{}); pdf_rows=pdf_set.get('rows',[])
    if len(pdf_rows)!=450 or pdf_set.get('entryCount')!=450 or pdf_set.get('pageCount')!=2100 or pdf_set.get('aggregateSha256')!=canonical_sha256(pdf_rows):
        raise RuntimeError('receipt_pdf_set_binding')
    raster=receipt.get('rasterEvidenceBinding',{}); page_rows=raster.get('pageHashSet',{}).get('rows',[]); sheets=raster.get('contactSheetSet',{}).get('rows',[])
    if len(page_rows)!=2100 or raster.get('pageHashSet',{}).get('count')!=2100 or raster.get('pageHashSet',{}).get('aggregateSha256')!=canonical_sha256(page_rows):
        raise RuntimeError('receipt_raster_page_binding')
    if len(sheets)!=9 or raster.get('contactSheetSet',{}).get('count')!=9 or raster.get('contactSheetSet',{}).get('aggregateSha256')!=canonical_sha256(sheets):
        raise RuntimeError('receipt_contact_sheet_binding')
    expected_raster_aggregate=canonical_sha256({'pageHashSetAggregateSha256':raster['pageHashSet']['aggregateSha256'],'contactSheetSetAggregateSha256':raster['contactSheetSet']['aggregateSha256']})
    if raster.get('aggregateSha256')!=expected_raster_aggregate: raise RuntimeError('receipt_raster_aggregate')
    toolchain=receipt.get('toolchainIdentity',{}); tools=toolchain.get('tools',[])
    if [row.get('id') for row in tools]!=['Python','pypdf','PyMuPDF','Pillow','pdfinfo','pdftotext','gs'] or toolchain.get('aggregateSha256')!=canonical_sha256(tools) or not all(SHA256_RE.fullmatch(str(row.get('binarySha256'))) for row in tools):
        raise RuntimeError('receipt_toolchain_binding')
    for key in ['providerCredit','externalEvidenceCredit','browserCredit','secureDeliveryCredit','customerComprehensionCredit','paidReleaseCredit']:
        if receipt.get(key)!=0: raise RuntimeError(f'receipt_credit_promotion:{key}')
    if receipt.get('promotionAllowed') is not False: raise RuntimeError('receipt_promotion_allowed')
    return True

def main():
    started=time.monotonic()
    required=['pdfinfo','pdftotext','gs']; missing=[x for x in required if shutil.which(x) is None]
    if missing: raise SystemExit('missing_tools:'+','.join(missing))
    manifest,manifest_bytes,manifest_binding=validate_manifest_snapshot()
    entries=manifest['entries']
    pdf_set_binding=preflight_pdf_set(entries)
    toolchain=toolchain_identity()
    if OUTPUT_ROOT.exists(): shutil.rmtree(OUTPUT_ROOT)
    OUTPUT_ROOT.mkdir(parents=True)
    reason_map={e['entryId']:[] for e in entries}; pypdf_pass=0
    for i,e in enumerate(entries,1):
        try: pypdf_check(ROOT/e['path'],int(e['pageCount'])); pypdf_pass+=1
        except Exception as exc: reason_map[e['entryId']].append('pypdf:'+str(exc))
        if i%50==0: print(f'pypdf {i}/450',file=sys.stderr,flush=True)
    pdfinfo_pass=pdftotext_pass=locale_pass=0
    with tempfile.TemporaryDirectory(prefix='velmere-a83-text-') as td:
        td=Path(td)
        with futures.ThreadPoolExecutor(max_workers=12) as ex:
            for eid,info_ok,text_ok,locale_ok,reasons in ex.map(external_check,[(e,ROOT/e['path'],td) for e in entries]):
                pdfinfo_pass+=int(info_ok); pdftotext_pass+=int(text_ok); locale_pass+=int(locale_ok); reason_map[eid].extend(reasons)
    gs_targets=[]
    for loc in ['pl','en','de']:
        for tier in ['basic','pro','advanced']:
            gs_targets.extend([e for e in entries if e['locale']==loc and e['tier']==tier][:5])
    gs_pass=0
    with futures.ThreadPoolExecutor(max_workers=6) as ex:
        for eid,ok in ex.map(gs_check,[(e,ROOT/e['path']) for e in gs_targets]):
            gs_pass+=int(ok)
            if not ok: reason_map[eid].append('ghostscript')
    documents=[]; raster_page_rows=[]; total_pages=blank=edge=0
    pdf_binding_by_entry={row['entryId']:row for row in pdf_set_binding['rows']}
    group_first={(loc,tier):[] for loc in ['pl','en','de'] for tier in ['basic','pro','advanced']}
    matrix=fitz.Matrix(0.5,0.5)
    for i,e in enumerate(entries,1):
        pdf=ROOT/e['path']; expected=int(e['pageCount']); pages=[]
        try:
            doc=fitz.open(pdf)
            if doc.page_count!=expected: reason_map[e['entryId']].append(f'render_pages:{doc.page_count}/{expected}')
            for pageno,page in enumerate(doc,1):
                pix=page.get_pixmap(matrix=matrix,alpha=False)
                image=Image.frombytes('RGB',[pix.width,pix.height],pix.samples)
                box=ink_box(image); is_blank=box is None; touches=False
                if box:
                    l,t,r,b=box; touches=l<2 or t<2 or r>image.width-2 or b>image.height-2
                blank+=int(is_blank); edge+=int(touches); total_pages+=1
                png_bytes=pix.tobytes('png'); png_hash=sha256_bytes(png_bytes)
                page_binding={'entryId':e['entryId'],'page':pageno,'width':image.width,'height':image.height,'pngByteLength':len(png_bytes),'pngSha256':png_hash}
                raster_page_rows.append(page_binding)
                pages.append({'page':pageno,'width':image.width,'height':image.height,'blank':is_blank,'touchesRasterEdge':touches,'pngByteLength':len(png_bytes),'pngSha256':png_hash})
                if pageno==1: group_first[(e['locale'],e['tier'])].append((e['entryId'],image.copy()))
            doc.close()
        except Exception as exc: reason_map[e['entryId']].append('render:'+str(exc))
        preflight=pdf_binding_by_entry[e['entryId']]
        documents.append({'entryId':e['entryId'],'locale':e['locale'],'tier':e['tier'],'file':e['path'],'byteLength':preflight['byteLength'],'pdfSha256':preflight['pdfSha256'],'pageCount':len(pages),'checksPassed':len(reason_map[e['entryId']])==0,'reasons':reason_map[e['entryId']],'pages':pages})
        if i%50==0: print(f'render {i}/450',file=sys.stderr,flush=True)
    sheets=[]
    for (loc,tier),rows in group_first.items():
        target=contact_sheet(f'{loc}-{tier}',rows)
        with Image.open(target) as sheet_image: width,height=sheet_image.size
        sheet_binding=binding(target,target.relative_to(ROOT).as_posix())
        sheets.append({'locale':loc,'tier':tier,'file':sheet_binding['path'],'byteLength':sheet_binding['byteLength'],'sha256':sheet_binding['sha256'],'width':width,'height':height,'documentCount':len(rows)})
    if len(raster_page_rows)!=2100: raise RuntimeError(f'raster_page_hash_denominator:{len(raster_page_rows)}')
    postflight_pdf_set=preflight_pdf_set(entries)
    if postflight_pdf_set!=pdf_set_binding: raise RuntimeError('pdf_set_changed_during_qa')
    postflight_manifest=read_stable_regular_file(MANIFEST_PATH)
    if postflight_manifest!=manifest_bytes: raise RuntimeError('manifest_changed_during_qa')
    page_hash_set={'count':len(raster_page_rows),'rows':raster_page_rows,'aggregateSha256':canonical_sha256(raster_page_rows)}
    contact_sheet_set={'count':len(sheets),'rows':sheets,'aggregateSha256':canonical_sha256(sheets)}
    raster_evidence_binding={
        'pageHashSet':page_hash_set,'contactSheetSet':contact_sheet_set,
        'aggregateSha256':canonical_sha256({'pageHashSetAggregateSha256':page_hash_set['aggregateSha256'],'contactSheetSetAggregateSha256':contact_sheet_set['aggregateSha256']}),
    }
    failures=[d for d in documents if not d['checksPassed']]
    status='PASS_A83_PDF_RASTER_AND_EXTERNAL_PARSE_QA' if not failures and total_pages==2100 and blank==0 and edge==0 and pypdf_pass==450 and pdfinfo_pass==450 and pdftotext_pass==450 and locale_pass==450 and gs_pass==45 else 'FAIL_A83_PDF_RASTER_AND_EXTERNAL_PARSE_QA'
    receipt={'schemaVersion':'velmere.pass36.a83.pdf-raster-external-parse-qa.v2','revisionId':POLICY['revisionId'],'fixtureEpoch':POLICY['deterministicEpoch'],'evaluatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat().replace('+00:00','Z'),'executionDurationMs':round((time.monotonic()-started)*1000),'status':status,'manifestBinding':manifest_binding,'pdfSetBinding':pdf_set_binding,'rasterEvidenceBinding':raster_evidence_binding,'toolchainIdentity':toolchain,'pdfCount':len(documents),'renderedPageCount':total_pages,'expectedPageCount':2100,'blankPages':blank,'pagesTouchingRasterEdge':edge,'pypdfPassed':pypdf_pass,'pdfinfoPassed':pdfinfo_pass,'pdftotextPassed':pdftotext_pass,'localeMarkerPassed':locale_pass,'ghostscriptSampleCount':45,'ghostscriptSamplePassed':gs_pass,'contactSheets':sheets,'failedDocuments':len(failures),'failures':failures[:25],'documents':documents,'promotionAllowed':False,'providerCredit':0,'externalEvidenceCredit':0,'browserCredit':0,'secureDeliveryCredit':0,'customerComprehensionCredit':0,'paidReleaseCredit':0,'truthBoundary':'All 450 manifest-bound synthetic/offline PDFs are byte-length and SHA-256 verified before local parsing and rasterization; the exact 450-PDF set, 2100 raster-page hash set, nine contact sheets and local toolchain are bound. Ghostscript is sampled across 45 documents. This grants zero provider, production-browser, rights, secure-delivery, real-customer, paid, LIVE or sale credit.'}
    receipt['integritySha256']=canonical_sha256(receipt)
    verify_receipt_structure(receipt)
    RECEIPT.parent.mkdir(parents=True,exist_ok=True); RECEIPT.write_text(json.dumps(receipt,indent=2,ensure_ascii=False)+'\n','utf-8')
    persisted=json.loads(RECEIPT.read_text('utf-8')); verify_receipt_structure(persisted)
    result={k:receipt[k] for k in ['status','pdfCount','renderedPageCount','blankPages','pagesTouchingRasterEdge','pypdfPassed','pdfinfoPassed','pdftotextPassed','localeMarkerPassed','ghostscriptSamplePassed','failedDocuments','executionDurationMs','integritySha256']}
    result.update({'manifestFileSha256':manifest_binding['sha256'],'manifestCanonicalIntegrity':manifest_binding['canonicalIntegrity']['verified'],'pdfSetAggregateSha256':pdf_set_binding['aggregateSha256'],'rasterEvidenceAggregateSha256':raster_evidence_binding['aggregateSha256'],'toolchainAggregateSha256':toolchain['aggregateSha256'],'receiptFileSha256':sha256(RECEIPT)})
    print(json.dumps(result,indent=2))
    if not status.startswith('PASS'): raise SystemExit(1)
if __name__=='__main__': main()
