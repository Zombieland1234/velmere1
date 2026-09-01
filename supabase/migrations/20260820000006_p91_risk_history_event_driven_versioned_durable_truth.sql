begin;

-- P91 RISK HISTORY EVENT-DRIVEN, VERSIONED, DURABLE TRUTH BEGIN
-- This migration creates the table that the previous risk-ledger code assumed
-- existed but never deployed. It stores only first observations, material
-- changes and bounded daily heartbeats. Direct customer access is prohibited;
-- customer projection remains an application-level, redacted contract.

create table if not exists public.velmere_risk_history_events (
  schema_version text not null
    check (schema_version = 'velmere.risk-history-event.v1'),
  event_id text primary key
    check (event_id ~ '^risk-history-[a-f0-9]{40}$'),
  event_digest text not null unique
    check (event_digest ~ '^sha256:[a-f0-9]{64}$'),
  storage_digest text not null
    check (storage_digest ~ '^sha256:[a-f0-9]{64}$'),
  canonical_asset_id text not null
    check (length(canonical_asset_id) between 3 and 256),
  asset_id text not null
    check (length(asset_id) between 1 and 200),
  identity_class text not null
    check (identity_class in ('CHAIN_CONTRACT', 'MARKET_ID', 'UNRESOLVED')),
  symbol text not null check (length(symbol) between 1 and 32),
  name text not null check (length(name) between 1 and 160),
  observed_at timestamptz not null,
  recorded_at timestamptz not null,
  risk_score smallint not null check (risk_score between 0 and 100),
  risk_level text not null check (risk_level in ('low', 'medium', 'high', 'critical')),
  signal_count integer not null check (signal_count between 0 and 100000),
  confidence numeric,
  publication_state text not null check (publication_state in ('PUBLIC', 'WITHHELD')),
  customer_publishable boolean not null,
  methodology_version text not null check (length(methodology_version) between 1 and 160),
  score_version text not null check (length(score_version) between 1 and 120),
  evidence_version text not null check (length(evidence_version) between 1 and 120),
  evidence_digest text not null check (length(evidence_digest) between 1 and 120),
  source_as_of timestamptz,
  comparability_key text not null check (length(comparability_key) between 1 and 120),
  comparable_to_previous boolean not null,
  event_types text[] not null check (cardinality(event_types) between 1 and 7),
  change_reasons text[] not null check (cardinality(change_reasons) between 1 and 7),
  event_json jsonb not null check (jsonb_typeof(event_json) = 'object'),
  created_at timestamptz not null default now(),
  unique (canonical_asset_id, observed_at),
  check (recorded_at >= observed_at),
  check (source_as_of is null or source_as_of <= recorded_at + interval '5 minutes'),
  check (customer_publishable = (publication_state = 'PUBLIC')),
  check (
    not customer_publishable
    or (
      identity_class <> 'UNRESOLVED'
      and score_version ~ '^sha256:[a-f0-9]{64}$'
      and evidence_digest ~ '^sha256:[a-f0-9]{64}$'
      and comparability_key ~ '^sha256:[a-f0-9]{64}$'
    )
  ),
  check (event_types <@ array[
    'TRACKING_STARTED', 'SCORE_CHANGED', 'LEVEL_CHANGED',
    'METHODOLOGY_CHANGED', 'EVIDENCE_CHANGED',
    'PUBLICATION_STATE_CHANGED', 'HEARTBEAT'
  ]::text[])
);

create index if not exists velmere_risk_history_events_asset_time_idx
  on public.velmere_risk_history_events(canonical_asset_id, observed_at desc);
create index if not exists velmere_risk_history_events_legacy_asset_time_idx
  on public.velmere_risk_history_events(asset_id, observed_at desc);
create index if not exists velmere_risk_history_events_public_time_idx
  on public.velmere_risk_history_events(canonical_asset_id, observed_at desc)
  where customer_publishable;

alter table public.velmere_risk_history_events enable row level security;
revoke all on table public.velmere_risk_history_events from public, anon, authenticated;
grant select, insert on table public.velmere_risk_history_events to service_role;

