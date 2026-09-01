from __future__ import annotations
import hashlib, json, re, sys
from pathlib import Path
from collections import defaultdict

ROOT = Path(__file__).resolve().parents[4]
OUT = ROOT / 'artifacts/closure/p67/receipts'
OUT.mkdir(parents=True, exist_ok=True)
P65 = ROOT / 'artifacts/closure/p65/P65_CURRENT_FREE_LEGAL_DECISION_BASELINE.json'
P65_FETCH = ROOT / 'artifacts/closure/p65/windows/P65_CURRENT_OFFICIAL_SOURCE_FETCH_RECEIPT.json'

TOPOLOGY = ROOT / 'lib/product/vlm-canonical-product-topology.ts'

SOURCE_BINDINGS = {
    'topology': 'lib/product/vlm-canonical-product-topology.ts',
    'audit_receipts': 'lib/security/audit-evidence-receipt-packet.ts',
    'audit_pdf': 'lib/security/pro-audit-pdf/render-pro-audit-pdf.ts',
    'audit_tier_contract': 'lib/security/audit-tier-contract.ts',
    'browser_pdf': 'lib/search/lens-pdf-renderer.ts',
    'shield_rm_ui': 'components/market-integrity/ShieldRealMarketsParityClient.tsx',
    'shield_pro_ui': 'components/market-integrity/ShieldProCleanTerminalClient.tsx',
    'shield_map_ui': 'components/market-integrity/ShieldMapCommandClient.tsx',
    'market_impact': 'lib/market-integrity/market-impact-types.ts',
    'whale_watch': 'lib/market-integrity/whale-watch-types.ts',
    'angel': 'lib/ai/angel-structured-response.ts',
    'risk_indicator': 'lib/market-integrity/risk-indicator-projection.ts',
    'risk_types': 'lib/market-integrity/risk-types.ts',
}

def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def stable_json_bytes(value) -> bytes:
    return (json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=False) + '\n').encode('utf-8')

def file_binding(rel: str):
    p = ROOT / rel
    b = p.read_bytes()
    return {'path': rel, 'bytes': len(b), 'sha256': sha256_bytes(b)}

bindings = {k: file_binding(v) for k, v in SOURCE_BINDINGS.items()}
texts = {k: (ROOT / v).read_text(encoding='utf-8') for k, v in SOURCE_BINDINGS.items()}

def F(field_id: str, source_key: str, *tokens: str, provider_candidates=()):
    return {
        'fieldId': field_id,
        'sourceKey': source_key,
        'evidenceTokens': list(tokens),
        'providerCandidates': list(provider_candidates),
    }

