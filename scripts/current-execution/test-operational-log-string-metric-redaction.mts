import assert from "node:assert/strict";
import {
  buildOperationalLogRecord,
  writeOperationalEvent,
} from "../../lib/security/operational-log-boundary";

let assertions = 0;
function check(condition: unknown, message: string) {
  assertions += 1;
  assert.ok(condition, message);
}

const hostileValues = {
  bearer: "Bearer very-secret-token",
  email: "operator@example.com",
  url: "https://user:password@example.com/private?token=secret",
  stripe: "sk_live_DO_NOT_LOG_123456789",
  jwt: "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJwcml2YXRlIn0.signature",
  // Preserve the adversarial value without storing a secret-shaped plaintext
  // marker in the transported source itself.
  privateKey: ["-----BEGIN ", "PRIVATE KEY-----"].join(""),
  bidi: "safe\u202e secret",
};

const record = buildOperationalLogRecord({
  level: "warn",
  system: "velmere.test",
  event: "adversarial_metric",
  code: "test_only",
  metrics: {
    ...hostileValues,
    paymentStatus: "paid",
    currency: "usd",
    mode: "memory_fallback",
    passId: "pass2362-vlm-service-payment-demo-stripe-human-review-queue",
    status: "active",
    source: "stripe_webhook",
    providerClass: "remote",
    finite: 7,
    nonfinite: Number.POSITIVE_INFINITY,
    enabled: true,
    absent: null,
  },
});

for (const key of Object.keys(hostileValues)) {
  check(record.metrics[key] === "redacted", `${key} must fail closed`);
}
check(record.metrics.paymentStatus === "paid", "known payment status must remain useful");
check(record.metrics.currency === "usd", "bounded currency must remain useful");
check(record.metrics.mode === "memory_fallback", "known mode must remain useful");
check(
  record.metrics.passId === "pass2362-vlm-service-payment-demo-stripe-human-review-queue",
  "bounded pass identity must remain useful",
);
check(record.metrics.status === "active", "known entitlement status must remain useful");
check(record.metrics.source === "stripe_webhook", "known source must remain useful");
check(record.metrics.providerClass === "remote", "known provider class must remain useful");
check(record.metrics.finite === 7, "finite numbers must be retained");
check(record.metrics.nonfinite === null, "non-finite numbers must fail closed");
check(record.metrics.enabled === true, "booleans must be retained");
check(record.metrics.absent === null, "null must be retained");

const serialized = JSON.stringify(record);
for (const value of Object.values(hostileValues)) {
  check(!serialized.includes(value), `serialized record leaked ${value}`);
}
for (const fragment of [
  "very-secret-token",
  "operator@example.com",
  "user:password",
  "sk_live",
  "eyJhbGci",
  "PRIVATE KEY",
]) {
  check(!serialized.includes(fragment), `serialized record leaked ${fragment}`);
}

const writes: string[] = [];
const originalWarn = console.warn;
console.warn = (...args: unknown[]) => writes.push(args.map(String).join(" "));
try {
  writeOperationalEvent({
    level: "warn",
    system: "velmere.test",
    event: "adversarial_metric",
    code: "test_only",
    metrics: hostileValues,
  });
} finally {
  console.warn = originalWarn;
}
check(writes.length === 1, "operational event must emit exactly one record");
check(writes[0].includes('"bearer":"redacted"'), "sink must emit the redacted projection");
check(!writes[0].includes("very-secret-token"), "sink must not emit bearer material");
check(!writes[0].includes("operator@example.com"), "sink must not emit PII");
check(!writes[0].includes("sk_live"), "sink must not emit provider credentials");

console.log(
  JSON.stringify({
    status: "PASS",
    assertions,
    hostileStringMetrics: Object.keys(hostileValues).length,
  }),
);
