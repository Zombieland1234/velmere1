begin;

-- PASS4823 CUSTOMER ARTIFACT SNAPSHOT BEGIN
create table if not exists public.velmere_customer_artifact_snapshots (
  snapshot_id text primary key,
  account_id text not null,
  account_id_hash text not null,
  surface text not null,
  payload_kind text not null,
  report_id text not null,
  artifact_digest text not null,
  snapshot_digest text not null,
  snapshot jsonb not null,
  generated_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.velmere_customer_artifact_snapshots
  drop constraint if exists velmere_customer_artifact_snapshots_surface_check,
  drop constraint if exists velmere_customer_artifact_surface_check,
  drop constraint if exists velmere_customer_artifact_snapshots_payload_kind_check,
  drop constraint if exists velmere_customer_artifact_payload_kind_check,
  drop constraint if exists velmere_customer_artifact_account_hash_check,
  drop constraint if exists velmere_customer_artifact_digest_check,
  drop constraint if exists velmere_customer_artifact_surface_payload_kind_check;

alter table public.velmere_customer_artifact_snapshots
  add constraint velmere_customer_artifact_surface_check
    check (surface in ('shield','real_markets','lens')),
  add constraint velmere_customer_artifact_payload_kind_check
    check (payload_kind in ('market_customer_report_v1','lens_report_v1')),
  add constraint velmere_customer_artifact_surface_payload_kind_check
    check (
      (surface = 'lens' and payload_kind = 'lens_report_v1')
      or
      (surface in ('shield','real_markets') and payload_kind = 'market_customer_report_v1')
    ),
  add constraint velmere_customer_artifact_account_hash_check
    check (account_id_hash ~ '^[a-f0-9]{64}$'),
  add constraint velmere_customer_artifact_digest_check
    check (
      artifact_digest ~ '^sha256:[a-f0-9]{64}$'
      and snapshot_digest ~ '^sha256:[a-f0-9]{64}$'
      and snapshot->>'snapshotId' = snapshot_id
      and snapshot->>'snapshotDigest' = snapshot_digest
      and snapshot->'canonicalArtifact'->>'artifactDigest' = artifact_digest
      and snapshot->>'accountIdHash' = account_id_hash
      and snapshot->>'surface' = surface
      and snapshot->>'payloadKind' = payload_kind
      and snapshot->>'reportId' = report_id
      and (snapshot->>'generatedAt')::timestamptz = generated_at
      and snapshot->>'schemaVersion' = 'pass4822-account-customer-artifact-snapshot-v1'
    );

alter table public.velmere_customer_artifact_snapshots enable row level security;
revoke all on table public.velmere_customer_artifact_snapshots from anon, authenticated;
grant select, insert on table public.velmere_customer_artifact_snapshots to service_role;

create index if not exists velmere_customer_artifact_account_idx
  on public.velmere_customer_artifact_snapshots(account_id, generated_at desc);
drop index if exists public.velmere_customer_artifact_digest_unique;
create unique index if not exists velmere_customer_artifact_owner_digest_unique
  on public.velmere_customer_artifact_snapshots(account_id_hash, artifact_digest);

create or replace function public.velmere_customer_artifact_immutable_guard()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if tg_op = 'UPDATE' then
    raise exception 'customer_artifact_snapshot_immutable' using errcode = '23514';
  end if;
  if new.snapshot->>'snapshotId' is distinct from new.snapshot_id
     or new.snapshot->>'snapshotDigest' is distinct from new.snapshot_digest
     or new.snapshot->'canonicalArtifact'->>'artifactDigest' is distinct from new.artifact_digest
     or new.snapshot->>'accountIdHash' is distinct from new.account_id_hash
     or new.snapshot->>'surface' is distinct from new.surface
     or new.snapshot->>'payloadKind' is distinct from new.payload_kind
     or new.snapshot->>'reportId' is distinct from new.report_id
     or (new.snapshot->>'generatedAt')::timestamptz is distinct from new.generated_at then
    raise exception 'customer_artifact_snapshot_contract_mismatch' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists velmere_customer_artifact_immutable on public.velmere_customer_artifact_snapshots;
create trigger velmere_customer_artifact_immutable
before insert or update on public.velmere_customer_artifact_snapshots
for each row execute function public.velmere_customer_artifact_immutable_guard();

revoke all on function public.velmere_customer_artifact_immutable_guard() from public;
grant execute on function public.velmere_customer_artifact_immutable_guard() to service_role;

comment on table public.velmere_customer_artifact_snapshots is
  'PASS4823 immutable account-bound canonical customer report snapshots. Browser-supplied reports are forbidden.';
-- PASS4823 CUSTOMER ARTIFACT SNAPSHOT END

commit;
