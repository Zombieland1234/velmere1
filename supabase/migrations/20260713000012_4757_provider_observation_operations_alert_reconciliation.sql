-- PASS4757: provider observation reconciliation, bounded compaction and hourly-deduplicated anomaly alerts.

alter table public.velmere_durable_computation_alert_outbox
  drop constraint if exists velmere_durable_computation_alert_outbox_code_check;
alter table public.velmere_durable_computation_alert_outbox
  add constraint velmere_durable_computation_alert_outbox_code_check
  check (code in (
    'dead_letter_nonzero','retry_backlog','expired_lease','old_ready_job','old_processing_lease',
    'provider_history_anomaly','provider_observation_retention_drift','provider_observation_ledger_stale'
  ));

alter table public.velmere_durable_computation_alert_outbox
  add column if not exists dedupe_window timestamptz,
  add column if not exists dedupe_key_hash text check (dedupe_key_hash is null or dedupe_key_hash ~ '^[a-f0-9]{64}$');
create unique index if not exists velmere_durable_alert_outbox_dedupe_key_uq
  on public.velmere_durable_computation_alert_outbox(dedupe_key_hash)
  where dedupe_key_hash is not null;

create or replace function public.velmere_reconcile_provider_observations(
  p_stale_after_seconds integer,
  p_retention_limit integer,
  p_min_stable_samples integer
) returns table(
  total_observations integer,
  asset_count integer,
  stable_assets integer,
  watch_assets integer,
  anomalous_assets integer,
  stale_assets integer,
  insufficient_assets integer,
  retention_violations integer,
  oldest_observation_age_seconds integer,
  latest_observation_age_seconds integer,
  max_asset_observations integer
)
language sql security definer set search_path = public stable as $$
  with policy as (
    select greatest(300,least(86400,p_stale_after_seconds)) as stale_after,
           greatest(12,least(512,p_retention_limit)) as retention_limit,
           greatest(2,least(12,p_min_stable_samples)) as min_stable
  ), ranked as (
    select o.*,
      row_number() over(partition by asset_key_hash order by observed_at desc,id desc) as rn,
      count(*) over(partition by asset_key_hash) as asset_total
    from public.velmere_provider_observations o
  ), recent as (
    select * from ranked where rn <= 12
  ), per_asset as (
    select
      asset_key_hash,
      max(asset_total)::integer as sample_total,
      count(*)::integer as recent_count,
      count(*) filter(where state='aligned' and comparability='exact_window' and confidence_cap>=80)::integer as stable_count,
      count(*) filter(where state='divergent' or comparability='not_comparable')::integer as anomaly_count,
      max(observed_at) as latest_at,
      min(observed_at) as oldest_at,
      max(divergence_bps) filter(where rn=1) as latest_divergence,
      max(selected_price) filter(where rn=1) as latest_price,
      percentile_cont(0.5) within group(order by selected_price) filter(where selected_price is not null and selected_price>0) as median_price
    from recent
    group by asset_key_hash
  ), classified as (
    select p.*,
      case
        when p.recent_count < policy.min_stable then 'insufficient'
        when p.anomaly_count >= 2
          or coalesce(p.latest_divergence,0) > 500
          or (p.latest_price is not null and p.median_price is not null and abs(p.latest_price-p.median_price)/greatest(abs(p.median_price),0.000000000001)*10000 > 1000)
          then 'anomalous'
        when p.stable_count < policy.min_stable or p.anomaly_count>0 then 'watch'
        else 'stable'
      end as health,
      extract(epoch from (now()-p.latest_at))::integer as latest_age
    from per_asset p cross join policy
  ), totals as (
    select count(*)::integer as total_observations,
           count(distinct asset_key_hash)::integer as asset_count,
           coalesce(max(asset_total),0)::integer as max_asset_observations,
           count(distinct asset_key_hash) filter(where asset_total > (select retention_limit from policy))::integer as retention_violations,
           coalesce(max(extract(epoch from(now()-observed_at))),0)::integer as oldest_age,
           coalesce(min(extract(epoch from(now()-observed_at))),0)::integer as latest_age
    from ranked
  )
  select t.total_observations,t.asset_count,
    count(*) filter(where c.health='stable')::integer,
    count(*) filter(where c.health='watch')::integer,
    count(*) filter(where c.health='anomalous')::integer,
    count(*) filter(where c.latest_age >= (select stale_after from policy))::integer,
    count(*) filter(where c.health='insufficient')::integer,
    t.retention_violations,t.oldest_age,t.latest_age,t.max_asset_observations
  from totals t left join classified c on true
  group by t.total_observations,t.asset_count,t.retention_violations,t.oldest_age,t.latest_age,t.max_asset_observations;
