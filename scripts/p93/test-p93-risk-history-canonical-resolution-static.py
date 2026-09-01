#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
checks=[]
def text(path): return (ROOT/path).read_text(encoding='utf-8')
def sha(path): return 'sha256:'+hashlib.sha256((ROOT/path).read_bytes()).hexdigest()
def check(cid, cond, detail=None):
    row={'id':cid,'status':'PASS' if cond else 'FAIL'}
    if detail is not None: row['detail']=detail
    checks.append(row)
    if not cond: raise AssertionError(f'{cid}: {detail!r}')

contract=text(Path('lib/market-integrity/risk-history-contract.ts'))
ledger=text(Path('lib/market-integrity/risk-ledger.ts'))
route=text(Path('lib/server/market-integrity-route-modules/history.ts'))
migration_path=Path('supabase/migrations/20260820000007_p93_risk_history_canonical_identity_public_resolution.sql')
migration=text(migration_path)
schema=text(Path('lib/db/schema.sql'))
ui=text(Path('components/market-integrity/RiskHistoryControl.tsx'))
client=text(Path('lib/market-integrity/risk-history-customer-client.ts'))

# Event/snapshot integrity is stronger than a self-consistent attacker-controlled digest.
check('contract:resolution-state-versioned','RiskHistoryAssetResolutionState = "RESOLVED" | "EMPTY" | "AMBIGUOUS"' in contract)
check('contract:closed-snapshot-fields','RISK_HISTORY_SNAPSHOT_FIELDS' in contract and 'exactObjectKeys(snapshot, RISK_HISTORY_SNAPSHOT_FIELDS)' in contract)
check('contract:closed-event-fields','RISK_HISTORY_EVENT_FIELDS' in contract and 'exactObjectKeys(event, RISK_HISTORY_EVENT_FIELDS)' in contract)
check('contract:event-id-recomputed','event.eventId !== eventId(event.snapshot)' in contract)
for field in ['identityClass','symbol','name','signalCount','confidence','sourceAsOf']:
    check(f'contract:snapshot-binding:{field}',f'event.{field}' in contract and f'event.snapshot.{field}' in contract)
check('contract:recorded-after-observed','Date.parse(event.recordedAt) < Date.parse(event.observedAt)' in contract)
check('contract:event-types-unique','new Set(event.eventTypes).size !== event.eventTypes.length' in contract)
check('contract:event-types-allowlisted','RISK_HISTORY_EVENT_TYPES.has(type)' in contract)
check('contract:change-reasons-bounded','validBoundedText(reason, 240)' in contract)
check('contract:public-builder-exists','buildPublicCustomerRiskHistoryProjection' in contract)
check('contract:public-max-144','limit > 144' in contract)
check('contract:rejects-mixed-canonical','risk_history_public_identity_mix' in contract)
check('contract:rejects-unbound-request','risk_history_public_request_identity_unbound' in contract)
check('contract:rejects-duplicates','risk_history_public_duplicate_event' in contract)
check('contract:strict-order','risk_history_public_order_invalid' in contract)
check('contract:nonresolved-empty-only','risk_history_nonresolved_payload_invalid' in contract)
check('contract:withheld-normalized-empty','if (!publicEvents.length) return emptyPublicRiskHistoryProjection' in contract)
check('contract:no-private-existence-copy','Stored observations exist' not in contract[contract.index('function emptyPublicRiskHistoryProjection'):])
check('contract:visible-history-boundary','no earlier internal tracking is implied' in contract)
check('contract:not-probability','isProbability: false' in contract and 'probabilityPercent: null' in contract)

