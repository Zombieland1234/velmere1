#!/usr/bin/env python3
import json, hashlib, os, sys
from pathlib import Path
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[2]
OUTROOT = ROOT / 'artifacts/closure/p64'
PROFILES_DIR = OUTROOT / 'profile_outputs'
PROFILES_DIR.mkdir(parents=True, exist_ok=True)

GEN_AT = '2026-08-16T14:20:00.000Z'
CONTEXTS = [('BASIC_CONTEXT','basic'),('PRO_CONTEXT','pro'),('ADVANCED_CONTEXT','advanced')]

SRC = {
 'audit': 'artifacts/pass36/a82/PASS36_A82_FIXTURE_RUNTIME.json',
 'a83_manifest': 'artifacts/pass36/a83/PASS36_A83_BROWSER_LENS_PDF_CORPUS_MANIFEST.json',
 'p61_browser': 'artifacts/closure/p61/receipts/P61_BROWSER_TIER_PHYSICAL_EXECUTIONS.json',
 'p61_pdf': 'artifacts/closure/p61/receipts/P61_CURRENT_PDF_REPLAY.json',
 'shield': 'artifacts/pass36/a84/PASS36_A84_SHIELD_FULL_CATALOG_RUNTIME.json',
 'shield_pro_map': 'artifacts/pass36/a85/PASS36_A85_SHIELD_PRO_MAP_FULL_DEPTH_RUNTIME.json',
 'real_markets': 'artifacts/pass36/a86/PASS36_A86_REAL_MARKETS_CROSS_ASSET_RUNTIME.json',
 'market_impact_whale': 'artifacts/pass36/a87/PASS36_A87_MARKET_IMPACT_WHALE_RUNTIME.json',
 'angel_risk': 'artifacts/pass36/a88/PASS36_A88_BRAIN_ANGEL_RISK_EVAL_RUNTIME.json',
 'p63_manifest': 'artifacts/closure/p63/P63_PACKAGE_CONTENT_MANIFEST.json',
 'p63_authority': 'artifacts/closure/p63/P63_CURRENT_AUTHORITY.json',
 'p63_binding': 'artifacts/closure/p63/P63_ACTIVE_POLICY_BINDING_AUDIT.json',
}

def rb(rel): return (ROOT / rel).read_bytes()
def j(rel): return json.loads(rb(rel))
def sha(b): return hashlib.sha256(b).hexdigest()
def cjson(obj): return json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode('utf-8')
def objsha(obj): return sha(cjson(obj))
def source_binding(rel):
    b=rb(rel); return {'path':rel,'bytes':len(b),'sha256':sha(b)}

def aggregate(digests):
    b=('\n'.join(digests)+'\n').encode() if digests else b''
    return {'count':len(digests),'digestListBytes':len(b),'aggregateSha256':sha(b)}

