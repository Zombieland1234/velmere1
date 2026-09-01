-- PASS4803: durable paid-audit release orchestration.
-- Atomically binds Advanced release state to the paid entitlement and revokes
-- active delivery tokens/releases on refund or chargeback. Service-role only.
-- Raw operator tokens, raw Stripe payloads, reviewer notes and customer PII are never stored.

create table if not exists public.velmere_advanced_audit_releases (
  release_id text primary key,
  case_ref text not null,
  entitlement_id text not null references public.velmere_vlm_paid_entitlements(id) on delete restrict,
  entitlement_ref_hash text not null check (entitlement_ref_hash ~ '^[a-f0-9]{64}$'),
  payload_hash text not null check (payload_hash ~ '^[a-f0-9]{64}$'),
  envelope_digest text not null check (envelope_digest ~ '^[a-f0-9]{64}$'),
  release_state text not null check (release_state in ('pending','blocked','ready','expired','revoked')),
  review_operator_hash text check (review_operator_hash is null or review_operator_hash ~ '^[a-f0-9]{64}$'),
  approval_operator_hash text check (approval_operator_hash is null or approval_operator_hash ~ '^[a-f0-9]{64}$'),
  approval_receipt_hash text check (approval_receipt_hash is null or approval_receipt_hash ~ '^[a-f0-9]{64}$'),
  issued_at timestamptz not null,
  approved_at timestamptz,
  revoked_at timestamptz,
  expires_at timestamptz not null,
  state_version bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(case_ref, entitlement_id, payload_hash)
);

create index if not exists velmere_advanced_audit_releases_entitlement_idx
  on public.velmere_advanced_audit_releases(entitlement_id, updated_at desc);
create index if not exists velmere_advanced_audit_releases_case_idx
  on public.velmere_advanced_audit_releases(case_ref, updated_at desc);
create index if not exists velmere_advanced_audit_releases_state_idx
  on public.velmere_advanced_audit_releases(release_state, expires_at);

