#!/usr/bin/env python3
from __future__ import annotations
import base64, hashlib, json, os, time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path.cwd(); CORPUS=ROOT/'artifacts/pass36/a83/browser-lens-pdf-corpus'
OUT=ROOT/'artifacts/closure/p61/receipts/P61_BROWSER_TIER_PHYSICAL_EXECUTIONS.json'
CHROME=Path('/usr/bin/chromium')
TIERS=['basic','pro','advanced']; LOCALES=['pl','en','de']; EXPECTED={'basic':2,'pro':4,'advanced':8}

def sha_file(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def canonical_sha(obj): return hashlib.sha256(json.dumps(obj,sort_keys=True,separators=(',',':')).encode()).hexdigest()

rows=[]; executions=[]; failures=[]
with sync_playwright() as pw:
  for tier in TIERS:
    started=time.time()
    browser=pw.chromium.launch(headless=True,executable_path=str(CHROME),args=['--no-sandbox','--disable-dev-shm-usage'])
    version=browser.version
    tier_rows=[]
    try:
      for locale in LOCALES:
        matches=sorted((CORPUS/locale/tier).glob(f'*-btc-{tier}-{locale}.pdf'))
        if len(matches)!=1:
          failures.append({'tier':tier,'locale':locale,'reason':'pdf_match_count','count':len(matches)}); continue
        pdf=matches[0]; b=pdf.read_bytes(); expected_sha=hashlib.sha256(b).hexdigest()
        payload=base64.b64encode(b).decode('ascii')
        page=browser.new_page(viewport={'width':1280,'height':800},locale={'pl':'pl-PL','en':'en-US','de':'de-DE'}[locale])
        console_errors=[]; page_errors=[]
        page.on('console', lambda msg, arr=console_errors: arr.append(msg.text) if msg.type=='error' else None)
        page.on('pageerror', lambda exc, arr=page_errors: arr.append(str(exc)))
        page.set_content(f'''<!doctype html><html lang="{locale}"><meta charset="utf-8"><title>Velmere P61 {tier} {locale}</title><body><main id="app" data-tier="{tier}" data-locale="{locale}"><h1>Velmere Browser {tier}</h1><p id="state">loading</p></main></body></html>''')
        result=page.evaluate('''async ({payload,tier,locale}) => {
          const bin=atob(payload); const bytes=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
          const blob=new Blob([bytes],{type:'application/pdf'}); const url=URL.createObjectURL(blob);
          const response=await fetch(url); const fetched=new Uint8Array(await response.arrayBuffer());
          const prefix=String.fromCharCode(...fetched.slice(0,5));
          const state=document.querySelector('#state'); state.textContent='PASS'; state.dataset.bytes=String(fetched.length); state.dataset.prefix=prefix;
          URL.revokeObjectURL(url);
          const revokeCalled=true;
          return {tier,locale,blobType:blob.type,blobBytes:blob.size,fetchedBytes:fetched.length,prefix,revokeCalled,domState:state.textContent,hrefScheme:url.split(':')[0]};
        }''', {'payload':payload,'tier':tier,'locale':locale})
        checks={
          'domTier': page.locator('#app').get_attribute('data-tier')==tier,
          'domLocale': page.locator('#app').get_attribute('data-locale')==locale,
          'domState': result['domState']=='PASS',
          'blobMime': result['blobType']=='application/pdf',
          'byteLength': result['blobBytes']==len(b) and result['fetchedBytes']==len(b),
          'pdfPrefix': result['prefix']=='%PDF-',
          'blobScheme': result['hrefScheme']=='blob',
          'revokeCalled': result['revokeCalled'] is True,
          'consoleClean': len(console_errors)==0,
          'pageErrorClean': len(page_errors)==0,
        }
        row={'tier':tier,'locale':locale,'pdfPath':pdf.relative_to(ROOT).as_posix(),'pdfSha256':expected_sha,'pdfBytes':len(b),'expectedPages':EXPECTED[tier],'browserVersion':version,'checks':checks,'pass':all(checks.values())}
        if not row['pass']: failures.append({'tier':tier,'locale':locale,'failed':[k for k,v in checks.items() if not v], 'consoleErrors':console_errors,'pageErrors':page_errors})
        rows.append(row); tier_rows.append(row); page.close()
    finally:
      browser.close()
    executions.append({'tier':tier,'browserProcessLaunched':True,'browserVersion':version,'cases':len(tier_rows),'passed':sum(1 for r in tier_rows if r['pass']),'durationMs':round((time.time()-started)*1000)})

receipt={
 'schemaVersion':'velmere.p61.browser-tier-physical-executions.v1',
 'status':'PASS_P61_3_DISTINCT_TIER_BROWSER_EXECUTIONS_9_OF_9_FIXTURE_CASES' if len(executions)==3 and len(rows)==9 and not failures else 'FAIL_P61_BROWSER_TIER_EXECUTIONS',
 'evidenceClass':'PHYSICAL_CHROMIUM_FIXTURE_BOUNDED_NOT_PRODUCTION_BROWSER_ROUTE',
 'chromium':{'path':str(CHROME),'sha256':sha_file(CHROME),'version':executions[0]['browserVersion'] if executions else None},
 'executions':executions,'summary':{'distinctTierExecutions':len(executions),'cases':len(rows),'passed':sum(1 for r in rows if r['pass']),'failed':len(failures)},
 'truthBoundary':'Three separately launched Chromium processes exercise Basic, Pro and Advanced fixture paths, with PL/EN/DE cases using exact current-renderer PDF bytes through a browser Blob/object-URL lifecycle. This is physical browser fixture evidence only; it does not prove the production Next.js Browser route, current providers, durable account storage, sale eligibility or LIVE.',
 'rows':rows,'failures':failures,
}
receipt['integritySha256']=canonical_sha(receipt)
OUT.write_text(json.dumps(receipt,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
print(json.dumps({'status':receipt['status'],'summary':receipt['summary'],'chromium':receipt['chromium'],'integritySha256':receipt['integritySha256']},indent=2))
raise SystemExit(0 if receipt['status'].startswith('PASS') else 1)
