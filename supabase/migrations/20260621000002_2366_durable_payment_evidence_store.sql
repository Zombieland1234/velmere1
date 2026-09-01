-- PASS2366 durable payment evidence store.
-- Operator-safe references only: no raw Stripe payloads, no raw Stripe-Signature headers, no card data, no BLIK codes, no secrets.
create table if not exists public.velmere_payment_runtime_evidence (
  id text primary key,
  area text not null default 'release_gate',
  status text not null default 'manual',
  label text not null,
  summary text not null,
  evidence_ref text not null,
  operator_id text not null default 'security-admin',
  scenario_id text,
  audit_queue_id text,
  account_message_id text,
  account_id text,
  stripe_event_id text,
  stripe_session_id text,
  entitlement_id text,
  safe_notes text,
  record jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint velmere_payment_runtime_evidence_area_check check (area in ('checkout','stripe_webhook','idempotency','order_persistence','fulfilment','refund_support','vlm_service','release_gate')),
  constraint velmere_payment_runtime_evidence_status_check check (status in ('pass','fail','manual','blocked'))
);

alter table public.velmere_payment_runtime_evidence enable row level security;
create index if not exists velmere_payment_runtime_evidence_status_idx on public.velmere_payment_runtime_evidence(status, created_at desc);
create index if not exists velmere_payment_runtime_evidence_area_idx on public.velmere_payment_runtime_evidence(area, created_at desc);
create index if not exists velmere_payment_runtime_evidence_scenario_idx on public.velmere_payment_runtime_evidence(scenario_id, created_at desc);
create index if not exists velmere_payment_runtime_evidence_audit_queue_idx on public.velmere_payment_runtime_evidence(audit_queue_id, created_at desc);
create index if not exists velmere_payment_runtime_evidence_account_message_idx on public.velmere_payment_runtime_evidence(account_message_id, created_at desc);
create index if not exists velmere_payment_runtime_evidence_account_idx on public.velmere_payment_runtime_evidence(account_id, created_at desc);

alter table public.velmere_audit_account_messages add column if not exists payment_evidence_refs jsonb not null default '[]'::jsonb;
alter table public.velmere_audit_account_messages add column if not exists audit_queue_id text;
create index if not exists velmere_audit_account_messages_audit_queue_idx on public.velmere_audit_account_messages(audit_queue_id, updated_at desc);