def write_json(rel,obj):
    p=ROOT/rel; p.parent.mkdir(parents=True, exist_ok=True)
    raw=(json.dumps(obj,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode('utf-8')
    p.write_bytes(raw)
    return {'path':rel,'bytes':len(raw),'sha256':sha(raw)}

D={k:j(v) for k,v in SRC.items()}
# Validate selected source artifacts are exactly represented by P63 package manifest.
p63_files={x['path']:(x['bytes'],x['sha256']) for x in D['p63_manifest']['files']}
selected=[]
for key,rel in SRC.items():
    if key=='p63_manifest': continue
    b=source_binding(rel)
    if rel not in p63_files:
        raise SystemExit(f'P63 manifest missing selected source: {rel}')
    mb,mh=p63_files[rel]
    if mb!=b['bytes'] or mh!=b['sha256']:
        raise SystemExit(f'P63 manifest mismatch selected source: {rel}')
    selected.append(b)

# Profiles
families=['Audit','PDF','Browser','Shield','Shield Pro','Shield Map','Real Markets','Market Impact','Whale Watch','Angel','Risk Indicator']
profiles=[]
profile_by_key={}

# helper to emit profile summary
def emit(family,context,tier,source_keys,item_digests,truth_class,evidence_class,generated_at,final_output=False,notes=None,truth_consistency='NOT_ADJUDICATED'):
    item_digests=sorted(item_digests)
    agg=aggregate(item_digests)
    summary={
      'schemaVersion':'velmere.p64.profile-output-capture.v1',
      'generatedAt':GEN_AT,
      'family':family,'context':context,'tierSelector':tier,
      'truthClass':truth_class,'evidenceClass':evidence_class,
      'sourceGeneratedAt':generated_at,
      'freshnessClass':'HISTORICAL_SNAPSHOT' if generated_at else 'UNKNOWN_BLOCKED',
      'currentLiveDataProven':False,
      'rightsStatus':'UNRESOLVED_CURRENT_FINAL',
      'finalCustomerOutputCredit':bool(final_output),
      'analysisEligible':'INTERNAL_FIXTURE_ONLY',
      'checkoutEligible':False,'saleEligible':False,'live':False,'worldClassProven':False,
      'truthConsistency':truth_consistency,
      'sourceBindings':[source_binding(SRC[k]) for k in source_keys],
      'itemDigestAlgorithm':'SHA256 over exact current packet/tier/nested object digest; ordered lexicographically; aggregate is SHA256(LF-joined digest list + final LF)',
      'itemCount':agg['count'],'itemDigests':item_digests,'aggregateSha256':agg['aggregateSha256'],
      'notes':notes or [],
    }
    safe=family.lower().replace(' ','_').replace('/','_')+'__'+context.lower()+'.json'
    out=write_json(f'artifacts/closure/p64/profile_outputs/{safe}',summary)
    row=dict(summary); row['captureArtifact']=out; row.pop('itemDigests')
    profiles.append(row); profile_by_key[(family,context)]=row

# Audit
for ctx,t in CONTEXTS:
    vals=[]
    for case in D['audit']['cases']:
        match=[x for x in case['tiers'] if x['tier']==t]
        if len(match)!=1: raise SystemExit('Audit tier selector mismatch')
        x=match[0]
        vals.append(x.get('integrity',{}).get('digest') or objsha(x))
    emit('Audit',ctx,t,['audit'],vals,'FIXTURE_INTERNAL_ONLY','A82_GENERATED_FIXTURE_TIER_OUTPUTS',D['audit'].get('generatedAt'),notes=['50 fixture cases; zero complete rights-approved real cases; no official real tool execution credit.'])

# PDF + Browser from A83 + P61 bounded receipts
entries=D['a83_manifest']['entries']
for ctx,t in CONTEXTS:
    tier_entries=[x for x in entries if x['tier']==t]
    pdf_d=[x['pdfSha256'] for x in tier_entries]
    p61_pdf_rows=[x for x in D['p61_pdf']['rows'] if x['tier']==t]
    p61_browser_rows=[x for x in D['p61_browser']['rows'] if x['tier']==t]
    # Include both full synthetic manifest digests and bounded current replay receipt rows.
    emit('PDF',ctx,t,['a83_manifest','p61_pdf'],pdf_d+[objsha(x) for x in p61_pdf_rows],
         'SYNTHETIC_INTERNAL_ONLY','A83_MANIFEST_PLUS_P61R1_BOUNDED_CURRENT_SOURCE_REPLAY_RECEIPT',D['a83_manifest'].get('generatedAt'),
         notes=['A83 declares 150 synthetic PDFs per tier but generated PDF bytes are not retained in current SOURCE_ONLY; P61R1 proves 3 locale replay hashes per tier only.'])
    browser_d=[]
    for x in tier_entries:
        browser_d.append(x.get('projectionDigest') or objsha(x.get('projections',[])))
    browser_d += [objsha(x) for x in p61_browser_rows]
    emit('Browser',ctx,t,['a83_manifest','p61_browser'],browser_d,
         'FIXTURE_INTERNAL_ONLY','A83_SYNTHETIC_PROJECTIONS_PLUS_P61R1_PHYSICAL_CHROMIUM_BOUNDED',D['a83_manifest'].get('generatedAt'),
         notes=['P61R1 launched distinct Chromium processes for Basic/Pro/Advanced PL/EN/DE fixture cases; production Next.js Browser route remains unproven.'])

# Shield
for ctx,t in CONTEXTS:
    vals=[x['packetDigestSha256'] for x in D['shield']['packets'] if x['tier']==t]
    emit('Shield',ctx,t,['shield'],vals,'FIXTURE_INTERNAL_ONLY','A84_STATIC_FULL_CATALOG_PACKET_MATRIX',D['shield'].get('generatedAt'),notes=['Static/injected catalog; current public network and rights are not proven.'])

# Shield Pro / Map from nested objects
for ctx,t in CONTEXTS:
    pts=[x for x in D['shield_pro_map']['packets'] if x['tier']==t]
    terminal=[objsha({'packetId':x['packetId'],'marketIdentity':x.get('marketIdentity'),'terminal':x.get('terminal'),'entitlement':x.get('entitlement')}) for x in pts]
    maps=[objsha({'packetId':x['packetId'],'marketIdentity':x.get('marketIdentity'),'map':x.get('map'),'entitlement':x.get('entitlement')}) for x in pts]
    emit('Shield Pro',ctx,t,['shield_pro_map'],terminal,'FIXTURE_INTERNAL_ONLY','A85_STATIC_TERMINAL_PACKET_PROJECTION',D['shield_pro_map'].get('generatedAt'),notes=['Full-depth injected fixture; real account entitlements/current public network are not proven.'])
    emit('Shield Map',ctx,t,['shield_pro_map'],maps,'FIXTURE_INTERNAL_ONLY','A85_STATIC_MAP_PACKET_PROJECTION',D['shield_pro_map'].get('generatedAt'),notes=['Full-depth injected fixture; graph/current identity evidence and rights remain open.'])

# Real Markets
for ctx,t in CONTEXTS:
    vals=[x['packetDigestSha256'] for x in D['real_markets']['packets'] if x['tier']==t]
    emit('Real Markets',ctx,t,['real_markets'],vals,'FIXTURE_INTERNAL_ONLY','A86_STATIC_REFERENCE_CATALOG_CONTROL_PACKET_MATRIX',D['real_markets'].get('generatedAt'),notes=['P63 separately proves exact Node24 Windows A86 control lane; current provider evidence and rights remain false.'])

# Market Impact / Whale Watch
for fam,surface in [('Market Impact','market_impact'),('Whale Watch','whale_watch')]:
    for ctx,t in CONTEXTS:
        vals=[x['packetDigestSha256'] for x in D['market_impact_whale']['packets'] if x['tier']==t and x['surface']==surface]
        emit(fam,ctx,t,['market_impact_whale'],vals,'FIXTURE_INTERNAL_ONLY','A87_STATIC_SURFACE_TIER_PACKET_MATRIX',D['market_impact_whale'].get('generatedAt'),notes=['No current provider/network rights credit; Market Impact realized execution and Whale Watch continuous/current chain evidence remain unproven.'])

# Angel / Risk
for fam,surface in [('Angel','angel'),('Risk Indicator','risk')]:
    for ctx,t in CONTEXTS:
        vals=[x['packetDigestSha256'] for x in D['angel_risk']['packets'] if x['tier']==t and x['surface']==surface]
        emit(fam,ctx,t,['angel_risk'],vals,'SYNTHETIC_INTERNAL_ONLY','A88_SYNTHETIC_MULTILINGUAL_ADVERSARIAL_PACKET_MATRIX',D['angel_risk'].get('generatedAt'),notes=['Synthetic AI/eval packets only; no real model/provider customer evaluation, calibration or independent customer utility credit.'])

if len(profiles)!=33: raise SystemExit(f'expected 33 profiles, got {len(profiles)}')
if set(p['family'] for p in profiles)!=set(families): raise SystemExit('family set mismatch')
if any(p['itemCount']<=0 for p in profiles): raise SystemExit('empty profile output capture')

# Standalone truth invariance checks based only on declared underlying-fact identity where available.
truth_checks={}
# Real Markets explicit factsDigestSha256 per asset across tiers
for fam,source,surface_key,digest_key in [
 ('Real Markets',D['real_markets'],None,'factsDigestSha256'),
 ('Market Impact',D['market_impact_whale'],'market_impact','sourceResultDigestSha256'),
 ('Whale Watch',D['market_impact_whale'],'whale_watch','sourceResultDigestSha256')]:
    rows=[x for x in source['packets'] if surface_key is None or x.get('surface')==surface_key]
    by={}
    for x in rows:
        key=x.get('canonicalAssetId') or x.get('symbol') or x.get('packetId')
        by.setdefault(key,{})[x['tier']]=x.get(digest_key)
    bad=[k for k,v in by.items() if len(v)!=3 or len(set(v.values()))!=1]
    truth_checks[fam]={'groups':len(by),'mismatches':len(bad),'status':'PASS_FACT_IDENTITY_INVARIANT' if not bad else 'FAIL_FACT_IDENTITY_DRIFT','sampleMismatches':bad[:10]}
# A85 marketIdentity is required invariant basis for both surfaces.
rows=D['shield_pro_map']['packets']; by={}
for x in rows:
    by.setdefault(x['canonicalAssetId'],{})[x['tier']]=objsha(x.get('marketIdentity'))
bad=[k for k,v in by.items() if len(v)!=3 or len(set(v.values()))!=1]
for fam in ['Shield Pro','Shield Map']:
    truth_checks[fam]={'groups':len(by),'mismatches':len(bad),'status':'PASS_MARKET_IDENTITY_INVARIANT' if not bad else 'FAIL_MARKET_IDENTITY_DRIFT','sampleMismatches':bad[:10]}
# A84 field fact states/digests across tiers.
by={}
for x in D['shield']['packets']:
    facts=[{k:f.get(k) for k in ['fieldId','state','consensusDigestSha256','semanticValue'] if k in f} for f in x.get('fields',[])]
    by.setdefault(x['canonicalAssetId'],{})[x['tier']]=objsha(facts)
bad=[k for k,v in by.items() if len(v)!=3 or len(set(v.values()))!=1]
truth_checks['Shield']={'groups':len(by),'mismatches':len(bad),'status':'PASS_FIELD_FACTS_INVARIANT' if not bad else 'FAIL_FIELD_FACTS_DRIFT','sampleMismatches':bad[:10]}
# A88 truth/safety decisions across tier for same locale/family/surface/case stem.
for fam,surface in [('Angel','angel'),('Risk Indicator','risk')]:
    rows=[x for x in D['angel_risk']['packets'] if x.get('surface')==surface]
    by={}
    for x in rows:
        # caseId may already exclude tier; use tuple stable semantic identity.
        key=(x.get('caseId'),x.get('locale'),x.get('family'))
        truth=objsha({k:x.get(k) for k in ['expectedDecision','decision','evidenceState','addsFacts','calibratedProbabilityPublished','individualizedAdvicePublished','legalConclusionPublished']})
        by.setdefault(str(key),{})[x['tier']]=truth
    # Some corpus IDs may be tier-specific; only matched 3-tier groups count.
    matched={k:v for k,v in by.items() if len(v)==3}
    bad=[k for k,v in matched.items() if len(set(v.values()))!=1]
    truth_checks[fam]={'groupsTotal':len(by),'matchedThreeTierGroups':len(matched),'mismatches':len(bad),'status':'PASS_MATCHED_TRUTH_SAFETY_INVARIANT' if matched and not bad else ('WITHHELD_NO_MATCHED_GROUPS' if not matched else 'FAIL_TRUTH_SAFETY_DRIFT'),'sampleMismatches':bad[:10]}

# Apply truth consistency to standalone profile rows.
for p in profiles:
    if p['family'] in truth_checks:
        p['truthConsistency']=truth_checks[p['family']]['status']

# Customer-facing 17-row baseline inventory. Does NOT grant final output credit.
customer_rows=[]
for fam in ['Audit','PDF','Browser']:
    for ctx,t in CONTEXTS:
        p=profile_by_key[(fam,ctx)]
        customer_rows.append({'productSku':f'{fam} {t.capitalize()}','family':fam,'context':ctx,'baselineCaptured':True,'captureArtifact':p['captureArtifact'],'truthClass':p['truthClass'],'finalCustomerOutputCredit':False,'saleEligible':False})
for fam in ['Shield','Shield Pro','Shield Map','Real Markets','Market Impact','Whale Watch','Angel','Risk Indicator']:
    ps=[profile_by_key[(fam,c)] for c,_ in CONTEXTS]
    customer_rows.append({'productSku':fam,'family':fam,'contexts':['BASIC_CONTEXT','PRO_CONTEXT','ADVANCED_CONTEXT'],'baselineCaptured':True,'contextCaptureArtifacts':[p['captureArtifact'] for p in ps],'truthClasses':sorted(set(p['truthClass'] for p in ps)),'finalCustomerOutputCredit':False,'saleEligible':False})
if len(customer_rows)!=17: raise SystemExit(f'expected 17 customer rows, got {len(customer_rows)}')

# Explicit tier capture distinctness (not value proof).
tier_distinctness={}
for fam in ['Audit','PDF','Browser']:
    vals=[profile_by_key[(fam,c)]['aggregateSha256'] for c,_ in CONTEXTS]
    tier_distinctness[fam]={'aggregateHashes':vals,'distinctCount':len(set(vals)),'status':'DISTINCT_BYTES_ONLY_NOT_MATERIAL_VALUE_PROOF' if len(set(vals))>1 else 'IDENTICAL_BYTES_REQUIRES_REVIEW'}

baseline={
 'schemaVersion':'velmere.p64.current-output-baseline.v1','revision':'P64/V16','generatedAt':GEN_AT,
 'authority':{'v16Sha256':'67816a5a9238668c8080a3a8cc623f078d268c1b78fddf534cb4893bb45490e9','parentRevision':'P63/V16','parentZipSha256':'dcd9d25c42243710979e12c26d02a7a31825c1f894515cbf0db1c25064294145'},
 'scope':'CURRENT_P63_PACKAGE_BYTES_OUTPUT_STATE_CAPTURE_NO_PROVIDER_RIGHTS_VALUE_SALE_PROMOTION',
 'denominators':{'productFamilies':11,'customerFacingRowsBaselineCaptured':17,'customerFacingRowsFinalCustomerOutput':0,'internalProfilesBaselineCaptured':33,'internalProfilesFinalCustomerOutput':0,'legalSourceFieldsPassed':0,'explicitPaidDeltaTransitionsPassed':0,'saleEligibleRows':0},
 'selectedCurrentSourceBindings':selected,
 'profiles':profiles,
 'customerRows':customer_rows,
 'standaloneTruthConsistency':truth_checks,
 'explicitTierCaptureDistinctness':tier_distinctness,
 'globalTruthBoundary':'P64 captures and hashes what the current P63 SOURCE_ONLY package actually contains for every V16 product family/context. Captured outputs are fixture/synthetic or bounded replay receipts, not final current customer outputs. P64 therefore earns 17/17 customer-row baseline inventory and 33/33 internal-profile baseline inventory only. Final output, provider/currentness, rights, factual holdout, paid-value, sale, LIVE and WORLD_CLASS denominators remain zero/withheld.'
}
baseline_ref=write_json('artifacts/closure/p64/P64_CURRENT_OUTPUT_BASELINE.json',baseline)

# Verification receipt
checks=[]
def chk(id,passed,detail=None): checks.append({'id':id,'passed':bool(passed),'detail':detail})
chk('topology:families',len(set(p['family'] for p in profiles))==11,11)
chk('topology:profiles',len(profiles)==33,len(profiles))
chk('topology:customer-rows',len(customer_rows)==17,len(customer_rows))
chk('capture:nonempty',all(p['itemCount']>0 for p in profiles),min(p['itemCount'] for p in profiles))
chk('capture:artifacts-exist',all((ROOT/p['captureArtifact']['path']).exists() for p in profiles),None)
chk('truth:no-final-output-promotion',all(not p['finalCustomerOutputCredit'] for p in profiles),None)
chk('truth:no-sale-promotion',all(not p['saleEligible'] and not p['live'] for p in profiles),None)
chk('rights:no-promotion',all(p['rightsStatus']=='UNRESOLVED_CURRENT_FINAL' for p in profiles),None)
chk('source:p63-manifest-bindings',len(selected)==len(SRC)-1,len(selected))
chk('tier:explicit-distinctness-recorded',all(x['distinctCount']>=1 for x in tier_distinctness.values()),tier_distinctness)
verify={'schemaVersion':'velmere.p64.current-output-baseline-verification.v1','generatedAt':GEN_AT,'checks':checks,'summary':{'checks':len(checks),'passed':sum(x['passed'] for x in checks),'failed':sum(not x['passed'] for x in checks)},'baseline':baseline_ref,'status':'PASS_P64_CURRENT_OUTPUT_BASELINE_CAPTURE_NO_FINAL_CUSTOMER_CREDIT' if all(x['passed'] for x in checks) else 'FAIL_P64_BASELINE','truthBoundary':baseline['globalTruthBoundary']}
verify_ref=write_json('artifacts/closure/p64/P64_CURRENT_OUTPUT_BASELINE_VERIFICATION.json',verify)
print(json.dumps({'status':verify['status'],'profiles':33,'customerRows':17,'baseline':baseline_ref,'verification':verify_ref,'truthChecks':truth_checks,'tierDistinctness':tier_distinctness},indent=2))
