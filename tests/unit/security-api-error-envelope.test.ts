import { test } from "node:test";
import assert from "node:assert/strict";
import {
  redactApiErrorForStructuredLog,
  classifyApiProviderFailure,
  hasApiErrorCodePrefix,
  reportApiError,
} from "@/lib/security/api-error-envelope";

test("redactApiErrorForStructuredLog: redacts Stripe live secret", () => {
  const result = redactApiErrorForStructuredLog(new Error("failed for sk_live_51H2xK2eZvKYlo2CcF7xNgABC123"));
  assert.equal(result.message.includes("sk_live_51H2xK2eZvKYlo2CcF7xNgABC123"), false);
  assert.ok(result.message.includes("[redacted-secret]"));
});

test("redactApiErrorForStructuredLog: redacts webhook secret", () => {
  const result = redactApiErrorForStructuredLog(new Error("webhook whsec_AbCdEf123456 failed"));
  assert.equal(result.message.includes("whsec_AbCdEf123456"), false);
  assert.ok(result.message.includes("[redacted-secret]"));
});

test("redactApiErrorForStructuredLog: redacts JWT token", () => {
  const result = redactApiErrorForStructuredLog(new Error("invalid token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"));
  assert.equal(result.message.includes("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"), false);
});

test("redactApiErrorForStructuredLog: redacts email", () => {
  const result = redactApiErrorForStructuredLog(new Error("user admin@velmere.example tried to login"));
  assert.equal(result.message.includes("admin@velmere.example"), false);
  assert.ok(result.message.includes("[redacted-email]"));
});

test("redactApiErrorForStructuredLog: redacts URL", () => {
  const result = redactApiErrorForStructuredLog(new Error("connection failed https://secret.supabase.co/rest/v1"));
  assert.equal(result.message.includes("https://secret.supabase.co"), false);
  assert.ok(result.message.includes("[redacted-url]"));
});

test("redactApiErrorForStructuredLog: redacts PRIVATE KEY", () => {
  const result = redactApiErrorForStructuredLog(new Error("BEGIN RSA PRIVATE KEY abc123 END"));
  assert.equal(result.message.includes("BEGIN RSA PRIVATE KEY"), false);
  assert.ok(result.message.includes("[redacted-private-key]"));
});

test("redactApiErrorForStructuredLog: redacts SQL", () => {
  const result = redactApiErrorForStructuredLog(new Error("query failed SELECT * FROM users WHERE id = 1"));
  assert.equal(result.message.includes("SELECT * FROM users"), false);
  assert.ok(result.message.includes("[redacted-sql]"));
});

test("redactApiErrorForStructuredLog: handles non-Error values", () => {
  const r1 = redactApiErrorForStructuredLog(null);
  assert.equal(r1.message, "unknown_failure");
  const r2 = redactApiErrorForStructuredLog("plain string");
  assert.equal(r2.message, "plain string");
  const r3 = redactApiErrorForStructuredLog({ code: "boom", message: "failed" });
  assert.equal(r3.code, "boom");
  assert.equal(r3.message, "failed");
});

test("redactApiErrorForStructuredLog: bounded message length", () => {
  const longMsg = "a".repeat(10000);
  const result = redactApiErrorForStructuredLog(new Error(longMsg));
  assert.ok(result.message.length <= 320);
});

test("classifyApiProviderFailure: rate limit", () => {
  assert.equal(classifyApiProviderFailure(new Error("429 Too Many Requests")), "rate_limit");
  assert.equal(classifyApiProviderFailure(new Error("rate limit exceeded")), "rate_limit");
});

test("classifyApiProviderFailure: timeout", () => {
  assert.equal(classifyApiProviderFailure(new Error("Request timeout")), "timeout");
  assert.equal(classifyApiProviderFailure(new Error("aborted")), "timeout");
});

test("classifyApiProviderFailure: malformed JSON", () => {
  assert.equal(classifyApiProviderFailure(new Error("unexpected token in JSON")), "malformed_json");
  assert.equal(classifyApiProviderFailure(new Error("JSON parse error")), "malformed_json");
});

test("classifyApiProviderFailure: offline fallback", () => {
  assert.equal(classifyApiProviderFailure(new Error("connect ECONNREFUSED")), "offline");
  assert.equal(classifyApiProviderFailure(new Error("network unreachable")), "offline");
});

test("hasApiErrorCodePrefix: matches known prefix", () => {
  assert.equal(hasApiErrorCodePrefix(new Error("vlm_provider_invalid_input"), ["vlm_provider"]), true);
});

test("hasApiErrorCodePrefix: rejects prefix that is too short", () => {
  assert.equal(hasApiErrorCodePrefix(new Error("vlm_ok"), ["vlm"]), false);
});

test("hasApiErrorCodePrefix: rejects sk_live_ pattern", () => {
  assert.equal(hasApiErrorCodePrefix(new Error("sk_live_abc123"), ["sk_live_abc123"]), false);
});

test("hasApiErrorCodePrefix: rejects non-Error values", () => {
  assert.equal(hasApiErrorCodePrefix("plain string", ["plain"]), false);
  assert.equal(hasApiErrorCodePrefix(null, ["null"]), false);
});

test("reportApiError: returns correlationId, publicCode, route, status", () => {
  const result = reportApiError(new Error("test failure"), {
    route: "/api/test/route",
    code: "test_failure",
    status: 500,
  });
  assert.ok(result.correlationId.startsWith("err_"));
  assert.equal(result.publicCode, "test_failure");
  assert.equal(result.route, "/api/test/route");
  assert.equal(result.status, 500);
});

test("reportApiError: invalid code is normalized to internal_error", () => {
  const result = reportApiError(new Error("test"), {
    route: "/api/test",
    code: "INVALID-CODE",
  });
  assert.equal(result.publicCode, "internal_error");
});

test("reportApiError: invalid route is normalized to /api/redacted", () => {
  const result = reportApiError(new Error("test"), {
    route: "not a route with spaces",
    code: "test",
  });
  assert.equal(result.route, "/api/redacted");
});

test("reportApiError: invalid status is bounded to 500", () => {
  const result = reportApiError(new Error("test"), {
    route: "/api/test",
    code: "test",
    status: 99,
  });
  assert.equal(result.status, 500);
});
