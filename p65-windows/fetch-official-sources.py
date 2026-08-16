from __future__ import annotations
import csv, datetime as dt, hashlib, io, json, pathlib, urllib.request
OUT=pathlib.Path('P65_RESULT'); OUT.mkdir(exist_ok=True)
UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Velmere-P65-Current-Source-Evidence/1.1'
SOURCES=[
 ('nvd_terms','https://nvd.nist.gov/developers/terms-of-use',True,['NVD API','Terms of Use']),
 ('cve_terms_current','https://www.cve.org/legal/termsofuse',False,['royalty-free','CVE']),
 ('cve_terms_archive','https://www.cve.org/Resources/Media/Archives/OldWebsite/about/termsofuse.html',True,['royalty-free','CVE']),
 ('cwe_terms','https://cwe.mitre.org/about/termsofuse.html',True,['commercial purposes','CWE']),
 ('capec_terms','https://capec.mitre.org/about/termsofuse.html',True,['commercial purposes','CAPEC']),
 ('ecb_reuse','https://www.ecb.europa.eu/stats/ecb_statistics/governance_and_quality_framework/html/usage_policy.en.html',True,['free of charge','reuse']),
 ('nvd_sample','https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=CVE-2024-3094',True,['CVE-2024-3094']),
 ('ecb_fx','https://data-api.ecb.europa.eu/service/data/EXR/D.USD+PLN+GBP.EUR.SP00.A?lastNObservations=2&format=csvdata',True,['KEY','OBS_VALUE']),
 ('cisa_kev','https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json',False,['vulnerabilities']),
 ('cisa_kev_page','https://www.cisa.gov/known-exploited-vulnerabilities-catalog',False,['Known Exploited Vulnerabilities','License']),
 ('coingecko_terms','https://www.coingecko.com/en/api_terms',False,['CoinGecko API']),
 ('coingecko_pricing','https://www.coingecko.com/en/api/pricing',False,['Commercial','Demo']),
 ('twelve_data_terms','https://twelvedata.com/terms',False,['Free Tier','commercial']),
 ('alpha_vantage_policy','https://www.alphavantage.co/realtime_data_policy/',False,['commercial use']),
 ('polygon_stocks','https://polygon.io/stocks',False,['Individual use'])]

def fetch(name,url,required,anchors):
    req=urllib.request.Request(url,headers={'User-Agent':UA,'Accept':'*/*'})
    now=dt.datetime.now(dt.timezone.utc).isoformat()
    try:
        with urllib.request.urlopen(req,timeout=45) as r:
            b=r.read(); status=getattr(r,'status',200); final=r.geturl(); ctype=r.headers.get('Content-Type')
        text=b.decode('utf-8','ignore')
        anchor={a:(a.lower() in text.lower()) for a in anchors}
        return {'id':name,'url':url,'finalUrl':final,'required':required,'fetchedAt':now,'httpStatus':status,'contentType':ctype,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest(),'anchors':anchor,'anchorPass':all(anchor.values()),'_bytes':b}
    except Exception as e:
        return {'id':name,'url':url,'required':required,'fetchedAt':now,'httpStatus':None,'bytes':0,'sha256':None,'anchors':{a:False for a in anchors},'anchorPass':False,'error':type(e).__name__+': '+str(e),'_bytes':b''}

results=[fetch(*x) for x in SOURCES]
by={x['id']:x for x in results}
required_fail=[x['id'] for x in results if x['required'] and not (x['httpStatus']==200 and x['anchorPass'])]
normalized={'schemaVersion':'velmere.p65.current-official-source-normalized.v1','generatedAt':dt.datetime.now(dt.timezone.utc).isoformat(),'nvd':None,'ecbFx':None,'cisaKev':None}
try:
    j=json.loads(by['nvd_sample']['_bytes']); cve=j['vulnerabilities'][0]['cve']
    normalized['nvd']={'id':cve.get('id'),'published':cve.get('published'),'lastModified':cve.get('lastModified'),'sourceIdentifier':cve.get('sourceIdentifier'),'vulnStatus':cve.get('vulnStatus'),'retrievedSha256':by['nvd_sample']['sha256']}
