-- PASS23: explicit final service-role-only privilege boundaries for internal tables.
-- These tables intentionally expose no authenticated/anon policies. RLS remains fail-closed.
-- Static/source implementation only; apply/replay on staging remains required.

revoke all on table public.instrument_identity_snapshots from public, anon, authenticated;
grant all on table public.instrument_identity_snapshots to service_role;
comment on table public.instrument_identity_snapshots is 'PASS23 SERVICE_ROLE_ONLY_DEFAULT_DENY: direct public, anon and authenticated access is prohibited; access is mediated by authorized server endpoints and service_role.';

revoke all on table public.provider_evidence_ledgers from public, anon, authenticated;
grant all on table public.provider_evidence_ledgers to service_role;
comment on table public.provider_evidence_ledgers is 'PASS23 SERVICE_ROLE_ONLY_DEFAULT_DENY: direct public, anon and authenticated access is prohibited; access is mediated by authorized server endpoints and service_role.';

revoke all on table public.provider_evidence_refresh_targets from public, anon, authenticated;
grant all on table public.provider_evidence_refresh_targets to service_role;
comment on table public.provider_evidence_refresh_targets is 'PASS23 SERVICE_ROLE_ONLY_DEFAULT_DENY: direct public, anon and authenticated access is prohibited; access is mediated by authorized server endpoints and service_role.';

revoke all on table public.provider_evidence_snapshots from public, anon, authenticated;
grant all on table public.provider_evidence_snapshots to service_role;
comment on table public.provider_evidence_snapshots is 'PASS23 SERVICE_ROLE_ONLY_DEFAULT_DENY: direct public, anon and authenticated access is prohibited; access is mediated by authorized server endpoints and service_role.';

revoke all on table public.provider_health_observations from public, anon, authenticated;
grant all on table public.provider_health_observations to service_role;
comment on table public.provider_health_observations is 'PASS23 SERVICE_ROLE_ONLY_DEFAULT_DENY: direct public, anon and authenticated access is prohibited; access is mediated by authorized server endpoints and service_role.';

revoke all on table public.provider_health_snapshots from public, anon, authenticated;
grant all on table public.provider_health_snapshots to service_role;
comment on table public.provider_health_snapshots is 'PASS23 SERVICE_ROLE_ONLY_DEFAULT_DENY: direct public, anon and authenticated access is prohibited; access is mediated by authorized server endpoints and service_role.';

revoke all on table public.velmere_fulfilment_provider_sync_queue from public, anon, authenticated;
grant all on table public.velmere_fulfilment_provider_sync_queue to service_role;
comment on table public.velmere_fulfilment_provider_sync_queue is 'PASS23 SERVICE_ROLE_ONLY_DEFAULT_DENY: direct public, anon and authenticated access is prohibited; access is mediated by authorized server endpoints and service_role.';

revoke all on table public.velmere_fulfilment_provider_sync_runs from public, anon, authenticated;
grant all on table public.velmere_fulfilment_provider_sync_runs to service_role;
comment on table public.velmere_fulfilment_provider_sync_runs is 'PASS23 SERVICE_ROLE_ONLY_DEFAULT_DENY: direct public, anon and authenticated access is prohibited; access is mediated by authorized server endpoints and service_role.';

revoke all on table public.velmere_fulfilment_provider_sync_worker_lock from public, anon, authenticated;
grant all on table public.velmere_fulfilment_provider_sync_worker_lock to service_role;
comment on table public.velmere_fulfilment_provider_sync_worker_lock is 'PASS23 SERVICE_ROLE_ONLY_DEFAULT_DENY: direct public, anon and authenticated access is prohibited; access is mediated by authorized server endpoints and service_role.';

revoke all on table public.velmere_fulfilment_retry_queue from public, anon, authenticated;
grant all on table public.velmere_fulfilment_retry_queue to service_role;
comment on table public.velmere_fulfilment_retry_queue is 'PASS23 SERVICE_ROLE_ONLY_DEFAULT_DENY: direct public, anon and authenticated access is prohibited; access is mediated by authorized server endpoints and service_role.';

revoke all on table public.velmere_mutation_receipts from public, anon, authenticated;
grant all on table public.velmere_mutation_receipts to service_role;
comment on table public.velmere_mutation_receipts is 'PASS23 SERVICE_ROLE_ONLY_DEFAULT_DENY: direct public, anon and authenticated access is prohibited; access is mediated by authorized server endpoints and service_role.';

revoke all on table public.velmere_overlay_qa_receipts from public, anon, authenticated;
grant all on table public.velmere_overlay_qa_receipts to service_role;
comment on table public.velmere_overlay_qa_receipts is 'PASS23 SERVICE_ROLE_ONLY_DEFAULT_DENY: direct public, anon and authenticated access is prohibited; access is mediated by authorized server endpoints and service_role.';

revoke all on table public.velmere_payment_event_watermarks from public, anon, authenticated;
grant all on table public.velmere_payment_event_watermarks to service_role;
comment on table public.velmere_payment_event_watermarks is 'PASS23 SERVICE_ROLE_ONLY_DEFAULT_DENY: direct public, anon and authenticated access is prohibited; access is mediated by authorized server endpoints and service_role.';

