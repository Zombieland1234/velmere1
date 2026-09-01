begin;

alter table public.velmere_audit_account_messages
  add column if not exists canonical_customer_snapshot jsonb,
  add column if not exists canonical_customer_snapshot_digest text;

update public.velmere_audit_account_messages
set canonical_customer_snapshot_digest = canonical_customer_snapshot->>'snapshotDigest'
where canonical_customer_snapshot is not null
  and canonical_customer_snapshot_digest is null
  and canonical_customer_snapshot->>'snapshotDigest' ~ '^sha256:[a-f0-9]{64}$';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'velmere_audit_account_messages_snapshot_pair_check'
      and conrelid = 'public.velmere_audit_account_messages'::regclass
  ) then
    alter table public.velmere_audit_account_messages
      add constraint velmere_audit_account_messages_snapshot_pair_check
      check (
        (canonical_customer_snapshot is null and canonical_customer_snapshot_digest is null)
        or (
          canonical_customer_snapshot is not null
          and canonical_customer_snapshot_digest ~ '^sha256:[a-f0-9]{64}$'
          and canonical_customer_snapshot->>'snapshotDigest' = canonical_customer_snapshot_digest
          and canonical_customer_snapshot->>'schemaVersion' = 'pass4821-audit-account-customer-snapshot-v1'
        )
      );
  end if;
end $$;

create index if not exists velmere_audit_account_messages_snapshot_digest_idx
  on public.velmere_audit_account_messages(canonical_customer_snapshot_digest)
  where canonical_customer_snapshot_digest is not null;

create or replace function public.velmere_enforce_audit_customer_snapshot_immutability()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.account_id is distinct from old.account_id then
    raise exception 'audit_account_message_owner_immutable_conflict' using errcode = '23514';
  end if;

  if tg_op = 'UPDATE' and old.canonical_customer_snapshot is not null then
    if new.canonical_customer_snapshot is distinct from old.canonical_customer_snapshot
       or new.canonical_customer_snapshot_digest is distinct from old.canonical_customer_snapshot_digest then
      raise exception 'audit_customer_snapshot_immutable_conflict' using errcode = '23514';
    end if;
  end if;

  if new.canonical_customer_snapshot is not null then
    if new.canonical_customer_snapshot_digest is null
       or new.canonical_customer_snapshot->>'snapshotDigest' is distinct from new.canonical_customer_snapshot_digest
       or new.canonical_customer_snapshot->>'schemaVersion' <> 'pass4821-audit-account-customer-snapshot-v1' then
      raise exception 'audit_customer_snapshot_integrity_failed' using errcode = '23514';
    end if;
  end if;

  if (new.operator_status in ('customer_safe_ready', 'delivered')
      or new.delivery_status = 'ready_for_download'
      or new.message_status = 'ready')
     and new.canonical_customer_snapshot is null then
    raise exception 'canonical_customer_snapshot_required_before_ready' using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists velmere_audit_customer_snapshot_immutability on public.velmere_audit_account_messages;
create trigger velmere_audit_customer_snapshot_immutability
before insert or update on public.velmere_audit_account_messages
for each row execute function public.velmere_enforce_audit_customer_snapshot_immutability();

revoke all on function public.velmere_enforce_audit_customer_snapshot_immutability() from public;
grant execute on function public.velmere_enforce_audit_customer_snapshot_immutability() to service_role;


comment on column public.velmere_audit_account_messages.canonical_customer_snapshot is
  'Immutable customer-safe Audit snapshot. Stores exact tier projection and canonical preview/PDF layout; never raw provider payloads or private reviewer notes.';
comment on column public.velmere_audit_account_messages.canonical_customer_snapshot_digest is
  'SHA-256 digest of canonical_customer_snapshot, verified by the application before readiness or delivery.';

commit;
