import type Stripe from "stripe";
import { getSupabaseServerClient, hasSupabaseConfig } from "@/lib/db/supabase";
import {
  getVlmPaidProduct,
  normalizePaidContext,
  normalizeVlmPaidProductId,
  type VlmPaidAccessContext,
  type VlmPaidProductId,
} from "@/lib/commerce/pass2024-vlm-paid-access";
import {
  hashVlmPaidAccessContext,
  verifyVlmPaidAccessToken,
  type VlmPaidAccessTokenPayload,
} from "@/lib/commerce/pass2024-vlm-paid-access-server";

export const PASS2025_VLM_ENTITLEMENT_LEDGER_ID = "pass2025-vlm-paid-entitlement-ledger-webhook-queue" as const;
export const PASS2025_VLM_ENTITLEMENT_LEDGER_TASKS = 88 as const;

export type VlmPaidEntitlementStatus = "paid" | "active" | "expired" | "refunded" | "consumed";
export type VlmPaidEntitlementSource = "stripe_webhook" | "checkout_verify" | "manual_repair";

export type VlmPaidEntitlementRecord = {
  id: string;
  stripeSessionId: string;
  stripeCustomerId?: string | null;
  productId: VlmPaidProductId;
  accessScope: string;
  status: VlmPaidEntitlementStatus;
  contextHash: string;
  context: VlmPaidAccessContext;
  locale: VlmPaidAccessContext["locale"];
  amountTotal: number | null;
  currency: string | null;
  customerEmail?: string | null;
  customerName?: string | null;
  paymentStatus?: string | null;
  source: VlmPaidEntitlementSource;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  auditQueueId?: string | null;
};

export type VlmPaidAccessEntitlementVerdict =
  | {
      ok: true;
      payload: VlmPaidAccessTokenPayload;
      entitlement?: VlmPaidEntitlementRecord | null;
      ledgerMode: "durable" | "memory" | "token_only_non_production";
      warning?: string;
    }
  | {
      ok: false;
      error: string;
      tokenPayload?: VlmPaidAccessTokenPayload;
      ledgerMode?: "durable" | "memory" | "token_only_non_production";
    };

type MemoryEntitlementKey = string;

const memoryEntitlements = new Map<MemoryEntitlementKey, VlmPaidEntitlementRecord>();
const memoryAuditQueue = new Map<string, VlmPaidEntitlementRecord>();

function nowIso(now = new Date()) {
  return now.toISOString();
}

function safeId(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9:_-]+/g, "-").slice(0, 180);
}

function entitlementKey(args: { stripeSessionId: string; productId: VlmPaidProductId; contextHash: string }) {
  return `${args.stripeSessionId}:${args.productId}:${args.contextHash}`;
}

function resolvePaidAccessTtlMs() {
  const raw = Number(process.env.VELMERE_PAID_ACCESS_TTL_MS);
  if (Number.isFinite(raw) && raw >= 1000 * 60 * 10 && raw <= 1000 * 60 * 60 * 24 * 365) return raw;
  return 1000 * 60 * 60 * 24 * 30;
}

function customerIdFromSession(session: Stripe.Checkout.Session) {
  if (!session.customer) return null;
  return typeof session.customer === "string" ? session.customer : session.customer.id;
}

function buildContextFromSession(session: Stripe.Checkout.Session): VlmPaidAccessContext | null {
  const locale = session.metadata?.locale === "pl" || session.metadata?.locale === "de" || session.metadata?.locale === "en"
    ? session.metadata.locale
    : "en";
  const surface = session.metadata?.surface as VlmPaidAccessContext["surface"] | undefined;
  const depth = session.metadata?.depth as VlmPaidAccessContext["depth"] | undefined;
  return normalizePaidContext({
    surface,
    locale,
    assetId: session.metadata?.assetId || undefined,
    symbol: session.metadata?.symbol || undefined,
    depth,
    requestId: session.metadata?.requestId || undefined,
    returnPath: session.metadata?.returnPath || undefined,
  }, locale);
}

function statusFromSession(session: Stripe.Checkout.Session): VlmPaidEntitlementStatus {
  if (session.payment_status === "paid") return "active";
  return "paid";
}

