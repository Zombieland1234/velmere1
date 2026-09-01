alter table public.velmere_audit_pdf_token_consumptions
  add column if not exists state text not null default 'consumed',
  add column if not exists reservation_id text,
  add column if not exists reserved_at timestamptz,
  add column if not exists reservation_expires_at timestamptz,
  add column if not exists failed_at timestamptz,
  add column if not exists failure_code text,
  add column if not exists attempt_count integer not null default 1;

alter table public.velmere_audit_pdf_token_consumptions alter column consumed_at drop not null;
alter table public.velmere_audit_pdf_token_consumptions drop constraint if exists velmere_audit_pdf_token_consumptions_state_check;
alter table public.velmere_audit_pdf_token_consumptions add constraint velmere_audit_pdf_token_consumptions_state_check
  check (state in ('reserved', 'consumed', 'retryable_failed'));
create index if not exists velmere_audit_pdf_token_consumptions_state_idx
  on public.velmere_audit_pdf_token_consumptions (state, reservation_expires_at, token_expires_at);

create or replace function public.velmere_claim_audit_pdf_token(
  p_token_hash text, p_nonce_hash text, p_account_id_hash text, p_entitlement_id_hash text,
  p_report_id text, p_report_version_hash text, p_token_expires_at timestamptz,
  p_reservation_id text, p_reservation_expires_at timestamptz
)
returns table(ok boolean, result text, attempt_count integer)
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_state text; v_attempt integer;
begin
  if p_token_expires_at <= now() then return query select false, 'expired'::text, 0; return; end if;
  begin
    insert into public.velmere_audit_pdf_token_consumptions (
      token_hash, nonce_hash, account_id_hash, entitlement_id_hash, report_id, report_version_hash,
      token_expires_at, state, reservation_id, reserved_at, reservation_expires_at, consumed_at, attempt_count
    ) values (
      p_token_hash, p_nonce_hash, p_account_id_hash, p_entitlement_id_hash, p_report_id, p_report_version_hash,
      p_token_expires_at, 'reserved', p_reservation_id, now(), p_reservation_expires_at, null, 1
    );
    return query select true, 'claimed'::text, 1; return;
  exception when unique_violation then null; end;

  update public.velmere_audit_pdf_token_consumptions
     set state='reserved', reservation_id=p_reservation_id, reserved_at=now(),
         reservation_expires_at=p_reservation_expires_at, failed_at=null, failure_code=null,
         attempt_count=public.velmere_audit_pdf_token_consumptions.attempt_count + 1
   where token_hash=p_token_hash and account_id_hash=p_account_id_hash
     and entitlement_id_hash=p_entitlement_id_hash and report_id=p_report_id
     and report_version_hash=p_report_version_hash and token_expires_at > now()
     and (state='retryable_failed' or (state='reserved' and reservation_expires_at <= now()))
  returning public.velmere_audit_pdf_token_consumptions.attempt_count into v_attempt;
  if found then return query select true, 'reclaimed'::text, v_attempt; return; end if;

  select state, public.velmere_audit_pdf_token_consumptions.attempt_count into v_state, v_attempt
    from public.velmere_audit_pdf_token_consumptions where token_hash=p_token_hash;
  if v_state is null then return query select false, 'replayed_nonce'::text, 0;
  elsif v_state='consumed' then return query select false, 'consumed'::text, coalesce(v_attempt,0);
  elsif v_state='reserved' then return query select false, 'reserved'::text, coalesce(v_attempt,0);
  else return query select false, 'store_rejected'::text, coalesce(v_attempt,0); end if;
end; $$;

create or replace function public.velmere_finalize_audit_pdf_token(
  p_token_hash text, p_reservation_id text, p_consumed_at timestamptz
)
returns table(ok boolean, result text)
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_state text;
begin
  update public.velmere_audit_pdf_token_consumptions
     set state='consumed', consumed_at=p_consumed_at, reservation_id=null,
         reservation_expires_at=null, failure_code=null
   where token_hash=p_token_hash and state='reserved' and reservation_id=p_reservation_id;
  if found then return query select true, 'consumed'::text; return; end if;
  select state into v_state from public.velmere_audit_pdf_token_consumptions where token_hash=p_token_hash;
  if v_state='consumed' then return query select false, 'consumed'::text;
  else return query select false, 'reservation_mismatch'::text; end if;
end; $$;

create or replace function public.velmere_fail_audit_pdf_token_reservation(
  p_token_hash text, p_reservation_id text, p_failure_code text, p_failed_at timestamptz
)
returns table(ok boolean, result text)
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update public.velmere_audit_pdf_token_consumptions
     set state='retryable_failed', failed_at=p_failed_at,
         failure_code=left(coalesce(p_failure_code,'pdf_generation_failed'),96),
         reservation_id=null, reservation_expires_at=null
   where token_hash=p_token_hash and state='reserved' and reservation_id=p_reservation_id;
  if found then return query select true, 'retryable_failed'::text;
  else return query select false, 'reservation_mismatch'::text; end if;
end; $$;

revoke all on function public.velmere_claim_audit_pdf_token(text,text,text,text,text,text,timestamptz,text,timestamptz) from public, anon, authenticated;
revoke all on function public.velmere_finalize_audit_pdf_token(text,text,timestamptz) from public, anon, authenticated;
revoke all on function public.velmere_fail_audit_pdf_token_reservation(text,text,text,timestamptz) from public, anon, authenticated;
grant execute on function public.velmere_claim_audit_pdf_token(text,text,text,text,text,text,timestamptz,text,timestamptz) to service_role;
grant execute on function public.velmere_finalize_audit_pdf_token(text,text,timestamptz) to service_role;
grant execute on function public.velmere_fail_audit_pdf_token_reservation(text,text,text,timestamptz) to service_role;