$$;

create or replace function public.velmere_compact_provider_observations(
  p_retention_limit integer,
  p_max_assets integer
) returns table(
  affected_assets integer,
  deleted_observations integer,
  remaining_retention_violations integer
)
language plpgsql security definer set search_path = public as $$
declare
  v_limit integer := greatest(12,least(512,p_retention_limit));
  v_assets integer := greatest(1,least(2000,p_max_assets));
  v_affected integer := 0;
  v_deleted integer := 0;
  v_remaining integer := 0;
begin
  perform pg_advisory_xact_lock(hashtext('velmere_provider_observation_compaction'));
  with overloaded as (
    select asset_key_hash
    from public.velmere_provider_observations
    group by asset_key_hash
    having count(*) > v_limit
    order by count(*) desc,asset_key_hash
    limit v_assets
  ), ranked as (
    select o.id,o.asset_key_hash,
      row_number() over(partition by o.asset_key_hash order by o.observed_at desc,o.id desc) as rn
    from public.velmere_provider_observations o
    join overloaded x using(asset_key_hash)
  ), deleted as (
    delete from public.velmere_provider_observations o
    using ranked r
    where o.id=r.id and r.rn>v_limit
    returning r.asset_key_hash
  )
  select count(distinct asset_key_hash)::integer,count(*)::integer into v_affected,v_deleted from deleted;

  select count(*)::integer into v_remaining from (
    select asset_key_hash from public.velmere_provider_observations
    group by asset_key_hash having count(*)>v_limit
  ) x;
  return query select coalesce(v_affected,0),coalesce(v_deleted,0),coalesce(v_remaining,0);
end $$;

create or replace function public.velmere_record_provider_observation_alert(
  p_code text,
  p_severity text,
  p_value integer,
  p_threshold integer
) returns table(state text)
language plpgsql security definer set search_path = public as $$
declare
  v_event_id uuid := gen_random_uuid();
  v_window timestamptz := date_trunc('hour',now());
  v_dedupe_key text;
begin
  if p_code not in ('provider_history_anomaly','provider_observation_retention_drift','provider_observation_ledger_stale') then raise exception 'invalid_provider_alert_code'; end if;
  if p_severity not in ('warning','critical') then raise exception 'invalid_provider_alert_severity'; end if;
  v_dedupe_key := encode(digest(p_code||'|'||v_window::text,'sha256'),'hex');
  perform pg_advisory_xact_lock(hashtext('velmere_provider_alert_'||p_code));
  if exists(select 1 from public.velmere_durable_computation_alert_outbox where dedupe_key_hash=v_dedupe_key) then
    return query select 'deduplicated'::text;
    return;
  end if;
  insert into public.velmere_durable_computation_operator_events(event_id,run_id,event_type,severity,code,value,threshold_value,metadata)
  values(v_event_id,null,'alert',p_severity,p_code,greatest(0,p_value),greatest(0,p_threshold),jsonb_build_object('source','provider_observation_operations'));
  insert into public.velmere_durable_computation_alert_outbox(alert_id,code,severity,observed_value,threshold_value,state,next_attempt_at,dedupe_window,dedupe_key_hash)
  values(v_event_id,p_code,p_severity,greatest(0,p_value),greatest(0,p_threshold),'pending',now(),v_window,v_dedupe_key);
  return query select 'recorded'::text;
end $$;

revoke all on function public.velmere_reconcile_provider_observations(integer,integer,integer) from public,anon,authenticated;
revoke all on function public.velmere_compact_provider_observations(integer,integer) from public,anon,authenticated;
revoke all on function public.velmere_record_provider_observation_alert(text,text,integer,integer) from public,anon,authenticated;
grant execute on function public.velmere_reconcile_provider_observations(integer,integer,integer) to service_role;
grant execute on function public.velmere_compact_provider_observations(integer,integer) to service_role;
grant execute on function public.velmere_record_provider_observation_alert(text,text,integer,integer) to service_role;