function buildMemoryRecord(args: {
  session: Stripe.Checkout.Session;
  productId: VlmPaidProductId;
  context: VlmPaidAccessContext;
  source: VlmPaidEntitlementSource;
  now?: Date;
}): VlmPaidEntitlementRecord {
  const now = args.now ?? new Date();
  const contextHash = hashVlmPaidAccessContext(args.context);
  const product = getVlmPaidProduct(args.productId, args.context.locale);
  const expiresAt = new Date(now.getTime() + resolvePaidAccessTtlMs()).toISOString();
  return {
    id: safeId(`vlm_entitlement_${args.session.id}_${args.productId}_${contextHash.slice(0, 12)}`),
    stripeSessionId: args.session.id,
    stripeCustomerId: customerIdFromSession(args.session),
    productId: args.productId,
    accessScope: product.accessScope,
    status: statusFromSession(args.session),
    contextHash,
    context: args.context,
    locale: args.context.locale,
    amountTotal: args.session.amount_total ?? null,
    currency: args.session.currency?.toUpperCase() ?? null,
    customerEmail: args.session.customer_details?.email ?? null,
    customerName: args.session.customer_details?.name ?? null,
    paymentStatus: args.session.payment_status,
    source: args.source,
    createdAt: nowIso(now),
    updatedAt: nowIso(now),
    expiresAt,
    auditQueueId: args.productId === "vlm_advanced_audit_human_review"
      ? safeId(`vlm_audit_queue_${args.session.id}_${contextHash.slice(0, 12)}`)
      : null,
  };
}

function shouldAcceptSession(session: Stripe.Checkout.Session) {
  return session.metadata?.kind === "vlm_paid_access" && session.payment_status === "paid";
}

function redactedEmail(email?: string | null) {
  if (!email) return null;
  const [name, domain] = email.split("@");
  if (!domain) return "[redacted]";
  return `${name.slice(0, 2)}***@${domain}`;
}

async function persistEntitlementToSupabase(record: VlmPaidEntitlementRecord) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { persisted: false as const, reason: "supabase_unavailable" };

  const { error } = await supabase
    .from("velmere_vlm_paid_entitlements")
    .upsert({
      id: record.id,
      stripe_session_id: record.stripeSessionId,
      stripe_customer_id: record.stripeCustomerId ?? null,
      product_id: record.productId,
      access_scope: record.accessScope,
      status: record.status,
      context_hash: record.contextHash,
      context: record.context,
      locale: record.locale,
      amount_total: record.amountTotal,
      currency: record.currency,
      customer_email: record.customerEmail ?? null,
      customer_name: record.customerName ?? null,
      payment_status: record.paymentStatus ?? null,
      source: record.source,
      expires_at: record.expiresAt,
      updated_at: record.updatedAt,
    }, { onConflict: "stripe_session_id,product_id,context_hash" });

  if (error) throw error;

  if (record.productId === "vlm_advanced_audit_human_review" && record.auditQueueId) {
    const { error: queueError } = await supabase
      .from("velmere_vlm_audit_human_queue")
      .upsert({
        id: record.auditQueueId,
        entitlement_id: record.id,
        stripe_session_id: record.stripeSessionId,
        status: "paid_waiting_human_review",
        locale: record.locale,
        project_name: record.context.symbol ?? null,
        asset_id: record.context.assetId ?? null,
        request_id: record.context.requestId ?? null,
        customer_email: record.customerEmail ?? null,
        context: record.context,
        private_note: "Created by PASS2025 paid entitlement ledger. Human-reviewed delivery starts after payment confirmation.",
        updated_at: record.updatedAt,
      }, { onConflict: "stripe_session_id" });
    if (queueError) throw queueError;
  }

  return { persisted: true as const };
}

