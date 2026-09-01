-- PASS22: fail-closed owner/operator RLS policies and evidence bindings.
-- Static/source implementation only. Staging multi-user proof remains required.

create extension if not exists pgcrypto;

create table if not exists public.velmere_admin_supabase_subject_bindings (
  supabase_subject uuid primary key,
  actor_id text not null unique references public.velmere_admin_roles(actor_id) on delete restrict,
  request_id text not null unique,
  operator_fingerprint text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.velmere_admin_supabase_subject_bindings enable row level security;
revoke all on table public.velmere_admin_supabase_subject_bindings from public, anon, authenticated;
grant select, insert, update on table public.velmere_admin_supabase_subject_bindings to service_role;

create table if not exists public.velmere_account_resource_bindings (
  resource_type text not null check (resource_type in ('angel_session','order_draft','order','entitlement')),
  resource_id text not null,
  account_id text not null,
  account_id_hash text not null check (account_id_hash ~ '^[a-f0-9]{64}$'),
  request_id text not null unique,
  operator_fingerprint text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (resource_type, resource_id),
  constraint velmere_account_resource_binding_hash_check check (
    account_id_hash = encode(digest(account_id, 'sha256'), 'hex')
  )
);
alter table public.velmere_account_resource_bindings enable row level security;
revoke all on table public.velmere_account_resource_bindings from public, anon, authenticated;
grant select, insert, update on table public.velmere_account_resource_bindings to service_role;

create or replace function public.velmere_current_account_hash()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.velmere_current_account_id() is null then null
    else encode(digest(public.velmere_current_account_id(), 'sha256'), 'hex')
  end;
$$;

create or replace function public.velmere_current_actor_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select actor_id
  from public.velmere_admin_supabase_subject_bindings
  where supabase_subject = auth.uid()
  limit 1;
$$;

create or replace function public.velmere_current_operator_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select r.role
  from public.velmere_admin_roles r
  where r.actor_id = public.velmere_current_actor_id()
    and r.status = 'active'
  limit 1;
$$;

create or replace function public.velmere_has_operator_role(p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.velmere_current_operator_role() = any(p_roles), false);
$$;

create or replace function public.velmere_is_resource_owner(p_resource_type text, p_resource_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.velmere_account_resource_bindings b
    where b.resource_type = p_resource_type
      and b.resource_id = p_resource_id
      and b.account_id = public.velmere_current_account_id()
      and b.account_id_hash = public.velmere_current_account_hash()
  );
$$;

create or replace function public.velmere_bind_admin_subject(
  p_supabase_subject uuid,
  p_actor_id text,
  p_request_id text,
  p_operator_fingerprint text
) returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_request_id !~ '^[A-Za-z0-9][A-Za-z0-9:_-]{7,119}$' then raise exception 'invalid_request_id'; end if;
  if p_operator_fingerprint !~ '^operator_[a-f0-9]{20}$' then raise exception 'invalid_operator'; end if;
  if not exists (select 1 from public.velmere_admin_roles where actor_id=p_actor_id and status='active') then
    raise exception 'actor_not_active';
  end if;
  insert into public.velmere_admin_supabase_subject_bindings(supabase_subject,actor_id,request_id,operator_fingerprint)
  values(p_supabase_subject,p_actor_id,p_request_id,p_operator_fingerprint)
  on conflict(supabase_subject) do update
    set actor_id=excluded.actor_id, request_id=excluded.request_id,
        operator_fingerprint=excluded.operator_fingerprint, updated_at=now();
  return 'bound';
end;
$$;

create or replace function public.velmere_bind_account_resource(
  p_resource_type text,
  p_resource_id text,
  p_account_id text,
  p_request_id text,
  p_operator_fingerprint text
) returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_resource_type not in ('angel_session','order_draft','order','entitlement') then raise exception 'invalid_resource_type'; end if;
  if p_resource_id !~ '^[A-Za-z0-9][A-Za-z0-9:._-]{2,199}$' then raise exception 'invalid_resource_id'; end if;
  if p_account_id !~ '^[A-Za-z0-9][A-Za-z0-9:._-]{5,119}$' then raise exception 'invalid_account_id'; end if;
  if p_request_id !~ '^[A-Za-z0-9][A-Za-z0-9:_-]{7,119}$' then raise exception 'invalid_request_id'; end if;
  if p_operator_fingerprint !~ '^operator_[a-f0-9]{20}$' then raise exception 'invalid_operator'; end if;
  insert into public.velmere_account_resource_bindings(
    resource_type,resource_id,account_id,account_id_hash,request_id,operator_fingerprint
  ) values(
    p_resource_type,p_resource_id,p_account_id,encode(digest(p_account_id,'sha256'),'hex'),p_request_id,p_operator_fingerprint
  )
  on conflict(resource_type,resource_id) do update
    set account_id=excluded.account_id, account_id_hash=excluded.account_id_hash,
        request_id=excluded.request_id, operator_fingerprint=excluded.operator_fingerprint, updated_at=now();
  return 'bound';
end;
$$;

revoke all on function public.velmere_current_account_hash() from public, anon;
grant execute on function public.velmere_current_account_hash() to authenticated, service_role;
revoke all on function public.velmere_current_actor_id() from public, anon;
grant execute on function public.velmere_current_actor_id() to authenticated, service_role;
revoke all on function public.velmere_current_operator_role() from public, anon;
grant execute on function public.velmere_current_operator_role() to authenticated, service_role;
revoke all on function public.velmere_has_operator_role(text[]) from public, anon;
grant execute on function public.velmere_has_operator_role(text[]) to authenticated, service_role;
revoke all on function public.velmere_is_resource_owner(text,text) from public, anon;
grant execute on function public.velmere_is_resource_owner(text,text) to authenticated, service_role;
revoke all on function public.velmere_bind_admin_subject(uuid,text,text,text) from public, anon, authenticated;
grant execute on function public.velmere_bind_admin_subject(uuid,text,text,text) to service_role;
revoke all on function public.velmere_bind_account_resource(text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.velmere_bind_account_resource(text,text,text,text,text) to service_role;

-- Owner-readable bindings and customer resources. All mutations remain server-owned.
drop policy if exists pass22_account_subject_owner_select on public.velmere_account_supabase_subject_bindings;
create policy pass22_account_subject_owner_select on public.velmere_account_supabase_subject_bindings
for select to authenticated using (supabase_subject = auth.uid());
grant select (account_id,supabase_subject,created_at,updated_at) on public.velmere_account_supabase_subject_bindings to authenticated;

drop policy if exists pass22_audit_intake_owner_select on public.velmere_audit_intake_cases;
create policy pass22_audit_intake_owner_select on public.velmere_audit_intake_cases
for select to authenticated using (account_id is not null and account_id = public.velmere_current_account_id());
grant select on public.velmere_audit_intake_cases to authenticated;

drop policy if exists pass22_audit_pdf_consumption_owner_select on public.velmere_audit_pdf_token_consumptions;
create policy pass22_audit_pdf_consumption_owner_select on public.velmere_audit_pdf_token_consumptions
for select to authenticated using (account_id_hash = public.velmere_current_account_hash());
grant select on public.velmere_audit_pdf_token_consumptions to authenticated;

drop policy if exists pass22_audit_report_snapshot_owner_select on public.velmere_audit_report_snapshots;
create policy pass22_audit_report_snapshot_owner_select on public.velmere_audit_report_snapshots
for select to authenticated using (account_id_hash = public.velmere_current_account_hash());
grant select on public.velmere_audit_report_snapshots to authenticated;

drop policy if exists pass22_customer_artifact_snapshot_owner_select on public.velmere_customer_artifact_snapshots;
create policy pass22_customer_artifact_snapshot_owner_select on public.velmere_customer_artifact_snapshots
for select to authenticated using (
  account_id = public.velmere_current_account_id()
  and account_id_hash = public.velmere_current_account_hash()
);
grant select on public.velmere_customer_artifact_snapshots to authenticated;

drop policy if exists pass22_customer_artifact_pdf_owner_select on public.velmere_customer_artifact_pdf_blobs;
create policy pass22_customer_artifact_pdf_owner_select on public.velmere_customer_artifact_pdf_blobs
for select to authenticated using (
  account_id = public.velmere_current_account_id()
  and account_id_hash = public.velmere_current_account_hash()
);
grant select on public.velmere_customer_artifact_pdf_blobs to authenticated;

drop policy if exists pass22_angel_memory_owner_select on public.velmere_angel_memories;
create policy pass22_angel_memory_owner_select on public.velmere_angel_memories
for select to authenticated using (public.velmere_is_resource_owner('angel_session', session_hash));
grant select on public.velmere_angel_memories to authenticated;

drop policy if exists pass22_order_draft_owner_select on public.velmere_order_drafts;
create policy pass22_order_draft_owner_select on public.velmere_order_drafts
for select to authenticated using (public.velmere_is_resource_owner('order_draft', id));
grant select on public.velmere_order_drafts to authenticated;

drop policy if exists pass22_order_owner_select on public.velmere_orders;
create policy pass22_order_owner_select on public.velmere_orders
for select to authenticated using (public.velmere_is_resource_owner('order', id::text));
grant select on public.velmere_orders to authenticated;

drop policy if exists pass22_order_item_owner_select on public.velmere_order_items;
create policy pass22_order_item_owner_select on public.velmere_order_items
for select to authenticated using (public.velmere_is_resource_owner('order', order_id::text));
grant select on public.velmere_order_items to authenticated;

drop policy if exists pass22_order_event_owner_select on public.velmere_order_events;
create policy pass22_order_event_owner_select on public.velmere_order_events
for select to authenticated using (order_id is not null and public.velmere_is_resource_owner('order', order_id::text));
grant select on public.velmere_order_events to authenticated;

drop policy if exists pass22_order_state_event_owner_select on public.velmere_order_state_events;
create policy pass22_order_state_event_owner_select on public.velmere_order_state_events
for select to authenticated using (public.velmere_is_resource_owner('order_draft', order_draft_id));
grant select on public.velmere_order_state_events to authenticated;

drop policy if exists pass22_entitlement_owner_select on public.velmere_vlm_paid_entitlements;
create policy pass22_entitlement_owner_select on public.velmere_vlm_paid_entitlements
for select to authenticated using (public.velmere_is_resource_owner('entitlement', id));
grant select on public.velmere_vlm_paid_entitlements to authenticated;

-- Operator surfaces. Role evaluation is bound to auth.uid() through an audited server-only binding.
drop policy if exists pass22_admin_role_self_or_owner_select on public.velmere_admin_roles;
create policy pass22_admin_role_self_or_owner_select on public.velmere_admin_roles
for select to authenticated using (
  actor_id = public.velmere_current_actor_id()
  or public.velmere_has_operator_role(array['owner'])
);
grant select on public.velmere_admin_roles to authenticated;

drop policy if exists pass22_admin_session_self_or_owner_select on public.velmere_admin_sessions;
create policy pass22_admin_session_self_or_owner_select on public.velmere_admin_sessions
for select to authenticated using (
  actor_id = public.velmere_current_actor_id()
  or public.velmere_has_operator_role(array['owner'])
);
grant select (id,actor_id,actor_email,role,expires_at,revoked_at,created_at) on public.velmere_admin_sessions to authenticated;

drop policy if exists pass22_audit_log_operator_select on public.velmere_audit_logs;
create policy pass22_audit_log_operator_select on public.velmere_audit_logs
for select to authenticated using (public.velmere_has_operator_role(array['owner','operator','support']));
grant select on public.velmere_audit_logs to authenticated;

drop policy if exists pass22_fulfilment_recovery_operator_select on public.velmere_fulfilment_outbox_recovery_actions;
create policy pass22_fulfilment_recovery_operator_select on public.velmere_fulfilment_outbox_recovery_actions
for select to authenticated using (public.velmere_has_operator_role(array['owner','operator']));
grant select on public.velmere_fulfilment_outbox_recovery_actions to authenticated;

drop policy if exists pass22_support_handoff_operator_select on public.velmere_support_handoff_event_ledger;
create policy pass22_support_handoff_operator_select on public.velmere_support_handoff_event_ledger
for select to authenticated using (public.velmere_has_operator_role(array['owner','operator','support']));
grant select on public.velmere_support_handoff_event_ledger to authenticated;

drop policy if exists pass22_human_audit_queue_operator_select on public.velmere_vlm_audit_human_queue;
create policy pass22_human_audit_queue_operator_select on public.velmere_vlm_audit_human_queue
for select to authenticated using (public.velmere_has_operator_role(array['owner','operator']));
grant select on public.velmere_vlm_audit_human_queue to authenticated;

comment on table public.velmere_account_resource_bindings is
'PASS22 service-role-only account-to-resource ownership binding. Authenticated access is mediated by security-definer boolean helpers and fail-closed RLS policies.';
comment on table public.velmere_admin_supabase_subject_bindings is
'PASS22 service-role-only Supabase subject-to-operator binding. No admin access is inferred from email or client-provided role strings.';

-- Redacted PASS22 evidence receipts. Raw agreements and raw staging test payloads stay outside clean source/database rows.
create table if not exists public.velmere_provider_rights_evidence_receipts (
  evidence_id text primary key check (evidence_id ~ '^pre_[a-f0-9]{24}$'),
  provider_id text not null,
  document_kind text not null,
  document_sha256 text not null check (document_sha256 ~ '^[a-f0-9]{64}$'),
  review_decision text not null check (review_decision in ('APPROVED','REJECTED','NEEDS_CLARIFICATION')),
  rights jsonb not null,
  effective_at timestamptz not null,
  expires_at timestamptz,
  reviewer_id_hash text not null check (reviewer_id_hash ~ '^[a-f0-9]{64}$'),
  receipt_sha256 text not null check (receipt_sha256 ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  constraint velmere_provider_rights_receipt_no_raw_document check (
    not (rights ? 'rawDocument') and not (rights ? 'rawTerms') and not (rights ? 'contractText')
  )
);
alter table public.velmere_provider_rights_evidence_receipts enable row level security;
revoke all on table public.velmere_provider_rights_evidence_receipts from public, anon, authenticated;
grant select, insert, update on table public.velmere_provider_rights_evidence_receipts to service_role;

create table if not exists public.velmere_rls_staging_replay_receipts (
  replay_id text primary key,
  source_sha256 text not null check (source_sha256 ~ '^[a-f0-9]{64}$'),
  migration_sha256 text not null check (migration_sha256 ~ '^[a-f0-9]{64}$'),
  tenant_a_hash text not null check (tenant_a_hash ~ '^[a-f0-9]{64}$'),
  tenant_b_hash text not null check (tenant_b_hash ~ '^[a-f0-9]{64}$'),
  operator_subject_hash text not null check (operator_subject_hash ~ '^[a-f0-9]{64}$'),
  owner_policy_cases integer not null check (owner_policy_cases >= 0),
  operator_policy_cases integer not null check (operator_policy_cases >= 0),
  denied_cross_tenant_cases integer not null check (denied_cross_tenant_cases >= 0),
  passed boolean not null,
  result_sha256 text not null check (result_sha256 ~ '^[a-f0-9]{64}$'),
  executed_at timestamptz not null,
  created_at timestamptz not null default now()
);
alter table public.velmere_rls_staging_replay_receipts enable row level security;
revoke all on table public.velmere_rls_staging_replay_receipts from public, anon, authenticated;
grant select, insert on table public.velmere_rls_staging_replay_receipts to service_role;
