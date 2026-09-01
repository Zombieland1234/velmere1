-- PASS4611 — private, durable audit intake case vault.
-- Raw targets are server-only. Public responses expose only case_ref, display_label and target_hash.

create table if not exists public.velmere_audit_intake_cases (
  case_id text primary key,
  case_ref text not null unique,
  request_id text not null unique,
  target_kind text not null check (target_kind in ('contract', 'github', 'url')),
  target_private text not null,
  target_hash text not null,
  display_label text not null,
  tier text not null check (tier in ('basic', 'pro', 'advanced')),
  locale text not null default 'en' check (locale in ('pl', 'en', 'de')),
  status text not null check (status in ('queued_basic_prescreen', 'awaiting_entitlement')),
  account_id text null,
  account_email text null,
  entitlement_required boolean not null default false,
  entitlement_verified boolean not null default false,
  analysis_started boolean not null default false,
  intake_receipt jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint velmere_audit_intake_paid_account_required check (
    tier = 'basic' or account_id is not null
  ),
  constraint velmere_audit_intake_no_unverified_start check (
    analysis_started = false or entitlement_required = false or entitlement_verified = true
  )
);

create index if not exists velmere_audit_intake_target_hash_idx
  on public.velmere_audit_intake_cases (target_hash, created_at desc);
create index if not exists velmere_audit_intake_account_idx
  on public.velmere_audit_intake_cases (account_id, created_at desc)
  where account_id is not null;
create index if not exists velmere_audit_intake_status_idx
  on public.velmere_audit_intake_cases (status, created_at asc);

alter table public.velmere_audit_intake_cases enable row level security;
revoke all on table public.velmere_audit_intake_cases from anon, authenticated;
grant all on table public.velmere_audit_intake_cases to service_role;

comment on table public.velmere_audit_intake_cases is
  'PASS4611 private audit intake vault. Access is service-role only; raw targets must never be returned by public routes.';
comment on column public.velmere_audit_intake_cases.target_private is
  'Canonical private target used by server-side scanners. Never expose through public API responses.';
