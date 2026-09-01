#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { currentNpmVersion } from "./lib/velmere-runtime-contract.mjs";

const root = process.cwd();
const fixtureMode = process.argv.includes("--fixture");
const contract = JSON.parse(fs.readFileSync(path.join(root, "config/pass35/a49-stripe-test-payment-acceptance.json"), "utf8"));
const outputDir = path.join(root, "artifacts/pass35/a49");
const outputJson = path.join(outputDir, "PASS35_A49_STRIPE_TEST_PAYMENT_ACCEPTANCE.json");
const outputMd = path.join(outputDir, "PASS35_A49_STRIPE_TEST_PAYMENT_ACCEPTANCE.md");
fs.mkdirSync(outputDir, { recursive: true });

const sha256Buffer = (value) => crypto.createHash("sha256").update(value).digest("hex");
const sha256Text = (value) => sha256Buffer(Buffer.from(String(value), "utf8"));
const nowIso = () => new Date().toISOString();
const checks = [];
const addCheck = (id, ok, detail = null, status = ok ? "PASS" : "FAIL") => checks.push({ id, ok: Boolean(ok), status, detail });
const safePrefix = (value, prefix) => typeof value === "string" && value.startsWith(prefix);
const safeIdHash = (value) => value ? sha256Text(value) : null;

function verifySourceManifest() {
  const file = path.join(root, "config/pass35/a49-source-manifest.json");
  if (!fs.existsSync(file)) return { ok: false, reason: "a49_source_manifest_missing", digest: null, rows: 0 };
  const manifest = JSON.parse(fs.readFileSync(file, "utf8"));
  const hash = crypto.createHash("sha256");
  for (const row of manifest.files ?? []) {
    const absolute = path.join(root, row.path);
    if (!fs.existsSync(absolute)) return { ok: false, reason: `source_file_missing:${row.path}`, digest: null, rows: manifest.files.length };
    const current = sha256Buffer(fs.readFileSync(absolute));
    if (current !== row.sha256) return { ok: false, reason: `source_hash_mismatch:${row.path}`, digest: null, rows: manifest.files.length };
    hash.update(row.path); hash.update("\0"); hash.update(current); hash.update("\0");
  }
  return { ok: true, reason: null, digest: hash.digest("hex"), rows: manifest.files.length };
}

function safeStagingUrl(raw) {
  let url;
  try { url = new URL(raw); } catch { return { ok: false, reason: "invalid_url" }; }
  const host = url.hostname.toLowerCase();
  const local = host === "localhost" || host === "127.0.0.1" || host === "::1";
  if (fixtureMode && local) return { ok: true, url, hostClass: "fixture_localhost" };
  if (contract.stagingSafety.httpsRequired && url.protocol !== "https:") return { ok: false, reason: "https_required" };
  if (local) return { ok: false, reason: "localhost_not_staging" };
  if (contract.stagingSafety.rejectHostnameTokens.some((token) => host.includes(token))) return { ok: false, reason: "production_like_hostname" };
  if (!contract.stagingSafety.requireHostnameHint.some((token) => host.includes(token))) return { ok: false, reason: "staging_hostname_hint_missing" };
  return { ok: true, url, hostClass: host.endsWith(".vercel.app") ? "vercel_preview" : "staging_host" };
}

function splitSetCookie(value) {
  if (!value) return [];
  return value.split(/,(?=\s*[^;,=\s]+=[^;,]+)/u).map((part) => part.trim()).filter(Boolean);
}
class CookieJar {
  constructor() { this.cookies = new Map(); }
  absorb(headers) {
    const rows = typeof headers.getSetCookie === "function" ? headers.getSetCookie() : splitSetCookie(headers.get("set-cookie"));
    for (const row of rows) {
      const first = String(row).split(";", 1)[0];
      const eq = first.indexOf("=");
      if (eq <= 0) continue;
      const name = first.slice(0, eq).trim();
      const value = first.slice(eq + 1).trim();
      if (!value) this.cookies.delete(name); else this.cookies.set(name, value);
    }
  }
  header() { return [...this.cookies.entries()].map(([name, value]) => `${name}=${value}`).join("; "); }
}

