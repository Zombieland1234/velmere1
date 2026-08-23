\set ON_ERROR_STOP on
create role anon nologin;
create role authenticated nologin;
create role service_role nologin;
create extension if not exists pgcrypto;

create table public.velmere_audit_intake_cases (
  case_id text primary key,
  case_ref text not null unique,
  request_id text not null unique,
  target_hash text not null,
  tier text not null check (tier in ('basic','pro','advanced')),
  status text not null,
  account_id text null,
  entitlement_id text null,
  entitlement_required boolean not null default false,
  entitlement_verified boolean not null default false,
  analysis_started boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.velmere_audit_case_status_history (
  history_id uuid primary key default gen_random_uuid(),
  case_id text not null references public.velmere_audit_intake_cases(case_id) on delete restrict,
  case_ref text not null,
  case_sequence integer not null check (case_sequence > 0),
  event_type text not null,
  previous_status text null,
  next_status text not null,
  queue_lane text not null,
  payment_state text not null check (payment_state in ('not_required','awaiting','pending','verified','failed','expired','refunded','chargeback')),
  analysis_started boolean not null default false,
  reason_code text null,
  previous_event_hash text null,
  event_hash text not null unique,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(case_id, case_sequence),
  constraint velmere_audit_case_status_history_event_type_check check (event_type in ('case_created','status_changed')),
  constraint velmere_audit_case_status_history_queue_lane_check check (queue_lane in ('basic_prescreen','payment_verification','pro_review','advanced_human_review','blocked')),
  constraint velmere_audit_case_status_history_reason_code_check check (reason_code is null or reason_code in ('checkout_expired','payment_failed','refund','chargeback'))
);

create or replace function public.velmere_audit_history_payment_state(p_status text,p_entitlement_required boolean,p_entitlement_verified boolean,p_blocked_reason text)
returns text language sql immutable as $$
  select case when p_status='access_revoked' and p_blocked_reason='chargeback' then 'chargeback'
    when p_status='access_revoked' then 'refunded'
    when p_status='payment_blocked' and p_blocked_reason='checkout_expired' then 'expired'
    when p_status='payment_blocked' then 'failed'
    when p_entitlement_verified then 'verified'
    when p_status='checkout_pending' then 'pending'
    when p_entitlement_required then 'awaiting' else 'not_required' end;
$$;

create table public.velmere_audit_review_orchestration (
  orchestration_id uuid primary key default gen_random_uuid(),
  case_id text not null unique references public.velmere_audit_intake_cases(case_id) on delete restrict,
  case_ref text not null unique,
  tier text not null check (tier in ('pro','advanced')),
  review_state text not null default 'queued' check (review_state in ('queued','assigned','leased','retry_wait','dead_letter','completed','revoked')),
  reviewer_principal_hash text null,
  assignment_request_hash text null,
  assigned_at timestamptz null,
  sla_due_at timestamptz null,
  worker_principal_hash text null,
  lease_token_hash text null,
  claim_request_hash text null,
  lease_expires_at timestamptz null,
  attempt_count integer not null default 0,
  max_attempts integer not null default 3,
  next_attempt_at timestamptz null,
  dead_letter_reason_code text null,
  completed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint velmere_audit_review_advanced_assignment_shape check (tier <> 'advanced' or reviewer_principal_hash is null or (assigned_at is not null and sla_due_at is not null)),
  constraint velmere_audit_review_pro_lease_shape check ((lease_token_hash is null and worker_principal_hash is null and lease_expires_at is null) or (tier='pro' and lease_token_hash is not null and worker_principal_hash is not null and lease_expires_at is not null))
);

create table public.velmere_audit_report_snapshots (
  snapshot_id uuid primary key default gen_random_uuid(),
  report_id text not null unique,
  case_ref text not null references public.velmere_audit_intake_cases(case_ref) on delete restrict,
  request_id text not null,
  account_id_hash text not null check (account_id_hash ~ '^[a-f0-9]{64}$'),
  entitlement_id text not null,
  tier text not null check (tier in ('pro','advanced')),
  target_hash text not null check (target_hash ~ '^sha256:[a-f0-9]{64}$'),
  report_version_hash text not null check (report_version_hash ~ '^sha256:[a-f0-9]{64}$'),
  snapshot_digest text not null check (snapshot_digest ~ '^sha256:[a-f0-9]{64}$'),
  source_receipt_root text not null check (source_receipt_root ~ '^sha256:[a-f0-9]{64}$'),
  pdf_digest text not null check (pdf_digest ~ '^sha256:[a-f0-9]{64}$'),
  snapshot_json jsonb not null,
  created_at timestamptz not null,
  unique(case_ref,tier)
);