# This is a rights-obligation inventory, not a product-value inventory. Fields are source-backed
# customer data/evidence lanes whose display/export may require provider/source permission,
# attribution, license notices, redistribution rights, or exchange entitlements.
CATALOGS = {
 'audit': [
    F('audit.identity.target','audit_pdf','target'),
    F('audit.identity.chain','audit_pdf','chain'),
    F('audit.provider_responses','audit_receipts','providerResponseRoot'),
    F('audit.public_sources','audit_receipts','publicSourceRoot', provider_candidates=('nvd','cve','cwe','capec','cisa_kev')),
    F('audit.source_abi','audit_receipts','sourceAbiRoot'),
    F('audit.proxy_implementation','audit_receipts','proxyImplementationRoot'),
    F('audit.permissions','audit_pdf','permissions'),
    F('audit.holder_liquidity','audit_pdf','HolderLiquidity'),
    F('audit.findings','audit_pdf','finding'),
    F('audit.severity','audit_pdf','severity'),
    F('audit.remediation','audit_tier_contract','remediation'),
    F('audit.freshness','audit_pdf','Freshness'),
    F('audit.risk_score','audit_pdf','riskScore'),
    F('audit.confidence','audit_pdf','confidenceScore'),
    F('audit.evidence_roots','audit_pdf','evidenceRoots'),
    F('audit.source_receipt_root','audit_pdf','sourceReceiptRoot'),
 ],
 'browser': [
    F('browser.summary','browser_pdf','summary'),
    F('browser.source_ledger','browser_pdf','sourceLedger'),
    F('browser.source_boundary','browser_pdf','sourceBoundary'),
    F('browser.source_timestamp','browser_pdf','sourceTimestamp'),
    F('browser.claim_source_gate','browser_pdf','sourceGate'),
    F('browser.source_coverage','browser_pdf','sourceCoverage'),
    F('browser.source_map','browser_pdf','sourceMap'),
    F('browser.citations','browser_pdf','citation'),
    F('browser.missing_sources','browser_pdf','missingCount'),
    F('browser.confidence','browser_pdf','confidence'),
    F('browser.render_payload','browser_pdf','render'),
 ],
 'shield': [
    F('asset.symbol','shield_rm_ui','symbol', provider_candidates=('coingecko','twelve_data','alpha_vantage','polygon')),
    F('asset.name','shield_rm_ui','name', provider_candidates=('coingecko','twelve_data','alpha_vantage','polygon')),
    F('asset.image','shield_rm_ui','image', provider_candidates=('coingecko',)),
    F('asset.rank','shield_rm_ui','rank', provider_candidates=('coingecko',)),
    F('market.price','shield_rm_ui','price', provider_candidates=('coingecko','twelve_data','alpha_vantage','polygon','ecb_statistics')),
    F('market.change_1h','shield_rm_ui','priceChange1h', provider_candidates=('coingecko','twelve_data')),
    F('market.change_24h','shield_rm_ui','priceChange24h', provider_candidates=('coingecko','twelve_data','alpha_vantage','polygon')),
    F('market.change_7d','shield_rm_ui','priceChange7d', provider_candidates=('coingecko','twelve_data')),
    F('market.market_cap','shield_rm_ui','marketCap', provider_candidates=('coingecko','twelve_data','alpha_vantage','polygon')),
    F('market.volume_24h','shield_rm_ui','volume24h', provider_candidates=('coingecko','twelve_data','alpha_vantage','polygon')),
    F('market.observed_at','shield_rm_ui','observedAt', provider_candidates=('coingecko','twelve_data','alpha_vantage','polygon','ecb_statistics')),
    F('risk.score','shield_rm_ui','risk'),
    F('risk.confidence','shield_rm_ui','confidence'),
    F('risk.data_sources','risk_types','dataSources'),
    F('risk.data_quality','risk_types','dataQuality'),
    F('risk.limitations','risk_types','limitations'),
 ],
 'shield-pro': [
    F('asset.symbol','shield_pro_ui','symbol', provider_candidates=('coingecko','twelve_data','alpha_vantage','polygon')),
    F('asset.name','shield_pro_ui','name', provider_candidates=('coingecko','twelve_data','alpha_vantage','polygon')),
    F('asset.image','shield_pro_ui','image', provider_candidates=('coingecko',)),
    F('asset.rank','shield_pro_ui','rank', provider_candidates=('coingecko',)),
    F('market.price','shield_pro_ui','price', provider_candidates=('coingecko','twelve_data','alpha_vantage','polygon','ecb_statistics')),
    F('market.change_1h','shield_pro_ui','priceChange1h', provider_candidates=('coingecko','twelve_data')),
    F('market.change_24h','shield_pro_ui','priceChange24h', provider_candidates=('coingecko','twelve_data','alpha_vantage','polygon')),
    F('market.change_7d','shield_pro_ui','priceChange7d', provider_candidates=('coingecko','twelve_data')),
    F('market.market_cap','shield_pro_ui','marketCap', provider_candidates=('coingecko','twelve_data','alpha_vantage','polygon')),
    F('market.volume_24h','shield_pro_ui','volume24h', provider_candidates=('coingecko','twelve_data','alpha_vantage','polygon')),
    F('market.observed_at','shield_pro_ui','observedAt', provider_candidates=('coingecko','twelve_data','alpha_vantage','polygon','ecb_statistics')),
    F('market.candles','shield_pro_ui','candles', provider_candidates=('coingecko','twelve_data','alpha_vantage','polygon')),
    F('risk.score','shield_pro_ui','risk'),
    F('risk.confidence','shield_pro_ui','confidence'),
    F('risk.data_sources','risk_types','dataSources'),
    F('risk.data_quality','risk_types','dataQuality'),
    F('risk.limitations','risk_types','limitations'),
    F('source.label','shield_pro_ui','sourceLabel'),
 ],
 'real-markets': [
    F('asset.symbol','shield_rm_ui','symbol', provider_candidates=('twelve_data','alpha_vantage','polygon','ecb_statistics')),
    F('asset.name','shield_rm_ui','name', provider_candidates=('twelve_data','alpha_vantage','polygon','ecb_statistics')),
    F('market.price','shield_rm_ui','price', provider_candidates=('twelve_data','alpha_vantage','polygon','ecb_statistics')),
    F('market.change_1h','shield_rm_ui','priceChange1h', provider_candidates=('twelve_data','alpha_vantage','polygon')),
    F('market.change_24h','shield_rm_ui','priceChange24h', provider_candidates=('twelve_data','alpha_vantage','polygon')),
    F('market.change_7d','shield_rm_ui','priceChange7d', provider_candidates=('twelve_data','alpha_vantage','polygon')),
    F('market.market_cap','shield_rm_ui','marketCap', provider_candidates=('twelve_data','alpha_vantage','polygon')),
    F('market.volume_24h','shield_rm_ui','volume24h', provider_candidates=('twelve_data','alpha_vantage','polygon')),
    F('market.observed_at','shield_rm_ui','observedAt', provider_candidates=('twelve_data','alpha_vantage','polygon','ecb_statistics')),
    F('market.candles','shield_rm_ui','candles', provider_candidates=('twelve_data','alpha_vantage','polygon')),
    F('risk.confidence','shield_rm_ui','confidence'),
    F('risk.data_quality','risk_types','dataQuality'),
    F('risk.limitations','risk_types','limitations'),
 ],
 'shield-map': [
    F('market.price','shield_map_ui','currentPrice', provider_candidates=('coingecko','twelve_data','alpha_vantage','polygon')),
    F('market.change_1h','shield_map_ui','priceChange1h', provider_candidates=('coingecko','twelve_data')),
    F('market.change_24h','shield_map_ui','priceChange24h', provider_candidates=('coingecko','twelve_data','alpha_vantage','polygon')),
    F('market.change_7d','shield_map_ui','priceChange7d', provider_candidates=('coingecko','twelve_data')),
    F('market.market_cap','shield_map_ui','marketCap', provider_candidates=('coingecko','twelve_data','alpha_vantage','polygon')),
    F('market.volume_24h','shield_map_ui','volume24h', provider_candidates=('coingecko','twelve_data','alpha_vantage','polygon')),
    F('market.observed_at','shield_map_ui','observedAt', provider_candidates=('coingecko','twelve_data','alpha_vantage','polygon')),
    F('risk.score','shield_map_ui','risk'),
    F('risk.confidence','shield_map_ui','confidence'),
    F('shield_map.supply','shield_map_ui','supply'),
    F('shield_map.unlock','shield_map_ui','unlock'),
    F('shield_map.liquidity','shield_map_ui','liquidity'),
    F('shield_map.insider','shield_map_ui','insider'),
    F('shield_map.social','shield_map_ui','social'),
    F('shield_map.contract','shield_map_ui','contract'),
    F('source.state','shield_map_ui','sourceState'),
    F('source.id','shield_map_ui','sourceId'),
    F('source.label','shield_map_ui','sourceLabel'),
    F('source.timestamp','shield_map_ui','sourceTimestamp'),
    F('source.evidence','shield_map_ui','evidence'),
 ],
 'market-impact': [
    F('market_impact.venue_id','market_impact','venueId'),
    F('market_impact.provider_family','market_impact','providerFamily'),
    F('market_impact.asset_key','market_impact','assetKey'),
    F('market_impact.quote_currency','market_impact','quoteCurrency'),
    F('market_impact.observed_at','market_impact','observedAt'),
    F('market_impact.fee_bps','market_impact','feeBps'),
    F('market_impact.quote_to_usd','market_impact','quoteToUsd'),
    F('market_impact.bids','market_impact','bids'),
    F('market_impact.asks','market_impact','asks'),
    F('market_impact.source_digest','market_impact','sourceDigest'),
 ],
 'whale-watch': [
    F('whale.asset_key','whale_watch','assetKey'),
    F('whale.total_supply','whale_watch','totalSupply'),
    F('whale.price_usd','whale_watch','priceUsd'),
    F('whale.holder_balance','whale_watch','balance'),
    F('whale.holder_share','whale_watch','sharePercent'),
    F('whale.holder_category','whale_watch','category'),
    F('whale.wallet_label','whale_watch','labelVerified'),
    F('whale.holder_cluster','whale_watch','clusterId'),
    F('whale.holder_observed_at','whale_watch','observedAt'),
    F('whale.holder_provider','whale_watch','providerFamily'),
    F('whale.transfer_amount','whale_watch','amountBase'),
    F('whale.transfer_amount_usd','whale_watch','amountUsd'),
    F('whale.transfer_parties','whale_watch','fromHolderId','toHolderId'),
    F('whale.transfer_kind','whale_watch','WhaleTransferKind'),
    F('whale.transfer_observed_at','whale_watch','observedAt'),
    F('whale.capability_coverage','whale_watch','coverageComplete'),
    F('whale.source_digest','whale_watch','sourceDigest'),
 ],
 'angel': [
    F('angel.scope','angel','scope'),
    F('angel.severity','angel','severity'),
    F('angel.confidence','angel','confidence'),
    F('angel.evidence','angel','evidence'),
    F('angel.providers','angel','providers'),
    F('angel.contradictions','angel','contradictions'),
    F('angel.missing_proof','angel','missingProof'),
    F('angel.next_safe_check','angel','nextSafeCheck'),
    F('angel.risk_score','angel','riskScore'),
    F('angel.source_state','angel','sourceState'),
    F('angel.evidence_lanes','angel','lanes'),
 ],
 'risk-indicator': [
    F('risk.token_identity','risk_types','token'),
    F('risk.score','risk_types','score'),
    F('risk.level','risk_types','level'),
    F('risk.technical_domain','risk_indicator','technicalRisk'),
    F('risk.market_domain','risk_indicator','marketRisk'),
    F('risk.data_quality_domain','risk_indicator','dataQualityRisk'),
    F('risk.missing_data','risk_indicator','missingData'),
    F('risk.limitations','risk_indicator','limitations'),
    F('risk.data_sources','risk_types','dataSources'),
    F('market.observed_at','risk_types','observedAt'),
    F('risk.source_receipt_root','risk_types','sourceReceiptRoot'),
 ],
}

