#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { sanitizedBuildEnvironment } from "../../lib/build/sanitized-build-environment.mjs";

const parent = {
  PATH: "/safe/bin",
  LANG: "C.UTF-8",
  NEXT_PUBLIC_SITE_URL: "https://velmere.example",
  VELMERE_BUILD_CPUS: "1",
  VELMERE_A60_RUNTIME_PROBE_SHA256: "a".repeat(64),
  STRIPE_SECRET_KEY: "synthetic-stripe-secret-that-must-not-cross",
  SUPABASE_SERVICE_ROLE_KEY: "synthetic-role-secret-that-must-not-cross",
  DATABASE_URL: "postgres://synthetic.invalid/private",
  NODE_OPTIONS: "--require=/tmp/untrusted-loader.js",
  RANDOM_UNRELATED_VALUE: "must-not-cross",
};
const result = sanitizedBuildEnvironment(parent, {
  NODE_ENV: "production",
  NODE_OPTIONS: "--max-old-space-size=1024",
});

assert.deepEqual(result.env, {
  PATH: "/safe/bin",
  LANG: "C.UTF-8",
  NEXT_PUBLIC_SITE_URL: "https://velmere.example",
  VELMERE_BUILD_CPUS: "1",
  NODE_ENV: "production",
  NODE_OPTIONS: "--max-old-space-size=1024",
});
assert.equal(result.receipt.droppedSensitiveKeyCount, 3);
assert.equal(JSON.stringify(result).includes("synthetic-stripe-secret"), false);
assert.equal(JSON.stringify(result).includes("synthetic-role-secret"), false);
assert.equal(JSON.stringify(result).includes("postgres://"), false);
assert.equal(JSON.stringify(result).includes("untrusted-loader"), false);
assert.equal(result.env.VELMERE_A60_RUNTIME_PROBE_SHA256, undefined);
const exactProbe = "b".repeat(64);
const withExactProbeOverride = sanitizedBuildEnvironment(parent, {
  VELMERE_A60_RUNTIME_PROBE_SHA256: exactProbe,
});
assert.equal(withExactProbeOverride.env.VELMERE_A60_RUNTIME_PROBE_SHA256, exactProbe);
assert.deepEqual(
  Object.keys(withExactProbeOverride.env).filter((name) => name.startsWith("VELMERE_A60_")),
  ["VELMERE_A60_RUNTIME_PROBE_SHA256"],
);
assert.throws(
  () => sanitizedBuildEnvironment({}, { VELMERE_A60_RUNTIME_PROBE_SHA256: "B".repeat(64) }),
  /build_environment_a60_runtime_probe_invalid/u,
);
assert.throws(
  () => sanitizedBuildEnvironment({}, { VELMERE_A60_RUNTIME_PROBE_SHA256: "b".repeat(63) }),
  /build_environment_a60_runtime_probe_invalid/u,
);
assert.throws(
  () => sanitizedBuildEnvironment({}, { STRIPE_SECRET_KEY: "forbidden" }),
  /build_environment_override_forbidden:STRIPE_SECRET_KEY/u,
);

console.log(JSON.stringify({
  schemaVersion: "velmere.pass36.a93.sanitized-build-environment-test.v1",
  status: "PASS_LOCAL_BEHAVIOR",
  assertions: 12,
  receiptSha256: createHash("sha256")
    .update(JSON.stringify(result.receipt))
    .digest("hex"),
  liveProven: false,
}, null, 2));
