-- V4 account-data export: one owner-bound durable snapshot, one exact JSON blob.
-- This is a technical export of the explicitly enumerated current account data
-- planes. It does not self-certify legal DSAR scope or retention compliance.

begin;

create extension if not exists pgcrypto;

create table if not exists public.velmere_account_data_exports (
  schema_version text not null default 'velmere.account-data-export-record.v1',
  export_id uuid primary key,
  account_id text not null,
  account_id_hash text not null,
  idempotency_key_hash text not null,
  payload_schema_version text not null default 'velmere.account-data-export-payload.v1',
  payload_text text not null,
  payload_sha256 text not null,
  payload_byte_length integer not null,
  generated_at timestamptz not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (account_id_hash, idempotency_key_hash),
  constraint velmere_account_data_export_contract_check check (
    schema_version = 'velmere.account-data-export-record.v1'
    and account_id ~ '^[A-Za-z0-9][A-Za-z0-9:._-]{5,119}$'
    and account_id not like 'preview:%'
    and account_id_hash ~ '^[a-f0-9]{64}$'
    and account_id_hash = encode(digest('velmere-account-binding-v1:' || account_id, 'sha256'), 'hex')
    and idempotency_key_hash ~ '^[a-f0-9]{64}$'
    and payload_schema_version = 'velmere.account-data-export-payload.v1'
    and payload_sha256 ~ '^sha256:[a-f0-9]{64}$'
    and payload_byte_length between 2 and 8388608
    and octet_length(payload_text) = payload_byte_length
    and payload_sha256 = 'sha256:' || encode(digest(convert_to(payload_text, 'utf8'), 'sha256'), 'hex')
    and (payload_text::jsonb)->>'schemaVersion' = payload_schema_version
    and (payload_text::jsonb)->>'exportId' = export_id::text
    and (payload_text::jsonb)->>'classification' = 'CUSTOMER_PRIVATE'
    and (payload_text::jsonb)#>>'{account,accountId}' = account_id
    and (payload_text::jsonb)#>>'{scope,legalDsrCompleteness}' = 'false'
    and expires_at = generated_at + interval '24 hours'
  )
);

alter table public.velmere_account_data_exports enable row level security;
revoke all on table public.velmere_account_data_exports from public, anon, authenticated, service_role;
grant select on table public.velmere_account_data_exports to authenticated;

create index if not exists velmere_account_data_exports_owner_time_idx
  on public.velmere_account_data_exports(account_id_hash, generated_at desc);
create index if not exists velmere_account_data_exports_expiry_idx
  on public.velmere_account_data_exports(expires_at);

drop policy if exists v4_account_data_export_owner_select on public.velmere_account_data_exports;
create policy v4_account_data_export_owner_select
on public.velmere_account_data_exports
for select to authenticated
using (
  account_id = public.velmere_current_account_id()
  and account_id_hash = public.velmere_current_account_binding_hash()
  and expires_at > now()
);

create or replace function public.velmere_account_data_export_immutable_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  raise exception 'account_data_export_immutable' using errcode = '23514';
end;
$$;

drop trigger if exists velmere_account_data_export_immutable
  on public.velmere_account_data_exports;
create trigger velmere_account_data_export_immutable
before update on public.velmere_account_data_exports
for each row execute function public.velmere_account_data_export_immutable_guard();

revoke all on function public.velmere_account_data_export_immutable_guard()
  from public, anon, authenticated, service_role;

-- Remove the historical mutable-email fallback from the customer-message RLS
-- boundary. A verified JWT still has to resolve to the exact durable account.
drop policy if exists velmere_audit_account_messages_owner_select
  on public.velmere_audit_account_messages;
create policy velmere_audit_account_messages_owner_select
on public.velmere_audit_account_messages
for select to authenticated
using (
  account_id is not null
  and account_id = public.velmere_current_account_id()
);

drop policy if exists velmere_audit_delivery_receipts_owner_select
  on public.velmere_audit_delivery_receipts;
create policy velmere_audit_delivery_receipts_owner_select
on public.velmere_audit_delivery_receipts
for select to authenticated
using (
  account_id is not null
  and account_id = public.velmere_current_account_id()
);

