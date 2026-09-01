#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json, re
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
FIXED='2026-08-20T19:10:00.000Z'
checks=[]
def check(ident, condition, detail=None):
    row={'id':ident,'status':'PASS' if condition else 'FAIL'}
    if detail is not None: row['detail']=detail
    checks.append(row)
    if not condition: raise AssertionError(f'{ident}: {detail!r}')

def text(path): return (ROOT/path).read_text()
def sha(path): return hashlib.sha256((ROOT/path).read_bytes()).hexdigest()

contract=text('lib/market-integrity/risk-history-contract.ts')
ledger=text('lib/market-integrity/risk-ledger.ts')
memory=text('lib/market-integrity/market-memory.ts')
spine=text('lib/market-integrity/long-term-memory-spine.ts')
history=text('lib/server/market-integrity-route-modules/history.ts')
markets=text('lib/server/market-integrity-route-modules/markets.ts')
migration_path='supabase/migrations/20260820000006_p91_risk_history_event_driven_versioned_durable_truth.sql'
migration=text(migration_path)
schema=text('lib/db/schema.sql')

check('event_contract_new_production_module', (ROOT/'lib/market-integrity/risk-history-contract.ts').is_file())
check('snapshot_schema_versioned', 'velmere.risk-history-snapshot.v1' in contract)
check('event_schema_versioned', 'velmere.risk-history-event.v1' in contract)
check('customer_schema_versioned', 'velmere.risk-history.customer.v1' in contract)
check('heartbeat_exactly_24h', '24 * 60 * 60 * 1_000' in contract)
check('event_types_closed', all(marker in contract for marker in ['TRACKING_STARTED','SCORE_CHANGED','LEVEL_CHANGED','METHODOLOGY_CHANGED','EVIDENCE_CHANGED','PUBLICATION_STATE_CHANGED','HEARTBEAT']))
check('first_event_rule', 'reason: "FIRST_EVENT"' in contract and '"TRACKING_STARTED"' in contract)
check('unchanged_skip_rule', 'UNCHANGED_WITHIN_HEARTBEAT' in contract)
check('timestamp_collision_rule', 'TIMESTAMP_COLLISION' in contract)
check('non_monotonic_rule', 'NON_MONOTONIC_TIME' in contract)
check('snapshot_digest_verified', 'verifyRiskHistorySnapshot' in contract and 'snapshotDigest' in contract)
check('event_digest_verified', 'verifyRiskHistoryEvent' in contract and 'eventDigest' in contract)
check('identity_unresolved_withheld', 'identity.identityClass !== "UNRESOLVED"' in contract)
check('canonical_identity_charset_bounded', '^[a-z0-9][a-z0-9:._-]{2,255}$' in contract)
check('control_characters_removed', 'replace(/[\\u0000-\\u001f\\u007f]/gu' in contract)
check('score_version_model_binding', 'riskModelBindingDigest(modelBinding)' in contract)
check('evidence_digest_bound', 'providerRiskDelivery?.receiptDigest' in contract and 'providerRiskDelivery?.sourceReceiptRoot' in contract)
check('comparability_versioned', 'comparabilityKey' in contract and 'METHODOLOGY_CHANGED' in contract)
check('methodology_change_new_segment', 'starts a new comparability segment' in contract)
check('score_not_probability', 'isProbability: false' in contract and 'probabilityPercent: null' in contract)
check('stored_change_reason_not_directly_exposed', 'changeReasons: customerSafeChangeReasons(event)' in contract)
check('customer_reasons_closed_from_types', 'function customerSafeChangeReasons' in contract)
check('public_events_only', '.filter((event) => event.customerPublishable && event.publicationState === "PUBLIC")' in contract)
check('tracking_start_public_boundary', 'trackingStartedAt: firstPublic?.observedAt ?? null' in contract)
check('raw_market_fields_absent_from_customer_type', all(f'{field}:' not in contract.split('export type CustomerRiskHistoryProjection =',1)[1].split('function validIso',1)[0] for field in ['price','marketCap','volume24h','dominantAgent']))
check('durability_limitation_explicit', 'Multi-year durable history is not yet verified' in contract)

check('market_snapshot_extended_versioned', 'schemaVersion?: "velmere.risk-history-snapshot.v1"' in memory)
check('market_snapshot_uses_contract_builder', 'return buildRiskHistorySnapshot({' in memory)
check('market_snapshot_uses_result_generated_time', 'row.observedAt ?? row.result.generatedAt' in memory)

