create table if not exists public.market_integrity_provider_evidence_packet_ledger (
  ledger_id text not null,
  sequence bigint not null,
  previous_entry_hash text,
  entry_hash text not null,
  domain text not null check (domain in ('kline_series','market_impact','whale_watch','canonical_evidence')),
  asset_key text not null,
  scope text not null,
  packet_id text not null,
  payload_digest text not null,
  metadata_digest text not null,
  metadata_keys jsonb not null default '[]'::jsonb,
  observed_at timestamptz not null,
  recorded_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key (ledger_id, sequence),
  unique (ledger_id, packet_id),
  unique (ledger_id, entry_hash)
);

alter table public.market_integrity_provider_evidence_packet_ledger enable row level security;
revoke all on public.market_integrity_provider_evidence_packet_ledger from anon, authenticated;

create or replace function public.append_market_integrity_provider_evidence_packet(
  p_ledger_id text,
  p_sequence bigint,
  p_previous_entry_hash text,
  p_entry_hash text,
  p_domain text,
  p_asset_key text,
  p_scope text,
  p_packet_id text,
  p_payload_digest text,
  p_metadata_digest text,
  p_metadata_keys jsonb,
  p_observed_at timestamptz,
  p_recorded_at timestamptz
) returns table(sequence bigint, entry_hash text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_head record;
  v_existing record;
begin
  if p_domain not in ('kline_series','market_impact','whale_watch','canonical_evidence') then
    raise exception 'invalid_domain';
  end if;
  if p_payload_digest !~ '^sha256:[a-f0-9]{64}$' or p_entry_hash !~ '^sha256:[a-f0-9]{64}$' then
    raise exception 'sha256_required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_ledger_id, 4799));
  select l.sequence, l.entry_hash into v_existing
    from public.market_integrity_provider_evidence_packet_ledger l
    where l.ledger_id = p_ledger_id and l.packet_id = p_packet_id;
  if found then
    if v_existing.entry_hash <> p_entry_hash then raise exception 'packet_digest_conflict'; end if;
    return query select v_existing.sequence, v_existing.entry_hash;
    return;
  end if;

  select l.sequence, l.entry_hash into v_head
    from public.market_integrity_provider_evidence_packet_ledger l
    where l.ledger_id = p_ledger_id
    order by l.sequence desc limit 1;
  if found then
    if p_sequence <> v_head.sequence + 1 or p_previous_entry_hash is distinct from v_head.entry_hash then
      raise exception 'ledger_chain_conflict';
    end if;
  elsif p_sequence <> 1 or p_previous_entry_hash is not null then
    raise exception 'ledger_genesis_conflict';
  end if;

  insert into public.market_integrity_provider_evidence_packet_ledger(
    ledger_id, sequence, previous_entry_hash, entry_hash, domain, asset_key, scope,
    packet_id, payload_digest, metadata_digest, metadata_keys, observed_at, recorded_at
  ) values (
    p_ledger_id, p_sequence, p_previous_entry_hash, p_entry_hash, p_domain, p_asset_key, p_scope,
    p_packet_id, p_payload_digest, p_metadata_digest, coalesce(p_metadata_keys, '[]'::jsonb), p_observed_at, p_recorded_at
  );
  return query select p_sequence, p_entry_hash;
end;
$$;

revoke all on function public.append_market_integrity_provider_evidence_packet(text,bigint,text,text,text,text,text,text,text,text,jsonb,timestamptz,timestamptz) from public, anon, authenticated;
grant execute on function public.append_market_integrity_provider_evidence_packet(text,bigint,text,text,text,text,text,text,text,text,jsonb,timestamptz,timestamptz) to service_role;