create or replace function public.velmere_validate_risk_history_event_v1()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_expected_storage_digest text;
  v_event_keys text[];
  v_snapshot jsonb;
begin
  v_event_keys := array(
    select key from jsonb_object_keys(new.event_json) as key
    where key <> all(array[
      'schemaVersion','eventId','eventDigest','canonicalAssetId','assetId','identityClass',
      'symbol','name','observedAt','recordedAt','score','level','signalCount','confidence',
      'publicationState','customerPublishable','methodologyVersion','scoreVersion',
      'evidenceVersion','evidenceDigest','sourceAsOf','comparabilityKey',
      'comparableToPrevious','eventTypes','changeReasons','snapshot'
    ]::text[])
  );
  if cardinality(v_event_keys) > 0 then
    raise exception 'risk_history_event_unknown_fields' using errcode = '23514';
  end if;

  v_snapshot := new.event_json->'snapshot';
  if v_snapshot is null or jsonb_typeof(v_snapshot) <> 'object' then
    raise exception 'risk_history_snapshot_missing' using errcode = '23514';
  end if;

  if new.event_json->>'schemaVersion' <> new.schema_version
     or new.event_json->>'eventId' <> new.event_id
     or new.event_json->>'eventDigest' <> new.event_digest
     or new.event_json->>'canonicalAssetId' <> new.canonical_asset_id
     or new.event_json->>'assetId' <> new.asset_id
     or new.event_json->>'identityClass' <> new.identity_class
     or new.event_json->>'symbol' <> new.symbol
     or new.event_json->>'name' <> new.name
     or (new.event_json->>'observedAt')::timestamptz <> new.observed_at
     or (new.event_json->>'recordedAt')::timestamptz <> new.recorded_at
     or (new.event_json->>'score')::integer <> new.risk_score
     or new.event_json->>'level' <> new.risk_level
     or (new.event_json->>'signalCount')::integer <> new.signal_count
     or (new.event_json->>'publicationState') <> new.publication_state
     or (new.event_json->>'customerPublishable')::boolean <> new.customer_publishable
     or new.event_json->>'methodologyVersion' <> new.methodology_version
     or new.event_json->>'scoreVersion' <> new.score_version
     or new.event_json->>'evidenceVersion' <> new.evidence_version
     or new.event_json->>'evidenceDigest' <> new.evidence_digest
     or new.event_json->>'comparabilityKey' <> new.comparability_key
     or (new.event_json->>'comparableToPrevious')::boolean <> new.comparable_to_previous
     or array(select jsonb_array_elements_text(new.event_json->'eventTypes')) <> new.event_types
     or array(select jsonb_array_elements_text(new.event_json->'changeReasons')) <> new.change_reasons then
    raise exception 'risk_history_event_cross_binding_mismatch' using errcode = '23514';
  end if;

  if v_snapshot->>'schemaVersion' <> 'velmere.risk-history-snapshot.v1'
     or v_snapshot->>'id' <> new.asset_id
     or v_snapshot->>'canonicalAssetId' <> new.canonical_asset_id
     or v_snapshot->>'identityClass' <> new.identity_class
     or v_snapshot->>'symbol' <> new.symbol
     or v_snapshot->>'name' <> new.name
     or (v_snapshot->>'timestamp')::timestamptz <> new.observed_at
     or (v_snapshot->>'score')::integer <> new.risk_score
     or v_snapshot->>'level' <> new.risk_level
     or (v_snapshot->>'signalCount')::integer <> new.signal_count
     or v_snapshot->>'publicationState' <> new.publication_state
     or (v_snapshot->>'customerPublishable')::boolean <> new.customer_publishable
     or v_snapshot->>'methodologyVersion' <> new.methodology_version
     or v_snapshot->>'scoreVersion' <> new.score_version
     or v_snapshot->>'evidenceVersion' <> new.evidence_version
     or v_snapshot->>'evidenceDigest' <> new.evidence_digest
     or v_snapshot->>'comparabilityKey' <> new.comparability_key
     or coalesce(v_snapshot->>'snapshotDigest', '') !~ '^sha256:[a-f0-9]{64}$' then
    raise exception 'risk_history_snapshot_cross_binding_mismatch' using errcode = '23514';
  end if;

  v_expected_storage_digest := 'sha256:' || encode(digest(convert_to(new.event_json::text, 'UTF8'), 'sha256'), 'hex');
  if new.storage_digest <> v_expected_storage_digest then
    raise exception 'risk_history_storage_digest_invalid' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function public.velmere_validate_risk_history_event_v1()
  from public, anon, authenticated, service_role;