create or replace function public.velmere_create_account_data_export_v1(
  p_export_id uuid,
  p_idempotency_key_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_account_id text;
  v_account_hash text;
  v_resource_hash text;
  v_email text;
  v_generated_at timestamptz;
  v_expires_at timestamptz;
  v_payload jsonb;
  v_payload_text text;
  v_payload_sha256 text;
  v_payload_byte_length integer;
  v_existing public.velmere_account_data_exports%rowtype;
  v_record public.velmere_account_data_exports%rowtype;
  v_profile jsonb;
  v_posts jsonb;
  v_comments jsonb;
  v_angel_memories jsonb;
  v_orders jsonb;
  v_order_items jsonb;
  v_order_events jsonb;
  v_order_drafts jsonb;
  v_order_state_events jsonb;
  v_entitlements jsonb;
  v_audit_cases jsonb;
  v_audit_messages jsonb;
  v_audit_receipts jsonb;
  v_artifacts jsonb;
  v_pdf_manifests jsonb;
  v_count bigint;
begin
  if auth.role() is distinct from 'authenticated' or auth.uid() is null then
    raise exception 'account_data_export_auth_required' using errcode = '42501';
  end if;
  if p_export_id is null or p_idempotency_key_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'account_data_export_invalid_request' using errcode = '22023';
  end if;

  v_account_id := public.velmere_current_account_id();
  v_account_hash := public.velmere_current_account_binding_hash();
  if v_account_id is null
     or v_account_id !~ '^[A-Za-z0-9][A-Za-z0-9:._-]{5,119}$'
     or v_account_id like 'preview:%'
     or v_account_hash is null
     or v_account_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'account_data_export_account_unbound' using errcode = '42501';
  end if;
  if v_account_hash <> encode(digest('velmere-account-binding-v1:' || v_account_id, 'sha256'), 'hex') then
    raise exception 'account_data_export_account_binding_invalid' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('account-data-export:' || v_account_hash, 0));

  select * into v_existing
  from public.velmere_account_data_exports
  where account_id_hash = v_account_hash
    and idempotency_key_hash = p_idempotency_key_hash;
  if found then
    return jsonb_build_object(
      'schema_version', v_existing.schema_version,
      'export_id', v_existing.export_id,
      'account_id', v_existing.account_id,
      'account_id_hash', v_existing.account_id_hash,
      'idempotency_key_hash', v_existing.idempotency_key_hash,
      'payload_schema_version', v_existing.payload_schema_version,
      'payload_text', v_existing.payload_text,
      'payload_sha256', v_existing.payload_sha256,
      'payload_byte_length', v_existing.payload_byte_length,
      'generated_at', v_existing.generated_at,
      'expires_at', v_existing.expires_at,
      'created_at', v_existing.created_at
    );
  end if;

  if (select count(*) from public.velmere_account_data_exports
      where account_id_hash = v_account_hash and generated_at > now() - interval '1 hour') >= 3 then
    raise exception 'account_data_export_rate_limited' using errcode = 'P0001';
  end if;

  v_resource_hash := encode(digest(v_account_id, 'sha256'), 'hex');
  v_email := lower(nullif(trim(auth.jwt()->>'email'), ''));
  if v_email is not null and (length(v_email) > 254 or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') then
    v_email := null;
  end if;

  -- Hard caps prevent one synchronous export from becoming an unbounded DB or
  -- response operation. The RPC fails instead of silently truncating records.
  select count(*) into v_count from public.velmere_square_posts where author_account_id = v_account_id;
  if v_count > 500 then raise exception 'account_data_export_scope_exceeds_bound' using errcode = '54000'; end if;
  select count(*) into v_count from public.velmere_square_comments where author_account_id = v_account_id;
  if v_count > 1000 then raise exception 'account_data_export_scope_exceeds_bound' using errcode = '54000'; end if;
  select count(*) into v_count from public.velmere_angel_memories m
    join public.velmere_account_resource_bindings b
      on b.resource_type = 'angel_session' and b.resource_id = m.session_hash
    where b.account_id = v_account_id and b.account_id_hash = v_resource_hash;
  if v_count > 100 then raise exception 'account_data_export_scope_exceeds_bound' using errcode = '54000'; end if;
  select count(*) into v_count from public.velmere_orders o
    join public.velmere_account_resource_bindings b
      on b.resource_type = 'order' and b.resource_id = o.id::text
    where b.account_id = v_account_id and b.account_id_hash = v_resource_hash;
  if v_count > 500 then raise exception 'account_data_export_scope_exceeds_bound' using errcode = '54000'; end if;
  select count(*) into v_count from public.velmere_order_items i
    join public.velmere_account_resource_bindings b
      on b.resource_type = 'order' and b.resource_id = i.order_id::text
    where b.account_id = v_account_id and b.account_id_hash = v_resource_hash;
  if v_count > 2000 then raise exception 'account_data_export_scope_exceeds_bound' using errcode = '54000'; end if;
  select count(*) into v_count from public.velmere_order_events e
    join public.velmere_account_resource_bindings b
      on b.resource_type = 'order' and b.resource_id = e.order_id::text
    where b.account_id = v_account_id and b.account_id_hash = v_resource_hash;
  if v_count > 5000 then raise exception 'account_data_export_scope_exceeds_bound' using errcode = '54000'; end if;
  select count(*) into v_count from public.velmere_order_drafts d
    join public.velmere_account_resource_bindings b
      on b.resource_type = 'order_draft' and b.resource_id = d.id
    where b.account_id = v_account_id and b.account_id_hash = v_resource_hash;
  if v_count > 500 then raise exception 'account_data_export_scope_exceeds_bound' using errcode = '54000'; end if;
  select count(*) into v_count from public.velmere_order_state_events e
    join public.velmere_account_resource_bindings b
      on b.resource_type = 'order_draft' and b.resource_id = e.order_draft_id
    where b.account_id = v_account_id and b.account_id_hash = v_resource_hash;
  if v_count > 5000 then raise exception 'account_data_export_scope_exceeds_bound' using errcode = '54000'; end if;
  select count(*) into v_count from public.velmere_vlm_paid_entitlements e
    join public.velmere_account_resource_bindings b
      on b.resource_type = 'entitlement' and b.resource_id = e.id
    where b.account_id = v_account_id and b.account_id_hash = v_resource_hash;
  if v_count > 500 then raise exception 'account_data_export_scope_exceeds_bound' using errcode = '54000'; end if;
  select count(*) into v_count from public.velmere_audit_intake_cases where account_id = v_account_id;
  if v_count > 500 then raise exception 'account_data_export_scope_exceeds_bound' using errcode = '54000'; end if;
  select count(*) into v_count from public.velmere_audit_account_messages where account_id = v_account_id;
  if v_count > 500 then raise exception 'account_data_export_scope_exceeds_bound' using errcode = '54000'; end if;
  select count(*) into v_count from public.velmere_audit_delivery_receipts where account_id = v_account_id;
  if v_count > 500 then raise exception 'account_data_export_scope_exceeds_bound' using errcode = '54000'; end if;
  select count(*) into v_count from public.velmere_customer_artifact_snapshots
    where account_id = v_account_id and account_id_hash = v_account_hash;
  if v_count > 100 then raise exception 'account_data_export_scope_exceeds_bound' using errcode = '54000'; end if;
  select count(*) into v_count from public.velmere_customer_artifact_pdf_blobs
    where account_id = v_account_id and account_id_hash = v_account_hash;
  if v_count > 100 then raise exception 'account_data_export_scope_exceeds_bound' using errcode = '54000'; end if;

  select to_jsonb(p) - 'id' into v_profile
  from public.velmere_profiles p where p.id = v_account_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id, 'slug', p.slug, 'locale', p.locale, 'title', p.title,
    'body', p.body, 'authorName', p.author_name, 'authorHandle', p.author_handle,
    'imageUrl', p.image_url, 'tags', p.tags, 'moderationStatus', p.moderation_status,
    'createdAt', p.created_at
  ) order by p.created_at, p.id), '[]'::jsonb) into v_posts
  from public.velmere_square_posts p where p.author_account_id = v_account_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id, 'postId', c.post_id, 'authorName', c.author_name,
    'body', c.body, 'moderationStatus', c.moderation_status, 'createdAt', c.created_at
  ) order by c.created_at, c.id), '[]'::jsonb) into v_comments
  from public.velmere_square_comments c where c.author_account_id = v_account_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'sessionFingerprint', m.session_hash, 'locale', m.locale, 'lane', m.lane,
    'summary', m.summary, 'recentTopics', m.recent_topics,
    'turnCount', m.turn_count, 'updatedAt', m.updated_at
  ) order by m.updated_at, m.session_hash), '[]'::jsonb) into v_angel_memories
  from public.velmere_angel_memories m
  join public.velmere_account_resource_bindings b
    on b.resource_type = 'angel_session' and b.resource_id = m.session_hash
  where b.account_id = v_account_id and b.account_id_hash = v_resource_hash;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', o.id, 'status', o.status, 'locale', o.locale,
    'walletAddress', o.wallet_address, 'currency', o.currency,
    'amountTotal', o.amount_total, 'amountSubtotal', o.amount_subtotal,
    'amountTax', o.amount_tax, 'customerEmail', o.customer_email,
    'customerName', o.customer_name, 'customerPhone', o.customer_phone,
    'customerDetails', o.customer_details, 'shippingDetails', o.shipping_details,
    'billingDetails', o.billing_details, 'metadata', o.metadata,
    'createdAt', o.created_at, 'updatedAt', o.updated_at
  ) order by o.created_at, o.id), '[]'::jsonb) into v_orders
  from public.velmere_orders o
  join public.velmere_account_resource_bindings b
    on b.resource_type = 'order' and b.resource_id = o.id::text
  where b.account_id = v_account_id and b.account_id_hash = v_resource_hash;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', i.id, 'orderId', i.order_id, 'lineIndex', i.line_index,
    'productId', i.product_id, 'variantId', i.variant_id,
    'selectedSize', i.selected_size, 'quantity', i.quantity, 'title', i.title,
    'unitAmount', i.unit_amount, 'currency', i.currency, 'provider', i.provider,
    'providerVariantId', i.provider_variant_id, 'metadata', i.metadata,
    'createdAt', i.created_at
  ) order by i.order_id, i.line_index, i.id), '[]'::jsonb) into v_order_items
  from public.velmere_order_items i
  join public.velmere_account_resource_bindings b
    on b.resource_type = 'order' and b.resource_id = i.order_id::text
  where b.account_id = v_account_id and b.account_id_hash = v_resource_hash;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', e.id, 'orderId', e.order_id, 'orderPublicId', e.order_public_id,
    'eventType', e.event_type, 'severity', e.severity, 'source', e.source,
    'message', e.message, 'redactedPayload', e.redacted_payload,
    'receiptId', e.receipt_id, 'createdAt', e.created_at
  ) order by e.created_at, e.id), '[]'::jsonb) into v_order_events
  from public.velmere_order_events e
  join public.velmere_account_resource_bindings b
    on b.resource_type = 'order' and b.resource_id = e.order_id::text
  where b.account_id = v_account_id and b.account_id_hash = v_resource_hash;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', d.id, 'status', d.status, 'locale', d.locale,
    'cartHash', d.cart_hash, 'walletFingerprint', d.wallet_fingerprint,
    'lineItems', d.line_items, 'guardSummary', d.guard_summary,
    'replaySnapshot', d.replay_snapshot, 'sourceRoute', d.source_route,
    'createdAt', d.created_at, 'updatedAt', d.updated_at
  ) order by d.created_at, d.id), '[]'::jsonb) into v_order_drafts
  from public.velmere_order_drafts d
  join public.velmere_account_resource_bindings b
    on b.resource_type = 'order_draft' and b.resource_id = d.id
  where b.account_id = v_account_id and b.account_id_hash = v_resource_hash;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', e.id, 'orderDraftId', e.order_draft_id, 'eventType', e.event_type,
    'statusBefore', e.status_before, 'statusAfter', e.status_after,
    'provider', e.provider, 'providerOrderId', e.provider_order_id,
    'severity', e.severity, 'sourceRoute', e.source_route,
    'redactedPayload', e.redacted_payload, 'createdAt', e.created_at
  ) order by e.created_at, e.id), '[]'::jsonb) into v_order_state_events
  from public.velmere_order_state_events e
  join public.velmere_account_resource_bindings b
    on b.resource_type = 'order_draft' and b.resource_id = e.order_draft_id
  where b.account_id = v_account_id and b.account_id_hash = v_resource_hash;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', e.id, 'productId', e.product_id, 'accessScope', e.access_scope,
    'status', e.status, 'contextHash', e.context_hash, 'context', e.context,
    'locale', e.locale, 'amountTotal', e.amount_total, 'currency', e.currency,
    'customerEmail', e.customer_email, 'customerName', e.customer_name,
    'paymentStatus', e.payment_status, 'source', e.source,
    'expiresAt', e.expires_at, 'createdAt', e.created_at, 'updatedAt', e.updated_at
  ) order by e.created_at, e.id), '[]'::jsonb) into v_entitlements
  from public.velmere_vlm_paid_entitlements e
  join public.velmere_account_resource_bindings b
    on b.resource_type = 'entitlement' and b.resource_id = e.id
  where b.account_id = v_account_id and b.account_id_hash = v_resource_hash;

  select coalesce(jsonb_agg(jsonb_build_object(
    'caseRef', c.case_ref, 'requestId', c.request_id, 'targetKind', c.target_kind,
    'targetHash', c.target_hash, 'displayLabel', c.display_label, 'tier', c.tier,
    'locale', c.locale, 'status', c.status,
    'entitlementRequired', c.entitlement_required,
    'entitlementVerified', c.entitlement_verified,
    'analysisStarted', c.analysis_started, 'createdAt', c.created_at,
    'updatedAt', c.updated_at
  ) order by c.created_at, c.case_id), '[]'::jsonb) into v_audit_cases
  from public.velmere_audit_intake_cases c where c.account_id = v_account_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', m.id, 'messageId', m.message_id, 'requestId', m.request_id,
    'locale', m.locale, 'reviewLevel', m.review_level, 'projectName', m.project_name,
    'contractAddress', m.contract_address, 'packageLabel', m.package_label,
    'messageStatus', m.message_status, 'deliveryChannel', m.delivery_channel,
    'deliveryStatus', m.delivery_status, 'pdfRoute', m.pdf_route,
    'customerSafeReport', m.customer_safe_report,
    'canonicalCustomerSnapshot', m.canonical_customer_snapshot,
    'publicReportRoute', m.public_report_route, 'exportRoute', m.export_route,
    'message', m.message, 'deliveredAt', m.delivered_at,
    'createdAt', m.created_at, 'updatedAt', m.updated_at
  ) order by m.created_at, m.id), '[]'::jsonb) into v_audit_messages
  from public.velmere_audit_account_messages m where m.account_id = v_account_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'receiptId', r.receipt_id, 'status', r.status, 'locale', r.locale,
    'deliveredAt', r.delivered_at, 'messageId', r.message_id,
    'requestId', r.request_id, 'accountMessageId', r.account_message_id,
    'reportId', r.report_id, 'customerSafeReportStatus', r.customer_safe_report_status,
    'customerSafeLinks', r.customer_safe_links, 'integrityToken', r.checksum,
    'createdAt', r.created_at
  ) order by r.delivered_at, r.id), '[]'::jsonb) into v_audit_receipts
  from public.velmere_audit_delivery_receipts r where r.account_id = v_account_id;

  select coalesce(jsonb_agg(s.snapshot order by s.generated_at, s.snapshot_id), '[]'::jsonb)
  into v_artifacts
  from public.velmere_customer_artifact_snapshots s
  where s.account_id = v_account_id and s.account_id_hash = v_account_hash;

  select coalesce(jsonb_agg(jsonb_build_object(
    'blobId', b.blob_id, 'snapshotId', b.snapshot_id, 'surface', b.surface,
    'reportId', b.report_id, 'artifactDigest', b.artifact_digest,
    'pdfDigest', b.pdf_digest, 'pdfByteLength', b.pdf_byte_length,
    'mimeType', b.mime_type, 'createdAt', b.created_at,
    'recordDigest', b.record_digest
  ) order by b.created_at, b.blob_id), '[]'::jsonb) into v_pdf_manifests
  from public.velmere_customer_artifact_pdf_blobs b
  where b.account_id = v_account_id and b.account_id_hash = v_account_hash;

  v_generated_at := clock_timestamp();
  v_expires_at := v_generated_at + interval '24 hours';
  v_payload := jsonb_build_object(
    'schemaVersion', 'velmere.account-data-export-payload.v1',
    'exportId', p_export_id,
    'generatedAt', to_char(v_generated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'availableUntil', to_char(v_expires_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'classification', 'CUSTOMER_PRIVATE',
    'scope', jsonb_build_object(
      'schemaVersion', 'velmere.account-data-export-scope.v1',
      'technicalScopeComplete', true,
      'legalDsrCompleteness', false,
      'included', jsonb_build_array(
        'account binding and verified JWT email', 'profile', 'authored community content',
        'Angel memory summaries', 'commerce records', 'entitlements',
        'customer-safe audit records', 'customer artifact snapshots and PDF manifests'
      ),
      'excluded', jsonb_build_array(
        'password hashes and managed-auth provider internals', 'secrets and credentials',
        'raw payment/provider payloads', 'raw operator notes and internal review material',
        'binary artifact bytes (downloaded through their account-bound artifact route)',
        'backup copies and legally privileged material pending owner/legal disposition'
      ),
      'retentionDecision', 'OWNER_LEGAL_REVIEW_REQUIRED',
      'retrievalLeaseHours', 24,
      'noFinalCredit', true
    ),
    'account', jsonb_build_object(
      'accountId', v_account_id,
      'email', v_email
    ),
    'data', jsonb_build_object(
      'profile', v_profile,
      'community', jsonb_build_object('posts', v_posts, 'comments', v_comments),
      'angelMemories', v_angel_memories,
      'commerce', jsonb_build_object(
        'orders', v_orders, 'orderItems', v_order_items, 'orderEvents', v_order_events,
        'orderDrafts', v_order_drafts, 'orderStateEvents', v_order_state_events,
        'entitlements', v_entitlements
      ),
      'audit', jsonb_build_object(
        'cases', v_audit_cases, 'messages', v_audit_messages,
        'deliveryReceipts', v_audit_receipts
      ),
      'artifacts', jsonb_build_object(
        'snapshots', v_artifacts, 'pdfManifests', v_pdf_manifests
      )
    )
  );
  v_payload_text := v_payload::text;
  v_payload_byte_length := octet_length(v_payload_text);
  if v_payload_byte_length < 2 or v_payload_byte_length > 8388608 then
    raise exception 'account_data_export_payload_too_large' using errcode = '54000';
  end if;
  v_payload_sha256 := 'sha256:' || encode(digest(convert_to(v_payload_text, 'utf8'), 'sha256'), 'hex');

  insert into public.velmere_account_data_exports(
    export_id, account_id, account_id_hash, idempotency_key_hash,
    payload_text, payload_sha256, payload_byte_length, generated_at, expires_at
  ) values (
    p_export_id, v_account_id, v_account_hash, p_idempotency_key_hash,
    v_payload_text, v_payload_sha256, v_payload_byte_length, v_generated_at, v_expires_at
  ) returning * into v_record;

  return jsonb_build_object(
    'schema_version', v_record.schema_version,
    'export_id', v_record.export_id,
    'account_id', v_record.account_id,
    'account_id_hash', v_record.account_id_hash,
    'idempotency_key_hash', v_record.idempotency_key_hash,
    'payload_schema_version', v_record.payload_schema_version,
    'payload_text', v_record.payload_text,
    'payload_sha256', v_record.payload_sha256,
    'payload_byte_length', v_record.payload_byte_length,
    'generated_at', v_record.generated_at,
    'expires_at', v_record.expires_at,
    'created_at', v_record.created_at
  );
end;
$$;

revoke all on function public.velmere_create_account_data_export_v1(uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function public.velmere_create_account_data_export_v1(uuid, text)
  to authenticated;

create or replace function public.velmere_purge_expired_account_data_exports_v1(
  p_limit integer default 100
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_deleted integer;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'account_data_export_purge_forbidden' using errcode = '42501';
  end if;
  if p_limit < 1 or p_limit > 1000 then
    raise exception 'account_data_export_purge_invalid_limit' using errcode = '22023';
  end if;
  delete from public.velmere_account_data_exports
  where export_id in (
    select export_id from public.velmere_account_data_exports
    where expires_at <= now()
    order by expires_at
    limit p_limit
    for update skip locked
  );
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.velmere_purge_expired_account_data_exports_v1(integer)
  from public, anon, authenticated, service_role;
grant execute on function public.velmere_purge_expired_account_data_exports_v1(integer)
  to service_role;

comment on table public.velmere_account_data_exports is
  'Owner-bound immutable 24-hour retrieval snapshot. Exact UTF-8 JSON text is stored once and served without reserialization; legal DSAR completeness and retention remain owner/legal review items.';
comment on function public.velmere_create_account_data_export_v1(uuid, text) is
  'Authenticated, account-bound, account-scoped-idempotent technical export builder with hard row and byte caps. No FINAL, legal or staging credit.';

commit;
