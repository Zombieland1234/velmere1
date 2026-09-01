import assert from "node:assert/strict";
import {
  inspectApiEdgeRequest,
  inspectStripeSignatureHeader,
  resolveCanonicalRequestOrigins,
} from "../../lib/security/api-edge-boundary.js";
import { resolveVercelPreviewBranchOrigin } from "../../lib/security/vercel-preview-origin.js";

const productionEnv: NodeJS.ProcessEnv = {
  NODE_ENV: "production",
  VELMERE_CANONICAL_ORIGIN: "https://velmere.example",
};

function inspect(
  path = "/api/security/readiness",
  init: RequestInit = {},
  env: NodeJS.ProcessEnv = productionEnv,
) {
  return inspectApiEdgeRequest(
    new Request(`https://velmere.example${path}`, init),
    env,
  );
}

assert.equal(inspect().ok, true);
assert.equal(inspect("/api/security/readiness", {
  method: "POST",
  headers: { origin: "https://velmere.example", cookie: "session=unit" },
}).ok, true);
const stripeV1A = "a".repeat(64);
const stripeV1B = "b".repeat(64);
assert.equal(
  inspect("/api/stripe/webhook", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "stripe-signature": `t=1710000000,v1=${stripeV1A}`,
    },
  }).ok,
  true,
);
assert.equal(
  inspectStripeSignatureHeader(
    `t=1710000000,v1=${stripeV1A},v1=${stripeV1B}`,
  ),
  null,
);

const previewHostname = "velmere-git-browser-basic-owner.vercel.app";
assert.equal(
  resolveVercelPreviewBranchOrigin({
    VERCEL_ENV: "preview",
    VERCEL_BRANCH_URL: previewHostname,
  }),
  `https://${previewHostname}`,
);
for (const attackerValue of [
  `https://${previewHostname}`,
  `${previewHostname}/api/security/readiness`,
  `user@${previewHostname}`,
  `${previewHostname}:443`,
  `evil\\${previewHostname}`,
  `evil\n.${previewHostname}`,
  `Velmere.${previewHostname}`,
  ".vercel.app",
  "velmere.vercel.app.evil.example",
  `${"a".repeat(64)}.vercel.app`,
  `${"a".repeat(242)}.vercel.app`,
]) {
  assert.equal(
    resolveVercelPreviewBranchOrigin({
      VERCEL_ENV: "preview",
      VERCEL_BRANCH_URL: attackerValue,
    }),
    null,
    `preview hostname attacker value rejected: ${JSON.stringify(attackerValue)}`,
  );
}
assert.equal(
  resolveVercelPreviewBranchOrigin({
    VERCEL_ENV: "production",
    VERCEL_BRANCH_URL: previewHostname,
  }),
  null,
  "production never accepts the preview fallback",
);

{
  const previewRequest = new Request(`https://${previewHostname}/api/security/readiness`);
  const previewEnv = {
    NODE_ENV: "production",
    VERCEL_ENV: "preview",
    VERCEL_BRANCH_URL: previewHostname,
  } satisfies NodeJS.ProcessEnv;
  const configured = resolveCanonicalRequestOrigins(previewRequest, previewEnv);
  assert.deepEqual([...configured.origins], [`https://${previewHostname}`]);
  assert.equal(inspectApiEdgeRequest(previewRequest, previewEnv).ok, true);
}

{
  const explicit = resolveCanonicalRequestOrigins(
    new Request("https://velmere.example/api/security/readiness"),
    {
      NODE_ENV: "production",
      VERCEL_ENV: "preview",
      VERCEL_BRANCH_URL: previewHostname,
      VELMERE_CANONICAL_ORIGIN: "https://velmere.example",
    },
  );
  assert.deepEqual([...explicit.origins], ["https://velmere.example"]);
}

{
  const productionFallback = inspectApiEdgeRequest(
    new Request(`https://${previewHostname}/api/security/readiness`),
    {
      NODE_ENV: "production",
      VERCEL_ENV: "production",
      VERCEL_BRANCH_URL: previewHostname,
    },
  );
  assert.equal(productionFallback.ok, false);
  if (!productionFallback.ok) {
    assert.equal(productionFallback.status, 503);
    assert.equal(productionFallback.mode, "api_canonical_origin_not_configured");
  }
}

{
  const invalidPreviewFallback = inspectApiEdgeRequest(
    new Request(`https://${previewHostname}/api/security/readiness`),
    {
      NODE_ENV: "production",
      VERCEL_ENV: "preview",
      VERCEL_BRANCH_URL: `https://${previewHostname}`,
    },
  );
  assert.equal(invalidPreviewFallback.ok, false);
  if (!invalidPreviewFallback.ok) {
    assert.equal(invalidPreviewFallback.status, 503);
    assert.equal(invalidPreviewFallback.mode, "api_canonical_origin_configuration_invalid");
  }
}