create table if not exists public.velmere_paid_audit_access_events (
  event_id uuid primary key default gen_random_uuid(),
  event_hash text not null unique check (event_hash ~ '^[a-f0-9]{64}$'),
  event_type text not null check (event_type in ('release_issued','release_approved','release_revoked','refund','chargeback')),
  release_id text,
  case_ref text not null,
  entitlement_id text,
  previous_state text,
  next_state text not null,
  artifact_tokens_revoked integer not null default 0,
  release_records_revoked integer not null default 0,
  event_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists velmere_paid_audit_access_events_case_idx
  on public.velmere_paid_audit_access_events(case_ref, created_at desc);
create index if not exists velmere_paid_audit_access_events_entitlement_idx
  on public.velmere_paid_audit_access_events(entitlement_id, created_at desc)
  where entitlement_id is not null;

alter table public.velmere_advanced_audit_releases enable row level security;
alter table public.velmere_paid_audit_access_events enable row level security;
revoke all on table public.velmere_advanced_audit_releases from public, anon, authenticated;
revoke all on table public.velmere_paid_audit_access_events from public, anon, authenticated;
grant select, insert, update on table public.velmere_advanced_audit_releases to service_role;
grant select, insert on table public.velmere_paid_audit_access_events to service_role;

create or replace function public.velmere_record_advanced_audit_release_transition(
  p_transition text,
  p_release_id text,
  p_case_ref text,
  p_entitlement_id text,
  p_entitlement_ref_hash text,
  p_payload_hash text,
  p_envelope_digest text,
  p_release_state text,
  p_event_hash text,
  p_review_operator_hash text default null,
  p_approval_operator_hash text default null,
  p_approval_receipt_hash text default null,
  p_issued_at timestamptz default now(),
  p_expires_at timestamptz default now() + interval '1 day',
  p_transition_at timestamptz default now()
)
returns table(
  ok boolean,
  error text,
  retryable boolean,
  idempotent boolean,
  release_id text,
  release_state text,
  state_version bigint,
  event_hash text,
  envelope_digest text,
  entitlement_ref_hash text,
  release_records_revoked integer,
  artifact_tokens_revoked integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.velmere_advanced_audit_releases%rowtype;
  v_entitlement public.velmere_vlm_paid_entitlements%rowtype;
  v_case public.velmere_audit_intake_cases%rowtype;
  v_event public.velmere_paid_audit_access_events%rowtype;
  v_entitlement_id text;
  v_previous_state text;
  v_next_state text;
  v_version bigint;
  v_release_exists boolean := false;
  v_entitlement_exists boolean := false;
  v_case_exists boolean := false;
  v_now timestamptz := coalesce(p_transition_at, now());
begin
  if p_transition not in ('issued','approved','revoked')
     or coalesce(trim(p_release_id),'') = ''
     or coalesce(trim(p_case_ref),'') = ''
     or p_entitlement_ref_hash !~ '^[a-f0-9]{64}$'
     or p_payload_hash !~ '^[a-f0-9]{64}$'
     or p_envelope_digest !~ '^[a-f0-9]{64}$'
     or p_event_hash !~ '^[a-f0-9]{64}$'
     or p_release_state not in ('pending','blocked','ready','expired','revoked') then
    return query select false, 'advanced_release_transition_invalid', false, false,
      p_release_id, p_release_state, 0::bigint, p_event_hash, p_envelope_digest,
      p_entitlement_ref_hash, 0, 0;
    return;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('advanced-release:' || p_release_id, 4803));

  select * into v_event from public.velmere_paid_audit_access_events where event_hash = p_event_hash;
  if found then
    select * into v_existing from public.velmere_advanced_audit_releases where release_id = p_release_id;
    return query select true, null::text, false, true,
      p_release_id, coalesce(v_existing.release_state, v_event.next_state),
      coalesce(v_existing.state_version, 1), p_event_hash,
      coalesce(v_existing.envelope_digest, p_envelope_digest),
      coalesce(v_existing.entitlement_ref_hash, p_entitlement_ref_hash), 0, 0;
    return;
  end if;

  select * into v_existing
  from public.velmere_advanced_audit_releases
  where release_id = p_release_id
  for update;
  v_release_exists := found;

  if p_transition = 'issued' then
    if coalesce(trim(p_entitlement_id),'') = '' then
      return query select false, 'advanced_release_entitlement_required', false, false,
        p_release_id, p_release_state, 0::bigint, p_event_hash, p_envelope_digest,
        p_entitlement_ref_hash, 0, 0;
      return;
    end if;
    select * into v_entitlement
    from public.velmere_vlm_paid_entitlements
    where id = p_entitlement_id
    for update;
    if not found then
      return query select false, 'advanced_release_entitlement_not_found', false, false,
        p_release_id, p_release_state, 0::bigint, p_event_hash, p_envelope_digest,
        p_entitlement_ref_hash, 0, 0;
      return;
    end if;
    if encode(digest(v_entitlement.id, 'sha256'), 'hex') <> p_entitlement_ref_hash then
      return query select false, 'advanced_release_entitlement_hash_mismatch', false, false,
        p_release_id, p_release_state, 0::bigint, p_event_hash, p_envelope_digest,
        p_entitlement_ref_hash, 0, 0;
      return;
    end if;
    select * into v_case
    from public.velmere_audit_intake_cases
    where case_ref = p_case_ref
    for update;
    if not found or v_case.entitlement_id <> v_entitlement.id
       or v_case.checkout_product_id <> 'vlm_advanced_audit_human_review'
       or v_case.entitlement_verified is not true then
      return query select false, 'advanced_release_case_entitlement_binding_invalid', false, false,
        p_release_id, p_release_state, 0::bigint, p_event_hash, p_envelope_digest,
        p_entitlement_ref_hash, 0, 0;
      return;
    end if;
    if v_release_exists then
      if v_existing.case_ref <> p_case_ref
         or v_existing.entitlement_id <> p_entitlement_id
         or v_existing.entitlement_ref_hash <> p_entitlement_ref_hash
         or v_existing.payload_hash <> p_payload_hash then
        return query select false, 'advanced_release_identity_mismatch', false, false,
          p_release_id, v_existing.release_state, v_existing.state_version,
          p_event_hash, v_existing.envelope_digest, v_existing.entitlement_ref_hash, 0, 0;
        return;
      end if;
      if v_existing.release_state = 'revoked' and p_release_state <> 'revoked' then
        return query select false, 'advanced_release_revoked_terminal', false, false,
          p_release_id, v_existing.release_state, v_existing.state_version,
          p_event_hash, v_existing.envelope_digest, v_existing.entitlement_ref_hash, 0, 0;
        return;
      end if;
      v_previous_state := v_existing.release_state;
      v_version := v_existing.state_version + 1;
      update public.velmere_advanced_audit_releases set
        release_state = p_release_state,
        envelope_digest = p_envelope_digest,
        review_operator_hash = case when p_review_operator_hash ~ '^[a-f0-9]{64}$' then p_review_operator_hash else review_operator_hash end,
        issued_at = coalesce(p_issued_at, issued_at),
        expires_at = coalesce(p_expires_at, expires_at),
        state_version = v_version,
        updated_at = v_now
      where release_id = p_release_id;
    else
      v_previous_state := null;
      v_version := 1;
      insert into public.velmere_advanced_audit_releases(
        release_id, case_ref, entitlement_id, entitlement_ref_hash, payload_hash,
        envelope_digest, release_state, review_operator_hash, issued_at, expires_at,
        state_version, created_at, updated_at
      ) values (
        p_release_id, p_case_ref, p_entitlement_id, p_entitlement_ref_hash, p_payload_hash,
        p_envelope_digest, p_release_state,
        case when p_review_operator_hash ~ '^[a-f0-9]{64}$' then p_review_operator_hash else null end,
        coalesce(p_issued_at, v_now), coalesce(p_expires_at, v_now + interval '1 day'),
        v_version, v_now, v_now
      );
    end if;
    v_entitlement_id := p_entitlement_id;
    v_next_state := p_release_state;
  else
    if not found then
      return query select false, 'advanced_release_not_found', false, false,
        p_release_id, p_release_state, 0::bigint, p_event_hash, p_envelope_digest,
        p_entitlement_ref_hash, 0, 0;
      return;
    end if;
    if v_existing.case_ref <> p_case_ref
       or v_existing.entitlement_ref_hash <> p_entitlement_ref_hash
       or v_existing.payload_hash <> p_payload_hash then
      return query select false, 'advanced_release_identity_mismatch', false, false,
        p_release_id, v_existing.release_state, v_existing.state_version,
        p_event_hash, v_existing.envelope_digest, v_existing.entitlement_ref_hash, 0, 0;
      return;
    end if;
    if v_existing.release_state = 'revoked' and p_transition <> 'revoked' then
      return query select false, 'advanced_release_revoked_terminal', false, false,
        p_release_id, v_existing.release_state, v_existing.state_version,
        p_event_hash, v_existing.envelope_digest, v_existing.entitlement_ref_hash, 0, 0;
      return;
    end if;
    v_entitlement_id := v_existing.entitlement_id;
    v_previous_state := v_existing.release_state;
    v_version := v_existing.state_version + 1;
    if p_transition = 'approved' then
      select * into v_entitlement from public.velmere_vlm_paid_entitlements where id = v_entitlement_id for update;
      v_entitlement_exists := found;
      select * into v_case from public.velmere_audit_intake_cases where case_ref = p_case_ref for update;
      v_case_exists := found;
      if not v_entitlement_exists
         or not v_case_exists
         or p_release_state <> 'ready'
         or v_entitlement.status not in ('paid','active')
         or v_entitlement.expires_at <= v_now
         or v_case.entitlement_verified is not true
         or v_case.status <> 'queued_paid_review'
         or p_review_operator_hash !~ '^[a-f0-9]{64}$'
         or p_approval_operator_hash !~ '^[a-f0-9]{64}$'
         or p_approval_receipt_hash !~ '^[a-f0-9]{64}$'
         or p_review_operator_hash = p_approval_operator_hash then
        return query select false, 'advanced_release_approval_policy_failed', false, false,
          p_release_id, v_existing.release_state, v_existing.state_version,
          p_event_hash, v_existing.envelope_digest, v_existing.entitlement_ref_hash, 0, 0;
        return;
      end if;
      update public.velmere_advanced_audit_releases set
        release_state = 'ready', envelope_digest = p_envelope_digest,
        review_operator_hash = p_review_operator_hash,
        approval_operator_hash = p_approval_operator_hash,
        approval_receipt_hash = p_approval_receipt_hash,
        approved_at = v_now, state_version = v_version, updated_at = v_now
      where release_id = p_release_id;
      v_next_state := 'ready';
    else
      if p_release_state <> 'revoked' then
        return query select false, 'advanced_release_revoke_state_invalid', false, false,
          p_release_id, v_existing.release_state, v_existing.state_version,
          p_event_hash, v_existing.envelope_digest, v_existing.entitlement_ref_hash, 0, 0;
        return;
      end if;
      update public.velmere_advanced_audit_releases set
        release_state = 'revoked', envelope_digest = p_envelope_digest,
        revoked_at = v_now, state_version = v_version, updated_at = v_now
      where release_id = p_release_id;
      update public.velmere_audit_report_access_tokens set
        state = 'revoked', revoked_at = coalesce(revoked_at, v_now),
        safe_reason = coalesce(safe_reason, 'advanced_release_revoked'), updated_at = v_now
      where entitlement_id = v_entitlement_id and state = 'issued';
      v_next_state := 'revoked';
    end if;
  end if;

  insert into public.velmere_paid_audit_access_events(
    event_hash, event_type, release_id, case_ref, entitlement_id,
    previous_state, next_state, event_at
  ) values (
    p_event_hash,
    case when p_transition = 'issued' then 'release_issued' when p_transition = 'approved' then 'release_approved' else 'release_revoked' end,
    p_release_id, p_case_ref, v_entitlement_id,
    v_previous_state, v_next_state, v_now
  );

  return query select true, null::text, false, false,
    p_release_id, v_next_state, v_version, p_event_hash, p_envelope_digest,
    p_entitlement_ref_hash, case when p_transition = 'revoked' then 1 else 0 end,
    case when p_transition = 'revoked' then (
      select count(*)::integer from public.velmere_audit_report_access_tokens
      where entitlement_id = v_entitlement_id and state = 'revoked' and revoked_at = v_now
    ) else 0 end;
exception
  when unique_violation then
    select * into v_existing from public.velmere_advanced_audit_releases where release_id = p_release_id;
    return query select true, null::text, false, true,
      p_release_id, coalesce(v_existing.release_state, p_release_state),
      coalesce(v_existing.state_version, 1), p_event_hash,
      coalesce(v_existing.envelope_digest, p_envelope_digest),
      coalesce(v_existing.entitlement_ref_hash, p_entitlement_ref_hash), 0, 0;
  when others then
    return query select false, 'advanced_release_store_failed', true, false,
      p_release_id, p_release_state, 0::bigint, p_event_hash, p_envelope_digest,
      p_entitlement_ref_hash, 0, 0;
end;
$$;

create or replace function public.velmere_apply_paid_audit_terminal_transition(
  p_case_ref text,
  p_product_id text,
  p_context_hash text,
  p_event_hash text,
  p_event_type text,
  p_event_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case public.velmere_audit_intake_cases%rowtype;
  v_entitlement public.velmere_vlm_paid_entitlements%rowtype;
  v_existing public.velmere_paid_audit_access_events%rowtype;
  v_now timestamptz := coalesce(p_event_at, now());
  v_next_entitlement text;
  v_token_count integer := 0;
  v_release_count integer := 0;
begin
  if p_event_type not in ('refund','chargeback')
     or p_product_id not in ('vlm_pro_audit_review','vlm_advanced_audit_human_review')
     or p_context_hash !~ '^[a-f0-9]{64}$'
     or p_event_hash !~ '^[a-f0-9]{64}$' then
    return jsonb_build_object('ok', false, 'error', 'paid_audit_terminal_request_invalid');
  end if;

  perform pg_advisory_xact_lock(hashtextextended('paid-audit-terminal:' || p_case_ref, 4803));
  select * into v_existing from public.velmere_paid_audit_access_events where event_hash = p_event_hash;
  if found then
    return jsonb_build_object(
      'ok', true, 'idempotent', true, 'eventHash', p_event_hash,
      'status', v_existing.next_state,
      'artifactTokensRevoked', v_existing.artifact_tokens_revoked,
      'releaseRecordsRevoked', v_existing.release_records_revoked
    );
  end if;

  select * into v_case from public.velmere_audit_intake_cases where case_ref = p_case_ref for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'case_not_found'); end if;
  if v_case.checkout_product_id <> p_product_id
     or v_case.checkout_context_hash <> p_context_hash
     or v_case.entitlement_id is null then
    return jsonb_build_object('ok', false, 'error', 'payment_event_binding_mismatch');
  end if;

  select * into v_entitlement
  from public.velmere_vlm_paid_entitlements
  where id = v_case.entitlement_id
    and product_id = p_product_id
    and context_hash = p_context_hash
  for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'entitlement_not_found'); end if;

  v_next_entitlement := case when p_event_type = 'chargeback' then 'revoked' else 'refunded' end;
  if v_entitlement.status not in ('refunded','revoked') then
    update public.velmere_vlm_paid_entitlements set
      status = v_next_entitlement,
      payment_status = p_event_type,
      updated_at = greatest(v_now, updated_at)
    where id = v_entitlement.id;
  elsif v_entitlement.status = 'revoked' then
    v_next_entitlement := 'revoked';
  end if;

  update public.velmere_audit_intake_cases set
    status = 'access_revoked', entitlement_verified = false, analysis_started = false,
    blocked_reason = p_event_type,
    blocked_event_hash = 'sha256:' || p_event_hash,
    blocked_at = coalesce(blocked_at, v_now), updated_at = greatest(v_now, updated_at)
  where case_id = v_case.case_id;

  update public.velmere_audit_report_access_tokens set
    state = 'revoked', revoked_at = coalesce(revoked_at, v_now),
    safe_reason = coalesce(safe_reason, p_event_type), updated_at = v_now
  where entitlement_id = v_entitlement.id and state = 'issued';
  get diagnostics v_token_count = row_count;

  update public.velmere_advanced_audit_releases set
    release_state = 'revoked', revoked_at = coalesce(revoked_at, v_now),
    state_version = state_version + 1, updated_at = v_now
  where entitlement_id = v_entitlement.id and release_state <> 'revoked';
  get diagnostics v_release_count = row_count;

  insert into public.velmere_paid_audit_access_events(
    event_hash, event_type, case_ref, entitlement_id,
    previous_state, next_state, artifact_tokens_revoked,
    release_records_revoked, event_at
  ) values (
    p_event_hash, p_event_type, v_case.case_ref, v_entitlement.id,
    v_entitlement.status, 'access_revoked', v_token_count, v_release_count, v_now
  );

  return jsonb_build_object(
    'ok', true, 'idempotent', false, 'eventHash', p_event_hash,
    'caseRef', v_case.case_ref, 'status', 'access_revoked',
    'entitlementStatus', v_next_entitlement,
    'entitlementRevoked', true,
    'artifactTokensRevoked', v_token_count,
    'releaseRecordsRevoked', v_release_count,
    'analysisStarted', false
  );
