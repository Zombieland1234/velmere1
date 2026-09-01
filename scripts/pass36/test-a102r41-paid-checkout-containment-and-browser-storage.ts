#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { POST } from "../../app/api/checkout/vlm-service/route.ts";
import { PASS36_PAID_CHECKOUT_CONTAINMENT } from "../../lib/commerce/vlm-paid-checkout-containment.ts";
import {
  clearVlmPaidCheckoutIntent,
  readVlmPaidCheckoutIntent,
  writeVlmPaidCheckoutIntent,
} from "../../lib/commerce/vlm-paid-access-client.ts";

const checks: Array<{ id: string; pass: boolean; detail?: unknown }> = [];
const check = (id: string, condition: unknown, detail?: unknown) => {
  const pass = Boolean(condition);
  checks.push({ id, pass, detail });
  assert.ok(pass, `${id}:${JSON.stringify(detail ?? null)}`);
};
const sentinel = "PRIVATE-CHECKOUT-CONTEXT-7D91";

let networkCalls = 0;
const originalFetch = globalThis.fetch;
globalThis.fetch = (async () => {
  networkCalls += 1;
  throw new Error("network_forbidden_during_checkout_containment");
}) as typeof fetch;
try {
  const response = await POST(new Request("https://velmere.example/api/checkout/vlm-service", {
    method: "POST",
    headers: {
      origin: "https://velmere.example",
      "content-type": "application/json",
      "x-velmere-client-request-id": `checkout-${sentinel}`,
    },
    body: JSON.stringify({
      productId: "vlm_advanced_audit_human_review",
      productCellId: "AUDIT-ADVANCED",
      locale: "en",
      context: {
        surface: "audit",
        depth: "advanced",
        requestId: sentinel,
        auditCaseRef: "AUD-7D91ABCD",
        returnPath: `/en/account?private=${sentinel}`,
      },
    }),
  }));
  const text = await response.text();
  const payload = JSON.parse(text) as Record<string, unknown>;
  check("paid_checkout_returns_fail_closed_503", response.status === 503, response.status);
  check("paid_checkout_has_no_store_no_referrer", response.headers.get("cache-control") === "no-store" && response.headers.get("referrer-policy") === "no-referrer", Object.fromEntries(response.headers));
  check("paid_checkout_is_non_retryable_non_sale", payload.retryable === false && payload.saleEnabled === false && payload.productionApproved === false && payload.live === false, payload);
  check("paid_checkout_emits_no_flow_identifiers", !text.includes(sentinel) && !("url" in payload) && !("sessionId" in payload) && !("context" in payload) && !("checkoutVerificationBindingToken" in payload), payload);
  check("paid_checkout_executes_zero_provider_calls", networkCalls === 0, networkCalls);
} finally {
  globalThis.fetch = originalFetch;
}

check("containment_is_source_constant_not_environment_toggle", PASS36_PAID_CHECKOUT_CONTAINMENT.active === true && PASS36_PAID_CHECKOUT_CONTAINMENT.saleEnabled === false, PASS36_PAID_CHECKOUT_CONTAINMENT);
const routeSource = readFileSync("app/api/checkout/vlm-service/route.ts", "utf8");
const containmentSource = readFileSync("lib/commerce/vlm-paid-checkout-containment.ts", "utf8");
const guardIndex = routeSource.indexOf("if (PASS36_PAID_CHECKOUT_CONTAINMENT.active)");
check("containment_precedes_body_parse", guardIndex >= 0 && guardIndex < routeSource.indexOf("readBoundedJsonBody<VlmServiceCheckoutBody>"));
check("containment_precedes_stripe_creation", guardIndex >= 0 && guardIndex < routeSource.indexOf("stripe.checkout.sessions.create"));

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();
  setCalls = 0;
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.setCalls += 1; this.values.set(key, value); }
  seed(key: string, value: string) { this.values.set(key, value); }
  entries() { return [...this.values.entries()]; }
}
const localStorage = new MemoryStorage();
const sessionStorage = new MemoryStorage();
localStorage.seed("velmere.vlm-paid-access.pending-checkout", sentinel);
sessionStorage.seed("velmere.vlm-paid-access.last-success", sentinel);
sessionStorage.seed("velmere.paid-access.legacy", sentinel);
const previousWindow = (globalThis as { window?: unknown }).window;
const previousCustomEvent = (globalThis as { CustomEvent?: unknown }).CustomEvent;
(globalThis as unknown as { window: unknown }).window = {
  localStorage,
  sessionStorage,
  dispatchEvent() { return true; },
};
(globalThis as unknown as { CustomEvent: unknown }).CustomEvent = class {
  constructor(public type: string, public init?: unknown) {}
};
try {
  writeVlmPaidCheckoutIntent({
    productId: "vlm_advanced_audit_human_review",
    locale: "en",
    context: {
      surface: "audit",
      depth: "advanced",
      requestId: sentinel,
      auditCaseRef: "AUD-7D91ABCD",
      returnPath: `/en/account?private=${sentinel}`,
    },
    sessionId: "cs_test_7D91ABCD",
    checkoutVerificationBindingToken: `${"A".repeat(64)}.${"B".repeat(43)}`,
  });
  check("checkout_intent_writes_no_local_storage", localStorage.setCalls === 0, localStorage.entries());
  check("checkout_intent_writes_no_session_storage", sessionStorage.setCalls === 0, sessionStorage.entries());
  check("historical_sensitive_storage_is_purged", localStorage.entries().every(([, value]) => !value.includes(sentinel)) && sessionStorage.entries().every(([, value]) => !value.includes(sentinel)), { local: localStorage.entries(), session: sessionStorage.entries() });
  check("memory_intent_remains_non_authoritative", readVlmPaidCheckoutIntent()?.context.requestId === sentinel);
  clearVlmPaidCheckoutIntent();
  check("memory_intent_can_be_cleared", readVlmPaidCheckoutIntent() === null);
} finally {
  if (previousWindow === undefined) delete (globalThis as { window?: unknown }).window;
  else (globalThis as { window?: unknown }).window = previousWindow;
  if (previousCustomEvent === undefined) delete (globalThis as { CustomEvent?: unknown }).CustomEvent;
  else (globalThis as { CustomEvent?: unknown }).CustomEvent = previousCustomEvent;
}

const clientSource = readFileSync("lib/commerce/vlm-paid-access-client.ts", "utf8");
check("browser_storage_set_and_get_are_absent", !clientSource.includes("window.sessionStorage.setItem") && !clientSource.includes("window.sessionStorage.getItem") && !clientSource.includes("window.localStorage.setItem"));
check("durable_opaque_flow_remains_explicit_blocker", containmentSource.includes("durable_opaque_server_checkout_flow_not_implemented"));

const failed = checks.filter((row) => !row.pass);
const receipt = {
  schemaVersion: "velmere.pass36.a102r41.paid-checkout-containment-and-browser-storage-test.v1",
  revisionId: "VELMERE_PASS36_A102R41_ACTION_REQUIRED_SECURITY_EVIDENCE_AUTHORITY_EXACT_WINDOWS_AND_FAIL_CLOSED_RELEASE_PACKAGING_NO_LIVE_CREDIT",
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  durableOpaqueCheckoutFlowImplemented: false,
  realStripeTestLifecycles: 0,
  saleEnabled: false,
  live: false,
  checks,
};
console.log(JSON.stringify(receipt, null, 2));
if (failed.length) process.exit(1);
