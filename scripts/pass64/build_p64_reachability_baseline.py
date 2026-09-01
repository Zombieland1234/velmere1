#!/usr/bin/env python3
import json,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'artifacts/closure/p64/P64_REACHABILITY_BASELINE.json'
GEN='2026-08-16T14:30:00.000Z'
MAP={
 'Audit':{
  'ui':['app/[locale]/security/audits/page.tsx'],
  'api':['app/api/security/audit-watch/customer-safe-report/route.ts'],
  'runtime':['lib/server/security-route-modules/audit-liquidity-holder-risk.ts']},
 'PDF':{
  'ui':['app/[locale]/browser/page.tsx'],
  'api':['lib/server/search-route-modules/lens-report.ts'],
  'runtime':['lib/search/lens-pdf-renderer.ts','lib/search/lens-pdf-worker.ts']},
 'Browser':{
  'ui':['app/[locale]/browser/page.tsx'],
  'api':['lib/server/search-route-modules/lens-route.ts','lib/server/search-route-modules/live-preview.ts'],
  'runtime':['lib/server/search-route-modules/lens-report.ts']},
 'Shield':{
  'ui':['app/[locale]/shield/page.tsx'],
  'api':['app/api/market-integrity/[operation]/route.ts'],
  'runtime':['lib/server/market-integrity-route-modules/markets.ts']},
 'Shield Pro':{
  'ui':['app/[locale]/shield-pro/page.tsx'],
  'api':['app/api/market-integrity/[operation]/route.ts'],
  'runtime':['lib/server/market-integrity-route-modules/investigator.ts','lib/market-integrity/shield-pro-full-catalog-client.ts']},
 'Shield Map':{
  'ui':['app/[locale]/shield-map/page.tsx','app/[locale]/market-integrity/shield-map/page.tsx'],
  'api':['app/api/market-integrity/[operation]/route.ts'],
  'runtime':['lib/market-integrity/shield-map-query-boundary.ts','lib/market-integrity/shield-map-evidence-graph-2.ts']},
 'Real Markets':{
  'ui':['app/[locale]/real-markets/page.tsx'],
  'api':['app/api/market-integrity/real-markets/[operation]/route.ts'],
  'runtime':['lib/server/market-integrity-route-modules/real-markets.ts','lib/market-integrity/cross-asset-runtime-normalizers.ts']},
 'Market Impact':{
  'ui':['components/market-integrity/AssetDetailModal.tsx','components/market-integrity/AssetIntelligenceTabs.tsx'],
  'api':['lib/server/market-integrity-route-modules/market-intelligence.ts'],
  'runtime':['lib/market-integrity/market-impact-engine.ts','lib/market-integrity/market-impact-customer-truth.ts']},
 'Whale Watch':{
  'ui':['components/market-integrity/AssetDetailModal.tsx','components/market-integrity/AssetIntelligenceTabs.tsx'],
  'api':['lib/server/market-integrity-route-modules/market-intelligence.ts'],
  'runtime':['lib/market-integrity/whale-watch-engine.ts','lib/market-integrity/whale-watch-customer-truth.ts']},
 'Angel':{
  'ui':['components/angel/AngelPanel.tsx'],
  'api':['app/api/angel/route.ts','app/api/angel/stream/route.ts'],
  'runtime':['lib/server/market-integrity-route-modules/angel.ts','lib/ai/angel-route-policy.ts']},
 'Risk Indicator':{
  'ui':['app/[locale]/risk-methodology/page.tsx','components/market-integrity/AssetDetailModal.tsx'],
  'api':['lib/server/market-integrity-route-modules/risk-calibration.ts'],
  'runtime':['lib/market-integrity/risk-indicator-projection.ts','lib/market-integrity/risk-indicator-customer-truth.ts']},
}
def h(p):
 b=(ROOT/p).read_bytes(); return {'path':p,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
rows=[]
for fam,m in MAP.items():
 allp=[p for xs in m.values() for p in xs]
 missing=[p for p in allp if not (ROOT/p).is_file()]
 binds={k:[h(p) for p in ps if (ROOT/p).is_file()] for k,ps in m.items()}
 dedicated_route=fam not in ['PDF','Market Impact','Whale Watch','Risk Indicator']
 status='STATIC_SOURCE_PRESENT_NOT_RUNTIME_EXECUTED'
 if missing: status='STATIC_SOURCE_MISSING'
 entry_mode='DEDICATED_ROUTE_OR_PAGE' if dedicated_route else 'INTEGRATED_SURFACE_OR_JOB_ENTRY'
 rows.append({'family':fam,'status':status,'sourceBindings':binds,'missing':missing,'customerEntryPointStaticPresent':not missing,'entryPointMode':entry_mode,'dedicatedRouteObserved':dedicated_route,'discrepancies':[],'productionRuntimeExecutedInP64':False})
obj={'schemaVersion':'velmere.p64.reachability-baseline.v1','generatedAt':GEN,'families':rows,'summary':{'families':len(rows),'allHaveStaticSource':sum(not r['missing'] for r in rows),'staticCustomerEntryPointPresent':sum(r['customerEntryPointStaticPresent'] for r in rows),'dedicatedRouteObserved':sum(r['dedicatedRouteObserved'] for r in rows),'integratedOrJobEntryObserved':sum(not r['dedicatedRouteObserved'] for r in rows)},'truthBoundary':'P64 verifies static current-source route/API/runtime file presence and exact hashes only. It does not claim production runtime reachability. Some families use integrated surfaces or job/API entry points rather than a dedicated page. P64 does not invent a dedicated-route requirement; production runtime reachability remains open for every family.'}
OUT.parent.mkdir(parents=True,exist_ok=True); raw=(json.dumps(obj,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode(); OUT.write_bytes(raw)
print(json.dumps(obj['summary']))
