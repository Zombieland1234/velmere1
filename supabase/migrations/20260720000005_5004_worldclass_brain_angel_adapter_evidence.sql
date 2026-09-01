-- PASS19: service-role-only redacted Brain/Angel evidence receipts.
create table if not exists public.worldclass_brain_angel_adapter_receipts (
  id uuid primary key default gen_random_uuid(),
  surface text not null check (surface in ('vlm_brain','angel')),
  case_id text not null,
  matrix_id text not null,
  tier text not null check (tier in ('basic','pro','advanced')),
  locale text not null check (locale in ('pl','en','de')),
  implementation_sha256 text not null check (implementation_sha256 ~ '^[0-9a-f]{64}$'),
  corpus_sha256 text not null check (corpus_sha256 ~ '^[0-9a-f]{64}$'),
  evidence_receipt_sha256 text not null check (evidence_receipt_sha256 ~ '^[0-9a-f]{64}$'),
  output_receipt_sha256 text not null check (output_receipt_sha256 ~ '^[0-9a-f]{64}$'),
  status text not null check (status in ('passed','blocked','failed')),
  blocker_codes text[] not null default '{}',
  model_id_hash text null check (model_id_hash is null or model_id_hash ~ '^[0-9a-f]{64}$'),
  raw_prompt text null check (raw_prompt is null),
  raw_answer text null check (raw_answer is null),
  raw_tool_payload jsonb null check (raw_tool_payload is null),
  raw_provider_payload jsonb null check (raw_provider_payload is null),
  sensitive_user_data jsonb null check (sensitive_user_data is null),
  created_at timestamptz not null default now(),
  unique (matrix_id, implementation_sha256)
);
alter table public.worldclass_brain_angel_adapter_receipts enable row level security;
alter table public.worldclass_brain_angel_adapter_receipts force row level security;
revoke all on table public.worldclass_brain_angel_adapter_receipts from public, anon, authenticated;
grant select, insert, update, delete on table public.worldclass_brain_angel_adapter_receipts to service_role;
comment on table public.worldclass_brain_angel_adapter_receipts is 'PASS19 redacted deterministic receipts only. Raw prompts, answers, tool/provider payloads and sensitive user data are forbidden.';
