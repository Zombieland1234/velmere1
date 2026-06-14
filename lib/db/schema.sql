-- Velmère production persistence preparation for Supabase/Postgres.
-- Run this in Supabase SQL editor when you are ready to replace mock fallback data.

create table if not exists public.velmere_square_posts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  locale text not null default 'en',
  title text not null,
  body text not null,
  author_name text not null,
  author_handle text not null,
  author_type text not null default 'community',
  image_url text,
  tags text[] not null default '{}',
  views integer not null default 0,
  likes integer not null default 0,
  comments_count integer not null default 0,
  moderation_status text not null default 'pending',
  created_at timestamptz not null default now(),
  created_at_label text
);

create table if not exists public.velmere_square_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.velmere_square_posts(id) on delete cascade,
  author_name text not null,
  body text not null,
  moderation_status text not null default 'pending',
  created_at timestamptz not null default now(),
  created_at_label text
);

-- Profile rows must be keyed by the authenticated session/user id; do not mutate a shared default profile in production.
create table if not exists public.velmere_profiles (
  id text primary key,
  display_name text not null default 'Velmère Member',
  handle text not null default 'velmere.member',
  bio text not null default '',
  last_name_change timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.velmere_square_posts enable row level security;
alter table public.velmere_square_comments enable row level security;
alter table public.velmere_profiles enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'velmere_square_posts' and policyname = 'Public can read approved Velmere Square posts') then
    create policy "Public can read approved Velmere Square posts"
      on public.velmere_square_posts for select
      using (moderation_status in ('approved', 'pending'));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'velmere_square_comments' and policyname = 'Public can read visible Velmere Square comments') then
    create policy "Public can read visible Velmere Square comments"
      on public.velmere_square_comments for select
      using (moderation_status in ('approved', 'pending'));
  end if;
end $$;

-- Production commerce order persistence.
create table if not exists public.velmere_orders (
  id uuid primary key default gen_random_uuid(),
  stripe_session_id text unique not null,
  status text not null default 'checkout_completed',
  locale text not null default 'en',
  wallet_address text,
  currency text,
  amount_total integer not null default 0,
  amount_subtotal integer,
  amount_tax integer,
  customer_email text,
  customer_name text,
  customer_phone text,
  customer_details jsonb,
  shipping_details jsonb,
  billing_details jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.velmere_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.velmere_orders(id) on delete cascade,
  line_index integer not null default 0,
  product_id text not null,
  variant_id text,
  selected_size text,
  quantity integer not null default 1,
  title text,
  unit_amount integer,
  currency text,
  provider text,
  provider_variant_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(order_id, line_index)
);

alter table public.velmere_orders enable row level security;
alter table public.velmere_order_items enable row level security;

create index if not exists velmere_orders_stripe_session_id_idx on public.velmere_orders(stripe_session_id);
create index if not exists velmere_orders_customer_email_idx on public.velmere_orders(customer_email);
create index if not exists velmere_order_items_order_id_idx on public.velmere_order_items(order_id);


-- Stripe webhook idempotency ledger. Keep RLS enabled and use only server/service-role writes.
create table if not exists public.velmere_stripe_webhook_events (
  id text primary key,
  type text not null,
  processed_at timestamptz not null default now()
);

alter table public.velmere_stripe_webhook_events enable row level security;
create index if not exists velmere_stripe_webhook_events_processed_at_idx on public.velmere_stripe_webhook_events(processed_at);

-- PASS2025: server-side paid VLM service entitlements.
-- These rows are created by Stripe webhooks or checkout verification after payment_status=paid.
create table if not exists public.velmere_vlm_paid_entitlements (
  id text primary key,
  stripe_session_id text not null,
  stripe_customer_id text,
  product_id text not null,
  access_scope text not null,
  status text not null default 'active',
  context_hash text not null,
  context jsonb not null default '{}'::jsonb,
  locale text not null default 'en',
  amount_total integer,
  currency text,
  customer_email text,
  customer_name text,
  payment_status text,
  source text not null default 'stripe_webhook',
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(stripe_session_id, product_id, context_hash)
);

create table if not exists public.velmere_vlm_audit_human_queue (
  id text primary key,
  entitlement_id text references public.velmere_vlm_paid_entitlements(id) on delete set null,
  stripe_session_id text unique not null,
  status text not null default 'paid_waiting_human_review',
  locale text not null default 'en',
  project_name text,
  asset_id text,
  request_id text,
  customer_email text,
  context jsonb not null default '{}'::jsonb,
  private_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.velmere_vlm_paid_entitlements enable row level security;
alter table public.velmere_vlm_audit_human_queue enable row level security;

create index if not exists velmere_vlm_paid_entitlements_session_idx on public.velmere_vlm_paid_entitlements(stripe_session_id);
create index if not exists velmere_vlm_paid_entitlements_context_idx on public.velmere_vlm_paid_entitlements(product_id, context_hash, status);
create index if not exists velmere_vlm_paid_entitlements_customer_idx on public.velmere_vlm_paid_entitlements(customer_email);
create index if not exists velmere_vlm_audit_human_queue_status_idx on public.velmere_vlm_audit_human_queue(status, updated_at);
