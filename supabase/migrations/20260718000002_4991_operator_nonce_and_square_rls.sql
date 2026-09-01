-- PASS4991: durable single-use operator nonces and canonical Square public-read repair.

create table if not exists public.velmere_idempotency_keys (
  key_hash text primary key,
  value_hash text not null,
  source text not null default 'pass4395_client_request_idempotency',
  first_seen_at timestamptz not null default now(),
  expires_at timestamptz not null,
  ttl_seconds integer not null default 86400,
  receipt jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint velmere_idempotency_keys_ttl_check check (ttl_seconds between 60 and 604800)
);

alter table public.velmere_idempotency_keys enable row level security;
revoke all on table public.velmere_idempotency_keys from public, anon, authenticated;
grant select, insert, update, delete on table public.velmere_idempotency_keys to service_role;

drop policy if exists velmere_idempotency_keys_service_role_all on public.velmere_idempotency_keys;
create policy velmere_idempotency_keys_service_role_all
  on public.velmere_idempotency_keys
  for all
  to service_role
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create index if not exists velmere_idempotency_keys_expires_at_idx
  on public.velmere_idempotency_keys(expires_at);
create index if not exists velmere_idempotency_keys_source_idx
  on public.velmere_idempotency_keys(source, first_seen_at desc);

-- The original bootstrap used a different comments policy name and admitted
-- pending content. Drop every historical public-read name before recreating
-- one exact approved-only policy.
alter table public.velmere_square_posts enable row level security;
alter table public.velmere_square_comments enable row level security;

drop policy if exists "Public can read approved Velmere Square posts" on public.velmere_square_posts;
drop policy if exists "Public can read visible Velmere Square comments" on public.velmere_square_comments;
drop policy if exists "Public can read approved Velmere Square comments" on public.velmere_square_comments;

create policy "Public can read approved Velmere Square posts"
  on public.velmere_square_posts
  for select
  to anon, authenticated
  using (moderation_status = 'approved');

create policy "Public can read approved Velmere Square comments"
  on public.velmere_square_comments
  for select
  to anon, authenticated
  using (moderation_status = 'approved');

revoke insert, update, delete on table public.velmere_square_posts from anon;
revoke insert, update, delete on table public.velmere_square_comments from anon;