# Validate physical field/source binding tokens. Tokens are evidence that the current source actually
# contains the claimed customer/source lane; they are not proof that a provider is legally bound to it.
field_verification=[]
for family, fields in CATALOGS.items():
    seen=set()
    for field in fields:
        fid=field['fieldId']
        if fid in seen:
            raise SystemExit(f'duplicate field in family: {family}:{fid}')
        seen.add(fid)
        text=texts[field['sourceKey']]
        checks={token: (token.lower() in text.lower()) for token in field['evidenceTokens']}
        # Multi-token entries are alternatives only for transfer parties, otherwise at least one token is enough.
        passed=all(checks.values()) if fid=='whale.transfer_parties' else any(checks.values())
        field_verification.append({'family':family,'fieldId':fid,'sourceKey':field['sourceKey'],'sourcePath':bindings[field['sourceKey']]['path'],'sourceSha256':bindings[field['sourceKey']]['sha256'],'tokenChecks':checks,'passed':passed})
        if not passed:
            raise SystemExit(f'field token binding failed: {family}:{fid}:{checks}')

# Topology validation without treating the old 33 contexts as current product completion.
topo=texts['topology']
required_topology_literals = [
    'customerFacingRows: 20', 'productFamilies: 10', 'explicitlyTieredRows: 15', 'standaloneRows: 5',
    'internalExecutionProfiles: 20', 'contextTransitions: 10', 'deltaRequiredTransitions: 10',
    'legacy33ProductCompletionDenominatorRetired: true', 'pdfSeparateProductFamily: false',
]
if not all(x in topo for x in required_topology_literals):
    raise SystemExit('topology literal binding failed')