export async function upsertVlmPaidEntitlementFromStripeSession(
  session: Stripe.Checkout.Session,
  source: VlmPaidEntitlementSource,
) {
  const productId = normalizeVlmPaidProductId(session.metadata?.productId);
  const context = buildContextFromSession(session);
  if (!productId || !context) return { ok: false as const, error: "invalid_vlm_paid_session" };
  if (!shouldAcceptSession(session)) return { ok: false as const, error: "payment_not_confirmed" };

  const record = buildMemoryRecord({ session, productId, context, source });
  const key = entitlementKey({ stripeSessionId: record.stripeSessionId, productId: record.productId, contextHash: record.contextHash });
  memoryEntitlements.set(key, record);
  if (record.auditQueueId) memoryAuditQueue.set(record.auditQueueId, record);

  if (!hasSupabaseConfig()) {
    console.info(JSON.stringify({
      system: "velmere.vlm.paid_entitlement",
      persisted: false,
      mode: "memory_fallback",
      reason: "Missing Supabase config; entitlement kept in process memory only.",
      stripeSessionId: record.stripeSessionId,
      productId: record.productId,
      contextHash: record.contextHash,
      customerEmail: redactedEmail(record.customerEmail),
      auditQueueId: record.auditQueueId,
    }));
    return { ok: true as const, record, persisted: false as const, mode: "memory" as const };
  }

  await persistEntitlementToSupabase(record);
  return { ok: true as const, record, persisted: true as const, mode: "durable" as const };
}

async function findDurableEntitlement(args: { sessionId: string; productId: VlmPaidProductId; contextHash: string }) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("velmere_vlm_paid_entitlements")
    .select("*")
    .eq("stripe_session_id", args.sessionId)
    .eq("product_id", args.productId)
    .eq("context_hash", args.contextHash)
    .in("status", ["paid", "active"])
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    stripeSessionId: data.stripe_session_id,
    stripeCustomerId: data.stripe_customer_id,
    productId: data.product_id,
    accessScope: data.access_scope,
    status: data.status,
    contextHash: data.context_hash,
    context: data.context,
    locale: data.locale,
    amountTotal: data.amount_total,
    currency: data.currency,
    customerEmail: data.customer_email,
    customerName: data.customer_name,
    paymentStatus: data.payment_status,
    source: data.source,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    expiresAt: data.expires_at,
    auditQueueId: data.audit_queue_id ?? null,
  } as VlmPaidEntitlementRecord;
}

export async function verifyVlmPaidAccessEntitlement(args: {
  token: string | null | undefined;
  productId: VlmPaidProductId;
  context: Partial<VlmPaidAccessContext>;
  now?: Date;
}): Promise<VlmPaidAccessEntitlementVerdict> {
  const tokenVerdict = verifyVlmPaidAccessToken(args);
  if (!tokenVerdict.ok) return { ok: false, error: tokenVerdict.error };

  const contextHash = hashVlmPaidAccessContext(args.context);
  const lookup = { sessionId: tokenVerdict.payload.sessionId, productId: args.productId, contextHash };
  const memory = memoryEntitlements.get(entitlementKey({ stripeSessionId: lookup.sessionId, productId: lookup.productId, contextHash: lookup.contextHash }));
  const now = (args.now ?? new Date()).getTime();
  if (memory && Date.parse(memory.expiresAt) > now && (memory.status === "paid" || memory.status === "active")) {
    return { ok: true, payload: tokenVerdict.payload, entitlement: memory, ledgerMode: "memory" };
  }

  if (hasSupabaseConfig()) {
    const durable = await findDurableEntitlement(lookup);
    if (durable && Date.parse(durable.expiresAt) > now) {
      return { ok: true, payload: tokenVerdict.payload, entitlement: durable, ledgerMode: "durable" };
    }
    return { ok: false, error: "entitlement_not_found", tokenPayload: tokenVerdict.payload, ledgerMode: "durable" };
  }

  if (process.env.VELMERE_REQUIRE_PAID_ENTITLEMENT_LEDGER === "true") {
    return { ok: false, error: "durable_entitlement_ledger_required", tokenPayload: tokenVerdict.payload };
  }

  return {
    ok: true,
    payload: tokenVerdict.payload,
    entitlement: null,
    ledgerMode: "token_only_non_production",
    warning: "No Supabase entitlement ledger is configured; signed token accepted only in non-production fallback mode.",
  };
}

export function getMemoryVlmPaidEntitlements() {
  return Array.from(memoryEntitlements.values());
}

export function getMemoryVlmAuditHumanQueue() {
  return Array.from(memoryAuditQueue.values());
}