drop trigger if exists p91_validate_risk_history_event on public.velmere_risk_history_events;
create trigger p91_validate_risk_history_event
before insert on public.velmere_risk_history_events
for each row execute function public.velmere_validate_risk_history_event_v1();

create or replace function public.velmere_reject_risk_history_event_mutation_v1()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
begin
  raise exception 'risk_history_event_immutable' using errcode = '55000';
end;
$$;
revoke all on function public.velmere_reject_risk_history_event_mutation_v1()
  from public, anon, authenticated, service_role;

drop trigger if exists p91_reject_risk_history_event_mutation on public.velmere_risk_history_events;
create trigger p91_reject_risk_history_event_mutation
before update or delete on public.velmere_risk_history_events
for each row execute function public.velmere_reject_risk_history_event_mutation_v1();

create or replace function public.velmere_get_latest_risk_history_events_v1(
  p_asset_ids text[]
) returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if p_asset_ids is null or cardinality(p_asset_ids) < 1 or cardinality(p_asset_ids) > 250 then
    raise exception 'risk_history_asset_id_batch_invalid' using errcode = '22023';
  end if;
  if exists(select 1 from unnest(p_asset_ids) id where id is null or length(trim(id)) < 3 or length(id) > 256) then
    raise exception 'risk_history_asset_id_invalid' using errcode = '22023';
  end if;
  return coalesce((
    select jsonb_agg(row.event_json order by row.canonical_asset_id)
    from (
      select distinct on (canonical_asset_id) canonical_asset_id, event_json
      from public.velmere_risk_history_events
      where canonical_asset_id = any(p_asset_ids)
      order by canonical_asset_id, observed_at desc
    ) row
  ), '[]'::jsonb);
end;
$$;
revoke all on function public.velmere_get_latest_risk_history_events_v1(text[])
  from public, anon, authenticated;
grant execute on function public.velmere_get_latest_risk_history_events_v1(text[]) to service_role;