if '"pdf"' in re.findall(r'\|\s*"([^"]+)"', topo):
    raise SystemExit('pdf unexpectedly present as family')

row_pattern=re.compile(r'\{ productId: "([^"]+)", displayName: "([^"]+)", family: "([^"]+)", productClass: "([^"]+)", tier: (null|"[^"]+")')
rows=[]
for m in row_pattern.finditer(topo):
    tier=None if m.group(5)=='null' else m.group(5).strip('"')
    rows.append({'productId':m.group(1),'displayName':m.group(2),'family':m.group(3),'productClass':m.group(4),'tier':tier})
if len(rows)!=20:
    raise SystemExit(f'expected 20 current rows, got {len(rows)}')
families=sorted(CATALOGS)
if len(families)!=10:
    raise SystemExit(f'expected 10 field catalogs, got {len(families)}')
row_families={r['family'] for r in rows}
if row_families != set(families):
    raise SystemExit(f'catalog/topology family mismatch {row_families ^ set(families)}')
for r in rows:
    if r['family'] in {'angel','whale-watch','market-impact','shield-map','risk-indicator'} and r['tier'] is not None:
        raise SystemExit(f'fake standalone tier detected: {r}')

# Exact P65 source-license candidate states. These are deliberately NOT rights numerator credit.
p65=json.loads(P65.read_text(encoding='utf-8'))
p65_fetch=json.loads(P65_FETCH.read_text(encoding='utf-8'))
source_candidates={s['id']:{k:v for k,v in s.items() if k not in {'products'}} for s in p65.get('sources',[])}
fetch_by_id={s['id']:s for s in p65_fetch.get('sources',[])}
for sid, source in source_candidates.items():
    candidates=[sid+'_terms',sid+'_reuse',sid+'_pricing',sid+'_policy',sid+'_stocks',sid+'_terms_current',sid+'_terms_archive']
    receipts=[]
    for cid in candidates:
        if cid in fetch_by_id:
            rec=fetch_by_id[cid]
            receipts.append({'receiptId':cid,'fetchedAt':rec.get('fetchedAt'),'httpStatus':rec.get('httpStatus'),'sha256':rec.get('sha256'),'anchorPass':rec.get('anchorPass')})
    if sid=='nvd' and 'nvd_sample' in fetch_by_id:
        rec=fetch_by_id['nvd_sample']; receipts.append({'receiptId':'nvd_sample','fetchedAt':rec.get('fetchedAt'),'httpStatus':rec.get('httpStatus'),'sha256':rec.get('sha256'),'anchorPass':rec.get('anchorPass')})
    if sid=='ecb_statistics' and 'ecb_fx' in fetch_by_id:
        rec=fetch_by_id['ecb_fx']; receipts.append({'receiptId':'ecb_fx','fetchedAt':rec.get('fetchedAt'),'httpStatus':rec.get('httpStatus'),'sha256':rec.get('sha256'),'anchorPass':rec.get('anchorPass')})
    source['p65PhysicalReceipts']=receipts

