-- PASS4717 MEGA-PASS: public Square exposes approved content only; owner JWT can read own pending rows.

alter table public.velmere_profiles enable row level security;
alter table public.velmere_square_posts enable row level security;
alter table public.velmere_square_comments enable row level security;

-- Replace the historical policy that exposed pending rows publicly.
drop policy if exists "Public can read approved Velmere Square posts" on public.velmere_square_posts;
create policy "Public can read approved Velmere Square posts"
  on public.velmere_square_posts for select
  to anon, authenticated
  using (moderation_status = 'approved');

drop policy if exists "Public can read approved Velmere Square comments" on public.velmere_square_comments;
create policy "Public can read approved Velmere Square comments"
  on public.velmere_square_comments for select
  to anon, authenticated
  using (moderation_status = 'approved');

-- PASS4716 owner policies remain additive: authenticated users can also read their own rows.
-- Public/anon writes stay revoked. Service role remains the only moderation path.
revoke insert, update, delete on table public.velmere_profiles from anon;
revoke insert, update, delete on table public.velmere_square_posts from anon;
revoke insert, update, delete on table public.velmere_square_comments from anon;
