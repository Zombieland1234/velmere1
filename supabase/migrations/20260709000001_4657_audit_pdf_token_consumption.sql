create table if not exists public.velmere_audit_pdf_token_consumptions (
  token_hash text primary key,
  nonce_hash text not null unique,
  account_id_hash text not null,
  entitlement_id_hash text not null,
  report_id text not null,
  report_version_hash text not null,
  token_expires_at timestamptz not null,
  consumed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.velmere_audit_pdf_token_consumptions enable row level security;
revoke all on table public.velmere_audit_pdf_token_consumptions from anon, authenticated;
grant select, insert on table public.velmere_audit_pdf_token_consumptions to service_role;
create index if not exists velmere_audit_pdf_token_consumptions_account_idx
  on public.velmere_audit_pdf_token_consumptions (account_id_hash, consumed_at desc);
