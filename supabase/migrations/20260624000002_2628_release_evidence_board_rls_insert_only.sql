-- PASS2628: Release Evidence Board RLS insert-only policy gate.
-- Customer board stores redacted launch proof only. Do not add raw webhook payloads,
-- raw download tokens, raw artifact payloads, operator notes, service-role keys,
-- seed phrases, private wallet material, exploit steps, card data or investment claims.

create table if not exists public.velmere_audit_release_evidence_boards (
  id text primary key,
  report_id text not null,
  account_id text not null,
  entitlement_id text,
  preview_run_id text not null,
  release_board_version text not null,
  release_board_hash text not null unique,
  customer_status text not null default 'pending',
  storage_readiness integer not null default 0,
  launch_blocking_count integer not null default 0,
  pdf_blocking_count integer not null default 0,
  advanced_blocking_count integer not null default 0,
  artifact_pointer_manifest jsonb not null default '[]'::jsonb,
  next_safe_action text not null default 'Attach runtime replay artifacts before launch.',
  created_by_operator_id text,
  created_at timestamptz not null default now(),
  supersedes_board_id text,
  metadata jsonb not null default '{}'::jsonb,
  constraint velmere_audit_release_evidence_boards_status_check check (customer_status in ('ready','pending','blocked','operator_review')),
  constraint velmere_audit_release_evidence_boards_readiness_check check (storage_readiness >= 0 and storage_readiness <= 100)
);

create table if not exists public.velmere_audit_release_evidence_private_refs (
  id text primary key,
  release_board_id text not null references public.velmere_audit_release_evidence_boards(id) on delete restrict,
  private_artifact_ref text not null,
  operator_evidence_ref text,
  reviewer_signoff_ref text,
  dead_letter_ticket_ref text,
  created_by_operator_id text not null,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

alter table public.velmere_audit_release_evidence_boards enable row level security;
alter table public.velmere_audit_release_evidence_private_refs enable row level security;

create index if not exists velmere_audit_release_evidence_boards_account_idx on public.velmere_audit_release_evidence_boards(account_id, created_at desc);
create index if not exists velmere_audit_release_evidence_boards_report_idx on public.velmere_audit_release_evidence_boards(report_id, created_at desc);
create index if not exists velmere_audit_release_evidence_boards_status_idx on public.velmere_audit_release_evidence_boards(customer_status, created_at desc);
create index if not exists velmere_audit_release_evidence_private_refs_board_idx on public.velmere_audit_release_evidence_private_refs(release_board_id, created_at desc);

-- Owner may read only the redacted release board row. The table intentionally has no raw payload columns.
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'velmere_audit_release_evidence_boards' and policyname = 'velmere_audit_release_evidence_boards_owner_select') then
    create policy velmere_audit_release_evidence_boards_owner_select
      on public.velmere_audit_release_evidence_boards
      for select
      using (account_id = coalesce(auth.jwt() ->> 'velmere_account_id', auth.uid()::text));
  end if;
end $$;

-- Server-side writes only. Release evidence boards are append-only receipts.
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'velmere_audit_release_evidence_boards' and policyname = 'velmere_audit_release_evidence_boards_service_role_insert') then
    create policy velmere_audit_release_evidence_boards_service_role_insert
      on public.velmere_audit_release_evidence_boards
      for insert
      with check (auth.role() = 'service_role');
  end if;
end $$;

-- Admin/operator can inspect redacted board metadata, but private refs stay in the private table.
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'velmere_audit_release_evidence_boards' and policyname = 'velmere_audit_release_evidence_boards_operator_select') then
    create policy velmere_audit_release_evidence_boards_operator_select
      on public.velmere_audit_release_evidence_boards
      for select
      using (auth.role() = 'service_role' or coalesce(auth.jwt() ->> 'velmere_security_scope', '') like '%security:console%');
  end if;
end $$;

-- No mutation path. Corrections create a new version/hash row with supersedes_board_id.
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'velmere_audit_release_evidence_boards' and policyname = 'velmere_audit_release_evidence_boards_update_deny') then
    create policy velmere_audit_release_evidence_boards_update_deny
      on public.velmere_audit_release_evidence_boards
      for update
      using (false)
      with check (false);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'velmere_audit_release_evidence_boards' and policyname = 'velmere_audit_release_evidence_boards_delete_deny') then
    create policy velmere_audit_release_evidence_boards_delete_deny
      on public.velmere_audit_release_evidence_boards
      for delete
      using (false);
  end if;
end $$;

-- Private refs are never customer-readable.
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'velmere_audit_release_evidence_private_refs' and policyname = 'velmere_audit_release_evidence_private_refs_operator_select') then
    create policy velmere_audit_release_evidence_private_refs_operator_select
      on public.velmere_audit_release_evidence_private_refs
      for select
      using (auth.role() = 'service_role' or coalesce(auth.jwt() ->> 'velmere_security_scope', '') like '%security:console%');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'velmere_audit_release_evidence_private_refs' and policyname = 'velmere_audit_release_evidence_private_refs_service_role_insert') then
    create policy velmere_audit_release_evidence_private_refs_service_role_insert
      on public.velmere_audit_release_evidence_private_refs
      for insert
      with check (auth.role() = 'service_role');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'velmere_audit_release_evidence_private_refs' and policyname = 'velmere_audit_release_evidence_private_refs_update_deny') then
    create policy velmere_audit_release_evidence_private_refs_update_deny
      on public.velmere_audit_release_evidence_private_refs
      for update
      using (false)
      with check (false);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'velmere_audit_release_evidence_private_refs' and policyname = 'velmere_audit_release_evidence_private_refs_delete_deny') then
    create policy velmere_audit_release_evidence_private_refs_delete_deny
      on public.velmere_audit_release_evidence_private_refs
      for delete
      using (false);
  end if;
end $$;
