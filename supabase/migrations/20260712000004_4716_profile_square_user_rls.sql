-- PASS4716: customer-owned profile and Square writes require caller JWT + durable account binding.

alter table public.velmere_square_posts
  add column if not exists author_account_id text;
alter table public.velmere_square_comments
  add column if not exists author_account_id text;

create index if not exists velmere_square_posts_author_account_idx
  on public.velmere_square_posts(author_account_id, created_at desc);
create index if not exists velmere_square_comments_author_account_idx
  on public.velmere_square_comments(author_account_id, created_at desc);

alter table public.velmere_profiles enable row level security;
alter table public.velmere_square_posts enable row level security;
alter table public.velmere_square_comments enable row level security;

revoke insert, update, delete on table public.velmere_profiles from anon;
revoke insert, update, delete on table public.velmere_square_posts from anon;
revoke insert, update, delete on table public.velmere_square_comments from anon;

grant select, insert, update on table public.velmere_profiles to authenticated;
grant select, insert on table public.velmere_square_posts to authenticated;
grant select, insert on table public.velmere_square_comments to authenticated;

drop policy if exists velmere_profiles_owner_select on public.velmere_profiles;
drop policy if exists velmere_profiles_owner_insert on public.velmere_profiles;
drop policy if exists velmere_profiles_owner_update on public.velmere_profiles;
create policy velmere_profiles_owner_select
  on public.velmere_profiles for select to authenticated
  using (id = public.velmere_current_account_id());
create policy velmere_profiles_owner_insert
  on public.velmere_profiles for insert to authenticated
  with check (id = public.velmere_current_account_id());
create policy velmere_profiles_owner_update
  on public.velmere_profiles for update to authenticated
  using (id = public.velmere_current_account_id())
  with check (id = public.velmere_current_account_id());

drop policy if exists velmere_square_posts_owner_insert on public.velmere_square_posts;
drop policy if exists velmere_square_posts_owner_select on public.velmere_square_posts;
create policy velmere_square_posts_owner_insert
  on public.velmere_square_posts for insert to authenticated
  with check (
    author_account_id is not null
    and author_account_id = public.velmere_current_account_id()
    and author_type = 'community'
    and moderation_status = 'pending'
  );
create policy velmere_square_posts_owner_select
  on public.velmere_square_posts for select to authenticated
  using (author_account_id = public.velmere_current_account_id());

drop policy if exists velmere_square_comments_owner_insert on public.velmere_square_comments;
drop policy if exists velmere_square_comments_owner_select on public.velmere_square_comments;
create policy velmere_square_comments_owner_insert
  on public.velmere_square_comments for insert to authenticated
  with check (
    author_account_id is not null
    and author_account_id = public.velmere_current_account_id()
    and moderation_status = 'pending'
  );
create policy velmere_square_comments_owner_select
  on public.velmere_square_comments for select to authenticated
  using (author_account_id = public.velmere_current_account_id());

-- Service role remains the only moderation/update/delete path for Square content.
revoke update, delete on table public.velmere_square_posts from authenticated;
revoke update, delete on table public.velmere_square_comments from authenticated;
