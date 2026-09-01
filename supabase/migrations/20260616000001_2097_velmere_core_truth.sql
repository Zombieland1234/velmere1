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

-- ============================================================================
-- PASS2073-2074 TOPKA FOUNDATION: production catalog/admin/order/security schema
-- ============================================================================
-- This block is idempotent. It is the production truth backbone for Velmère.
-- Use Supabase/Postgres service-role only on server routes. Public clients should
-- read only redacted customer-safe views or API responses.

create table if not exists public.velmere_products (
  id text primary key,
  slug text unique not null,
  provider text not null default 'manual',
  provider_product_id text,
  status text not null default 'draft',
  fulfilment_mode text not null default 'disabled',
  title jsonb not null default '{}'::jsonb,
  description jsonb not null default '{}'::jsonb,
  short_description jsonb not null default '{}'::jsonb,
  truth jsonb,
  price_amount integer not null default 0,
  price_currency text not null default 'EUR',
  images jsonb not null default '[]'::jsonb,
  tags text[] not null default '{}',
  collection text,
  is_vlm_locked boolean not null default false,
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint velmere_products_status_check check (status in ('draft','coming_soon','active','sold_out','archived','vlm_locked')),
  constraint velmere_products_provider_check check (provider in ('manual','printful','tapstitch','external')),
  constraint velmere_products_fulfilment_mode_check check (fulfilment_mode in ('disabled','external_link','manual','automatic')),
  constraint velmere_products_currency_check check (price_currency = 'EUR')
);

create table if not exists public.velmere_product_variants (
  id text primary key,
  product_id text not null references public.velmere_products(id) on delete cascade,
  title text not null,
  size text,
  color text,
  sku text,
  provider_variant_id text,
  provider_status text not null default 'unknown',
  stock_quantity integer,
  price_amount integer,
  price_currency text not null default 'EUR',
  available boolean,
  raw_provider_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint velmere_product_variants_provider_status_check check (provider_status in ('synced','unsynced','unknown')),
  constraint velmere_product_variants_currency_check check (price_currency = 'EUR')
);

create table if not exists public.velmere_product_publication_state (
  product_id text primary key references public.velmere_products(id) on delete cascade,
  slug text,
  final_status text not null,
  customer_visibility text not null default 'preview',
  readiness_score integer not null default 0,
  readiness_snapshot jsonb not null default '{}'::jsonb,
  batch_trace_id text not null,
  idempotency_key text,
  updated_by text,
  updated_at timestamptz not null default now(),
  constraint velmere_product_publication_state_status_check check (final_status in ('draft','coming_soon','active','sold_out','archived','vlm_locked')),
  constraint velmere_product_publication_state_visibility_check check (customer_visibility in ('hidden','preview','purchasable'))
);

create table if not exists public.velmere_product_brain_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id text references public.velmere_products(id) on delete cascade,
  draft_id text,
  ai_result jsonb not null default '{}'::jsonb,
  operator_patch jsonb not null default '{}'::jsonb,
  final_result jsonb not null default '{}'::jsonb,
  readiness_score integer not null default 0,
  status text not null default 'review',
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint velmere_product_brain_reviews_status_check check (status in ('draft','review','approved','blocked','published'))
);

create table if not exists public.velmere_order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.velmere_orders(id) on delete cascade,
  order_public_id text,
  event_type text not null,
  severity text not null default 'info',
  source text not null default 'system',
  message text not null,
  redacted_payload jsonb not null default '{}'::jsonb,
  receipt_id text,
  idempotency_key text unique,
  created_at timestamptz not null default now(),
  constraint velmere_order_events_severity_check check (severity in ('info','warning','error','critical'))
);

create table if not exists public.velmere_fulfilment_retry_queue (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.velmere_orders(id) on delete set null,
  provider text not null,
  action text not null,
  status text not null default 'queued',
  attempt_count integer not null default 0,
  max_attempts integer not null default 5,
  next_attempt_at timestamptz,
  last_error_code text,
  last_error_message text,
  redacted_payload jsonb not null default '{}'::jsonb,
  idempotency_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint velmere_fulfilment_retry_queue_status_check check (status in ('queued','running','succeeded','failed','discarded','blocked'))
);

create table if not exists public.velmere_fulfilment_incidents (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.velmere_orders(id) on delete set null,
  retry_queue_id uuid references public.velmere_fulfilment_retry_queue(id) on delete set null,
  status text not null default 'open',
  severity text not null default 'warning',
  assigned_role text not null default 'operator',
  incident_type text not null,
  decision text,
  operator_note text,
  support_packet jsonb not null default '{}'::jsonb,
  redacted_snapshot jsonb not null default '{}'::jsonb,
  receipt_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint velmere_fulfilment_incidents_status_check check (status in ('open','in_review','resolved','escalated','blocked')),
  constraint velmere_fulfilment_incidents_severity_check check (severity in ('info','warning','error','critical'))
);