# Resolver parses a closed RPC envelope and never uses one mutable alias slot for public resolution.
check('ledger:v2-schema','velmere.risk-history-asset-resolution.v2' in ledger)
check('ledger:closed-envelope','RESOLUTION_FIELDS' in ledger and 'risk_history_resolution_fields_invalid' in ledger)
check('ledger:resolved-needs-events','events.length < 1' in ledger and 'risk_history_resolution_identity_invalid' in ledger)
check('ledger:resolved-one-canonical','events.some((event) => event.canonicalAssetId !== record.canonicalAssetId)' in ledger)
check('ledger:resolved-order-checked','risk_history_resolution_order_invalid' in ledger)
check('ledger:memory-scans-histories','for (const [canonicalAssetId, history] of store.events.entries())' in ledger)
mem=ledger[ledger.index('function memoryRiskHistoryResolution'):ledger.index('export async function getPersistentRiskHistoryResolution')]
check('ledger:memory-resolution-does-not-trust-alias-map','store.aliases' not in mem)
check('ledger:exact-canonical-precedence','canonicalMatches.size > 0 ? canonicalMatches : aliasMatches' in ledger)
check('ledger:ambiguous-no-events','resolution: "AMBIGUOUS", canonicalAssetId: null, events: []' in ledger)
check('ledger:public-limit-144','PUBLIC_RISK_HISTORY_MAX_EVENTS = 144' in ledger)
check('ledger:internal-limit-5000','INTERNAL_RISK_HISTORY_MAX_EVENTS = 5_000' in ledger)
check('ledger:v2-rpc-called','velmere_read_risk_history_by_asset_v2' in ledger)
check('ledger:request-binding','resolutionRequestBound(clean, envelope)' in ledger)
check('ledger:configured-outage-throws','throw new Error("risk_history_resolution_unavailable")' in ledger)
resolution_segment=ledger[ledger.index('export async function getPersistentRiskHistoryResolution'):ledger.index('export async function getPersistentRiskHistoryEvents')]
check('ledger:read-only-does-not-promote-durability','A successful public read proves only that this bounded read completed' in resolution_segment and 'store.durabilityState = "DURABLE_READBACK_VERIFIED"' not in resolution_segment)
check('ledger:no-public-memory-fallback-on-configured-error',ledger.index('throw new Error("risk_history_resolution_unavailable")') < ledger.index('export async function getPersistentRiskHistoryEvents'))
shared_reader=ledger[ledger.index('export async function getPersistentRiskHistoryEvents'):ledger.index('export async function getPersistentRiskHistory(')]
check('ledger:shared-reader-delegates-v2','getPersistentRiskHistoryResolution(clean, boundedLimit)' in shared_reader)
check('ledger:shared-reader-no-v1-rpc','velmere_read_risk_history_by_asset_v1' not in shared_reader)
check('ledger:shared-reader-ambiguous-empty','resolution.resolution === "RESOLVED" ? resolution.events.slice(-boundedLimit) : []' in shared_reader)
snapshot_reader=ledger[ledger.index('export async function getPersistentRiskHistory('):ledger.index('export async function getRiskLedgerStatus')]
check('ledger:snapshot-reader-inherits-canonical-events','getPersistentRiskHistoryEvents(id, limit)' in snapshot_reader)

# Public route is abuse-bounded, security-headered and non-enumerating.
check('route:security-json','securityJson' in route and 'NextResponse' not in route)
check('route:durable-rate-limit','await applyApiRateLimit' in route)
check('route:rate-limit-36','PUBLIC_HISTORY_RATE_LIMIT = 36' in route)
check('route:max-144','PUBLIC_HISTORY_MAX_EVENTS = 144' in route)
check('route:reject-not-clamp','limit > PUBLIC_HISTORY_MAX_EVENTS' in route and 'Math.min' not in route)
check('route:v2-resolution','getPersistentRiskHistoryResolution' in route)
check('route:strict-public-builder','buildPublicCustomerRiskHistoryProjection' in route)
check('route:no-resolution-field-output','resolution:' not in route[route.index('return routeJson({\n      mode: "stored"'):])
check('route:generic-service-error','risk_history_temporarily_unavailable' in route and 'catch {' in route)
check('route:no-raw-error-forwarding','lastError' not in route and 'error.message' not in route)
check('route:no-live-claim','liveClaimed: false' in route)
check('route:url-byte-bound','TextEncoder().encode(request.url).byteLength > 2_048' in route)
check('route:duplicate-query-rejected','url.searchParams.getAll(key).length > 1' in route)
check('route:rate-headers-preserved','rateLimit.headers' in route)

