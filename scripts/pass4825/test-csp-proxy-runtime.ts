import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { NextRequest } from "next/server";

const CANONICAL_ORIGIN = "https://velmere.example";
const CANONICAL_ORIGIN_ENV_KEYS = [
  "VELMERE_CANONICAL_ORIGIN",
  "NEXT_PUBLIC_SITE_URL",
  "VELMERE_ALLOWED_ORIGINS",
] as const;

for (const key of CANONICAL_ORIGIN_ENV_KEYS) delete process.env[key];
Object.assign(process.env, {
  NODE_ENV: "production",
  // A90 requires a server-owned canonical origin in every production-like
  // runtime. Supplying the deployment configuration here models that runtime
  // contract without trusting Host or forwarded headers from the request.
  VELMERE_CANONICAL_ORIGIN: CANONICAL_ORIGIN,
});
const proxyModule = import("../../proxy.ts");

function withCanonicalOriginConfiguration(
  configuration: Partial<Record<(typeof CANONICAL_ORIGIN_ENV_KEYS)[number], string>>,
  action: () => void,
) {
  const previous = Object.fromEntries(
    CANONICAL_ORIGIN_ENV_KEYS.map((key) => [key, process.env[key]]),
  );
  try {
    for (const key of CANONICAL_ORIGIN_ENV_KEYS) delete process.env[key];
    Object.assign(process.env, configuration);
    action();
  } finally {
    for (const key of CANONICAL_ORIGIN_ENV_KEYS) {
      const value = previous[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

function scriptDirective(csp: string) {
  return csp.split(";").map((value) => value.trim()).find((value) => value.startsWith("script-src ")) ?? "";
}

function nonceFromCsp(csp: string) {
  const match = scriptDirective(csp).match(/'nonce-([A-Za-z0-9_-]+)'/u);
  assert.ok(match, "strict CSP must contain a canonical nonce source");
  return match[1];
}

function pageRequest(pathname = "/en/market-integrity") {
  return new NextRequest(`https://velmere.example${pathname}`, {
    headers: {
      accept: "text/html",
      "accept-language": "en",
      host: "velmere.example",
    },
  });
}

function doesConfiguredMatcherMatch(config: { matcher: string[] }, pathname: string) {
  return config.matcher.some((pattern) => {
    if (pattern === "/api/:path*") return pathname === "/api" || pathname.startsWith("/api/");
    return new RegExp(`^${pattern}$`, "u").test(pathname);
  });
}

test("rendered document response and downstream request share one strict nonce", async () => {
  const { default: proxy } = await proxyModule;
  const response = proxy(pageRequest());
  const responseCsp = response.headers.get("content-security-policy") ?? "";
  const downstreamCsp = response.headers.get("x-middleware-request-content-security-policy") ?? "";
  const downstreamNonce = response.headers.get("x-middleware-request-x-nonce") ?? "";
  const overrideNames = response.headers.get("x-middleware-override-headers") ?? "";

  assert.equal(responseCsp, downstreamCsp);
  assert.equal(nonceFromCsp(responseCsp), downstreamNonce);
  assert.match(overrideNames, /(?:^|,)content-security-policy(?:,|$)/u);
  assert.match(overrideNames, /(?:^|,)x-nonce(?:,|$)/u);
  assert.match(scriptDirective(responseCsp), /'strict-dynamic'/u);
  assert.doesNotMatch(scriptDirective(responseCsp), /'unsafe-inline'/u);
  assert.doesNotMatch(scriptDirective(responseCsp), /'unsafe-eval'/u);
});

test("nonce is fresh for every document request", async () => {
  const { default: proxy } = await proxyModule;
  const first = proxy(pageRequest()).headers.get("content-security-policy") ?? "";
  const second = proxy(pageRequest()).headers.get("content-security-policy") ?? "";
  assert.notEqual(nonceFromCsp(first), nonceFromCsp(second));
});

test("loopback HTTP proof exception is explicit and cannot be selected by forwarding or Host spoofing", async () => {
  const { default: proxy, isExplicitLoopbackHttpBrowserProofRequest } = await proxyModule;
  const previous = process.env.VELMERE_LOOPBACK_HTTP_BROWSER_PROOF;
  try {
    delete process.env.VELMERE_LOOPBACK_HTTP_BROWSER_PROOF;
    const disabledRequest = new NextRequest("http://127.0.0.1:3217/pl/search", {
      headers: { accept: "text/html", host: "127.0.0.1:3217" },
    });
    assert.equal(isExplicitLoopbackHttpBrowserProofRequest(disabledRequest), false);
    assert.match(proxy(disabledRequest).headers.get("content-security-policy") ?? "", /(?:^|; )upgrade-insecure-requests(?:;|$)/u);

    process.env.VELMERE_LOOPBACK_HTTP_BROWSER_PROOF = "true";
    const exactLoopbackRequest = new NextRequest("http://127.0.0.1:3217/pl/search", {
      headers: { accept: "text/html", host: "127.0.0.1:3217" },
    });
    assert.equal(isExplicitLoopbackHttpBrowserProofRequest(exactLoopbackRequest), true);
    assert.doesNotMatch(proxy(exactLoopbackRequest).headers.get("content-security-policy") ?? "", /(?:^|; )upgrade-insecure-requests(?:;|$)/u);

    const exactStandaloneForwardingRequest = new NextRequest("http://127.0.0.1:3217/pl/search", {
      headers: {
        accept: "text/html",
        host: "127.0.0.1:3217",
        "x-forwarded-host": "127.0.0.1:3217",
        "x-forwarded-port": "3217",
        "x-forwarded-proto": "http",
      },
    });
    assert.equal(isExplicitLoopbackHttpBrowserProofRequest(exactStandaloneForwardingRequest), true);
    assert.doesNotMatch(proxy(exactStandaloneForwardingRequest).headers.get("content-security-policy") ?? "", /(?:^|; )upgrade-insecure-requests(?:;|$)/u);

    for (const request of [
      new NextRequest("https://127.0.0.1:3217/pl/search", {
        headers: { accept: "text/html", host: "127.0.0.1:3217" },
      }),
      new NextRequest("http://velmere.example/pl/search", {
        headers: { accept: "text/html", host: "127.0.0.1:3217" },
      }),
      new NextRequest("http://127.0.0.1:3217/pl/search", {
        headers: { accept: "text/html", host: "velmere.example" },
      }),
      new NextRequest("http://127.0.0.1:3217/pl/search", {
        headers: {
          accept: "text/html",
          host: "127.0.0.1:3217",
          "x-forwarded-proto": "https",
        },
      }),
      new NextRequest("http://127.0.0.1:3217/pl/search", {
        headers: {
          accept: "text/html",
          host: "127.0.0.1:3217",
          "x-forwarded-host": "attacker.invalid",
        },
      }),
      new NextRequest("http://127.0.0.1:3217/pl/search", {
        headers: {
          accept: "text/html",
          host: "127.0.0.1:3217",
          "x-forwarded-host": "127.0.0.1:3217,attacker.invalid",
        },
      }),
      new NextRequest("http://127.0.0.1:3217/pl/search", {
        headers: {
          accept: "text/html",
          host: "127.0.0.1:3217",
          "x-forwarded-port": "443",
        },
      }),
      new NextRequest("http://127.0.0.1:3217/pl/search", {
        headers: {
          accept: "text/html",
          host: "127.0.0.1:3217",
          forwarded: "for=127.0.0.1;proto=http;host=127.0.0.1:3217",
        },
      }),
    ]) {
      assert.equal(isExplicitLoopbackHttpBrowserProofRequest(request), false);
      assert.match(proxy(request).headers.get("content-security-policy") ?? "", /(?:^|; )upgrade-insecure-requests(?:;|$)/u);
    }
  } finally {
    if (previous === undefined) delete process.env.VELMERE_LOOPBACK_HTTP_BROWSER_PROOF;
    else process.env.VELMERE_LOOPBACK_HTTP_BROWSER_PROOF = previous;
  }
});

test("document redirects carry strict response CSP without leaking x-nonce", async () => {
  const { default: proxy } = await proxyModule;
  const response = proxy(pageRequest("/login"));
  const csp = response.headers.get("content-security-policy") ?? "";
  assert.equal(response.status, 307);
  assert.ok(nonceFromCsp(csp));
  assert.equal(response.headers.has("x-nonce"), false);
  assert.doesNotMatch(scriptDirective(csp), /'unsafe-inline'|'unsafe-eval'/u);
});

test("production document redirects fail closed without a valid server-owned canonical origin", async () => {
  const { default: proxy } = await proxyModule;
  for (const configuration of [
    {},
    { VELMERE_CANONICAL_ORIGIN: "http://velmere.example/path" },
    {
      VELMERE_CANONICAL_ORIGIN: CANONICAL_ORIGIN,
      VELMERE_ALLOWED_ORIGINS: "not-an-origin",
    },
  ]) {
    withCanonicalOriginConfiguration(configuration, () => {
      const response = proxy(pageRequest("/login"));
      assert.equal(response.status, 503);
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.match(response.headers.get("content-type") ?? "", /^text\/plain/u);
      assert.equal(response.headers.has("location"), false);
      assert.ok(nonceFromCsp(response.headers.get("content-security-policy") ?? ""));
    });
  }
});

test("request-controlled host and forwarding headers cannot steer canonical redirects", async () => {
  const { default: proxy } = await proxyModule;
  const response = proxy(new NextRequest("https://attacker.invalid/login?next=%2Fen", {
    headers: {
      accept: "text/html",
      host: "attacker.invalid",
      "x-forwarded-host": "forwarded-attacker.invalid",
      "x-forwarded-proto": "http",
    },
  }));
  assert.equal(response.status, 307);
  const location = new URL(response.headers.get("location") ?? "https://invalid.example");
  assert.equal(location.origin, CANONICAL_ORIGIN);
  assert.equal(location.pathname, "/pl/login");
  assert.equal(location.search, "?next=%2Fen");
});

test("API requests remain outside document CSP nonce processing", async () => {
  const { default: proxy } = await proxyModule;
  const response = proxy(new NextRequest("https://velmere.example/api/search", {
    headers: { accept: "application/json", host: "velmere.example" },
  }));
  assert.equal(response.headers.has("content-security-policy"), false);
  assert.equal(response.headers.has("x-middleware-request-x-nonce"), false);
});

test("production control-plane API is hidden when its explicit gate is disabled", async () => {
  const { default: proxy } = await proxyModule;
  const previous = {
    enabled: process.env.VELMERE_CONTROL_PLANE_API_ENABLED,
    digest: process.env.VELMERE_CONTROL_PLANE_BEARER_SHA256,
  };
  try {
    delete process.env.VELMERE_CONTROL_PLANE_API_ENABLED;
    delete process.env.VELMERE_CONTROL_PLANE_BEARER_SHA256;
    const response = proxy(new NextRequest("https://velmere.example/api/security/audit-pass999", {
      headers: { accept: "application/json", host: "velmere.example" },
    }));
    assert.equal(response.status, 404);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.equal(response.headers.has("content-security-policy"), false);
  } finally {
    if (previous.enabled === undefined) delete process.env.VELMERE_CONTROL_PLANE_API_ENABLED;
    else process.env.VELMERE_CONTROL_PLANE_API_ENABLED = previous.enabled;
    if (previous.digest === undefined) delete process.env.VELMERE_CONTROL_PLANE_BEARER_SHA256;
    else process.env.VELMERE_CONTROL_PLANE_BEARER_SHA256 = previous.digest;
  }
});

test("authenticated control-plane API receives boundary and surface headers without document CSP", async () => {
  const { default: proxy } = await proxyModule;
  const token = "offline-control-plane-contract-token-123456789";
  const previous = {
    enabled: process.env.VELMERE_CONTROL_PLANE_API_ENABLED,
    digest: process.env.VELMERE_CONTROL_PLANE_BEARER_SHA256,
  };
  try {
    process.env.VELMERE_CONTROL_PLANE_API_ENABLED = "true";
    process.env.VELMERE_CONTROL_PLANE_BEARER_SHA256 = createHash("sha256").update(token).digest("hex");
    const response = proxy(new NextRequest("https://velmere.example/api/security/audit-pass999", {
      headers: { authorization: `Bearer ${token}`, accept: "application/json", host: "velmere.example" },
    }));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(response.headers.get("x-velmere-control-plane-boundary"), "pass4658-private-control-plane-boundary-v1");
    assert.equal(response.headers.get("x-velmere-api-surface-class"), "control_plane");
    assert.equal(response.headers.get("x-velmere-api-surface-registry"), "pass4659-canonical-api-surface-registry-v1");
    assert.equal(response.headers.has("content-security-policy"), false);
  } finally {
    if (previous.enabled === undefined) delete process.env.VELMERE_CONTROL_PLANE_API_ENABLED;
    else process.env.VELMERE_CONTROL_PLANE_API_ENABLED = previous.enabled;
    if (previous.digest === undefined) delete process.env.VELMERE_CONTROL_PLANE_BEARER_SHA256;
    else process.env.VELMERE_CONTROL_PLANE_BEARER_SHA256 = previous.digest;
  }
});

test("locale roots render the localized storefront home with strict CSP", async () => {
  const { default: proxy } = await proxyModule;
  for (const source of ["/pl", "/en", "/de"]) {
    const response = proxy(pageRequest(source));
    assert.equal(response.status, 200, source);
    assert.equal(response.headers.get("x-middleware-next"), "1", source);
    assert.ok(nonceFromCsp(response.headers.get("content-security-policy") ?? ""), source);
  }
});

test("every root authentication alias redirects to its canonical route with strict CSP", async () => {
  const { default: proxy } = await proxyModule;
  const cases = new Map([
    ["/admin", "/en/admin/import-products"],
    ["/admin/products", "/en/admin/import-products"],
    ["/logowanie", "/pl/login"],
    ["/sign-in", "/pl/login"],
    ["/konto", "/pl/account"],
    ["/member", "/pl/account"],
    ["/dashboard", "/pl/account"],
  ]);
  for (const [source, target] of cases) {
    const response = proxy(pageRequest(source));
    assert.equal(response.status, 307, source);
    assert.equal(new URL(response.headers.get("location") ?? "https://invalid.example").pathname, target, source);
    assert.ok(nonceFromCsp(response.headers.get("content-security-policy") ?? ""), source);
  }
});

test("localized authentication aliases redirect within the requested locale with strict CSP", async () => {
  const { default: proxy } = await proxyModule;
  const cases = new Map([
    ["/pl/admin-products", "/pl/admin/import-products"],
    ["/de/produkty", "/de/admin/import-products"],
    ["/en/logowanie", "/en/login"],
    ["/de/signin", "/de/login"],
    ["/pl/konto", "/pl/account"],
    ["/en/member", "/en/account"],
  ]);
  for (const [source, target] of cases) {
    const response = proxy(pageRequest(source));
    assert.equal(response.status, 307, source);
    assert.equal(new URL(response.headers.get("location") ?? "https://invalid.example").pathname, target, source);
    assert.ok(nonceFromCsp(response.headers.get("content-security-policy") ?? ""), source);
  }
});

test("dotted document routes are matched and only allowlisted public assets take the fast path", async () => {
  const { config, default: proxy, isKnownPublicAssetPath } = await proxyModule;
  for (const url of [
    "/en/security/audits/customer-report/report.v1",
    "/en/does.not.exist",
    "/en/pass12.missing-document.pdf",
    "/de/pass12.missing-document.json",
    "/market-logos/btc.svg",
    "/images/atelier/world-dotted-points.json",
  ]) {
    assert.equal(doesConfiguredMatcherMatch(config, url), true, url);
  }
  assert.equal(doesConfiguredMatcherMatch(config, "/_next/static/chunk.js"), false);
  assert.equal(doesConfiguredMatcherMatch(config, "/api/search"), true);

  for (const url of [
    "/market-logos/btc.svg",
    "/images/atelier/world-dotted-points.json",
    "/products/lookbook.webp",
    "/wallets/provider.png",
  ]) assert.equal(isKnownPublicAssetPath(url), true, url);

  for (const url of [
    "/en/pass12.missing-document.pdf",
    "/en/pass12.missing-document.json",
    "/images/../private/secret.png",
    "/images/%2e%2e/private/secret.png",
    "/images/%2Fprivate/secret.png",
    "/images/%5cprivate/secret.png",
    "/unknown/logo.svg",
    "/market-logos/logo.js",
  ]) assert.equal(isKnownPublicAssetPath(url), false, url);

  const assetResponse = proxy(pageRequest("/market-logos/btc.svg"));
  assert.equal(assetResponse.status, 200);
  assert.equal(assetResponse.headers.get("x-middleware-next"), "1");
  assert.equal(assetResponse.headers.has("content-security-policy"), false);

  const dottedDocumentResponse = proxy(pageRequest("/en/pass12.missing-document.pdf"));
  assert.equal(dottedDocumentResponse.status, 200);
  assert.ok(nonceFromCsp(dottedDocumentResponse.headers.get("content-security-policy") ?? ""));
});

test("malformed encoded document path fails as bounded text instead of nonce-less HTML", async () => {
  const { default: proxy } = await proxyModule;
  const response = proxy(pageRequest("/en/%E0%A4%A"));
  assert.equal(response.status, 400);
  assert.match(response.headers.get("content-type") ?? "", /^text\/plain/u);
  assert.ok(nonceFromCsp(response.headers.get("content-security-policy") ?? ""));
  assert.equal(response.headers.has("x-middleware-request-x-nonce"), false);
});