async function boundedJson(response, maxBytes = contract.budgets.maximumJsonBytes) {
  const type = String(response.headers.get("content-type") ?? "").toLowerCase();
  if (!type.includes("application/json")) throw new Error(`non_json_response:${type || "missing"}`);
  const reader = response.body?.getReader();
  if (!reader) throw new Error("response_body_missing");
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) { await reader.cancel(); throw new Error("json_response_too_large"); }
    chunks.push(value);
  }
  const bytes = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  return JSON.parse(text);
}

async function fetchBounded(url, options = {}, timeoutMs = contract.budgets.requestTimeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error("request_timeout")), timeoutMs);
  try { return await fetch(url, { ...options, redirect: "manual", signal: controller.signal, cache: "no-store" }); }
  finally { clearTimeout(timer); }
}

async function requestJson(base, pathname, options = {}, jar = null) {
  const target = new URL(pathname, base);
  const headers = new Headers(options.headers ?? {});
  headers.set("accept", "application/json");
  let body = options.body;
  if (body !== undefined && !(typeof body === "string") && !(body instanceof Uint8Array)) {
    headers.set("content-type", "application/json");
    body = JSON.stringify(body);
  }
  if (jar?.header()) headers.set("cookie", jar.header());
  const method = String(options.method ?? "GET").toUpperCase();
  if (!['GET','HEAD'].includes(method)) headers.set("origin", base.origin);
  const response = await fetchBounded(target, { ...options, method, headers, body });
  if (jar) jar.absorb(response.headers);
  const json = await boundedJson(response);
  return { response, json };
}

async function stripeRequest(apiBase, pathname, params, secretKey) {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) for (const row of value) body.append(key, String(row));
    else if (value !== undefined && value !== null) body.set(key, String(value));
  }
  const response = await fetchBounded(new URL(pathname, apiBase), {
    method: "POST",
    headers: { authorization: `Bearer ${secretKey}`, "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: body.toString(),
  }, contract.budgets.stripeApiTimeoutMs);
  const json = await boundedJson(response);
  if (!response.ok) throw new Error(`stripe_api_error:${response.status}:${json?.error?.code ?? "unknown"}`);
  return json;
}

async function stripeGet(apiBase, pathname, secretKey) {
  const response = await fetchBounded(new URL(pathname, apiBase), { headers: { authorization: `Bearer ${secretKey}`, accept: "application/json" } }, contract.budgets.stripeApiTimeoutMs);
  const json = await boundedJson(response);
  if (!response.ok) throw new Error(`stripe_api_error:${response.status}:${json?.error?.code ?? "unknown"}`);
  return json;
}

function normalizeContext(input) {
  const clean = (value, max) => typeof value === "string" && value.trim() ? value.trim().slice(0, max) : undefined;
  return {
    surface: ["shield","real-markets","browser","audit"].includes(input.surface) ? input.surface : "unknown",
    locale: ["pl","de","en"].includes(input.locale) ? input.locale : "en",
    assetId: clean(input.assetId, 96), symbol: clean(input.symbol, 32),
    depth: ["basic","pro","advanced"].includes(input.depth) ? input.depth : undefined,
    requestId: clean(input.requestId, 96), auditCaseRef: clean(input.auditCaseRef, 32)?.toUpperCase(),
    returnPath: clean(input.returnPath, 360),
    accountIdHash: typeof input.accountIdHash === "string" && /^[a-f0-9]{64}$/i.test(input.accountIdHash.trim()) ? input.accountIdHash.trim().toLowerCase() : undefined,
  };
}
function contextHash(context) {
  const n = normalizeContext(context);
  return sha256Text(JSON.stringify({ surface:n.surface, locale:n.locale, assetId:n.assetId||"", symbol:n.symbol||"", depth:n.depth||"", requestId:n.requestId||"", auditCaseRef:n.auditCaseRef||"", accountIdHash:n.accountIdHash||"" }));
}
function safeEntitlementId(sessionId, productId, hash) {
  return `vlm_entitlement_${sessionId}_${productId}_${hash.slice(0,12)}`.toLowerCase().replace(/[^a-z0-9:_-]+/g, "-").slice(0,180);
}
function stripeSignature(payload, secret, timestamp = Math.floor(Date.now()/1000)) {
  const digest = crypto.createHmac("sha256", secret).update(`${timestamp}.${payload}`, "utf8").digest("hex");
  return `t=${timestamp},v1=${digest}`;
}
function stripeEvent({ id, type, created, object }) {
  return { id, object:"event", api_version:"2025-02-24.acacia", created, data:{ object }, livemode:false, pending_webhooks:1, request:{ id:null, idempotency_key:null }, type };
}
function accountIdFromSession(payload) { return payload?.session?.accountId ?? payload?.account?.accountId ?? null; }