TIERED={'audit','browser','shield','shield-pro','real-markets'}
ARTIFACT={'audit','browser'}
PURPOSE_FREE='FREE_PUBLIC_DISPLAY'
PURPOSE_PAID='PAID_CUSTOMER_DISPLAY'
PURPOSE_FREE_ART='FREE_ARTIFACT_EXPORT'
PURPOSE_PAID_ART='PAID_ARTIFACT_EXPORT'

# Build unique rights obligations, deduping identical source-backed fields shared across product families.
# Pro and Advanced share the paid delivery-purpose obligation rather than multiplying the same legal question.
scope_use=defaultdict(lambda: {'families':set(),'rowIds':set(),'sourceBindings':set(),'providerCandidates':set()})
for family, fields in CATALOGS.items():
    family_rows=[r for r in rows if r['family']==family]
    purposes=[]
    if family in TIERED:
        purposes += [PURPOSE_FREE,PURPOSE_PAID]
        if family in ARTIFACT: purposes += [PURPOSE_FREE_ART,PURPOSE_PAID_ART]
    else:
        purposes += [PURPOSE_FREE]
    for field in fields:
        for purpose in purposes:
            key=(field['fieldId'],purpose)
            u=scope_use[key]
            u['families'].add(family)
            u['sourceBindings'].add(field['sourceKey'])
            u['providerCandidates'].update(field.get('providerCandidates',[]))
            for r in family_rows:
                if purpose in {PURPOSE_FREE,PURPOSE_FREE_ART} and r['tier'] not in {None,'basic'}: continue
                if purpose in {PURPOSE_PAID,PURPOSE_PAID_ART} and r['tier'] not in {'pro','advanced'}: continue
                u['rowIds'].add(r['productId'])