create table if not exists public.velmere_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id text,
  actor_role text,
  action text not null,
  target_type text not null,
  target_id text,
  redacted_payload jsonb not null default '{}'::jsonb,
  request_id text,
  receipt_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.velmere_admin_sessions (
  id uuid primary key default gen_random_uuid(),
  actor_id text not null,
  actor_email text,
  role text not null default 'viewer',
  session_hash text unique not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint velmere_admin_sessions_role_check check (role in ('owner','operator','support','viewer'))
);

create table if not exists public.velmere_admin_roles (
  actor_id text primary key,
  actor_email text unique,
  role text not null default 'viewer',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint velmere_admin_roles_role_check check (role in ('owner','operator','support','viewer')),
  constraint velmere_admin_roles_status_check check (status in ('active','disabled'))
);

create table if not exists public.velmere_source_receipts (
  id text primary key,
  source_type text not null,
  source_name text not null,
  target_type text not null,
  target_id text not null,
  method_version text not null,
  captured_at timestamptz not null default now(),
  freshness_seconds integer,
  confidence numeric(5,2),
  redacted_evidence jsonb not null default '{}'::jsonb,
  checksum text not null
);

create table if not exists public.velmere_provider_snapshots (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_product_id text,
  provider_variant_id text,
  status text not null default 'captured',
  reliability_score integer not null default 0,
  stock_certainty integer not null default 0,
  mapping_completeness integer not null default 0,
  redacted_snapshot jsonb not null default '{}'::jsonb,
  raw_payload_hash text,
  captured_at timestamptz not null default now(),
  constraint velmere_provider_snapshots_provider_check check (provider in ('printful','tapstitch','manual','external'))
);

alter table public.velmere_products enable row level security;
alter table public.velmere_product_variants enable row level security;
alter table public.velmere_product_publication_state enable row level security;
alter table public.velmere_product_brain_reviews enable row level security;
alter table public.velmere_order_events enable row level security;
alter table public.velmere_fulfilment_retry_queue enable row level security;
alter table public.velmere_fulfilment_incidents enable row level security;
alter table public.velmere_audit_logs enable row level security;
alter table public.velmere_admin_sessions enable row level security;
alter table public.velmere_admin_roles enable row level security;
alter table public.velmere_source_receipts enable row level security;
alter table public.velmere_provider_snapshots enable row level security;

create index if not exists velmere_products_status_idx on public.velmere_products(status, updated_at desc);
create index if not exists velmere_product_variants_product_id_idx on public.velmere_product_variants(product_id);
create index if not exists velmere_product_publication_state_status_idx on public.velmere_product_publication_state(final_status, updated_at desc);
create index if not exists velmere_product_brain_reviews_product_idx on public.velmere_product_brain_reviews(product_id, updated_at desc);
create index if not exists velmere_order_events_order_idx on public.velmere_order_events(order_id, created_at desc);
create index if not exists velmere_fulfilment_retry_queue_status_idx on public.velmere_fulfilment_retry_queue(status, next_attempt_at);
create index if not exists velmere_fulfilment_incidents_status_idx on public.velmere_fulfilment_incidents(status, updated_at desc);
create index if not exists velmere_audit_logs_target_idx on public.velmere_audit_logs(target_type, target_id, created_at desc);
create index if not exists velmere_source_receipts_target_idx on public.velmere_source_receipts(target_type, target_id, captured_at desc);
create index if not exists velmere_provider_snapshots_provider_idx on public.velmere_provider_snapshots(provider, captured_at desc);


-- ============================================================================
-- PASS2075-2079 TOPKA TRUTH: durable order, webhook, provider sandbox backbone
-- ============================================================================
-- These tables are server-only. They store redacted operational state, not raw
-- customer PII, raw provider payloads, or secrets.

create table if not exists public.velmere_order_drafts (
  id text primary key,
  status text not null default 'draft',
  locale text not null default 'en',
  cart_hash text not null,
  stripe_session_id text unique,
  wallet_fingerprint text,
  line_items jsonb not null default '[]'::jsonb,
  guard_summary jsonb not null default '{}'::jsonb,
  replay_snapshot jsonb not null default '{}'::jsonb,
  source_route text not null default 'unknown',
  idempotency_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint velmere_order_drafts_status_check check (status in ('draft','checkout_started','paid','fulfilment_pending','manual_fulfilment_required','fulfilment_created','fulfilled','cancelled','failed','refunded'))
);

create table if not exists public.velmere_order_state_events (
  id uuid primary key default gen_random_uuid(),
  order_draft_id text not null references public.velmere_order_drafts(id) on delete cascade,
  event_type text not null,
  status_before text,
  status_after text,
  stripe_session_id text,
  stripe_event_id text,
  provider text,
  provider_order_id text,
  severity text not null default 'info',
  source_route text not null,
  idempotency_key text unique,
  redacted_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint velmere_order_state_events_severity_check check (severity in ('info','review','warning','error','critical'))
);