check('old_nonexistent_table_removed_from_ledger', 'market_integrity_snapshots' not in ledger)
check('new_event_table_rpc_path', 'velmere_append_risk_history_events_v1' in ledger)
check('latest_read_before_decision', ledger.index('velmere_get_latest_risk_history_events_v1') < ledger.index('velmere_append_risk_history_events_v1'))
check('exact_readback_after_append', ledger.index('velmere_read_risk_history_events_v1') > ledger.index('velmere_append_risk_history_events_v1'))
check('readback_event_digest_compared', 'actual.eventDigest !== expected.eventDigest' in ledger)
check('invalid_readback_degrades', 'DEGRADED_MEMORY_FALLBACK' in ledger and 'risk_history_rpc_event_integrity_invalid' in ledger)
check('configuration_not_durable', 'CONFIGURED_UNVERIFIED' in ledger)
check('durable_only_after_readback', 'store.durabilityState = "DURABLE_READBACK_VERIFIED"' in ledger)
check('durable_years_requires_verified_state', 'store.durabilityState === "DURABLE_READBACK_VERIFIED"\n      ? "durable_years_ready"' in ledger)
check('memory_event_driven', 'decideRiskHistoryEvent(snapshot, latestEvent' in ledger)
check('memory_not_every_sweep', 'UNCHANGED_WITHIN_HEARTBEAT' in contract and 'candidateEvents' in ledger)
check('legacy_snapshot_fails_closed', 'risk_history_snapshot_contract_invalid' in ledger)
check('service_role_key_not_customer_output', 'SUPABASE_SERVICE_ROLE_KEY' in ledger and 'getCustomerSafeRiskLedgerStatus' in ledger)
customer_status_block=ledger.split('export async function getCustomerSafeRiskLedgerStatus',1)[1]
check('customer_status_excludes_internal_error', 'lastError:' not in customer_status_block)
check('customer_status_excludes_highest_risk', 'highestStoredRisk' not in customer_status_block)
check('customer_status_excludes_global_counts', 'trackedAssets:' not in customer_status_block and 'storedEvents:' not in customer_status_block)
check('customer_status_generic_blockers', all(marker in customer_status_block for marker in ['durable_history_temporarily_unavailable','durable_history_readback_not_verified','durable_history_not_configured']))

check('public_route_uses_event_projection', 'buildCustomerRiskHistoryProjection' in history)
check('public_route_uses_customer_safe_ledger', 'getCustomerSafeRiskLedgerStatus' in history)
check('public_route_does_not_use_raw_market_history', 'getMarketHistory' not in history)
check('public_route_does_not_return_raw_history_key', re.search(r'\bhistory\s*[,}]', history) is None)
check('public_route_no_store', 'no-store, max-age=0' in history)
check('public_route_query_allowlist', 'ALLOWED_QUERY_KEYS' in history)
check('public_route_duplicate_query_rejected', 'duplicate' in history and 'Unsupported or duplicate' in history)
check('public_route_identity_bounded', 'ASSET_ID' in history and '{1,256}' in history)
check('public_route_limit_bounded', 'Math.min(Number(rawLimit ?? "144"), 500)' in history)
check('public_route_never_claims_live', 'liveClaimed: false' in history)
check('markets_route_uses_safe_status', 'getCustomerSafeRiskLedgerStatus' in markets and 'getRiskLedgerStatus' not in markets)
check('markets_empty_ledger_shape_truthful', 'readBackVerified: false' in markets and 'RUNTIME_MEMORY_ONLY' in markets)

check('long_term_spine_no_supabase_config_credit', 'storageMode === "supabase"' not in spine)
check('long_term_spine_requires_readback_token', 'storageMode === "durable_readback_verified"' in spine)
check('long_term_spine_event_driven_policy_text', 'first observations, material risk changes and bounded continuity heartbeats' in spine)