function redactScan(report, secrets) {
  const raw = JSON.stringify(report);
  const leaks = [];
  for (const [name, value] of Object.entries(secrets)) {
    if (typeof value === "string" && value.length >= 4 && raw.includes(value)) leaks.push(name);
  }
  if (/sk_(?:test|live)_[A-Za-z0-9]+/u.test(raw)) leaks.push("stripe_secret_pattern");
  if (/pk_(?:test|live)_[A-Za-z0-9]+/u.test(raw)) leaks.push("stripe_publishable_pattern");
  if (/whsec_[A-Za-z0-9]+/u.test(raw)) leaks.push("webhook_secret_pattern");
  if (/Set-Cookie|cookie\s*:/iu.test(raw)) leaks.push("cookie_pattern");
  return [...new Set(leaks)];
}

async function main() {
  const startedAt = nowIso();
  const sourceBefore = verifySourceManifest();
  addCheck("source-fingerprint-before", sourceBefore.ok, { rows: sourceBefore.rows, digest: sourceBefore.digest, reason: sourceBefore.reason });

  const a48Path = path.join(root, "artifacts/pass35/a48/PASS35_A48_STAGING_TENANT_ISOLATION.json");
  if (fixtureMode) {
    addCheck("precondition-a48-verified", true, { fixture: true, decision: contract.requiredA48Decision }, "FIXTURE_PASS");
  } else if (fs.existsSync(a48Path)) {
    const a48 = JSON.parse(fs.readFileSync(a48Path, "utf8"));
    const a48Decision = a48.decision ?? a48.status ?? null;
    addCheck("precondition-a48-verified", a48Decision === contract.requiredA48Decision, { decision: a48Decision });
  } else addCheck("precondition-a48-verified", false, { reason: "a48_verified_evidence_missing" });

  const npmObserved = currentNpmVersion();
  const runtimeOk = fixtureMode || (process.versions.node === contract.runtime.node && npmObserved === contract.runtime.npm);
  addCheck("runtime-exact", runtimeOk, { node: process.versions.node, npm: npmObserved, expected: contract.runtime, fixture: fixtureMode }, fixtureMode ? "FIXTURE_PASS" : undefined);

  const confirmation = process.env.VELMERE_A49_CONFIRM ?? "";
  addCheck("confirmation-token", fixtureMode || confirmation === contract.confirmationToken, { present: Boolean(confirmation), fixture: fixtureMode }, fixtureMode ? "FIXTURE_PASS" : undefined);
  const safety = safeStagingUrl(process.env.VELMERE_A49_STAGING_BASE_URL ?? "");
  addCheck("staging-url-safety", safety.ok, safety.ok ? { hostClass: safety.hostClass, originSha256: sha256Text(safety.url.origin) } : { reason: safety.reason });
  if (!safety.ok) throw new Error(`unsafe_staging_url:${safety.reason}`);
  const base = safety.url;

  const secretKey = process.env.STRIPE_SECRET_KEY ?? "";
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
  const lifecycleSecret = process.env.VELMERE_ENTITLEMENT_LIFECYCLE_SECRET ?? "";
  const workerSecret = process.env.VELMERE_WORKER_INTERNAL_WORKERS_STRIPE_WEBHOOK_RECONCILIATION_SECRET_CURRENT ?? "";
  const keyBoundary = safePrefix(secretKey, contract.stripeSafety.secretKeyPrefix) && safePrefix(publishableKey, contract.stripeSafety.publishableKeyPrefix) && safePrefix(webhookSecret, contract.stripeSafety.webhookSecretPrefix) && lifecycleSecret.length >= 32 && workerSecret.length >= 32;
  addCheck("stripe-test-key-boundary", keyBoundary, { secretTest: safePrefix(secretKey, "sk_test_"), publishableTest: safePrefix(publishableKey, "pk_test_"), webhookConfigured: safePrefix(webhookSecret, "whsec_"), lifecycleStrong: lifecycleSecret.length >= 32, workerStrong: workerSecret.length >= 32 });
  if (!keyBoundary) throw new Error("stripe_test_key_boundary_failed");

  const email = process.env.VELMERE_A49_TEST_ACCOUNT_EMAIL ?? "";
  const password = process.env.VELMERE_A49_TEST_ACCOUNT_PASSWORD ?? "";
  const jar = new CookieJar();
  const signin = await requestJson(base, "/api/auth/session", { method:"POST", body:{ provider:"email", mode:"signin", email, password } }, jar);
  const accountId = accountIdFromSession(signin.json);
  addCheck("test-account-signin", signin.response.status === 200 && signin.json?.authenticated === true && signin.json?.bindingState === "ready" && Boolean(accountId), { status: signin.response.status, authenticated: signin.json?.authenticated === true, bindingState: signin.json?.bindingState ?? null, accountDigest: safeIdHash(accountId) });
  if (!accountId) throw new Error("test_account_signin_failed");
  const accountIdHash = sha256Text(accountId);

  const requestId = `a49-${crypto.randomBytes(8).toString("hex")}`;
  const context = normalizeContext({ surface:"shield", locale:"en", symbol:"BTC", depth:"pro", requestId, accountIdHash });
  const ctxHash = contextHash(context);
  const productId = "vlm_pro_analysis_single";
  const checkout = await requestJson(base, "/api/checkout/vlm-service", { method:"POST", headers:{ "x-velmere-client-request-id":requestId }, body:{ productId, locale:"en", context, clientRequestId:requestId } }, jar);
  const stopSell = checkout.response.status === 409 && checkout.json?.ok === false && (checkout.json?.error === "product_cell_not_sell_ready" || checkout.json?.details?.chargeAllowed === false || checkout.json?.details?.productCell?.sellEnabled === false);
  addCheck("checkout-stop-sell-preserved", stopSell, { status: checkout.response.status, error: checkout.json?.error ?? null, chargeAllowed: checkout.json?.details?.chargeAllowed ?? false, sessionIssued: Boolean(checkout.json?.sessionId || checkout.json?.url) });

  const missingSigPayload = JSON.stringify(stripeEvent({ id:`evt_a49_missing_${Date.now()}`, type:"checkout.session.completed", created:Math.floor(Date.now()/1000), object:{ id:"cs_test_missing", object:"checkout.session" } }));
  const missingSig = await requestJson(base, "/api/stripe/webhook", { method:"POST", headers:{ "content-type":"application/json" }, body:missingSigPayload });
  addCheck("webhook-missing-signature-rejected", missingSig.response.status === 400, { status: missingSig.response.status, error: missingSig.json?.error ?? null });
  const badSig = await requestJson(base, "/api/stripe/webhook", { method:"POST", headers:{ "content-type":"application/json", "stripe-signature":"t=1,v1=deadbeef" }, body:missingSigPayload });
  addCheck("webhook-invalid-signature-rejected", badSig.response.status === 400, { status: badSig.response.status, error: badSig.json?.error ?? null });

  const stripeApiBase = fixtureMode ? new URL(process.env.VELMERE_A49_STRIPE_API_BASE ?? "", base) : new URL(contract.stripeSafety.apiBase);
  let paymentIntent = null;
  let charge;
  let refund;
  let sessionId = `cs_test_a49_${crypto.randomBytes(12).toString("hex")}`;
  let paymentCleanupNeeded = false;
  try {
    paymentIntent = await stripeRequest(stripeApiBase, "/v1/payment_intents", {
      amount: contract.stripeSafety.paymentAmount,
      currency: contract.stripeSafety.currency,
      payment_method: contract.stripeSafety.paymentMethod,
      confirm: "true",
      "payment_method_types[]": "card",
      description: "Velmere A49 disposable staging acceptance",
      "metadata[kind]":"vlm_paid_access", "metadata[productId]":productId, "metadata[contextHash]":ctxHash, "metadata[stripeSessionId]":sessionId,
    }, secretKey);
    paymentCleanupNeeded = true;
    addCheck("stripe-payment-intent-created", typeof paymentIntent.id === "string" && paymentIntent.id.startsWith("pi_") && paymentIntent.livemode === false, { idSha256:safeIdHash(paymentIntent.id), livemode:paymentIntent.livemode, amount:paymentIntent.amount, currency:paymentIntent.currency });
    addCheck("stripe-payment-intent-succeeded", paymentIntent.status === "succeeded" && paymentIntent.amount === contract.stripeSafety.paymentAmount && paymentIntent.currency === contract.stripeSafety.currency, { status:paymentIntent.status, amount:paymentIntent.amount, currency:paymentIntent.currency });
    const chargeId = typeof paymentIntent.latest_charge === "string" ? paymentIntent.latest_charge : paymentIntent.latest_charge?.id;
    if (!chargeId) throw new Error("stripe_charge_missing");

    const completedObject = {
      id:sessionId, object:"checkout.session", livemode:false, mode:"payment", payment_status:"paid", status:"complete",
      amount_total:7999, currency:"eur", customer:null, payment_intent:paymentIntent.id,
      customer_details:{ email:null, name:null },
      metadata:{ kind:"vlm_paid_access", productId, contextHash:ctxHash, surface:context.surface, locale:context.locale, symbol:context.symbol, depth:context.depth, requestId:context.requestId, accountIdHash, paymentRail:"stripe_checkout_auto", stripeSessionId:sessionId }
    };
    const completedEvent = stripeEvent({ id:`evt_a49_complete_${crypto.randomBytes(10).toString("hex")}`, type:"checkout.session.completed", created:Math.floor(Date.now()/1000), object:completedObject });
    const completedRaw = JSON.stringify(completedEvent);
    const completed = await requestJson(base, "/api/stripe/webhook", { method:"POST", headers:{ "content-type":"application/json", "stripe-signature":stripeSignature(completedRaw, webhookSecret) }, body:completedRaw });
    addCheck("signed-checkout-webhook-accepted", completed.response.status === 200 && completed.json?.received === true && completed.json?.kind === "vlm_paid_access" && completed.json?.entitlementPersisted === true, { status:completed.response.status, received:completed.json?.received ?? false, kind:completed.json?.kind ?? null, entitlementPersisted:completed.json?.entitlementPersisted ?? false, evidencePersisted:completed.json?.evidencePersisted ?? false });
    const replay = await requestJson(base, "/api/stripe/webhook", { method:"POST", headers:{ "content-type":"application/json", "stripe-signature":stripeSignature(completedRaw, webhookSecret) }, body:completedRaw });
    addCheck("checkout-webhook-replay-idempotent", replay.response.status === 200 && replay.json?.duplicate === true && replay.json?.received === true, { status:replay.response.status, duplicate:replay.json?.duplicate ?? false, received:replay.json?.received ?? false });

    refund = await stripeRequest(stripeApiBase, "/v1/refunds", { payment_intent:paymentIntent.id, reason:"requested_by_customer", "metadata[a49]":"disposable_staging_acceptance" }, secretKey);
    paymentCleanupNeeded = false;
    addCheck("stripe-refund-created", typeof refund.id === "string" && refund.id.startsWith("re_") && refund.amount === contract.stripeSafety.paymentAmount && refund.currency === contract.stripeSafety.currency, { idSha256:safeIdHash(refund.id), status:refund.status, amount:refund.amount, currency:refund.currency });
    charge = await stripeGet(stripeApiBase, `/v1/charges/${encodeURIComponent(chargeId)}`, secretKey);
    addCheck("stripe-charge-fully-refunded", charge.livemode === false && charge.refunded === true && charge.amount_refunded >= charge.amount && charge.amount === contract.stripeSafety.paymentAmount, { chargeSha256:safeIdHash(charge.id), livemode:charge.livemode, refunded:charge.refunded, amount:charge.amount, amountRefunded:charge.amount_refunded, currency:charge.currency });

    const refundObject = { ...charge, metadata:{ ...(charge.metadata ?? {}), kind:"vlm_paid_access", productId, contextHash:ctxHash, stripeSessionId:sessionId }, payment_intent:paymentIntent.id, amount:contract.stripeSafety.paymentAmount, amount_refunded:contract.stripeSafety.paymentAmount, currency:contract.stripeSafety.currency, refunded:true };
    const refundEvent = stripeEvent({ id:`evt_a49_refund_${crypto.randomBytes(10).toString("hex")}`, type:"charge.refunded", created:Math.floor(Date.now()/1000)+10, object:refundObject });
    const refundRaw = JSON.stringify(refundEvent);
    const refundWebhook = await requestJson(base, "/api/stripe/webhook", { method:"POST", headers:{ "content-type":"application/json", "stripe-signature":stripeSignature(refundRaw, webhookSecret) }, body:refundRaw });
    addCheck("signed-refund-webhook-accepted", refundWebhook.response.status === 200 && refundWebhook.json?.received === true && refundWebhook.json?.stateUpdated === true, { status:refundWebhook.response.status, received:refundWebhook.json?.received ?? false, stateUpdated:refundWebhook.json?.stateUpdated ?? false, type:refundWebhook.json?.type ?? null });
    const refundReplay = await requestJson(base, "/api/stripe/webhook", { method:"POST", headers:{ "content-type":"application/json", "stripe-signature":stripeSignature(refundRaw, webhookSecret) }, body:refundRaw });
    addCheck("refund-webhook-replay-idempotent", refundReplay.response.status === 200 && refundReplay.json?.duplicate === true && refundReplay.json?.received === true, { status:refundReplay.response.status, duplicate:refundReplay.json?.duplicate ?? false, received:refundReplay.json?.received ?? false });

    const entitlementId = safeEntitlementId(sessionId, productId, ctxHash);
    const lifecycle = await requestJson(base, "/api/internal/vlm-entitlements/lifecycle", { method:"POST", headers:{ authorization:`Bearer ${lifecycleSecret}` }, body:{ entitlementId, eventId:`a49-refund-confirm-${crypto.randomBytes(8).toString("hex")}`, event:"refund", sourceEventId:refundEvent.id, operatorId:"a49-staging-acceptance", reason:"confirm_refund_idempotency" } });
    addCheck("entitlement-refund-idempotent", lifecycle.response.status === 200 && lifecycle.json?.ok === true && lifecycle.json?.idempotent === true && lifecycle.json?.nextStatus === "refunded", { status:lifecycle.response.status, ok:lifecycle.json?.ok ?? false, idempotent:lifecycle.json?.idempotent ?? false, previousStatus:lifecycle.json?.previousStatus ?? null, nextStatus:lifecycle.json?.nextStatus ?? null, ledgerMode:lifecycle.json?.ledgerMode ?? null });

    const reconcile = await requestJson(base, "/api/internal/workers/stripe-webhook-reconciliation?staleAfterSeconds=60&retryThreshold=5&limit=100&deadlineMs=8000", { method:"GET", headers:{ authorization:`Bearer ${workerSecret}` } });
    addCheck("reconciliation-worker-authorized", reconcile.response.status === 200 && reconcile.json?.ok === true, { status:reconcile.response.status, ok:reconcile.json?.ok ?? false, skipped:reconcile.json?.skipped ?? null });
    const summary = reconcile.json?.summary ?? {};
    const aggregateOnly = ["scannedCount","staleReleasedCount","retryReadyCount","deadLetteredCount","completedWithoutEventCount"].every((key) => Number.isInteger(summary[key]) && summary[key] >= 0) && !JSON.stringify(reconcile.json).includes(completedEvent.id) && !JSON.stringify(reconcile.json).includes(refundEvent.id);
    addCheck("reconciliation-worker-aggregate-only", aggregateOnly, { leaseAcquired:summary.leaseAcquired ?? null, scannedCount:summary.scannedCount ?? null, staleReleasedCount:summary.staleReleasedCount ?? null, retryReadyCount:summary.retryReadyCount ?? null, deadLetteredCount:summary.deadLetteredCount ?? null, severity:summary.severity ?? null });
  } finally {
    if (paymentCleanupNeeded && paymentIntent?.id) {
      try { await stripeRequest(stripeApiBase, "/v1/refunds", { payment_intent:paymentIntent.id, reason:"requested_by_customer", "metadata[a49_cleanup]":"true" }, secretKey); } catch { /* receipt reports primary failure */ }
    }
  }

  const logout = await requestJson(base, "/api/auth/session", { method:"DELETE" }, jar);
  const postLogout = await requestJson(base, "/api/auth/session", { method:"GET" }, jar);
  addCheck("session-revoked", logout.response.status === 200 && postLogout.response.status === 200 && postLogout.json?.authenticated === false, { logoutStatus:logout.response.status, authenticatedAfter:postLogout.json?.authenticated ?? null });

  const sourceAfter = verifySourceManifest();
  addCheck("source-fingerprint-unchanged", sourceAfter.ok && sourceBefore.ok && sourceAfter.digest === sourceBefore.digest, { before:sourceBefore.digest, after:sourceAfter.digest, rows:sourceAfter.rows, reason:sourceAfter.reason });

  const failures = checks.filter((row) => !row.ok);
  const decision = fixtureMode ? (failures.length ? "FIXTURE_FAIL" : "FIXTURE_PASS") : (failures.length ? "ACTION_REQUIRED" : "VERIFIED_STAGING_PAYMENT_REFUND_RECONCILIATION");
  const report = {
    schemaVersion:"velmere.pass35.a49.stripe-test-payment-acceptance.v1", revisionId:contract.revisionId, parentRevisionId:contract.parentRevisionId,
    generatedAt:nowIso(), startedAt, fixtureMode, decision,
    testModeProven:!fixtureMode && failures.length === 0, stagingPaymentProven:!fixtureMode && failures.length === 0,
    liveModeProven:false, productionPaymentProven:false, saleEnabled:false,
    truthBoundary:contract.truthBoundary,
    runtime:{ node:process.versions.node, npm:npmObserved, expectedNode:contract.runtime.node, expectedNpm:contract.runtime.npm },
    source:{ before:sourceBefore, after:sourceAfter },
    stripe:{ mode:"test", paymentIntentSha256:safeIdHash(paymentIntent?.id), refundSha256:safeIdHash(refund?.id), chargeSha256:safeIdHash(charge?.id), livemode:false },
    summary:{ checks:checks.length, passed:checks.length-failures.length, failed:failures.length },
    failures, checks,
  };
  const leaks = redactScan(report, { email, password, secretKey, publishableKey, webhookSecret, lifecycleSecret, workerSecret, cookie:jar.header(), accountId });
  addCheck("evidence-redaction", leaks.length === 0, { leakClasses:leaks });
  report.checks = checks;
  report.failures = checks.filter((row)=>!row.ok);
  report.summary = { checks:checks.length, passed:checks.filter((row)=>row.ok).length, failed:checks.filter((row)=>!row.ok).length };
  report.decision = fixtureMode ? (report.summary.failed ? "FIXTURE_FAIL" : "FIXTURE_PASS") : (report.summary.failed ? "ACTION_REQUIRED" : "VERIFIED_STAGING_PAYMENT_REFUND_RECONCILIATION");
  report.testModeProven = !fixtureMode && report.summary.failed === 0;
  report.stagingPaymentProven = !fixtureMode && report.summary.failed === 0;
  fs.writeFileSync(outputJson, `${JSON.stringify(report,null,2)}\n`, "utf8");
  fs.writeFileSync(outputMd, `# PASS35 A49 — Stripe test payment/refund/reconciliation acceptance\n\nDecision: **${report.decision}**\n\n- checks: ${report.summary.checks}\n- passed: ${report.summary.passed}\n- failed: ${report.summary.failed}\n- testModeProven: ${report.testModeProven}\n- liveModeProven: false\n- saleEnabled: false\n\n${report.failures.map((row)=>`- FAIL ${row.id}: ${JSON.stringify(row.detail)}`).join("\n") || "All declared checks passed."}\n`, "utf8");
  console.log(JSON.stringify({ decision:report.decision, ...report.summary }, null, 2));
  if (report.summary.failed) process.exit(1);
}

main().catch((error) => {
  const report = { schemaVersion:"velmere.pass35.a49.stripe-test-payment-acceptance.v1", revisionId:contract.revisionId, generatedAt:nowIso(), fixtureMode, decision:fixtureMode?"FIXTURE_FAIL":"ACTION_REQUIRED", testModeProven:false, liveModeProven:false, saleEnabled:false, fatalError:error instanceof Error ? error.message.slice(0,240) : String(error).slice(0,240), checks, summary:{ checks:checks.length, passed:checks.filter((row)=>row.ok).length, failed:checks.filter((row)=>!row.ok).length+1 } };
  fs.writeFileSync(outputJson, `${JSON.stringify(report,null,2)}\n`, "utf8");
  fs.writeFileSync(outputMd, `# PASS35 A49\n\nDecision: **${report.decision}**\n\nFatal: ${report.fatalError}\n`, "utf8");
  console.error(report.fatalError);
  process.exit(1);
});