scopes=[]
for (field_id,purpose),use in sorted(scope_use.items()):
    provider_states=[]
    for sid in sorted(use['providerCandidates']):
        source=source_candidates.get(sid)
        provider_states.append({
            'sourceId': sid,
            'engineeringRightsState': source.get('engineeringRightsState') if source else 'UNMAPPED_SOURCE_CANDIDATE',
            'commercialUseAllowedCandidate': source.get('commercialUseAllowed') if source else None,
            'customerDisplayAllowedCandidate': source.get('customerDisplayAllowed') if source else None,
            'termsUrl': source.get('termsUrl') if source else None,
            'physicalReceipts': source.get('p65PhysicalReceipts',[]) if source else [],
        })
    # No scope gets final credit because exact source/provider -> exact field -> exact delivery-purpose binding,
    # notice/attribution compliance and any exchange/subprocessor constraints have not all been proven together.
    blockers=['EXACT_PROVIDER_TO_FIELD_BINDING_NOT_PROVEN']
    if purpose in {PURPOSE_FREE_ART,PURPOSE_PAID_ART}:
        blockers += ['ARTIFACT_EXPORT_NOTICE_AND_REDISTRIBUTION_COMPLIANCE_NOT_PROVEN']
    if not provider_states:
        blockers += ['PROVIDER_RIGHTS_SOURCE_NOT_BOUND']
    else:
        if any(p['engineeringRightsState'] not in {'PASS_BOUNDED_PRIMARY_SOURCE_TERMS'} for p in provider_states):
            blockers += ['ONE_OR_MORE_CANDIDATE_PROVIDER_RIGHTS_BLOCKED_OR_WITHHELD']
        blockers += ['BOUNDED_SOURCE_TERMS_DO_NOT_EQUAL_FIELD_LEVEL_RIGHTS_CREDIT']
    scope_id=f'{purpose}:{field_id}'
    scopes.append({
        'scopeId': scope_id,
        'fieldId': field_id,
        'deliveryPurpose': purpose,
        'usedByFamilies': sorted(use['families']),
        'usedByCustomerRows': sorted(use['rowIds']),
        'sourceBindings': [bindings[k] | {'sourceKey':k} for k in sorted(use['sourceBindings'])],
        'providerCandidates': provider_states,
        'rightsState': 'WITHHELD',
        'rightsPassed': False,
        'blockers': sorted(set(blockers)),
    })

# Map each current customer row to the exact obligation scopes applicable to it.
row_scope_map=[]
for r in rows:
    purposes=[]
    if r['family'] in TIERED:
        if r['tier']=='basic':
            purposes=[PURPOSE_FREE] + ([PURPOSE_FREE_ART] if r['family'] in ARTIFACT else [])
        else:
            purposes=[PURPOSE_PAID] + ([PURPOSE_PAID_ART] if r['family'] in ARTIFACT else [])
    else: purposes=[PURPOSE_FREE]
    field_ids={f['fieldId'] for f in CATALOGS[r['family']]}
    ids=[s['scopeId'] for s in scopes if s['fieldId'] in field_ids and s['deliveryPurpose'] in purposes]
    row_scope_map.append({'rowId':r['productId'],'family':r['family'],'tier':r['tier'],'deliveryPurposes':purposes,'rightsScopeIds':sorted(ids),'scopeCount':len(ids),'allRightsPassed':False})