except Exception as e: normalized['nvd']={'parseError':str(e)}
try:
    text=by['ecb_fx']['_bytes'].decode('utf-8-sig','replace'); rows=list(csv.DictReader(io.StringIO(text)))
    def pick(r,k): return r.get(k) or r.get(k.upper()) or r.get(k.lower())
    slim=[{'key':pick(r,'KEY'),'currency':pick(r,'CURRENCY'),'currencyDenom':pick(r,'CURRENCY_DENOM'),'frequency':pick(r,'FREQ'),'timePeriod':pick(r,'TIME_PERIOD'),'obsValue':pick(r,'OBS_VALUE'),'title':pick(r,'TITLE')} for r in rows]
    normalized['ecbFx']={'rowCount':len(slim),'rows':slim[-12:],'retrievedSha256':by['ecb_fx']['sha256'],'customerSafeBoundary':'ECB reference/statistical data only; not an executable quote or trading venue price.'}
except Exception as e: normalized['ecbFx']={'parseError':str(e)}
try:
    j=json.loads(by['cisa_kev']['_bytes']); vulns=j.get('vulnerabilities',[]); recent=sorted(vulns,key=lambda x:x.get('dateAdded',''))[-5:]
    normalized['cisaKev']={'catalogVersion':j.get('catalogVersion'),'dateReleased':j.get('dateReleased'),'count':len(vulns),'recent':[{'cveID':x.get('cveID'),'dateAdded':x.get('dateAdded'),'vendorProject':x.get('vendorProject'),'product':x.get('product')} for x in recent],'retrievedSha256':by['cisa_kev']['sha256'],'rightsState':'WITHHELD_EXPLICIT_LICENSE_BODY_NOT_CAPTURED'}
except Exception as e: normalized['cisaKev']={'parseError':str(e),'rightsState':'WITHHELD_EXPLICIT_LICENSE_BODY_NOT_CAPTURED'}
public=[]
for x in results: public.append({k:v for k,v in x.items() if k!='_bytes'})
receipt={'schemaVersion':'velmere.p65.current-official-source-fetch-receipt.v2','generatedAt':dt.datetime.now(dt.timezone.utc).isoformat(),'requiredSourceCount':sum(x[2] for x in SOURCES),'requiredFailures':required_fail,'requiredPassed':len(required_fail)==0,'sources':public,'cveCurrentEndpointState':'CURRENT_URL_FETCH_IS_BEST_EFFORT; OFFICIAL_CVE_ARCHIVE_LICENSE_TEXT_IS_HASH_BOUND_FOR_RUNNER_REPLAY; CURRENT_CVE_TERMS WERE_SEPARATELY_PRIMARY-SOURCE_REVIEWED','rightsCreditBoundary':'HTTP retrieval and anchor checks prove only current document/data receipt. Rights classifications remain bounded engineering decisions in the P65 policy; CISA KEV rights remain withheld.','currentProviderDataCredit':'ECB_FX_REFERENCE_AND_NVD_SAMPLE_ONLY_NOT_FULL_PRODUCT_CURRENTNESS'}
(OUT/'P65_CURRENT_OFFICIAL_SOURCE_FETCH_RECEIPT.json').write_text(json.dumps(receipt,indent=2,sort_keys=True)+'\n',encoding='utf-8')
(OUT/'P65_CURRENT_OFFICIAL_SOURCE_NORMALIZED.json').write_text(json.dumps(normalized,indent=2,sort_keys=True)+'\n',encoding='utf-8')
print(json.dumps({'requiredPassed':receipt['requiredPassed'],'requiredFailures':required_fail,'nvd':normalized['nvd'],'ecbRows':normalized['ecbFx'].get('rowCount') if isinstance(normalized['ecbFx'],dict) else None,'cisaCount':normalized['cisaKev'].get('count') if isinstance(normalized['cisaKev'],dict) else None,'cveCurrentHttp':by['cve_terms_current']['httpStatus']},indent=2))
if required_fail: raise SystemExit(2)