const failures: Array<{
  name: string;
  path?: string;
  init?: RequestInit;
  env?: NodeJS.ProcessEnv;
  status: number;
  mode: string;
}> = [
  {
    name: "method override",
    init: { headers: { "x-http-method-override": "DELETE" } },
    status: 400,
    mode: "api_method_override_forbidden",
  },
  {
    name: "comma joined singleton",
    init: { headers: { origin: "https://velmere.example, https://evil.example" } },
    status: 400,
    mode: "api_ambiguous_singleton_header:origin",
  },
  {
    name: "duplicate Stripe timestamp",
    path: "/api/stripe/webhook",
    init: {
      method: "POST",
      headers: {
        "stripe-signature": `t=1710000000,v1=${stripeV1A},t=1710000001,v1=${stripeV1B}`,
      },
    },
    status: 400,
    mode: "api_stripe_signature_header_ambiguous",
  },
  {
    name: "duplicate Stripe v1",
    path: "/api/stripe/webhook",
    init: {
      method: "POST",
      headers: {
        "stripe-signature": `t=1710000000,v1=${stripeV1A},v1=${stripeV1A}`,
      },
    },
    status: 400,
    mode: "api_stripe_signature_header_ambiguous",
  },
  {
    name: "comma-injected Stripe field",
    path: "/api/stripe/webhook",
    init: {
      method: "POST",
      headers: {
        "stripe-signature": `t=1710000000,v1=${stripeV1A},authorization=attacker`,
      },
    },
    status: 400,
    mode: "api_stripe_signature_header_invalid",
  },
  {
    name: "malformed Stripe v1",
    path: "/api/stripe/webhook",
    init: {
      method: "POST",
      headers: {
        "stripe-signature": "t=1710000000,v1=short",
      },
    },
    status: 400,
    mode: "api_stripe_signature_header_invalid",
  },
  {
    name: "transfer encoding",
    init: { headers: { "transfer-encoding": "chunked" } },
    status: 400,
    mode: "api_transfer_encoding_forbidden",
  },
  {
    name: "ambiguous content length",
    init: { headers: { "content-length": "01" } },
    status: 400,
    mode: "api_content_length_invalid",
  },
  {
    name: "encoded path octet",
    path: "/api/security%2freadiness",
    status: 400,
    mode: "api_path_ambiguous",
  },
  {
    name: "double slash",
    path: "/api//security/readiness",
    status: 400,
    mode: "api_path_ambiguous",
  },
  {
    name: "duplicate query field",
    path: "/api/security/readiness?tier=basic&tier=advanced",
    status: 400,
    mode: "api_query_duplicate_or_shadowed",
  },
  {
    name: "percent encoded shadow query field",
    path: "/api/security/readiness?tier=basic&t%69er=advanced",
    status: 400,
    mode: "api_query_duplicate_or_shadowed",
  },
  {
    name: "unicode compatibility shadow query field",
    path: "/api/security/readiness?%EF%BC%A1=basic&A=advanced",
    status: 400,
    mode: "api_query_duplicate_or_shadowed",
  },
  {
    name: "semicolon query separator",
    path: "/api/security/readiness?tier=basic;admin=true",
    status: 400,
    mode: "api_query_separator_ambiguous",
  },
  {
    name: "invalid query encoding",
    path: "/api/security/readiness?tier=%ZZ",
    status: 400,
    mode: "api_query_encoding_invalid",
  },
  {
    name: "dangerous query key",
    path: "/api/security/readiness?__proto__=polluted",
    status: 400,
    mode: "api_query_dangerous_name",
  },
  {
    name: "host conflict",
    init: { headers: { host: "evil.example" } },
    status: 400,
    mode: "api_host_header_conflict",
  },
  {
    name: "forwarded host conflict",
    init: { headers: { "x-forwarded-host": "evil.example" } },
    status: 400,
    mode: "api_forwarded_host_conflict",
  },
  {
    name: "forwarded RFC header unsupported",
    init: { headers: { forwarded: "for=192.0.2.1;host=velmere.example;proto=https" } },
    status: 400,
    mode: "api_forwarded_header_unsupported",
  },
  {
    name: "cross origin",
    init: { method: "POST", headers: { origin: "https://evil.example" } },
    status: 403,
    mode: "api_cross_origin_blocked",
  },
  {
    name: "cookie mutation without origin",
    init: { method: "POST", headers: { cookie: "session=unit" } },
    status: 403,
    mode: "api_cookie_mutation_origin_required",
  },
  {
    name: "production canonical origin absent",
    env: { NODE_ENV: "production" },
    status: 503,
    mode: "api_canonical_origin_not_configured",
  },
  {
    name: "invalid configured origin",
    env: {
      NODE_ENV: "production",
      VELMERE_CANONICAL_ORIGIN: "http://velmere.example/path",
    },
    status: 503,
    mode: "api_canonical_origin_configuration_invalid",
  },
];

for (const test of failures) {
  const result = inspect(test.path, test.init, test.env);
  assert.equal(result.ok, false, test.name);
  if (!result.ok) {
    assert.equal(result.status, test.status, `${test.name}: status`);
    assert.equal(result.mode, test.mode, `${test.name}: mode`);
  }
}

{
  const request = new Request("https://[2001:db8::1]/api/security/readiness");
  const configured = resolveCanonicalRequestOrigins(request, {
    NODE_ENV: "production",
    VELMERE_CANONICAL_ORIGIN: "https://[2001:db8::1]",
  });
  assert.deepEqual([...configured.origins], ["https://[2001:db8::1]"]);
  assert.equal(inspectApiEdgeRequest(request, {
    NODE_ENV: "production",
    VELMERE_CANONICAL_ORIGIN: "https://[2001:db8::1]",
  }).ok, true);
}

console.log(`A90 API edge behavior: PASS (${failures.length + 3} cases)`);
