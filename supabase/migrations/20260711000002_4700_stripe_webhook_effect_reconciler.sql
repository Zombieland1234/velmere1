-- PASS4700: bounded, service-role-only reconciliation for stale/retryable Stripe effects.
-- Returns aggregates only; no event IDs, effect keys, lease tokens or raw errors leave Postgres.

create or replace function public.velmere_reconcile_stripe_webhook_effects(
  p_stale_after_seconds integer default 300,
  p_retry_threshold integer default 5,
  p_limit integer default 100
)
returns table(
  scanned_count integer,
  stale_released_count integer,
  retry_exhausted_count integer,
  completed_without_event_count integer,
  oldest_processing_age_seconds integer,
  error_buckets jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stale_after integer := greatest(60, least(coalesce(p_stale_after_seconds, 300), 86400));
  v_retry_threshold integer := greatest(2, least(coalesce(p_retry_threshold, 5), 50));
  v_limit integer := greatest(1, least(coalesce(p_limit, 100), 500));
  v_scanned integer := 0;
  v_released integer := 0;
  v_exhausted integer := 0;
  v_orphan_completed integer := 0;
  v_oldest integer := null;
  v_buckets jsonb := jsonb_build_object('provider', 0, 'storage', 0, 'entitlement', 0, 'order', 0, 'other', 0);
begin
  with candidates as (
    select event_id, effect_key
    from public.velmere_stripe_webhook_effects
    where status = 'processing'
      and claimed_at <= now() - make_interval(secs => v_stale_after)
    order by claimed_at asc
    for update skip locked
    limit v_limit
  ), released as (
    update public.velmere_stripe_webhook_effects e
    set status = 'retryable_failed',
        lease_token = null,
        last_error_code = 'stale_effect_lease_released',
        updated_at = now()
    from candidates c
    where e.event_id = c.event_id and e.effect_key = c.effect_key
    returning 1
  )
  select count(*)::integer into v_released from released;

  select count(*)::integer
    into v_scanned
  from public.velmere_stripe_webhook_effects
  where status in ('processing', 'retryable_failed');

  select count(*)::integer
    into v_exhausted
  from public.velmere_stripe_webhook_effects
  where status = 'retryable_failed'
    and attempt_count >= v_retry_threshold;

  select count(*)::integer
    into v_orphan_completed
  from public.velmere_stripe_webhook_effects effects
  left join public.velmere_stripe_webhook_events events on events.id = effects.event_id
  where effects.status = 'completed'
    and coalesce(events.status, 'missing') <> 'processed';

  select max(extract(epoch from (now() - claimed_at)))::integer
    into v_oldest
  from public.velmere_stripe_webhook_effects
  where status = 'processing';

  select jsonb_build_object(
    'provider', count(*) filter (where last_error_code like '%provider%' or last_error_code like '%printful%'),
    'storage', count(*) filter (where last_error_code like '%storage%' or last_error_code like '%supabase%'),
    'entitlement', count(*) filter (where last_error_code like '%entitlement%' or last_error_code like '%audit%'),
    'order', count(*) filter (where last_error_code like '%order%' or last_error_code like '%fulfilment%'),
    'other', count(*) filter (where last_error_code is null or last_error_code !~ '(provider|printful|storage|supabase|entitlement|audit|order|fulfilment)')
  ) into v_buckets
  from public.velmere_stripe_webhook_effects
  where status = 'retryable_failed';

  return query select v_scanned, v_released, v_exhausted, v_orphan_completed, v_oldest, v_buckets;
end;
$$;

revoke all on function public.velmere_reconcile_stripe_webhook_effects(integer,integer,integer)
  from public, anon, authenticated;
grant execute on function public.velmere_reconcile_stripe_webhook_effects(integer,integer,integer)
  to service_role;
