begin;

-- P85 AUDIT CUSTOMER ARTIFACT DATABASE-ENFORCED PUBLICATION VISIBILITY BEGIN
-- P84 made exact Audit artifacts owner-readable, but the base snapshot/PDF RLS
-- policies still exposed every owner-bound row. A customer using the public
-- Supabase REST surface could therefore read an owner-bound Audit snapshot or
-- PDF blob that had not reached the immutable publication-link commit. The app
-- route hid those rows, but the database did not. P85 makes the link ledger the
-- actual database publication boundary and replaces the N+1/limit-before-filter
-- route with one closed owner-scoped RPC projection.

alter table public.velmere_customer_artifact_snapshots enable row level security;
alter table public.velmere_customer_artifact_pdf_blobs enable row level security;
alter table public.velmere_audit_customer_artifact_links enable row level security;

revoke all on table public.velmere_customer_artifact_snapshots from public, anon, authenticated;
revoke all on table public.velmere_customer_artifact_pdf_blobs from public, anon, authenticated;
grant select on table public.velmere_customer_artifact_snapshots to authenticated;
grant select on table public.velmere_customer_artifact_pdf_blobs to authenticated;

-- Owner visibility for Audit snapshots now requires the immutable P84 link to
-- match the exact owner, snapshot digest, artifact digest and PDF digest. Other
-- product surfaces retain their existing owner-only read behavior.
drop policy if exists pass22_customer_artifact_snapshot_owner_select on public.velmere_customer_artifact_snapshots;
drop policy if exists a102r2_customer_artifact_snapshot_owner_select on public.velmere_customer_artifact_snapshots;
drop policy if exists p84_customer_artifact_snapshot_owner_select on public.velmere_customer_artifact_snapshots;
drop policy if exists p85_customer_artifact_snapshot_owner_published_select on public.velmere_customer_artifact_snapshots;
create policy p85_customer_artifact_snapshot_owner_published_select
on public.velmere_customer_artifact_snapshots
for select to authenticated
using (
  account_id = public.velmere_current_account_id()
  and account_id_hash = public.velmere_current_account_binding_hash()
  and (
    surface <> 'audit'
    or (
      payload_kind = 'audit_customer_report_v1'
      and pdf_storage = 'exact_immutable_blob'
      and exists (
        select 1
        from public.velmere_audit_customer_artifact_links l
        where l.snapshot_id = velmere_customer_artifact_snapshots.snapshot_id
          and l.account_id = velmere_customer_artifact_snapshots.account_id
          and l.account_id_hash = velmere_customer_artifact_snapshots.account_id_hash
          and l.artifact_snapshot_digest = velmere_customer_artifact_snapshots.snapshot_digest
          and l.artifact_digest = velmere_customer_artifact_snapshots.artifact_digest
          and l.pdf_digest = velmere_customer_artifact_snapshots.snapshot->'canonicalArtifact'->>'pdfDigest'
      )
    )
  )
);

-- Audit PDF bytes are directly owner-readable only after the same immutable
-- link is present and exact cross-table identities match. This closes the raw
-- PostgREST orphan-blob path as well as the application route.
drop policy if exists pass22_customer_artifact_pdf_owner_select on public.velmere_customer_artifact_pdf_blobs;
drop policy if exists a102r2_customer_artifact_pdf_owner_select on public.velmere_customer_artifact_pdf_blobs;
drop policy if exists p84_customer_artifact_pdf_owner_select on public.velmere_customer_artifact_pdf_blobs;
drop policy if exists p85_customer_artifact_pdf_owner_published_select on public.velmere_customer_artifact_pdf_blobs;
create policy p85_customer_artifact_pdf_owner_published_select
on public.velmere_customer_artifact_pdf_blobs
for select to authenticated
using (
  account_id = public.velmere_current_account_id()
  and account_id_hash = public.velmere_current_account_binding_hash()
  and (
    surface <> 'audit'
    or exists (
      select 1
      from public.velmere_audit_customer_artifact_links l
      where l.pdf_blob_id = velmere_customer_artifact_pdf_blobs.blob_id
        and l.snapshot_id = velmere_customer_artifact_pdf_blobs.snapshot_id
        and l.account_id = velmere_customer_artifact_pdf_blobs.account_id
        and l.account_id_hash = velmere_customer_artifact_pdf_blobs.account_id_hash
        and l.artifact_digest = velmere_customer_artifact_pdf_blobs.artifact_digest
        and l.pdf_digest = velmere_customer_artifact_pdf_blobs.pdf_digest
    )
  )
);

-- The RPCs below are SECURITY INVOKER. They cannot bypass the policies above,
-- never accept an account id from the caller, and expose only the pre-existing
-- customer artifact row plus the minimal P84 publication link. LIMIT is applied
-- after the database publication boundary, so hidden/orphan Audit rows cannot
-- starve a valid older artifact.
create or replace function public.velmere_list_owner_visible_customer_artifacts_v1(
  p_limit integer default 24
) returns table(
  visibility_schema_version text,
  publication_state text,
  publication_link jsonb,
  snapshot_id text,
  account_id text,
  account_id_hash text,
  surface text,
  payload_kind text,
  report_id text,
  artifact_digest text,
  snapshot_digest text,
  pdf_storage text,
  snapshot jsonb,
  generated_at timestamptz
)
language plpgsql
stable
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_account_id text;
  v_account_hash text;