exception
  when unique_violation then
    return jsonb_build_object('ok', true, 'idempotent', true, 'eventHash', p_event_hash, 'status', 'access_revoked');
  when others then
    return jsonb_build_object('ok', false, 'error', 'paid_audit_terminal_store_failed', 'retryable', true);
end;
$$;

revoke all on function public.velmere_record_advanced_audit_release_transition(text,text,text,text,text,text,text,text,text,text,text,text,timestamptz,timestamptz,timestamptz)
  from public, anon, authenticated;
revoke all on function public.velmere_apply_paid_audit_terminal_transition(text,text,text,text,text,timestamptz)
  from public, anon, authenticated;
grant execute on function public.velmere_record_advanced_audit_release_transition(text,text,text,text,text,text,text,text,text,text,text,text,timestamptz,timestamptz,timestamptz)
  to service_role;
grant execute on function public.velmere_apply_paid_audit_terminal_transition(text,text,text,text,text,timestamptz)
  to service_role;

comment on table public.velmere_advanced_audit_releases is
  'PASS4803 server-only Advanced release state. Stores hashes/pseudonyms only; no raw operator tokens, notes or customer PII.';
comment on function public.velmere_record_advanced_audit_release_transition(text,text,text,text,text,text,text,text,text,text,text,text,timestamptz,timestamptz,timestamptz) is
  'PASS4803 idempotent issue/approve/revoke transition bound to one case, entitlement and payload.';
comment on function public.velmere_apply_paid_audit_terminal_transition(text,text,text,text,text,timestamptz) is
  'PASS4803 atomic refund/chargeback revocation across entitlement, audit case, active report tokens and Advanced releases.';
