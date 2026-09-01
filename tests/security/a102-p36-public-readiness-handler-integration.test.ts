import assert from "node:assert/strict";

import { GET as readinessGet } from "@/app/api/checkout/vlm-service/readiness/route";
import { POST as checkoutPost } from "@/app/api/checkout/vlm-service/route";
import { VLM_PUBLIC_SERVICE_READINESS_SCHEMA } from "@/lib/commerce/vlm-evidence-availability";

let checks = 0;
function check(value: unknown, message: string) {
  checks += 1;
  assert.ok(value, message);
}

const saved = new Map<string, string | undefined>();
for (const key of [
  "NODE_ENV",
  "CHECKOUT_MODE",
  "STRIPE_SECRET_KEY",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SITE_URL",
  "VELMERE_SERVICES_COMMERCIAL_READY",
]) {
  saved.set(key, process.env[key]);
}

try {
  Object.assign(process.env, {
    NODE_ENV: "test",
    CHECKOUT_MODE: "stripe",
    STRIPE_SECRET_KEY: "sk_test_p36_forged_configuration_only_000000000000",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_p36_forged_configuration_only_000000000000",
    NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
    VELMERE_SERVICES_COMMERCIAL_READY: "true",
  });

  const readinessResponse = await readinessGet(new Request(
    "http://localhost:3000/api/checkout/vlm-service/readiness?locale=en&paymentRail=card",
  ));
  check(readinessResponse.status === 200, "real readiness handler must respond successfully");
  check(readinessResponse.headers.get("x-velmere-contract") === VLM_PUBLIC_SERVICE_READINESS_SCHEMA, "handler must pin the public semantic contract");
  check(readinessResponse.headers.get("cache-control") === "no-store", "readiness must not be cached");
  const readiness = await readinessResponse.json() as {
    schemaVersion?: string;
    products?: Array<{
      eligibility?: Record<string, unknown> | null;
      payment?: { available?: boolean };
    }>;
    boundary?: string;
  };
  check(readiness.schemaVersion === VLM_PUBLIC_SERVICE_READINESS_SCHEMA, "response body must pin v2 readiness");
  check(Array.isArray(readiness.products) && readiness.products.length > 0, "handler must return its current product catalog");
  check(readiness.products!.every((row) => !row.eligibility || row.eligibility.analysisEligible === false), "generic handler input cannot promote analysis without case-bound evidence");
  check(readiness.products!.every((row) => !row.eligibility || row.eligibility.saleEligible === false), "all handler rows must remain stop-sell");
  check(readiness.products!.every((row) => row.payment?.available === false), "forged payment configuration cannot make payment available");
  check(readiness.products!.every((row) => !row.eligibility || row.eligibility.estimatedRestorationAt === null), "handler cannot invent restoration ETA");
  check(readiness.products!.every((row) => !Object.hasOwn(row.eligibility ?? {}, "passedGates")), "public projection must not expose internal gate topology");
  check(readiness.products!.every((row) => !Object.hasOwn(row.eligibility ?? {}, "fieldReadiness")), "public projection must not expose field internals");
  check(typeof readiness.boundary === "string" && readiness.boundary.includes("cannot override"), "server authority boundary must be explicit");

  const checkoutResponse = await checkoutPost(new Request(
    "http://localhost:3000/api/checkout/vlm-service",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        productId: "vlm_audit_basic",
        paymentRail: "card",
        paymentProof: "forged-client-proof",
      }),
    },
  ));
  check(checkoutResponse.status === 503, "active containment must stop checkout before payment/provider work");
  const checkout = await checkoutResponse.json() as Record<string, unknown>;
  check(checkout.saleEnabled === false && checkout.live === false, "checkout handler must retain sale/LIVE false");
  check(checkout.retryable === false, "contained checkout cannot invite an unsafe retry");
} finally {
  for (const [key, value] of saved) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

console.log(`P36 public readiness/checkout handler integration: PASS (${checks}/${checks})`);