# Report shared-field dedupe: raw family-purpose applications versus unique rights obligations.
raw_applications=0
for family, fields in CATALOGS.items():
    purpose_count=4 if family in ARTIFACT else (2 if family in TIERED else 1)
    raw_applications += len(fields)*purpose_count
unique_denominator=len(scopes)

registry={
  'schemaVersion':'velmere.p67.corrected-field-artifact-rights-registry.v1',
  'revision':'P67/V16_OWNER_CORRECTED_TOPOLOGY',
  'generatedAt':'2026-08-16T18:45:00.000Z',
  'topology':{
    'productFamilies':10,'customerFacingRows':20,'tieredFamilies':5,'tieredRows':15,'standaloneRows':5,
    'currentExecutionProfiles':20,'paidValueTransitions':10,'legacy33ProductCompletionDenominatorRetired':True,
    'pdfSeparateProductFamily':False,
  },
  'measurementContract':{
    'unit':'UNIQUE_SOURCE_BACKED_FIELD_X_DELIVERY_PURPOSE_RIGHTS_OBLIGATION',
    'dedupeRule':'Same fieldId + same deliveryPurpose is counted once globally even when reused by multiple families/rows. Pro and Advanced share PAID_CUSTOMER_DISPLAY / PAID_ARTIFACT_EXPORT obligations unless a provider contract later proves tier-specific rights terms.',
    'artifactRule':'Audit and Browser PDF are artifact export purposes, never standalone product families.',
    'standaloneRule':'Angel, Whale Watch, Market Impact, Shield Map and Risk Indicator have one FREE_PUBLIC_DISPLAY purpose and no fake Basic/Pro/Advanced rights multiplication.',
    'creditRule':'A scope passes only when exact provider/source -> exact field -> exact delivery purpose is bound with current terms/entitlement, attribution/notice/export requirements, exchange/third-party constraints, and runtime/customer-output proof. Bounded public terms alone are not enough.',
  },
  'denominators':{
    'legacyCandidateLegalSourceFields176':'RETIRED_SUPERSEDED_TOPOLOGY',
    'rawFamilyPurposeFieldApplicationsBeforeGlobalDedupe':raw_applications,
    'uniqueRightsObligations':unique_denominator,
    'rightsPassed':sum(1 for s in scopes if s['rightsPassed']),
    'rightsWithheld':sum(1 for s in scopes if not s['rightsPassed']),
  },
  'sourceBindings':bindings,
  'sourceLicenseCandidates':source_candidates,
  'familyFieldCatalogs':CATALOGS,
  'fieldVerification':field_verification,
  'rightsScopes':scopes,
  'customerRowScopeMap':row_scope_map,
  'truthBoundary':'This physically rebuilds the rights denominator against the owner-corrected 20-row/10-family topology and current source-backed field lanes. It deliberately grants zero final field-level rights credit because current source/provider-to-field delivery bindings and required display/export notices/entitlements are not yet all proven. It is engineering/compliance evidence, not legal advice.',
  'releaseState':{'GO_INTERNAL':False,'PILOT_READY':False,'GO_PAID':False,'LIVE':False,'WORLD_CLASS_PROVEN':False},
}

reg_bytes=stable_json_bytes(registry)
registry_path=OUT/'P67_CORRECTED_FIELD_ARTIFACT_RIGHTS_REGISTRY.json'
registry_path.write_bytes(reg_bytes)

