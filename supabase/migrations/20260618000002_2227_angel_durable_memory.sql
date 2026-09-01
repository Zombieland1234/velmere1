-- PASS2227: Angel durable memory ledger.
-- Stores only sanitized session summaries and recent topics; no raw chat transcript, no secrets, no public RLS access.

create table if not exists public.velmere_angel_memories (
  session_hash text primary key,
  locale text not null default 'en' check (locale in ('pl', 'en', 'de')),
  lane text not null default 'general',
  summary text not null default '',
  recent_topics jsonb not null default '[]'::jsonb,
  turn_count integer not null default 0 check (turn_count >= 0),
  updated_at timestamptz not null default now()
);

alter table public.velmere_angel_memories enable row level security;

revoke all on table public.velmere_angel_memories from anon;
revoke all on table public.velmere_angel_memories from authenticated;
grant select, insert, update, delete on table public.velmere_angel_memories to service_role;

create index if not exists velmere_angel_memories_updated_idx on public.velmere_angel_memories(updated_at desc);
create index if not exists velmere_angel_memories_lane_idx on public.velmere_angel_memories(lane, updated_at desc);

create or replace function public.velmere_angel_memory_touch()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  new.summary = left(coalesce(new.summary, ''), 1800);
  if jsonb_typeof(new.recent_topics) is distinct from 'array' then
    new.recent_topics = '[]'::jsonb;
  end if;
  return new;
end;
$$;

drop trigger if exists velmere_angel_memory_touch_trigger on public.velmere_angel_memories;
create trigger velmere_angel_memory_touch_trigger
before insert or update on public.velmere_angel_memories
for each row execute function public.velmere_angel_memory_touch();
