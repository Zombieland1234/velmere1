-- PASS2559 support dashboard action RLS policy test rebalance
-- Skeleton only: must be applied with real Supabase migrations before production claims.

create table if not exists support_dashboard_action_receipts (
  id uuid primary key default gen_random_uuid(),
  support_case_id text not null,
  account_id uuid not null,
  operator_id uuid,
  action_kind text not null,
  action_state text not null default 'queued',
  dashboard_action_receipt_hash text not null,
  idempotency_key text not null unique,
  rls_policy_fixture_hash text not null,
  operator_action_scope_hash text not null,
  provider_retry_receipt_hash text,
  customer_dsar_timeline_hash text,
  dead_letter_replay_hash text,
  no_raw_action_leak boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table support_dashboard_action_receipts enable row level security;

create policy support_dashboard_action_receipts_own_account_select
on support_dashboard_action_receipts for select
using (auth.uid() = account_id);

create policy support_dashboard_action_receipts_server_insert
on support_dashboard_action_receipts for insert
with check (false);

create policy support_dashboard_action_receipts_server_update
on support_dashboard_action_receipts for update
using (false)
with check (false);

-- raw_provider_webhook_body, raw_dsar_payload, private_contact, raw_payment_payload,
-- raw_ip_address, raw_device_fingerprint, raw_user_agent, operator_internal_note,
-- rls_bypass_token and service_role_secret are intentionally absent from customer tables.