begin
  if p_limit is null or p_limit < 1 or p_limit > 50 then
    raise exception 'customer_artifact_owner_visible_limit_invalid' using errcode = '22023';
  end if;

  v_account_id := public.velmere_current_account_id();
  v_account_hash := public.velmere_current_account_binding_hash();
  if v_account_id is null or v_account_hash is null then
    raise exception 'customer_artifact_owner_visible_account_unbound' using errcode = '28000';
  end if;

  return query
  select
    'p85-owner-visible-customer-artifact-read-v1'::text,
    case when s.surface = 'audit' then 'p84_exact_link' else 'not_applicable' end::text,
    case when s.surface = 'audit' then to_jsonb(l) else null::jsonb end,
    s.snapshot_id,
    s.account_id,
    s.account_id_hash,
    s.surface,
    s.payload_kind,
    s.report_id,
    s.artifact_digest,
    s.snapshot_digest,
    s.pdf_storage,
    s.snapshot,
    s.generated_at
  from public.velmere_customer_artifact_snapshots s
  left join public.velmere_audit_customer_artifact_links l
    on s.surface = 'audit'
   and l.snapshot_id = s.snapshot_id
   and l.account_id = s.account_id
   and l.account_id_hash = s.account_id_hash
   and l.artifact_snapshot_digest = s.snapshot_digest
   and l.artifact_digest = s.artifact_digest
   and l.pdf_digest = s.snapshot->'canonicalArtifact'->>'pdfDigest'
  where s.account_id = v_account_id
    and s.account_id_hash = v_account_hash
    and (s.surface <> 'audit' or l.snapshot_id is not null)
  order by s.generated_at desc, s.snapshot_id desc
  limit p_limit;
end;
$$;

create or replace function public.velmere_get_owner_visible_customer_artifact_v1(
  p_snapshot_id text
) returns table(
  visibility_schema_version text,
  publication_state text,
  publication_link jsonb,
  snapshot_id text,
  account_id text,
  account_id_hash text,
  surface text,
  payload_kind text,
  report_id text,
  artifact_digest text,
  snapshot_digest text,
  pdf_storage text,
  snapshot jsonb,
  generated_at timestamptz
)
language plpgsql
stable
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_account_id text;
  v_account_hash text;
begin
  if p_snapshot_id is null
     or length(p_snapshot_id) < 8
     or length(p_snapshot_id) > 160
     or p_snapshot_id !~ '^[A-Za-z0-9._:-]+$' then
    raise exception 'customer_artifact_owner_visible_snapshot_id_invalid' using errcode = '22023';
  end if;

  v_account_id := public.velmere_current_account_id();
  v_account_hash := public.velmere_current_account_binding_hash();
  if v_account_id is null or v_account_hash is null then
    raise exception 'customer_artifact_owner_visible_account_unbound' using errcode = '28000';
  end if;

  return query
  select
    'p85-owner-visible-customer-artifact-read-v1'::text,
    case when s.surface = 'audit' then 'p84_exact_link' else 'not_applicable' end::text,
    case when s.surface = 'audit' then to_jsonb(l) else null::jsonb end,
    s.snapshot_id,
    s.account_id,
    s.account_id_hash,
    s.surface,
    s.payload_kind,
    s.report_id,
    s.artifact_digest,
    s.snapshot_digest,
    s.pdf_storage,
    s.snapshot,
    s.generated_at
  from public.velmere_customer_artifact_snapshots s
  left join public.velmere_audit_customer_artifact_links l
    on s.surface = 'audit'
   and l.snapshot_id = s.snapshot_id
   and l.account_id = s.account_id
   and l.account_id_hash = s.account_id_hash
   and l.artifact_snapshot_digest = s.snapshot_digest
   and l.artifact_digest = s.artifact_digest
   and l.pdf_digest = s.snapshot->'canonicalArtifact'->>'pdfDigest'
  where s.snapshot_id = p_snapshot_id
    and s.account_id = v_account_id
    and s.account_id_hash = v_account_hash
    and (s.surface <> 'audit' or l.snapshot_id is not null)
  limit 1;
end;
$$;

revoke all on function public.velmere_list_owner_visible_customer_artifacts_v1(integer)
  from public, anon, authenticated, service_role;
revoke all on function public.velmere_get_owner_visible_customer_artifact_v1(text)
  from public, anon, authenticated, service_role;
grant execute on function public.velmere_list_owner_visible_customer_artifacts_v1(integer)
  to authenticated;
grant execute on function public.velmere_get_owner_visible_customer_artifact_v1(text)
  to authenticated;

comment on function public.velmere_list_owner_visible_customer_artifacts_v1(integer) is
  'P85 authenticated SECURITY INVOKER projection. Publication filtering and LIMIT occur in PostgreSQL; orphan Audit rows are not customer-readable and cannot starve older valid artifacts.';
comment on function public.velmere_get_owner_visible_customer_artifact_v1(text) is
  'P85 authenticated SECURITY INVOKER exact artifact read. The caller account is derived from auth.uid() binding; caller-supplied account identities are not accepted.';
-- P85 AUDIT CUSTOMER ARTIFACT DATABASE-ENFORCED PUBLICATION VISIBILITY END

commit;
