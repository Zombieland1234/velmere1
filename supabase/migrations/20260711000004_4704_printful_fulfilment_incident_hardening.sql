-- PASS4704: operational fulfilment incidents must be directly traceable to the
-- internal order draft without storing raw provider/customer payloads.
alter table public.velmere_fulfilment_incidents
  add column if not exists order_draft_id text;

create index if not exists velmere_fulfilment_incidents_order_draft_idx
  on public.velmere_fulfilment_incidents(order_draft_id, updated_at desc)
  where order_draft_id is not null;

revoke all on table public.velmere_fulfilment_incidents from public, anon, authenticated;
grant select, insert, update on table public.velmere_fulfilment_incidents to service_role;