check('migration_exists', (ROOT/migration_path).is_file())
check('migration_order_after_p88', Path(migration_path).name > '20260820000005_p88_audit_paid_exact_immutable_pdf_blob.sql')
check('migration_transaction_bound', migration.lstrip().startswith('begin;') and migration.rstrip().endswith('commit;'))
check('migration_creates_missing_table', 'create table if not exists public.velmere_risk_history_events' in migration)
check('migration_event_id_primary_key', 'event_id text primary key' in migration)
check('migration_asset_timestamp_unique', 'unique (canonical_asset_id, observed_at)' in migration)
check('migration_digest_constraints', migration.count("^sha256:[a-f0-9]{64}$") >= 4)
check('migration_publication_check', "customer_publishable = (publication_state = 'PUBLIC')" in migration)
check('migration_public_requires_versions', "not customer_publishable" in migration and "identity_class <> 'UNRESOLVED'" in migration)
check('migration_event_type_allowlist', "event_types <@ array[" in migration)
check('migration_rls_enabled', 'alter table public.velmere_risk_history_events enable row level security' in migration)
check('migration_no_customer_table_grants', 'revoke all on table public.velmere_risk_history_events from public, anon, authenticated' in migration)
check('migration_service_role_only_table', 'grant select, insert on table public.velmere_risk_history_events to service_role' in migration)
check('migration_validation_trigger', 'p91_validate_risk_history_event' in migration)
check('migration_immutable_trigger', 'p91_reject_risk_history_event_mutation' in migration and 'before update or delete' in migration)
check('migration_storage_digest_verification', "digest(convert_to(new.event_json::text, 'UTF8'), 'sha256')" in migration)
check('migration_event_snapshot_cross_binding', 'risk_history_snapshot_cross_binding_mismatch' in migration)
check('migration_per_asset_advisory_lock', "pg_advisory_xact_lock(hashtextextended('p91-risk-history:' || v_asset, 0))" in migration)
check('migration_exact_duplicate_idempotent', 'risk_history_event_id_conflict' in migration and 'v_skipped := v_skipped + 1' in migration)
check('migration_non_monotonic_rejected', 'risk_history_observation_non_monotonic' in migration)
check('migration_heartbeat_24h', "interval '24 hours'" in migration and 'risk_history_unchanged_event_not_due' in migration)
check('migration_score_marker_required', 'risk_history_score_change_marker_missing' in migration)
check('migration_level_marker_required', 'risk_history_level_change_marker_missing' in migration)
check('migration_method_marker_required', 'risk_history_methodology_change_marker_missing' in migration)
check('migration_evidence_marker_required', 'risk_history_evidence_change_marker_missing' in migration)
check('migration_publication_marker_required', 'risk_history_publication_change_marker_missing' in migration)
check('migration_latest_rpc', 'velmere_get_latest_risk_history_events_v1' in migration)
check('migration_append_rpc', 'velmere_append_risk_history_events_v1' in migration)
check('migration_exact_readback_rpc', 'velmere_read_risk_history_events_v1' in migration)
check('migration_asset_read_rpc', 'velmere_read_risk_history_by_asset_v1' in migration)
check('migration_rpcs_not_customer_executable', migration.count('from public, anon, authenticated') >= 5)
check('migration_rpcs_service_role_execute', migration.count('to service_role;') >= 5)
check('schema_contains_p91_table', 'create table if not exists public.velmere_risk_history_events' in schema)
check('schema_contains_p91_append_rpc', 'velmere_append_risk_history_events_v1' in schema)
check('schema_p91_marker_once', schema.count('-- P91 RISK HISTORY EVENT-DRIVEN, VERSIONED, DURABLE TRUTH BEGIN') == 1)

migrations=sorted((ROOT/'supabase/migrations').glob('*.sql'))
check('p91_is_latest_ordered_migration', migrations[-1].name == Path(migration_path).name, migrations[-1].name)
check('no_duplicate_p91_migration', sum('p91_risk_history' in p.name for p in migrations) == 1)

master='VELMERE_ULTIMATE_WORLD_CLASS_CONTINUOUS_CLOSURE_FINAL_CANDIDATE_MASTER_DIRECTIVE_V2_COMPLETE_2026-08-20.txt'
v17='VELMERE_CANONICAL_OWNER_DIRECTIVE_V17_TRUE_TOPOLOGY_AUTOMATED_ADVANCED_CURRENT_WORLD_CLASS_2026-08-17.txt'
check('master_v2_preserved', sha(master) == '9184cd18eb864f50a8c5d3af8f2899e7f138372861095e343901ab9c5e3bcb53', sha(master))
check('v17_preserved', sha(v17) == 'de7fbd6df651a7a8a8f85054c6e9ac3c2ca530ebfb0d4ccd335dcb99fb658f05', sha(v17))

failed=[r for r in checks if r['status']!='PASS']
receipt={
  'schemaVersion':'velmere.p91.risk-history-static.v1',
  'generatedAt':FIXED,
  'status':'PASS_BOUNDED_STATIC_MIGRATION_AND_CUSTOMER_BOUNDARY' if not failed else 'FAIL',
  'checks':{'total':len(checks),'passed':len(checks)-len(failed),'failed':len(failed),'rows':checks},
  'source':{
    'contractSha256':sha('lib/market-integrity/risk-history-contract.ts'),
    'ledgerSha256':sha('lib/market-integrity/risk-ledger.ts'),
    'migrationSha256':sha(migration_path),
    'historyRouteSha256':sha('lib/server/market-integrity-route-modules/history.ts'),
  },
  'zeroFakeCredit':{
    'postgresqlRuntime':'WITHHELD_NO_DATABASE_ENVIRONMENT',
    'stagingRls':'WITHHELD',
    'durableReadBackProduction':'WITHHELD',
    'customerFinal':'0/20',
    'riskIndicatorFinal':False,
  },
  'truthBoundary':'Static proof verifies source and SQL control presence, ordering and customer-safe boundaries. It does not execute PostgreSQL, triggers, RLS, transaction rollback, staging or production storage.',
}
for target in [ROOT/'receipts/p91/P91_RISK_HISTORY_STATIC.json',ROOT/'artifacts/p91/P91_RISK_HISTORY_STATIC.json']:
    target.parent.mkdir(parents=True,exist_ok=True);target.write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps({'status':receipt['status'],'checks':receipt['checks'],'source':receipt['source']},indent=2))
raise SystemExit(0 if not failed else 1)