create table if not exists public.velmere_provider_contracts (
  id text primary key,
  provider text not null,
  mode text not null default 'sandbox',
  capabilities text[] not null default '{}',
  required_env text[] not null default '{}',
  status text not null default 'contract_ready',
  redacted_config jsonb not null default '{}'::jsonb,
  method_version text not null default 'velmere.provider-contract.v1',
  updated_at timestamptz not null default now(),
  constraint velmere_provider_contracts_provider_check check (provider in ('printful','tapstitch','manual')),
  constraint velmere_provider_contracts_mode_check check (mode in ('sandbox','live','disabled'))
);

create table if not exists public.velmere_provider_sandbox_runs (
  id text primary key,
  provider text not null,
  order_draft_id text,
  status text not null,
  can_execute boolean not null default false,
  reason_codes text[] not null default '{}',
  redacted_request jsonb not null default '{}'::jsonb,
  redacted_response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint velmere_provider_sandbox_runs_provider_check check (provider in ('printful','tapstitch','manual')),
  constraint velmere_provider_sandbox_runs_status_check check (status in ('ready','blocked','executed','failed','skipped'))
);

alter table public.velmere_order_drafts enable row level security;
alter table public.velmere_order_state_events enable row level security;
alter table public.velmere_provider_contracts enable row level security;
alter table public.velmere_provider_sandbox_runs enable row level security;

create index if not exists velmere_order_drafts_status_idx on public.velmere_order_drafts(status, updated_at desc);
create index if not exists velmere_order_drafts_stripe_session_idx on public.velmere_order_drafts(stripe_session_id);
create index if not exists velmere_order_state_events_order_idx on public.velmere_order_state_events(order_draft_id, created_at desc);
create index if not exists velmere_provider_contracts_provider_idx on public.velmere_provider_contracts(provider, updated_at desc);
create index if not exists velmere_provider_sandbox_runs_provider_idx on public.velmere_provider_sandbox_runs(provider, created_at desc);


-- ============================================================================
-- PASS2080-2084 TOPKA SECURITY/OPERATOR: admin sessions, audit, rate, incidents
-- ============================================================================
create table if not exists public.velmere_write_rate_limit_events (
  id uuid primary key default gen_random_uuid(),
  route text not null,
  profile text not null,
  actor_id text,
  client_fingerprint text not null,
  decision text not null,
  limit_count integer not null,
  remaining integer not null,
  reset_at timestamptz not null,
  mode text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.velmere_overlay_qa_receipts (
  id text primary key,
  surface_id text not null,
  surface_type text not null,
  scroll_lock boolean not null default true,
  focus_trap boolean not null default true,
  esc_close boolean not null default true,
  outside_close boolean not null default true,
  reduced_motion_respected boolean not null default true,
  mobile_viewport_safe boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.velmere_write_rate_limit_events enable row level security;
alter table public.velmere_overlay_qa_receipts enable row level security;
create index if not exists velmere_write_rate_limit_events_route_idx on public.velmere_write_rate_limit_events(route, created_at desc);
create index if not exists velmere_overlay_qa_receipts_surface_idx on public.velmere_overlay_qa_receipts(surface_id, created_at desc);

-- PASS2083 public incident case id for deterministic support-safe upsert.
alter table public.velmere_fulfilment_incidents add column if not exists case_id text;
create unique index if not exists velmere_fulfilment_incidents_case_id_idx on public.velmere_fulfilment_incidents(case_id);

-- PASS2097 owner migration proof extras: customer-safe public views and policy boundaries.
create or replace view public.velmere_public_product_truth as
select
  p.id,
  p.slug,
  p.status,
  p.fulfilment_mode,
  p.title,
  p.short_description,
  p.price_amount,
  p.price_currency,
  p.images,
  p.tags,
  p.collection,
  p.truth,
  ps.customer_visibility,
  ps.readiness_score,
  ps.updated_at as publication_updated_at
from public.velmere_products p
left join public.velmere_product_publication_state ps on ps.product_id = p.id
where p.status in ('active','coming_soon')
  and coalesce(ps.customer_visibility, 'preview') in ('preview','purchasable');

-- Public catalog read is limited to customer-safe active/coming-soon rows.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='velmere_products' and policyname='Public can read customer-safe Velmere products') then
    create policy "Public can read customer-safe Velmere products"
      on public.velmere_products for select
      using (status in ('active','coming_soon'));
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='velmere_product_publication_state' and policyname='Public can read customer-safe publication state') then
    create policy "Public can read customer-safe publication state"
      on public.velmere_product_publication_state for select
      using (customer_visibility in ('preview','purchasable'));
  end if;
end $$;

comment on view public.velmere_public_product_truth is 'PASS2097 customer-safe product truth view. No raw provider payloads, PII or secrets.';