create or replace function public.velmere_append_risk_history_events_v1(
  p_events jsonb
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_event jsonb;
  v_previous public.velmere_risk_history_events%rowtype;
  v_existing public.velmere_risk_history_events%rowtype;
  v_event_id text;
  v_event_digest text;
  v_asset text;
  v_asset_id text;
  v_identity_class text;
  v_observed_at timestamptz;
  v_recorded_at timestamptz;
  v_score integer;
  v_level text;
  v_publication_state text;
  v_customer_publishable boolean;
  v_methodology_version text;
  v_score_version text;
  v_evidence_version text;
  v_evidence_digest text;
  v_source_as_of timestamptz;
  v_comparability_key text;
  v_comparable boolean;
  v_types text[];
  v_reasons text[];
  v_storage_digest text;
  v_material boolean;
  v_stored integer := 0;
  v_skipped integer := 0;
  v_ids text[] := '{}';
  v_digests text[] := '{}';
begin
  if p_events is null or jsonb_typeof(p_events) <> 'array'
     or jsonb_array_length(p_events) < 1 or jsonb_array_length(p_events) > 250 then
    return jsonb_build_object('ok', false, 'error', 'risk_history_event_batch_invalid');
  end if;

  for v_event in select value from jsonb_array_elements(p_events)
  loop
    if jsonb_typeof(v_event) <> 'object' then
      raise exception 'risk_history_event_invalid' using errcode = '22023';
    end if;
    v_event_id := v_event->>'eventId';
    v_event_digest := v_event->>'eventDigest';
    v_asset := v_event->>'canonicalAssetId';
    v_asset_id := v_event->>'assetId';
    v_identity_class := v_event->>'identityClass';
    v_observed_at := (v_event->>'observedAt')::timestamptz;
    v_recorded_at := (v_event->>'recordedAt')::timestamptz;
    v_score := (v_event->>'score')::integer;
    v_level := v_event->>'level';
    v_publication_state := v_event->>'publicationState';
    v_customer_publishable := (v_event->>'customerPublishable')::boolean;
    v_methodology_version := v_event->>'methodologyVersion';
    v_score_version := v_event->>'scoreVersion';
    v_evidence_version := v_event->>'evidenceVersion';
    v_evidence_digest := v_event->>'evidenceDigest';
    v_source_as_of := case when v_event ? 'sourceAsOf' then (v_event->>'sourceAsOf')::timestamptz else null end;
    v_comparability_key := v_event->>'comparabilityKey';
    v_comparable := (v_event->>'comparableToPrevious')::boolean;
    v_types := array(select jsonb_array_elements_text(v_event->'eventTypes'));
    v_reasons := array(select jsonb_array_elements_text(v_event->'changeReasons'));

    perform pg_advisory_xact_lock(hashtextextended('p91-risk-history:' || v_asset, 0));

    select * into v_existing from public.velmere_risk_history_events where event_id = v_event_id for update;
    if found then
      if v_existing.event_digest <> v_event_digest or v_existing.event_json <> v_event then
        raise exception 'risk_history_event_id_conflict' using errcode = '23505';
      end if;
      v_skipped := v_skipped + 1;
      v_ids := array_append(v_ids, v_event_id);
      v_digests := array_append(v_digests, v_event_digest);
      continue;
    end if;

    select * into v_previous
    from public.velmere_risk_history_events
    where canonical_asset_id = v_asset
    order by observed_at desc
    limit 1
    for update;

    if found then
      if v_observed_at <= v_previous.observed_at then
        raise exception 'risk_history_observation_non_monotonic' using errcode = '22000';
      end if;
      v_material := v_score <> v_previous.risk_score
        or v_level <> v_previous.risk_level
        or v_comparability_key <> v_previous.comparability_key
        or v_evidence_digest <> v_previous.evidence_digest
        or v_evidence_version <> v_previous.evidence_version
        or v_publication_state <> v_previous.publication_state;

      if v_comparable <> (v_comparability_key = v_previous.comparability_key) then
        raise exception 'risk_history_comparability_flag_invalid' using errcode = '23514';
      end if;
      if v_score <> v_previous.risk_score and not ('SCORE_CHANGED' = any(v_types)) then
        raise exception 'risk_history_score_change_marker_missing' using errcode = '23514';
      end if;
      if v_level <> v_previous.risk_level and not ('LEVEL_CHANGED' = any(v_types)) then
        raise exception 'risk_history_level_change_marker_missing' using errcode = '23514';
      end if;
      if v_comparability_key <> v_previous.comparability_key and not ('METHODOLOGY_CHANGED' = any(v_types)) then
        raise exception 'risk_history_methodology_change_marker_missing' using errcode = '23514';
      end if;
      if (v_evidence_digest <> v_previous.evidence_digest or v_evidence_version <> v_previous.evidence_version)
         and not ('EVIDENCE_CHANGED' = any(v_types)) then
        raise exception 'risk_history_evidence_change_marker_missing' using errcode = '23514';
      end if;
      if v_publication_state <> v_previous.publication_state and not ('PUBLICATION_STATE_CHANGED' = any(v_types)) then
        raise exception 'risk_history_publication_change_marker_missing' using errcode = '23514';
      end if;

      if not v_material then
        if v_observed_at < v_previous.observed_at + interval '24 hours'
           or cardinality(v_types) <> 1 or not ('HEARTBEAT' = any(v_types)) then
          raise exception 'risk_history_unchanged_event_not_due' using errcode = '23514';
        end if;
      elsif 'HEARTBEAT' = any(v_types) or 'TRACKING_STARTED' = any(v_types) then
        raise exception 'risk_history_material_event_marker_invalid' using errcode = '23514';
      end if;
    else
      if cardinality(v_types) <> 1 or not ('TRACKING_STARTED' = any(v_types)) or v_comparable then
        raise exception 'risk_history_first_event_invalid' using errcode = '23514';
      end if;
    end if;

    v_storage_digest := 'sha256:' || encode(digest(convert_to(v_event::text, 'UTF8'), 'sha256'), 'hex');
    insert into public.velmere_risk_history_events(
      schema_version,event_id,event_digest,storage_digest,canonical_asset_id,asset_id,identity_class,
      symbol,name,observed_at,recorded_at,risk_score,risk_level,signal_count,confidence,
      publication_state,customer_publishable,methodology_version,score_version,evidence_version,
      evidence_digest,source_as_of,comparability_key,comparable_to_previous,event_types,change_reasons,event_json
    ) values (
      v_event->>'schemaVersion',v_event_id,v_event_digest,v_storage_digest,v_asset,v_asset_id,v_identity_class,
      v_event->>'symbol',v_event->>'name',v_observed_at,v_recorded_at,v_score,v_level,
      (v_event->>'signalCount')::integer,case when v_event ? 'confidence' then (v_event->>'confidence')::numeric else null end,
      v_publication_state,v_customer_publishable,v_methodology_version,v_score_version,v_evidence_version,
      v_evidence_digest,v_source_as_of,v_comparability_key,v_comparable,v_types,v_reasons,v_event
    );
    v_stored := v_stored + 1;
    v_ids := array_append(v_ids, v_event_id);
    v_digests := array_append(v_digests, v_event_digest);
  end loop;

  return jsonb_build_object(
    'ok', true,
    'stored', v_stored,
    'skipped', v_skipped,
    'conflicts', 0,
    'eventIds', to_jsonb(v_ids),
    'eventDigests', to_jsonb(v_digests)
  );
exception when others then
  raise;
end;
$$;
revoke all on function public.velmere_append_risk_history_events_v1(jsonb)
  from public, anon, authenticated;
grant execute on function public.velmere_append_risk_history_events_v1(jsonb) to service_role;

create or replace function public.velmere_read_risk_history_events_v1(
  p_event_ids text[]
) returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if p_event_ids is null or cardinality(p_event_ids) < 1 or cardinality(p_event_ids) > 250 then
    raise exception 'risk_history_event_id_batch_invalid' using errcode = '22023';
  end if;
  return coalesce((
    select jsonb_agg(event_json order by observed_at)
    from public.velmere_risk_history_events
    where event_id = any(p_event_ids)
  ), '[]'::jsonb);
end;
$$;
revoke all on function public.velmere_read_risk_history_events_v1(text[])
  from public, anon, authenticated;
grant execute on function public.velmere_read_risk_history_events_v1(text[]) to service_role;

create or replace function public.velmere_read_risk_history_by_asset_v1(
  p_asset_id text,
  p_limit integer default 144
) returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if p_asset_id is null or length(trim(p_asset_id)) < 1 or length(p_asset_id) > 256
     or p_limit is null or p_limit < 1 or p_limit > 5000 then
    raise exception 'risk_history_asset_read_input_invalid' using errcode = '22023';
  end if;
  return coalesce((
    select jsonb_agg(row.event_json order by row.observed_at)
    from (
      select event_json, observed_at
      from public.velmere_risk_history_events
      where canonical_asset_id = p_asset_id or asset_id = p_asset_id
      order by observed_at desc
      limit p_limit
    ) row
  ), '[]'::jsonb);
end;
$$;
revoke all on function public.velmere_read_risk_history_by_asset_v1(text, integer)
  from public, anon, authenticated;
grant execute on function public.velmere_read_risk_history_by_asset_v1(text, integer) to service_role;

comment on table public.velmere_risk_history_events is
  'P91 immutable, event-driven and versioned Risk History. Customer publication requires a separate redacted projection; raw snapshots remain service-role-only.';
comment on function public.velmere_append_risk_history_events_v1(jsonb) is
  'P91 append-only Risk History transaction. It serializes per asset, rejects timestamp conflicts and suppresses unchanged events before the 24-hour heartbeat.';

-- P91 RISK HISTORY EVENT-DRIVEN, VERSIONED, DURABLE TRUTH END
commit;