# SQL resolves identity before limiting and grants only service role.
check('migration:ordered-name',migration_path.name.startswith('20260820000007_p93_'))
check('migration:transaction',migration.startswith('begin;') and migration.rstrip().endswith('commit;'))
check('migration:v2-function','velmere_read_risk_history_by_asset_v2' in migration)
check('migration:strict-input-regex',"^[A-Za-z0-9:._-]{1,256}$" in migration)
check('migration:internal-max-5000','p_limit > 5000' in migration)
check('migration:public-cap-remains-app-layer','public HTTP route remains independently capped at 144' in migration)
check('migration:exact-candidates','exact_candidates as' in migration and 'lower(canonical_asset_id) = v_requested' in migration)
check('migration:alias-candidates','alias_candidates as' in migration and 'lower(asset_id) = v_requested' in migration)
check('migration:distinct-canonical',migration.count('select distinct canonical_asset_id') >= 2)
check('migration:exact-precedence',"when exact_count = 1 then 'RESOLVED'" in migration and 'when exact_count > 1 then \'AMBIGUOUS\'' in migration)
check('migration:alias-ambiguity',"when alias_count > 1 then 'AMBIGUOUS'" in migration)
check('migration:limit-after-selected-canonical',migration.index('where canonical_asset_id = v_canonical_asset_id') < migration.index('limit p_limit'))
check('migration:ascending-return','jsonb_agg(row.event_json order by row.observed_at)' in migration)
check('migration:closed-envelope',all(f"'{field}'" in migration for field in ['schemaVersion','resolution','canonicalAssetId','events']))
check('migration:service-role-only','revoke all on function public.velmere_read_risk_history_by_asset_v2(text, integer)\n  from public, anon, authenticated, service_role;' in migration)
check('migration:service-role-grant','grant execute on function public.velmere_read_risk_history_by_asset_v2(text, integer) to service_role;' in migration)
check('migration:no-customer-grant','grant execute on function public.velmere_read_risk_history_by_asset_v2(text, integer) to authenticated' not in migration and ' to anon' not in migration)
check('migration:case-insensitive-indexes','canonical_lower_time_idx' in migration and 'asset_lower_time_idx' in migration)
check('schema:contains-exact-migration',migration in schema)

# Customer wording does not overclaim internal tracking start or private existence.
check('ui:pl-visible-history','Widoczna historia od' in ui)
check('ui:en-visible-history','Visible history since' in ui)
check('ui:de-visible-history','Sichtbarer Verlauf seit' in ui)
check('ui:no-private-existence-copy','Observations exist' not in ui and 'Obserwacje istnieją' not in ui and 'Beobachtungen sind vorhanden' not in ui)
check('ui:tracking-boundary-explained','does not imply earlier internal tracking' in ui and 'nie oznacza to wcześniejszego wewnętrznego trackingu' in ui)
check('client:still-bounds-144','RISK_HISTORY_CUSTOMER_MAX_EVENTS = 144' in client and 'value.history.length > RISK_HISTORY_CUSTOMER_MAX_EVENTS' in client)

failed=[row for row in checks if row['status']!='PASS']
receipt={
 'schemaVersion':'velmere.p93.risk-history-canonical-resolution-static.v1',
 'generatedAt':'2026-08-20T12:00:00.000Z',
 'status':'FAIL' if failed else 'PASS_BOUNDED_STATIC_CURRENT_SOURCE',
 'checks':{'total':len(checks),'passed':len(checks)-len(failed),'failed':len(failed),'rows':checks},
 'sourceHashes':{
   'contract':sha(Path('lib/market-integrity/risk-history-contract.ts')),
   'ledger':sha(Path('lib/market-integrity/risk-ledger.ts')),
   'route':sha(Path('lib/server/market-integrity-route-modules/history.ts')),
   'migration':sha(migration_path),
   'schema':sha(Path('lib/db/schema.sql')),
   'ui':sha(Path('components/market-integrity/RiskHistoryControl.tsx')),
 },
 'zeroFakeCredit':{
   'sqlExecuted':False,'browserRendered':False,'stagingExecuted':False,'timingOracleTested':False,
   'riskIndicatorFinal':False,'customerFinal':'0/20','live':False,
 },
 'truthBoundary':'This proves current-source structure for canonical resolution across the shared Shield/Angel/report reader, strict event validation, bounded public route behavior and migration/grant intent. It does not execute PostgreSQL, render a browser, prove timing indistinguishability, staging or Customer FINAL.'
}
for rel in ['receipts/p93/P93_RISK_HISTORY_CANONICAL_RESOLUTION_STATIC.json','artifacts/p93/P93_RISK_HISTORY_CANONICAL_RESOLUTION_STATIC.json']:
    out=ROOT/rel; out.parent.mkdir(parents=True,exist_ok=True); out.write_text(json.dumps(receipt,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
print(json.dumps({'status':receipt['status'],'checks':receipt['checks'],'sourceHashes':receipt['sourceHashes']},indent=2,ensure_ascii=False))