verification={
 'schemaVersion':'velmere.p67.rights-registry-verifier.v1',
 'generatedAt':'2026-08-16T18:45:00.000Z',
 'checks':[],
}
def check(name,passed,detail): verification['checks'].append({'name':name,'passed':bool(passed),'detail':detail})
check('topology_10_families', len(CATALOGS)==10, len(CATALOGS))
check('topology_20_customer_rows', len(rows)==20, len(rows))
check('tiered_family_count_5', len({r['family'] for r in rows if r['tier'] is not None})==5, sorted({r['family'] for r in rows if r['tier'] is not None}))
check('standalone_row_count_5', len([r for r in rows if r['tier'] is None])==5, [r['productId'] for r in rows if r['tier'] is None])
check('no_fake_standalone_tiers', all(not (r['family'] in {'angel','whale-watch','market-impact','shield-map','risk-indicator'} and r['tier'] is not None) for r in rows), None)
check('pdf_not_product_family', 'pdf' not in row_families, sorted(row_families))
check('legacy_33_retired', 'legacy33ProductCompletionDenominatorRetired: true' in topo, True)
check('all_field_source_tokens_physically_bound', all(x['passed'] for x in field_verification), len(field_verification))
check('every_row_has_rights_scopes', all(x['scopeCount']>0 for x in row_scope_map), min(x['scopeCount'] for x in row_scope_map))
check('all_20_rows_mapped', len(row_scope_map)==20, len(row_scope_map))
check('global_dedupe_reduces_denominator', unique_denominator < raw_applications, {'raw':raw_applications,'unique':unique_denominator})
check('rights_numerator_zero_no_fake_credit', registry['denominators']['rightsPassed']==0, registry['denominators']['rightsPassed'])
check('sale_live_no_promotion', not any(registry['releaseState'].values()), registry['releaseState'])
verification['summary']={'checks':len(verification['checks']),'passed':sum(x['passed'] for x in verification['checks']),'failed':sum(not x['passed'] for x in verification['checks'])}
verification['registry']={'path':str(registry_path.relative_to(ROOT)),'bytes':len(reg_bytes),'sha256':sha256_bytes(reg_bytes),'uniqueRightsObligations':unique_denominator,'rightsPassed':0}
verification['status']='PASS_P67_CORRECTED_RIGHTS_DENOMINATOR_NO_PROMOTION' if verification['summary']['failed']==0 else 'FAIL'
verification['truthBoundary']=registry['truthBoundary']
ver_bytes=stable_json_bytes(verification)
(OUT/'P67_RIGHTS_REGISTRY_VERIFIER.json').write_bytes(ver_bytes)

# Compact actionable gap summary by field and family.
blocked_sources=defaultdict(int)
for s in scopes:
    for p in s['providerCandidates']:
        if p['engineeringRightsState'] != 'PASS_BOUNDED_PRIMARY_SOURCE_TERMS': blocked_sources[p['sourceId']]+=1
family_scope_counts={f:len({s['scopeId'] for s in scopes if f in s['usedByFamilies']}) for f in CATALOGS}
gap={
 'schemaVersion':'velmere.p67.rights-gap-summary.v1',
 'generatedAt':'2026-08-16T18:45:00.000Z',
 'correctedRightsDenominator':unique_denominator,
 'rightsPassed':0,
 'rightsWithheld':unique_denominator,
 'rawApplicationsBeforeGlobalDedupe':raw_applications,
 'familyScopeCounts':family_scope_counts,
 'boundedPrimarySourceTermsCandidates':sorted([sid for sid,s in source_candidates.items() if s.get('engineeringRightsState')=='PASS_BOUNDED_PRIMARY_SOURCE_TERMS']),
 'blockedOrWithheldSourceCandidates':sorted([sid for sid,s in source_candidates.items() if s.get('engineeringRightsState')!='PASS_BOUNDED_PRIMARY_SOURCE_TERMS']),
 'nextRequiredProof':[
   'Bind every customer-visible source-backed field to an exact provider/source receipt and exact delivery purpose.',
   'Implement and test mandatory attribution/license notices in UI and in Audit/Browser exported artifacts where source terms require them.',
   'Resolve commercial/external-display/redistribution entitlements for market-data providers and exchange-owned third-party data.',
   'Resolve CISA KEV exact license body before customer-display credit.',
   'Run final customer-output rights validation against actual output bytes, not fixtures or source-term eligibility alone.',
 ],
 'truthBoundary':registry['truthBoundary'],
}
(OUT/'P67_RIGHTS_GAP_SUMMARY.json').write_bytes(stable_json_bytes(gap))
print(json.dumps({'status':verification['status'],'rawApplications':raw_applications,'uniqueRightsObligations':unique_denominator,'rightsPassed':0,'fieldCatalogEntries':len(field_verification),'rows':len(row_scope_map),'registrySha256':verification['registry']['sha256']}, indent=2))
if verification['summary']['failed']:
    sys.exit(2)