revoke all on table public.velmere_payment_runtime_evidence from public, anon, authenticated;
grant all on table public.velmere_payment_runtime_evidence to service_role;
comment on table public.velmere_payment_runtime_evidence is 'PASS23 SERVICE_ROLE_ONLY_DEFAULT_DENY: direct public, anon and authenticated access is prohibited; access is mediated by authorized server endpoints and service_role.';

revoke all on table public.velmere_product_brain_reviews from public, anon, authenticated;
grant all on table public.velmere_product_brain_reviews to service_role;
comment on table public.velmere_product_brain_reviews is 'PASS23 SERVICE_ROLE_ONLY_DEFAULT_DENY: direct public, anon and authenticated access is prohibited; access is mediated by authorized server endpoints and service_role.';

revoke all on table public.velmere_product_variants from public, anon, authenticated;
grant all on table public.velmere_product_variants to service_role;
comment on table public.velmere_product_variants is 'PASS23 SERVICE_ROLE_ONLY_DEFAULT_DENY: direct public, anon and authenticated access is prohibited; access is mediated by authorized server endpoints and service_role.';

revoke all on table public.velmere_provider_contracts from public, anon, authenticated;
grant all on table public.velmere_provider_contracts to service_role;
comment on table public.velmere_provider_contracts is 'PASS23 SERVICE_ROLE_ONLY_DEFAULT_DENY: direct public, anon and authenticated access is prohibited; access is mediated by authorized server endpoints and service_role.';

revoke all on table public.velmere_provider_sandbox_runs from public, anon, authenticated;
grant all on table public.velmere_provider_sandbox_runs to service_role;
comment on table public.velmere_provider_sandbox_runs is 'PASS23 SERVICE_ROLE_ONLY_DEFAULT_DENY: direct public, anon and authenticated access is prohibited; access is mediated by authorized server endpoints and service_role.';

revoke all on table public.velmere_provider_snapshots from public, anon, authenticated;
grant all on table public.velmere_provider_snapshots to service_role;
comment on table public.velmere_provider_snapshots is 'PASS23 SERVICE_ROLE_ONLY_DEFAULT_DENY: direct public, anon and authenticated access is prohibited; access is mediated by authorized server endpoints and service_role.';

revoke all on table public.velmere_runtime_bridge_evidence_runs from public, anon, authenticated;
grant all on table public.velmere_runtime_bridge_evidence_runs to service_role;
comment on table public.velmere_runtime_bridge_evidence_runs is 'PASS23 SERVICE_ROLE_ONLY_DEFAULT_DENY: direct public, anon and authenticated access is prohibited; access is mediated by authorized server endpoints and service_role.';

revoke all on table public.velmere_runtime_bridge_gate_results from public, anon, authenticated;
grant all on table public.velmere_runtime_bridge_gate_results to service_role;
comment on table public.velmere_runtime_bridge_gate_results is 'PASS23 SERVICE_ROLE_ONLY_DEFAULT_DENY: direct public, anon and authenticated access is prohibited; access is mediated by authorized server endpoints and service_role.';

revoke all on table public.velmere_source_receipts from public, anon, authenticated;
grant all on table public.velmere_source_receipts to service_role;
comment on table public.velmere_source_receipts is 'PASS23 SERVICE_ROLE_ONLY_DEFAULT_DENY: direct public, anon and authenticated access is prohibited; access is mediated by authorized server endpoints and service_role.';

revoke all on table public.velmere_stripe_webhook_dead_letter_actions from public, anon, authenticated;
grant all on table public.velmere_stripe_webhook_dead_letter_actions to service_role;
comment on table public.velmere_stripe_webhook_dead_letter_actions is 'PASS23 SERVICE_ROLE_ONLY_DEFAULT_DENY: direct public, anon and authenticated access is prohibited; access is mediated by authorized server endpoints and service_role.';

revoke all on table public.velmere_stripe_webhook_effects from public, anon, authenticated;
grant all on table public.velmere_stripe_webhook_effects to service_role;
comment on table public.velmere_stripe_webhook_effects is 'PASS23 SERVICE_ROLE_ONLY_DEFAULT_DENY: direct public, anon and authenticated access is prohibited; access is mediated by authorized server endpoints and service_role.';

revoke all on table public.velmere_stripe_webhook_events from public, anon, authenticated;
grant all on table public.velmere_stripe_webhook_events to service_role;
comment on table public.velmere_stripe_webhook_events is 'PASS23 SERVICE_ROLE_ONLY_DEFAULT_DENY: direct public, anon and authenticated access is prohibited; access is mediated by authorized server endpoints and service_role.';

revoke all on table public.velmere_stripe_webhook_reconciliation_runs from public, anon, authenticated;
grant all on table public.velmere_stripe_webhook_reconciliation_runs to service_role;
comment on table public.velmere_stripe_webhook_reconciliation_runs is 'PASS23 SERVICE_ROLE_ONLY_DEFAULT_DENY: direct public, anon and authenticated access is prohibited; access is mediated by authorized server endpoints and service_role.';

revoke all on table public.velmere_write_rate_limit_events from public, anon, authenticated;
grant all on table public.velmere_write_rate_limit_events to service_role;
comment on table public.velmere_write_rate_limit_events is 'PASS23 SERVICE_ROLE_ONLY_DEFAULT_DENY: direct public, anon and authenticated access is prohibited; access is mediated by authorized server endpoints and service_role.';
